import uuid
from decimal import Decimal

from django.contrib.auth.models import User
from django.db.models import Sum
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from .mixins import resolve_request_organization
from .models import Bill, Vendor, WorkOrder, WorkOrderNote
from .permissions import IsLandlord, IsVendor
from .serializers import BillSerializer, VendorInvoiceSerializer, VendorWorkOrderSerializer


def _to_decimal(value):
    if value is None or value == "":
        return None
    try:
        return Decimal(str(value))
    except (TypeError, ValueError, ArithmeticError):
        raise ValueError("actual_cost must be a decimal value.")


class VendorPortalWorkOrderViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated, IsVendor]
    serializer_class = VendorWorkOrderSerializer
    queryset = WorkOrder.objects.select_related("vendor", "property", "unit")
    http_method_names = ["get", "patch", "post", "head", "options"]

    def get_queryset(self):
        vendor = getattr(self.request.user, "vendor_profile", None)
        if not vendor:
            return WorkOrder.objects.none()
        return super().get_queryset().filter(vendor=vendor)

    def create(self, request, *args, **kwargs):
        return Response(
            {"detail": "Creating work orders is not supported for vendor portal users."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def update(self, request, *args, **kwargs):
        if request.method.upper() == "PUT":
            return Response(
                {"detail": "Updating work order details via PUT is not supported."},
                status=status.HTTP_405_METHOD_NOT_ALLOWED,
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        return Response(
            {"detail": "Deleting work orders is not supported."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def _add_note(self, work_order, request, message):
        author_name = (request.user.get_full_name() or request.user.username).strip()
        return WorkOrderNote.objects.create(
            work_order=work_order,
            author=request.user,
            author_name=author_name,
            is_vendor=True,
            message=message,
        )

    @action(detail=True, methods=["post"], url_path="accept")
    def accept(self, request, pk=None):
        work_order = self.get_object()
        work_order.status = WorkOrder.STATUS_ACCEPTED
        work_order.save(update_fields=["status", "updated_at"])
        self._add_note(work_order, request, "Vendor accepted the work order.")
        return Response(VendorWorkOrderSerializer(work_order).data)

    @action(detail=True, methods=["post"], url_path="start-work")
    def start_work(self, request, pk=None):
        work_order = self.get_object()
        work_order.status = WorkOrder.STATUS_IN_PROGRESS
        work_order.save(update_fields=["status", "updated_at"])
        self._add_note(work_order, request, "Vendor started the work order.")
        return Response(VendorWorkOrderSerializer(work_order).data)

    @action(detail=True, methods=["post"], url_path="complete")
    def complete(self, request, pk=None):
        work_order = self.get_object()
        vendor_notes = (request.data.get("vendor_notes") or "").strip()
        actual_cost = request.data.get("actual_cost")
        if actual_cost is not None:
            try:
                actual_cost = _to_decimal(actual_cost)
            except ValueError as exc:
                return Response({"actual_cost": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
            work_order.actual_cost = actual_cost
        if vendor_notes:
            work_order.vendor_notes = vendor_notes
        work_order.status = WorkOrder.STATUS_COMPLETED
        work_order.completed_date = timezone.now()
        work_order.save(update_fields=["actual_cost", "vendor_notes", "status", "completed_date", "updated_at"])

        self._add_note(
            work_order,
            request,
            vendor_notes or "Vendor completed the work order.",
        )
        return Response(VendorWorkOrderSerializer(work_order).data)

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        work_order = self.get_object()
        vendor_notes = (request.data.get("vendor_notes") or "").strip()
        work_order.status = WorkOrder.STATUS_REJECTED
        if vendor_notes:
            work_order.vendor_notes = vendor_notes
        work_order.save(update_fields=["status", "vendor_notes", "updated_at"])

        self._add_note(work_order, request, vendor_notes or "Vendor rejected the work order.")
        return Response(VendorWorkOrderSerializer(work_order).data)

    @action(detail=True, methods=["post"], url_path="add-note")
    def add_note(self, request, pk=None):
        work_order = self.get_object()
        message = (request.data.get("message") or "").strip()
        if not message:
            return Response(
                {"message": "message is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        self._add_note(work_order, request, message)
        return Response(VendorWorkOrderSerializer(work_order).data)

    @action(detail=True, methods=["post"], url_path="submit-invoice")
    def submit_invoice(self, request, pk=None):
        serializer = VendorInvoiceSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        bill = serializer.save(work_order=self.get_object())
        return Response(BillSerializer(bill).data, status=status.HTTP_201_CREATED)


class VendorPortalProfileView(APIView):
    permission_classes = [IsAuthenticated, IsVendor]

    def get(self, request):
        vendor = request.user.vendor_profile
        work_orders = vendor.work_orders.all()
        stats = {
            "total_work_orders": work_orders.count(),
            "assigned": work_orders.filter(status=WorkOrder.STATUS_ASSIGNED).count(),
            "accepted": work_orders.filter(status=WorkOrder.STATUS_ACCEPTED).count(),
            "in_progress": work_orders.filter(status=WorkOrder.STATUS_IN_PROGRESS).count(),
            "completed": work_orders.filter(status=WorkOrder.STATUS_COMPLETED).count(),
            "rejected": work_orders.filter(status=WorkOrder.STATUS_REJECTED).count(),
        }
        return Response(
            {
                "name": vendor.name,
                "email": vendor.email,
                "phone": vendor.phone,
                "category": vendor.category,
                "stats": stats,
            }
        )

    def patch(self, request):
        vendor = request.user.vendor_profile
        fields = []
        for key in ("contact_name", "email", "phone"):
            if key in request.data:
                setattr(vendor, key, (request.data.get(key) or "").strip())
                fields.append(key)
        if not fields:
            return Response(
                {"detail": "No valid fields provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        vendor.save(update_fields=fields)
        return self.get(request)


class VendorPortalDashboardView(APIView):
    permission_classes = [IsAuthenticated, IsVendor]

    def get(self, request):
        vendor = request.user.vendor_profile
        work_orders = vendor.work_orders.all()
        bills = vendor.bills.all()

        total_earned = bills.filter(status=Bill.STATUS_PAID).aggregate(total=Sum("amount_paid"))["total"]
        if total_earned is None:
            total_earned = 0
        pending_payment = (
            bills.filter(status__in=[Bill.STATUS_PENDING, Bill.STATUS_PARTIAL, Bill.STATUS_OVERDUE])
            .aggregate(total=Sum("balance_due"))["total"]
        )
        if pending_payment is None:
            pending_payment = 0

        return Response(
            {
                "assigned_count": work_orders.filter(status=WorkOrder.STATUS_ASSIGNED).count(),
                "in_progress_count": work_orders.filter(status=WorkOrder.STATUS_IN_PROGRESS).count(),
                "completed_count": work_orders.filter(status=WorkOrder.STATUS_COMPLETED).count(),
                "total_earned": total_earned,
                "pending_payment": pending_payment,
            }
        )


class VendorInviteView(APIView):
    permission_classes = [IsAuthenticated, IsLandlord]

    def post(self, request, pk=None):
        organization = resolve_request_organization(request)
        if not organization:
            return Response(
                {"detail": "Organization context required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        vendor_id = pk if pk is not None else request.data.get("vendor_id")
        if not vendor_id:
            return Response(
                {"vendor_id": "vendor_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            vendor_id = int(vendor_id)
        except (TypeError, ValueError):
            return Response(
                {"vendor_id": "vendor_id must be an integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        vendor = Vendor.objects.filter(id=vendor_id, organization=organization).first()
        if not vendor:
            return Response(
                {"vendor_id": "Vendor not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        vendor.invite_token = uuid.uuid4().hex
        vendor.invite_sent_at = timezone.now()
        vendor.save(update_fields=["invite_token", "invite_sent_at"])
        return Response(
            {
                "vendor_id": vendor.id,
                "invite_url": f"/vendor/register/{vendor.invite_token}/",
            }
        )


class VendorRegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request, token=None):
        token = (token or "").strip()
        body_token = (request.data.get("token") or "").strip()
        if not token and body_token:
            token = body_token
        username = (request.data.get("username") or "").strip()
        password = request.data.get("password") or ""

        if not token:
            return Response({"token": "token is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not username:
            return Response(
                {"username": "username is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not password:
            return Response(
                {"password": "password is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        vendor = Vendor.objects.filter(invite_token=token).first()
        if not vendor:
            return Response(
                {"token": "Invalid invite token."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if User.objects.filter(username=username).exists():
            return Response(
                {"username": "Username already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.create_user(
            username=username,
            email=vendor.email or None,
            password=password,
        )
        vendor.user = user
        vendor.portal_enabled = True
        vendor.invite_token = ""
        vendor.save(update_fields=["user", "portal_enabled", "invite_token"])

        return Response(
            {
                "id": user.id,
                "username": user.username,
                "vendor_id": vendor.id,
            },
            status=status.HTTP_201_CREATED,
        )
