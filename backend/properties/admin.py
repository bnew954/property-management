from django.contrib import admin

from .models import Lease, MaintenanceRequest, Payment, Property, Tenant, Unit


@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = ("name", "city", "state", "property_type", "created_at")
    list_filter = ("property_type", "city", "state", "created_at")
    search_fields = ("name", "address_line1", "address_line2", "city", "state", "zip_code")


@admin.register(Unit)
class UnitAdmin(admin.ModelAdmin):
    list_display = (
        "unit_number",
        "property",
        "bedrooms",
        "bathrooms",
        "square_feet",
        "rent_amount",
        "is_available",
    )
    list_filter = ("is_available", "bedrooms", "property", "created_at")
    search_fields = ("unit_number", "property__name", "property__city", "property__state")


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ("first_name", "last_name", "email", "phone", "created_at")
    list_filter = ("created_at",)
    search_fields = ("first_name", "last_name", "email", "phone")


@admin.register(Lease)
class LeaseAdmin(admin.ModelAdmin):
    list_display = (
        "tenant",
        "unit",
        "start_date",
        "end_date",
        "monthly_rent",
        "security_deposit",
        "is_active",
    )
    list_filter = ("is_active", "start_date", "end_date", "created_at")
    search_fields = (
        "tenant__first_name",
        "tenant__last_name",
        "tenant__email",
        "unit__unit_number",
        "unit__property__name",
    )


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("lease", "amount", "payment_date", "payment_method", "status", "created_at")
    list_filter = ("status", "payment_method", "payment_date", "created_at")
    search_fields = (
        "lease__tenant__first_name",
        "lease__tenant__last_name",
        "lease__tenant__email",
        "lease__unit__unit_number",
        "lease__unit__property__name",
    )


@admin.register(MaintenanceRequest)
class MaintenanceRequestAdmin(admin.ModelAdmin):
    list_display = ("title", "unit", "tenant", "priority", "status", "created_at")
    list_filter = ("priority", "status", "created_at", "unit__property")
    search_fields = (
        "title",
        "description",
        "unit__unit_number",
        "unit__property__name",
        "tenant__first_name",
        "tenant__last_name",
        "tenant__email",
    )
