from django.contrib.auth.models import User
from rest_framework import serializers

from .models import (
    Lease,
    MaintenanceRequest,
    Message,
    Notification,
    Organization,
    OrganizationInvitation,
    Payment,
    Property,
    ScreeningRequest,
    Tenant,
    Unit,
    UserProfile,
    Document,
    Expense,
    RentLedgerEntry,
    LateFeeRule,
)


class UserSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "email"]


class OrganizationSerializer(serializers.ModelSerializer):
    owner_detail = UserSummarySerializer(source="owner", read_only=True)
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = [
            "id",
            "name",
            "slug",
            "owner",
            "owner_detail",
            "plan",
            "max_units",
            "is_active",
            "member_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["owner", "slug", "owner_detail", "member_count"]

    def get_member_count(self, obj):
        return obj.members.count()


class OrganizationInvitationSerializer(serializers.ModelSerializer):
    invited_by_detail = UserSummarySerializer(source="invited_by", read_only=True)
    tenant_detail = serializers.SerializerMethodField()

    class Meta:
        model = OrganizationInvitation
        fields = [
            "id",
            "organization",
            "email",
            "role",
            "invited_by",
            "invited_by_detail",
            "tenant",
            "tenant_detail",
            "status",
            "created_at",
            "updated_at",
        ]

    def get_tenant_detail(self, obj):
        if not obj.tenant:
            return None
        return {
            "id": obj.tenant.id,
            "first_name": obj.tenant.first_name,
            "last_name": obj.tenant.last_name,
        }


class PropertySerializer(serializers.ModelSerializer):
    class Meta:
        model = Property
        fields = "__all__"
        read_only_fields = ["organization"]


class UnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unit
        fields = "__all__"
        read_only_fields = ["organization"]


class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = "__all__"
        read_only_fields = ["organization"]


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ["id", "role", "tenant", "tenant_id", "organization", "is_org_admin"]
        read_only_fields = ["organization", "is_org_admin"]


class LeaseSerializer(serializers.ModelSerializer):
    tenant_detail = TenantSerializer(source="tenant", read_only=True)
    unit_detail = UnitSerializer(source="unit", read_only=True)

    class Meta:
        model = Lease
        fields = "__all__"
        read_only_fields = ["organization"]


class PaymentSerializer(serializers.ModelSerializer):
    lease_detail = LeaseSerializer(source="lease", read_only=True)

    class Meta:
        model = Payment
        fields = "__all__"
        read_only_fields = ["organization"]


class MaintenanceRequestSerializer(serializers.ModelSerializer):
    unit_detail = UnitSerializer(source="unit", read_only=True)
    tenant_detail = TenantSerializer(source="tenant", read_only=True)

    class Meta:
        model = MaintenanceRequest
        fields = "__all__"
        read_only_fields = ["organization"]


class NotificationSerializer(serializers.ModelSerializer):
    recipient_detail = UserSummarySerializer(source="recipient", read_only=True)

    class Meta:
        model = Notification
        fields = "__all__"
        read_only_fields = ["organization"]


class MessageSerializer(serializers.ModelSerializer):
    recipient = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), required=False, allow_null=True
    )
    recipient_tenant = serializers.PrimaryKeyRelatedField(
        queryset=Tenant.objects.all(), required=False, allow_null=True
    )
    sender_detail = UserSummarySerializer(source="sender", read_only=True)
    recipient_detail = UserSummarySerializer(source="recipient", read_only=True)
    recipient_tenant_detail = TenantSerializer(source="recipient_tenant", read_only=True)
    recipient_name = serializers.SerializerMethodField()
    recipient_tenant_has_account = serializers.SerializerMethodField()

    def get_recipient_name(self, obj):
        if obj.recipient:
            user = obj.recipient
            full_name = f"{user.first_name} {user.last_name}".strip()
            return full_name or user.username
        if obj.recipient_tenant:
            return f"{obj.recipient_tenant.first_name} {obj.recipient_tenant.last_name}".strip()
        return None

    def get_recipient_tenant_has_account(self, obj):
        if not obj.recipient_tenant_id:
            return None
        return UserProfile.objects.filter(tenant=obj.recipient_tenant).exists()

    def validate(self, attrs):
        recipient = attrs.get("recipient")
        recipient_tenant = attrs.get("recipient_tenant")
        has_recipient_field = "recipient" in attrs
        has_tenant_field = "recipient_tenant" in attrs
        if not (has_recipient_field or has_tenant_field):
            return attrs

        if bool(recipient) == bool(recipient_tenant):
            raise serializers.ValidationError(
                "Message must include either recipient or recipient_tenant, but not both."
            )
        return attrs

    class Meta:
        model = Message
        fields = "__all__"
        read_only_fields = ["organization", "sender", "is_read"]


class ScreeningRequestSerializer(serializers.ModelSerializer):
    tenant_detail = TenantSerializer(source="tenant", read_only=True)
    requested_by_detail = UserSummarySerializer(source="requested_by", read_only=True)

    class Meta:
        model = ScreeningRequest
        fields = "__all__"
        read_only_fields = ["organization"]


class DocumentSerializer(serializers.ModelSerializer):
    uploaded_by_detail = UserSummarySerializer(source="uploaded_by", read_only=True)
    property_detail = PropertySerializer(source="property", read_only=True)
    unit_detail = UnitSerializer(source="unit", read_only=True)
    tenant_detail = TenantSerializer(source="tenant", read_only=True)
    lease_detail = LeaseSerializer(source="lease", read_only=True)

    class Meta:
        model = Document
        fields = "__all__"
        read_only_fields = ["uploaded_by", "file_size", "file_type", "organization"]

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


class ExpenseSerializer(serializers.ModelSerializer):
    created_by_detail = UserSummarySerializer(source="created_by", read_only=True)
    property_detail = PropertySerializer(source="property", read_only=True)
    unit_detail = UnitSerializer(source="unit", read_only=True)
    receipt_detail = DocumentSerializer(source="receipt", read_only=True)

    class Meta:
        model = Expense
        fields = "__all__"
        read_only_fields = ["created_by", "organization"]


class RentLedgerEntrySerializer(serializers.ModelSerializer):
    lease_detail = LeaseSerializer(source="lease", read_only=True)
    payment_detail = PaymentSerializer(source="payment", read_only=True)

    class Meta:
        model = RentLedgerEntry
        fields = "__all__"
        read_only_fields = ["organization"]


class LateFeeRuleSerializer(serializers.ModelSerializer):
    property_detail = PropertySerializer(source="property", read_only=True)

    class Meta:
        model = LateFeeRule
        fields = "__all__"
        read_only_fields = ["organization"]
