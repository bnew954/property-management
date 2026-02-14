from django.contrib.auth.models import User
from django.db import models
from django.core.exceptions import ValidationError
from django.db.models import Q
from django.template.defaultfilters import slugify
from django.utils.timezone import now
import uuid


class Organization(models.Model):
    PLAN_FREE = "free"
    PLAN_PRO = "pro"
    PLAN_CHOICES = [(PLAN_FREE, "Free"), (PLAN_PRO, "Pro")]

    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    owner = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="owned_organizations"
    )
    plan = models.CharField(max_length=10, choices=PLAN_CHOICES, default=PLAN_FREE)
    max_units = models.IntegerField(default=5)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.slug})"

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name) or "organization"
            slug_candidate = base_slug
            idx = 2
            while Organization.objects.filter(slug=slug_candidate).exclude(pk=self.pk).exists():
                slug_candidate = f"{base_slug}-{idx}"
                idx += 1
            self.slug = slug_candidate
        super().save(*args, **kwargs)


class Property(models.Model):
    PROPERTY_TYPE_RESIDENTIAL = "residential"
    PROPERTY_TYPE_COMMERCIAL = "commercial"
    PROPERTY_TYPE_CHOICES = [
        (PROPERTY_TYPE_RESIDENTIAL, "Residential"),
        (PROPERTY_TYPE_COMMERCIAL, "Commercial"),
    ]

    name = models.CharField(max_length=255)
    address_line1 = models.CharField(max_length=255)
    address_line2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    zip_code = models.CharField(max_length=20)
    property_type = models.CharField(max_length=20, choices=PROPERTY_TYPE_CHOICES)
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="properties",
        null=True,
        blank=True,
    )
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "Properties"

    def __str__(self):
        return f"{self.name} ({self.city}, {self.state})"


class Unit(models.Model):
    property = models.ForeignKey(
        Property, on_delete=models.CASCADE, related_name="units"
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="units",
        null=True,
        blank=True,
    )
    unit_number = models.CharField(max_length=50)
    bedrooms = models.IntegerField()
    bathrooms = models.DecimalField(max_digits=3, decimal_places=1)
    square_feet = models.IntegerField()
    rent_amount = models.DecimalField(max_digits=10, decimal_places=2)
    is_available = models.BooleanField(default=True)
    is_listed = models.BooleanField(default=False)
    listing_title = models.CharField(max_length=200, blank=True)
    listing_description = models.TextField(blank=True)
    listing_photos = models.JSONField(default=list, blank=True)
    listing_amenities = models.JSONField(default=list, blank=True)
    listing_available_date = models.DateField(null=True, blank=True)
    listing_lease_term = models.CharField(max_length=50, blank=True)
    listing_deposit = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    listing_slug = models.SlugField(max_length=255, unique=True, null=True, blank=True)
    listing_contact_email = models.EmailField(blank=True)
    listing_contact_phone = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if self.is_listed and not self.listing_slug:
            property_slug = slugify(self.property.name) if self.property else "unit"
            unit_slug = slugify(self.unit_number)
            base_slug = f"{property_slug}-{unit_slug}" if unit_slug else property_slug
            if not base_slug:
                base_slug = "unit-listing"
            while True:
                suffix = uuid.uuid4().hex[:6]
                candidate = f"{base_slug}-{suffix}"
                exists = Unit.objects.filter(
                    listing_slug=candidate
                ).exclude(pk=self.pk).exists()
                if not exists:
                    self.listing_slug = candidate
                    break

        if not self.is_listed:
            self.listing_slug = self.listing_slug or None
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.property.name} - Unit {self.unit_number}"


class Tenant(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=30)
    date_of_birth = models.DateField(blank=True, null=True)
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="tenants",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = ["organization", "email"]

    def __str__(self):
        return f"{self.first_name} {self.last_name}"


