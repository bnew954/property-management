from datetime import timedelta

from django.contrib.auth.models import User
from django.db import IntegrityError
from django.db.models import Q
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
    Payment,
    Property,
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
    PaymentSerializer,
    PropertySerializer,
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
