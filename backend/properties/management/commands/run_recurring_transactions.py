from django.core.management.base import BaseCommand

from properties.models import Organization

from properties.utils import run_all_due_recurring


class Command(BaseCommand):
    help = "Run all due recurring transactions for every organization."

    def handle(self, *args, **options):
        organizations = Organization.objects.all().order_by("id")
        if not organizations.exists():
            self.stdout.write(self.style.WARNING("No organizations found."))
            return

        total_created = 0
        for organization in organizations:
            created_count = run_all_due_recurring(organization)
            total_created += created_count
            self.stdout.write(
                f"Org {organization.id}: created {created_count} entries"
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Recurring job complete. Total organizations: {organizations.count()}, "
                f"entries created: {total_created}"
            )
        )
