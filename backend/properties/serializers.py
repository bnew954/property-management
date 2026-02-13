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
    Document,
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


class DocumentSerializer(serializers.ModelSerializer):
    uploaded_by_detail = UserSummarySerializer(source="uploaded_by", read_only=True)
    property_detail = PropertySerializer(source="property", read_only=True)
    unit_detail = UnitSerializer(source="unit", read_only=True)
    tenant_detail = TenantSerializer(source="tenant", read_only=True)
    lease_detail = LeaseSerializer(source="lease", read_only=True)

    class Meta:
        model = Document
        fields = "__all__"
        read_only_fields = ["uploaded_by", "file_size", "file_type"]

    def create(self, validated_data):
        request = self.context.get("request")
        file_obj = validated_data.get("file")
        if file_obj is not None:
            validated_data["file_size"] = getattr(file_obj, "size", None)
            filename = getattr(file_obj, "name", "")
            file_type = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
            validated_data["file_type"] = file_type or None
        if request and request.user and request.user.is_authenticated:
            validated_data["uploaded_by"] = request.user
        return super().create(validated_data)
