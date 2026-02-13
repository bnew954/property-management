from django.contrib.auth.models import User
from django.db import IntegrityError
from rest_framework import status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Lease,
    MaintenanceRequest,
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
    PaymentSerializer,
    PropertySerializer,
    TenantSerializer,
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