class Lease(models.Model):
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE, related_name="leases")
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="leases")
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="leases",
        null=True,
        blank=True,
    )
    start_date = models.DateField()
    end_date = models.DateField()
    monthly_rent = models.DecimalField(max_digits=10, decimal_places=2)
    security_deposit = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Lease for {self.tenant} - Unit {self.unit.unit_number}"


class Payment(models.Model):
    PAYMENT_METHOD_BANK_TRANSFER = "bank_transfer"
    PAYMENT_METHOD_CREDIT_CARD = "credit_card"
    PAYMENT_METHOD_CHECK = "check"
    PAYMENT_METHOD_CASH = "cash"
    PAYMENT_METHOD_OTHER = "other"
    PAYMENT_METHOD_CHOICES = [
        (PAYMENT_METHOD_BANK_TRANSFER, "Bank Transfer"),
        (PAYMENT_METHOD_CREDIT_CARD, "Credit Card"),
        (PAYMENT_METHOD_CHECK, "Check"),
        (PAYMENT_METHOD_CASH, "Cash"),
        (PAYMENT_METHOD_OTHER, "Other"),
    ]

    STATUS_PENDING = "pending"
    STATUS_COMPLETED = "completed"
    STATUS_FAILED = "failed"
    STATUS_REFUNDED = "refunded"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_FAILED, "Failed"),
        (STATUS_REFUNDED, "Refunded"),
    ]

    lease = models.ForeignKey(Lease, on_delete=models.CASCADE, related_name="payments")
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="payments",
        null=True,
        blank=True,
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_date = models.DateField()
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    stripe_payment_intent_id = models.CharField(max_length=255, null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Payment {self.amount} for Lease #{self.lease_id}"


class MaintenanceRequest(models.Model):
    PRIORITY_LOW = "low"
    PRIORITY_MEDIUM = "medium"
    PRIORITY_HIGH = "high"
    PRIORITY_EMERGENCY = "emergency"
    PRIORITY_CHOICES = [
        (PRIORITY_LOW, "Low"),
        (PRIORITY_MEDIUM, "Medium"),
        (PRIORITY_HIGH, "High"),
        (PRIORITY_EMERGENCY, "Emergency"),
    ]

    STATUS_SUBMITTED = "submitted"
    STATUS_IN_PROGRESS = "in_progress"
    STATUS_COMPLETED = "completed"
    STATUS_CANCELLED = "cancelled"
    STATUS_CHOICES = [
        (STATUS_SUBMITTED, "Submitted"),
        (STATUS_IN_PROGRESS, "In Progress"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_CANCELLED, "Cancelled"),
    ]

    unit = models.ForeignKey(
        Unit, on_delete=models.CASCADE, related_name="maintenance_requests"
    )
    tenant = models.ForeignKey(
        Tenant, on_delete=models.CASCADE, related_name="maintenance_requests"
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="maintenance_requests",
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=255)
    description = models.TextField()
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.status})"


class UserProfile(models.Model):
    ROLE_LANDLORD = "landlord"
    ROLE_TENANT = "tenant"
    ROLE_CHOICES = [
        (ROLE_LANDLORD, "Landlord"),
        (ROLE_TENANT, "Tenant"),
    ]

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="profile"
    )
    role = models.CharField(
        max_length=20, choices=ROLE_CHOICES, default=ROLE_LANDLORD
    )
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="user_profile",
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="members",
    )
    is_org_admin = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username} ({self.role})"


class OrganizationInvitation(models.Model):
    STATUS_PENDING = "pending"
    STATUS_ACCEPTED = "accepted"
    STATUS_REVOKED = "revoked"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_ACCEPTED, "Accepted"),
        (STATUS_REVOKED, "Revoked"),
    ]

    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="invitations"
    )
    email = models.EmailField()
    role = models.CharField(
        max_length=20,
        choices=UserProfile.ROLE_CHOICES,
        default=UserProfile.ROLE_TENANT,
    )
    invited_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="organization_invitations",
    )
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="organization_invitations",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "email", "status"],
                condition=Q(status="pending"),
                name="uniq_pending_org_invitation",
            )
        ]

    def __str__(self):
        return f"{self.email} -> {self.organization.slug} ({self.status})"


