from datetime import timedelta
from decimal import Decimal
import random

from django.contrib.auth.models import User
from django.db import IntegrityError
from django.db.models import Q
from django.http import FileResponse
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Lease,
    MaintenanceRequest,
    Message,
    Notification,
    Document,
    Payment,
    Property,
    ScreeningRequest,
    Tenant,
    Unit,
    UserProfile,
)
from .permissions import IsLandlord
from .serializers import (
    LeaseSerializer,
    MaintenanceRequestSerializer,
    MessageSerializer,
    NotificationSerializer,
    DocumentSerializer,
    PaymentSerializer,
    PropertySerializer,
    ScreeningRequestSerializer,
    TenantSerializer,
    UserSummarySerializer,
    UnitSerializer,
)


class PropertyViewSet(viewsets.ModelViewSet):
    queryset = Property.objects.all()
    serializer_class = PropertySerializer

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            return [IsAuthenticated()]
        return [IsLandlord()]


class UnitViewSet(viewsets.ModelViewSet):
    queryset = Unit.objects.all()
    serializer_class = UnitSerializer

    def get_queryset(self):
        queryset = Unit.objects.all()
        property_id = self.request.query_params.get("property_id")
        if property_id:
            queryset = queryset.filter(property_id=property_id)
        return queryset

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            return [IsAuthenticated()]
        return [IsLandlord()]


class TenantViewSet(viewsets.ModelViewSet):
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer

    def get_queryset(self):
        profile = getattr(self.request.user, "profile", None)
        if profile and profile.role == UserProfile.ROLE_TENANT:
            if profile.tenant_id:
                return Tenant.objects.filter(id=profile.tenant_id)
            return Tenant.objects.none()
        return Tenant.objects.all()

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            return [IsAuthenticated()]
        return [IsLandlord()]


class LeaseViewSet(viewsets.ModelViewSet):
    queryset = Lease.objects.all()
    serializer_class = LeaseSerializer

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            return [IsAuthenticated()]
        return [IsLandlord()]


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            return [IsAuthenticated()]
        return [IsLandlord()]


class MaintenanceRequestViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceRequest.objects.all()
    serializer_class = MaintenanceRequestSerializer

    def get_queryset(self):
        profile = getattr(self.request.user, "profile", None)
        if profile and profile.role == UserProfile.ROLE_TENANT:
            if profile.tenant_id:
                queryset = MaintenanceRequest.objects.filter(
                    tenant_id=profile.tenant_id
                )
            else:
                queryset = MaintenanceRequest.objects.none()
        else:
            queryset = MaintenanceRequest.objects.all()
        status = self.request.query_params.get("status")
        unit_id = self.request.query_params.get("unit_id")
        if status:
            queryset = queryset.filter(status=status)
        if unit_id:
            queryset = queryset.filter(unit_id=unit_id)
        return queryset

    def get_permissions(self):
        if self.action == "destroy":
            return [IsLandlord()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        profile = getattr(self.request.user, "profile", None)
        if profile and profile.role == UserProfile.ROLE_TENANT:
            if not profile.tenant_id:
                raise ValidationError(
                    {"tenant": "Tenant users must be linked to a tenant record."}
                )
            serializer.save(tenant_id=profile.tenant_id)
            return
        serializer.save()

    def perform_update(self, serializer):
        profile = getattr(self.request.user, "profile", None)
        if profile and profile.role == UserProfile.ROLE_TENANT:
            serializer.save(tenant_id=profile.tenant_id)
            return
        serializer.save()


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)

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


class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        queryset = Message.objects.filter(
            Q(recipient=self.request.user) | Q(sender=self.request.user)
        ).select_related("sender", "recipient", "parent")
        if self.action == "list":
            queryset = queryset.filter(recipient=self.request.user)
        return queryset

    def create(self, request, *args, **kwargs):
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
        message = Message.objects.create(
            sender=request.user,
            recipient=recipient,
            subject=subject,
            body=body,
        )
        return Response(
            self.get_serializer(message).data, status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=["get"], url_path="sent")
    def sent(self, request):
        queryset = Message.objects.filter(sender=request.user).select_related(
            "sender", "recipient", "parent"
        )
        return Response(self.get_serializer(queryset, many=True).data)

    @action(detail=False, methods=["get"], url_path="users")
    def users(self, request):
        queryset = User.objects.all().order_by("username")
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
        body = (request.data.get("body") or "").strip()
        subject = (
            request.data.get("subject")
            or f"Re: {original.subject}"
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
        )
        return Response(
            self.get_serializer(reply_message).data,
            status=status.HTTP_201_CREATED,
        )


class ScreeningRequestViewSet(viewsets.ModelViewSet):
    queryset = ScreeningRequest.objects.select_related("tenant", "requested_by")
    serializer_class = ScreeningRequestSerializer
    permission_classes = [IsLandlord]
    http_method_names = ["get", "post", "head", "options"]

    def create(self, request, *args, **kwargs):
        tenant_id = request.data.get("tenant")
        if not tenant_id:
            return Response(
                {"tenant": "Tenant is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            tenant = Tenant.objects.get(id=tenant_id)
        except Tenant.DoesNotExist:
            return Response(
                {"tenant": "Tenant not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        screening = ScreeningRequest.objects.create(
            tenant=tenant,
            requested_by=request.user,
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


class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.select_related(
        "uploaded_by", "property", "unit", "tenant", "lease"
    )
    serializer_class = DocumentSerializer

    def get_queryset(self):
        queryset = Document.objects.select_related(
            "uploaded_by", "property", "unit", "tenant", "lease"
        )
        profile = getattr(self.request.user, "profile", None)
        if profile and profile.role == UserProfile.ROLE_TENANT:
            tenant_id = profile.tenant_id
            lease_ids = []
            if tenant_id:
                lease_ids = list(
                    Lease.objects.filter(tenant_id=tenant_id).values_list("id", flat=True)
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

    @action(detail=True, methods=["get"], url_path="download")
    def download(self, request, pk=None):
        document = self.get_object()
        file_handle = document.file.open("rb")
        return FileResponse(
            file_handle,
            as_attachment=True,
            filename=document.file.name.rsplit("/", 1)[-1],
        )


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        return Response(
            {
                "id": request.user.id,
                "username": request.user.username,
                "email": request.user.email,
                "first_name": request.user.first_name,
                "last_name": request.user.last_name,
                "role": profile.role,
                "tenant_id": profile.tenant_id,
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
            profile.save(update_fields=["role", "tenant", "updated_at"])
        except IntegrityError:
            return Response(
                {"detail": "Unable to create user with provided details."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": profile.role,
                "tenant_id": profile.tenant_id,
            },
            status=status.HTTP_201_CREATED,
        )
