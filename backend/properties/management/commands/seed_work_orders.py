from decimal import Decimal
import random
from datetime import timedelta

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from properties.models import (
    Bill,
    BillPayment,
    Property,
    MaintenanceRequest,
    Organization,
    Vendor,
    WorkOrder,
    WorkOrderNote,
)


class Command(BaseCommand):
    help = "Seed demo work orders and vendor portal data."

    def handle(self, *args, **options):
        with transaction.atomic():
            organization = self._resolve_organization()
            if not organization:
                self.stdout.write(self.style.WARNING("No organization found for seeding work orders."))
                return

            vendors = list(Vendor.objects.filter(organization=organization).order_by("id"))
            if not vendors:
                self.stdout.write(self.style.WARNING("No vendors found for seeding work orders."))
                return

            maintenance_requests = list(
                MaintenanceRequest.objects.filter(organization=organization).order_by("id")
            )
            if not maintenance_requests:
                self.stdout.write(self.style.WARNING("No maintenance requests found for seeding work orders."))
                return

            chosen_vendors = vendors[:6]
            work_order_statuses = [
                WorkOrder.STATUS_ASSIGNED,
                WorkOrder.STATUS_ACCEPTED,
                WorkOrder.STATUS_IN_PROGRESS,
                WorkOrder.STATUS_COMPLETED,
            ]
            priorities = [
                WorkOrder.PRIORITY_LOW,
                WorkOrder.PRIORITY_MEDIUM,
                WorkOrder.PRIORITY_HIGH,
                WorkOrder.PRIORITY_EMERGENCY,
            ]
            payment_methods = [
                BillPayment.PAYMENT_METHOD_BANK_TRANSFER,
                BillPayment.PAYMENT_METHOD_CHECK,
                BillPayment.PAYMENT_METHOD_CASH,
            ]

            total_notes = 0
            total_work_orders = 0
            today = timezone.now().date()

            for vendor in chosen_vendors:
                for _ in range(random.randint(2, 3)):
                    maintenance_request = random.choice(maintenance_requests)
                    status = random.choice(work_order_statuses)
                    scheduled_date = timezone.now() + timedelta(days=random.randint(-2, 5))
                    estimated_cost = Decimal(random.randint(120, 2200)) + Decimal(f"0.{random.randint(0, 99):02d}")

                    property_obj = maintenance_request.unit.property if maintenance_request.unit else None
                    unit = maintenance_request.unit

                    work_order = WorkOrder.objects.create(
                        organization=organization,
                        maintenance_request=maintenance_request,
                        vendor=vendor,
                        title=f"{vendor.name} job for request #{maintenance_request.id}",
                        description="Assigned from seed data.",
                        priority=random.choice(priorities),
                        status=status,
                        scheduled_date=scheduled_date,
                        estimated_cost=estimated_cost,
                        property=property_obj,
                        unit=unit,
                    )
                    if status == WorkOrder.STATUS_COMPLETED:
                        work_order.completed_date = scheduled_date + timedelta(days=random.randint(1, 5))
                        work_order.actual_cost = estimated_cost + Decimal(
                            f"0.{random.randint(0, 99):02d}"
                        )

                    work_order.save(update_fields=["completed_date", "actual_cost", "updated_at"])

                    for idx in range(random.randint(2, 3)):
                        is_vendor = idx % 2 == 0
                        if is_vendor and vendor.user:
                            author = vendor.user
                            author_name = vendor.user.get_full_name() or vendor.user.username
                        else:
                            author = None
                            author_name = "Landlord"

                        WorkOrderNote.objects.create(
                            work_order=work_order,
                            author=author,
                            author_name=author_name,
                            is_vendor=is_vendor,
                            message=f"{author_name} update #{idx + 1} for seeded work order",
                        )
                        total_notes += 1

                    if status == WorkOrder.STATUS_COMPLETED:
                        bill_amount = work_order.actual_cost or estimated_cost
                        bill = Bill.objects.create(
                            organization=organization,
                            vendor=vendor,
                            property=property_obj,
                            unit=unit,
                            bill_number=f"WO-{work_order.id}-{today:%Y%m%d}",
                            description=f"Seeded invoice for {work_order.title}",
                            amount=bill_amount,
                            tax_amount=Decimal("0.00"),
                            total_amount=bill_amount,
                            amount_paid=bill_amount,
                            balance_due=Decimal("0.00"),
                            bill_date=today,
                            due_date=today,
                            status=Bill.STATUS_PAID,
                            notes=f"Seeded payment for {vendor.name}",
                        )
                        work_order.bill = bill
                        work_order.save(update_fields=["bill"])
                        BillPayment.objects.create(
                            organization=organization,
                            bill=bill,
                            amount=bill_amount,
                            payment_date=today,
                            payment_method=random.choice(payment_methods),
                            reference="Seeded full payment",
                        )

                    total_work_orders += 1

            self._ensure_test_vendor_user(chosen_vendors, organization)
            self.stdout.write(
                self.style.SUCCESS(
                    f"Seeded {total_work_orders} work orders with {total_notes} notes. "
                    "Vendor portal test account: vendor_knox_plumbing / vendor123"
                )
            )

    def _resolve_organization(self):
        property_obj = (
            Property.objects.select_related("organization")
            .filter(organization__isnull=False)
            .order_by("id")
            .first()
        )
        if property_obj:
            return property_obj.organization
        maintenance_request = (
            MaintenanceRequest.objects.filter(organization__isnull=False)
            .order_by("id")
            .first()
        )
        if maintenance_request:
            return maintenance_request.organization
        return Organization.objects.order_by("id").first()

    def _ensure_test_vendor_user(self, vendors, organization):
        target_vendor = None
        for vendor in vendors:
            if "knox" in vendor.name.lower() and "plumb" in vendor.name.lower():
                target_vendor = vendor
                break
        if target_vendor is None:
            target_vendor = vendors[0]

        user, created = User.objects.get_or_create(
            username="vendor_knox_plumbing",
            defaults={
                "email": "vendor_knox_plumbing@example.com",
            },
        )
        user.set_password("vendor123")
        user.save(update_fields=["password"])

        target_vendor.user = user
        target_vendor.portal_enabled = True
        target_vendor.invite_token = ""
        target_vendor.save(update_fields=["user", "portal_enabled", "invite_token"])
        return target_vendor
