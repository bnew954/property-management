from datetime import timedelta

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.utils import timezone

from properties.models import Lease, Notification, Payment, UserProfile


class Command(BaseCommand):
    help = "Generate rent and lease-related notifications."

    def handle(self, *args, **options):
        today = timezone.now().date()
        landlords = User.objects.filter(
            profile__role=UserProfile.ROLE_LANDLORD,
            profile__organization__isnull=False,
        )
        tenant_user_map = {
            profile.tenant_id: profile.user
            for profile in UserProfile.objects.select_related("user").filter(
                role=UserProfile.ROLE_TENANT, tenant__isnull=False
            )
        }

        created_count = 0
        active_leases = Lease.objects.filter(is_active=True).select_related(
            "tenant", "unit", "unit__property", "organization"
        )

        for lease in active_leases:
            organization = lease.organization
            if not organization:
                continue
            tenant_user = tenant_user_map.get(lease.tenant_id)
            if not tenant_user:
                continue

            due_date = self._month_due_date(lease.start_date.day, today)
            days_until_due = (due_date - today).days

            if 0 <= days_until_due <= 5:
                created_count += self._create_once_per_day(
                    recipient=tenant_user,
                    title="Rent due soon",
                    message=(
                        f"Your rent of ${lease.monthly_rent} for Unit {lease.unit.unit_number} "
                        f"is due on {due_date:%b %d, %Y}."
                    ),
                    notification_type=Notification.TYPE_RENT_DUE,
                    organization=organization,
                    link="/pay-rent",
                    today=today,
                )

            if due_date < today and not self._has_completed_payment_for_month(lease, due_date):
                created_count += self._create_once_per_day(
                    recipient=tenant_user,
                    title="Rent overdue",
                    message=(
                        f"Your rent payment for Unit {lease.unit.unit_number} is overdue. "
                        "Please submit payment as soon as possible."
                    ),
                    notification_type=Notification.TYPE_RENT_OVERDUE,
                    organization=organization,
                    link="/pay-rent",
                    today=today,
                )

            days_until_expiry = (lease.end_date - today).days
            if 0 <= days_until_expiry <= 30:
                expiry_message = (
                    f"Lease for Unit {lease.unit.unit_number} at {lease.unit.property.name} "
                    f"expires on {lease.end_date:%b %d, %Y}."
                )
                created_count += self._create_once_per_day(
                    recipient=tenant_user,
                    title="Lease expiring soon",
                    message=expiry_message,
                    notification_type=Notification.TYPE_LEASE_EXPIRING,
                    organization=organization,
                    link="/my-lease",
                    today=today,
                )
                for landlord in landlords:
                    if (
                        getattr(getattr(landlord, "profile", None), "organization", None)
                        != organization
                    ):
                        continue
                    created_count += self._create_once_per_day(
                        recipient=landlord,
                        title="Lease expiring soon",
                        message=expiry_message,
                        notification_type=Notification.TYPE_LEASE_EXPIRING,
                        organization=organization,
                        link="/leases",
                        today=today,
                    )

        self.stdout.write(
            self.style.SUCCESS(
                f"Notification check complete. Created {created_count} notifications."
            )
        )

    def _create_once_per_day(
        self, recipient, title, message, notification_type, link, today, organization=None
    ):
        exists = Notification.objects.filter(
            recipient=recipient,
            title=title,
            notification_type=notification_type,
            created_at__date=today,
            link=link or "",
        ).exists()
        if exists:
            return 0
        Notification.objects.create(
            recipient=recipient,
            title=title,
            message=message,
            notification_type=notification_type,
            organization=organization,
            link=link or "",
        )
        return 1

    def _has_completed_payment_for_month(self, lease, due_date):
        month_start = due_date.replace(day=1)
        if due_date.month == 12:
            next_month = due_date.replace(year=due_date.year + 1, month=1, day=1)
        else:
            next_month = due_date.replace(month=due_date.month + 1, day=1)
        return Payment.objects.filter(
            lease=lease,
            status=Payment.STATUS_COMPLETED,
            payment_date__gte=month_start,
            payment_date__lt=next_month,
        ).exists()

    def _month_due_date(self, preferred_day, reference_date):
        first_day = reference_date.replace(day=1)
        next_month = (first_day + timedelta(days=32)).replace(day=1)
        last_day_current_month = (next_month - timedelta(days=1)).day
        day = min(preferred_day, last_day_current_month)
        return reference_date.replace(day=day)
