from django.urls import path
from rest_framework.routers import DefaultRouter

from .payment_views import (
    ConfirmStripePaymentView,
    CreatePaymentIntentView,
    PaymentHistoryView,
)
from .views import (
    LeaseViewSet,
    MaintenanceRequestViewSet,
    MessageViewSet,
    MeView,
    NotificationViewSet,
    PaymentViewSet,
    PropertyViewSet,
    RegisterView,
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
]
urlpatterns += router.urls
