from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    LeaseViewSet,
    MaintenanceRequestViewSet,
    MeView,
    PaymentViewSet,
    PropertyViewSet,
    RegisterView,
    TenantViewSet,
    UnitViewSet,
)

router = DefaultRouter()
router.register("properties", PropertyViewSet, basename="property")
router.register("units", UnitViewSet, basename="unit")
router.register("tenants", TenantViewSet, basename="tenant")
router.register("leases", LeaseViewSet, basename="lease")
router.register("payments", PaymentViewSet, basename="payment")
router.register(
    "maintenance-requests",
    MaintenanceRequestViewSet,
    basename="maintenance-request",
)

urlpatterns = router.urls
urlpatterns += [
    path("register/", RegisterView.as_view(), name="register"),
    path("me/", MeView.as_view(), name="me"),
]
