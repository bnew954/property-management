from django.urls import path
from rest_framework.routers import DefaultRouter

from .payment_views import (
    ConfirmStripePaymentView,
    CreatePaymentIntentView,
    PaymentHistoryView,
)
from .views import (
    AccountingReportsView,
    DocumentViewSet,
    ExpenseViewSet,
    GenerateChargesView,
    LeaseViewSet,
    LateFeeRuleViewSet,
    MaintenanceRequestViewSet,
    OrganizationDetailView,
    OrganizationInviteView,
    OrganizationInvitationsView,
    OrganizationMembersView,
    MessageViewSet,
    MeView,
    NotificationViewSet,
    PaymentViewSet,
    PropertyViewSet,
    RegisterView,
    RentLedgerEntryViewSet,
    ScreeningRequestViewSet,
    TenantViewSet,
    UnitViewSet,
)

router = DefaultRouter()
router.register("properties", PropertyViewSet, basename="property")
router.register("units", UnitViewSet, basename="unit")
router.register("tenants", TenantViewSet, basename="tenant")
router.register("leases", LeaseViewSet, basename="lease")
router.register("payments", PaymentViewSet, basename="payment")
router.register("notifications", NotificationViewSet, basename="notification")
router.register("messages", MessageViewSet, basename="message")
router.register("screenings", ScreeningRequestViewSet, basename="screening")
router.register("documents", DocumentViewSet, basename="document")
router.register("expenses", ExpenseViewSet, basename="expense")
router.register("rent-ledger", RentLedgerEntryViewSet, basename="rent-ledger")
router.register("late-fee-rules", LateFeeRuleViewSet, basename="late-fee-rule")
router.register(
    "maintenance-requests",
    MaintenanceRequestViewSet,
    basename="maintenance-request",
)

urlpatterns = [
    path(
        "payments/create-intent/",
        CreatePaymentIntentView.as_view(),
        name="payments-create-intent",
    ),
    path(
        "payments/confirm/",
        ConfirmStripePaymentView.as_view(),
        name="payments-confirm",
    ),
    path(
        "payments/history/",
        PaymentHistoryView.as_view(),
        name="payments-history",
    ),
    path("register/", RegisterView.as_view(), name="register"),
    path("me/", MeView.as_view(), name="me"),
    path("organization/", OrganizationDetailView.as_view(), name="organization-detail"),
    path("organization/invite/", OrganizationInviteView.as_view(), name="organization-invite"),
    path("organization/members/", OrganizationMembersView.as_view(), name="organization-members"),
    path(
        "organization/invitations/",
        OrganizationInvitationsView.as_view(),
        name="organization-invitations",
    ),
    path(
        "accounting/generate-charges/",
        GenerateChargesView.as_view(),
        name="accounting-generate-charges",
    ),
    path(
        "accounting/reports/",
        AccountingReportsView.as_view(),
        name="accounting-reports",
    ),
]
urlpatterns += router.urls
