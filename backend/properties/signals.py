from decimal import Decimal

from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Payment, RentLedgerEntry, UserProfile

import logging


logger = logging.getLogger(__name__)


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        logger.info("Creating default user profile for new user id=%s", instance.id)
        UserProfile.objects.create(
            user=instance, role=UserProfile.ROLE_LANDLORD
        )


def recalculate_lease_balances(lease_id):
    running = Decimal("0.00")
    entries = RentLedgerEntry.objects.filter(lease_id=lease_id).order_by("date", "created_at", "id")
    for entry in entries:
        running += entry.amount
        if entry.balance != running:
            entry.balance = running
            entry.save(update_fields=["balance"])


@receiver(post_save, sender=Payment)
def create_ledger_entry_for_completed_payment(sender, instance, created, **kwargs):
    if not created:
        return
    if instance.status != Payment.STATUS_COMPLETED:
        return
    if RentLedgerEntry.objects.filter(payment=instance).exists():
        return

    RentLedgerEntry.objects.create(
        lease=instance.lease,
        organization=instance.lease.organization,
        entry_type=RentLedgerEntry.TYPE_PAYMENT,
        description="Payment Received",
        amount=-abs(instance.amount),
        balance=Decimal("0.00"),
        payment=instance,
        date=instance.payment_date,
    )
    recalculate_lease_balances(instance.lease_id)
