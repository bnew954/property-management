"""
Comprehensive backend accounting tests for the Phase 1 ledger rollout.
If these tests fail against current behavior, treat the failures as
contract or implementation gaps to address in the accounting module.

Known implementation gap observed while validating against current code:
- POST /api/accounting/journal-entries/ currently raises a 500 error because
  the endpoint validates `entry_date` through `_parse_date_value()` after DRF
  converts it to a `date` object. `date.fromisoformat()` expects a string,
  so create/post lifecycle endpoints that build entries through this endpoint
  (including lock lifecycle tests that rely on this path) fail before persistence.
"""

from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from properties.models import (
    AccountingCategory,
    AccountingPeriod,
    JournalEntry,
    JournalEntryLine,
    Organization,
    Property,
    Transaction,
    UserProfile,
)
from properties.utils import seed_chart_of_accounts


def _to_decimal(value):
    try:
        return Decimal(str(value))
    except (TypeError, ValueError):
        return Decimal("0.00")


class AccountingTestBase(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.user = User.objects.create_user(
            username="landlord",
            email="landlord@acme.test",
            password="SecurePass123!",
        )
        self.organization = Organization.objects.create(
            name="Acme Property Group",
            owner=self.user,
        )
        profile, _ = UserProfile.objects.get_or_create(
            user=self.user,
        )
        profile.role = UserProfile.ROLE_LANDLORD
        profile.organization = self.organization
        profile.is_org_admin = True
        profile.save(update_fields=["role", "organization", "is_org_admin"])

        seed_chart_of_accounts(self.organization)

        self.property = Property.objects.create(
            organization=self.organization,
            name="Main Street Apt",
            address_line1="100 Main Street",
            address_line2="",
            city="Metropolis",
            state="CA",
            zip_code="90001",
            property_type=Property.PROPERTY_TYPE_RESIDENTIAL,
            description="Test property",
        )

        token = self.client.post(
            "/api/token/",
            {"username": "landlord", "password": "SecurePass123!"},
            format="json",
        )
        self.assertEqual(token.status_code, status.HTTP_200_OK, token.content)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.data['access']}")

    def get_account(self, account_code):
        return AccountingCategory.objects.get(
            organization=self.organization,
            account_code=account_code,
        )

    def get_payload_headers(self):
        return {"HTTP_AUTHORIZATION": self.client.defaults.get("HTTP_AUTHORIZATION")}


