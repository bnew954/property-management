from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Count

from properties.models import AccountingCategory


class Command(BaseCommand):
    help = "Remove duplicate accounting categories by organization."

    def handle(self, *args, **options):
        removed_count = 0

        org_ids = (
            AccountingCategory.objects.values_list("organization_id", flat=True)
            .distinct()
            .order_by("organization_id")
        )
        if not org_ids:
            self.stdout.write(self.style.WARNING("No accounting categories found."))
            return

        with transaction.atomic():
            for org_id in org_ids:
                duplicates = (
                    AccountingCategory.objects.filter(organization_id=org_id)
                    .values("name")
                    .annotate(total=Count("id"))
                    .filter(total__gt=1)
                )

                for duplicate in duplicates:
                    name = duplicate["name"]
                    qs = list(
                        AccountingCategory.objects.filter(
                            organization_id=org_id,
                            name=name,
                        ).order_by("id")
                    )
                    if len(qs) < 2:
                        continue

                    keep = None
                    first_with_code = next(
                        (entry for entry in qs if str(entry.account_code or "").strip()),
                        None,
                    )
                    if first_with_code:
                        keep = first_with_code
                    else:
                        keep = qs[0]

                    remove = [entry for entry in qs if entry.id != keep.id]
                    if not remove:
                        continue

                    removed_ids = [entry.id for entry in remove]
                    removed_count += len(remove)
                    AccountingCategory.objects.filter(id__in=removed_ids).delete()

        if removed_count:
            self.stdout.write(
                self.style.SUCCESS(f"Removed {removed_count} duplicate accounting categories.")
            )
        else:
            self.stdout.write(self.style.SUCCESS("No duplicate accounting categories found."))
