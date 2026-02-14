from datetime import date

from django.db.models import Q
from django.utils import timezone

from .models import AccountingCategory, ClassificationRule, ImportedTransaction
from .models import JournalEntryLine, ReconciliationMatch, JournalEntry


def _format_currency(value):
    try:
        return f"${float(value):,.2f}"
    except (TypeError, ValueError):
        return "$0.00"


def _escape(value):
    return "" if value is None else str(value)


def _to_decimal(value):
    from decimal import Decimal

    if value is None:
        return Decimal("0.00")
    if isinstance(value, Decimal):
        return value
    try:
        return Decimal(str(value))
    except (TypeError, ValueError, ArithmeticError):
        from django.core.exceptions import ValidationError

        raise ValidationError("Invalid decimal value.")


def _is_period_locked(organization, target_date):
    if not organization or not target_date:
        return False

    from .models import AccountingPeriod

    return AccountingPeriod.objects.filter(
        organization=organization,
        is_locked=True,
        period_start__lte=target_date,
        period_end__gte=target_date,
    ).exists()


def _to_month_date(base_date, months):
    import calendar

    total_month = base_date.month - 1 + months
    target_year = base_date.year + (total_month // 12)
    target_month = (total_month % 12) + 1
    max_day = calendar.monthrange(target_year, target_month)[1]
    return date(target_year, target_month, min(base_date.day, max_day))


def _advance_recurring_date(base_date, frequency):
    from .models import RecurringTransaction
    from datetime import timedelta

    try:
        from dateutil.relativedelta import relativedelta  # type: ignore
        if frequency == RecurringTransaction.FREQUENCY_MONTHLY:
            return base_date + relativedelta(months=1)
        if frequency == RecurringTransaction.FREQUENCY_QUARTERLY:
            return base_date + relativedelta(months=3)
        if frequency == RecurringTransaction.FREQUENCY_ANNUALLY:
            return base_date + relativedelta(years=1)
        if frequency == RecurringTransaction.FREQUENCY_WEEKLY:
            return base_date + timedelta(days=7)
    except Exception:
        if frequency == RecurringTransaction.FREQUENCY_MONTHLY:
            return _to_month_date(base_date, 1)
        if frequency == RecurringTransaction.FREQUENCY_QUARTERLY:
            return _to_month_date(base_date, 3)
        if frequency == RecurringTransaction.FREQUENCY_ANNUALLY:
            return _to_month_date(base_date, 12)
        if frequency == RecurringTransaction.FREQUENCY_WEEKLY:
            return base_date + timedelta(days=7)

    from django.core.exceptions import ValidationError

    raise ValidationError("Invalid recurring frequency.")


def run_recurring_transaction(recurring_txn):
    from django.core.exceptions import ValidationError
    from .models import RecurringTransaction

    if not recurring_txn:
        raise ValidationError("Recurring transaction not found.")

    if not recurring_txn.is_active:
        raise ValidationError("Recurring transaction is not active.")

    today = timezone.localdate()
    if not recurring_txn.next_run_date:
        raise ValidationError("Recurring transaction has no next run date.")
    if recurring_txn.next_run_date > today:
        raise ValidationError("Recurring transaction is not due yet.")
    if recurring_txn.end_date and recurring_txn.end_date < recurring_txn.next_run_date:
        raise ValidationError("Recurring transaction schedule has ended.")

    if not recurring_txn.debit_account_id:
        raise ValidationError("Recurring transaction is missing a debit account.")
    if not recurring_txn.credit_account_id:
        raise ValidationError("Recurring transaction is missing a credit account.")

    amount = _to_decimal(recurring_txn.amount)
    if amount <= 0:
        raise ValidationError("Recurring transaction amount must be greater than 0.")

    if _is_period_locked(recurring_txn.organization, recurring_txn.next_run_date):
        raise ValidationError("Cannot create recurring journal entry in a locked accounting period.")

    entry_date = recurring_txn.next_run_date
    memo = (recurring_txn.description or recurring_txn.name).strip() or "Recurring transaction"

    lines = [
        {
            "account_id": recurring_txn.debit_account_id,
            "debit_amount": amount,
            "credit_amount": _to_decimal("0.00"),
            "property_id": recurring_txn.property_id,
            "description": "",
        },
        {
            "account_id": recurring_txn.credit_account_id,
            "debit_amount": _to_decimal("0.00"),
            "credit_amount": amount,
            "property_id": recurring_txn.property_id,
            "description": "",
        },
    ]

    from django.db import transaction as db_transaction

    with db_transaction.atomic():
        journal_entry = JournalEntry.objects.create(
            organization=recurring_txn.organization,
            entry_date=entry_date,
            memo=memo[:500],
            status=JournalEntry.STATUS_POSTED,
            source_type="recurring",
            source_id=recurring_txn.id,
            created_by=None,
            posted_at=timezone.now(),
        )
        JournalEntryLine.objects.bulk_create(
            [
                JournalEntryLine(
                    journal_entry=journal_entry,
                    organization=recurring_txn.organization,
                    account_id=line["account_id"],
                    debit_amount=line["debit_amount"],
                    credit_amount=line["credit_amount"],
                    description=line["description"],
                    property_id=line["property_id"],
                )
                for line in lines
            ]
        )
        recurring_txn.last_run_date = entry_date
        recurring_txn.next_run_date = _advance_recurring_date(entry_date, recurring_txn.frequency)
        recurring_txn.save(update_fields=["last_run_date", "next_run_date"])

    return journal_entry


def run_all_due_recurring(organization):
    from django.utils.timezone import localdate

    if not organization:
        return 0

    today = localdate()
    from .models import RecurringTransaction
    from django.core.exceptions import ValidationError

    recurrences = RecurringTransaction.objects.filter(
        organization=organization,
        is_active=True,
        next_run_date__lte=today,
    ).order_by("next_run_date", "id")

    created_count = 0
    for recurring in recurrences:
        while recurring.next_run_date <= today:
            if recurring.end_date and recurring.end_date < recurring.next_run_date:
                break
            try:
                run_recurring_transaction(recurring)
            except ValidationError:
                break
            created_count += 1

    return created_count


def generate_lease_document(lease):
    property_obj = lease.unit.property if lease.unit else None
    property_name = _escape(property_obj.name if property_obj else "")
    address_parts = [
        _escape(property_obj.address_line1 if property_obj else ""),
        _escape(property_obj.address_line2 if property_obj else ""),
        f"{_escape(property_obj.city) if property_obj else ''}, {_escape(property_obj.state) if property_obj else ''} {_escape(property_obj.zip_code) if property_obj else ''}".strip(),
    ]
    property_address = ", ".join(
        [part for part in address_parts if part and part.strip().strip(",").strip()]
    ) or "TBD"

    tenant_name = " ".join([_escape(lease.tenant.first_name), _escape(lease.tenant.last_name)]).strip() or "Tenant"
    landlord_name = "Property Management"
    if lease.organization:
        landlord_name = _escape(lease.organization.name)
    elif property_obj:
        landlord_name = _escape(getattr(property_obj, "owner", ""))

    landlord_name = landlord_name if landlord_name else "Property Management"

    start_display = lease.start_date.strftime("%B %d, %Y") if lease.start_date else ""
    end_display = lease.end_date.strftime("%B %d, %Y") if lease.end_date else ""
    generated_on = timezone.now().strftime("%B %d, %Y")
    today = date.today().strftime("%B %d, %Y")

    return f"""<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Lease Agreement - {tenant_name}</title>
    <style>
      body {{ font-family: Arial, Helvetica, sans-serif; color: #111827; line-height: 1.45; }}
      .header {{ margin-bottom: 20px; }}
      .title {{ font-size: 24px; font-weight: 700; margin-bottom: 4px; }}
      .meta {{ color: #4b5563; }}
      h2 {{ font-size: 16px; margin-top: 22px; margin-bottom: 8px; }}
      p {{ margin: 0 0 10px 0; }}
      .section {{ margin-top: 16px; }}
      .row {{ margin-bottom: 6px; }}
      .label {{ font-weight: 700; }}
      ul {{ margin-top: 8px; }}
      li {{ margin-bottom: 6px; }}
    </style>
  </head>
  <body>
    <div class="header">
      <div class="title">Residential Lease Agreement</div>
      <div class="meta">Generated {generated_on}</div>
      <div class="meta">Generated for: {tenant_name} (Tenant)</div>
      <div class="meta">Landlord/Management: {landlord_name}</div>
      <div class="meta">Property: {property_name}</div>
      <div class="meta">Unit: { _escape(lease.unit.unit_number if lease.unit else "") }</div>
      <div class="meta">Address: {property_address}</div>
    </div>

    <div class="section">
      <h2>1) Lease Term</h2>
      <p>
        This lease begins on <strong>{start_display}</strong> and ends on <strong>{end_display}</strong>, subject to renewal by written notice.
      </p>
    </div>

    <div class="section">
      <h2>2) Rent</h2>
      <p>
        Tenant agrees to pay monthly rent of <strong>{_format_currency(lease.monthly_rent)}</strong> due on the 1st day of each month.
        Rent is payable to the landlord's payment address as specified by management.
      </p>
      <p>
        Late Fee: A late fee may be charged for late rent as permitted by law and lease terms, including accrued rent and any collection costs.
      </p>
    </div>

    <div class="section">
      <h2>3) Deposit</h2>
      <p>
        Security deposit is <strong>{_format_currency(lease.security_deposit)}</strong>. The deposit may be applied to unpaid rent, damages beyond normal wear and tear,
        and restoration of unit condition at lease termination.
      </p>
    </div>

    <div class="section">
      <h2>4) Tenant Responsibilities</h2>
      <ul>
        <li>Keep the unit clean and in good condition.</li>
        <li>Report maintenance issues promptly to landlord.</li>
        <li>Follow all property rules and community standards.</li>
      </ul>
    </div>

    <div class="section">
      <h2>5) Maintenance</h2>
      <p>
        Tenant must maintain safe use of premises and notify landlord of necessary repairs. Landlord/management is responsible for
        major structural repairs and systems outside normal tenant use.
      </p>
    </div>

    <div class="section">
      <h2>6) Utilities and Services</h2>
      <p>
        Tenant is responsible for utilities listed in the move-in paperwork. All applicable utility charges must be paid on time and in full.
      </p>
    </div>

    <div class="section">
      <h2>7) Termination</h2>
      <p>
        Either party may terminate with written notice as required by local law and this lease terms. Tenant must leave the unit
        in good condition and return all keys upon termination.
      </p>
    </div>

    <div class="section">
      <h2>8) Governing Terms</h2>
      <p>
        By signing, parties acknowledge that they have reviewed and accept this Lease Agreement and all clauses above, including rent
        obligations, late fees, and maintenance responsibilities. Generated on {today}.
      </p>
    </div>
  </body>
</html>"""


def seed_chart_of_accounts(organization):
    if not organization:
        return []

    def _normalize_chart_category_type(account_type):
        return (
            AccountingCategory.TYPE_INCOME
            if account_type == AccountingCategory.ACCOUNT_TYPE_REVENUE
            else AccountingCategory.TYPE_EXPENSE
        )

    chart_definition = [
        {
            "account_code": "1000",
            "name": "Assets",
            "account_type": AccountingCategory.ACCOUNT_TYPE_ASSET,
            "normal_balance": AccountingCategory.NORMAL_BALANCE_DEBIT,
            "is_header": True,
            "children": [
                {"account_code": "1010", "name": "Cash on Hand", "account_type": AccountingCategory.ACCOUNT_TYPE_ASSET},
                {"account_code": "1020", "name": "Cash in Bank", "account_type": AccountingCategory.ACCOUNT_TYPE_ASSET},
                {"account_code": "1100", "name": "Accounts Receivable", "account_type": AccountingCategory.ACCOUNT_TYPE_ASSET},
                {"account_code": "1200", "name": "Security Deposits Held", "account_type": AccountingCategory.ACCOUNT_TYPE_ASSET},
                {
                    "account_code": "1500",
                    "name": "Fixed Assets",
                    "account_type": AccountingCategory.ACCOUNT_TYPE_ASSET,
                    "is_header": True,
                    "children": [
                        {"account_code": "1510", "name": "Buildings", "account_type": AccountingCategory.ACCOUNT_TYPE_ASSET},
                        {"account_code": "1520", "name": "Land", "account_type": AccountingCategory.ACCOUNT_TYPE_ASSET},
                        {
                            "account_code": "1530",
                            "name": "Accumulated Depreciation",
                            "account_type": AccountingCategory.ACCOUNT_TYPE_ASSET,
                            "normal_balance": AccountingCategory.NORMAL_BALANCE_CREDIT,
                        },
                    ],
                },
            ],
        },
        {
            "account_code": "2000",
            "name": "Liabilities",
            "account_type": AccountingCategory.ACCOUNT_TYPE_LIABILITY,
            "normal_balance": AccountingCategory.NORMAL_BALANCE_CREDIT,
            "is_header": True,
            "children": [
                {"account_code": "2010", "name": "Accounts Payable", "account_type": AccountingCategory.ACCOUNT_TYPE_LIABILITY},
                {"account_code": "2100", "name": "Security Deposits Liability", "account_type": AccountingCategory.ACCOUNT_TYPE_LIABILITY},
                {"account_code": "2200", "name": "Prepaid Rent", "account_type": AccountingCategory.ACCOUNT_TYPE_LIABILITY},
                {"account_code": "2500", "name": "Mortgage Payable", "account_type": AccountingCategory.ACCOUNT_TYPE_LIABILITY},
            ],
        },
        {
            "account_code": "3000",
            "name": "Equity",
            "account_type": AccountingCategory.ACCOUNT_TYPE_EQUITY,
            "normal_balance": AccountingCategory.NORMAL_BALANCE_CREDIT,
            "is_header": True,
            "children": [
                {"account_code": "3010", "name": "Owner's Equity", "account_type": AccountingCategory.ACCOUNT_TYPE_EQUITY},
                {"account_code": "3020", "name": "Retained Earnings", "account_type": AccountingCategory.ACCOUNT_TYPE_EQUITY},
            ],
        },
        {
            "account_code": "4000",
            "name": "Revenue",
            "account_type": AccountingCategory.ACCOUNT_TYPE_REVENUE,
            "normal_balance": AccountingCategory.NORMAL_BALANCE_CREDIT,
            "is_header": True,
            "children": [
                {
                    "account_code": "4100",
                    "name": "Rental Income",
                    "account_type": AccountingCategory.ACCOUNT_TYPE_REVENUE,
                    "tax_category": "rental_income",
                },
                {
                    "account_code": "4200",
                    "name": "Late Fee Income",
                    "account_type": AccountingCategory.ACCOUNT_TYPE_REVENUE,
                    "tax_category": "other_income",
                },
                {
                    "account_code": "4300",
                    "name": "Application Fee Income",
                    "account_type": AccountingCategory.ACCOUNT_TYPE_REVENUE,
                    "tax_category": "other_income",
                },
                {
                    "account_code": "4900",
                    "name": "Other Income",
                    "account_type": AccountingCategory.ACCOUNT_TYPE_REVENUE,
                    "tax_category": "other_income",
                },
            ],
        },
        {
            "account_code": "5000",
            "name": "Expenses",
            "account_type": AccountingCategory.ACCOUNT_TYPE_EXPENSE,
            "normal_balance": AccountingCategory.NORMAL_BALANCE_DEBIT,
            "is_header": True,
            "children": [
                {"account_code": "5100", "name": "Repairs & Maintenance", "account_type": AccountingCategory.ACCOUNT_TYPE_EXPENSE, "tax_category": "repairs"},
                {"account_code": "5200", "name": "Insurance", "account_type": AccountingCategory.ACCOUNT_TYPE_EXPENSE, "tax_category": "insurance"},
                {"account_code": "5300", "name": "Property Taxes", "account_type": AccountingCategory.ACCOUNT_TYPE_EXPENSE, "tax_category": "taxes"},
                {"account_code": "5400", "name": "Utilities", "account_type": AccountingCategory.ACCOUNT_TYPE_EXPENSE, "tax_category": "utilities"},
                {"account_code": "5500", "name": "Management Fees", "account_type": AccountingCategory.ACCOUNT_TYPE_EXPENSE, "tax_category": "management_fees"},
                {"account_code": "5600", "name": "Legal & Professional", "account_type": AccountingCategory.ACCOUNT_TYPE_EXPENSE, "tax_category": "legal_professional"},
                {"account_code": "5700", "name": "Advertising", "account_type": AccountingCategory.ACCOUNT_TYPE_EXPENSE, "tax_category": "advertising"},
                {"account_code": "5800", "name": "Supplies", "account_type": AccountingCategory.ACCOUNT_TYPE_EXPENSE, "tax_category": "supplies"},
                {"account_code": "5900", "name": "Depreciation", "account_type": AccountingCategory.ACCOUNT_TYPE_EXPENSE, "tax_category": "depreciation"},
                {"account_code": "5950", "name": "Mortgage Interest", "account_type": AccountingCategory.ACCOUNT_TYPE_EXPENSE, "tax_category": "mortgage_interest"},
                {"account_code": "5990", "name": "Other Expenses", "account_type": AccountingCategory.ACCOUNT_TYPE_EXPENSE, "tax_category": "other_expense"},
            ],
        },
    ]

    account_map = {}
    parent_links = []

    def _normalize_account_fields(payload):
        code = str(payload.get("account_code", "")).strip()
        if not code:
            return None

        return {
            "organization": organization,
            "name": payload["name"],
            "account_code": code,
            "account_type": payload["account_type"],
            "normal_balance": payload.get(
                "normal_balance", AccountingCategory.NORMAL_BALANCE_DEBIT
            ),
            "is_header": payload.get("is_header", False),
            "is_system": True,
            "is_active": True,
            "tax_deductible": False,
            "tax_category": payload.get("tax_category", ""),
            "description": "Default chart account",
            "category_type": _normalize_chart_category_type(payload["account_type"]),
        }

    def _ensure_account(payload):
        fields = _normalize_account_fields(payload)
        if not fields:
            return None
        code = fields["account_code"]

        account = AccountingCategory.objects.filter(
            organization=organization,
            account_code=code,
        ).order_by("id").first()
        if not account:
            account = AccountingCategory.objects.filter(
                organization=organization,
                name=fields["name"],
            ).filter(
                Q(account_code__isnull=True) | Q(account_code="")
            ).order_by("id").first()
            if not account:
                account = AccountingCategory.objects.create(**fields)

        changed = False
        for key, value in fields.items():
            if getattr(account, key) != value:
                setattr(account, key, value)
                changed = True

        if changed:
            account.save(update_fields=list(fields.keys()))

        account_map[code] = account
        return account

    for entry in chart_definition:
        def _walk(entry_payload, parent_code=None):
            payload = dict(entry_payload)
            account = _ensure_account(payload)
            if account is None:
                return
            account_code = str(payload["account_code"]).strip()
            parent_links.append((account_code, parent_code))
            children = payload.get("children", [])
            for child in children:
                _walk(child, parent_code=account_code)
        _walk(entry)

    for child_code, parent_code in parent_links:
        if not child_code:
            continue
        account = account_map.get(child_code)
        if not account:
            continue
        if parent_code:
            parent = account_map.get(parent_code)
            if parent and account.parent_account_id != parent.id:
                account.parent_account = parent
                account.save(update_fields=["parent_account"])
        elif account.parent_account_id is not None:
            account.parent_account = None
            account.save(update_fields=["parent_account"])

    return list(
        AccountingCategory.objects.filter(organization=organization).values_list(
            "account_code",
            flat=True,
        )
    )


def apply_classification_rules(organization, imported_transactions_queryset):
    if not organization:
        return 0, []

    rules = ClassificationRule.objects.filter(
        organization=organization,
        is_active=True,
    ).order_by("-priority", "match_value")
    if not rules.exists():
        return 0, []

    queryset = imported_transactions_queryset.filter(
        organization=organization,
        status=ImportedTransaction.STATUS_PENDING,
        category__isnull=True,
    )
    if not queryset.exists():
        return 0, []

    auto_classified_count = 0
    auto_classified_ids = []

    for transaction in queryset:
        description = (transaction.description or "").strip().lower()
        reference = (transaction.reference or "").strip().lower()
        if not description and not reference:
            continue

        for rule in rules:
            if rule.match_field == ClassificationRule.MATCH_FIELD_REFERENCE:
                target = reference
            else:
                target = description

            if not target:
                continue

            needle = (rule.match_value or "").strip().lower()
            if not needle:
                continue

            if rule.match_type == ClassificationRule.MATCH_TYPE_STARTS_WITH:
                matched = target.startswith(needle)
            elif rule.match_type == ClassificationRule.MATCH_TYPE_EXACT:
                matched = target == needle
            else:
                matched = needle in target

            if matched:
                transaction.category = rule.category
                if rule.property_link_id:
                    transaction.property_link = rule.property_link
                transaction.save(update_fields=["category", "property_link"])
                auto_classified_ids.append(transaction.id)
                auto_classified_count += 1
                break

    return auto_classified_count, auto_classified_ids


def auto_match_reconciliation(reconciliation):
    if not reconciliation:
        return 0

    organization = reconciliation.organization
    if not organization:
        return 0

    if not reconciliation.account_id:
        return 0

    bank_account = reconciliation.account

    matched_import_ids = set(
        ReconciliationMatch.objects.exclude(imported_transaction_id__isnull=True)
        .values_list("imported_transaction_id", flat=True)
    )
    matched_line_ids = set(
        ReconciliationMatch.objects.exclude(journal_entry_line_id__isnull=True)
        .values_list("journal_entry_line_id", flat=True)
    )

    bank_transactions = list(
        ImportedTransaction.objects.filter(
            organization=organization,
            status=ImportedTransaction.STATUS_BOOKED,
            journal_entry__lines__account=bank_account,
            date__gte=reconciliation.start_date,
            date__lte=reconciliation.end_date,
        )
        .exclude(id__in=matched_import_ids)
        .select_related("journal_entry")
        .order_by("date", "id")
        .distinct()
    )

    if not bank_transactions:
        return 0

    book_lines = list(
        JournalEntryLine.objects.filter(
            organization=organization,
            account=bank_account,
            journal_entry__status=JournalEntry.STATUS_POSTED,
            journal_entry__entry_date__gte=reconciliation.start_date,
            journal_entry__entry_date__lte=reconciliation.end_date,
        )
        .exclude(id__in=matched_line_ids)
        .select_related("journal_entry", "account")
        .order_by("journal_entry__entry_date", "id")
    )

    unmatched_lines = {}
    for line in book_lines:
        key = (line.journal_entry.entry_date, _bank_line_effect(line))
        unmatched_lines.setdefault(key, []).append(line)
    matched_count = 0

    for transaction in bank_transactions:
        key = (transaction.date, transaction.amount)
        bucket = unmatched_lines.get(key, [])
        matched_line = bucket.pop(0) if bucket else None
        if not matched_line:
            continue
        unmatched_lines[key] = bucket
        ReconciliationMatch.objects.create(
            reconciliation=reconciliation,
            imported_transaction=transaction,
            journal_entry_line=matched_line,
            match_type=ReconciliationMatch.MATCH_TYPE_AUTO,
        )
        matched_count += 1

    return matched_count


def _bank_line_effect(line):
    if line.account.normal_balance == AccountingCategory.NORMAL_BALANCE_CREDIT:
        return line.credit_amount - line.debit_amount
    return line.debit_amount - line.credit_amount




