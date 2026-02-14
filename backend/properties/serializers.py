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
    RentalApplication,
    Tenant,
    Unit,
    UserProfile,
    Document,
    Expense,
    RentLedgerEntry,
    Transaction,
    LateFeeRule,
    OwnerStatement,
    AccountingCategory,
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


class PublicUnitListingSerializer(serializers.ModelSerializer):
    property_name = serializers.CharField(source="property.name", read_only=True)
    property_address_line1 = serializers.CharField(source="property.address_line1", read_only=True)
    property_address_line2 = serializers.CharField(source="property.address_line2", read_only=True)
    property_city = serializers.CharField(source="property.city", read_only=True)
    property_state = serializers.CharField(source="property.state", read_only=True)
    property_zip_code = serializers.CharField(source="property.zip_code", read_only=True)
    full_address = serializers.SerializerMethodField()

    class Meta:
        model = Unit
        fields = [
            "id",
            "property",
            "property_name",
            "property_address_line1",
            "property_address_line2",
            "property_city",
            "property_state",
            "property_zip_code",
            "full_address",
            "unit_number",
            "bedrooms",
            "bathrooms",
            "square_feet",
            "rent_amount",
            "listing_title",
            "listing_description",
            "listing_photos",
            "listing_amenities",
            "listing_available_date",
            "listing_lease_term",
            "listing_deposit",
            "listing_slug",
            "listing_contact_email",
            "listing_contact_phone",
        ]
        read_only_fields = fields

    def get_full_address(self, obj):
        line2 = obj.property.address_line2.strip()
        parts = [obj.property.address_line1, line2] if line2 else [obj.property.address_line1]
        city_state_zip = f"{obj.property.city}, {obj.property.state} {obj.property.zip_code}".strip()
        parts.append(city_state_zip)
        return ", ".join([part for part in parts if part]).replace(", ,", ",")


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
    property_name = serializers.SerializerMethodField()
    landlord_name = serializers.SerializerMethodField()

    class Meta:
        model = ScreeningRequest
        fields = "__all__"
        read_only_fields = ["organization"]

    def get_property_name(self, obj):
        try:
            lease = obj.tenant.leases.filter(is_active=True).order_by("-created_at").first()
            if lease and lease.unit and lease.unit.property:
                return lease.unit.property.name
        except Exception:
            return None
        return None

    def get_landlord_name(self, obj):
        try:
            return obj.requested_by.get_full_name() or obj.requested_by.username
        except Exception:
            return None


class TenantConsentSerializer(serializers.Serializer):
    tenant_name = serializers.CharField(read_only=True)
    property_name = serializers.CharField(read_only=True)
    landlord_name = serializers.CharField(read_only=True)
    consent_status = serializers.CharField(read_only=True)
    consent = serializers.BooleanField(write_only=True)
    ssn_last4 = serializers.CharField(write_only=True, allow_blank=False, required=False)
    date_of_birth = serializers.DateField(write_only=True, required=False)

    def validate_ssn_last4(self, value):
        if value is None:
            raise serializers.ValidationError("ssn_last4 is required.")
        if not value.isdigit() or len(value) != 4:
            raise serializers.ValidationError("ssn_last4 must be exactly 4 digits.")
        return value

    def validate(self, attrs):
        if attrs.get("consent"):
            if not attrs.get("ssn_last4"):
                raise serializers.ValidationError({"ssn_last4": "SSN last 4 is required."})
            if not attrs.get("date_of_birth"):
                raise serializers.ValidationError({"date_of_birth": "Date of birth is required."})
        return attrs


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


class RentalApplicationSerializer(serializers.ModelSerializer):
    unit_detail = UnitSerializer(source="unit", read_only=True)
    reviewed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = RentalApplication
        fields = "__all__"
        read_only_fields = ["organization", "created_at", "updated_at"]

    def get_reviewed_by_name(self, obj):
        if not obj.reviewed_by:
            return None
        return f"{obj.reviewed_by.first_name} {obj.reviewed_by.last_name}".strip() or obj.reviewed_by.username