class Notification(models.Model):
    TYPE_RENT_DUE = "rent_due"
    TYPE_RENT_OVERDUE = "rent_overdue"
    TYPE_LEASE_EXPIRING = "lease_expiring"
    TYPE_MAINTENANCE_UPDATE = "maintenance_update"
    TYPE_GENERAL = "general"
    TYPE_CHOICES = [
        (TYPE_RENT_DUE, "Rent Due"),
        (TYPE_RENT_OVERDUE, "Rent Overdue"),
        (TYPE_LEASE_EXPIRING, "Lease Expiring"),
        (TYPE_MAINTENANCE_UPDATE, "Maintenance Update"),
        (TYPE_GENERAL, "General"),
    ]

    recipient = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="notifications"
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="notifications",
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    is_read = models.BooleanField(default=False)
    link = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} -> {self.recipient.username}"


class Message(models.Model):
    sender = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="sent_messages"
    )
    recipient = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="received_messages", null=True, blank=True
    )
    recipient_tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="tenant_messages",
        null=True,
        blank=True,
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="messages",
        null=True,
        blank=True,
    )
    subject = models.CharField(max_length=255)
    body = models.TextField()
    is_read = models.BooleanField(default=False)
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="replies",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def clean(self):
        has_user_recipient = self.recipient_id is not None
        has_tenant_recipient = self.recipient_tenant_id is not None

        if has_user_recipient == has_tenant_recipient:
            raise ValidationError(
                "Message must have exactly one recipient: either recipient or recipient_tenant."
            )

    def __str__(self):
        if self.recipient:
            return f"{self.subject} ({self.sender.username} -> {self.recipient.username})"
        if self.recipient_tenant:
            return f"{self.subject} ({self.sender.username} -> {self.recipient_tenant})"
        return f"{self.subject} ({self.sender.username} -> unassigned)"


class ScreeningRequest(models.Model):
    CONSENT_PENDING = "pending"
    CONSENT_CONSENTED = "consented"
    CONSENT_DECLINED = "declined"
    CONSENT_CHOICES = [
        (CONSENT_PENDING, "Pending"),
        (CONSENT_CONSENTED, "Consented"),
        (CONSENT_DECLINED, "Declined"),
    ]

    STATUS_PENDING = "pending"
    STATUS_PROCESSING = "processing"
    STATUS_COMPLETED = "completed"
    STATUS_FAILED = "failed"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_PROCESSING, "Processing"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_FAILED, "Failed"),
    ]

    CREDIT_RATING_EXCELLENT = "excellent"
    CREDIT_RATING_GOOD = "good"
    CREDIT_RATING_FAIR = "fair"
    CREDIT_RATING_POOR = "poor"
    CREDIT_RATING_CHOICES = [
        (CREDIT_RATING_EXCELLENT, "Excellent"),
        (CREDIT_RATING_GOOD, "Good"),
        (CREDIT_RATING_FAIR, "Fair"),
        (CREDIT_RATING_POOR, "Poor"),
    ]

    BACKGROUND_CLEAR = "clear"
    BACKGROUND_FLAGGED = "flagged"
    BACKGROUND_REVIEW_NEEDED = "review_needed"
    BACKGROUND_CHOICES = [
        (BACKGROUND_CLEAR, "Clear"),
        (BACKGROUND_FLAGGED, "Flagged"),
        (BACKGROUND_REVIEW_NEEDED, "Review Needed"),
    ]

    EVICTION_NONE_FOUND = "none_found"
    EVICTION_RECORDS_FOUND = "records_found"
    EVICTION_CHOICES = [
        (EVICTION_NONE_FOUND, "None Found"),
        (EVICTION_RECORDS_FOUND, "Records Found"),
    ]

    RECOMMENDATION_APPROVED = "approved"
    RECOMMENDATION_CONDITIONAL = "conditional"
    RECOMMENDATION_DENIED = "denied"
    RECOMMENDATION_CHOICES = [
        (RECOMMENDATION_APPROVED, "Approved"),
        (RECOMMENDATION_CONDITIONAL, "Conditional"),
        (RECOMMENDATION_DENIED, "Denied"),
    ]

    tenant = models.ForeignKey(
        Tenant, on_delete=models.CASCADE, related_name="screenings"
    )
    requested_by = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="screening_requests"
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="screening_requests",
        null=True,
        blank=True,
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING
    )
    consent_status = models.CharField(
        max_length=20, choices=CONSENT_CHOICES, default=CONSENT_PENDING
    )
    consent_date = models.DateTimeField(null=True, blank=True)
    tenant_email = models.EmailField(null=True, blank=True)
    tenant_ssn_last4 = models.CharField(max_length=4, null=True, blank=True)
    tenant_dob = models.DateField(null=True, blank=True)
    consent_token = models.CharField(max_length=64, unique=True, null=True, blank=True)
    credit_score = models.IntegerField(null=True, blank=True)
    credit_rating = models.CharField(
        max_length=20, choices=CREDIT_RATING_CHOICES, null=True, blank=True
    )
    background_check = models.CharField(
        max_length=20, choices=BACKGROUND_CHOICES, null=True, blank=True
    )
    eviction_history = models.CharField(
        max_length=20, choices=EVICTION_CHOICES, null=True, blank=True
    )
    income_verified = models.BooleanField(null=True)
    monthly_income = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    recommendation = models.CharField(
        max_length=20, choices=RECOMMENDATION_CHOICES, null=True, blank=True
    )
    notes = models.TextField(blank=True)
    report_data = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Screening #{self.id} for {self.tenant}"


