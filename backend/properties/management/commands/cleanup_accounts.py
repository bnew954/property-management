from collections import defaultdict

from django.core.management.base import BaseCommand
from django.db import transaction

from properties.models import AccountingCategory


class Command(BaseCommand):
    help = "Remove duplicate accounting categories by organization."

    def handle(self, *args, **options):
        merged_duplicates = 0
        scanned_groups = 0
        reassigned_journal_lines = 0
        reassigned_child_accounts = 0

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
                groups = defaultdict(list)
                for account in AccountingCategory.objects.filter(organization_id=org_id):
                    groups[(org_id, "name", (account.name or "").strip())].append(account)

                duplicate_groups = [group for group in groups.values() if len(group) > 1]
                for group in duplicate_groups:
                    scanned_groups += 1
                    coded = [account for account in group if str(account.account_code or "").strip()]
                    survivor = sorted(coded, key=lambda account: account.id)[0] if coded else sorted(
                        group,
                        key=lambda account: account.id,
                    )[0]

                    for duplicate in group:
                        if duplicate.id == survivor.id:
                            continue

                        line_count = duplicate.journal_lines.count()
                        if line_count:
                            duplicate.journal_lines.update(account=survivor)
                            reassigned_journal_lines += line_count

                        child_count = AccountingCategory.objects.filter(
                            parent_account=duplicate,
                            organization_id=org_id,
                        ).update(parent_account=survivor)
                        if child_count:
                            reassigned_child_accounts += child_count

                        duplicate.delete()
                        merged_duplicates += 1

        if merged_duplicates:
            self.stdout.write(
                self.style.SUCCESS(
                    "Merged "
                    f"{merged_duplicates} legacy duplicates into coded accounts, "
                    f"reassigned {reassigned_journal_lines} journal lines, "
                    f"reassigned {reassigned_child_accounts} child accounts"
                )
            )
        else:
            self.stdout.write(self.style.SUCCESS("No duplicate accounting categories found."))
        self.stdout.write(
            self.style.SUCCESS(f"Scanned {scanned_groups} duplicate candidate groups.")
        )