class RentalApplicationPublicSerializer(serializers.ModelSerializer):
    unit_detail = UnitSerializer(source="unit", read_only=True)
    references = serializers.ListField(
        child=serializers.DictField(), required=False, default=list
    )

    class Meta:
        model = RentalApplication
        fields = [
            "id",
            "unit_detail",
            "listing_slug",
            "status",
            "first_name",
            "last_name",
            "email",
            "phone",
            "date_of_birth",
            "ssn_last4",
            "current_address",
            "current_city",
            "current_state",
            "current_zip",
            "current_landlord_name",
            "current_landlord_phone",
            "current_rent",
            "reason_for_moving",
            "employer_name",
            "employer_phone",
            "job_title",
            "monthly_income",
            "employment_length",
            "num_occupants",
            "has_pets",
            "pet_description",
            "has_been_evicted",
            "has_criminal_history",
            "additional_notes",
            "references",
            "consent_background_check",
            "consent_credit_check",
            "electronic_signature",
            "signature_date",
            "created_at",
        ]
        read_only_fields = ["status", "signature_date", "created_at", "listing_slug"]

    def validate(self, attrs):
        errors = {}
        if not attrs.get("first_name"):
            errors["first_name"] = "First name is required."
        if not attrs.get("last_name"):
            errors["last_name"] = "Last name is required."
        if not attrs.get("email"):
            errors["email"] = "Email is required."
        if not attrs.get("phone"):
            errors["phone"] = "Phone is required."
        if not attrs.get("date_of_birth"):
            errors["date_of_birth"] = "Date of birth is required."
        if not attrs.get("current_address"):
            errors["current_address"] = "Current address is required."
        if not attrs.get("current_city"):
            errors["current_city"] = "Current city is required."
        if not attrs.get("current_state"):
            errors["current_state"] = "Current state is required."
        if not attrs.get("current_zip"):
            errors["current_zip"] = "Current zip is required."
        if attrs.get("consent_background_check") is not True:
            errors["consent_background_check"] = "Background check consent is required."
        if attrs.get("consent_credit_check") is not True:
            errors["consent_credit_check"] = "Credit check consent is required."
        if not attrs.get("electronic_signature"):
            errors["electronic_signature"] = "Electronic signature is required."
        if errors:
            raise serializers.ValidationError(errors)
        return attrs

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
    class Meta:
        model = LateFeeRule
        fields = "__all__"
        read_only_fields = ["organization"]


class AccountingCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = AccountingCategory
        fields = "__all__"
        read_only_fields = ["organization"]


class TransactionSerializer(serializers.ModelSerializer):
    category_detail = AccountingCategorySerializer(source="category", read_only=True)
    property_detail = PropertySerializer(source="property", read_only=True)
    unit_detail = UnitSerializer(source="unit", read_only=True)
    tenant_detail = TenantSerializer(source="tenant", read_only=True)
    lease_detail = LeaseSerializer(source="lease", read_only=True)
    created_by_detail = UserSummarySerializer(source="created_by", read_only=True)

    class Meta:
        model = Transaction
        fields = "__all__"
        read_only_fields = ["organization"]

    def validate(self, attrs):
        transaction_type = attrs.get("transaction_type")
        amount = attrs.get("amount")
        if amount is not None and amount < 0:
            raise serializers.ValidationError({"amount": "Amount must be positive."})
        if transaction_type in {Transaction.TYPE_EXPENSE} and amount is not None and amount < 0:
            raise serializers.ValidationError({"amount": "Expense amount must be positive."})
        return attrs


class OwnerStatementSerializer(serializers.ModelSerializer):
    property_detail = PropertySerializer(source="property", read_only=True)

    class Meta:
        model = OwnerStatement
        fields = "__all__"
        read_only_fields = ["organization", "generated_at", "generated_by"]

