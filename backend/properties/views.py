from datetime import date, timedelta
from decimal import Decimal
import logging
import random

from django.contrib.auth.models import User
from django.db import IntegrityError
from django.db.models import Q, Sum
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
    Lease,
    MaintenanceRequest,
    Message,
    Notification,
    Organization,
    OrganizationInvitation,
    Document,
    Expense,
    LateFeeRule,
    Payment,
    Property,
    RentLedgerEntry,
    ScreeningRequest,
    Tenant,
    Unit,
    UserProfile,
)
from .permissions import IsLandlord, IsOrgAdmin
from .serializers import (
    LeaseSerializer,
    MaintenanceRequestSerializer,
    MessageSerializer,
    NotificationSerializer,
    DocumentSerializer,
    ExpenseSerializer,
    LateFeeRuleSerializer,
    PaymentSerializer,
    PropertySerializer,
    RentLedgerEntrySerializer,
    ScreeningRequestSerializer,
    TenantSerializer,
    UnitSerializer,
    OrganizationSerializer,
    UserSummarySerializer,
    OrganizationInvitationSerializer,
)
from .signals import recalculate_lease_balances

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
        if property_id:
            queryset = queryset.filter(property_id=property_id)
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
            serializer.save(tenant_id=profile.tenant_id, organization=organization)
            return
        serializer.save(organization=organization)

    def perform_update(self, serializer):
        profile = getattr(self.request.user, "profile", None)
        organization = resolve_request_organization(self.request)
        if not organization:
            if self.request.user.is_authenticated:
                logger.warning(
                    "Updating maintenance request without organization context. user=%s",
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
            serializer.save(
                tenant_id=profile.tenant_id, organization=organization
            )
            return
        serializer.save(organization=organization)


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
        queryset = queryset.select_related("sender", "recipient", "parent").filter(
            Q(recipient=self.request.user) | Q(sender=self.request.user)
        )
        if self.action == "list":
            queryset = queryset.filter(recipient=self.request.user)
        return queryset.order_by("-created_at")

    def create(self, request, *args, **kwargs):
        organization = resolve_request_organization(self.request)
        if not organization:
            return Response(
                {"detail": "No organization assigned to this user."},
                status=status.HTTP_403_FORBIDDEN,
            )
        recipient_id = request.data.get("recipient")
        subject = (request.data.get("subject") or "").strip()
        body = (request.data.get("body") or "").strip()
        if not recipient_id:
            return Response(
                {"recipient": "Recipient is required."},
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
        try:
            recipient = User.objects.get(id=recipient_id)
        except User.DoesNotExist:
            return Response(
                {"recipient": "Recipient not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        organization = resolve_request_organization(self.request)
        recipient_profile = getattr(recipient, "profile", None)
        if not recipient_profile or recipient_profile.organization_id != organization.id:
            return Response(
                {"recipient": "Recipient must be in your organization."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        message = Message.objects.create(
            sender=request.user,
            recipient=recipient,
            subject=subject,
            body=body,
            organization=organization,
        )
        return Response(self.get_serializer(message).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], url_path="sent")
    def sent(self, request):
        queryset = Message.objects.filter(
            sender=request.user,
            organization=resolve_request_organization(request),
        ).select_related("sender", "recipient", "parent")
        return Response(self.get_serializer(queryset, many=True).data)

    @action(detail=False, methods=["get"], url_path="users")
    def users(self, request):
        organization = resolve_request_organization(self.request)
        if not organization:
            return Response([])
        queryset = User.objects.filter(
            profile__organization=organization,
        ).order_by("username")
        return Response(UserSummarySerializer(queryset, many=True).data)

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

        if request.user.id == original.sender_id:
            recipient = original.recipient
        else:
            recipient = original.sender

        root_parent = original.parent or original

        reply_message = Message.objects.create(
            sender=request.user,
            recipient=recipient,
            subject=subject,
            body=body,
            parent=root_parent,
            organization=organization,
        )
        return Response(
            self.get_serializer(reply_message).data,
            status=status.HTTP_201_CREATED,
        )


class ScreeningRequestViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    queryset = ScreeningRequest.objects.select_related("tenant", "requested_by")
    serializer_class = ScreeningRequestSerializer
    permission_classes = [IsLandlord]
    http_method_names = ["get", "post", "head", "options"]

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
                organization=resolve_request_organization(request),
            )
        except Tenant.DoesNotExist:
            return Response(
                {"tenant": "Tenant not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        screening = ScreeningRequest.objects.create(
            tenant=tenant,
            requested_by=request.user,
            organization=organization,
            status=ScreeningRequest.STATUS_PENDING,
            notes=(request.data.get("notes") or "").strip(),
        )
        return Response(
            self.get_serializer(screening).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="run-screening")
    def run_screening(self, request, pk=None):
        screening = self.get_object()
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
    queryset = LateFeeRule.objects.select_related("property")
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
                    property=lease.unit.property,
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


class AccountingReportsView(APIView):
    permission_classes = [IsLandlord]

    def get(self, request):
        today = timezone.now().date()
        property_id = request.query_params.get("property_id")
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")

        start_date = self._parse_date(date_from) or date(today.year, 1, 1)
        end_date = self._parse_date(date_to) or today
        org = resolve_request_organization(request)

        payments = Payment.objects.filter(
            organization=org,
            status=Payment.STATUS_COMPLETED,
            payment_date__gte=start_date,
            payment_date__lte=end_date,
        ).select_related("lease__unit__property")
        expenses = Expense.objects.filter(
            organization=org,
            date__gte=start_date,
            date__lte=end_date,
        ).select_related("property")
        charges = RentLedgerEntry.objects.filter(
            organization=org,
            entry_type__in=[RentLedgerEntry.TYPE_CHARGE, RentLedgerEntry.TYPE_LATE_FEE],
            date__gte=start_date,
            date__lte=end_date,
        ).select_related("lease__unit__property")

        if property_id:
            payments = payments.filter(lease__unit__property_id=property_id)
            expenses = expenses.filter(property_id=property_id)
            charges = charges.filter(lease__unit__property_id=property_id)

        total_income = payments.aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
        total_expenses = expenses.aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
        noi = total_income - total_expenses

        income_by_month_map = {}
        for payment in payments:
            key = payment.payment_date.strftime("%Y-%m")
            label = payment.payment_date.strftime("%b %Y")
            if key not in income_by_month_map:
                income_by_month_map[key] = {
                    "month": label,
                    "income": Decimal("0.00"),
                    "expenses": Decimal("0.00"),
                }
            income_by_month_map[key]["income"] += payment.amount
        for expense in expenses:
            key = expense.date.strftime("%Y-%m")
            label = expense.date.strftime("%b %Y")
            if key not in income_by_month_map:
                income_by_month_map[key] = {
                    "month": label,
                    "income": Decimal("0.00"),
                    "expenses": Decimal("0.00"),
                }
            income_by_month_map[key]["expenses"] += expense.amount

        income_by_month = [
            {
                "month": v["month"],
                "income": float(v["income"]),
                "expenses": float(v["expenses"]),
            }
            for _, v in sorted(income_by_month_map.items(), key=lambda item: item[0])
        ]

        category_totals = {}
        for expense in expenses:
            category_totals.setdefault(expense.category, Decimal("0.00"))
            category_totals[expense.category] += expense.amount
        expenses_by_category = [
            {"category": k, "total": float(v)} for k, v in sorted(category_totals.items())
        ]

        total_charges = charges.aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
        rent_collection_rate = (
            (total_income / total_charges) * Decimal("100.00")
            if total_charges > 0
            else Decimal("0.00")
        )

        return Response(
            {
                "total_income": float(total_income),
                "total_expenses": float(total_expenses),
                "net_operating_income": float(noi),
                "income_by_month": income_by_month,
                "expenses_by_category": expenses_by_category,
                "rent_collection_rate": float(rent_collection_rate),
                "date_from": str(start_date),
                "date_to": str(end_date),
            }
        )

    def _parse_date(self, value):
        if not value:
            return None
        try:
            return date.fromisoformat(value)
        except ValueError:
            return None


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