class Document(models.Model):
    TYPE_LEASE_AGREEMENT = "lease_agreement"
    TYPE_INSPECTION_REPORT = "inspection_report"
    TYPE_INSURANCE = "insurance"
    TYPE_TAX_DOCUMENT = "tax_document"
    TYPE_NOTICE = "notice"
    TYPE_RECEIPT = "receipt"
    TYPE_PHOTO = "photo"
    TYPE_OTHER = "other"
    TYPE_CHOICES = [
        (TYPE_LEASE_AGREEMENT, "Lease Agreement"),
        (TYPE_INSPECTION_REPORT, "Inspection Report"),
        (TYPE_INSURANCE, "Insurance"),
        (TYPE_TAX_DOCUMENT, "Tax Document"),
        (TYPE_NOTICE, "Notice"),
        (TYPE_RECEIPT, "Receipt"),
        (TYPE_PHOTO, "Photo"),
        (TYPE_OTHER, "Other"),
    ]

    name = models.CharField(max_length=255)
    file = models.FileField(upload_to="documents/")
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="documents",
        null=True,
        blank=True,
    )
    document_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    description = models.TextField(blank=True)
    uploaded_by = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="documents_uploaded"
    )
    property = models.ForeignKey(
        Property,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="documents",
    )
    unit = models.ForeignKey(
        Unit,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="documents",
    )
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="documents",
    )
    lease = models.ForeignKey(
        Lease,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="documents",
    )
    is_template = models.BooleanField(default=False)
    file_size = models.IntegerField(null=True)
    file_type = models.CharField(max_length=20, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.document_type})"


