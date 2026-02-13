from django.contrib.auth.models import User
from rest_framework import serializers

from .models import (
    Lease,
    MaintenanceRequest,
    Message,
    Notification,
    Payment,
    Property,
    ScreeningRequest,
    Tenant,
    Unit,
)


class PropertySerializer(serializers.ModelSerializer):
    class Meta:
        model = Property
        fields = "__all__"


class UnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unit
        fields = "__all__"


class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = "__all__"


class LeaseSerializer(serializers.ModelSerializer):
    tenant_detail = TenantSerializer(source="tenant", read_only=True)
    unit_detail = UnitSerializer(source="unit", read_only=True)

    class Meta:
        model = Lease
        fields = "__all__"


class PaymentSerializer(serializers.ModelSerializer):
    lease_detail = LeaseSerializer(source="lease", read_only=True)

    class Meta:
        model = Payment
        fields = "__all__"


class MaintenanceRequestSerializer(serializers.ModelSerializer):
    unit_detail = UnitSerializer(source="unit", read_only=True)
    tenant_detail = TenantSerializer(source="tenant", read_only=True)

    class Meta:
        model = MaintenanceRequest
        fields = "__all__"


class UserSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "email"]


class NotificationSerializer(serializers.ModelSerializer):
    recipient_detail = UserSummarySerializer(source="recipient", read_only=True)

    class Meta:
        model = Notification
        fields = "__all__"


class MessageSerializer(serializers.ModelSerializer):
    sender_detail = UserSummarySerializer(source="sender", read_only=True)
    recipient_detail = UserSummarySerializer(source="recipient", read_only=True)

    class Meta:
        model = Message
        fields = "__all__"


class ScreeningRequestSerializer(serializers.ModelSerializer):
    tenant_detail = TenantSerializer(source="tenant", read_only=True)
    requested_by_detail = UserSummarySerializer(source="requested_by", read_only=True)

    class Meta:
        model = ScreeningRequest
        fields = "__all__"
