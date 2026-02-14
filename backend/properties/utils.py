from datetime import date

from django.db.models import Q
from django.utils import timezone

from .models import AccountingCategory, ClassificationRule, ImportedTransaction


def _format_currency(value):
    try:
        return f"${float(value):,.2f}"
    except (TypeError, ValueError):
        return "$0.00"


def _escape(value):
    return "" if value is None else str(value)


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




