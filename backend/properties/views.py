from datetime import date, timedelta
from collections import defaultdict
from decimal import Decimal
import logging
import random
import uuid

from django.contrib.auth.models import User
from django.core.files.base import ContentFile
from django.db import IntegrityError
from django.db.models import Case, DecimalField, ExpressionWrapper, F, Q, Sum, Value, Count, Max
from django.db.models.functions import Coalesce, TruncMonth
from django.http import FileResponse
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .mixins import OrganizationQuerySetMixin, resolve_request_organization
from .models import (
    AccountingCategory,
    Document,
    Expense,
    Lease,
    LateFeeRule,
    MaintenanceRequest,
    Message,
    Notification,
    Organization,
    OrganizationInvitation,
    OwnerStatement,
    Payment,
    Property,
    RentalApplication,
    RentLedgerEntry,
    ScreeningRequest,
    Tenant,
    Transaction,
    Unit,
    UserProfile,
)
from .permissions import IsLandlord, IsOrgAdmin
from .serializers import (
    AccountingCategorySerializer,
    DocumentSerializer,
    ExpenseSerializer,
    LeaseSerializer,
    LateFeeRuleSerializer,
    MaintenanceRequestSerializer,
    MessageSerializer,
    NotificationSerializer,
    OrganizationInvitationSerializer,
    OrganizationSerializer,
    OwnerStatementSerializer,
    PaymentSerializer,
    PropertySerializer,
    RentLedgerEntrySerializer,
    TransactionSerializer,
    UserSummarySerializer,
    PublicUnitListingSerializer,
    RentalApplicationSerializer,
    RentalApplicationPublicSerializer,
    ScreeningRequestSerializer,
    TenantConsentSerializer,
    TenantSerializer,
    UnitSerializer,
)
from .signals import recalculate_lease_balances
from .utils import generate_lease_document
from .emails import (
    send_application_received,
    send_application_status_update,
    send_lease_fully_executed,
    send_lease_signing_request,
    send_lease_signed_confirmation,
    send_maintenance_request_submitted,
    send_maintenance_status_update,
    send_screening_consent_request,
)


DEFAULT_ACCOUNTING_CATEGORIES = [
    ("Rent Income", AccountingCategory.TYPE_INCOME, True),
    ("Late Fees", AccountingCategory.TYPE_EXPENSE, True),
    ("Application Fees", AccountingCategory.TYPE_INCOME, True),
    ("Other Income", AccountingCategory.TYPE_INCOME, True),
    ("Repairs & Maintenance", AccountingCategory.TYPE_EXPENSE, True),
    ("Insurance", AccountingCategory.TYPE_EXPENSE, True),
    ("Property Tax", AccountingCategory.TYPE_EXPENSE, True),
    ("Utilities", AccountingCategory.TYPE_EXPENSE, True),
    ("Landscaping", AccountingCategory.TYPE_EXPENSE, True),
    ("Management Fees", AccountingCategory.TYPE_EXPENSE, True),
    ("Legal & Professional", AccountingCategory.TYPE_EXPENSE, True),
    ("Advertising", AccountingCategory.TYPE_EXPENSE, True),
    ("Supplies", AccountingCategory.TYPE_EXPENSE, True),
    ("Capital Improvements", AccountingCategory.TYPE_EXPENSE, True),
    ("Mortgage Interest", AccountingCategory.TYPE_EXPENSE, True),
    ("HOA Fees", AccountingCategory.TYPE_EXPENSE, True),
    ("Pest Control", AccountingCategory.TYPE_EXPENSE, True),
    ("Cleaning", AccountingCategory.TYPE_EXPENSE, True),
    ("Other Expense", AccountingCategory.TYPE_EXPENSE, True),
]


def ensure_default_categories(organization):
    org = organization
    for name, category_type, is_system in DEFAULT_ACCOUNTING_CATEGORIES:
        category = AccountingCategory.objects.filter(
            name=name,
            category_type=category_type,
            organization__isnull=True,
        ).first()
        if not category:
            category, created = AccountingCategory.objects.get_or_create(
                name=name,
                category_type=category_type,
                organization=None,
                defaults={
                    "is_system": True,
                    "description": "System accounting category",
                    "tax_deductible": category_type == AccountingCategory.TYPE_EXPENSE,
                },
            )
            if created:
                category = category

        if org:
            AccountingCategory.objects.get_or_create(
                name=name,
                category_type=category_type,
                organization=org,
                defaults={
                    "is_system": False,
                    "description": "Organization accounting category" if is_system else "",
                    "tax_deductible": category_type == AccountingCategory.TYPE_EXPENSE,
                },
            )


def resolve_accounting_category(organization, name, category_type):
    queryset = AccountingCategory.objects.filter(
        name=name,
        category_type=category_type,
        organization__isnull=True,
    )
    if organization:
        organization_override = AccountingCategory.objects.filter(
            name=name,
            category_type=category_type,
            organization=organization,
        ).first()
        if organization_override:
            return organization_override
    return queryset.first() or AccountingCategory.objects.create(
        name=name,
        category_type=category_type,
        organization=None,
        is_system=True,
        tax_deductible=category_type == AccountingCategory.TYPE_EXPENSE,
        description="System accounting category",
    )


def _month_range_bounds(target):
    month_start = date(target.year, target.month, 1)
    if target.month == 12:
        next_month = date(target.year + 1, 1, 1)
    else:
        next_month = date(target.year, target.month + 1, 1)
    return month_start, next_month - timedelta(days=1)


def _parse_date_value(value):
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def _month_labels(start_date, end_date):
    months = []
    cursor = date(start_date.year, start_date.month, 1)
    end_marker = date(end_date.year, end_date.month, 1)
    while cursor <= end_marker:
        months.append((cursor.strftime("%Y-%m"), cursor.strftime("%b %Y")))
        if cursor.month == 12:
            cursor = date(cursor.year + 1, 1, 1)
        else:
            cursor = date(cursor.year, cursor.month + 1, 1)
    return months


def _to_float(value):
    if value is None:
        return 0.0
    return float(value)


def _coerce_int(value, default=None):
    if value in (None, ""):
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _month_start(target_date):
    return date(target_date.year, target_date.month, 1)


def _month_end(target_date):
    if target_date.month == 12:
        return date(target_date.year + 1, 1, 1) - timedelta(days=1)
    return date(target_date.year, target_date.month + 1, 1) - timedelta(days=1)


def _month_range(start_date, end_date):
    months = []
    cursor = _month_start(start_date)
    final = _month_start(end_date)
    while cursor <= final:
        months.append(cursor)
        cursor = _month_start(date(cursor.year + 1, 1, 1) if cursor.month == 12 else date(cursor.year, cursor.month + 1, 1))
    return months


def _resolve_reporting_category(organization, category_name, category_type):
    if not organization:
        return AccountingCategory.objects.filter(
            name=category_name,
            category_type=category_type,
            organization__isnull=True,
        ).first()
    category = AccountingCategory.objects.filter(
        organization=organization, name=category_name, category_type=category_type
    ).first()
    if category:
        return category
    category = AccountingCategory.objects.filter(
        name=category_name,
        category_type=category_type,
        organization__isnull=True,
    ).first()
    if category:
        return category
    return AccountingCategory.objects.create(
        organization=organization if organization else None,
        name=category_name,
        category_type=category_type,
        is_system=False,
        tax_deductible=category_type == AccountingCategory.TYPE_EXPENSE,
    )


def _latest_lease_balances(org, lease_ids):
    if not lease_ids:
        return {}
    latest_ids = (
        RentLedgerEntry.objects.filter(
            organization=org, lease_id__in=lease_ids
        )
        .values("lease_id")
        .annotate(last_id=Max("id"))
        .values_list("lease_id", "last_id")
    )
    balance_map = {}
    latest_lookup = {lease_id: entry_id for lease_id, entry_id in latest_ids}
    if not latest_lookup:
        return balance_map
    balances = RentLedgerEntry.objects.filter(id__in=latest_lookup.values()).values_list(
        "lease_id", "balance"
    )
    for lease_id, balance in balances:
        balance_map[lease_id] = balance
    return balance_map

logger = logging.getLogger(__name__)


class OrganizationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = getattr(request.user, "profile", None)
        organization = getattr(profile, "organization", None)
        if not organization:
            return Response(
                {"detail": "No organization assigned to this user."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(OrganizationSerializer(organization).data)

    def patch(self, request):
        profile = getattr(request.user, "profile", None)
        organization = getattr(profile, "organization", None)
        if not organization:
            return Response(
                {"detail": "No organization assigned to this user."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if not profile.is_org_admin:
            return Response(
                {"detail": "Only organization admins can update the organization."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = OrganizationSerializer(
            organization,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class OrganizationInviteView(APIView):
    permission_classes = [IsAuthenticated, IsOrgAdmin]

    def post(self, request):
        profile = getattr(request.user, "profile", None)
        organization = getattr(profile, "organization", None)
        if not organization:
            return Response(
                {"detail": "No organization assigned to this user."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        email = (request.data.get("email") or "").strip().lower()
        role = (request.data.get("role") or UserProfile.ROLE_TENANT).strip().lower()
        tenant_id = request.data.get("tenant_id")

        errors = {}
        if not email:
            errors["email"] = "Email is required."
        if role not in {UserProfile.ROLE_LANDLORD, UserProfile.ROLE_TENANT}:
            errors["role"] = "Role must be either 'landlord' or 'tenant'."
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        tenant = None
        if tenant_id:
            try:
                tenant = Tenant.objects.get(id=tenant_id, organization=organization)
            except Tenant.DoesNotExist:
                return Response(
                    {"tenant_id": "Tenant not found in your organization."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if OrganizationInvitation.objects.filter(
            organization=organization,
            email=email,
            status=OrganizationInvitation.STATUS_PENDING,
        ).exists():
            return Response(
                {"email": "An invitation is already pending for this email."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        invitation = OrganizationInvitation.objects.create(
            organization=organization,
            email=email,
            role=role,
            invited_by=request.user,
            tenant=tenant,
        )
        return Response(
            OrganizationInvitationSerializer(invitation).data,
            status=status.HTTP_201_CREATED,
        )


class OrganizationMembersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = getattr(request.user, "profile", None)
        organization = getattr(profile, "organization", None)
        if not organization:
            return Response(
                {"detail": "No organization assigned to this user."},
                status=status.HTTP_404_NOT_FOUND,
            )

        members = UserProfile.objects.filter(organization=organization).select_related(
            "user", "tenant"
        )
        payload = [
            {
                "id": member.user.id,
                "username": member.user.username,
                "first_name": member.user.first_name,
                "last_name": member.user.last_name,
                "email": member.user.email,
                "role": member.role,
                "tenant_id": member.tenant_id,
                "is_org_admin": member.is_org_admin,
            }
            for member in members
        ]
        return Response(payload)


class OrganizationUsersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = getattr(request.user, "profile", None)
        organization = getattr(profile, "organization", None)
        if not organization:
            return Response(
                {"users": [], "tenants": []},
                status=status.HTTP_200_OK,
            )
        users = (
            User.objects.filter(profile__organization=organization)
            .select_related("profile")
            .order_by("first_name", "last_name", "username")
        )
        user_payload = [
            {
                "id": user.id,
                "name": (f"{user.first_name} {user.last_name}".strip() or user.username),
                "email": user.email,
                "type": "user",
            }
            for user in users
        ]
        tenants = Tenant.objects.filter(organization=organization).order_by(
            "first_name", "last_name"
        )
        tenant_payload = [
            {
                "id": tenant.id,
                "name": f"{tenant.first_name} {tenant.last_name}".strip(),
                "email": tenant.email,
                "type": "tenant",
            }
            for tenant in tenants
        ]
        return Response({"users": user_payload, "tenants": tenant_payload})


class OrganizationInvitationsView(APIView):
    permission_classes = [IsAuthenticated, IsOrgAdmin]

    def get(self, request):
        profile = getattr(request.user, "profile", None)
        organization = getattr(profile, "organization", None)
        if not organization:
            return Response(
                {"detail": "No organization assigned to this user."},
                status=status.HTTP_404_NOT_FOUND,
            )
        queryset = OrganizationInvitation.objects.filter(organization=organization).order_by(
            "-created_at"
        )
        return Response(OrganizationInvitationSerializer(queryset, many=True).data)


class PublicListingsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        queryset = (
            Unit.objects.select_related("property")
            .filter(is_listed=True)
            .order_by("-created_at")
        )

        params = request.query_params
        min_rent = params.get("min_rent")
        max_rent = params.get("max_rent")
        bedrooms = params.get("bedrooms")
        city = params.get("city")

        if min_rent:
            queryset = queryset.filter(rent_amount__gte=min_rent)
        if max_rent:
            queryset = queryset.filter(rent_amount__lte=max_rent)
        if bedrooms:
            queryset = queryset.filter(bedrooms=bedrooms)
        if city:
            queryset = queryset.filter(property__city__icontains=city)

        serializer = PublicUnitListingSerializer(queryset, many=True)
        return Response(serializer.data)


class PublicListingDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug):
        unit = (
            Unit.objects.select_related("property")
            .filter(is_listed=True, listing_slug=slug)
            .first()
        )
        if not unit:
            return Response(
                {"detail": "Listing not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(PublicUnitListingSerializer(unit).data)


class PublicListingApplicationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, slug):
        unit = (
            Unit.objects.select_related("property")
            .filter(is_listed=True, listing_slug=slug)
            .first()
        )
        if not unit:
            return Response(
                {"detail": "Listing not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        payload = request.data.copy()
        if hasattr(payload, "dict"):
            payload = payload.dict()

        payload.pop("unit", None)
        payload.pop("unit_id", None)
        payload.pop("tenant", None)
        payload["listing_slug"] = slug
        serializer = RentalApplicationPublicSerializer(data=payload)
        serializer.is_valid(raise_exception=True)

        references = serializer.validated_data.get("references", [])
        if not isinstance(references, list):
            return Response(
                {"references": "References must be a list."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(references) > 3:
            return Response(
                {"references": "A maximum of 3 references is allowed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        for index, entry in enumerate(references):
            if not isinstance(entry, dict):
                return Response(
                    {
                        "references": f"Reference #{index + 1} must be an object with name, phone, and relationship.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not entry.get("name") or not entry.get("phone") or not entry.get("relationship"):
                return Response(
                    {
                        "references": f"Reference #{index + 1} requires name, phone, and relationship.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        application = RentalApplication.objects.create(
            unit=unit,
            organization=unit.organization,
            listing_slug=slug,
            status=RentalApplication.STATUS_SUBMITTED,
            first_name=serializer.validated_data["first_name"],
            last_name=serializer.validated_data["last_name"],
            email=serializer.validated_data["email"],
            phone=serializer.validated_data["phone"],
            date_of_birth=serializer.validated_data["date_of_birth"],
            ssn_last4=(serializer.validated_data.get("ssn_last4") or "").strip(),
            current_address=serializer.validated_data["current_address"],
            current_city=serializer.validated_data["current_city"],
            current_state=serializer.validated_data["current_state"],
            current_zip=serializer.validated_data["current_zip"],
            current_landlord_name=serializer.validated_data.get("current_landlord_name") or "",
            current_landlord_phone=serializer.validated_data.get("current_landlord_phone") or "",
            current_rent=serializer.validated_data.get("current_rent"),
            reason_for_moving=serializer.validated_data.get("reason_for_moving") or "",
            employer_name=serializer.validated_data.get("employer_name") or "",
            employer_phone=serializer.validated_data.get("employer_phone") or "",
            job_title=serializer.validated_data.get("job_title") or "",
            monthly_income=serializer.validated_data.get("monthly_income"),
            employment_length=serializer.validated_data.get("employment_length") or "",
            num_occupants=serializer.validated_data.get("num_occupants") or 1,
            has_pets=bool(serializer.validated_data.get("has_pets")),
            pet_description=serializer.validated_data.get("pet_description") or "",
            has_been_evicted=bool(serializer.validated_data.get("has_been_evicted")),
            has_criminal_history=bool(serializer.validated_data.get("has_criminal_history")),
            additional_notes=serializer.validated_data.get("additional_notes") or "",
            references=references,
            consent_background_check=bool(serializer.validated_data["consent_background_check"]),
            consent_credit_check=bool(serializer.validated_data["consent_credit_check"]),
            electronic_signature=serializer.validated_data["electronic_signature"],
            signature_date=timezone.now(),
        )
        try:
            send_application_received(
                applicant_email=application.email,
                applicant_name=f"{application.first_name} {application.last_name}".strip(),
                property_name=unit.property.name if unit.property else "",
                unit_number=unit.unit_number,
            )
        except Exception:
            logger.exception("Failed to send application received email for application=%s", application.id)

        return Response(
            {
                "application_id": application.id,
                "reference_number": f"RA-{application.id:06d}",
                "status": application.status,
                "message": "Application submitted successfully.",
            },
            status=status.HTTP_201_CREATED,
        )


class RentalApplicationViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    queryset = RentalApplication.objects.select_related("unit", "reviewed_by")
    serializer_class = RentalApplicationSerializer
    permission_classes = [IsLandlord]
    http_method_names = ["get", "patch", "head", "options", "post"]

    def get_queryset(self):
        queryset = super().get_queryset()
        status_filter = self.request.query_params.get("status")
        unit_id = self.request.query_params.get("unit")
        ordering = self.request.query_params.get("ordering")
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if unit_id:
            queryset = queryset.filter(unit_id=unit_id)
        if ordering in {"created_at", "-created_at", "unit_id", "-unit_id"}:
            queryset = queryset.order_by(ordering)
        return queryset

    def partial_update(self, request, *args, **kwargs):
        application = self.get_object()
        old_status = application.status
        status_value = request.data.get("status")
        if status_value and status_value not in {
            RentalApplication.STATUS_SUBMITTED,
            RentalApplication.STATUS_UNDER_REVIEW,
            RentalApplication.STATUS_APPROVED,
            RentalApplication.STATUS_DENIED,
            RentalApplication.STATUS_WITHDRAWN,
        }:
            return Response(
                {"status": "Invalid status value."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        update_fields = []
        if status_value is not None:
            application.status = status_value
            update_fields.append("status")
        if "review_notes" in request.data:
            application.review_notes = (request.data.get("review_notes") or "").strip()
            update_fields.append("review_notes")
        if update_fields:
            application.reviewed_by = request.user
            update_fields.append("reviewed_by")
            application.updated_at = timezone.now()
            update_fields.append("updated_at")
            application.save(update_fields=update_fields)

        if status_value and status_value != old_status:
            unit = application.unit
            property_name = unit.property.name if unit and unit.property else "your property"
            unit_number = unit.unit_number if unit else "N/A"
            try:
                send_application_status_update(
                    applicant_email=application.email,
                    applicant_name=f"{application.first_name} {application.last_name}".strip(),
                    property_name=f"{property_name} Unit {unit_number}",
                    status=status_value,
                )
            except Exception:
                logger.exception(
                    "Failed to send status update email for application=%s",
                    application.id,
                )

        serializer = self.get_serializer(application)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        application = self.get_object()
        tenant = Tenant.objects.filter(
            email__iexact=application.email,
            organization=application.organization,
        ).first()
        if not tenant:
            tenant = Tenant.objects.create(
                organization=application.organization,
                first_name=application.first_name,
                last_name=application.last_name,
                email=application.email,
                phone=application.phone,
                date_of_birth=application.date_of_birth,
            )

        application.status = RentalApplication.STATUS_APPROVED
        application.reviewed_by = request.user
        application.review_notes = (request.data.get("review_notes") or application.review_notes or "").strip()
        application.save(update_fields=["status", "reviewed_by", "review_notes", "updated_at"])
        try:
            unit = application.unit
            property_name = unit.property.name if unit and unit.property else ""
            unit_number = unit.unit_number if unit else ""
            send_application_status_update(
                applicant_email=application.email,
                applicant_name=f"{application.first_name} {application.last_name}".strip(),
                property_name=f"{property_name} Unit {unit_number}" if property_name else unit_number,
                status=application.status,
            )
        except Exception:
            logger.exception("Failed to send application status email for application=%s", application.id)

        screening = ScreeningRequest.objects.create(
            tenant=tenant,
            requested_by=request.user,
            organization=application.organization,
            status=ScreeningRequest.STATUS_PENDING,
            consent_status=ScreeningRequest.CONSENT_PENDING,
            tenant_email=application.email,
        )

        return Response(
            {
                "detail": "Application approved.",
                "application": RentalApplicationSerializer(application).data,
                "tenant_id": tenant.id,
                "screening_id": screening.id,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="run-screening")
    def run_screening(self, request, pk=None):
        application = self.get_object()
        if application.status not in {
            RentalApplication.STATUS_APPROVED,
            RentalApplication.STATUS_SUBMITTED,
            RentalApplication.STATUS_UNDER_REVIEW,
        }:
            return Response(
                {"detail": "Only submitted, under review, or approved applications can run screening."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        tenant = Tenant.objects.filter(
            email__iexact=application.email,
            organization=application.organization,
        ).first()
        if not tenant:
            tenant = Tenant.objects.create(
                organization=application.organization,
                first_name=application.first_name,
                last_name=application.last_name,
                email=application.email,
                phone=application.phone,
                date_of_birth=application.date_of_birth,
            )

        screening = ScreeningRequest.objects.create(
            tenant=tenant,
            requested_by=request.user,
            organization=application.organization,
            status=ScreeningRequest.STATUS_PENDING,
            consent_status=ScreeningRequest.CONSENT_PENDING,
            tenant_email=application.email,
        )
        return Response(
            {
                "detail": "Screening created.",
                "screening_id": screening.id,
                "application": RentalApplicationSerializer(application).data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="deny")
    def deny(self, request, pk=None):
        application = self.get_object()
        application.status = RentalApplication.STATUS_DENIED
        application.reviewed_by = request.user
        application.review_notes = (request.data.get("review_notes") or application.review_notes or "").strip()
        application.save(update_fields=["status", "reviewed_by", "review_notes", "updated_at"])
        try:
            unit = application.unit
            property_name = unit.property.name if unit and unit.property else ""
            unit_number = unit.unit_number if unit else ""
            send_application_status_update(
                applicant_email=application.email,
                applicant_name=f"{application.first_name} {application.last_name}".strip(),
                property_name=f"{property_name} Unit {unit_number}" if property_name else unit_number,
                status=application.status,
            )
        except Exception:
            logger.exception("Failed to send application status email for application=%s", application.id)
        return Response(
            {
                "detail": "Application denied.",
                "application": RentalApplicationSerializer(application).data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="create-lease")
    def create_lease(self, request, pk=None):
        application = self.get_object()
        if application.status != RentalApplication.STATUS_APPROVED:
            return Response(
                {"detail": "Only approved applications can create a lease."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        tenant = Tenant.objects.filter(
            email__iexact=application.email,
            organization=application.organization,
        ).first()
        if not tenant:
            tenant = Tenant.objects.create(
                organization=application.organization,
                first_name=application.first_name,
                last_name=application.last_name,
                email=application.email,
                phone=application.phone,
                date_of_birth=application.date_of_birth,
            )

        existing_lease = Lease.objects.filter(application=application).first()
        if existing_lease:
            return Response(
                {
                    "detail": "A lease already exists for this application.",
                    "lease": LeaseSerializer(existing_lease).data,
                },
                status=status.HTTP_200_OK,
            )

        today = date.today()
        start_month = today.month + 1
        start_year = today.year
        if start_month == 13:
            start_month = 1
            start_year += 1
        start_date = date(start_year, start_month, 1)
        end_date = date(start_year + 1, start_month, 1)

        deposit = (
            application.unit.rent_amount
            if application.unit and application.unit.rent_amount is not None
            else None
        )

        lease = Lease.objects.create(
            unit=application.unit,
            tenant=tenant,
            organization=application.organization,
            application=application,
            start_date=start_date,
            end_date=end_date,
            monthly_rent=application.unit.rent_amount,
            security_deposit=deposit,
            is_active=True,
            signature_status=Lease.SIGNATURE_DRAFT,
        )

        return Response(
            {"detail": "Lease created.", "lease": LeaseSerializer(lease).data},
            status=status.HTTP_201_CREATED,
        )


class PropertyViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    queryset = Property.objects.all()
    serializer_class = PropertySerializer

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            return [IsAuthenticated()]
        return [IsLandlord()]

class UnitViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    queryset = Unit.objects.all()
    serializer_class = UnitSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        property_id = self.request.query_params.get("property_id")
        is_listed = self.request.query_params.get("is_listed")
        if property_id:
            queryset = queryset.filter(property_id=property_id)
        if is_listed is not None:
            normalized = str(is_listed).strip().lower()
            if normalized in {"1", "true", "yes", "y"}:
                queryset = queryset.filter(is_listed=True)
            elif normalized in {"0", "false", "no", "n"}:
                queryset = queryset.filter(is_listed=False)
        return queryset

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            return [IsAuthenticated()]
        return [IsLandlord()]


class TenantViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        profile = getattr(self.request.user, "profile", None)
        if profile and profile.role == UserProfile.ROLE_TENANT:
            if profile.tenant_id:
                queryset = queryset.filter(id=profile.tenant_id)
            else:
                queryset = queryset.none()
        return queryset

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            return [IsAuthenticated()]
        return [IsLandlord()]


class LeaseViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    queryset = Lease.objects.all()
    serializer_class = LeaseSerializer

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            return [IsAuthenticated()]
        return [IsLandlord()]

    def get_queryset(self):
        queryset = super().get_queryset()
        profile = getattr(self.request.user, "profile", None)
        if profile and profile.role == UserProfile.ROLE_TENANT:
            if profile.tenant_id:
                queryset = queryset.filter(tenant_id=profile.tenant_id)
            else:
                queryset = queryset.none()
        return queryset

    def _resolve_lease(self):
        return self.get_object()

    @staticmethod
    def _build_lease_summary(lease):
        content = ""
        if lease.lease_document and lease.lease_document.file:
            try:
                lease.lease_document.file.seek(0)
                content = lease.lease_document.file.read().decode("utf-8", errors="ignore")
            except Exception:
                content = ""
        if not content:
            content = generate_lease_document(lease)
        return content

    @action(detail=True, methods=["post"], url_path="generate-document")
    def generate_document(self, request, pk=None):
        lease = self._resolve_lease()
        content = generate_lease_document(lease)

        if lease.lease_document_id:
            document = lease.lease_document
            document.file.save(
                f"lease_{lease.id}.html",
                ContentFile(content.encode("utf-8")),
                save=True,
            )
            document.name = f"Lease Agreement - Lease {lease.id}"
            document.file_size = len(content.encode("utf-8"))
            document.file_type = "html"
            document.save(update_fields=["name", "file_size", "file_type", "updated_at"])
        else:
            document = Document.objects.create(
                name=f"Lease Agreement - Lease {lease.id}",
                file=ContentFile(content.encode("utf-8"), name=f"lease_{lease.id}.html"),
                organization=lease.organization,
                document_type=Document.TYPE_LEASE_AGREEMENT,
                uploaded_by=request.user,
                property=lease.unit.property,
                unit=lease.unit,
                tenant=lease.tenant,
                lease=lease,
                description=f"Generated lease agreement for tenant {lease.tenant}",
                file_size=len(content.encode("utf-8")),
                file_type="html",
            )
            lease.lease_document = document

        lease.signature_status = Lease.SIGNATURE_DRAFT
        lease.save(update_fields=["lease_document", "signature_status", "updated_at"])
        return Response(
            {
                "detail": "Lease document generated.",
                "lease": LeaseSerializer(lease).data,
                "content": content,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="send-for-signing")
    def send_for_signing(self, request, pk=None):
        lease = self._resolve_lease()

        if not lease.lease_document_id:
            return Response(
                {"detail": "Generate a lease document before sending for signing."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        signing_token = lease.signing_token
        if not signing_token:
            signing_token = uuid.uuid4().hex
            while Lease.objects.filter(signing_token=signing_token).exclude(pk=lease.pk).exists():
                signing_token = uuid.uuid4().hex
            lease.signing_token = signing_token

        lease.signature_status = Lease.SIGNATURE_SENT
        lease.save(update_fields=["signing_token", "signature_status", "updated_at"])

        property_obj = lease.unit.property if lease.unit else None
        property_name = property_obj.name if property_obj else ""
        tenant_name = f"{lease.tenant.first_name} {lease.tenant.last_name}".strip() if lease.tenant else ""
        signing_link = f"/lease/sign/{lease.signing_token}"
        try:
            send_lease_signing_request(
                tenant_email=(lease.tenant.email if lease.tenant else ""),
                tenant_name=tenant_name,
                property_name=property_name,
                landlord_name=(lease.organization.name if lease.organization else request.user.get_full_name() or request.user.username),
                signing_link=signing_link,
            )
        except Exception:
            logger.exception("Failed to send lease signing request for lease=%s", lease.id)

        return Response(
            {
                "detail": "Lease sent for signing.",
                "signing_token": lease.signing_token,
                "signing_link": signing_link,
                "lease": LeaseSerializer(lease).data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="landlord-sign")
    def landlord_sign(self, request, pk=None):
        lease = self._resolve_lease()
        signature = (request.data.get("signature") or "").strip()
        if not signature:
            return Response(
                {"signature": "Signature is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        lease.landlord_signature = signature
        lease.landlord_signed_date = timezone.now()
        if lease.tenant_signature and lease.signature_status != Lease.SIGNATURE_DECLINED:
            lease.signature_status = Lease.SIGNATURE_SIGNED
        else:
            lease.signature_status = Lease.SIGNATURE_SENT
        lease.save(
            update_fields=[
                "landlord_signature",
                "landlord_signed_date",
                "signature_status",
                "updated_at",
            ]
        )
        try:
            if lease.signature_status == Lease.SIGNATURE_SIGNED:
                tenant_email = lease.tenant.email if lease.tenant else None
                tenant_name = f"{lease.tenant.first_name} {lease.tenant.last_name}".strip() if lease.tenant else ""
                property_name = lease.unit.property.name if lease.unit and lease.unit.property else ""
                landlord_email = request.user.email or (lease.organization.owner.email if lease.organization and lease.organization.owner else None)
                landlord_name = lease.organization.name if lease.organization else (request.user.get_full_name() or request.user.username)
                send_lease_fully_executed(
                    tenant_email=tenant_email,
                    tenant_name=tenant_name,
                    property_name=property_name,
                    landlord_email=landlord_email,
                    landlord_name=landlord_name,
                )
        except Exception:
            logger.exception("Failed to send fully executed lease emails for lease=%s", lease.id)
        return Response(
            {
                "detail": "Landlord signature saved.",
                "lease": LeaseSerializer(lease).data,
            },
            status=status.HTTP_200_OK,
        )


class LeaseSigningPublicView(APIView):
    permission_classes = [AllowAny]

    @staticmethod
    def _lease_content(lease):
        if lease.lease_document and lease.lease_document.file:
            try:
                lease.lease_document.file.seek(0)
                return lease.lease_document.file.read().decode("utf-8", errors="ignore")
            except Exception:
                return generate_lease_document(lease)
        return generate_lease_document(lease)

    @staticmethod
    def _build_payload(lease, content):
        property_obj = lease.unit.property if lease.unit else None
        address_parts = []
        if property_obj:
            if property_obj.address_line1:
                address_parts.append(property_obj.address_line1)
            if property_obj.address_line2:
                address_parts.append(property_obj.address_line2)
            if property_obj.city or property_obj.state or property_obj.zip_code:
                address_parts.append(
                    f"{property_obj.city}, {property_obj.state} {property_obj.zip_code}".strip()
                )

        return {
            "id": lease.id,
            "signature_status": lease.signature_status,
            "start_date": lease.start_date,
            "end_date": lease.end_date,
            "monthly_rent": str(lease.monthly_rent),
            "security_deposit": str(lease.security_deposit),
            "tenant_signature": lease.tenant_signature,
            "tenant_signed_date": lease.tenant_signed_date,
            "landlord_signature": lease.landlord_signature,
            "landlord_signed_date": lease.landlord_signed_date,
            "property_name": property_obj.name if property_obj else "",
            "property_address": ", ".join([part.strip() for part in address_parts if part and part.strip()]),
            "unit_number": lease.unit.unit_number if lease.unit else "",
            "landlord_name": lease.organization.name if lease.organization else "Property Management",
            "tenant_name": f"{lease.tenant.first_name} {lease.tenant.last_name}".strip() if lease.tenant else "",
            "content": content,
            "signing_token": lease.signing_token,
            "updated_at": lease.updated_at,
        }

    def get(self, request, token):
        lease = (
            Lease.objects.select_related("tenant", "unit__property", "application")
            .filter(signing_token=token)
            .first()
        )
        if not lease:
            return Response({"detail": "Lease signing link not found."}, status=status.HTTP_404_NOT_FOUND)

        payload = self._build_payload(lease, self._lease_content(lease))
        return Response(payload, status=status.HTTP_200_OK)

    def post(self, request, token):
        lease = (
            Lease.objects.select_related("tenant", "unit")
            .filter(signing_token=token)
            .first()
        )
        if not lease:
            return Response({"detail": "Lease signing link not found."}, status=status.HTTP_404_NOT_FOUND)

        payload = request.data or {}
        agreed = payload.get("agreed")
        if isinstance(agreed, str):
            agreed = agreed.lower() in {"true", "1", "yes", "y"}
        if agreed is None:
            return Response({"agreed": "agreed is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not isinstance(agreed, bool):
            return Response({"agreed": "agreed must be a boolean."}, status=status.HTTP_400_BAD_REQUEST)

        if lease.signature_status == Lease.SIGNATURE_SIGNED:
            return Response(
                {
                    "detail": "This lease has already been signed.",
                    "lease": LeaseSerializer(lease).data,
                    "content": self._lease_content(lease),
                },
                status=status.HTTP_200_OK,
            )

        signature = (payload.get("signature") or "").strip()
        if agreed and not signature:
            return Response({"signature": "Signature is required when agreeing."}, status=status.HTTP_400_BAD_REQUEST)

        if agreed:
            lease.tenant_signature = signature
            lease.tenant_signed_date = timezone.now()
            lease.signature_status = Lease.SIGNATURE_SIGNED if lease.landlord_signature else Lease.SIGNATURE_VIEWED
        else:
            lease.signature_status = Lease.SIGNATURE_DECLINED
            lease.tenant_signature = signature
            lease.tenant_signed_date = timezone.now()

        lease.save(update_fields=["tenant_signature", "tenant_signed_date", "signature_status", "updated_at"])
        try:
            tenant_name = (
                f"{lease.tenant.first_name} {lease.tenant.last_name}".strip()
                if lease.tenant
                else ""
            )
            property_name = (
                lease.unit.property.name
                if lease.unit and lease.unit.property
                else ""
            )
            if agreed:
                send_lease_signed_confirmation(
                    tenant_email=lease.tenant.email if lease.tenant else "",
                    tenant_name=tenant_name,
                    property_name=property_name,
                )
            if agreed and lease.landlord_signature and lease.signature_status == Lease.SIGNATURE_SIGNED:
                send_lease_fully_executed(
                    tenant_email=lease.tenant.email if lease.tenant else "",
                    tenant_name=tenant_name,
                    property_name=property_name,
                    landlord_email=(
                        lease.application and lease.application.reviewed_by.email
                        if lease.application and lease.application.reviewed_by
                        else lease.organization.owner.email
                        if lease.organization and lease.organization.owner
                        else None
                    ),
                    landlord_name=(
                        lease.organization.name
                        if lease.organization
                        else "Property Management"
                    ),
                )
        except Exception:
            logger.exception("Failed to send lease notification after tenant signature for lease=%s", lease.id)
        return Response(
            {
                "detail": "Tenant signature recorded.",
                "lease": LeaseSerializer(lease).data,
                "content": self._lease_content(lease),
            },
            status=status.HTTP_200_OK,
        )



class PaymentViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            return [IsAuthenticated()]
        return [IsLandlord()]

    def get_queryset(self):
        queryset = super().get_queryset()
        profile = getattr(self.request.user, "profile", None)
        if profile and profile.role == UserProfile.ROLE_TENANT:
            if profile.tenant_id:
                queryset = queryset.filter(lease__tenant_id=profile.tenant_id)
            else:
                queryset = queryset.none()
        return queryset


class MaintenanceRequestViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    queryset = MaintenanceRequest.objects.all()
    serializer_class = MaintenanceRequestSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        profile = getattr(self.request.user, "profile", None)
        if profile and profile.role == UserProfile.ROLE_TENANT:
            if profile.tenant_id:
                queryset = queryset.filter(tenant_id=profile.tenant_id)
            else:
                queryset = queryset.none()

        status_filter = self.request.query_params.get("status")
        unit_id = self.request.query_params.get("unit_id")
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if unit_id:
            queryset = queryset.filter(unit_id=unit_id)
        return queryset

    def get_permissions(self):
        if self.action == "destroy":
            return [IsLandlord()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        profile = getattr(self.request.user, "profile", None)
        organization = resolve_request_organization(self.request)
        if not organization:
            if self.request.user.is_authenticated:
                logger.warning(
                    "Creating maintenance request without organization context. user=%s",
                    getattr(self.request.user, "id", None),
                )
                organization = None
            else:
                raise PermissionDenied("You must belong to an organization to create records.")
        if profile and profile.role == UserProfile.ROLE_TENANT:
            if not profile.tenant_id:
                raise ValidationError(
                    {"tenant": "Tenant users must be linked to a tenant record."}
                )
            instance = serializer.save(
                tenant_id=profile.tenant_id, organization=organization
            )
        else:
            instance = serializer.save(organization=organization)

        if instance:
            try:
                property_obj = instance.unit.property if instance.unit else None
                property_name = property_obj.name if property_obj else ""
                unit_number = instance.unit.unit_number if instance.unit else ""
                landlord = organization.owner if organization else None
                tenant_name = (
                    f"{instance.tenant.first_name} {instance.tenant.last_name}".strip()
                    if instance.tenant
                    else ""
                )
                if landlord and landlord.email:
                    send_maintenance_request_submitted(
                        landlord_email=landlord.email,
                        landlord_name=landlord.get_full_name() or landlord.username,
                        tenant_name=tenant_name,
                        property_name=property_name,
                        unit_number=unit_number,
                        request_title=instance.title,
                    )
            except Exception:
                logger.exception(
                    "Failed to send maintenance request submitted email for request=%s",
                    instance.id if instance else None,
                )

    def perform_update(self, serializer):
        instance = self.get_object()
        old_status = instance.status
        updated_instance = serializer.save()
        if old_status != updated_instance.status:
            try:
                property_obj = updated_instance.unit.property if updated_instance.unit else None
                property_name = property_obj.name if property_obj else ""
                unit_number = updated_instance.unit.unit_number if updated_instance.unit else ""
                if updated_instance.tenant and updated_instance.tenant.email:
                    send_maintenance_status_update(
                        tenant_email=updated_instance.tenant.email,
                        tenant_name=f"{updated_instance.tenant.first_name} {updated_instance.tenant.last_name}".strip(),
                        request_title=updated_instance.title,
                        new_status=updated_instance.status,
                    )
            except Exception:
                logger.exception(
                    "Failed to send maintenance status update email for request=%s",
                    updated_instance.id,
                )

class NotificationViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    queryset = Notification.objects.select_related("recipient")
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_queryset(self):
        queryset = super().get_queryset()
        if not queryset:
            return queryset
        return queryset.filter(recipient=self.request.user)

    def partial_update(self, request, *args, **kwargs):
        notification = self.get_object()
        notification.is_read = bool(request.data.get("is_read", True))
        notification.save(update_fields=["is_read"])
        return Response(self.get_serializer(notification).data)

    @action(detail=False, methods=["patch"], url_path="mark-all-read")
    def mark_all_read(self, request):
        updated_count = self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({"updated": updated_count})

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        count = self.get_queryset().filter(is_read=False).count()
        return Response({"unread_count": count})


class MessageViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    queryset = Message.objects.select_related("sender", "recipient", "parent")
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        queryset = super().get_queryset()
        if not queryset:
            return queryset

        queryset = queryset.select_related(
            "sender", "recipient", "recipient_tenant", "parent"
        )
        profile = getattr(self.request.user, "profile", None)
        tenant_id = getattr(profile, "tenant_id", None)

        if self.action == "list":
            if profile and profile.role == UserProfile.ROLE_TENANT and tenant_id:
                queryset = queryset.filter(
                    Q(recipient=self.request.user) | Q(recipient_tenant_id=tenant_id)
                )
            else:
                queryset = queryset.filter(recipient=self.request.user)
        else:
            queryset = queryset.filter(
                Q(sender=self.request.user)
                | Q(recipient=self.request.user)
                | Q(recipient_tenant_id=tenant_id)
            )
        return queryset.order_by("-created_at")

    def create(self, request, *args, **kwargs):
        organization = resolve_request_organization(self.request)
        if not organization:
            return Response(
                {"detail": "No organization assigned to this user."},
                status=status.HTTP_403_FORBIDDEN,
            )

        recipient_user_id = request.data.get("recipient")
        recipient_tenant_id = request.data.get("recipient_tenant")
        subject = (request.data.get("subject") or "").strip()
        body = (request.data.get("body") or "").strip()

        if (not recipient_user_id and not recipient_tenant_id) or (
            recipient_user_id and recipient_tenant_id
        ):
            return Response(
                {
                    "recipient": "Specify exactly one of 'recipient' or 'recipient_tenant'."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not subject:
            return Response(
                {"subject": "Subject is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not body:
            return Response(
                {"body": "Message body is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        message_kwargs = {
            "sender": request.user,
            "subject": subject,
            "body": body,
            "organization": organization,
        }

        if recipient_tenant_id:
            try:
                recipient_tenant = Tenant.objects.get(
                    id=recipient_tenant_id, organization=organization
                )
            except Tenant.DoesNotExist:
                return Response(
                    {"recipient_tenant": "Recipient tenant not found in your organization."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            message_kwargs["recipient_tenant"] = recipient_tenant
        else:
            try:
                recipient = User.objects.get(id=recipient_user_id)
            except User.DoesNotExist:
                return Response(
                    {"recipient": "Recipient not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            if recipient.id == request.user.id:
                return Response(
                    {"recipient": "You cannot message yourself."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            recipient_profile = getattr(recipient, "profile", None)
            if not recipient_profile or recipient_profile.organization_id != organization.id:
                return Response(
                    {"recipient": "Recipient must be in your organization."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            message_kwargs["recipient"] = recipient

        message = Message.objects.create(**message_kwargs)
        return Response(self.get_serializer(message).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], url_path="sent")
    def sent(self, request):
        queryset = Message.objects.filter(
            sender=request.user,
            organization=resolve_request_organization(request),
        ).select_related("sender", "recipient", "recipient_tenant", "parent")
        return Response(self.get_serializer(queryset, many=True).data)

    @action(detail=False, methods=["get"], url_path="users")
    def users(self, request):
        organization = resolve_request_organization(self.request)
        if not organization:
            return Response({"users": [], "tenants": []})
        users = (
            User.objects.filter(profile__organization=organization)
            .select_related("profile")
            .order_by("first_name", "last_name", "username")
        )
        tenants = Tenant.objects.filter(organization=organization).order_by(
            "first_name", "last_name"
        )

        user_payload = [
            {
                "id": user.id,
                "name": (f"{user.first_name} {user.last_name}".strip() or user.username),
                "email": user.email,
                "type": "user",
            }
            for user in users
        ]
        tenant_payload = [
            {
                "id": tenant.id,
                "name": f"{tenant.first_name} {tenant.last_name}".strip(),
                "email": tenant.email,
                "type": "tenant",
            }
            for tenant in tenants
        ]
        return Response({"users": user_payload, "tenants": tenant_payload})

    @action(detail=True, methods=["patch"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        message = self.get_object()
        message.is_read = True
        message.save(update_fields=["is_read"])
        return Response(self.get_serializer(message).data)

    @action(detail=True, methods=["post"], url_path="reply")
    def reply(self, request, pk=None):
        original = self.get_object()
        organization = resolve_request_organization(self.request)
        if not organization:
            return Response(
                {"detail": "No organization assigned to this user."},
                status=status.HTTP_403_FORBIDDEN,
            )

        body = (request.data.get("body") or "").strip()
        subject = (
            request.data.get("subject") or f"Re: {original.subject}"
        ).strip()
        if not body:
            return Response(
                {"body": "Reply body is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        profile = getattr(request.user, "profile", None)
        tenant_id = getattr(profile, "tenant_id", None)

        recipient_user_id = None
        recipient_tenant_id = None
        if request.user.id == original.sender_id:
            if original.recipient_id is not None:
                recipient_user_id = original.recipient_id
            elif original.recipient_tenant_id is not None:
                recipient_tenant_id = original.recipient_tenant_id
            else:
                return Response(
                    {"detail": "Original message is missing a valid recipient."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        elif (
            original.recipient_id == request.user.id
            or (tenant_id and original.recipient_tenant_id == tenant_id)
        ):
            recipient_user_id = original.sender_id
        else:
            return Response(
                {"detail": "You can only reply to messages that you sent or received."},
                status=status.HTTP_403_FORBIDDEN,
            )

        reply_kwargs = {
            "sender": request.user,
            "subject": subject,
            "body": body,
            "parent": original.parent or original,
            "organization": organization,
        }

        if recipient_tenant_id:
            reply_kwargs["recipient_tenant_id"] = recipient_tenant_id
            reply_kwargs["recipient"] = None
        else:
            reply_kwargs["recipient"] = User.objects.get(id=recipient_user_id)
            reply_kwargs["recipient_tenant"] = None

        reply_message = Message.objects.create(**reply_kwargs)
        return Response(
            self.get_serializer(reply_message).data,
            status=status.HTTP_201_CREATED,
        )


class ScreeningRequestViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    queryset = ScreeningRequest.objects.select_related("tenant", "requested_by")
    serializer_class = ScreeningRequestSerializer
    http_method_names = ["get", "post", "head", "options", "patch", "put"]

    def get_permissions(self):
        landlord_only_actions = {
            "create",
            "update",
            "partial_update",
            "destroy",
            "run_screening",
            "send_consent",
        }
        if self.action in landlord_only_actions:
            return [IsLandlord()]
        return [IsAuthenticated()]

    def get_queryset(self):
        queryset = super().get_queryset()
        profile = getattr(self.request.user, "profile", None)
        if profile and profile.role == UserProfile.ROLE_TENANT:
            if not profile.tenant_id:
                return queryset.none()
            return queryset.filter(tenant_id=profile.tenant_id)
        return queryset

    def create(self, request, *args, **kwargs):
        organization = resolve_request_organization(self.request)
        if not organization:
            if request.user.is_authenticated:
                logger.warning(
                    "Creating screening request without organization context. user=%s",
                    request.user.id,
                )
                organization = None
            else:
                return Response(
                    {"detail": "No organization assigned to this user."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        tenant_id = request.data.get("tenant")
        if not tenant_id:
            return Response(
                {"tenant": "Tenant is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            tenant = Tenant.objects.get(
                id=tenant_id,
                organization=organization,
            )
        except Tenant.DoesNotExist:
            return Response(
                {"tenant": "Tenant not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        consent_token = uuid.uuid4().hex
        while ScreeningRequest.objects.filter(consent_token=consent_token).exists():
            consent_token = uuid.uuid4().hex

        screening = ScreeningRequest.objects.create(
            tenant=tenant,
            requested_by=request.user,
            organization=organization,
            status=ScreeningRequest.STATUS_PENDING,
            consent_status=ScreeningRequest.CONSENT_PENDING,
            consent_token=consent_token,
            tenant_email=(request.data.get("tenant_email") or tenant.email or "").strip(),
            notes=(request.data.get("notes") or "").strip(),
        )
        return Response(self.get_serializer(screening).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="send-consent")
    def send_consent(self, request, pk=None):
        screening = self.get_object()
        organization = resolve_request_organization(request)
        if not organization:
            return Response(
                {"detail": "No organization assigned to this user."},
                status=status.HTTP_403_FORBIDDEN,
            )
        token = screening.consent_token
        if not token:
            token = uuid.uuid4().hex
            while ScreeningRequest.objects.filter(consent_token=token).exists():
                token = uuid.uuid4().hex
            screening.consent_token = token
            screening.save(update_fields=["consent_token", "updated_at"])

        link = f"/screening/consent/{token}"
        property_name = ""
        if screening.tenant and screening.tenant.id:
            latest_lease = (
                Lease.objects.filter(
                    tenant=screening.tenant, is_active=True, organization=organization
                )
                .select_related("unit__property")
                .order_by("-start_date", "-created_at")
                .first()
            )
            if latest_lease and latest_lease.unit and latest_lease.unit.property:
                property_name = latest_lease.unit.property.name
        if not property_name and screening.tenant:
            property_name = f"Tenant {screening.tenant.first_name} {screening.tenant.last_name}".strip()

        try:
            send_screening_consent_request(
                tenant_email=screening.tenant_email or screening.tenant.email,
                tenant_name=f"{screening.tenant.first_name} {screening.tenant.last_name}".strip(),
                property_name=property_name,
                landlord_name=(
                    request.user.get_full_name() or request.user.username
                ),
                consent_link=link,
            )
        except Exception:
            logger.exception("Failed to send screening consent email for screening=%s", screening.id)
        print(f"Screening consent link for request #{screening.id}: {link}")
        return Response(
            {"consent_link": link, "consent_token": token},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="run-screening")
    def run_screening(self, request, pk=None):
        screening = self.get_object()
        if screening.consent_status != ScreeningRequest.CONSENT_CONSENTED:
            return Response(
                {"detail": "Tenant consent is required before running screening."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        screening.status = ScreeningRequest.STATUS_PROCESSING
        screening.save(update_fields=["status", "updated_at"])

        credit_score = random.randint(550, 800)
        if credit_score >= 740:
            credit_rating = ScreeningRequest.CREDIT_RATING_EXCELLENT
        elif credit_score >= 670:
            credit_rating = ScreeningRequest.CREDIT_RATING_GOOD
        elif credit_score >= 580:
            credit_rating = ScreeningRequest.CREDIT_RATING_FAIR
        else:
            credit_rating = ScreeningRequest.CREDIT_RATING_POOR

        background_check = random.choices(
            [
                ScreeningRequest.BACKGROUND_CLEAR,
                ScreeningRequest.BACKGROUND_REVIEW_NEEDED,
                ScreeningRequest.BACKGROUND_FLAGGED,
            ],
            weights=[0.7, 0.2, 0.1],
            k=1,
        )[0]
        eviction_history = random.choices(
            [
                ScreeningRequest.EVICTION_NONE_FOUND,
                ScreeningRequest.EVICTION_RECORDS_FOUND,
            ],
            weights=[0.84, 0.16],
            k=1,
        )[0]
        income_verified = random.choices([True, False], weights=[0.88, 0.12], k=1)[0]
        monthly_income = Decimal(random.randint(2800, 12500))

        if (
            credit_score > 670
            and background_check == ScreeningRequest.BACKGROUND_CLEAR
            and eviction_history == ScreeningRequest.EVICTION_NONE_FOUND
        ):
            recommendation = ScreeningRequest.RECOMMENDATION_APPROVED
        elif (
            credit_score < 580
            or eviction_history == ScreeningRequest.EVICTION_RECORDS_FOUND
        ):
            recommendation = ScreeningRequest.RECOMMENDATION_DENIED
        else:
            recommendation = ScreeningRequest.RECOMMENDATION_CONDITIONAL

        screening.status = ScreeningRequest.STATUS_COMPLETED
        screening.credit_score = credit_score
        screening.credit_rating = credit_rating
        screening.background_check = background_check
        screening.eviction_history = eviction_history
        screening.income_verified = income_verified
        screening.monthly_income = monthly_income
        screening.recommendation = recommendation
        screening.notes = (
            "Automated screening simulation completed. "
            f"Recommendation: {recommendation.replace('_', ' ')}."
        )
        screening.report_data = {
            "provider": "mock_screening_engine",
            "run_timestamp": timezone.now().isoformat(),
            "credit_score": credit_score,
            "credit_rating": credit_rating,
            "background_check": background_check,
            "eviction_history": eviction_history,
            "income_verified": income_verified,
            "monthly_income": str(monthly_income),
            "recommendation": recommendation,
        }
        screening.save()
        return Response(self.get_serializer(screening).data)


class ScreeningConsentPublicView(APIView):
    permission_classes = [AllowAny]

    def _landlord_name(self, screening):
        return screening.requested_by.get_full_name() or screening.requested_by.username

    def _property_name(self, screening):
        latest_lease = (
            Lease.objects.filter(tenant=screening.tenant, is_active=True)
            .select_related("unit__property")
            .order_by("-start_date", "-created_at")
            .first()
        )
        if latest_lease and latest_lease.unit and latest_lease.unit.property:
            return latest_lease.unit.property.name
        return ""

    def get(self, request, token):
        screening = ScreeningRequest.objects.filter(
            consent_token=token,
            consent_status=ScreeningRequest.CONSENT_PENDING,
        ).select_related("tenant", "requested_by").first()

        if not screening:
            return Response(
                {"detail": "Consent link not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "screening_id": screening.id,
                "tenant_name": f"{screening.tenant.first_name} {screening.tenant.last_name}".strip(),
                "property_name": self._property_name(screening),
                "landlord_name": self._landlord_name(screening),
                "consent_status": screening.consent_status,
            }
        )

    def post(self, request, token):
        screening = ScreeningRequest.objects.filter(
            consent_token=token,
            consent_status=ScreeningRequest.CONSENT_PENDING,
        ).select_related("tenant", "requested_by").first()

        if not screening:
            return Response(
                {"detail": "Consent link not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        consent = request.data.get("consent")
        if consent is None:
            return Response(
                {"consent": "consent is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if isinstance(consent, str):
            consent = consent.lower() in {"true", "1", "yes", "y"}
        if not isinstance(consent, bool):
            return Response(
                {"consent": "consent must be a boolean."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if consent:
            serializer = TenantConsentSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            screening.tenant_ssn_last4 = serializer.validated_data.get("ssn_last4")
            screening.tenant_dob = serializer.validated_data.get("date_of_birth")
            screening.consent_status = ScreeningRequest.CONSENT_CONSENTED
        else:
            screening.consent_status = ScreeningRequest.CONSENT_DECLINED
            screening.tenant_ssn_last4 = None
            screening.tenant_dob = None

        screening.consent_date = timezone.now()
        screening.save(
            update_fields=[
                "tenant_ssn_last4",
                "tenant_dob",
                "consent_status",
                "consent_date",
                "updated_at",
            ]
        )
        return Response(
            {
                "screening_id": screening.id,
                "consent_status": screening.consent_status,
                "consent_date": screening.consent_date,
            },
            status=status.HTTP_200_OK,
        )


class DocumentViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    queryset = Document.objects.select_related(
        "uploaded_by", "property", "unit", "tenant", "lease"
    )
    serializer_class = DocumentSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if not queryset:
            return queryset

        profile = getattr(self.request.user, "profile", None)
        if profile and profile.role == UserProfile.ROLE_TENANT:
            tenant_id = profile.tenant_id
            lease_ids = []
            if tenant_id:
                lease_ids = list(
                    Lease.objects.filter(
                        tenant_id=tenant_id,
                        organization=resolve_request_organization(self.request),
                    ).values_list("id", flat=True)
                )
            queryset = queryset.filter(
                Q(tenant_id=tenant_id) | Q(lease_id__in=lease_ids)
            )

        params = self.request.query_params
        property_id = params.get("property_id")
        unit_id = params.get("unit_id")
        tenant_id = params.get("tenant_id")
        lease_id = params.get("lease_id")
        document_type = params.get("document_type")
        is_template = params.get("is_template")

        if property_id:
            queryset = queryset.filter(property_id=property_id)
        if unit_id:
            queryset = queryset.filter(unit_id=unit_id)
        if tenant_id:
            queryset = queryset.filter(tenant_id=tenant_id)
        if lease_id:
            queryset = queryset.filter(lease_id=lease_id)
        if document_type:
            queryset = queryset.filter(document_type=document_type)
        if is_template is not None:
            normalized = str(is_template).lower()
            if normalized in {"true", "1", "yes"}:
                queryset = queryset.filter(is_template=True)
            elif normalized in {"false", "0", "no"}:
                queryset = queryset.filter(is_template=False)
        return queryset

    def get_permissions(self):
        if self.action in {"create", "update", "partial_update", "destroy"}:
            return [IsLandlord()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        organization = resolve_request_organization(self.request)
        if not organization:
            raise PermissionDenied("You must belong to an organization to create records.")
        serializer.save(organization=organization)

    @action(detail=True, methods=["get"], url_path="download")
    def download(self, request, pk=None):
        document = self.get_object()
        file_handle = document.file.open("rb")
        return FileResponse(
            file_handle,
            as_attachment=True,
            filename=document.file.name.rsplit("/", 1)[-1],
        )


class AccountingCategoryViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    queryset = AccountingCategory.objects.all()
    serializer_class = AccountingCategorySerializer
    permission_classes = [IsLandlord]

    def get_queryset(self):
        organization = resolve_request_organization(self.request)
        ensure_default_categories(organization)
        if not organization:
            return AccountingCategory.objects.none()
        return AccountingCategory.objects.filter(
            Q(organization__isnull=True) | Q(organization=organization)
        )

    def perform_create(self, serializer):
        organization = resolve_request_organization(self.request)
        if not organization:
            raise PermissionDenied("You must belong to an organization.")
        serializer.save(organization=organization, is_system=False)

    def perform_update(self, serializer):
        instance = serializer.instance
        if instance and instance.is_system:
            raise PermissionDenied("System categories cannot be edited.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.is_system:
            raise PermissionDenied("System categories cannot be deleted.")
        instance.delete()


class TransactionViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    queryset = Transaction.objects.select_related(
        "category",
        "property",
        "unit",
        "tenant",
        "lease",
        "payment",
        "created_by",
    )
    serializer_class = TransactionSerializer
    permission_classes = [IsLandlord]

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params
        property_id = params.get("property")
        if property_id:
            queryset = queryset.filter(property_id=property_id)
        unit_id = params.get("unit")
        if unit_id:
            queryset = queryset.filter(unit_id=unit_id)
        tenant_id = params.get("tenant")
        if tenant_id:
            queryset = queryset.filter(tenant_id=tenant_id)
        category_id = params.get("category")
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        transaction_type = params.get("transaction_type")
        if transaction_type:
            queryset = queryset.filter(transaction_type=transaction_type)
        date_from = params.get("date_from")
        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        date_to = params.get("date_to")
        if date_to:
            queryset = queryset.filter(date__lte=date_to)
        return queryset

    def create(self, request, *args, **kwargs):
        organization = resolve_request_organization(request)
        if not organization:
            raise PermissionDenied("You must belong to an organization.")

        payload = request.data
        is_bulk = isinstance(payload, list)
        serializer = self.get_serializer(data=payload, many=is_bulk)
        serializer.is_valid(raise_exception=True)

        if is_bulk:
            rows = []
            for row in serializer.validated_data:
                rows.append(
                    Transaction(
                        organization=organization,
                        created_by=request.user,
                        category=row.get("category"),
                        transaction_type=row.get("transaction_type"),
                        amount=row.get("amount"),
                        date=row.get("date"),
                        description=row.get("description"),
                        property=row.get("property"),
                        unit=row.get("unit"),
                        tenant=row.get("tenant"),
                        lease=row.get("lease"),
                        payment=row.get("payment"),
                        is_recurring=row.get("is_recurring", False),
                        recurring_frequency=row.get("recurring_frequency"),
                        vendor=row.get("vendor", ""),
                        reference_number=row.get("reference_number", ""),
                        receipt_document=row.get("receipt_document"),
                        notes=row.get("notes", ""),
                    )
                )
            objs = Transaction.objects.bulk_create(rows)
            response = self.get_serializer(objs, many=True)
            return Response(response.data, status=status.HTTP_201_CREATED)

        instance = serializer.save(organization=organization, created_by=request.user)
        return Response(
            self.get_serializer(instance).data,
            status=status.HTTP_201_CREATED,
        )


class AccountingDashboardView(APIView):
    permission_classes = [IsLandlord]

    def get(self, request):
        organization = resolve_request_organization(request)
        if not organization:
            return Response(
                {"detail": "No organization assigned."},
                status=status.HTTP_404_NOT_FOUND,
            )

        ensure_default_categories(organization)

        today = timezone.now().date()
        month_start = date(today.year, today.month, 1)
        ytd_start = date(today.year, 1, 1)
        property_id = request.query_params.get("property_id")

        base_transactions = Transaction.objects.filter(organization=organization)
        if property_id:
            base_transactions = base_transactions.filter(property_id=property_id)

        month_txns = base_transactions.filter(date__gte=month_start, date__lte=today)
        ytd_txns = base_transactions.filter(date__gte=ytd_start, date__lte=today)

        total_income_current = (
            month_txns.filter(transaction_type=Transaction.TYPE_INCOME).aggregate(total=Sum("amount"))[
                "total"
            ]
            or Decimal("0.00")
        )
        total_expenses_current = (
            month_txns.filter(transaction_type=Transaction.TYPE_EXPENSE).aggregate(total=Sum("amount"))[
                "total"
            ]
            or Decimal("0.00")
        )
        total_income_ytd = (
            ytd_txns.filter(transaction_type=Transaction.TYPE_INCOME).aggregate(total=Sum("amount"))[
                "total"
            ]
            or Decimal("0.00")
        )
        total_expenses_ytd = (
            ytd_txns.filter(transaction_type=Transaction.TYPE_EXPENSE).aggregate(total=Sum("amount"))[
                "total"
            ]
            or Decimal("0.00")
        )

        rent_income_category = _resolve_reporting_category(
            organization,
            "Rent Income",
            AccountingCategory.TYPE_INCOME,
        )
        paid_this_month = (
            month_txns.filter(
                transaction_type=Transaction.TYPE_INCOME,
                category=rent_income_category,
            ).aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
        )
        expected_monthly_rent = (
            Lease.objects.filter(organization=organization, is_active=True).aggregate(
                total=Sum("monthly_rent")
            )["total"]
            or Decimal("0.00")
        )
        rent_collection_rate = (
            (paid_this_month / expected_monthly_rent * Decimal("100"))
            if expected_monthly_rent > 0
            else Decimal("0.00")
        )

        total_units = Unit.objects.filter(organization=organization).count() or 0
        occupied_units = (
            Lease.objects.filter(organization=organization, is_active=True)
            .values("unit_id")
            .distinct()
            .count()
        )
        occupancy_rate = (
            (Decimal(occupied_units) / Decimal(total_units) * Decimal("100"))
            if total_units > 0
            else Decimal("0.00")
        )

        outstanding_balances = Decimal("0.00")
        for lease in Lease.objects.filter(organization=organization, is_active=True):
            lease_payment = (
                month_txns.filter(
                    lease_id=lease.id,
                    transaction_type=Transaction.TYPE_INCOME,
                    category=rent_income_category,
                ).aggregate(total=Sum("amount"))["total"]
                or Decimal("0.00")
            )
            outstanding_balances += max(Decimal("0.00"), lease.monthly_rent - lease_payment)

        trend_start = today.replace(day=1) - timedelta(days=365)
        trend = []
        for month_key, month_label in _month_labels(trend_start, today):
            year_value, month_value = month_key.split("-", 1)
            month_start_value = date(int(year_value), int(month_value), 1)
            month_end_value = _month_end(month_start_value)
            bucket = base_transactions.filter(date__gte=month_start_value, date__lte=month_end_value)
            month_income = (
                bucket.filter(transaction_type=Transaction.TYPE_INCOME).aggregate(
                    total=Sum("amount")
                )["total"]
                or Decimal("0.00")
            )
            month_expenses = (
                bucket.filter(transaction_type=Transaction.TYPE_EXPENSE).aggregate(
                    total=Sum("amount")
                )["total"]
                or Decimal("0.00")
            )
            trend.append(
                {
                    "month": month_label,
                    "income": _to_float(month_income),
                    "expenses": _to_float(month_expenses),
                }
            )

        top_expense_categories = (
            base_transactions.filter(transaction_type=Transaction.TYPE_EXPENSE)
            .values("category__name")
            .annotate(total=Coalesce(Sum("amount"), Value(Decimal("0.00"))))
            .order_by("-total")[:5]
        )

        return Response(
            {
                "total_income_current_month": _to_float(total_income_current),
                "total_expenses_current_month": _to_float(total_expenses_current),
                "noi_current_month": _to_float(total_income_current - total_expenses_current),
                "total_income_ytd": _to_float(total_income_ytd),
                "total_expenses_ytd": _to_float(total_expenses_ytd),
                "noi_ytd": _to_float(total_income_ytd - total_expenses_ytd),
                "monthly_trend": trend,
                "top_expense_categories": [
                    {"category": row["category__name"] or "Uncategorized", "total": _to_float(row["total"])}
                    for row in top_expense_categories
                ],
                "occupancy_rate": float(occupancy_rate),
                "rent_collection_rate": float(rent_collection_rate),
                "outstanding_balances": _to_float(outstanding_balances),
            }
        )


class AccountingPnLView(APIView):
    permission_classes = [IsLandlord]

    def get(self, request):
        organization = resolve_request_organization(request)
        if not organization:
            return Response(
                {"detail": "No organization assigned."},
                status=status.HTTP_404_NOT_FOUND,
            )

        property_id = request.query_params.get("property_id")
        date_from = _parse_date_value(request.query_params.get("date_from")) or date(
            timezone.now().year,
            1,
            1,
        )
        date_to = _parse_date_value(request.query_params.get("date_to")) or timezone.now().date()

        queryset = Transaction.objects.filter(
            organization=organization,
            date__gte=date_from,
            date__lte=date_to,
        )
        if property_id:
            queryset = queryset.filter(property_id=property_id)

        income_lines = (
            queryset.filter(transaction_type=Transaction.TYPE_INCOME)
            .values("category__name")
            .annotate(total=Coalesce(Sum("amount"), Value(Decimal("0.00"))))
            .order_by("category__name")
        )
        expense_lines = (
            queryset.filter(transaction_type=Transaction.TYPE_EXPENSE)
            .values("category__name")
            .annotate(total=Coalesce(Sum("amount"), Value(Decimal("0.00"))))
            .order_by("category__name")
        )

        total_income = (
            queryset.filter(transaction_type=Transaction.TYPE_INCOME).aggregate(total=Sum("amount"))[
                "total"
            ]
            or Decimal("0.00")
        )
        total_expenses = (
            queryset.filter(transaction_type=Transaction.TYPE_EXPENSE).aggregate(
                total=Sum("amount")
            )["total"]
            or Decimal("0.00")
        )

        return Response(
            {
                "property_id": property_id,
                "date_from": str(date_from),
                "date_to": str(date_to),
                "income": [
                    {
                        "category": row["category__name"] or "Uncategorized",
                        "total": _to_float(row["total"]),
                    }
                    for row in income_lines
                ],
                "expenses": [
                    {
                        "category": row["category__name"] or "Uncategorized",
                        "total": _to_float(row["total"]),
                    }
                    for row in expense_lines
                ],
                "net_income": _to_float(total_income - total_expenses),
            }
        )

class AccountingCashflowView(APIView):
    permission_classes = [IsLandlord]

    def get(self, request):
        organization = resolve_request_organization(request)
        if not organization:
            return Response(
                {"detail": "No organization assigned."},
                status=status.HTTP_404_NOT_FOUND,
            )

        today = timezone.now().date()
        start = date(today.year - 1, today.month, 1)
        queryset = Transaction.objects.filter(
            organization=organization,
            date__gte=start,
            date__lte=today,
        )

        cashflow = []
        for month_key, month_label in _month_labels(start, today):
            year_value, month_value = month_key.split("-", 1)
            bucket_start = date(int(year_value), int(month_value), 1)
            bucket_end = _month_end(bucket_start)
            bucket = queryset.filter(date__gte=bucket_start, date__lte=bucket_end)
            income = (
                bucket.filter(transaction_type=Transaction.TYPE_INCOME).aggregate(
                    total=Sum("amount")
                )["total"]
                or Decimal("0.00")
            )
            expense = (
                bucket.filter(transaction_type=Transaction.TYPE_EXPENSE).aggregate(
                    total=Sum("amount")
                )["total"]
                or Decimal("0.00")
            )
            cashflow.append(
                {
                    "month": month_label,
                    "income": _to_float(income),
                    "expense": _to_float(expense),
                    "net": _to_float(income - expense),
                }
            )

        return Response({"cashflow": cashflow})


class AccountingRentRollView(APIView):
    permission_classes = [IsLandlord]

    def get(self, request):
        organization = resolve_request_organization(request)
        if not organization:
            return Response(
                {"detail": "No organization assigned."},
                status=status.HTTP_404_NOT_FOUND,
            )

        property_id = request.query_params.get("property_id")
        rent_income_category = _resolve_reporting_category(
            organization,
            "Rent Income",
            AccountingCategory.TYPE_INCOME,
        )
        now = timezone.now().date()
        month_start = date(now.year, now.month, 1)

        leases = Lease.objects.filter(organization=organization, is_active=True).select_related(
            "tenant",
            "unit",
            "unit__property",
        )
        if property_id:
            leases = leases.filter(unit__property_id=property_id)

        rows = []
        total_expected_rent = Decimal("0.00")
        total_collected = Decimal("0.00")
        total_outstanding = Decimal("0.00")

        for lease in leases:
            monthly_rent = lease.monthly_rent or Decimal("0.00")
            total_expected_rent += monthly_rent

            collected_this_month = (
                Transaction.objects.filter(
                    organization=organization,
                    lease=lease,
                    transaction_type=Transaction.TYPE_INCOME,
                    category=rent_income_category,
                    date__gte=month_start,
                ).aggregate(total=Sum("amount"))["total"]
                or Decimal("0.00")
            )
            collected_total = (
                Transaction.objects.filter(
                    organization=organization,
                    lease=lease,
                    transaction_type=Transaction.TYPE_INCOME,
                    category=rent_income_category,
                ).aggregate(total=Sum("amount"))["total"]
                or Decimal("0.00")
            )
            total_collected += collected_this_month
            balance_due = max(Decimal("0.00"), monthly_rent - collected_this_month)
            total_outstanding += balance_due

            last_payment = (
                Transaction.objects.filter(
                    organization=organization,
                    lease=lease,
                    transaction_type=Transaction.TYPE_INCOME,
                    category=rent_income_category,
                )
                .order_by("-date", "-id")
                .first()
            )
            last_payment_date = last_payment.date if last_payment else None
            days_since_last = (now - last_payment_date).days if last_payment_date else None
            if balance_due <= Decimal("0.00"):
                status_label = "current"
            elif days_since_last is not None and days_since_last >= 30:
                status_label = "delinquent"
            else:
                status_label = "overdue"

            rows.append(
                {
                    "tenant_name": f"{lease.tenant.first_name} {lease.tenant.last_name}".strip(),
                    "property": lease.unit.property.name if lease.unit and lease.unit.property else "",
                    "unit": lease.unit.unit_number if lease.unit else "",
                    "monthly_rent": _to_float(monthly_rent),
                    "last_payment_date": str(last_payment_date) if last_payment_date else None,
                    "days_since_last_payment": days_since_last,
                    "balance_due": _to_float(balance_due),
                    "status": status_label,
                    "collected_total": _to_float(collected_total),
                }
            )

        collection_rate = (
            (float(total_collected) / float(total_expected_rent) * 100.0)
            if total_expected_rent > 0
            else 0.0
        )

        return Response(
            {
                "rows": rows,
                "summary": {
                    "total_expected_rent": float(total_expected_rent),
                    "total_collected": float(total_collected),
                    "total_outstanding": float(total_outstanding),
                    "collection_rate": collection_rate,
                },
            }
        )


class AccountingTaxReportView(APIView):
    permission_classes = [IsLandlord]

    def get(self, request):
        organization = resolve_request_organization(request)
        if not organization:
            return Response(
                {"detail": "No organization assigned."},
                status=status.HTTP_404_NOT_FOUND,
            )

        property_id = request.query_params.get("property_id")
        try:
            year = int(request.query_params.get("year") or timezone.now().year)
        except ValueError:
            year = timezone.now().year

        queryset = Transaction.objects.filter(
            organization=organization,
            transaction_type=Transaction.TYPE_EXPENSE,
            date__year=year,
        )
        if property_id:
            queryset = queryset.filter(property_id=property_id)

        rows = queryset.order_by("date").values(
            "date",
            "description",
            "amount",
            "vendor",
            "property__name",
            "category__name",
            "category__tax_deductible",
        )

        line_items = []
        for row in rows:
            line_items.append(
                {
                    "date": row["date"].isoformat(),
                    "description": row["description"],
                    "amount": _to_float(row["amount"]),
                    "vendor": row["vendor"],
                    "property": row["property__name"],
                    "category": row["category__name"],
                    "tax_deductible": bool(row["category__tax_deductible"]),
                }
            )

        category_totals = defaultdict(Decimal)
        deductible_total = Decimal("0.00")
        for row in line_items:
            category_totals[row["category"] or "Uncategorized"] += Decimal(str(row["amount"]))
            if row["tax_deductible"]:
                deductible_total += Decimal(str(row["amount"]))

        total_expense = sum((Decimal(str(item["amount"])) for item in line_items), Decimal("0.00"))

        return Response(
            {
                "year": year,
                "property_id": property_id,
                "line_items": line_items,
                "expenses_by_category": [
                    {"category": category, "total": _to_float(total)}
                    for category, total in sorted(category_totals.items())
                ],
                "total_deductible": _to_float(deductible_total),
                "total_expenses": _to_float(total_expense),
            }
        )


class OwnerStatementViewSet(OrganizationQuerySetMixin, viewsets.ReadOnlyModelViewSet):
    queryset = OwnerStatement.objects.select_related("property", "generated_by")
    serializer_class = OwnerStatementSerializer
    permission_classes = [IsLandlord]


class GenerateOwnerStatementView(APIView):
    permission_classes = [IsLandlord]

    def post(self, request):
        organization = resolve_request_organization(request)
        if not organization:
            return Response(
                {"detail": "No organization assigned."},
                status=status.HTTP_404_NOT_FOUND,
            )

        property_id = request.data.get("property_id")
        period_start = self._parse_date(request.data.get("period_start"))
        period_end = self._parse_date(request.data.get("period_end"))
        if not property_id or not period_start or not period_end:
            return Response(
                {"detail": "property_id, period_start, and period_end are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if period_end < period_start:
            return Response(
                {"detail": "period_end must be on or after period_start."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            property_obj = Property.objects.get(id=property_id, organization=organization)
        except Property.DoesNotExist:
            return Response({"property_id": "Property not found."}, status=status.HTTP_404_NOT_FOUND)

        queryset = Transaction.objects.filter(
            organization=organization,
            property=property_obj,
            date__gte=period_start,
            date__lte=period_end,
        )

        income_by_category = (
            queryset.filter(transaction_type=Transaction.TYPE_INCOME)
            .values("category__name")
            .annotate(total=Coalesce(Sum("amount"), Value(Decimal("0.00"))))
            .order_by("category__name")
        )
        expense_by_category = (
            queryset.filter(transaction_type=Transaction.TYPE_EXPENSE)
            .values("category__name")
            .annotate(total=Coalesce(Sum("amount"), Value(Decimal("0.00"))))
            .order_by("category__name")
        )

        total_income = (
            queryset.filter(transaction_type=Transaction.TYPE_INCOME).aggregate(total=Sum("amount"))[
                "total"
            ]
            or Decimal("0.00")
        )
        total_expenses = (
            queryset.filter(transaction_type=Transaction.TYPE_EXPENSE).aggregate(total=Sum("amount"))[
                "total"
            ]
            or Decimal("0.00")
        )

        statement = OwnerStatement.objects.create(
            organization=organization,
            property=property_obj,
            period_start=period_start,
            period_end=period_end,
            total_income=total_income,
            total_expenses=total_expenses,
            net_income=total_income - total_expenses,
            generated_by=request.user,
            data={
                "income_by_category": [
                    {"category": row["category__name"], "total": _to_float(row["total"])}
                    for row in income_by_category
                ],
                "expenses_by_category": [
                    {"category": row["category__name"], "total": _to_float(row["total"])}
                    for row in expense_by_category
                ],
            },
        )
        return Response(OwnerStatementSerializer(statement).data, status=status.HTTP_201_CREATED)

    def _parse_date(self, value):
        if not value:
            return None
        try:
            return date.fromisoformat(value)
        except ValueError:
            return None

class ExpenseViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    queryset = Expense.objects.select_related("property", "unit", "receipt", "created_by")
    serializer_class = ExpenseSerializer
    permission_classes = [IsLandlord]

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params
        property_id = params.get("property_id")
        category = params.get("category")
        date_from = params.get("date_from")
        date_to = params.get("date_to")
        if property_id:
            queryset = queryset.filter(property_id=property_id)
        if category:
            queryset = queryset.filter(category=category)
        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)
        return queryset

    def perform_create(self, serializer):
        organization = resolve_request_organization(self.request)
        if not organization:
            if self.request.user.is_authenticated:
                logger.warning(
                    "Creating expense without organization context. user=%s",
                    self.request.user.id,
                )
                serializer.save(created_by=self.request.user)
                return
            raise PermissionDenied("You must belong to an organization to create records.")
        serializer.save(created_by=self.request.user, organization=organization)


class RentLedgerEntryViewSet(OrganizationQuerySetMixin, viewsets.ReadOnlyModelViewSet):
    queryset = RentLedgerEntry.objects.select_related("lease", "payment")
    serializer_class = RentLedgerEntrySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        profile = getattr(self.request.user, "profile", None)
        if profile and profile.role == UserProfile.ROLE_TENANT:
            if profile.tenant_id:
                queryset = queryset.filter(lease__tenant_id=profile.tenant_id)
            else:
                queryset = queryset.none()
        lease_id = self.request.query_params.get("lease_id")
        if lease_id:
            queryset = queryset.filter(lease_id=lease_id)
        return queryset


class LateFeeRuleViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    queryset = LateFeeRule.objects.all()
    serializer_class = LateFeeRuleSerializer
    permission_classes = [IsLandlord]


class GenerateChargesView(APIView):
    permission_classes = [IsLandlord]

    def post(self, request):
        today = timezone.now().date()
        month_label = today.strftime("%B %Y")
        charges_created = 0
        late_fees_created = 0

        organization = resolve_request_organization(request)
        for lease in (
            Lease.objects.filter(
                is_active=True,
                organization=organization,
            )
            .select_related("unit", "unit__property")
        ):
            charge_description = f"{month_label} Rent"
            existing_charge = RentLedgerEntry.objects.filter(
                lease=lease,
                entry_type=RentLedgerEntry.TYPE_CHARGE,
                description=charge_description,
                date__year=today.year,
                date__month=today.month,
            ).exists()
            if not existing_charge:
                RentLedgerEntry.objects.create(
                    lease=lease,
                    organization=organization,
                    entry_type=RentLedgerEntry.TYPE_CHARGE,
                    description=charge_description,
                    amount=lease.monthly_rent,
                    balance=Decimal("0.00"),
                    date=today,
                )
                charges_created += 1

            rule = (
                LateFeeRule.objects.filter(
                    organization=organization,
                    is_active=True,
                )
                .order_by("-created_at")
                .first()
            )
            if not rule:
                continue

            due_day = min(lease.start_date.day, 28)
            due_date = today.replace(day=due_day)
            overdue_date = due_date + timedelta(days=rule.grace_period_days)
            if today <= overdue_date:
                continue

            monthly_paid = (
                Payment.objects.filter(
                    lease=lease,
                    status=Payment.STATUS_COMPLETED,
                    organization=organization,
                    payment_date__year=today.year,
                    payment_date__month=today.month,
                ).aggregate(total=Sum("amount"))["total"]
                or Decimal("0.00")
            )
            if monthly_paid >= lease.monthly_rent:
                continue

            existing_late_fee = RentLedgerEntry.objects.filter(
                lease=lease,
                entry_type=RentLedgerEntry.TYPE_LATE_FEE,
                date__year=today.year,
                date__month=today.month,
            ).exists()
            if existing_late_fee:
                continue

            if rule.fee_type == LateFeeRule.TYPE_FLAT:
                late_fee_amount = Decimal(rule.fee_amount)
            else:
                late_fee_amount = (Decimal(lease.monthly_rent) * Decimal(rule.fee_amount)) / Decimal(
                    "100"
                )
            if rule.max_fee is not None:
                late_fee_amount = min(late_fee_amount, Decimal(rule.max_fee))

            RentLedgerEntry.objects.create(
                lease=lease,
                organization=organization,
                entry_type=RentLedgerEntry.TYPE_LATE_FEE,
                description=f"{month_label} Late Fee",
                amount=late_fee_amount,
                balance=Decimal("0.00"),
                date=today,
            )
            late_fees_created += 1

        for lease_id in Lease.objects.filter(
            organization=organization,
            is_active=True,
        ).values_list("id", flat=True):
            recalculate_lease_balances(lease_id)

        return Response(
            {
                "month": month_label,
                "charges_created": charges_created,
                "late_fees_created": late_fees_created,
            }
        )


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        organization = profile.organization
        organization_payload = None
        if organization:
            organization_payload = {
                "id": organization.id,
                "name": organization.name,
                "slug": organization.slug,
                "plan": organization.plan,
                "max_units": organization.max_units,
            }

        return Response(
            {
                "id": request.user.id,
                "username": request.user.username,
                "email": request.user.email,
                "first_name": request.user.first_name,
                "last_name": request.user.last_name,
                "role": profile.role,
                "tenant_id": profile.tenant_id,
                "is_org_admin": profile.is_org_admin,
                "organization": organization_payload,
            }
        )


class RegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        username = (request.data.get("username") or "").strip()
        email = (request.data.get("email") or "").strip()
        password = request.data.get("password") or ""
        first_name = (request.data.get("first_name") or "").strip()
        last_name = (request.data.get("last_name") or "").strip()
        role = (request.data.get("role") or UserProfile.ROLE_LANDLORD).strip().lower()
        tenant_id = request.data.get("tenant_id")

        errors = {}
        if not username:
            errors["username"] = "Username is required."
        if not email:
            errors["email"] = "Email is required."
        if not password:
            errors["password"] = "Password is required."
        if role not in {UserProfile.ROLE_LANDLORD, UserProfile.ROLE_TENANT}:
            errors["role"] = "Role must be either 'landlord' or 'tenant'."
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        logger.info("Register request received for username=%s role=%s", username, role)

        tenant = None
        if role == UserProfile.ROLE_TENANT and tenant_id:
            try:
                tenant = Tenant.objects.get(id=tenant_id)
            except Tenant.DoesNotExist:
                return Response(
                    {"tenant_id": "Tenant not found."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if User.objects.filter(username=username).exists():
            return Response(
                {"username": "Username already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(email=email).exists():
            return Response(
                {"email": "Email already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        owner_label = first_name.strip() or last_name.strip() or username
        org_name = f"{owner_label}'s Properties"

        try:
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
            )
            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.role = role
            profile.tenant = tenant
            profile.is_org_admin = role == UserProfile.ROLE_LANDLORD

            if role == UserProfile.ROLE_LANDLORD:
                organization = Organization.objects.filter(owner=user).first()
                if not organization:
                    organization = Organization.objects.create(name=org_name, owner=user)
                    logger.info(
                        "Created organization '%s' for new landlord user id=%s",
                        organization.name,
                        user.id,
                    )
                elif organization.owner_id != user.id:
                    organization.owner = user
                    organization.save(update_fields=["owner"])
                profile.organization = organization
            else:
                profile.organization = None

            profile.save(
                update_fields=["role", "tenant", "is_org_admin", "organization", "updated_at"]
            )
            logger.info(
                "Registered user id=%s role=%s org=%s",
                user.id,
                profile.role,
                profile.organization_id,
            )
        except IntegrityError:
            logger.exception("Failed to register user=%s", username)
            return Response(
                {"detail": "Unable to create user with provided details."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        organization_payload = None
        if profile.organization_id:
            organization_payload = {
                "id": profile.organization.id,
                "name": profile.organization.name,
                "slug": profile.organization.slug,
                "plan": profile.organization.plan,
                "max_units": profile.organization.max_units,
            }

        return Response(
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": profile.role,
                "tenant_id": profile.tenant_id,
                "is_org_admin": profile.is_org_admin,
                "organization": organization_payload,
            },
            status=status.HTTP_201_CREATED,
        )



