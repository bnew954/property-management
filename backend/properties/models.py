from django.contrib.auth.models import User
from django.db import models


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
    unit_number = models.CharField(max_length=50)
    bedrooms = models.IntegerField()
    bathrooms = models.DecimalField(max_digits=3, decimal_places=1)
    square_feet = models.IntegerField()
    rent_amount = models.DecimalField(max_digits=10, decimal_places=2)
    is_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.property.name} - Unit {self.unit_number}"


class Tenant(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=30)
    date_of_birth = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.first_name} {self.last_name}"


class Lease(models.Model):
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE, related_name="leases")
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="leases")
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
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username} ({self.role})"


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
        User, on_delete=models.CASCADE, related_name="received_messages"
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

    def __str__(self):
        return f"{self.subject} ({self.sender.username} -> {self.recipient.username})"


class ScreeningRequest(models.Model):
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
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING
    )
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
