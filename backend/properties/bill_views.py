from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Count, Sum
from django.utils import timezone
from django.db import transaction as db_transaction
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .mixins import OrganizationQuerySetMixin, resolve_request_organization
from .models import Bill, BillPayment, Vendor, AccountingCategory, JournalEntry
from .permissions import IsLandlord
from .serializers import (
    BillCreateSerializer,
    BillListSerializer,
    BillPaymentCreateSerializer,
    BillPaymentSerializer,
    BillSerializer,
    VendorListSerializer,
    VendorSerializer,
)
from .views import _create_posted_journal_entry, _cash_account_for_organization, resolve_accounting_category


def _parse_date_value(value):
    if value is None:
        return None
    if isinstance(value, date):
        return value
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError):
        return None


def _coerce_bool(value):
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    normalized = str(value).strip().lower()
    if normalized in {"1", "true", "yes", "y", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    return None


class VendorViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    queryset = Vendor.objects.all()
    permission_classes = [IsAuthenticated, IsLandlord]

    def get_serializer_class(self):
        if self.action == "list":
            return VendorListSerializer
        return VendorSerializer

    @action(detail=True, methods=["get"], url_path="bills")
    def bills(self, request, pk=None):
        vendor = self.get_object()
        bills = (
            vendor.bills.select_related("property", "unit", "category")
            .prefetch_related("payments")
            .order_by("-due_date")
        )
        return Response(BillListSerializer(bills, many=True).data)

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        organization = resolve_request_organization(request)
        if not organization:
            return Response(
                {
                    "total_vendors": 0,
                    "active_vendors": 0,
                    "total_outstanding": 0,
                    "total_paid_ytd": 0,
                    "vendors_needing_1099": 0,
                }
            )
        today = timezone.now().date()

        total_vendors = Vendor.objects.filter(organization=organization).count()
        active_vendors = Vendor.objects.filter(
            organization=organization, is_active=True
        ).count()
        total_outstanding = (
            Bill.objects.filter(
                organization=organization,
                status__in=[Bill.STATUS_PENDING, Bill.STATUS_PARTIAL, Bill.STATUS_OVERDUE],
            ).aggregate(total=Sum("balance_due"))["total"]
            or 0
        )
        total_paid_ytd = (
            BillPayment.objects.filter(
                organization=organization,
                payment_date__year=today.year,
                payment_date__gte=date(today.year, 1, 1),
                payment_date__lte=today,
            )
            .aggregate(total=Sum("amount"))
            ["total"]
            or 0
        )
        vendors_needing_1099 = Vendor.objects.filter(
            organization=organization,
            is_active=True,
            is_1099_eligible=True,
        ).count()

        return Response(
            {
                "total_vendors": total_vendors,
                "active_vendors": active_vendors,
                "total_outstanding": total_outstanding,
                "total_paid_ytd": total_paid_ytd,
                "vendors_needing_1099": vendors_needing_1099,
            }
        )


class BillViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    queryset = Bill.objects.select_related("vendor", "property", "unit", "category", "organization", "journal_entry")
    permission_classes = [IsAuthenticated, IsLandlord]

    def get_serializer_class(self):
        if self.action == "list":
            return BillListSerializer
        if self.action in {"create", "update", "partial_update"}:
            return BillCreateSerializer
        return BillSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params

        status_filter = params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        vendor_id = params.get("vendor")
        if vendor_id:
            queryset = queryset.filter(vendor_id=vendor_id)

        property_id = params.get("property")
        if property_id:
            queryset = queryset.filter(property_id=property_id)

        due_date_from = _parse_date_value(params.get("due_date_from") or params.get("due_date_min"))
        due_date_to = _parse_date_value(params.get("due_date_to") or params.get("due_date_max"))
        if due_date_from:
            queryset = queryset.filter(due_date__gte=due_date_from)
        if due_date_to:
            queryset = queryset.filter(due_date__lte=due_date_to)

        is_recurring = _coerce_bool(params.get("is_recurring"))
        if is_recurring is not None:
            queryset = queryset.filter(is_recurring=is_recurring)

        ordering = params.get("ordering", "due_date")
        allowed_ordering = {"due_date", "-due_date", "total_amount", "-total_amount", "created_at", "-created_at"}
        if ordering not in allowed_ordering:
            ordering = "due_date"
        queryset = queryset.order_by(ordering)
        return queryset

    def _build_bill_payment_journal_entry(self, bill, payment):
        debit_account = bill.category
        if not debit_account:
            debit_account = resolve_accounting_category(
                bill.organization, "Other Expense", AccountingCategory.TYPE_EXPENSE
            )
        cash_account = _cash_account_for_organization(bill.organization)
        if not debit_account or not cash_account:
            return None

        lines = [
            {
                "account_id": debit_account.id,
                "debit_amount": payment.amount,
                "credit_amount": Decimal("0.00"),
                "description": f"Bill #{bill.bill_number or bill.id} payment",
                "property_id": bill.property_id,
                "unit_id": bill.unit_id,
                "reference": payment.reference,
            },
            {
                "account_id": cash_account.id,
                "debit_amount": Decimal("0.00"),
                "credit_amount": payment.amount,
                "description": f"Bill #{bill.bill_number or bill.id} payment",
                "property_id": bill.property_id,
                "unit_id": bill.unit_id,
                "reference": payment.reference,
            },
        ]
        return _create_posted_journal_entry(
            organization=bill.organization,
            entry_date=payment.payment_date,
            memo=f"Bill #{bill.bill_number or bill.id} payment",
            lines=lines,
            user=self.request.user,
            source_type="manual",
            source_id=payment.id,
            status=JournalEntry.STATUS_POSTED,
        )

    @action(detail=True, methods=["post"], url_path="pay")
    def pay(self, request, pk=None):
        bill = self.get_object()
        serializer = BillPaymentCreateSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        with db_transaction.atomic():
            payment = serializer.save(bill=bill)
            journal_entry = None
            try:
                journal_entry = self._build_bill_payment_journal_entry(bill, payment)
            except ValidationError:
                journal_entry = None

            if journal_entry:
                payment.journal_entry = journal_entry
                payment.save(update_fields=["journal_entry"])

        payment.refresh_from_db()
        bill.refresh_from_db()
        return Response(BillSerializer(bill).data)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        bill = self.get_object()
        bill.status = Bill.STATUS_CANCELLED
        bill.save(update_fields=["status", "updated_at"])
        return Response(BillSerializer(bill).data)

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        organization = resolve_request_organization(request)
        if not organization:
            return Response(
                {
                    "total_bills": 0,
                    "total_outstanding": 0,
                    "total_overdue": 0,
                    "total_paid_this_month": 0,
                    "bills_due_this_week": 0,
                }
            )

        today = timezone.now().date()
        week_end = today + timedelta(days=7)
        non_paid_statuses = [Bill.STATUS_PENDING, Bill.STATUS_PARTIAL, Bill.STATUS_OVERDUE]
        bills = Bill.objects.filter(organization=organization)
        total_bills = bills.count()
        total_outstanding = (
            bills.filter(status__in=non_paid_statuses).aggregate(total=Sum("balance_due"))["total"]
            or 0
        )
        total_overdue = (
            bills.filter(
                status__in=non_paid_statuses,
                due_date__lt=today,
            ).count()
        )
        total_paid_this_month = (
            BillPayment.objects.filter(
                organization=organization,
                payment_date__year=today.year,
                payment_date__month=today.month,
            ).aggregate(total=Sum("amount"))["total"]
            or 0
        )
        bills_due_this_week = bills.filter(
            status__in=non_paid_statuses,
            due_date__range=(today, week_end),
        ).count()

        return Response(
            {
                "total_bills": total_bills,
                "total_outstanding": total_outstanding,
                "total_overdue": total_overdue,
                "total_paid_this_month": total_paid_this_month,
                "bills_due_this_week": bills_due_this_week,
            }
        )

    def _bucket(self, queryset):
        values = queryset.aggregate(
            amount=Sum("balance_due"),
            count=Count("id"),
        )
        return {
            "count": values["count"] or 0,
            "total_amount": values["amount"] or 0,
        }

    @action(detail=False, methods=["get"], url_path="aging")
    def aging(self, request):
        organization = resolve_request_organization(request)
        if not organization:
            return Response(
                {
                    "current": {"count": 0, "total_amount": 0},
                    "days_1_30": {"count": 0, "total_amount": 0},
                    "days_31_60": {"count": 0, "total_amount": 0},
                    "days_61_90": {"count": 0, "total_amount": 0},
                    "days_90_plus": {"count": 0, "total_amount": 0},
                }
            )
        today = timezone.now().date()
        base = Bill.objects.filter(
            organization=organization,
            status__in=[Bill.STATUS_PENDING, Bill.STATUS_PARTIAL, Bill.STATUS_OVERDUE],
        )

        one_to_30 = self._bucket(
            base.filter(due_date__gte=today - timedelta(days=30), due_date__lt=today)
        )
        thirty_one_to_60 = self._bucket(
            base.filter(
                due_date__gte=today - timedelta(days=60),
                due_date__lt=today - timedelta(days=30),
            )
        )
        sixty_one_to_90 = self._bucket(
            base.filter(
                due_date__gte=today - timedelta(days=90),
                due_date__lt=today - timedelta(days=60),
            )
        )
        ninety_plus = self._bucket(base.filter(due_date__lt=today - timedelta(days=90)))
        current = self._bucket(base.filter(due_date__gte=today))

        return Response(
            {
                "current": current,
                "days_1_30": one_to_30,
                "days_31_60": thirty_one_to_60,
                "days_61_90": sixty_one_to_90,
                "days_90_plus": ninety_plus,
            }
        )


class BillPaymentViewSet(OrganizationQuerySetMixin, viewsets.ReadOnlyModelViewSet):
    queryset = BillPayment.objects.select_related("bill", "bill__vendor", "bill__property")
    serializer_class = BillPaymentSerializer
    permission_classes = [IsAuthenticated, IsLandlord]

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params

        vendor_id = params.get("vendor")
        if vendor_id:
            queryset = queryset.filter(bill__vendor_id=vendor_id)

        date_from = _parse_date_value(params.get("date_from"))
        if date_from:
            queryset = queryset.filter(payment_date__gte=date_from)

        date_to = _parse_date_value(params.get("date_to"))
        if date_to:
            queryset = queryset.filter(payment_date__lte=date_to)

        payment_method = params.get("payment_method")
        if payment_method:
            queryset = queryset.filter(payment_method=payment_method)

        return queryset.order_by("-payment_date", "-id")
