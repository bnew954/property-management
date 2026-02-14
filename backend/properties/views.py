from datetime import date, timedelta
from collections import defaultdict
import csv
from datetime import datetime
from decimal import Decimal
from typing import Dict, Iterable
import io
import logging
import random
import uuid
import hashlib

from django.contrib.auth.models import User
from django.core.files.base import ContentFile
from django.db import IntegrityError, transaction as db_transaction
from django.db.models import Case, DecimalField, ExpressionWrapper, F, Q, Sum, Value, Count, Max, IntegerField, When
from django.db.models.functions import Coalesce, TruncMonth
from django.http import FileResponse
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .mixins import OrganizationQuerySetMixin, resolve_request_organization
from .models import (
    AccountingCategory,
    ImportedTransaction,
    ClassificationRule,
    BankReconciliation,
    ReconciliationMatch,
    TransactionImport,
    Document,
    Expense,
    Lease,
    LateFeeRule,
    MaintenanceRequest,
    Message,
    Notification,
    Organization,
    OrganizationInvitation,
    OwnerStatement,
    Payment,
    Property,
    RentalApplication,
    RentLedgerEntry,
    ScreeningRequest,
    Tenant,
    Transaction,
    JournalEntry,
    JournalEntryLine,
    AccountingPeriod,
    RecurringTransaction,
    Unit,
    UserProfile,
)
from .permissions import IsLandlord, IsOrgAdmin
from .serializers import (
    AccountingCategorySerializer,
    DocumentSerializer,
    ExpenseSerializer,
    LeaseSerializer,
    LateFeeRuleSerializer,
    MaintenanceRequestSerializer,
    MessageSerializer,
    NotificationSerializer,
    OrganizationInvitationSerializer,
    OrganizationSerializer,
    OwnerStatementSerializer,
    PaymentSerializer,
    PropertySerializer,
    RentLedgerEntrySerializer,
    TransactionSerializer,
    UserSummarySerializer,
    PublicUnitListingSerializer,
    RentalApplicationSerializer,
    RentalApplicationPublicSerializer,
    ScreeningRequestSerializer,
    TenantConsentSerializer,
    TenantSerializer,
    UnitSerializer,
    JournalEntrySerializer,
    JournalEntryLineSerializer,
    BankReconciliationSerializer,
    ReconciliationDetailSerializer,
    ReconciliationMatchSerializer,
    AccountingPeriodSerializer,
    RecurringTransactionSerializer,
    TransactionImportSerializer,
    ImportedTransactionSerializer,
    CSVColumnMappingSerializer,
    ClassificationRuleSerializer,
)
from .signals import recalculate_lease_balances
from .utils import (
    generate_lease_document,
    seed_chart_of_accounts,
    apply_classification_rules,
    auto_match_reconciliation,
)
from .emails import (
    send_application_received,
    send_application_status_update,
    send_lease_fully_executed,
    send_lease_signing_request,
    send_lease_signed_confirmation,
    send_maintenance_request_submitted,
    send_maintenance_status_update,
    send_screening_consent_request,
)


DEFAULT_ACCOUNTING_CATEGORIES = [
    ("Rent Income", AccountingCategory.TYPE_INCOME, True),
    ("Late Fees", AccountingCategory.TYPE_EXPENSE, True),
    ("Application Fees", AccountingCategory.TYPE_INCOME, True),
    ("Other Income", AccountingCategory.TYPE_INCOME, True),
    ("Repairs & Maintenance", AccountingCategory.TYPE_EXPENSE, True),
    ("Insurance", AccountingCategory.TYPE_EXPENSE, True),
    ("Property Tax", AccountingCategory.TYPE_EXPENSE, True),
    ("Utilities", AccountingCategory.TYPE_EXPENSE, True),
    ("Landscaping", AccountingCategory.TYPE_EXPENSE, True),
    ("Management Fees", AccountingCategory.TYPE_EXPENSE, True),
    ("Legal & Professional", AccountingCategory.TYPE_EXPENSE, True),
    ("Advertising", AccountingCategory.TYPE_EXPENSE, True),
    ("Supplies", AccountingCategory.TYPE_EXPENSE, True),
    ("Capital Improvements", AccountingCategory.TYPE_EXPENSE, True),
    ("Mortgage Interest", AccountingCategory.TYPE_EXPENSE, True),
    ("HOA Fees", AccountingCategory.TYPE_EXPENSE, True),
    ("Pest Control", AccountingCategory.TYPE_EXPENSE, True),
    ("Cleaning", AccountingCategory.TYPE_EXPENSE, True),
    ("Other Expense", AccountingCategory.TYPE_EXPENSE, True),
]


def ensure_default_categories(organization):
    # Deprecated legacy helper. Kept as a no-op for compatibility while
    # chart-of-accounts seeding is handled by seed_chart_of_accounts().
    return


def resolve_accounting_category(organization, name, category_type):
    queryset = AccountingCategory.objects.filter(
        name=name,
        category_type=category_type,
        organization__isnull=True,
    )
    if organization:
        organization_override = AccountingCategory.objects.filter(
            name=name,
            category_type=category_type,
            organization=organization,
        ).first()
        if organization_override:
            return organization_override
    return queryset.first() or AccountingCategory.objects.create(
        name=name,
        category_type=category_type,
        organization=None,
        is_system=True,
        tax_deductible=category_type == AccountingCategory.TYPE_EXPENSE,
        description="System accounting category",
    )


def _month_range_bounds(target):
    month_start = date(target.year, target.month, 1)
    if target.month == 12:
        next_month = date(target.year + 1, 1, 1)
    else:
        next_month = date(target.year, target.month + 1, 1)
    return month_start, next_month - timedelta(days=1)


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


def _parse_csv_date(value):
    if value is None:
        return None
    if isinstance(value, date):
        return value
    normalized = str(value).strip()
    if not normalized:
        return None
    normalized = normalized.lstrip("\ufeff")

    try:
        return date.fromisoformat(normalized)
    except ValueError:
        pass

    parse_formats = [
        "%Y-%m-%d",
        "%m/%d/%Y",
        "%m/%d/%y",
        "%m-%d-%Y",
        "%m-%d-%y",
        "%Y/%m/%d",
    ]
    for fmt in parse_formats:
        try:
            return datetime.strptime(normalized, fmt).date()
        except (TypeError, ValueError):
            pass
    try:
        from dateutil import parser as _dateutil_parser  # type: ignore

        return _dateutil_parser.parse(normalized).date()
    except Exception:
        return None


def _parse_amount_value(value):
    if value is None:
        return None
    raw = str(value).strip()
    if not raw:
        return None

    raw = raw.strip()
    if not raw:
        return None

    negative = raw.startswith("(") and raw.endswith(")")
    if negative:
        raw = raw[1:-1].strip()
    raw = raw.replace("$", "").replace(",", "").strip()
    if not raw:
        return None
    try:
        amount = Decimal(raw)
    except (ArithmeticError, ValueError):
        return None
    if negative:
        amount = -amount
    return amount


def _parse_csv_bytes(raw_bytes):
    if raw_bytes is None:
        return ""
    for encoding in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            text = raw_bytes.decode(encoding)
            return text.lstrip("\ufeff")
        except (UnicodeDecodeError, AttributeError):
            continue
    return raw_bytes.decode("utf-8", errors="ignore").lstrip("\ufeff")


def _month_labels(start_date, end_date):
    months = []
    cursor = date(start_date.year, start_date.month, 1)
    end_marker = date(end_date.year, end_date.month, 1)
    while cursor <= end_marker:
        months.append((cursor.strftime("%Y-%m"), cursor.strftime("%b %Y")))
        if cursor.month == 12:
            cursor = date(cursor.year + 1, 1, 1)
        else:
            cursor = date(cursor.year, cursor.month + 1, 1)
    return months


def _to_float(value):
    if value is None:
        return 0.0
    return float(value)


def _coerce_int(value, default=None):
    if value in (None, ""):
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _month_start(target_date):
    return date(target_date.year, target_date.month, 1)


def _month_end(target_date):
    if target_date.month == 12:
        return date(target_date.year + 1, 1, 1) - timedelta(days=1)
    return date(target_date.year, target_date.month + 1, 1) - timedelta(days=1)


def _month_range(start_date, end_date):
    months = []
    cursor = _month_start(start_date)
    final = _month_start(end_date)
    while cursor <= final:
        months.append(cursor)
        cursor = _month_start(date(cursor.year + 1, 1, 1) if cursor.month == 12 else date(cursor.year, cursor.month + 1, 1))
    return months


def _resolve_reporting_category(organization, category_name, category_type):
    if not organization:
        return AccountingCategory.objects.filter(
            name=category_name,
            category_type=category_type,
            organization__isnull=True,
        ).first()
    category = AccountingCategory.objects.filter(
        organization=organization, name=category_name, category_type=category_type
    ).first()
    if category:
        return category
    category = AccountingCategory.objects.filter(
        name=category_name,
        category_type=category_type,
        organization__isnull=True,
    ).first()
    if category:
        return category
    return AccountingCategory.objects.create(
        organization=organization if organization else None,
        name=category_name,
        category_type=category_type,
        is_system=False,
        tax_deductible=category_type == AccountingCategory.TYPE_EXPENSE,
    )


def _latest_lease_balances(org, lease_ids):
    if not lease_ids:
        return {}
    latest_ids = (
        RentLedgerEntry.objects.filter(
            organization=org, lease_id__in=lease_ids
        )
        .values("lease_id")
        .annotate(last_id=Max("id"))
        .values_list("lease_id", "last_id")
    )
    balance_map = {}
    latest_lookup = {lease_id: entry_id for lease_id, entry_id in latest_ids}
    if not latest_lookup:
        return balance_map
    balances = RentLedgerEntry.objects.filter(id__in=latest_lookup.values()).values_list(
        "lease_id", "balance"
    )
    for lease_id, balance in balances:
        balance_map[lease_id] = balance
    return balance_map


def _to_decimal(value):
    if value in (None, ""):
        return Decimal("0.00")
    try:
        return Decimal(str(value))
    except (TypeError, ValueError, ArithmeticError):
        return Decimal("0.00")


def _ensure_chart_of_accounts(organization):
    if not organization:
        return
    try:
        seed_chart_of_accounts(organization)
    except Exception:
        logger = logging.getLogger(__name__)
        logger.exception(
            "Failed to seed default chart of accounts for organization=%s", organization.id
        )


def _resolve_chart_account(
    organization,
    account_id=None,
    account_code=None,
    account_name=None,
    fallback_code=None,
):
    if organization is None:
        return None

    candidates = []
    if account_id:
        try:
            candidates.append(("id", int(account_id)))
        except (TypeError, ValueError):
            pass
    if account_code:
        candidates.append(("code", str(account_code).strip()))
    if account_name:
        candidates.append(("name", str(account_name).strip()))
    if fallback_code:
        candidates.append(("code", str(fallback_code).strip()))

    if account_code is not None and account_code not in ("", "0"):
        candidates.append(("code", str(account_code).strip()))

    for key, value in candidates:
        if not value:
            continue
        if key == "id":
            acct = AccountingCategory.objects.filter(
                organization=organization, id=value, is_active=True
            ).first()
            if acct:
                return acct
        elif key == "code":
            acct = AccountingCategory.objects.filter(
                Q(organization=organization) | Q(organization__isnull=True),
                account_code=value,
                is_active=True,
            ).first()
            if acct:
                return acct
        elif key == "name":
            acct = AccountingCategory.objects.filter(
                Q(organization=organization) | Q(organization__isnull=True),
                name=value,
                is_active=True,
            ).first()
            if acct:
                return acct
    return None


def _validate_account_can_post(account):
    if account.is_system and account.parent_account_id is None and account.is_header is False:
        # Allow system leaf accounts (e.g. seeded accounts).
        return True
    if account.is_header:
        raise ValidationError("Cannot post to a header account.")
    if not account.is_active:
        raise ValidationError("Cannot post to an inactive account.")


def _period_is_locked(organization, entry_date):
    return AccountingPeriod.objects.filter(
        organization=organization,
        is_locked=True,
        period_start__lte=entry_date,
        period_end__gte=entry_date,
    ).exists()


def _normalize_journal_lines(lines):
    total_debit = Decimal("0.00")
    total_credit = Decimal("0.00")

    for line in lines:
        if not isinstance(line, dict):
            raise ValidationError("Each journal line must be an object.")
        debit = _to_decimal(line.get("debit_amount"))
        credit = _to_decimal(line.get("credit_amount"))
        if debit > 0 and credit > 0:
            raise ValidationError("Each line cannot have both debit and credit.")
        if debit <= 0 and credit <= 0:
            raise ValidationError("Each line must have either debit or credit amount.")
        account = line.get("account")
        if account is None:
            raise ValidationError("Each line requires an account.")
        if not hasattr(account, "id"):
            account = _resolve_chart_account(
                None if line.get("organization") is None else line["organization"],
                account_id=account,
            )
        if account is None:
            raise ValidationError("Invalid account in journal line.")
        _validate_account_can_post(account)
        total_debit += debit
        total_credit += credit

    if total_debit != total_credit:
        raise ValidationError("Journal entry must be balanced (total debits must equal total credits).")
    return total_debit, total_credit


def _posted_line_queryset(
    organization,
    property_id=None,
    account_id=None,
    date_from=None,
    date_to=None,
):
    queryset = JournalEntryLine.objects.filter(
        journal_entry__organization=organization,
        journal_entry__status=JournalEntry.STATUS_POSTED,
    ).select_related("journal_entry", "account", "property", "unit", "tenant", "lease")

    if property_id:
        queryset = queryset.filter(property_id=property_id)
    if account_id:
        queryset = queryset.filter(account_id=account_id)
    if date_from:
        queryset = queryset.filter(journal_entry__entry_date__gte=date_from)
    if date_to:
        queryset = queryset.filter(journal_entry__entry_date__lte=date_to)
    return queryset


def _account_running_balance(lines):
    balance = Decimal("0.00")
    rows = []
    for line in lines:
        account = line.account
        debit = line.debit_amount or Decimal("0.00")
        credit = line.credit_amount or Decimal("0.00")
        if account.normal_balance == AccountingCategory.NORMAL_BALANCE_CREDIT:
            balance += (credit - debit)
        else:
            balance += (debit - credit)
        rows.append(
            {
                "line_id": line.id,
                "entry_id": line.journal_entry_id,
                "entry_date": str(line.journal_entry.entry_date),
                "memo": line.journal_entry.memo,
                "account_id": account.id,
                "account_name": account.name,
                "account_code": account.account_code,
                "debit_amount": _to_float(debit),
                "credit_amount": _to_float(credit),
                "balance": _to_float(balance),
                "property_id": line.property_id,
                "property_name": line.property.name if line.property else None,
                "unit_name": line.unit.unit_number if line.unit else None,
                "tenant_id": line.tenant_id,
                "lease_id": line.lease_id,
            }
        )
    return rows, balance


def _create_posted_journal_entry(
    organization,
    entry_date,
    memo,
    lines,
    user=None,
    source_type="manual",
    source_id=None,
    status=JournalEntry.STATUS_DRAFT,
    is_adjusting=False,
    auto_post=False,
):
    if not lines:
        raise ValidationError("Journal entry lines are required.")
    if _period_is_locked(organization, entry_date):
        raise ValidationError("Cannot create or post entries in a locked accounting period.")

    resolved_lines = []
    total_debit = Decimal("0.00")
    total_credit = Decimal("0.00")

    for line in lines:
        account = _resolve_chart_account(
            organization,
            account_id=line.get("account_id"),
            account_code=line.get("account_code"),
            account_name=line.get("account_name"),
        )
        if not account:
            raise ValidationError("One or more journal lines reference unknown accounts.")
        _validate_account_can_post(account)
        debit = _to_decimal(line.get("debit_amount"))
        credit = _to_decimal(line.get("credit_amount"))
        if debit > 0 and credit > 0:
            raise ValidationError("Journal lines cannot contain both debit and credit values.")
        if debit <= 0 and credit <= 0:
            raise ValidationError("Each journal line must contain debit or credit.")

        total_debit += debit
        total_credit += credit
        resolved_lines.append(
            {
                "account": account,
                "debit_amount": debit,
                "credit_amount": credit,
                "description": line.get("description", ""),
                "property_id": line.get("property_id"),
                "unit_id": line.get("unit_id"),
                "tenant_id": line.get("tenant_id"),
                "lease_id": line.get("lease_id"),
                "vendor": line.get("vendor", ""),
                "reference": line.get("reference", ""),
            }
        )

    if total_debit != total_credit:
        raise ValidationError("Journal entry must be balanced.")

    with db_transaction.atomic():
        journal_entry = JournalEntry.objects.create(
            organization=organization,
            entry_date=entry_date,
            memo=memo[:500] if memo else "",
            status=status,
            source_type=source_type,
            source_id=source_id,
            is_adjusting=is_adjusting,
            created_by=user,
        )
        if status == JournalEntry.STATUS_POSTED:
            journal_entry.posted_at = timezone.now()
            journal_entry.save(update_fields=["posted_at"])

        lines_to_create = [
            JournalEntryLine(
                journal_entry=journal_entry,
                organization=organization,
                account=line["account"],
                debit_amount=line["debit_amount"],
                credit_amount=line["credit_amount"],
                description=line["description"],
                property_id=line["property_id"],
                unit_id=line["unit_id"],
                tenant_id=line["tenant_id"],
                lease_id=line["lease_id"],
                vendor=line["vendor"],
                reference=line["reference"],
            )
            for line in resolved_lines
        ]
        JournalEntryLine.objects.bulk_create(lines_to_create)

        if auto_post and journal_entry.status == JournalEntry.STATUS_DRAFT:
            journal_entry.status = JournalEntry.STATUS_POSTED
            journal_entry.posted_at = timezone.now()
            journal_entry.save(update_fields=["status", "posted_at"])

    return journal_entry


def _legacy_account_from_category(organization, category):
    if not category:
        return None

    org_account = AccountingCategory.objects.filter(
        organization=organization,
        name=category.name,
        is_active=True,
    ).first()
    if org_account:
        return org_account

    global_account = AccountingCategory.objects.filter(
        name=category.name,
        is_active=True,
        organization__isnull=True,
    ).first()
    if global_account:
        return global_account

    return None


