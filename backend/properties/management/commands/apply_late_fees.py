from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db.models import Sum
from django.utils import timezone

from properties.models import AccountingCategory, Lease, LateFeeRule, Organization, Payment, Transaction


def _first_of_month(target):
    return target.replace(day=1)


def _month_end(target):
    if target.month == 12:
        return target.replace(year=target.year + 1, month=1, day=1) - timedelta(days=1)
    return target.replace(month=target.month + 1, day=1) - timedelta(days=1)


def _parse_amount(rule, lease):
    if rule.fee_type == LateFeeRule.TYPE_FLAT:
        return Decimal(rule.amount)
    percentage_fee = (Decimal(lease.monthly_rent) * Decimal(rule.amount)) / Decimal("100")
    if rule.max_fee is not None:
        percentage_fee = min(percentage_fee, Decimal(rule.max_fee))
    return percentage_fee


def _resolve_late_fee_category(organization):
    if organization:
        category = AccountingCategory.objects.filter(
            organization=organization,
            name="Late Fees",
            category_type=AccountingCategory.TYPE_EXPENSE,
        ).first()
        if category:
            return category

    return AccountingCategory.objects.filter(
        name="Late Fees",
        category_type=AccountingCategory.TYPE_EXPENSE,
        organization__isnull=True,
    ).first()


class Command(BaseCommand):
    help = "Apply late fees for overdue active leases."

    def handle(self, *args, **options):
        now = timezone.now().date()
        month_start = _first_of_month(now)
        month_end = _month_end(month_start)
        summary = []

        for organization in Organization.objects.all():
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

            category = _resolve_late_fee_category(organization)
            created_count = 0

            for lease in Lease.objects.filter(is_active=True, organization=organization).select_related(
                "unit"
            ):
                unit = lease.unit
                if not unit:
                    continue

                due_day = min(lease.start_date.day, 28)
                due_date = now.replace(day=due_day)
                if now <= due_date + timedelta(days=rule.grace_period_days):
                    continue

                paid_this_month = (
                    Payment.objects.filter(
                        lease=lease,
                        organization=organization,
                        status=Payment.STATUS_COMPLETED,
                        payment_date__gte=month_start,
                        payment_date__lte=month_end,
                    ).aggregate(sum=Sum("amount"))["sum"]
                    or Decimal("0.00")
                )
                if paid_this_month >= lease.monthly_rent:
                    continue

                already_applied = Transaction.objects.filter(
                    organization=organization,
                    lease=lease,
                    transaction_type=Transaction.TYPE_EXPENSE,
                    category=category,
                    date__gte=month_start,
                    date__lte=month_end,
                ).exists()
                if already_applied:
                    continue

                amount = _parse_amount(rule, lease)
                if amount <= 0:
                    continue

                Transaction.objects.create(
                    organization=organization,
                    transaction_type=Transaction.TYPE_EXPENSE,
                    category=category,
                    amount=amount,
                    date=now,
                    description=f"{now.strftime('%B %Y')} Late Fee",
                    property=unit.property,
                    unit=unit,
                    tenant=lease.tenant,
                    lease=lease,
                    is_recurring=False,
                    created_by=organization.owner,
                )
                created_count += 1

            if created_count:
                summary.append(
                    f"org={organization.id} ({organization.name}) late_fees_created={created_count}"
                )

        if summary:
            for item in summary:
                self.stdout.write(item)
        else:
            self.stdout.write("No late fees created.")