class Expense(models.Model):
    CATEGORY_MAINTENANCE = "maintenance"
    CATEGORY_INSURANCE = "insurance"
    CATEGORY_TAXES = "taxes"
    CATEGORY_UTILITIES = "utilities"
    CATEGORY_MANAGEMENT_FEE = "management_fee"
    CATEGORY_LEGAL = "legal"
    CATEGORY_ADVERTISING = "advertising"
    CATEGORY_SUPPLIES = "supplies"
    CATEGORY_LANDSCAPING = "landscaping"
    CATEGORY_CAPITAL_IMPROVEMENT = "capital_improvement"
    CATEGORY_OTHER = "other"
    CATEGORY_CHOICES = [
        (CATEGORY_MAINTENANCE, "Maintenance"),
        (CATEGORY_INSURANCE, "Insurance"),
        (CATEGORY_TAXES, "Taxes"),
        (CATEGORY_UTILITIES, "Utilities"),
        (CATEGORY_MANAGEMENT_FEE, "Management Fee"),
        (CATEGORY_LEGAL, "Legal"),
        (CATEGORY_ADVERTISING, "Advertising"),
        (CATEGORY_SUPPLIES, "Supplies"),
        (CATEGORY_LANDSCAPING, "Landscaping"),
        (CATEGORY_CAPITAL_IMPROVEMENT, "Capital Improvement"),
        (CATEGORY_OTHER, "Other"),
    ]

    FREQ_MONTHLY = "monthly"
    FREQ_QUARTERLY = "quarterly"
    FREQ_ANNUALLY = "annually"
    FREQ_CHOICES = [
        (FREQ_MONTHLY, "Monthly"),
        (FREQ_QUARTERLY, "Quarterly"),
        (FREQ_ANNUALLY, "Annually"),
    ]

    property = models.ForeignKey(
        Property, on_delete=models.CASCADE, related_name="expenses"
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="expenses",
        null=True,
        blank=True,
    )
    unit = models.ForeignKey(
        Unit, on_delete=models.SET_NULL, null=True, blank=True, related_name="expenses"
    )
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES)
    vendor_name = models.CharField(max_length=255, blank=True)
    description = models.TextField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateField()
    is_recurring = models.BooleanField(default=False)
    recurring_frequency = models.CharField(
        max_length=20, choices=FREQ_CHOICES, null=True, blank=True
    )
    receipt = models.ForeignKey(
        Document, on_delete=models.SET_NULL, null=True, blank=True, related_name="expenses"
    )
    created_by = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="expenses_created"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-created_at"]

    def __str__(self):
        return f"{self.property.name} - {self.category} - {self.amount}"


class RentLedgerEntry(models.Model):
    TYPE_CHARGE = "charge"
    TYPE_PAYMENT = "payment"
    TYPE_LATE_FEE = "late_fee"
    TYPE_CREDIT = "credit"
    TYPE_ADJUSTMENT = "adjustment"
    TYPE_CHOICES = [
        (TYPE_CHARGE, "Charge"),
        (TYPE_PAYMENT, "Payment"),
        (TYPE_LATE_FEE, "Late Fee"),
        (TYPE_CREDIT, "Credit"),
        (TYPE_ADJUSTMENT, "Adjustment"),
    ]

    lease = models.ForeignKey(
        Lease, on_delete=models.CASCADE, related_name="ledger_entries"
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="ledger_entries",
        null=True,
        blank=True,
    )
    entry_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    balance = models.DecimalField(max_digits=10, decimal_places=2)
    payment = models.ForeignKey(
        Payment, on_delete=models.SET_NULL, null=True, blank=True, related_name="ledger_entries"
    )
    date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["date", "created_at", "id"]

    def __str__(self):
        return f"Ledger {self.lease_id} {self.entry_type} {self.amount}"


class LateFeeRule(models.Model):
    TYPE_FLAT = "flat"
    TYPE_PERCENTAGE = "percentage"
    TYPE_CHOICES = [
        (TYPE_FLAT, "Flat"),
        (TYPE_PERCENTAGE, "Percentage"),
    ]

    property = models.ForeignKey(
        Property, on_delete=models.CASCADE, related_name="late_fee_rules"
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="late_fee_rules",
        null=True,
        blank=True,
    )
    grace_period_days = models.IntegerField(default=5)
    fee_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    fee_amount = models.DecimalField(max_digits=10, decimal_places=2)
    max_fee = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"LateFeeRule {self.property.name} ({self.fee_type})"