def _cash_account_for_organization(organization):
    return (
        _resolve_chart_account(organization, account_code="1020")
        or _resolve_chart_account(organization, account_code="1010")
    )


def _transaction_to_journal_entry(transaction_obj):
    account = _legacy_account_from_category(transaction_obj.organization, transaction_obj.category)
    if not account:
        return None

    cash_account = _cash_account_for_organization(transaction_obj.organization)
    if not cash_account:
        return None

    if transaction_obj.transaction_type == Transaction.TYPE_INCOME:
        lines = [
            {"account_id": cash_account.id, "debit_amount": transaction_obj.amount, "credit_amount": "0.00"},
            {"account_id": account.id, "debit_amount": "0.00", "credit_amount": transaction_obj.amount},
        ]
    else:
        lines = [
            {"account_id": account.id, "debit_amount": transaction_obj.amount, "credit_amount": "0.00"},
            {"account_id": cash_account.id, "debit_amount": "0.00", "credit_amount": transaction_obj.amount},
        ]

    return _create_posted_journal_entry(
        organization=transaction_obj.organization,
        entry_date=transaction_obj.date,
        memo=transaction_obj.description or "Transaction sync",
        lines=lines,
        user=transaction_obj.created_by,
        source_type="manual",
        source_id=transaction_obj.id,
        status=JournalEntry.STATUS_POSTED,
    )


class _ImportPagination(PageNumberPagination):
    page_size = 100


def _normalize_mapping_row(row):
    return {
        str(k or "").strip().lstrip("\ufeff"): ("" if v is None else str(v).strip())
        for k, v in (row or {}).items()
    }


def _load_import_rows(transaction_import):
    mapping_payload = (
        transaction_import.column_mapping if isinstance(transaction_import.column_mapping, dict) else {}
    )
    rows = mapping_payload.get("rows")
    return rows if isinstance(rows, list) else []


logger = logging.getLogger(__name__)


class OrganizationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = getattr(request.user, "profile", None)
        organization = getattr(profile, "organization", None)
        if not organization:
            return Response(
                {"detail": "No organization assigned to this user."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(OrganizationSerializer(organization).data)

    def patch(self, request):
        profile = getattr(request.user, "profile", None)
        organization = getattr(profile, "organization", None)
        if not organization:
            return Response(
                {"detail": "No organization assigned to this user."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if not profile.is_org_admin:
            return Response(
                {"detail": "Only organization admins can update the organization."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = OrganizationSerializer(
            organization,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class OrganizationInviteView(APIView):
    permission_classes = [IsAuthenticated, IsOrgAdmin]

    def post(self, request):
        profile = getattr(request.user, "profile", None)
        organization = getattr(profile, "organization", None)
        if not organization:
            return Response(
                {"detail": "No organization assigned to this user."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        email = (request.data.get("email") or "").strip().lower()
        role = (request.data.get("role") or UserProfile.ROLE_TENANT).strip().lower()
        tenant_id = request.data.get("tenant_id")

        errors = {}
        if not email:
            errors["email"] = "Email is required."
        if role not in {UserProfile.ROLE_LANDLORD, UserProfile.ROLE_TENANT}:
            errors["role"] = "Role must be either 'landlord' or 'tenant'."
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        tenant = None
        if tenant_id:
            try:
                tenant = Tenant.objects.get(id=tenant_id, organization=organization)
            except Tenant.DoesNotExist:
                return Response(
                    {"tenant_id": "Tenant not found in your organization."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if OrganizationInvitation.objects.filter(
            organization=organization,
            email=email,
            status=OrganizationInvitation.STATUS_PENDING,
        ).exists():
            return Response(
                {"email": "An invitation is already pending for this email."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        invitation = OrganizationInvitation.objects.create(
            organization=organization,
            email=email,
            role=role,
            invited_by=request.user,
            tenant=tenant,
        )
        return Response(
            OrganizationInvitationSerializer(invitation).data,
            status=status.HTTP_201_CREATED,
        )


class OrganizationMembersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = getattr(request.user, "profile", None)
        organization = getattr(profile, "organization", None)
        if not organization:
            return Response(
                {"detail": "No organization assigned to this user."},
                status=status.HTTP_404_NOT_FOUND,
            )

        members = UserProfile.objects.filter(organization=organization).select_related(
            "user", "tenant"
        )
        payload = [
            {
                "id": member.user.id,
                "username": member.user.username,
                "first_name": member.user.first_name,
                "last_name": member.user.last_name,
                "email": member.user.email,
                "role": member.role,
                "tenant_id": member.tenant_id,
                "is_org_admin": member.is_org_admin,
            }
            for member in members
        ]
        return Response(payload)


class OrganizationUsersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = getattr(request.user, "profile", None)
        organization = getattr(profile, "organization", None)
        if not organization:
            return Response(
                {"users": [], "tenants": []},
                status=status.HTTP_200_OK,
            )
        users = (
            User.objects.filter(profile__organization=organization)
            .select_related("profile")
            .order_by("first_name", "last_name", "username")
        )
        user_payload = [
            {
                "id": user.id,
                "name": (f"{user.first_name} {user.last_name}".strip() or user.username),
                "email": user.email,
                "type": "user",
            }
            for user in users
        ]
        tenants = Tenant.objects.filter(organization=organization).order_by(
            "first_name", "last_name"
        )
        tenant_payload = [
            {
                "id": tenant.id,
                "name": f"{tenant.first_name} {tenant.last_name}".strip(),
                "email": tenant.email,
                "type": "tenant",
            }
            for tenant in tenants
        ]
        return Response({"users": user_payload, "tenants": tenant_payload})


class OrganizationInvitationsView(APIView):
    permission_classes = [IsAuthenticated, IsOrgAdmin]

    def get(self, request):
        profile = getattr(request.user, "profile", None)
        organization = getattr(profile, "organization", None)
        if not organization:
            return Response(
                {"detail": "No organization assigned to this user."},
                status=status.HTTP_404_NOT_FOUND,
            )
        queryset = OrganizationInvitation.objects.filter(organization=organization).order_by(
            "-created_at"
        )
        return Response(OrganizationInvitationSerializer(queryset, many=True).data)


class PublicListingsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        queryset = (
            Unit.objects.select_related("property")
            .filter(is_listed=True)
            .order_by("-created_at")
        )

        params = request.query_params
        min_rent = params.get("min_rent")
        max_rent = params.get("max_rent")
        bedrooms = params.get("bedrooms")
        city = params.get("city")

        if min_rent:
            queryset = queryset.filter(rent_amount__gte=min_rent)
        if max_rent:
            queryset = queryset.filter(rent_amount__lte=max_rent)
        if bedrooms:
            queryset = queryset.filter(bedrooms=bedrooms)
        if city:
            queryset = queryset.filter(property__city__icontains=city)

        serializer = PublicUnitListingSerializer(queryset, many=True)
        return Response(serializer.data)


class PublicListingDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug):
        unit = (
            Unit.objects.select_related("property")
            .filter(is_listed=True, listing_slug=slug)
            .first()
        )
        if not unit:
            return Response(
                {"detail": "Listing not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(PublicUnitListingSerializer(unit).data)


class PublicListingApplicationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, slug):
        unit = (
            Unit.objects.select_related("property")
            .filter(is_listed=True, listing_slug=slug)
            .first()
        )
        if not unit:
            return Response(
                {"detail": "Listing not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        payload = request.data.copy()
        if hasattr(payload, "dict"):
            payload = payload.dict()

        payload.pop("unit", None)
        payload.pop("unit_id", None)
        payload.pop("tenant", None)
        payload["listing_slug"] = slug
        serializer = RentalApplicationPublicSerializer(data=payload)
        serializer.is_valid(raise_exception=True)

        references = serializer.validated_data.get("references", [])
        if not isinstance(references, list):
            return Response(
                {"references": "References must be a list."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(references) > 3:
            return Response(
                {"references": "A maximum of 3 references is allowed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        for index, entry in enumerate(references):
            if not isinstance(entry, dict):
                return Response(
                    {
                        "references": f"Reference #{index + 1} must be an object with name, phone, and relationship.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not entry.get("name") or not entry.get("phone") or not entry.get("relationship"):
                return Response(
                    {
                        "references": f"Reference #{index + 1} requires name, phone, and relationship.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        application = RentalApplication.objects.create(
            unit=unit,
            organization=unit.organization,
            listing_slug=slug,
            status=RentalApplication.STATUS_SUBMITTED,
            first_name=serializer.validated_data["first_name"],
            last_name=serializer.validated_data["last_name"],
            email=serializer.validated_data["email"],
            phone=serializer.validated_data["phone"],
            date_of_birth=serializer.validated_data["date_of_birth"],
            ssn_last4=(serializer.validated_data.get("ssn_last4") or "").strip(),
            current_address=serializer.validated_data["current_address"],
            current_city=serializer.validated_data["current_city"],
            current_state=serializer.validated_data["current_state"],
            current_zip=serializer.validated_data["current_zip"],
            current_landlord_name=serializer.validated_data.get("current_landlord_name") or "",
            current_landlord_phone=serializer.validated_data.get("current_landlord_phone") or "",
            current_rent=serializer.validated_data.get("current_rent"),
            reason_for_moving=serializer.validated_data.get("reason_for_moving") or "",
            employer_name=serializer.validated_data.get("employer_name") or "",
            employer_phone=serializer.validated_data.get("employer_phone") or "",
            job_title=serializer.validated_data.get("job_title") or "",
            monthly_income=serializer.validated_data.get("monthly_income"),
            employment_length=serializer.validated_data.get("employment_length") or "",
            num_occupants=serializer.validated_data.get("num_occupants") or 1,
            has_pets=bool(serializer.validated_data.get("has_pets")),
            pet_description=serializer.validated_data.get("pet_description") or "",
            has_been_evicted=bool(serializer.validated_data.get("has_been_evicted")),
            has_criminal_history=bool(serializer.validated_data.get("has_criminal_history")),
            additional_notes=serializer.validated_data.get("additional_notes") or "",
            references=references,
            consent_background_check=bool(serializer.validated_data["consent_background_check"]),
            consent_credit_check=bool(serializer.validated_data["consent_credit_check"]),
            electronic_signature=serializer.validated_data["electronic_signature"],
            signature_date=timezone.now(),
        )
        try:
            send_application_received(
                applicant_email=application.email,
                applicant_name=f"{application.first_name} {application.last_name}".strip(),
                property_name=unit.property.name if unit.property else "",
                unit_number=unit.unit_number,
            )
        except Exception:
            logger.exception("Failed to send application received email for application=%s", application.id)

        return Response(
            {
                "application_id": application.id,
                "reference_number": f"RA-{application.id:06d}",
                "status": application.status,
                "message": "Application submitted successfully.",
            },
            status=status.HTTP_201_CREATED,
        )


class RentalApplicationViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    queryset = RentalApplication.objects.select_related("unit", "reviewed_by")
    serializer_class = RentalApplicationSerializer
    permission_classes = [IsLandlord]
    http_method_names = ["get", "patch", "head", "options", "post"]

    def get_queryset(self):
        queryset = super().get_queryset()
        status_filter = self.request.query_params.get("status")
        unit_id = self.request.query_params.get("unit")
        ordering = self.request.query_params.get("ordering")
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if unit_id:
            queryset = queryset.filter(unit_id=unit_id)
        if ordering in {"created_at", "-created_at", "unit_id", "-unit_id"}:
            queryset = queryset.order_by(ordering)
        return queryset

    def partial_update(self, request, *args, **kwargs):
        application = self.get_object()
        old_status = application.status
        status_value = request.data.get("status")
        if status_value and status_value not in {
            RentalApplication.STATUS_SUBMITTED,
            RentalApplication.STATUS_UNDER_REVIEW,
            RentalApplication.STATUS_APPROVED,
            RentalApplication.STATUS_DENIED,
            RentalApplication.STATUS_WITHDRAWN,
        }:
            return Response(
                {"status": "Invalid status value."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        update_fields = []
        if status_value is not None:
            application.status = status_value
            update_fields.append("status")
        if "review_notes" in request.data:
            application.review_notes = (request.data.get("review_notes") or "").strip()
            update_fields.append("review_notes")
        if update_fields:
            application.reviewed_by = request.user
            update_fields.append("reviewed_by")
            application.updated_at = timezone.now()
            update_fields.append("updated_at")
            application.save(update_fields=update_fields)

        if status_value and status_value != old_status:
            unit = application.unit
            property_name = unit.property.name if unit and unit.property else "your property"
            unit_number = unit.unit_number if unit else "N/A"
            try:
                send_application_status_update(
                    applicant_email=application.email,
                    applicant_name=f"{application.first_name} {application.last_name}".strip(),
                    property_name=f"{property_name} Unit {unit_number}",
                    status=status_value,
                )
            except Exception:
                logger.exception(
                    "Failed to send status update email for application=%s",
                    application.id,
                )

        serializer = self.get_serializer(application)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        application = self.get_object()
        tenant = Tenant.objects.filter(
            email__iexact=application.email,
            organization=application.organization,
        ).first()
        if not tenant:
            tenant = Tenant.objects.create(
                organization=application.organization,
                first_name=application.first_name,
                last_name=application.last_name,
                email=application.email,
                phone=application.phone,
                date_of_birth=application.date_of_birth,
            )

        application.status = RentalApplication.STATUS_APPROVED
        application.reviewed_by = request.user
        application.review_notes = (request.data.get("review_notes") or application.review_notes or "").strip()
        application.save(update_fields=["status", "reviewed_by", "review_notes", "updated_at"])
        try:
            unit = application.unit
            property_name = unit.property.name if unit and unit.property else ""
            unit_number = unit.unit_number if unit else ""
            send_application_status_update(
                applicant_email=application.email,
                applicant_name=f"{application.first_name} {application.last_name}".strip(),
                property_name=f"{property_name} Unit {unit_number}" if property_name else unit_number,
                status=application.status,
            )
        except Exception:
            logger.exception("Failed to send application status email for application=%s", application.id)

        screening = ScreeningRequest.objects.create(
            tenant=tenant,
            requested_by=request.user,
            organization=application.organization,
            status=ScreeningRequest.STATUS_PENDING,
            consent_status=ScreeningRequest.CONSENT_PENDING,
            tenant_email=application.email,
        )

        return Response(
            {
                "detail": "Application approved.",
                "application": RentalApplicationSerializer(application).data,
                "tenant_id": tenant.id,
                "screening_id": screening.id,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="run-screening")
    def run_screening(self, request, pk=None):
        application = self.get_object()
        if application.status not in {
            RentalApplication.STATUS_APPROVED,
            RentalApplication.STATUS_SUBMITTED,
            RentalApplication.STATUS_UNDER_REVIEW,
        }:
            return Response(
                {"detail": "Only submitted, under review, or approved applications can run screening."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        tenant = Tenant.objects.filter(
            email__iexact=application.email,
            organization=application.organization,
        ).first()
        if not tenant:
            tenant = Tenant.objects.create(
                organization=application.organization,
                first_name=application.first_name,
                last_name=application.last_name,
                email=application.email,
                phone=application.phone,
                date_of_birth=application.date_of_birth,
            )

        screening = ScreeningRequest.objects.create(
            tenant=tenant,
            requested_by=request.user,
            organization=application.organization,
            status=ScreeningRequest.STATUS_PENDING,
            consent_status=ScreeningRequest.CONSENT_PENDING,
            tenant_email=application.email,
        )
        return Response(
            {
                "detail": "Screening created.",
                "screening_id": screening.id,
                "application": RentalApplicationSerializer(application).data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="deny")
    def deny(self, request, pk=None):
        application = self.get_object()
        application.status = RentalApplication.STATUS_DENIED
        application.reviewed_by = request.user
        application.review_notes = (request.data.get("review_notes") or application.review_notes or "").strip()
        application.save(update_fields=["status", "reviewed_by", "review_notes", "updated_at"])
        try:
            unit = application.unit
            property_name = unit.property.name if unit and unit.property else ""
            unit_number = unit.unit_number if unit else ""
            send_application_status_update(
                applicant_email=application.email,
                applicant_name=f"{application.first_name} {application.last_name}".strip(),
                property_name=f"{property_name} Unit {unit_number}" if property_name else unit_number,
                status=application.status,
            )
        except Exception:
            logger.exception("Failed to send application status email for application=%s", application.id)
        return Response(
            {
                "detail": "Application denied.",
                "application": RentalApplicationSerializer(application).data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="create-lease")
    def create_lease(self, request, pk=None):
        application = self.get_object()
        if application.status != RentalApplication.STATUS_APPROVED:
            return Response(
                {"detail": "Only approved applications can create a lease."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        tenant = Tenant.objects.filter(
            email__iexact=application.email,
            organization=application.organization,
        ).first()
        if not tenant:
            tenant = Tenant.objects.create(
                organization=application.organization,
                first_name=application.first_name,
                last_name=application.last_name,
                email=application.email,
                phone=application.phone,
                date_of_birth=application.date_of_birth,
            )

        existing_lease = Lease.objects.filter(application=application).first()
        if existing_lease:
            return Response(
                {
                    "detail": "A lease already exists for this application.",
                    "lease": LeaseSerializer(existing_lease).data,
                },
                status=status.HTTP_200_OK,
            )

        today = date.today()
        start_month = today.month + 1
        start_year = today.year
        if start_month == 13:
            start_month = 1
            start_year += 1
        start_date = date(start_year, start_month, 1)
        end_date = date(start_year + 1, start_month, 1)

        deposit = (
            application.unit.rent_amount
            if application.unit and application.unit.rent_amount is not None
            else None
        )

        lease = Lease.objects.create(
            unit=application.unit,
            tenant=tenant,
            organization=application.organization,
            application=application,
            start_date=start_date,
            end_date=end_date,
            monthly_rent=application.unit.rent_amount,
            security_deposit=deposit,
            is_active=True,
            signature_status=Lease.SIGNATURE_DRAFT,
        )

        return Response(
            {"detail": "Lease created.", "lease": LeaseSerializer(lease).data},
            status=status.HTTP_201_CREATED,
        )


class PropertyViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    queryset = Property.objects.all()
    serializer_class = PropertySerializer

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            return [IsAuthenticated()]
        return [IsLandlord()]

class UnitViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    queryset = Unit.objects.all()
    serializer_class = UnitSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        property_id = self.request.query_params.get("property_id")
        is_listed = self.request.query_params.get("is_listed")
        if property_id:
            queryset = queryset.filter(property_id=property_id)
        if is_listed is not None:
            normalized = str(is_listed).strip().lower()
            if normalized in {"1", "true", "yes", "y"}:
                queryset = queryset.filter(is_listed=True)
            elif normalized in {"0", "false", "no", "n"}:
                queryset = queryset.filter(is_listed=False)
        return queryset

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            return [IsAuthenticated()]
        return [IsLandlord()]


class TenantViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        profile = getattr(self.request.user, "profile", None)
        if profile and profile.role == UserProfile.ROLE_TENANT:
            if profile.tenant_id:
                queryset = queryset.filter(id=profile.tenant_id)
            else:
                queryset = queryset.none()
        return queryset

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            return [IsAuthenticated()]
        return [IsLandlord()]


class LeaseViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    queryset = Lease.objects.all()
    serializer_class = LeaseSerializer

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            return [IsAuthenticated()]
        return [IsLandlord()]

    def get_queryset(self):
        queryset = super().get_queryset()
        profile = getattr(self.request.user, "profile", None)
        if profile and profile.role == UserProfile.ROLE_TENANT:
            if profile.tenant_id:
                queryset = queryset.filter(tenant_id=profile.tenant_id)
            else:
                queryset = queryset.none()
        return queryset

    def _resolve_lease(self):
        return self.get_object()

    @staticmethod
    def _build_lease_summary(lease):
        content = ""
        if lease.lease_document and lease.lease_document.file:
            try:
                lease.lease_document.file.seek(0)
                content = lease.lease_document.file.read().decode("utf-8", errors="ignore")
            except Exception:
                content = ""
        if not content:
            content = generate_lease_document(lease)
        return content

    @action(detail=True, methods=["post"], url_path="generate-document")
    def generate_document(self, request, pk=None):
        lease = self._resolve_lease()
        content = generate_lease_document(lease)

        if lease.lease_document_id:
            document = lease.lease_document
            document.file.save(
                f"lease_{lease.id}.html",
                ContentFile(content.encode("utf-8")),
                save=True,
            )
            document.name = f"Lease Agreement - Lease {lease.id}"
            document.file_size = len(content.encode("utf-8"))
            document.file_type = "html"
            document.save(update_fields=["name", "file_size", "file_type", "updated_at"])
        else:
            document = Document.objects.create(
                name=f"Lease Agreement - Lease {lease.id}",
                file=ContentFile(content.encode("utf-8"), name=f"lease_{lease.id}.html"),
                organization=lease.organization,
                document_type=Document.TYPE_LEASE_AGREEMENT,
                uploaded_by=request.user,
                property=lease.unit.property,
                unit=lease.unit,
                tenant=lease.tenant,
                lease=lease,
                description=f"Generated lease agreement for tenant {lease.tenant}",
                file_size=len(content.encode("utf-8")),
                file_type="html",
            )
            lease.lease_document = document

        lease.signature_status = Lease.SIGNATURE_DRAFT
        lease.save(update_fields=["lease_document", "signature_status", "updated_at"])
        return Response(
            {
                "detail": "Lease document generated.",
                "lease": LeaseSerializer(lease).data,
                "content": content,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="send-for-signing")
    def send_for_signing(self, request, pk=None):
        lease = self._resolve_lease()

        if not lease.lease_document_id:
            return Response(
                {"detail": "Generate a lease document before sending for signing."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        signing_token = lease.signing_token
        if not signing_token:
            signing_token = uuid.uuid4().hex
            while Lease.objects.filter(signing_token=signing_token).exclude(pk=lease.pk).exists():
                signing_token = uuid.uuid4().hex
            lease.signing_token = signing_token

        lease.signature_status = Lease.SIGNATURE_SENT
        lease.save(update_fields=["signing_token", "signature_status", "updated_at"])

        property_obj = lease.unit.property if lease.unit else None
        property_name = property_obj.name if property_obj else ""
        tenant_name = f"{lease.tenant.first_name} {lease.tenant.last_name}".strip() if lease.tenant else ""
        signing_link = f"/lease/sign/{lease.signing_token}"
        try:
            send_lease_signing_request(
                tenant_email=(lease.tenant.email if lease.tenant else ""),
                tenant_name=tenant_name,
                property_name=property_name,
                landlord_name=(lease.organization.name if lease.organization else request.user.get_full_name() or request.user.username),
                signing_link=signing_link,
            )
        except Exception:
            logger.exception("Failed to send lease signing request for lease=%s", lease.id)

        return Response(
            {
                "detail": "Lease sent for signing.",
                "signing_token": lease.signing_token,
                "signing_link": signing_link,
                "lease": LeaseSerializer(lease).data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="landlord-sign")
    def landlord_sign(self, request, pk=None):
        lease = self._resolve_lease()
        signature = (request.data.get("signature") or "").strip()
        if not signature:
            return Response(
                {"signature": "Signature is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        lease.landlord_signature = signature
        lease.landlord_signed_date = timezone.now()
        if lease.tenant_signature and lease.signature_status != Lease.SIGNATURE_DECLINED:
            lease.signature_status = Lease.SIGNATURE_SIGNED
        else:
            lease.signature_status = Lease.SIGNATURE_SENT
        lease.save(
            update_fields=[
                "landlord_signature",
                "landlord_signed_date",
                "signature_status",
                "updated_at",
            ]
        )
        try:
            if lease.signature_status == Lease.SIGNATURE_SIGNED:
                tenant_email = lease.tenant.email if lease.tenant else None
                tenant_name = f"{lease.tenant.first_name} {lease.tenant.last_name}".strip() if lease.tenant else ""
                property_name = lease.unit.property.name if lease.unit and lease.unit.property else ""
                landlord_email = request.user.email or (lease.organization.owner.email if lease.organization and lease.organization.owner else None)
                landlord_name = lease.organization.name if lease.organization else (request.user.get_full_name() or request.user.username)
                send_lease_fully_executed(
                    tenant_email=tenant_email,
                    tenant_name=tenant_name,
                    property_name=property_name,
                    landlord_email=landlord_email,
                    landlord_name=landlord_name,
                )
        except Exception:
            logger.exception("Failed to send fully executed lease emails for lease=%s", lease.id)
        return Response(
            {
                "detail": "Landlord signature saved.",
                "lease": LeaseSerializer(lease).data,
            },
            status=status.HTTP_200_OK,
        )


class LeaseSigningPublicView(APIView):
    permission_classes = [AllowAny]

    @staticmethod
    def _lease_content(lease):
        if lease.lease_document and lease.lease_document.file:
            try:
                lease.lease_document.file.seek(0)
                return lease.lease_document.file.read().decode("utf-8", errors="ignore")
            except Exception:
                return generate_lease_document(lease)
        return generate_lease_document(lease)

    @staticmethod
    def _build_payload(lease, content):
        property_obj = lease.unit.property if lease.unit else None
        address_parts = []
        if property_obj:
            if property_obj.address_line1:
                address_parts.append(property_obj.address_line1)
            if property_obj.address_line2:
                address_parts.append(property_obj.address_line2)
            if property_obj.city or property_obj.state or property_obj.zip_code:
                address_parts.append(
                    f"{property_obj.city}, {property_obj.state} {property_obj.zip_code}".strip()
                )

        return {
            "id": lease.id,
            "signature_status": lease.signature_status,
            "start_date": lease.start_date,
            "end_date": lease.end_date,
            "monthly_rent": str(lease.monthly_rent),
            "security_deposit": str(lease.security_deposit),
            "tenant_signature": lease.tenant_signature,
            "tenant_signed_date": lease.tenant_signed_date,
            "landlord_signature": lease.landlord_signature,
            "landlord_signed_date": lease.landlord_signed_date,
            "property_name": property_obj.name if property_obj else "",
            "property_address": ", ".join([part.strip() for part in address_parts if part and part.strip()]),
            "unit_number": lease.unit.unit_number if lease.unit else "",
            "landlord_name": lease.organization.name if lease.organization else "Property Management",
            "tenant_name": f"{lease.tenant.first_name} {lease.tenant.last_name}".strip() if lease.tenant else "",
            "content": content,
            "signing_token": lease.signing_token,
            "updated_at": lease.updated_at,
        }

    def get(self, request, token):
        lease = (
            Lease.objects.select_related("tenant", "unit__property", "application")
            .filter(signing_token=token)
            .first()
        )
        if not lease:
            return Response({"detail": "Lease signing link not found."}, status=status.HTTP_404_NOT_FOUND)

        payload = self._build_payload(lease, self._lease_content(lease))
        return Response(payload, status=status.HTTP_200_OK)

    def post(self, request, token):
        lease = (
            Lease.objects.select_related("tenant", "unit")
            .filter(signing_token=token)
            .first()
        )
        if not lease:
            return Response({"detail": "Lease signing link not found."}, status=status.HTTP_404_NOT_FOUND)

        payload = request.data or {}
        agreed = payload.get("agreed")
        if isinstance(agreed, str):
            agreed = agreed.lower() in {"true", "1", "yes", "y"}
        if agreed is None:
            return Response({"agreed": "agreed is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not isinstance(agreed, bool):
            return Response({"agreed": "agreed must be a boolean."}, status=status.HTTP_400_BAD_REQUEST)

        if lease.signature_status == Lease.SIGNATURE_SIGNED:
            return Response(
                {
                    "detail": "This lease has already been signed.",
                    "lease": LeaseSerializer(lease).data,
                    "content": self._lease_content(lease),
                },
                status=status.HTTP_200_OK,
            )

        signature = (payload.get("signature") or "").strip()
        if agreed and not signature:
            return Response({"signature": "Signature is required when agreeing."}, status=status.HTTP_400_BAD_REQUEST)

        if agreed:
            lease.tenant_signature = signature
            lease.tenant_signed_date = timezone.now()
            lease.signature_status = Lease.SIGNATURE_SIGNED if lease.landlord_signature else Lease.SIGNATURE_VIEWED
        else:
            lease.signature_status = Lease.SIGNATURE_DECLINED
            lease.tenant_signature = signature
            lease.tenant_signed_date = timezone.now()

        lease.save(update_fields=["tenant_signature", "tenant_signed_date", "signature_status", "updated_at"])
        try:
            tenant_name = (
                f"{lease.tenant.first_name} {lease.tenant.last_name}".strip()
                if lease.tenant
                else ""
            )
            property_name = (
                lease.unit.property.name
                if lease.unit and lease.unit.property
                else ""
            )
            if agreed:
                send_lease_signed_confirmation(
                    tenant_email=lease.tenant.email if lease.tenant else "",
                    tenant_name=tenant_name,
                    property_name=property_name,
                )
            if agreed and lease.landlord_signature and lease.signature_status == Lease.SIGNATURE_SIGNED:
                send_lease_fully_executed(
                    tenant_email=lease.tenant.email if lease.tenant else "",
                    tenant_name=tenant_name,
                    property_name=property_name,
                    landlord_email=(
                        lease.application and lease.application.reviewed_by.email
                        if lease.application and lease.application.reviewed_by
                        else lease.organization.owner.email
                        if lease.organization and lease.organization.owner
                        else None
                    ),
                    landlord_name=(
                        lease.organization.name
                        if lease.organization
                        else "Property Management"
                    ),
                )
        except Exception:
            logger.exception("Failed to send lease notification after tenant signature for lease=%s", lease.id)
        return Response(
            {
                "detail": "Tenant signature recorded.",
                "lease": LeaseSerializer(lease).data,
                "content": self._lease_content(lease),
            },
            status=status.HTTP_200_OK,
        )



class PaymentViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            return [IsAuthenticated()]
        return [IsLandlord()]

    def get_queryset(self):
        queryset = super().get_queryset()
        profile = getattr(self.request.user, "profile", None)
        if profile and profile.role == UserProfile.ROLE_TENANT:
            if profile.tenant_id:
                queryset = queryset.filter(lease__tenant_id=profile.tenant_id)
            else:
                queryset = queryset.none()
        return queryset


class MaintenanceRequestViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    queryset = MaintenanceRequest.objects.all()
    serializer_class = MaintenanceRequestSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        profile = getattr(self.request.user, "profile", None)
        if profile and profile.role == UserProfile.ROLE_TENANT:
            if profile.tenant_id:
                queryset = queryset.filter(tenant_id=profile.tenant_id)
            else:
                queryset = queryset.none()

        status_filter = self.request.query_params.get("status")
        unit_id = self.request.query_params.get("unit_id")
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if unit_id:
            queryset = queryset.filter(unit_id=unit_id)
        return queryset

    def get_permissions(self):
        if self.action == "destroy":
            return [IsLandlord()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        profile = getattr(self.request.user, "profile", None)
        organization = resolve_request_organization(self.request)
        if not organization:
            if self.request.user.is_authenticated:
                logger.warning(
                    "Creating maintenance request without organization context. user=%s",
                    getattr(self.request.user, "id", None),
                )
                organization = None
            else:
                raise PermissionDenied("You must belong to an organization to create records.")
        if profile and profile.role == UserProfile.ROLE_TENANT:
            if not profile.tenant_id:
                raise ValidationError(
                    {"tenant": "Tenant users must be linked to a tenant record."}
                )
            instance = serializer.save(
                tenant_id=profile.tenant_id, organization=organization
            )
        else:
            instance = serializer.save(organization=organization)

        if instance:
            try:
                property_obj = instance.unit.property if instance.unit else None
                property_name = property_obj.name if property_obj else ""
                unit_number = instance.unit.unit_number if instance.unit else ""
                landlord = organization.owner if organization else None
                tenant_name = (
                    f"{instance.tenant.first_name} {instance.tenant.last_name}".strip()
                    if instance.tenant
                    else ""
                )
                if landlord and landlord.email:
                    send_maintenance_request_submitted(
                        landlord_email=landlord.email,
                        landlord_name=landlord.get_full_name() or landlord.username,
                        tenant_name=tenant_name,
                        property_name=property_name,
                        unit_number=unit_number,
                        request_title=instance.title,
                    )
            except Exception:
                logger.exception(
                    "Failed to send maintenance request submitted email for request=%s",
                    instance.id if instance else None,
                )

    def perform_update(self, serializer):
        instance = self.get_object()
        old_status = instance.status
        updated_instance = serializer.save()
        if old_status != updated_instance.status:
            try:
                property_obj = updated_instance.unit.property if updated_instance.unit else None
                property_name = property_obj.name if property_obj else ""
                unit_number = updated_instance.unit.unit_number if updated_instance.unit else ""
                if updated_instance.tenant and updated_instance.tenant.email:
                    send_maintenance_status_update(
                        tenant_email=updated_instance.tenant.email,
                        tenant_name=f"{updated_instance.tenant.first_name} {updated_instance.tenant.last_name}".strip(),
                        request_title=updated_instance.title,
                        new_status=updated_instance.status,
                    )
            except Exception:
                logger.exception(
                    "Failed to send maintenance status update email for request=%s",
                    updated_instance.id,
                )

class NotificationViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    queryset = Notification.objects.select_related("recipient")
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_queryset(self):
        queryset = super().get_queryset()
        if not queryset:
            return queryset
        return queryset.filter(recipient=self.request.user)

    def partial_update(self, request, *args, **kwargs):
        notification = self.get_object()
        notification.is_read = bool(request.data.get("is_read", True))
        notification.save(update_fields=["is_read"])
        return Response(self.get_serializer(notification).data)

    @action(detail=False, methods=["patch"], url_path="mark-all-read")
    def mark_all_read(self, request):
        updated_count = self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({"updated": updated_count})

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        count = self.get_queryset().filter(is_read=False).count()
        return Response({"unread_count": count})


class MessageViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    queryset = Message.objects.select_related("sender", "recipient", "parent")
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        queryset = super().get_queryset()
        if not queryset:
            return queryset

        queryset = queryset.select_related(
            "sender", "recipient", "recipient_tenant", "parent"
        )
        profile = getattr(self.request.user, "profile", None)
        tenant_id = getattr(profile, "tenant_id", None)

        if self.action == "list":
            if profile and profile.role == UserProfile.ROLE_TENANT and tenant_id:
                queryset = queryset.filter(
                    Q(recipient=self.request.user) | Q(recipient_tenant_id=tenant_id)
                )
            else:
                queryset = queryset.filter(recipient=self.request.user)
        else:
            queryset = queryset.filter(
                Q(sender=self.request.user)
                | Q(recipient=self.request.user)
                | Q(recipient_tenant_id=tenant_id)
            )
        return queryset.order_by("-created_at")

    def create(self, request, *args, **kwargs):
        organization = resolve_request_organization(self.request)
        if not organization:
            return Response(
                {"detail": "No organization assigned to this user."},
                status=status.HTTP_403_FORBIDDEN,
            )

        recipient_user_id = request.data.get("recipient")
        recipient_tenant_id = request.data.get("recipient_tenant")
        subject = (request.data.get("subject") or "").strip()
        body = (request.data.get("body") or "").strip()

        if (not recipient_user_id and not recipient_tenant_id) or (
            recipient_user_id and recipient_tenant_id
        ):
            return Response(
                {
                    "recipient": "Specify exactly one of 'recipient' or 'recipient_tenant'."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not subject:
            return Response(
                {"subject": "Subject is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not body:
            return Response(
                {"body": "Message body is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        message_kwargs = {
            "sender": request.user,
            "subject": subject,
            "body": body,
            "organization": organization,
        }

        if recipient_tenant_id:
            try:
                recipient_tenant = Tenant.objects.get(
                    id=recipient_tenant_id, organization=organization
                )
            except Tenant.DoesNotExist:
                return Response(
                    {"recipient_tenant": "Recipient tenant not found in your organization."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            message_kwargs["recipient_tenant"] = recipient_tenant
        else:
            try:
                recipient = User.objects.get(id=recipient_user_id)
            except User.DoesNotExist:
                return Response(
                    {"recipient": "Recipient not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            if recipient.id == request.user.id:
                return Response(
                    {"recipient": "You cannot message yourself."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            recipient_profile = getattr(recipient, "profile", None)
            if not recipient_profile or recipient_profile.organization_id != organization.id:
                return Response(
                    {"recipient": "Recipient must be in your organization."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            message_kwargs["recipient"] = recipient

        message = Message.objects.create(**message_kwargs)
        return Response(self.get_serializer(message).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], url_path="sent")
    def sent(self, request):
        queryset = Message.objects.filter(
            sender=request.user,
            organization=resolve_request_organization(request),
        ).select_related("sender", "recipient", "recipient_tenant", "parent")
        return Response(self.get_serializer(queryset, many=True).data)

    @action(detail=False, methods=["get"], url_path="users")
    def users(self, request):
        organization = resolve_request_organization(self.request)
        if not organization:
            return Response({"users": [], "tenants": []})
        users = (
            User.objects.filter(profile__organization=organization)
            .select_related("profile")
            .order_by("first_name", "last_name", "username")
        )
        tenants = Tenant.objects.filter(organization=organization).order_by(
            "first_name", "last_name"
        )

        user_payload = [
            {
                "id": user.id,
                "name": (f"{user.first_name} {user.last_name}".strip() or user.username),
                "email": user.email,
                "type": "user",
            }
            for user in users
        ]
        tenant_payload = [
            {
                "id": tenant.id,
                "name": f"{tenant.first_name} {tenant.last_name}".strip(),
                "email": tenant.email,
                "type": "tenant",
            }
            for tenant in tenants
        ]
        return Response({"users": user_payload, "tenants": tenant_payload})

    @action(detail=True, methods=["patch"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        message = self.get_object()
        message.is_read = True
        message.save(update_fields=["is_read"])
        return Response(self.get_serializer(message).data)

    @action(detail=True, methods=["post"], url_path="reply")
    def reply(self, request, pk=None):
        original = self.get_object()
        organization = resolve_request_organization(self.request)
        if not organization:
            return Response(
                {"detail": "No organization assigned to this user."},
                status=status.HTTP_403_FORBIDDEN,
            )

        body = (request.data.get("body") or "").strip()
        subject = (
            request.data.get("subject") or f"Re: {original.subject}"
        ).strip()
        if not body:
            return Response(
                {"body": "Reply body is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        profile = getattr(request.user, "profile", None)
        tenant_id = getattr(profile, "tenant_id", None)

        recipient_user_id = None
        recipient_tenant_id = None
        if request.user.id == original.sender_id:
            if original.recipient_id is not None:
                recipient_user_id = original.recipient_id
            elif original.recipient_tenant_id is not None:
                recipient_tenant_id = original.recipient_tenant_id
            else:
                return Response(
                    {"detail": "Original message is missing a valid recipient."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        elif (
            original.recipient_id == request.user.id
            or (tenant_id and original.recipient_tenant_id == tenant_id)
        ):
            recipient_user_id = original.sender_id
        else:
            return Response(
                {"detail": "You can only reply to messages that you sent or received."},
                status=status.HTTP_403_FORBIDDEN,
            )

        reply_kwargs = {
            "sender": request.user,
            "subject": subject,
            "body": body,
            "parent": original.parent or original,
            "organization": organization,
        }

        if recipient_tenant_id:
            reply_kwargs["recipient_tenant_id"] = recipient_tenant_id
            reply_kwargs["recipient"] = None
        else:
            reply_kwargs["recipient"] = User.objects.get(id=recipient_user_id)
            reply_kwargs["recipient_tenant"] = None

        reply_message = Message.objects.create(**reply_kwargs)
        return Response(
            self.get_serializer(reply_message).data,
            status=status.HTTP_201_CREATED,
        )


class ScreeningRequestViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    queryset = ScreeningRequest.objects.select_related("tenant", "requested_by")
    serializer_class = ScreeningRequestSerializer
    http_method_names = ["get", "post", "head", "options", "patch", "put"]

    def get_permissions(self):
        landlord_only_actions = {
            "create",
            "update",
            "partial_update",
            "destroy",
            "run_screening",
            "send_consent",
        }
        if self.action in landlord_only_actions:
            return [IsLandlord()]
        return [IsAuthenticated()]

    def get_queryset(self):
        queryset = super().get_queryset()
        profile = getattr(self.request.user, "profile", None)
        if profile and profile.role == UserProfile.ROLE_TENANT:
            if not profile.tenant_id:
                return queryset.none()
            return queryset.filter(tenant_id=profile.tenant_id)
        return queryset

    def create(self, request, *args, **kwargs):
        organization = resolve_request_organization(self.request)
        if not organization:
            if request.user.is_authenticated:
                logger.warning(
                    "Creating screening request without organization context. user=%s",
                    request.user.id,
                )
                organization = None
            else:
                return Response(
                    {"detail": "No organization assigned to this user."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        tenant_id = request.data.get("tenant")
        if not tenant_id:
            return Response(
                {"tenant": "Tenant is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            tenant = Tenant.objects.get(
                id=tenant_id,
                organization=organization,
            )
        except Tenant.DoesNotExist:
            return Response(
                {"tenant": "Tenant not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        consent_token = uuid.uuid4().hex
        while ScreeningRequest.objects.filter(consent_token=consent_token).exists():
            consent_token = uuid.uuid4().hex

        screening = ScreeningRequest.objects.create(
            tenant=tenant,
            requested_by=request.user,
            organization=organization,
            status=ScreeningRequest.STATUS_PENDING,
            consent_status=ScreeningRequest.CONSENT_PENDING,
            consent_token=consent_token,
            tenant_email=(request.data.get("tenant_email") or tenant.email or "").strip(),
            notes=(request.data.get("notes") or "").strip(),
        )
        return Response(self.get_serializer(screening).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="send-consent")
    def send_consent(self, request, pk=None):
        screening = self.get_object()
        organization = resolve_request_organization(request)
        if not organization:
            return Response(
                {"detail": "No organization assigned to this user."},
                status=status.HTTP_403_FORBIDDEN,
            )
        token = screening.consent_token
        if not token:
            token = uuid.uuid4().hex
            while ScreeningRequest.objects.filter(consent_token=token).exists():
                token = uuid.uuid4().hex
            screening.consent_token = token
            screening.save(update_fields=["consent_token", "updated_at"])

        link = f"/screening/consent/{token}"
        property_name = ""
        if screening.tenant and screening.tenant.id:
            latest_lease = (
                Lease.objects.filter(
                    tenant=screening.tenant, is_active=True, organization=organization
                )
                .select_related("unit__property")
                .order_by("-start_date", "-created_at")
                .first()
            )
            if latest_lease and latest_lease.unit and latest_lease.unit.property:
                property_name = latest_lease.unit.property.name
        if not property_name and screening.tenant:
            property_name = f"Tenant {screening.tenant.first_name} {screening.tenant.last_name}".strip()

        try:
            send_screening_consent_request(
                tenant_email=screening.tenant_email or screening.tenant.email,
                tenant_name=f"{screening.tenant.first_name} {screening.tenant.last_name}".strip(),
                property_name=property_name,
                landlord_name=(
                    request.user.get_full_name() or request.user.username
                ),
                consent_link=link,
            )
        except Exception:
            logger.exception("Failed to send screening consent email for screening=%s", screening.id)
        print(f"Screening consent link for request #{screening.id}: {link}")
        return Response(
            {"consent_link": link, "consent_token": token},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="run-screening")
    def run_screening(self, request, pk=None):
        screening = self.get_object()
        if screening.consent_status != ScreeningRequest.CONSENT_CONSENTED:
            return Response(
                {"detail": "Tenant consent is required before running screening."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        screening.status = ScreeningRequest.STATUS_PROCESSING
        screening.save(update_fields=["status", "updated_at"])

        credit_score = random.randint(550, 800)
        if credit_score >= 740:
            credit_rating = ScreeningRequest.CREDIT_RATING_EXCELLENT
        elif credit_score >= 670:
            credit_rating = ScreeningRequest.CREDIT_RATING_GOOD
        elif credit_score >= 580:
            credit_rating = ScreeningRequest.CREDIT_RATING_FAIR
        else:
            credit_rating = ScreeningRequest.CREDIT_RATING_POOR

        background_check = random.choices(
            [
                ScreeningRequest.BACKGROUND_CLEAR,
                ScreeningRequest.BACKGROUND_REVIEW_NEEDED,
                ScreeningRequest.BACKGROUND_FLAGGED,
            ],
            weights=[0.7, 0.2, 0.1],
            k=1,
        )[0]
        eviction_history = random.choices(
            [
                ScreeningRequest.EVICTION_NONE_FOUND,
                ScreeningRequest.EVICTION_RECORDS_FOUND,
            ],
            weights=[0.84, 0.16],
            k=1,
        )[0]
        income_verified = random.choices([True, False], weights=[0.88, 0.12], k=1)[0]
        monthly_income = Decimal(random.randint(2800, 12500))

        if (
            credit_score > 670
            and background_check == ScreeningRequest.BACKGROUND_CLEAR
            and eviction_history == ScreeningRequest.EVICTION_NONE_FOUND
        ):
            recommendation = ScreeningRequest.RECOMMENDATION_APPROVED
        elif (
            credit_score < 580
            or eviction_history == ScreeningRequest.EVICTION_RECORDS_FOUND
        ):
            recommendation = ScreeningRequest.RECOMMENDATION_DENIED
        else:
            recommendation = ScreeningRequest.RECOMMENDATION_CONDITIONAL

        screening.status = ScreeningRequest.STATUS_COMPLETED
        screening.credit_score = credit_score
        screening.credit_rating = credit_rating
        screening.background_check = background_check
        screening.eviction_history = eviction_history
        screening.income_verified = income_verified
        screening.monthly_income = monthly_income
        screening.recommendation = recommendation
        screening.notes = (
            "Automated screening simulation completed. "
            f"Recommendation: {recommendation.replace('_', ' ')}."
        )
        screening.report_data = {
            "provider": "mock_screening_engine",
            "run_timestamp": timezone.now().isoformat(),
            "credit_score": credit_score,
            "credit_rating": credit_rating,
            "background_check": background_check,
            "eviction_history": eviction_history,
            "income_verified": income_verified,
            "monthly_income": str(monthly_income),
            "recommendation": recommendation,
        }
        screening.save()
        return Response(self.get_serializer(screening).data)


class ScreeningConsentPublicView(APIView):
    permission_classes = [AllowAny]

    def _landlord_name(self, screening):
        return screening.requested_by.get_full_name() or screening.requested_by.username

    def _property_name(self, screening):
        latest_lease = (
            Lease.objects.filter(tenant=screening.tenant, is_active=True)
            .select_related("unit__property")
            .order_by("-start_date", "-created_at")
            .first()
        )
        if latest_lease and latest_lease.unit and latest_lease.unit.property:
            return latest_lease.unit.property.name
        return ""

    def get(self, request, token):
        screening = ScreeningRequest.objects.filter(
            consent_token=token,
            consent_status=ScreeningRequest.CONSENT_PENDING,
        ).select_related("tenant", "requested_by").first()

        if not screening:
            return Response(
                {"detail": "Consent link not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "screening_id": screening.id,
                "tenant_name": f"{screening.tenant.first_name} {screening.tenant.last_name}".strip(),
                "property_name": self._property_name(screening),
                "landlord_name": self._landlord_name(screening),
                "consent_status": screening.consent_status,
            }
        )

    def post(self, request, token):
        screening = ScreeningRequest.objects.filter(
            consent_token=token,
            consent_status=ScreeningRequest.CONSENT_PENDING,
        ).select_related("tenant", "requested_by").first()

        if not screening:
            return Response(
                {"detail": "Consent link not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        consent = request.data.get("consent")
        if consent is None:
            return Response(
                {"consent": "consent is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if isinstance(consent, str):
            consent = consent.lower() in {"true", "1", "yes", "y"}
        if not isinstance(consent, bool):
            return Response(
                {"consent": "consent must be a boolean."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if consent:
            serializer = TenantConsentSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            screening.tenant_ssn_last4 = serializer.validated_data.get("ssn_last4")
            screening.tenant_dob = serializer.validated_data.get("date_of_birth")
            screening.consent_status = ScreeningRequest.CONSENT_CONSENTED
        else:
            screening.consent_status = ScreeningRequest.CONSENT_DECLINED
            screening.tenant_ssn_last4 = None
            screening.tenant_dob = None

        screening.consent_date = timezone.now()
        screening.save(
            update_fields=[
                "tenant_ssn_last4",
                "tenant_dob",
                "consent_status",
                "consent_date",
                "updated_at",
            ]
        )
        return Response(
            {
                "screening_id": screening.id,
                "consent_status": screening.consent_status,
                "consent_date": screening.consent_date,
            },
            status=status.HTTP_200_OK,
        )


class DocumentViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    queryset = Document.objects.select_related(
        "uploaded_by", "property", "unit", "tenant", "lease"
    )
    serializer_class = DocumentSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if not queryset:
            return queryset

        profile = getattr(self.request.user, "profile", None)
        if profile and profile.role == UserProfile.ROLE_TENANT:
            tenant_id = profile.tenant_id
            lease_ids = []
            if tenant_id:
                lease_ids = list(
                    Lease.objects.filter(
                        tenant_id=tenant_id,
                        organization=resolve_request_organization(self.request),
                    ).values_list("id", flat=True)
                )
            queryset = queryset.filter(
                Q(tenant_id=tenant_id) | Q(lease_id__in=lease_ids)
            )

        params = self.request.query_params
        property_id = params.get("property_id")
        unit_id = params.get("unit_id")
        tenant_id = params.get("tenant_id")
        lease_id = params.get("lease_id")
        document_type = params.get("document_type")
        is_template = params.get("is_template")

        if property_id:
            queryset = queryset.filter(property_id=property_id)
        if unit_id:
            queryset = queryset.filter(unit_id=unit_id)
        if tenant_id:
            queryset = queryset.filter(tenant_id=tenant_id)
        if lease_id:
            queryset = queryset.filter(lease_id=lease_id)
        if document_type:
            queryset = queryset.filter(document_type=document_type)
        if is_template is not None:
            normalized = str(is_template).lower()
            if normalized in {"true", "1", "yes"}:
                queryset = queryset.filter(is_template=True)
            elif normalized in {"false", "0", "no"}:
                queryset = queryset.filter(is_template=False)
        return queryset

    def get_permissions(self):
        if self.action in {"create", "update", "partial_update", "destroy"}:
            return [IsLandlord()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        organization = resolve_request_organization(self.request)
        if not organization:
            raise PermissionDenied("You must belong to an organization to create records.")
        serializer.save(organization=organization)

    @action(detail=True, methods=["get"], url_path="download")
    def download(self, request, pk=None):
        document = self.get_object()
        file_handle = document.file.open("rb")
        return FileResponse(
            file_handle,
            as_attachment=True,
            filename=document.file.name.rsplit("/", 1)[-1],
        )


class AccountingCategoryViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    queryset = AccountingCategory.objects.all()
    serializer_class = AccountingCategorySerializer
    permission_classes = [IsLandlord]

    def get_queryset(self):
        organization = resolve_request_organization(self.request)
        _ensure_chart_of_accounts(organization)
        if not organization:
            return AccountingCategory.objects.none()
        return AccountingCategory.objects.filter(
            Q(organization__isnull=True) | Q(organization=organization)
        )

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        queryset = queryset.annotate(
            _account_code_is_missing=Case(
                When(Q(account_code__isnull=True) | Q(account_code=""), then=Value(1)),
                default=Value(0),
                output_field=IntegerField(),
            )
        ).order_by("_account_code_is_missing", "account_code", "name")
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def perform_create(self, serializer):
        organization = resolve_request_organization(self.request)
        if not organization:
            raise PermissionDenied("You must belong to an organization.")
        serializer.save(organization=organization, is_system=False)

    def perform_update(self, serializer):
        instance = serializer.instance
        if instance and instance.is_system:
            raise PermissionDenied("System categories cannot be edited.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.is_system:
            raise PermissionDenied("System categories cannot be deleted.")
        instance.delete()

    @action(detail=True, methods=["get"])
    def ledger(self, request, pk=None):
        organization = resolve_request_organization(request)
        if not organization:
            return Response(
                {"detail": "No organization assigned."},
                status=status.HTTP_404_NOT_FOUND,
            )

        account = self.get_object()
        date_from = _parse_date_value(request.query_params.get("date_from"))
        date_to = _parse_date_value(request.query_params.get("date_to"))
        property_id = request.query_params.get("property_id")

        lines = _posted_line_queryset(
            organization=organization,
            account_id=account.id,
            property_id=property_id,
            date_from=date_from,
            date_to=date_to,
        ).order_by("journal_entry__entry_date", "journal_entry_id")
        rows, balance = _account_running_balance(lines)
        return Response(
            {
                "account": {
                    "id": account.id,
                    "name": account.name,
                    "account_code": account.account_code,
                },
                "entries": rows,
                "ending_balance": balance,
            }
        )


class TransactionViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    queryset = Transaction.objects.select_related(
        "category",
        "property",
        "unit",
        "tenant",
        "lease",
        "payment",
        "created_by",
    )
    serializer_class = TransactionSerializer
    permission_classes = [IsLandlord]

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params
        property_id = params.get("property")
        if property_id:
            queryset = queryset.filter(property_id=property_id)
        unit_id = params.get("unit")
        if unit_id:
            queryset = queryset.filter(unit_id=unit_id)
        tenant_id = params.get("tenant")
        if tenant_id:
            queryset = queryset.filter(tenant_id=tenant_id)
        category_id = params.get("category")
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        transaction_type = params.get("transaction_type")
        if transaction_type:
            queryset = queryset.filter(transaction_type=transaction_type)
        date_from = params.get("date_from")
        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        date_to = params.get("date_to")
        if date_to:
            queryset = queryset.filter(date__lte=date_to)
        return queryset

    def create(self, request, *args, **kwargs):
        organization = resolve_request_organization(request)
        if not organization:
            raise PermissionDenied("You must belong to an organization.")

        payload = request.data
        is_bulk = isinstance(payload, list)
        serializer = self.get_serializer(data=payload, many=is_bulk)
        serializer.is_valid(raise_exception=True)

        if is_bulk:
            rows = []
            created_txn_ids = []
            for row in serializer.validated_data:
                transaction_row = Transaction(
                    organization=organization,
                    created_by=request.user,
                    category=row.get("category"),
                    transaction_type=row.get("transaction_type"),
                    amount=row.get("amount"),
                    date=row.get("date"),
                    description=row.get("description"),
                    property=row.get("property"),
                    unit=row.get("unit"),
                    tenant=row.get("tenant"),
                    lease=row.get("lease"),
                    payment=row.get("payment"),
                    is_recurring=row.get("is_recurring", False),
                    recurring_frequency=row.get("recurring_frequency"),
                    vendor=row.get("vendor", ""),
                    reference_number=row.get("reference_number", ""),
                    receipt_document=row.get("receipt_document"),
                    notes=row.get("notes", ""),
                )
                rows.append(transaction_row)

            objs = Transaction.objects.bulk_create(rows)
            for obj in objs:
                created_txn_ids.append(obj.id)
                try:
                    journal_entry = _transaction_to_journal_entry(obj)
                    if journal_entry:
                        obj.journal_entry = journal_entry
                        obj.save(update_fields=["journal_entry"])
                except ValidationError:
                    logger.info("Skipping journal sync for transaction=%s", obj.id)
            response = self.get_serializer(
                Transaction.objects.filter(id__in=created_txn_ids), many=True
            )
            return Response(response.data, status=status.HTTP_201_CREATED)

        instance = serializer.save(organization=organization, created_by=request.user)
        try:
            journal_entry = _transaction_to_journal_entry(instance)
            if journal_entry:
                instance.journal_entry = journal_entry
                instance.save(update_fields=["journal_entry"])
        except ValidationError:
            logger.info("Skipping journal sync for transaction=%s", instance.id)
        return Response(
            self.get_serializer(instance).data,
            status=status.HTTP_201_CREATED,
        )


class JournalEntryViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    queryset = JournalEntry.objects.select_related("organization", "created_by")
    serializer_class = JournalEntrySerializer
    permission_classes = [IsLandlord]

    def get_queryset(self):
        queryset = JournalEntry.objects.filter(organization=resolve_request_organization(self.request)).order_by(
            "-entry_date", "-created_at"
        )
        params = self.request.query_params
        status_filter = params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        date_from = _parse_date_value(params.get("date_from"))
        if date_from:
            queryset = queryset.filter(entry_date__gte=date_from)
        date_to = _parse_date_value(params.get("date_to"))
        if date_to:
            queryset = queryset.filter(entry_date__lte=date_to)
        source_type = params.get("source_type")
        if source_type:
            queryset = queryset.filter(source_type=source_type)
        property_id = params.get("property_id")
        if property_id:
            queryset = queryset.filter(lines__property_id=property_id).distinct()
        return queryset.prefetch_related("lines", "lines__account", "lines__property", "lines__unit", "lines__tenant", "lines__lease")

    def create(self, request, *args, **kwargs):
        organization = resolve_request_organization(request)
        if not organization:
            return Response(
                {"detail": "No organization assigned."},
                status=status.HTTP_404_NOT_FOUND,
            )

        payload = self.get_serializer(data=request.data)
        payload.is_valid(raise_exception=True)

        lines_input = request.data.get("lines") if isinstance(request.data, dict) else []
        if not isinstance(lines_input, list) or not lines_input:
            return Response({"lines": "At least one line is required."}, status=status.HTTP_400_BAD_REQUEST)

        entry_date = _parse_date_value(payload.validated_data.get("entry_date"))
        if not entry_date:
            return Response({"entry_date": "Invalid date."}, status=status.HTTP_400_BAD_REQUEST)

        if _period_is_locked(organization, entry_date):
            return Response(
                {"detail": "Cannot post or edit entries in a locked period."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        normalized_lines = []
        for line in lines_input:
            normalized_lines.append(
                {
                    "account_id": line.get("account") or line.get("account_id"),
                    "debit_amount": line.get("debit_amount", "0.00"),
                    "credit_amount": line.get("credit_amount", "0.00"),
                    "description": line.get("description", ""),
                    "property_id": line.get("property"),
                    "unit_id": line.get("unit"),
                    "tenant_id": line.get("tenant"),
                    "lease_id": line.get("lease"),
                    "vendor": line.get("vendor", ""),
                    "reference": line.get("reference", ""),
                }
            )

        try:
            journal_entry = _create_posted_journal_entry(
                organization=organization,
                entry_date=entry_date,
                memo=(request.data.get("memo") or "").strip(),
                lines=normalized_lines,
                user=request.user,
                source_type=(request.data.get("source_type") or JournalEntry.STATUS_DRAFT).strip() or "manual",
                source_id=_coerce_int(request.data.get("source_id")),
                status=request.data.get("status", JournalEntry.STATUS_DRAFT),
            )
        except ValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            JournalEntrySerializer(journal_entry).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="post")
    def post_entry(self, request, pk=None):
        journal_entry = self.get_object()
        if journal_entry.status == JournalEntry.STATUS_POSTED:
            return Response(
                {"detail": "Entry already posted."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if journal_entry.status == JournalEntry.STATUS_VOIDED:
            return Response(
                {"detail": "Cannot post a voided entry."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if _period_is_locked(journal_entry.organization, journal_entry.entry_date):
            return Response({"detail": "Cannot post entries in a locked period."}, status=status.HTTP_400_BAD_REQUEST)

        lines = JournalEntryLine.objects.filter(journal_entry=journal_entry)
        for line in lines:
            _validate_account_can_post(line.account)
        debit_total = lines.aggregate(total=Sum("debit_amount"))["total"] or Decimal("0.00")
        credit_total = lines.aggregate(total=Sum("credit_amount"))["total"] or Decimal("0.00")
        if debit_total != credit_total:
            return Response(
                {"detail": "Journal entry is not balanced."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        journal_entry.status = JournalEntry.STATUS_POSTED
        journal_entry.posted_at = timezone.now()
        journal_entry.save(update_fields=["status", "posted_at"])
        return Response(JournalEntrySerializer(journal_entry).data)

    @action(detail=True, methods=["post"], url_path="reverse")
    def reverse_entry(self, request, pk=None):
        source_entry = self.get_object()
        if source_entry.status != JournalEntry.STATUS_POSTED:
            return Response(
                {"detail": "Only posted entries can be reversed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reversed_lines = []
        for line in source_entry.lines.all():
            reversed_lines.append(
                {
                    "account_id": line.account_id,
                    "debit_amount": line.credit_amount,
                    "credit_amount": line.debit_amount,
                    "description": f"Reversal for line {line.id}",
                    "property_id": line.property_id,
                    "unit_id": line.unit_id,
                    "tenant_id": line.tenant_id,
                    "lease_id": line.lease_id,
                    "vendor": line.vendor,
                    "reference": line.reference,
                }
            )

        reversal = _create_posted_journal_entry(
            organization=source_entry.organization,
            entry_date=date.today(),
            memo=f"Reversal of entry #{source_entry.id}",
            lines=reversed_lines,
            user=request.user,
            source_type="manual",
            source_id=source_entry.id,
            status=JournalEntry.STATUS_POSTED,
        )
        source_entry.status = JournalEntry.STATUS_REVERSED
        source_entry.reversed_by = reversal
        source_entry.save(update_fields=["status", "reversed_by"])
        return Response(JournalEntrySerializer(reversal).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="void")
    def void_entry(self, request, pk=None):
        journal_entry = self.get_object()
        if journal_entry.status != JournalEntry.STATUS_DRAFT:
            return Response(
                {"detail": "Only draft entries can be voided."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        journal_entry.status = JournalEntry.STATUS_VOIDED
        journal_entry.save(update_fields=["status"])
        return Response(JournalEntrySerializer(journal_entry).data)


class TransactionImportViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    queryset = TransactionImport.objects.all()
    serializer_class = TransactionImportSerializer
    permission_classes = [IsLandlord]
    pagination_class = _ImportPagination

    def get_queryset(self):
        organization = resolve_request_organization(self.request)
        if not organization:
            return TransactionImport.objects.none()
        return TransactionImport.objects.filter(organization=organization).order_by("-uploaded_at")

    def create(self, request, *args, **kwargs):
        organization = resolve_request_organization(request)
        if not organization:
            return Response({"detail": "No organization assigned."}, status=status.HTTP_404_NOT_FOUND)

        upload_file = request.FILES.get("file")
        if not upload_file:
            return Response({"file": "A CSV file is required."}, status=status.HTTP_400_BAD_REQUEST)

        filename = getattr(upload_file, "name", "import.csv")
        if not str(filename).lower().endswith(".csv"):
            return Response({"file": "Only CSV files are supported."}, status=status.HTTP_400_BAD_REQUEST)

        raw_text = _parse_csv_bytes(upload_file.read())
        if not raw_text:
            return Response({"file": "Unable to read CSV file."}, status=status.HTTP_400_BAD_REQUEST)

        reader = csv.DictReader(io.StringIO(raw_text))
        if not reader.fieldnames:
            return Response({"file": "CSV must contain a header row."}, status=status.HTTP_400_BAD_REQUEST)

        headers = [str(h or "").strip().lstrip("\ufeff") for h in reader.fieldnames]
        imported_rows = []
        for row in reader:
            normalized = _normalize_mapping_row(row)
            if any(v for v in normalized.values()):
                imported_rows.append(normalized)

        import_record = TransactionImport.objects.create(
            organization=organization,
            uploaded_by=request.user,
            filename=filename,
            status=TransactionImport.STATUS_PENDING,
            row_count=len(imported_rows),
            column_mapping={"headers": headers, "rows": imported_rows},
        )

        return Response(
            {
                "import": TransactionImportSerializer(import_record).data,
                "detected_headers": headers,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="confirm-mapping")
    def confirm_mapping(self, request, pk=None):
        instance = self.get_object()
        mapping_serializer = CSVColumnMappingSerializer(data=request.data)
        mapping_serializer.is_valid(raise_exception=True)

        mapping = mapping_serializer.validated_data
        organization = instance.organization

        rows = _load_import_rows(instance)
        if not rows:
            return Response({"detail": "No import rows found."}, status=status.HTTP_400_BAD_REQUEST)

        date_col = mapping["date_column"]
        description_col = mapping["description_column"]
        amount_col = mapping["amount_column"]
        reference_col = mapping.get("reference_column") or ""

        created_count = 0
        duplicate_count = 0
        skipped_count = 0
        auto_classified_count = 0
        auto_classified_ids = []

        with db_transaction.atomic():
            ImportedTransaction.objects.filter(transaction_import=instance).delete()

            for raw_row in rows:
                raw_date = raw_row.get(date_col)
                raw_description = (raw_row.get(description_col) or "").strip()
                raw_amount = raw_row.get(amount_col)
                raw_reference = (
                    (raw_row.get(reference_col) or "").strip() if reference_col else ""
                )

                parsed_date = _parse_csv_date(raw_date)
                parsed_amount = _parse_amount_value(raw_amount)
                if not raw_description:
                    logger.info(
                        "Import row skipped for import_id=%s: reason=missing_description date=%r amount=%r desc=%r",
                        instance.id,
                        raw_date,
                        raw_amount,
                        raw_description,
                    )
                    skipped_count += 1
                    continue

                if parsed_date is None:
                    logger.info(
                        "Import row skipped for import_id=%s: reason=invalid_date date=%r amount=%r desc=%r",
                        instance.id,
                        raw_date,
                        raw_amount,
                        raw_description,
                    )
                    skipped_count += 1
                    continue

                if parsed_amount is None:
                    logger.info(
                        "Import row skipped for import_id=%s: reason=invalid_amount date=%r amount=%r desc=%r",
                        instance.id,
                        raw_date,
                        raw_amount,
                        raw_description,
                    )
                    skipped_count += 1
                    continue

                logger.debug(
                    "Import row parsed for import_id=%s: date=%r amount=%r desc=%r",
                    instance.id,
                    raw_date,
                    raw_amount,
                    raw_description,
                )

                txn_hash = TransactionImport.compute_hash(
                    organization.id,
                    parsed_date,
                    parsed_amount,
                    raw_description,
                )
                duplicate = ImportedTransaction.objects.filter(
                    organization=organization,
                    transaction_hash=txn_hash,
                ).exists()
                if duplicate:
                    duplicate_count += 1

                ImportedTransaction.objects.create(
                    transaction_import=instance,
                    organization=organization,
                    date=parsed_date,
                    description=raw_description,
                    amount=parsed_amount,
                    reference=raw_reference,
                    status=ImportedTransaction.STATUS_PENDING,
                    is_duplicate=duplicate,
                    transaction_hash=txn_hash,
                )
                created_count += 1

            auto_classified_count, auto_classified_ids = apply_classification_rules(
                organization,
                ImportedTransaction.objects.filter(transaction_import=instance),
            )
            instance.status = TransactionImport.STATUS_MAPPED
            instance.column_mapping = {
                **(instance.column_mapping if isinstance(instance.column_mapping, dict) else {}),
                "confirmed_mapping": {
                    "date_column": date_col,
                    "description_column": description_col,
                    "amount_column": amount_col,
                    "reference_column": reference_col,
                },
                "auto_classified_ids": auto_classified_ids,
            }
            instance.row_count = created_count
            instance.save(update_fields=["status", "column_mapping", "row_count"])

        return Response(
            {
                "import": TransactionImportSerializer(instance).data,
                "parsed": created_count,
                "created": created_count,
                "skipped": skipped_count,
                "duplicates": duplicate_count,
                "auto_classified": auto_classified_count,
                "auto_classified_ids": auto_classified_ids,
                "status": instance.status,
            },
            status=status.HTTP_201_CREATED,
        )

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        transactions = ImportedTransaction.objects.filter(
            transaction_import=instance
        ).order_by("id")
        serializer = self.get_serializer(instance)

        if self.paginator:
            page = self.paginator.paginate_queryset(transactions, request)
            tx_data = ImportedTransactionSerializer(page, many=True).data
            pagination = self.paginator.get_paginated_response(tx_data).data
            pagination["import"] = serializer.data
            pagination["transactions"] = tx_data
            return Response(pagination)

        return Response(
            {
                "import": serializer.data,
                "transactions": ImportedTransactionSerializer(transactions, many=True).data,
            }
        )

    @action(detail=True, methods=["post"], url_path="book")
    def book(self, request, pk=None):
        instance = self.get_object()
        organization = instance.organization

        rows = ImportedTransaction.objects.filter(
            transaction_import=instance,
            status=ImportedTransaction.STATUS_APPROVED,
            journal_entry__isnull=True,
        ).select_related("category")
        if not rows.exists():
            return Response({"detail": "No approved rows to book."}, status=status.HTTP_400_BAD_REQUEST)

        cash_account = _cash_account_for_organization(organization)
        if not cash_account:
            return Response({"detail": "Cash account not configured."}, status=status.HTTP_400_BAD_REQUEST)

        booked = 0
        skipped = 0
        total = Decimal("0.00")
        skipped_rows = []

        with db_transaction.atomic():
            for row in rows:
                amount = row.amount
                if amount is None or amount == 0:
                    skipped += 1
                    skipped_rows.append(row.id)
                    continue
                if not row.category or row.category.is_header or not row.category.is_active:
                    skipped += 1
                    skipped_rows.append(row.id)
                    continue

                if amount > 0:
                    lines = [
                        {
                            "account_id": cash_account.id,
                            "debit_amount": amount,
                            "credit_amount": Decimal("0.00"),
                            "reference": row.reference,
                        },
                        {
                            "account_id": row.category.id,
                            "debit_amount": Decimal("0.00"),
                            "credit_amount": amount,
                            "reference": row.reference,
                        },
                    ]
                else:
                    abs_amount = abs(amount)
                    lines = [
                        {
                            "account_id": row.category.id,
                            "debit_amount": abs_amount,
                            "credit_amount": Decimal("0.00"),
                            "reference": row.reference,
                        },
                        {
                            "account_id": cash_account.id,
                            "debit_amount": Decimal("0.00"),
                            "credit_amount": abs_amount,
                            "reference": row.reference,
                        },
                    ]

                try:
                    journal_entry = _create_posted_journal_entry(
                        organization=organization,
                        entry_date=row.date,
                        memo=f"Import #{instance.id} row #{row.id}",
                        lines=lines,
                        user=request.user,
                        source_type="import",
                        source_id=row.id,
                        status=JournalEntry.STATUS_POSTED,
                    )
                except ValidationError:
                    skipped += 1
                    skipped_rows.append(row.id)
                    continue

                row.status = ImportedTransaction.STATUS_BOOKED
                row.journal_entry = journal_entry
                row.save(update_fields=["status", "journal_entry"])
                booked += 1
                total += row.amount

            instance.status = TransactionImport.STATUS_COMPLETED
            instance.save(update_fields=["status"])

        return Response(
            {
                "booked": booked,
                "total": _to_float(total),
                "skipped": skipped,
                "skipped_rows": skipped_rows,
            }
        )


class ImportedTransactionViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    queryset = ImportedTransaction.objects.all()
    serializer_class = ImportedTransactionSerializer
    permission_classes = [IsLandlord]

    def get_queryset(self):
        organization = resolve_request_organization(self.request)
        queryset = ImportedTransaction.objects.filter(transaction_import__organization=organization)
        if self.action == "list":
            import_id = self.request.query_params.get("import_id")
            if not import_id:
                return queryset.none()
            queryset = queryset.filter(transaction_import_id=import_id)
        return queryset.order_by("-id")

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=False, methods=["post"], url_path="bulk-approve")
    def bulk_approve(self, request):
        organization = resolve_request_organization(request)
        if not organization:
            return Response({"detail": "No organization assigned."}, status=status.HTTP_404_NOT_FOUND)

        ids = request.data.get("ids")
        category_id = request.data.get("category")
        if not ids or not isinstance(ids, list):
            return Response({"ids": "A list of transaction ids is required."}, status=status.HTTP_400_BAD_REQUEST)

        queryset = ImportedTransaction.objects.filter(
            id__in=ids,
            transaction_import__organization=organization,
        )

        category = None
        if category_id not in (None, "", 0, "0"):
            category = _resolve_chart_account(organization, account_id=category_id)
            if not category or category.is_header:
                return Response({"category": "Invalid category."}, status=status.HTTP_400_BAD_REQUEST)

        approved_count = 0
        with db_transaction.atomic():
            for row in queryset:
                if category and not row.category_id:
                    row.category = category
                row.status = ImportedTransaction.STATUS_APPROVED
                row.save(update_fields=["category", "status"])
                approved_count += 1

        return Response({"approved": approved_count})


class BankReconciliationViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    queryset = BankReconciliation.objects.all()
    serializer_class = BankReconciliationSerializer
    permission_classes = [IsLandlord]

    def get_queryset(self):
        organization = resolve_request_organization(self.request)
        if not organization:
            return BankReconciliation.objects.none()
        return BankReconciliation.objects.filter(organization=organization).order_by("-created_at")

    def _bank_account_for_reconciliation(self, reconciliation):
        if not reconciliation.account_id:
            return None
        return reconciliation.account

    def _unmatched_bank_transactions(self, reconciliation):
        account = self._bank_account_for_reconciliation(reconciliation)
        if not account:
            return ImportedTransaction.objects.none()
        matched_ids = set(
            reconciliation.matches.exclude(imported_transaction_id__isnull=True).values_list(
                "imported_transaction_id", flat=True
            )
        )
        return (
            ImportedTransaction.objects.filter(
                organization=reconciliation.organization,
                status=ImportedTransaction.STATUS_BOOKED,
                date__gte=reconciliation.start_date,
                date__lte=reconciliation.end_date,
                journal_entry__lines__account=account,
            )
            .exclude(id__in=matched_ids)
            .distinct()
            .order_by("date", "id")
        )

    def _unmatched_book_entries(self, reconciliation):
        account = self._bank_account_for_reconciliation(reconciliation)
        if not account:
            return JournalEntryLine.objects.none()
        matched_ids = set(
            reconciliation.matches.exclude(journal_entry_line_id__isnull=True).values_list(
                "journal_entry_line_id", flat=True
            )
        )
        return (
            JournalEntryLine.objects.filter(
                organization=reconciliation.organization,
                account=account,
                journal_entry__status=JournalEntry.STATUS_POSTED,
                journal_entry__entry_date__gte=reconciliation.start_date,
                journal_entry__entry_date__lte=reconciliation.end_date,
            )
            .exclude(id__in=matched_ids)
            .order_by("journal_entry__entry_date", "id")
        )

    def _book_balance(self, reconciliation):
        lines = (
            JournalEntryLine.objects.filter(
                organization=reconciliation.organization,
                account=reconciliation.account,
                journal_entry__status=JournalEntry.STATUS_POSTED,
                journal_entry__entry_date__lte=reconciliation.end_date,
            )
            .aggregate(total_debits=Sum("debit_amount"), total_credits=Sum("credit_amount"))
        )
        debits = Decimal(lines["total_debits"] or 0)
        credits = Decimal(lines["total_credits"] or 0)
        if reconciliation.account.normal_balance == AccountingCategory.NORMAL_BALANCE_CREDIT:
            return credits - debits
        return debits - credits

    def _difference(self, reconciliation):
        return Decimal(reconciliation.statement_ending_balance) - self._book_balance(reconciliation)

    def perform_create(self, serializer):
        organization = resolve_request_organization(self.request)
        if not organization:
            raise PermissionDenied("No organization assigned.")
        serializer.save(organization=organization, created_by=self.request.user)

    def create(self, request, *args, **kwargs):
        organization = resolve_request_organization(request)
        if not organization:
            return Response({"detail": "No organization assigned."}, status=status.HTTP_404_NOT_FOUND)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with db_transaction.atomic():
            reconciliation = serializer.save(
                organization=organization,
                created_by=request.user,
            )
            auto_matched = auto_match_reconciliation(reconciliation)

        data = BankReconciliationSerializer(reconciliation, context={"request": request}).data
        data["auto_matched"] = auto_matched
        return Response(data, status=status.HTTP_201_CREATED)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = ReconciliationDetailSerializer(
            instance,
            context={
                "request": request,
                "unmatched_bank_qs": self._unmatched_bank_transactions(instance),
                "unmatched_book_qs": self._unmatched_book_entries(instance),
            },
        )
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="complete")
    def complete(self, request, pk=None):
        reconciliation = self.get_object()
        if reconciliation.status == BankReconciliation.STATUS_COMPLETED:
            return Response({"detail": "Reconciliation is already completed."}, status=status.HTTP_400_BAD_REQUEST)
        difference = self._difference(reconciliation)
        if difference != 0:
            return Response(
                {
                    "detail": "Reconciliation cannot be completed because the account is out of balance.",
                    "difference": float(difference),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        reconciliation.status = BankReconciliation.STATUS_COMPLETED
        reconciliation.completed_at = timezone.now()
        reconciliation.save(update_fields=["status", "completed_at"])
        return Response(BankReconciliationSerializer(reconciliation).data)

    @action(detail=True, methods=["post"], url_path="add-match")
    def add_match(self, request, pk=None):
        reconciliation = self.get_object()
        organization = reconciliation.organization
        account = reconciliation.account
        imported_transaction_id = request.data.get("imported_transaction_id")
        journal_entry_line_id = request.data.get("journal_entry_line_id")
        if not imported_transaction_id or not journal_entry_line_id:
            return Response(
                {"detail": "Both imported_transaction_id and journal_entry_line_id are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        imported_tx = ImportedTransaction.objects.filter(
            id=imported_transaction_id,
            organization=organization,
            status=ImportedTransaction.STATUS_BOOKED,
            journal_entry__lines__account=account,
            date__gte=reconciliation.start_date,
            date__lte=reconciliation.end_date,
        ).distinct().first()
        if not imported_tx:
            return Response({"detail": "Imported transaction not found for this reconciliation."}, status=status.HTTP_404_NOT_FOUND)

        book_line = JournalEntryLine.objects.filter(
            id=journal_entry_line_id,
            organization=organization,
            account=account,
            journal_entry__status=JournalEntry.STATUS_POSTED,
            journal_entry__entry_date__gte=reconciliation.start_date,
            journal_entry__entry_date__lte=reconciliation.end_date,
        ).first()
        if not book_line:
            return Response({"detail": "Journal entry line not found for this reconciliation."}, status=status.HTTP_404_NOT_FOUND)

        if ReconciliationMatch.objects.filter(imported_transaction=imported_tx).exclude(
            reconciliation_id=reconciliation.id
        ).exists():
            return Response({"detail": "Imported transaction already matched in another reconciliation."}, status=status.HTTP_400_BAD_REQUEST)
        if ReconciliationMatch.objects.filter(
            reconciliation=reconciliation,
            imported_transaction=imported_tx,
        ).exists():
            return Response({"detail": "Imported transaction already matched in this reconciliation."}, status=status.HTTP_400_BAD_REQUEST)

        if ReconciliationMatch.objects.filter(journal_entry_line=book_line).exclude(
            reconciliation_id=reconciliation.id
        ).exists():
            return Response({"detail": "Journal entry line already matched in another reconciliation."}, status=status.HTTP_400_BAD_REQUEST)
        if ReconciliationMatch.objects.filter(
            reconciliation=reconciliation,
            journal_entry_line=book_line,
        ).exists():
            return Response({"detail": "Journal entry line already matched in this reconciliation."}, status=status.HTTP_400_BAD_REQUEST)

        match, _ = ReconciliationMatch.objects.get_or_create(
            reconciliation=reconciliation,
            imported_transaction=imported_tx,
            journal_entry_line=book_line,
            defaults={"match_type": ReconciliationMatch.MATCH_TYPE_MANUAL},
        )
        if match.match_type != ReconciliationMatch.MATCH_TYPE_MANUAL:
            match.match_type = ReconciliationMatch.MATCH_TYPE_MANUAL
            match.journal_entry_line = book_line
            match.save(update_fields=["match_type", "journal_entry_line"])

        return Response(ReconciliationMatchSerializer(match).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="remove-match")
    def remove_match(self, request, pk=None):
        reconciliation = self.get_object()
        match_id = request.data.get("match_id")
        if not match_id:
            return Response({"match_id": "Required."}, status=status.HTTP_400_BAD_REQUEST)

        match = ReconciliationMatch.objects.filter(id=match_id, reconciliation=reconciliation).first()
        if not match:
            return Response({"detail": "Match not found."}, status=status.HTTP_404_NOT_FOUND)
        match.delete()
        return Response({"removed": match_id})

    @action(detail=True, methods=["post"], url_path="exclude")
    def exclude(self, request, pk=None):
        reconciliation = self.get_object()
        organization = reconciliation.organization
        account = reconciliation.account
        imported_transaction_id = request.data.get("imported_transaction_id")
        if not imported_transaction_id:
            return Response(
                {"imported_transaction_id": "Required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        imported_tx = ImportedTransaction.objects.filter(
            id=imported_transaction_id,
            organization=organization,
            status=ImportedTransaction.STATUS_BOOKED,
            journal_entry__lines__account=account,
            date__gte=reconciliation.start_date,
            date__lte=reconciliation.end_date,
        ).distinct().first()
        if not imported_tx:
            return Response(
                {"detail": "Imported transaction not found for this reconciliation."},
                status=status.HTTP_404_NOT_FOUND,
            )

        match, created = ReconciliationMatch.objects.get_or_create(
            reconciliation=reconciliation,
            imported_transaction=imported_tx,
            defaults={"match_type": ReconciliationMatch.MATCH_TYPE_EXCLUDED},
        )
        if not created:
            match.journal_entry_line = None
            match.match_type = ReconciliationMatch.MATCH_TYPE_EXCLUDED
            match.save(update_fields=["journal_entry_line", "match_type"])

        return Response(ReconciliationMatchSerializer(match).data, status=status.HTTP_201_CREATED)


class ClassificationRuleViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    queryset = ClassificationRule.objects.all()
    serializer_class = ClassificationRuleSerializer
    permission_classes = [IsLandlord]

    def get_queryset(self):
        organization = resolve_request_organization(self.request)
        if not organization:
            return ClassificationRule.objects.none()
        return ClassificationRule.objects.filter(organization=organization).order_by("-priority", "match_value")

    def perform_create(self, serializer):
        organization = resolve_request_organization(self.request)
        if not organization:
            raise PermissionDenied("No organization assigned.")
        serializer.save(organization=organization)

    @action(detail=False, methods=["post"], url_path="create-from-transaction")
    def create_from_transaction(self, request):
        organization = resolve_request_organization(request)
        if not organization:
            return Response({"detail": "No organization assigned."}, status=status.HTTP_404_NOT_FOUND)

        imported_transaction_id = request.data.get("imported_transaction_id")
        if not imported_transaction_id:
            return Response({"imported_transaction_id": "Required."}, status=status.HTTP_400_BAD_REQUEST)

        imported_transaction = ImportedTransaction.objects.filter(
            id=imported_transaction_id,
            organization=organization,
        ).first()
        if not imported_transaction:
            return Response({"detail": "Imported transaction not found."}, status=status.HTTP_404_NOT_FOUND)
        if not imported_transaction.category_id:
            return Response(
                {"detail": "Imported transaction must have a category to create a rule."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payload = {
            "match_field": ClassificationRule.MATCH_FIELD_DESCRIPTION,
            "match_type": ClassificationRule.MATCH_TYPE_CONTAINS,
            "match_value": (imported_transaction.description or "").strip(),
            "category": imported_transaction.category_id,
            "property_link": imported_transaction.property_link_id or None,
            "priority": _coerce_int(request.data.get("priority"), 0),
            "is_active": request.data.get("is_active", True),
        }
        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        serializer.save(organization=organization)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path="test")
    def test_rules(self, request):
        organization = resolve_request_organization(request)
        if not organization:
            return Response({"detail": "No organization assigned."}, status=status.HTTP_404_NOT_FOUND)

        description = (request.data.get("description") or "").strip()
        reference = (request.data.get("reference") or "").strip()
        if not description and not reference:
            return Response({"detail": "Either description or reference is required."}, status=status.HTTP_400_BAD_REQUEST)

        rules = self.get_queryset().filter(is_active=True)
        for rule in rules:
            target = reference if rule.match_field == ClassificationRule.MATCH_FIELD_REFERENCE else description
            target = (target or "").strip().lower()
            pattern = (rule.match_value or "").strip().lower()
            if not pattern:
                continue

            if rule.match_type == ClassificationRule.MATCH_TYPE_STARTS_WITH:
                matched = target.startswith(pattern)
            elif rule.match_type == ClassificationRule.MATCH_TYPE_EXACT:
                matched = target == pattern
            else:
                matched = pattern in target

            if matched:
                return Response({"matched": True, "rule": self.get_serializer(rule).data})

        return Response({"matched": False, "rule": None}, status=status.HTTP_200_OK)


class RecordIncomeView(APIView):
    permission_classes = [IsLandlord]

    def post(self, request):
        organization = resolve_request_organization(request)
        if not organization:
            return Response({"detail": "No organization assigned."}, status=status.HTTP_404_NOT_FOUND)

        amount = _to_decimal(request.data.get("amount"))
        if amount <= 0:
            return Response({"amount": "Amount must be greater than zero."}, status=status.HTTP_400_BAD_REQUEST)

        revenue_account_id = request.data.get("revenue_account_id")
        deposit_to_account_id = request.data.get("deposit_to_account_id")
        if not revenue_account_id:
            return Response({"revenue_account_id": "Required."}, status=status.HTTP_400_BAD_REQUEST)

        event_date = _parse_date_value(request.data.get("date")) or date.today()
        property_id = _coerce_int(request.data.get("property_id"))
        description = (request.data.get("description") or "").strip()

        revenue_account = _resolve_chart_account(
            organization,
            account_id=revenue_account_id,
        )
        if not revenue_account or revenue_account.account_type != AccountingCategory.ACCOUNT_TYPE_REVENUE:
            return Response({"revenue_account_id": "Invalid revenue account."}, status=status.HTTP_400_BAD_REQUEST)

        if not deposit_to_account_id:
            deposit_to_account_id = "1020"
        deposit_account = _resolve_chart_account(
            organization,
            account_id=deposit_to_account_id,
            account_code=deposit_to_account_id,
        )
        if not deposit_account:
            return Response({"deposit_to_account_id": "Invalid deposit account."}, status=status.HTTP_400_BAD_REQUEST)

        with db_transaction.atomic():
            journal = _create_posted_journal_entry(
                organization=organization,
                entry_date=event_date,
                memo=description or "Income",
                lines=[
                    {"account_id": deposit_account.id, "debit_amount": amount, "credit_amount": Decimal("0.00"), "property_id": property_id},
                    {"account_id": revenue_account.id, "debit_amount": Decimal("0.00"), "credit_amount": amount, "property_id": property_id},
                ],
                user=request.user,
                source_type="manual",
                status=JournalEntry.STATUS_POSTED,
            )

            transaction_obj = Transaction.objects.create(
                organization=organization,
                transaction_type=Transaction.TYPE_INCOME,
                category=revenue_account,
                amount=amount,
                date=event_date,
                description=description or f"Manual income {amount}",
                property_id=property_id,
                created_by=request.user,
                journal_entry=journal,
            )

        return Response(
            {
                "journal_entry": JournalEntrySerializer(journal).data,
                "transaction": TransactionSerializer(transaction_obj).data,
            },
            status=status.HTTP_201_CREATED,
        )


class RecordExpenseView(APIView):
    permission_classes = [IsLandlord]

    def post(self, request):
        organization = resolve_request_organization(request)
        if not organization:
            return Response({"detail": "No organization assigned."}, status=status.HTTP_404_NOT_FOUND)

        amount = _to_decimal(request.data.get("amount"))
        if amount <= 0:
            return Response({"amount": "Amount must be greater than zero."}, status=status.HTTP_400_BAD_REQUEST)

        expense_account_id = request.data.get("expense_account_id")
        paid_from_account_id = request.data.get("paid_from_account_id") or "1020"
        if not expense_account_id:
            return Response({"expense_account_id": "Required."}, status=status.HTTP_400_BAD_REQUEST)

        event_date = _parse_date_value(request.data.get("date")) or date.today()
        property_id = _coerce_int(request.data.get("property_id"))
        description = (request.data.get("description") or "").strip()
        vendor = (request.data.get("vendor") or "").strip()

        expense_account = _resolve_chart_account(
            organization,
            account_id=expense_account_id,
        )
        if not expense_account or expense_account.account_type != AccountingCategory.ACCOUNT_TYPE_EXPENSE:
            return Response({"expense_account_id": "Invalid expense account."}, status=status.HTTP_400_BAD_REQUEST)

        paid_from_account = _resolve_chart_account(
            organization,
            account_id=paid_from_account_id,
            account_code=paid_from_account_id,
        )
        if not paid_from_account:
            return Response({"paid_from_account_id": "Invalid paid-from account."}, status=status.HTTP_400_BAD_REQUEST)

        with db_transaction.atomic():
            journal = _create_posted_journal_entry(
                organization=organization,
                entry_date=event_date,
                memo=description or "Expense",
                lines=[
                    {"account_id": expense_account.id, "debit_amount": amount, "credit_amount": Decimal("0.00"), "property_id": property_id},
                    {"account_id": paid_from_account.id, "debit_amount": Decimal("0.00"), "credit_amount": amount, "property_id": property_id},
                ],
                user=request.user,
                source_type="manual",
                status=JournalEntry.STATUS_POSTED,
            )
            transaction_obj = Transaction.objects.create(
                organization=organization,
                transaction_type=Transaction.TYPE_EXPENSE,
                category=expense_account,
                amount=amount,
                date=event_date,
                description=description or f"Manual expense {amount}",
                property_id=property_id,
                vendor=vendor,
                created_by=request.user,
                journal_entry=journal,
            )

        return Response(
            {
                "journal_entry": JournalEntrySerializer(journal).data,
                "transaction": TransactionSerializer(transaction_obj).data,
            },
            status=status.HTTP_201_CREATED,
        )


class RecordTransferView(APIView):
    permission_classes = [IsLandlord]

    def post(self, request):
        organization = resolve_request_organization(request)
        if not organization:
            return Response({"detail": "No organization assigned."}, status=status.HTTP_404_NOT_FOUND)

        amount = _to_decimal(request.data.get("amount"))
        if amount <= 0:
            return Response({"amount": "Amount must be greater than zero."}, status=status.HTTP_400_BAD_REQUEST)

        from_account_id = request.data.get("from_account_id")
        to_account_id = request.data.get("to_account_id")
        if not from_account_id or not to_account_id:
            return Response(
                {"detail": "Both from_account_id and to_account_id are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if str(from_account_id) == str(to_account_id):
            return Response({"detail": "From and to accounts must be different."}, status=status.HTTP_400_BAD_REQUEST)

        event_date = _parse_date_value(request.data.get("date")) or date.today()
        description = (request.data.get("description") or "").strip()

        from_account = _resolve_chart_account(organization, account_id=from_account_id)
        to_account = _resolve_chart_account(organization, account_id=to_account_id)
        if not from_account or not to_account:
            return Response({"detail": "Invalid account(s)."}, status=status.HTTP_400_BAD_REQUEST)

        journal = _create_posted_journal_entry(
            organization=organization,
            entry_date=event_date,
            memo=description or "Transfer",
            lines=[
                {"account_id": from_account.id, "debit_amount": Decimal("0.00"), "credit_amount": amount},
                {"account_id": to_account.id, "debit_amount": amount, "credit_amount": Decimal("0.00")},
            ],
            user=request.user,
            source_type="transfer",
            status=JournalEntry.STATUS_POSTED,
        )

        return Response(JournalEntrySerializer(journal).data, status=status.HTTP_201_CREATED)


class ReportingTrialBalanceView(APIView):
    permission_classes = [IsLandlord]

    def get(self, request):
        organization = resolve_request_organization(request)
        if not organization:
            return Response({"detail": "No organization assigned."}, status=status.HTTP_404_NOT_FOUND)

        as_of = _parse_date_value(request.query_params.get("as_of")) or timezone.now().date()
        property_id = request.query_params.get("property_id")
        lines = _posted_line_queryset(organization, property_id=property_id, date_to=as_of)
        rows = lines.values(
            "account_id",
            "account__account_code",
            "account__name",
            "account__account_type",
        ).annotate(
            debit_total=Coalesce(Sum("debit_amount"), Value(Decimal("0.00"))),
            credit_total=Coalesce(Sum("credit_amount"), Value(Decimal("0.00"))),
        )

        payload = []
        total_debits = Decimal("0.00")
        total_credits = Decimal("0.00")
        for row in rows:
            debit_total = row["debit_total"] or Decimal("0.00")
            credit_total = row["credit_total"] or Decimal("0.00")
            total_debits += debit_total
            total_credits += credit_total
            payload.append(
                {
                    "account_id": row["account_id"],
                    "account_code": row["account__account_code"],
                    "account_name": row["account__name"],
                    "account_type": row["account__account_type"],
                    "debit_total": _to_float(debit_total),
                    "credit_total": _to_float(credit_total),
                    "net_balance": _to_float(debit_total - credit_total),
                }
            )

        return Response(
            {
                "as_of": str(as_of),
                "property_id": property_id,
                "rows": payload,
                "totals": {
                    "total_debit": _to_float(total_debits),
                    "total_credit": _to_float(total_credits),
                    "is_balanced": total_debits == total_credits,
                },
            }
        )


class ReportingBalanceSheetView(APIView):
    permission_classes = [IsLandlord]

    def get(self, request):
        organization = resolve_request_organization(request)
        if not organization:
            return Response({"detail": "No organization assigned."}, status=status.HTTP_404_NOT_FOUND)

        as_of = _parse_date_value(request.query_params.get("as_of")) or timezone.now().date()
        property_id = request.query_params.get("property_id")
        lines = _posted_line_queryset(organization, property_id=property_id, date_to=as_of)

        by_account_type = defaultdict(lambda: [])
        for line in lines:
            account = line.account
            amount = line.debit_amount - line.credit_amount
            if account.normal_balance == AccountingCategory.NORMAL_BALANCE_CREDIT:
                amount = -amount
            by_account_type[account.account_type].append(
                {
                    "account_id": account.id,
                    "account_code": account.account_code,
                    "name": account.name,
                    "balance": _to_float(amount),
                }
            )

        for values in by_account_type.values():
            values.sort(key=lambda item: item["account_code"] or "")

        income_lines = lines.filter(account__account_type=AccountingCategory.ACCOUNT_TYPE_REVENUE)
        expense_lines = lines.filter(account__account_type=AccountingCategory.ACCOUNT_TYPE_EXPENSE)
        revenue_total = income_lines.aggregate(
            total=Coalesce(Sum("credit_amount"), Value(Decimal("0.00")))
        )["total"]
        expense_total = expense_lines.aggregate(
            total=Coalesce(Sum("debit_amount"), Value(Decimal("0.00")))
        )["total"]
        retained_earnings = (revenue_total or Decimal("0.00")) - (expense_total or Decimal("0.00"))

        assets = by_account_type.get(AccountingCategory.ACCOUNT_TYPE_ASSET, [])
        liabilities = by_account_type.get(AccountingCategory.ACCOUNT_TYPE_LIABILITY, [])
        equity = by_account_type.get(AccountingCategory.ACCOUNT_TYPE_EQUITY, [])
        equity_total = sum(Decimal(str(row["balance"])) for row in equity)
        total_assets = sum(Decimal(str(row["balance"])) for row in assets)
        total_liabilities = sum(Decimal(str(row["balance"])) for row in liabilities)
        total_equity = equity_total + retained_earnings

        return Response(
            {
                "as_of": str(as_of),
                "property_id": property_id,
                "assets": assets,
                "liabilities": liabilities,
                "equity": equity + [{"account_id": "retained_earnings", "account_code": "RE", "name": "Retained Earnings", "balance": _to_float(retained_earnings)}],
                "totals": {
                    "total_assets": _to_float(total_assets),
                    "total_liabilities": _to_float(total_liabilities),
                    "total_equity": _to_float(total_equity),
                    "retained_earnings": _to_float(retained_earnings),
                },
                "verification": {
                    "is_balanced": total_assets == (total_liabilities + total_equity),
                },
            }
        )


class ReportingGeneralLedgerView(APIView):
    permission_classes = [IsLandlord]

    def get(self, request):
        organization = resolve_request_organization(request)
        if not organization:
            return Response({"detail": "No organization assigned."}, status=status.HTTP_404_NOT_FOUND)

        account_id = _coerce_int(request.query_params.get("account_id"))
        property_id = request.query_params.get("property_id")
        date_from = _parse_date_value(request.query_params.get("date_from"))
        date_to = _parse_date_value(request.query_params.get("date_to"))

        lines = _posted_line_queryset(
            organization,
            property_id=property_id,
            date_from=date_from,
            date_to=date_to,
        ).order_by("journal_entry__entry_date", "journal_entry_id", "id")

        if account_id:
            account = AccountingCategory.objects.filter(id=account_id, is_active=True).first()
            if not account:
                return Response({"detail": "Account not found."}, status=status.HTTP_404_NOT_FOUND)
            account_lines = lines.filter(account_id=account_id)
            rows, balance = _account_running_balance(account_lines)
            return Response(
                {
                    "account": {
                        "id": account.id,
                        "name": account.name,
                        "account_code": account.account_code,
                    },
                    "rows": rows,
                    "ending_balance": _to_float(balance),
                }
            )

        grouped = {}
        for line in lines.select_related("account"):
            grouped.setdefault(line.account_id, []).append(line)

        report = []
        for account_id, account_lines in grouped.items():
            account = account_lines[0].account
            rows, balance = _account_running_balance(account_lines)
            report.append(
                {
                    "account": {
                        "id": account.id,
                        "name": account.name,
                        "account_code": account.account_code,
                    },
                    "rows": rows,
                    "ending_balance": _to_float(balance),
                }
            )

        report.sort(key=lambda row: row["account"]["account_code"] or str(row["account"]["id"]))
        return Response({"rows": report})


class AccountingPeriodViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    queryset = AccountingPeriod.objects.all()
    serializer_class = AccountingPeriodSerializer
    permission_classes = [IsLandlord]

    def get_queryset(self):
        organization = resolve_request_organization(self.request)
        if not organization:
            return AccountingPeriod.objects.none()
        return AccountingPeriod.objects.filter(organization=organization).order_by("-created_at")

    def perform_create(self, serializer):
        organization = resolve_request_organization(self.request)
        if not organization:
            raise PermissionDenied("No organization assigned.")
        serializer.save(organization=organization)

    @action(detail=True, methods=["post"], url_path="lock")
    def lock(self, request, pk=None):
        period = self.get_object()
        period.is_locked = True
        period.locked_by = request.user
        period.locked_at = timezone.now()
        period.save(update_fields=["is_locked", "locked_by", "locked_at"])
        return Response(self.get_serializer(period).data)

    @action(detail=True, methods=["post"], url_path="unlock")
    def unlock(self, request, pk=None):
        period = self.get_object()
        period.is_locked = False
        period.locked_by = None
        period.locked_at = None
        period.save(update_fields=["is_locked", "locked_by", "locked_at"])
        return Response(self.get_serializer(period).data)


class RecurringTransactionViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    queryset = RecurringTransaction.objects.all()
    serializer_class = RecurringTransactionSerializer
    permission_classes = [IsLandlord]

    def get_queryset(self):
        organization = resolve_request_organization(self.request)
        if not organization:
            return RecurringTransaction.objects.none()
        return RecurringTransaction.objects.filter(organization=organization).order_by("-created_at")

    def perform_create(self, serializer):
        organization = resolve_request_organization(self.request)
        if not organization:
            raise PermissionDenied("No organization assigned.")
        serializer.save(organization=organization, created_by=self.request.user)

    @action(detail=True, methods=["post"], url_path="run")
    def run(self, request, pk=None):
        recurring = self.get_object()
        template_lines = recurring.template_data.get("lines", [])
        if not isinstance(template_lines, list) or not template_lines:
            return Response({"detail": "No template lines defined."}, status=status.HTTP_400_BAD_REQUEST)

        event_date = date.today()
        try:
            journal_entry = _create_posted_journal_entry(
                organization=recurring.organization,
                entry_date=event_date,
                memo=recurring.name,
                lines=template_lines,
                user=request.user,
                source_type="import",
                source_id=recurring.id,
                status=JournalEntry.STATUS_POSTED,
            )
        except ValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        recurring.next_run_date = event_date + timedelta(days=30)
        recurring.save(update_fields=["next_run_date"])
        return Response({"journal_entry": JournalEntrySerializer(journal_entry).data}, status=status.HTTP_201_CREATED)

class AccountingDashboardView(APIView):
    permission_classes = [IsLandlord]

    def get(self, request):
        organization = resolve_request_organization(request)
        if not organization:
            return Response(
                {"detail": "No organization assigned."},
                status=status.HTTP_404_NOT_FOUND,
            )

        today = timezone.now().date()
        month_start = date(today.year, today.month, 1)
        ytd_start = date(today.year, 1, 1)
        property_id = request.query_params.get("property_id")

        base_transactions = Transaction.objects.filter(organization=organization)
        if property_id:
            base_transactions = base_transactions.filter(property_id=property_id)

        month_txns = base_transactions.filter(date__gte=month_start, date__lte=today)
        ytd_txns = base_transactions.filter(date__gte=ytd_start, date__lte=today)

        total_income_current = (
            month_txns.filter(transaction_type=Transaction.TYPE_INCOME).aggregate(total=Sum("amount"))[
                "total"
            ]
            or Decimal("0.00")
        )
        total_expenses_current = (
            month_txns.filter(transaction_type=Transaction.TYPE_EXPENSE).aggregate(total=Sum("amount"))[
                "total"
            ]
            or Decimal("0.00")
        )
        total_income_ytd = (
            ytd_txns.filter(transaction_type=Transaction.TYPE_INCOME).aggregate(total=Sum("amount"))[
                "total"
            ]
            or Decimal("0.00")
        )
        total_expenses_ytd = (
            ytd_txns.filter(transaction_type=Transaction.TYPE_EXPENSE).aggregate(total=Sum("amount"))[
                "total"
            ]
            or Decimal("0.00")
        )

        rent_income_category = _resolve_reporting_category(
            organization,
            "Rent Income",
            AccountingCategory.TYPE_INCOME,
        )
        paid_this_month = (
            month_txns.filter(
                transaction_type=Transaction.TYPE_INCOME,
                category=rent_income_category,
            ).aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
        )
        expected_monthly_rent = (
            Lease.objects.filter(organization=organization, is_active=True).aggregate(
                total=Sum("monthly_rent")
            )["total"]
            or Decimal("0.00")
        )
        rent_collection_rate = (
            (paid_this_month / expected_monthly_rent * Decimal("100"))
            if expected_monthly_rent > 0
            else Decimal("0.00")
        )

        total_units = Unit.objects.filter(organization=organization).count() or 0
        occupied_units = (
            Lease.objects.filter(organization=organization, is_active=True)
            .values("unit_id")
            .distinct()
            .count()
        )
        occupancy_rate = (
            (Decimal(occupied_units) / Decimal(total_units) * Decimal("100"))
            if total_units > 0
            else Decimal("0.00")
        )

        outstanding_balances = Decimal("0.00")
        for lease in Lease.objects.filter(organization=organization, is_active=True):
            lease_payment = (
                month_txns.filter(
                    lease_id=lease.id,
                    transaction_type=Transaction.TYPE_INCOME,
                    category=rent_income_category,
                ).aggregate(total=Sum("amount"))["total"]
                or Decimal("0.00")
            )
            outstanding_balances += max(Decimal("0.00"), lease.monthly_rent - lease_payment)

        trend_start = today.replace(day=1) - timedelta(days=365)
        trend = []
        for month_key, month_label in _month_labels(trend_start, today):
            year_value, month_value = month_key.split("-", 1)
            month_start_value = date(int(year_value), int(month_value), 1)
            month_end_value = _month_end(month_start_value)
            bucket = base_transactions.filter(date__gte=month_start_value, date__lte=month_end_value)
            month_income = (
                bucket.filter(transaction_type=Transaction.TYPE_INCOME).aggregate(
                    total=Sum("amount")
                )["total"]
                or Decimal("0.00")
            )
            month_expenses = (
                bucket.filter(transaction_type=Transaction.TYPE_EXPENSE).aggregate(
                    total=Sum("amount")
                )["total"]
                or Decimal("0.00")
            )
            trend.append(
                {
                    "month": month_label,
                    "income": _to_float(month_income),
                    "expenses": _to_float(month_expenses),
                }
            )

        top_expense_categories = (
            base_transactions.filter(transaction_type=Transaction.TYPE_EXPENSE)
            .values("category__name")
            .annotate(total=Coalesce(Sum("amount"), Value(Decimal("0.00"))))
            .order_by("-total")[:5]
        )

        return Response(
            {
                "total_income_current_month": _to_float(total_income_current),
                "total_expenses_current_month": _to_float(total_expenses_current),
                "noi_current_month": _to_float(total_income_current - total_expenses_current),
                "total_income_ytd": _to_float(total_income_ytd),
                "total_expenses_ytd": _to_float(total_expenses_ytd),
                "noi_ytd": _to_float(total_income_ytd - total_expenses_ytd),
                "monthly_trend": trend,
                "top_expense_categories": [
                    {"category": row["category__name"] or "Uncategorized", "total": _to_float(row["total"])}
                    for row in top_expense_categories
                ],
                "occupancy_rate": float(occupancy_rate),
                "rent_collection_rate": float(rent_collection_rate),
                "outstanding_balances": _to_float(outstanding_balances),
            }
        )


class AccountingPnLView(APIView):
    permission_classes = [IsLandlord]

    def get(self, request):
        organization = resolve_request_organization(request)
        if not organization:
            return Response(
                {"detail": "No organization assigned."},
                status=status.HTTP_404_NOT_FOUND,
            )

        property_id = request.query_params.get("property_id")
        date_from = _parse_date_value(request.query_params.get("date_from")) or date(
            timezone.now().year,
            1,
            1,
        )
        date_to = _parse_date_value(request.query_params.get("date_to")) or timezone.now().date()

        queryset = Transaction.objects.filter(
            organization=organization,
            date__gte=date_from,
            date__lte=date_to,
        )
        if property_id:
            queryset = queryset.filter(property_id=property_id)

        income_lines = (
            queryset.filter(transaction_type=Transaction.TYPE_INCOME)
            .values("category__name")
            .annotate(total=Coalesce(Sum("amount"), Value(Decimal("0.00"))))
            .order_by("category__name")
        )
        expense_lines = (
            queryset.filter(transaction_type=Transaction.TYPE_EXPENSE)
            .values("category__name")
            .annotate(total=Coalesce(Sum("amount"), Value(Decimal("0.00"))))
            .order_by("category__name")
        )

        total_income = (
            queryset.filter(transaction_type=Transaction.TYPE_INCOME).aggregate(total=Sum("amount"))[
                "total"
            ]
            or Decimal("0.00")
        )
        total_expenses = (
            queryset.filter(transaction_type=Transaction.TYPE_EXPENSE).aggregate(
                total=Sum("amount")
            )["total"]
            or Decimal("0.00")
        )

        return Response(
            {
                "property_id": property_id,
                "date_from": str(date_from),
                "date_to": str(date_to),
                "income": [
                    {
                        "category": row["category__name"] or "Uncategorized",
                        "total": _to_float(row["total"]),
                    }
                    for row in income_lines
                ],
                "expenses": [
                    {
                        "category": row["category__name"] or "Uncategorized",
                        "total": _to_float(row["total"]),
                    }
                    for row in expense_lines
                ],
                "net_income": _to_float(total_income - total_expenses),
            }
        )

class AccountingCashflowView(APIView):
    permission_classes = [IsLandlord]

    def get(self, request):
        organization = resolve_request_organization(request)
        if not organization:
            return Response(
                {"detail": "No organization assigned."},
                status=status.HTTP_404_NOT_FOUND,
            )

        today = timezone.now().date()
        start = date(today.year - 1, today.month, 1)
        queryset = Transaction.objects.filter(
            organization=organization,
            date__gte=start,
            date__lte=today,
        )

        cashflow = []
        for month_key, month_label in _month_labels(start, today):
            year_value, month_value = month_key.split("-", 1)
            bucket_start = date(int(year_value), int(month_value), 1)
            bucket_end = _month_end(bucket_start)
            bucket = queryset.filter(date__gte=bucket_start, date__lte=bucket_end)
            income = (
                bucket.filter(transaction_type=Transaction.TYPE_INCOME).aggregate(
                    total=Sum("amount")
                )["total"]
                or Decimal("0.00")
            )
            expense = (
                bucket.filter(transaction_type=Transaction.TYPE_EXPENSE).aggregate(
                    total=Sum("amount")
                )["total"]
                or Decimal("0.00")
            )
            cashflow.append(
                {
                    "month": month_label,
                    "income": _to_float(income),
                    "expense": _to_float(expense),
                    "net": _to_float(income - expense),
                }
            )

        return Response({"cashflow": cashflow})


class AccountingRentRollView(APIView):
    permission_classes = [IsLandlord]

    def get(self, request):
        organization = resolve_request_organization(request)
        if not organization:
            return Response(
                {"detail": "No organization assigned."},
                status=status.HTTP_404_NOT_FOUND,
            )

        property_id = request.query_params.get("property_id")
        rent_income_category = _resolve_reporting_category(
            organization,
            "Rent Income",
            AccountingCategory.TYPE_INCOME,
        )
        now = timezone.now().date()
        month_start = date(now.year, now.month, 1)

        leases = Lease.objects.filter(organization=organization, is_active=True).select_related(
            "tenant",
            "unit",
            "unit__property",
        )
        if property_id:
            leases = leases.filter(unit__property_id=property_id)

        rows = []
        total_expected_rent = Decimal("0.00")
        total_collected = Decimal("0.00")
        total_outstanding = Decimal("0.00")

        for lease in leases:
            monthly_rent = lease.monthly_rent or Decimal("0.00")
            total_expected_rent += monthly_rent

            collected_this_month = (
                Transaction.objects.filter(
                    organization=organization,
                    lease=lease,
                    transaction_type=Transaction.TYPE_INCOME,
                    category=rent_income_category,
                    date__gte=month_start,
                ).aggregate(total=Sum("amount"))["total"]
                or Decimal("0.00")
            )
            collected_total = (
                Transaction.objects.filter(
                    organization=organization,
                    lease=lease,
                    transaction_type=Transaction.TYPE_INCOME,
                    category=rent_income_category,
                ).aggregate(total=Sum("amount"))["total"]
                or Decimal("0.00")
            )
            total_collected += collected_this_month
            balance_due = max(Decimal("0.00"), monthly_rent - collected_this_month)
            total_outstanding += balance_due

            last_payment = (
                Transaction.objects.filter(
                    organization=organization,
                    lease=lease,
                    transaction_type=Transaction.TYPE_INCOME,
                    category=rent_income_category,
                )
                .order_by("-date", "-id")
                .first()
            )
            last_payment_date = last_payment.date if last_payment else None
            days_since_last = (now - last_payment_date).days if last_payment_date else None
            if balance_due <= Decimal("0.00"):
                status_label = "current"
            elif days_since_last is not None and days_since_last >= 30:
                status_label = "delinquent"
            else:
                status_label = "overdue"

            rows.append(
                {
                    "tenant_name": f"{lease.tenant.first_name} {lease.tenant.last_name}".strip(),
                    "property_id": lease.unit.property.id if lease.unit and lease.unit.property else None,
                    "unit_id": lease.unit.id if lease.unit else None,
                    "property_name": lease.unit.property.name if lease.unit and lease.unit.property else "",
                    "unit_number": lease.unit.unit_number if lease.unit else "",
                    "unit_name": lease.unit.unit_number if lease.unit else "",
                    "property": lease.unit.property.name if lease.unit and lease.unit.property else "",
                    "unit": lease.unit.unit_number if lease.unit else "",
                    "monthly_rent": _to_float(monthly_rent),
                    "last_payment_date": str(last_payment_date) if last_payment_date else None,
                    "days_since_last_payment": days_since_last,
                    "balance_due": _to_float(balance_due),
                    "status": status_label,
                    "collected_total": _to_float(collected_total),
                }
            )

        collection_rate = (
            (float(total_collected) / float(total_expected_rent) * 100.0)
            if total_expected_rent > 0
            else 0.0
        )

        return Response(
            {
                "rows": rows,
                "summary": {
                    "total_expected_rent": float(total_expected_rent),
                    "total_collected": float(total_collected),
                    "total_outstanding": float(total_outstanding),
                    "collection_rate": collection_rate,
                },
            }
        )


class AccountingTaxReportView(APIView):
    permission_classes = [IsLandlord]

    def get(self, request):
        organization = resolve_request_organization(request)
        if not organization:
            return Response(
                {"detail": "No organization assigned."},
                status=status.HTTP_404_NOT_FOUND,
            )

        property_id = request.query_params.get("property_id")
        try:
            year = int(request.query_params.get("year") or timezone.now().year)
        except ValueError:
            year = timezone.now().year

        queryset = Transaction.objects.filter(
            organization=organization,
            transaction_type=Transaction.TYPE_EXPENSE,
            date__year=year,
        )
        if property_id:
            queryset = queryset.filter(property_id=property_id)

        rows = queryset.order_by("date").values(
            "date",
            "description",
            "amount",
            "vendor",
            "property__name",
            "category__name",
            "category__tax_deductible",
        )

        line_items = []
        for row in rows:
            line_items.append(
                {
                    "date": row["date"].isoformat(),
                    "description": row["description"],
                    "amount": _to_float(row["amount"]),
                    "vendor": row["vendor"],
                    "property": row["property__name"],
                    "category": row["category__name"],
                    "tax_deductible": bool(row["category__tax_deductible"]),
                }
            )

        category_totals = defaultdict(Decimal)
        deductible_total = Decimal("0.00")
        for row in line_items:
            category_totals[row["category"] or "Uncategorized"] += Decimal(str(row["amount"]))
            if row["tax_deductible"]:
                deductible_total += Decimal(str(row["amount"]))

        total_expense = sum((Decimal(str(item["amount"])) for item in line_items), Decimal("0.00"))

        return Response(
            {
                "year": year,
                "property_id": property_id,
                "line_items": line_items,
                "expenses_by_category": [
                    {"category": category, "total": _to_float(total)}
                    for category, total in sorted(category_totals.items())
                ],
                "total_deductible": _to_float(deductible_total),
                "total_expenses": _to_float(total_expense),
            }
        )


class OwnerStatementViewSet(OrganizationQuerySetMixin, viewsets.ReadOnlyModelViewSet):
    queryset = OwnerStatement.objects.select_related("property", "generated_by")
    serializer_class = OwnerStatementSerializer
    permission_classes = [IsLandlord]


class GenerateOwnerStatementView(APIView):
    permission_classes = [IsLandlord]

    def post(self, request):
        organization = resolve_request_organization(request)
        if not organization:
            return Response(
                {"detail": "No organization assigned."},
                status=status.HTTP_404_NOT_FOUND,
            )

        property_id = request.data.get("property_id")
        period_start = self._parse_date(request.data.get("period_start"))
        period_end = self._parse_date(request.data.get("period_end"))
        if not property_id or not period_start or not period_end:
            return Response(
                {"detail": "property_id, period_start, and period_end are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if period_end < period_start:
            return Response(
                {"detail": "period_end must be on or after period_start."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            property_obj = Property.objects.get(id=property_id, organization=organization)
        except Property.DoesNotExist:
            return Response({"property_id": "Property not found."}, status=status.HTTP_404_NOT_FOUND)

        queryset = Transaction.objects.filter(
            organization=organization,
            property=property_obj,
            date__gte=period_start,
            date__lte=period_end,
        )

        income_by_category = (
            queryset.filter(transaction_type=Transaction.TYPE_INCOME)
            .values("category__name")
            .annotate(total=Coalesce(Sum("amount"), Value(Decimal("0.00"))))
            .order_by("category__name")
        )
        expense_by_category = (
            queryset.filter(transaction_type=Transaction.TYPE_EXPENSE)
            .values("category__name")
            .annotate(total=Coalesce(Sum("amount"), Value(Decimal("0.00"))))
            .order_by("category__name")
        )

        total_income = (
            queryset.filter(transaction_type=Transaction.TYPE_INCOME).aggregate(total=Sum("amount"))[
                "total"
            ]
            or Decimal("0.00")
        )
        total_expenses = (
            queryset.filter(transaction_type=Transaction.TYPE_EXPENSE).aggregate(total=Sum("amount"))[
                "total"
            ]
            or Decimal("0.00")
        )

        statement = OwnerStatement.objects.create(
            organization=organization,
            property=property_obj,
            period_start=period_start,
            period_end=period_end,
            total_income=total_income,
            total_expenses=total_expenses,
            net_income=total_income - total_expenses,
            generated_by=request.user,
            data={
                "income_by_category": [
                    {"category": row["category__name"], "total": _to_float(row["total"])}
                    for row in income_by_category
                ],
                "expenses_by_category": [
                    {"category": row["category__name"], "total": _to_float(row["total"])}
                    for row in expense_by_category
                ],
            },
        )
        return Response(OwnerStatementSerializer(statement).data, status=status.HTTP_201_CREATED)

    def _parse_date(self, value):
        if not value:
            return None
        try:
            return date.fromisoformat(value)
        except ValueError:
            return None

class ExpenseViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    queryset = Expense.objects.select_related("property", "unit", "receipt", "created_by")
    serializer_class = ExpenseSerializer
    permission_classes = [IsLandlord]

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params
        property_id = params.get("property_id")
        category = params.get("category")
        date_from = params.get("date_from")
        date_to = params.get("date_to")
        if property_id:
            queryset = queryset.filter(property_id=property_id)
        if category:
            queryset = queryset.filter(category=category)
        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)
        return queryset

    def perform_create(self, serializer):
        organization = resolve_request_organization(self.request)
        if not organization:
            if self.request.user.is_authenticated:
                logger.warning(
                    "Creating expense without organization context. user=%s",
                    self.request.user.id,
                )
                serializer.save(created_by=self.request.user)
                return
            raise PermissionDenied("You must belong to an organization to create records.")
        serializer.save(created_by=self.request.user, organization=organization)


class RentLedgerEntryViewSet(OrganizationQuerySetMixin, viewsets.ReadOnlyModelViewSet):
    queryset = RentLedgerEntry.objects.select_related("lease", "payment")
    serializer_class = RentLedgerEntrySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        profile = getattr(self.request.user, "profile", None)
        if profile and profile.role == UserProfile.ROLE_TENANT:
            if profile.tenant_id:
                queryset = queryset.filter(lease__tenant_id=profile.tenant_id)
            else:
                queryset = queryset.none()
        lease_id = self.request.query_params.get("lease_id")
        if lease_id:
            queryset = queryset.filter(lease_id=lease_id)
        return queryset


class LateFeeRuleViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    queryset = LateFeeRule.objects.all()
    serializer_class = LateFeeRuleSerializer
    permission_classes = [IsLandlord]


class GenerateChargesView(APIView):
    permission_classes = [IsLandlord]

    def post(self, request):
        today = timezone.now().date()
        month_label = today.strftime("%B %Y")
        charges_created = 0
        late_fees_created = 0

        organization = resolve_request_organization(request)
        for lease in (
            Lease.objects.filter(
                is_active=True,
                organization=organization,
            )
            .select_related("unit", "unit__property")
        ):
            charge_description = f"{month_label} Rent"
            existing_charge = RentLedgerEntry.objects.filter(
                lease=lease,
                entry_type=RentLedgerEntry.TYPE_CHARGE,
                description=charge_description,
                date__year=today.year,
                date__month=today.month,
            ).exists()
            if not existing_charge:
                RentLedgerEntry.objects.create(
                    lease=lease,
                    organization=organization,
                    entry_type=RentLedgerEntry.TYPE_CHARGE,
                    description=charge_description,
                    amount=lease.monthly_rent,
                    balance=Decimal("0.00"),
                    date=today,
                )
                charges_created += 1

            rule = (
                LateFeeRule.objects.filter(
                    organization=organization,
                    is_active=True,
                )
                .order_by("-created_at")
                .first()
            )
            if not rule:
                continue

            due_day = min(lease.start_date.day, 28)
            due_date = today.replace(day=due_day)
            overdue_date = due_date + timedelta(days=rule.grace_period_days)
            if today <= overdue_date:
                continue

            monthly_paid = (
                Payment.objects.filter(
                    lease=lease,
                    status=Payment.STATUS_COMPLETED,
                    organization=organization,
                    payment_date__year=today.year,
                    payment_date__month=today.month,
                ).aggregate(total=Sum("amount"))["total"]
                or Decimal("0.00")
            )
            if monthly_paid >= lease.monthly_rent:
                continue

            existing_late_fee = RentLedgerEntry.objects.filter(
                lease=lease,
                entry_type=RentLedgerEntry.TYPE_LATE_FEE,
                date__year=today.year,
                date__month=today.month,
            ).exists()
            if existing_late_fee:
                continue

            if rule.fee_type == LateFeeRule.TYPE_FLAT:
                late_fee_amount = Decimal(rule.fee_amount)
            else:
                late_fee_amount = (Decimal(lease.monthly_rent) * Decimal(rule.fee_amount)) / Decimal(
                    "100"
                )
            if rule.max_fee is not None:
                late_fee_amount = min(late_fee_amount, Decimal(rule.max_fee))

            RentLedgerEntry.objects.create(
                lease=lease,
                organization=organization,
                entry_type=RentLedgerEntry.TYPE_LATE_FEE,
                description=f"{month_label} Late Fee",
                amount=late_fee_amount,
                balance=Decimal("0.00"),
                date=today,
            )
            late_fees_created += 1

        for lease_id in Lease.objects.filter(
            organization=organization,
            is_active=True,
        ).values_list("id", flat=True):
            recalculate_lease_balances(lease_id)

        return Response(
            {
                "month": month_label,
                "charges_created": charges_created,
                "late_fees_created": late_fees_created,
            }
        )


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        organization = profile.organization
        organization_payload = None
        if organization:
            organization_payload = {
                "id": organization.id,
                "name": organization.name,
                "slug": organization.slug,
                "plan": organization.plan,
                "max_units": organization.max_units,
            }

        return Response(
            {
                "id": request.user.id,
                "username": request.user.username,
                "email": request.user.email,
                "first_name": request.user.first_name,
                "last_name": request.user.last_name,
                "role": profile.role,
                "tenant_id": profile.tenant_id,
                "is_org_admin": profile.is_org_admin,
                "organization": organization_payload,
            }
        )


class RegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        username = (request.data.get("username") or "").strip()
        email = (request.data.get("email") or "").strip()
        password = request.data.get("password") or ""
        first_name = (request.data.get("first_name") or "").strip()
        last_name = (request.data.get("last_name") or "").strip()
        role = (request.data.get("role") or UserProfile.ROLE_LANDLORD).strip().lower()
        tenant_id = request.data.get("tenant_id")

        errors = {}
        if not username:
            errors["username"] = "Username is required."
        if not email:
            errors["email"] = "Email is required."
        if not password:
            errors["password"] = "Password is required."
        if role not in {UserProfile.ROLE_LANDLORD, UserProfile.ROLE_TENANT}:
            errors["role"] = "Role must be either 'landlord' or 'tenant'."
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        logger.info("Register request received for username=%s role=%s", username, role)

        tenant = None
        if role == UserProfile.ROLE_TENANT and tenant_id:
            try:
                tenant = Tenant.objects.get(id=tenant_id)
            except Tenant.DoesNotExist:
                return Response(
                    {"tenant_id": "Tenant not found."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if User.objects.filter(username=username).exists():
            return Response(
                {"username": "Username already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(email=email).exists():
            return Response(
                {"email": "Email already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        owner_label = first_name.strip() or last_name.strip() or username
        org_name = f"{owner_label}'s Properties"

        try:
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
            )
            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.role = role
            profile.tenant = tenant
            profile.is_org_admin = role == UserProfile.ROLE_LANDLORD

            if role == UserProfile.ROLE_LANDLORD:
                organization = Organization.objects.filter(owner=user).first()
                if not organization:
                    organization = Organization.objects.create(name=org_name, owner=user)
                    logger.info(
                        "Created organization '%s' for new landlord user id=%s",
                        organization.name,
                        user.id,
                    )
                elif organization.owner_id != user.id:
                    organization.owner = user
                    organization.save(update_fields=["owner"])
                profile.organization = organization
            else:
                profile.organization = None

            profile.save(
                update_fields=["role", "tenant", "is_org_admin", "organization", "updated_at"]
            )
            logger.info(
                "Registered user id=%s role=%s org=%s",
                user.id,
                profile.role,
                profile.organization_id,
            )
        except IntegrityError:
            logger.exception("Failed to register user=%s", username)
            return Response(
                {"detail": "Unable to create user with provided details."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        organization_payload = None
        if profile.organization_id:
            organization_payload = {
                "id": profile.organization.id,
                "name": profile.organization.name,
                "slug": profile.organization.slug,
                "plan": profile.organization.plan,
                "max_units": profile.organization.max_units,
            }

        return Response(
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": profile.role,
                "tenant_id": profile.tenant_id,
                "is_org_admin": profile.is_org_admin,
                "organization": organization_payload,
            },
            status=status.HTTP_201_CREATED,
        )



