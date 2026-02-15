from decimal import Decimal
import random
from datetime import timedelta

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from properties.models import (
    AccountingCategory,
    Bill,
    BillPayment,
    Organization,
    Property,
    Unit,
    Vendor,
)


class Command(BaseCommand):
    help = "Seed demo vendors and bills."

    VENDORS = [
        {"name": "Knox Plumbing Co.", "category": "plumbing", "is_1099_eligible": True},
        {"name": "Volunteer Electric", "category": "electrical", "is_1099_eligible": True},
        {"name": "Smoky Mountain HVAC", "category": "hvac", "is_1099_eligible": True},
        {"name": "Green Thumb Landscaping", "category": "landscaping", "is_1099_eligible": True},
        {"name": "Sparkle Clean Services", "category": "cleaning", "is_1099_eligible": True},
        {"name": "Tennessee Roofing Pros", "category": "roofing", "is_1099_eligible": True},
        {"name": "State Farm Insurance", "category": "insurance", "is_1099_eligible": False},
        {"name": "First Tennessee Mortgage", "category": "mortgage", "is_1099_eligible": False},
        {"name": "Harbor View HOA", "category": "hoa", "is_1099_eligible": False},
        {"name": "KUB Utilities", "category": "utility", "is_1099_eligible": False},
    ]

    PAYMENT_METHODS = [
        BillPayment.PAYMENT_METHOD_BANK_TRANSFER,
        BillPayment.PAYMENT_METHOD_CHECK,
        BillPayment.PAYMENT_METHOD_CREDIT_CARD,
        BillPayment.PAYMENT_METHOD_CASH,
        BillPayment.PAYMENT_METHOD_OTHER,
    ]

    ACCOUNT_CATEGORY_BY_VENDOR = {
        "plumbing": "Repairs & Maintenance",
        "electrical": "Repairs & Maintenance",
        "hvac": "Repairs & Maintenance",
        "landscaping": "Landscaping",
        "cleaning": "Cleaning",
        "roofing": "Repairs & Maintenance",
        "insurance": "Insurance",
        "mortgage": "Mortgage Interest",
        "hoa": "HOA Fees",
        "utility": "Utilities",
        "other": "Other Expense",
    }

    def handle(self, *args, **options):
        with transaction.atomic():
            organization = self._resolve_organization()
            if not organization:
                raise CommandError("No organization available for seeding vendors.")

            properties = list(Property.objects.filter(organization=organization).order_by("id"))
            if not properties:
                self.stdout.write(self.style.WARNING("No properties found for selected organization."))

            vendors_created = 0
            bills_created = 0
            for vendor_payload in self.VENDORS:
                vendor, created_vendor = Vendor.objects.get_or_create(
                    organization=organization,
                    name=vendor_payload["name"],
                    defaults={
                        "category": vendor_payload["category"],
                        "is_1099_eligible": vendor_payload["is_1099_eligible"],
                        "contact_name": "Accounts",
                        "email": f"{vendor_payload['name'].replace(' ', '').lower()}@example.com",
                    },
                )
                if created_vendor:
                    vendors_created += 1
                vendor.category = vendor_payload["category"]
                vendor.is_1099_eligible = vendor_payload["is_1099_eligible"]
                vendor.save(update_fields=["category", "is_1099_eligible"])

                bills_created += self._create_vendor_bills(vendor, organization, properties)

            self.stdout.write(self.style.SUCCESS(f"Seeded {vendors_created} vendors and {bills_created} bills."))

    def _resolve_organization(self):
        first_property = Property.objects.select_related("organization").order_by("id").first()
        if first_property and first_property.organization:
            return first_property.organization
        organization = Organization.objects.order_by("id").first()
        if organization:
            return organization
        admin = User.objects.filter(is_superuser=True).order_by("id").first()
        if not admin:
            admin = User.objects.create_superuser(
                username="admin",
                email="admin@onyx-pm.com",
                password="Admin2026!",
            )
        organization = Organization.objects.create(name="Onyx Demo Property Management", owner=admin)
        return organization

    def _bill_category(self, organization, vendor_key):
        category_name = self.ACCOUNT_CATEGORY_BY_VENDOR.get(vendor_key, "Other Expense")
        category = (
            AccountingCategory.objects.filter(
                organization=organization,
                name=category_name,
                is_system=True,
            ).first()
            or AccountingCategory.objects.filter(name=category_name, organization__isnull=True, is_system=True).first()
        )
        if category:
            return category
        return AccountingCategory.objects.create(
            organization=organization,
            name=category_name,
            category_type=AccountingCategory.TYPE_EXPENSE,
            is_system=False,
            is_active=True,
        )

    def _random_unit(self, property_obj):
        if not property_obj:
            return None
        units = list(Unit.objects.filter(property=property_obj).order_by("id"))
        if not units:
            return None
        return random.choice(units)

    def _create_vendor_bills(self, vendor, organization, properties):
        today = timezone.now().date()
        created_count = 0
        status_weights = [
            (Bill.STATUS_PAID, 0.45),
            (Bill.STATUS_PENDING, 0.3),
            (Bill.STATUS_PARTIAL, 0.1),
            (Bill.STATUS_OVERDUE, 0.15),
        ]

        for _ in range(random.randint(2, 4)):
            bill_date = today - timedelta(days=random.randint(0, 85))
            amount = Decimal(random.randint(180, 1200)) + Decimal(f"0.{random.randint(0, 99):02d}")
            tax_amount = (amount * Decimal("0.08")).quantize(Decimal("0.01"))
            prop = random.choice(properties) if properties else None
            unit = self._random_unit(prop) if prop else None
            status = random.choices(
                population=[choice for choice, _ in status_weights],
                weights=[weight for _, weight in status_weights],
                k=1,
            )[0]

            if status == Bill.STATUS_OVERDUE:
                due_date = bill_date + timedelta(days=-random.randint(2, 45))
            elif status == Bill.STATUS_PENDING:
                due_date = bill_date + timedelta(days=random.randint(0, 35))
            else:
                due_date = bill_date + timedelta(days=random.randint(-20, 20))

            is_recurring = random.choice([True, False])
            recurring_frequency = (
                random.choice([Bill.BILL_RECURRENCE_MONTHLY, Bill.BILL_RECURRENCE_QUARTERLY, Bill.BILL_RECURRENCE_ANNUALLY])
                if is_recurring
                else ""
            )

            bill = Bill.objects.create(
                organization=organization,
                vendor=vendor,
                property=prop,
                unit=unit,
                bill_number=f"V-{vendor.id:04d}-{random.randint(1000, 9999)}",
                description=f"Service invoice from {vendor.name}",
                category=self._bill_category(organization, vendor.category),
                amount=amount,
                tax_amount=tax_amount,
                bill_date=bill_date,
                due_date=due_date,
                status=status,
                is_recurring=is_recurring,
                recurring_frequency=recurring_frequency,
                notes="Seeded bill data",
            )
            created_count += 1

            if status == Bill.STATUS_PARTIAL:
                first_payment = (bill.total_amount * Decimal(random.choice([25, 40, 55])) / Decimal("100")).quantize(Decimal("0.01"))
                if first_payment <= bill.total_amount:
                    BillPayment.objects.create(
                        organization=organization,
                        bill=bill,
                        amount=first_payment,
                        payment_date=max(bill.bill_date, today - timedelta(days=random.randint(0, 20))),
                        payment_method=random.choice(self.PAYMENT_METHODS),
                        reference=f"Seed payment partial {vendor.name}",
                        notes="Seed payment",
                    )
            elif status == Bill.STATUS_PAID:
                BillPayment.objects.create(
                    organization=organization,
                    bill=bill,
                    amount=bill.total_amount,
                    payment_date=max(bill.bill_date, today - timedelta(days=random.randint(0, 10))),
                    payment_method=random.choice(self.PAYMENT_METHODS),
                    reference=f"Seed payment full {vendor.name}",
                    notes="Seed payment",
                )

        return created_count