class TestRecordIncome(AccountingTestBase):
    def test_record_income_creates_posted_journal_entry(self):
        response = self.client.post(
            "/api/accounting/record-income/",
            {
                "amount": "150.00",
                "revenue_account_id": self.get_account("4100").id,
                "deposit_to_account_id": self.get_account("1020").id,
                "date": "2026-02-14",
                "property_id": self.property.id,
                "description": "Rent payment",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        payload = response.data
        journal = payload["journal_entry"]
        lines = journal["lines"]

        self.assertEqual(journal["status"], JournalEntry.STATUS_POSTED)
        self.assertEqual(len(lines), 2)
        account_ids = {line["account"] for line in lines}
        self.assertSetEqual(
            account_ids,
            {self.get_account("4100").id, self.get_account("1020").id},
        )

        journal_obj = JournalEntry.objects.get(id=journal["id"])
        self.assertEqual(journal_obj.status, JournalEntry.STATUS_POSTED)
        self.assertEqual(journal_obj.lines.count(), 2)

    def test_record_income_updates_account_balances(self):
        response = self.client.post(
            "/api/accounting/record-income/",
            {
                "amount": "200.00",
                "revenue_account_id": self.get_account("4100").id,
                "deposit_to_account_id": self.get_account("1020").id,
                "date": "2026-02-14",
                "property_id": self.property.id,
                "description": "Rent payment",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)

        tb = self.client.get(
            "/api/accounting/reports/trial-balance/",
            {"as_of": "2026-02-14"},
            format="json",
        )
        self.assertEqual(tb.status_code, status.HTTP_200_OK)

        rows = {row["account_code"]: row for row in tb.data["rows"]}
        self.assertIn("1020", rows)
        self.assertIn("4100", rows)
        self.assertEqual(_to_decimal(rows["1020"]["debit_total"]), Decimal("200.00"))
        self.assertEqual(_to_decimal(rows["1020"]["credit_total"]), Decimal("0.00"))
        self.assertEqual(_to_decimal(rows["4100"]["debit_total"]), Decimal("0.00"))
        self.assertEqual(_to_decimal(rows["4100"]["credit_total"]), Decimal("200.00"))
        self.assertEqual(
            _to_decimal(tb.data["totals"]["total_debit"]),
            _to_decimal(tb.data["totals"]["total_credit"]),
        )

    def test_record_income_rejects_zero_amount(self):
        response = self.client.post(
            "/api/accounting/record-income/",
            {
                "amount": "0.00",
                "revenue_account_id": self.get_account("4100").id,
                "date": "2026-02-14",
                "property_id": self.property.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("amount", response.data)

    def test_record_income_rejects_header_account(self):
        response = self.client.post(
            "/api/accounting/record-income/",
            {
                "amount": "100.00",
                "revenue_account_id": self.get_account("1000").id,
                "date": "2026-02-14",
                "property_id": self.property.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("revenue_account_id", response.data)


class TestRecordExpense(AccountingTestBase):
    def test_record_expense_creates_posted_journal_entry(self):
        response = self.client.post(
            "/api/accounting/record-expense/",
            {
                "amount": "120.00",
                "expense_account_id": self.get_account("5100").id,
                "paid_from_account_id": self.get_account("1020").id,
                "date": "2026-02-14",
                "property_id": self.property.id,
                "vendor": "FixIt Co",
                "description": "Repair service",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)

        journal = response.data["journal_entry"]
        self.assertEqual(journal["status"], JournalEntry.STATUS_POSTED)
        self.assertEqual(journal["lines"][0]["account"], self.get_account("5100").id)
        self.assertEqual(journal["lines"][1]["account"], self.get_account("1020").id)

    def test_record_expense_appears_in_pnl(self):
        self.client.post(
            "/api/accounting/record-expense/",
            {
                "amount": "75.00",
                "expense_account_id": self.get_account("5100").id,
                "paid_from_account_id": self.get_account("1020").id,
                "date": "2026-02-14",
                "property_id": self.property.id,
                "vendor": "FixIt Co",
            },
            format="json",
        )

        pnl = self.client.get(
            "/api/accounting/pnl/",
            {"date_from": "2026-01-01", "date_to": "2026-12-31"},
            format="json",
        )
        self.assertEqual(pnl.status_code, status.HTTP_200_OK)

        categories = {item["category"]: _to_decimal(item["total"]) for item in pnl.data["expenses"]}
        self.assertIn("Repairs & Maintenance", categories)
        self.assertEqual(categories["Repairs & Maintenance"], Decimal("75.00"))


class TestRecordTransfer(AccountingTestBase):
    def test_record_transfer_between_asset_accounts(self):
        response = self.client.post(
            "/api/accounting/record-transfer/",
            {
                "amount": "60.00",
                "from_account_id": self.get_account("1010").id,
                "to_account_id": self.get_account("1020").id,
                "date": "2026-02-14",
                "description": "Cash transfer",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        journal = response.data

        self.assertEqual(journal["status"], JournalEntry.STATUS_POSTED)
        self.assertEqual(journal["lines"][0]["account"], self.get_account("1010").id)
        self.assertEqual(journal["lines"][1]["account"], self.get_account("1020").id)

        self.assertEqual(_to_decimal(journal["lines"][0]["credit_amount"]), Decimal("60.00"))
        self.assertEqual(_to_decimal(journal["lines"][1]["debit_amount"]), Decimal("60.00"))


class TestJournalEntryLifecycle(AccountingTestBase):
    def _create_draft_entry(self, amount=Decimal("85.00"), memo="Draft JE"):
        response = self.client.post(
            "/api/accounting/journal-entries/",
            {
                "organization": self.organization.id,
                "entry_date": "2026-02-14",
                "memo": memo,
                "status": JournalEntry.STATUS_DRAFT,
                "lines": [
                    {
                        "account": self.get_account("1020").id,
                        "debit_amount": f"{amount}",
                        "credit_amount": "0.00",
                    },
                    {
                        "account": self.get_account("4100").id,
                        "debit_amount": "0.00",
                        "credit_amount": f"{amount}",
                    },
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        return response.data

    def _create_posted_entry(self, amount=Decimal("90.00"), memo="Posted JE"):
        response = self.client.post(
            "/api/accounting/journal-entries/",
            {
                "organization": self.organization.id,
                "entry_date": "2026-02-14",
                "memo": memo,
                "status": JournalEntry.STATUS_POSTED,
                "lines": [
                    {
                        "account": self.get_account("1020").id,
                        "debit_amount": f"{amount}",
                        "credit_amount": "0.00",
                    },
                    {
                        "account": self.get_account("4100").id,
                        "debit_amount": "0.00",
                        "credit_amount": f"{amount}",
                    },
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return response.data

    def test_create_draft_journal_entry(self):
        data = self._create_draft_entry()
        entry = JournalEntry.objects.get(id=data["id"])
        self.assertEqual(entry.status, JournalEntry.STATUS_DRAFT)
        self.assertEqual(entry.lines.count(), 2)

    def test_post_draft_journal_entry(self):
        draft = self._create_draft_entry()
        response = self.client.post(f"/api/accounting/journal-entries/{draft['id']}/post/", format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        posted = JournalEntry.objects.get(id=draft["id"])
        self.assertEqual(posted.status, JournalEntry.STATUS_POSTED)
        self.assertIsNotNone(posted.posted_at)

    def test_post_rejects_unbalanced_entry(self):
        # Create a draft entry directly in DB with mismatched debits and credits.
        entry = JournalEntry.objects.create(
            organization=self.organization,
            entry_date=date(2026, 2, 14),
            memo="Unbalanced JE",
            status=JournalEntry.STATUS_DRAFT,
            source_type="manual",
            created_by=self.user,
        )
        JournalEntryLine.objects.create(
            journal_entry=entry,
            organization=self.organization,
            account=self.get_account("1020"),
            debit_amount=Decimal("100.00"),
            credit_amount=Decimal("0.00"),
            description="dr",
        )
        JournalEntryLine.objects.create(
            journal_entry=entry,
            organization=self.organization,
            account=self.get_account("4100"),
            debit_amount=Decimal("0.00"),
            credit_amount=Decimal("50.00"),
            description="cr",
        )

        response = self.client.post(f"/api/accounting/journal-entries/{entry.id}/post/", format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("not balanced", response.data.get("detail", ""))

    def test_reverse_posted_journal_entry(self):
        original = self._create_posted_entry()
        response = self.client.post(
            f"/api/accounting/journal-entries/{original['id']}/reverse/",
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        reversal = JournalEntry.objects.get(id=response.data["id"])
        source_entry = JournalEntry.objects.get(id=original["id"])

        self.assertEqual(source_entry.status, JournalEntry.STATUS_REVERSED)
        self.assertEqual(reversal.status, JournalEntry.STATUS_POSTED)
        self.assertEqual(reversal.lines.count(), 2)
        source_lines = source_entry.lines.order_by("id").all()
        reversal_lines = reversal.lines.order_by("id").all()
        for source_line, reverse_line in zip(source_lines, reversal_lines):
            self.assertEqual(reverse_line.debit_amount, source_line.credit_amount)
            self.assertEqual(reverse_line.credit_amount, source_line.debit_amount)

    def test_void_draft_journal_entry(self):
        draft = self._create_draft_entry()
        response = self.client.post(
            f"/api/accounting/journal-entries/{draft['id']}/void/",
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        draft_from_db = JournalEntry.objects.get(id=draft["id"])
        self.assertEqual(draft_from_db.status, JournalEntry.STATUS_VOIDED)

    def test_void_rejects_posted_entry(self):
        posted = self._create_posted_entry()
        response = self.client.post(
            f"/api/accounting/journal-entries/{posted['id']}/void/",
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Only draft entries", str(response.data.get("detail", "")))

    def test_reverse_rejects_draft_entry(self):
        draft = self._create_draft_entry()
        response = self.client.post(
            f"/api/accounting/journal-entries/{draft['id']}/reverse/",
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("posted entries", response.data.get("detail", ""))


class TestAccountingPeriodLocking(AccountingTestBase):
    def _create_period(self, period_start=date(2026, 2, 1), period_end=date(2026, 2, 28)):
        response = self.client.post(
            "/api/accounting/periods/",
            {
                "period_start": str(period_start),
                "period_end": str(period_end),
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return response.data

    def test_create_accounting_period(self):
        period = self._create_period()
        self.assertIn("id", period)
        self.assertFalse(period["is_locked"])

    def test_lock_period(self):
        period = self._create_period()
        response = self.client.post(f"/api/accounting/periods/{period['id']}/lock/", format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_locked"])

    def test_posting_to_locked_period_rejected(self):
        # Create a draft entry inside the test period, then lock the period and block posting.
        draft = self.client.post(
            "/api/accounting/journal-entries/",
            {
                "organization": self.organization.id,
                "entry_date": "2026-02-10",
                "memo": "Draft JE in locked period",
                "status": JournalEntry.STATUS_DRAFT,
                "lines": [
                    {
                        "account": self.get_account("1020").id,
                        "debit_amount": "100.00",
                        "credit_amount": "0.00",
                    },
                    {
                        "account": self.get_account("4100").id,
                        "debit_amount": "0.00",
                        "credit_amount": "100.00",
                    },
                ],
            },
            format="json",
        )
        self.assertEqual(draft.status_code, status.HTTP_201_CREATED)

        period = self._create_period(date(2026, 2, 1), date(2026, 2, 28))
        lock_resp = self.client.post(f"/api/accounting/periods/{period['id']}/lock/", format="json")
        self.assertEqual(lock_resp.status_code, status.HTTP_200_OK)
        self.assertTrue(lock_resp.data["is_locked"])

        post_resp = self.client.post(
            f"/api/accounting/journal-entries/{draft.data['id']}/post/",
            format="json",
        )
        self.assertEqual(post_resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("locked period", post_resp.data.get("detail", ""))

    def test_unlock_period_allows_posting(self):
        draft = self.client.post(
            "/api/accounting/journal-entries/",
            {
                "organization": self.organization.id,
                "entry_date": "2026-02-11",
                "memo": "Draft JE in unlock test",
                "status": JournalEntry.STATUS_DRAFT,
                "lines": [
                    {
                        "account": self.get_account("1020").id,
                        "debit_amount": "80.00",
                        "credit_amount": "0.00",
                    },
                    {
                        "account": self.get_account("4100").id,
                        "debit_amount": "0.00",
                        "credit_amount": "80.00",
                    },
                ],
            },
            format="json",
        )
        self.assertEqual(draft.status_code, status.HTTP_201_CREATED)

        period = self._create_period(date(2026, 2, 1), date(2026, 2, 28))
        self.client.post(f"/api/accounting/periods/{period['id']}/lock/", format="json")
        self.client.post(f"/api/accounting/periods/{period['id']}/unlock/", format="json")

        post_resp = self.client.post(
            f"/api/accounting/journal-entries/{draft.data['id']}/post/",
            format="json",
        )
        self.assertEqual(post_resp.status_code, status.HTTP_200_OK)
        entry = JournalEntry.objects.get(id=draft.data["id"])
        self.assertEqual(entry.status, JournalEntry.STATUS_POSTED)
        self.assertIsNotNone(entry.posted_at)


class TestReports(AccountingTestBase):
    def test_trial_balance_zero_on_empty(self):
        response = self.client.get("/api/accounting/reports/trial-balance/", format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["rows"], [])
        self.assertEqual(_to_decimal(response.data["totals"]["total_debit"]), Decimal("0.00"))
        self.assertEqual(_to_decimal(response.data["totals"]["total_credit"]), Decimal("0.00"))

    def test_trial_balance_balances_after_entries(self):
        self.client.post(
            "/api/accounting/record-income/",
            {
                "amount": "300.00",
                "revenue_account_id": self.get_account("4100").id,
                "deposit_to_account_id": self.get_account("1020").id,
                "date": "2026-02-14",
            },
            format="json",
        )
        self.client.post(
            "/api/accounting/record-expense/",
            {
                "amount": "120.00",
                "expense_account_id": self.get_account("5100").id,
                "paid_from_account_id": self.get_account("1020").id,
                "date": "2026-02-14",
                "vendor": "Vendor",
            },
            format="json",
        )

        response = self.client.get(
            "/api/accounting/reports/trial-balance/",
            {"as_of": "2026-02-15"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            _to_decimal(response.data["totals"]["total_debit"]),
            _to_decimal(response.data["totals"]["total_credit"]),
        )
        self.assertEqual(_to_decimal(response.data["totals"]["total_debit"]), Decimal("420.00"))

    def test_balance_sheet_assets_equal_liabilities_plus_equity(self):
        self.client.post(
            "/api/accounting/record-income/",
            {
                "amount": "250.00",
                "revenue_account_id": self.get_account("4100").id,
                "deposit_to_account_id": self.get_account("1020").id,
                "date": "2026-02-14",
            },
            format="json",
        )
        self.client.post(
            "/api/accounting/record-expense/",
            {
                "amount": "50.00",
                "expense_account_id": self.get_account("5100").id,
                "paid_from_account_id": self.get_account("1020").id,
                "date": "2026-02-14",
                "vendor": "Vendor",
            },
            format="json",
        )

        response = self.client.get(
            "/api/accounting/reports/balance-sheet/",
            {"as_of": "2026-02-14"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        totals = response.data["totals"]
        total_assets = _to_decimal(totals["total_assets"])
        total_liabilities = _to_decimal(totals["total_liabilities"])
        total_equity = _to_decimal(totals["total_equity"])
        self.assertEqual(total_assets, total_liabilities + total_equity)
        self.assertTrue(response.data["verification"]["is_balanced"])

    def test_pnl_shows_revenue_and_expenses(self):
        self.client.post(
            "/api/accounting/record-income/",
            {
                "amount": "200.00",
                "revenue_account_id": self.get_account("4100").id,
                "deposit_to_account_id": self.get_account("1020").id,
                "date": "2026-02-14",
            },
            format="json",
        )
        self.client.post(
            "/api/accounting/record-expense/",
            {
                "amount": "80.00",
                "expense_account_id": self.get_account("5100").id,
                "paid_from_account_id": self.get_account("1020").id,
                "date": "2026-02-14",
                "vendor": "Vendor",
            },
            format="json",
        )

        response = self.client.get(
            "/api/accounting/pnl/",
            {"date_from": "2026-02-01", "date_to": "2026-02-28"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        income = {item["category"]: _to_decimal(item["total"]) for item in response.data["income"]}
        expense = {item["category"]: _to_decimal(item["total"]) for item in response.data["expenses"]}

        self.assertEqual(income["Rental Income"], Decimal("200.00"))
        self.assertEqual(expense["Repairs & Maintenance"], Decimal("80.00"))
        self.assertEqual(_to_decimal(response.data["net_income"]), Decimal("120.00"))

