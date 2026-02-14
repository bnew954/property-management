from decimal import Decimal
import logging

from django.conf import settings
from django.db import transaction as db_transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    AccountingCategory,
    JournalEntry,
    JournalEntryLine,
    Lease,
    Payment,
    Transaction,
    UserProfile,
)
from .mixins import resolve_request_organization
from .serializers import PaymentSerializer
from .emails import send_payment_confirmation, send_payment_received_landlord


def _tenant_for_user(user):
    profile = getattr(user, "profile", None)
    if not profile:
        return None
    if profile.role != UserProfile.ROLE_TENANT:
        return None
    return profile.tenant_id


def _resolve_chart_account(organization, account_code):
    if not account_code:
        return None

    return (
        AccountingCategory.objects.filter(
            Q(organization=organization) | Q(organization__isnull=True),
            account_code=str(account_code).strip(),
            is_active=True,
        )
        .order_by("organization__isnull", "organization_id")
        .first()
    )


def _get_rent_income_category(organization):
    if organization:
        category = AccountingCategory.objects.filter(
            organization=organization,
            name="Rent Income",
            category_type=AccountingCategory.TYPE_INCOME,
        ).first()
        if category:
            return category

    return AccountingCategory.objects.filter(
        name="Rent Income",
        category_type=AccountingCategory.TYPE_INCOME,
        organization__isnull=True,
    ).first()


def _create_payment_journal_entry(payment, transaction_obj, user):
    if not payment.organization:
        return

    if JournalEntry.objects.filter(source_type="rent_payment", source_id=payment.id).exists():
        return

    cash_account = _resolve_chart_account(payment.organization, "1020")
    income_account = _resolve_chart_account(payment.organization, "4100")
    if not cash_account or not income_account:
        return

    lease = payment.lease
    property_obj = lease.unit.property if lease and lease.unit else None
    unit = lease.unit if lease else None
    tenant = lease.tenant if lease else None

    with db_transaction.atomic():
        journal_entry = JournalEntry.objects.create(
            organization=payment.organization,
            entry_date=payment.payment_date,
            memo=transaction_obj.description or f"Payment for lease {payment.lease_id}",
            status=JournalEntry.STATUS_POSTED,
            source_type="rent_payment",
            source_id=payment.id,
            created_by=user,
            posted_at=timezone.now(),
        )
        JournalEntryLine.objects.bulk_create(
            [
                JournalEntryLine(
                    journal_entry=journal_entry,
                    organization=payment.organization,
                    account=cash_account,
                    debit_amount=payment.amount,
                    credit_amount=Decimal("0.00"),
                    description=transaction_obj.description,
                    property=property_obj,
                    unit=unit,
                    tenant=tenant,
                    lease=lease,
                ),
                JournalEntryLine(
                    journal_entry=journal_entry,
                    organization=payment.organization,
                    account=income_account,
                    debit_amount=Decimal("0.00"),
                    credit_amount=payment.amount,
                    description=transaction_obj.description,
                    property=property_obj,
                    unit=unit,
                    tenant=tenant,
                    lease=lease,
                ),
            ]
        )

    transaction_obj.journal_entry = journal_entry
    transaction_obj.save(update_fields=["journal_entry"])


def _create_payment_transaction(payment, user):
    if not payment.organization or not payment.lease:
        return
    if Transaction.objects.filter(payment=payment).exists():
        return

    category = _get_rent_income_category(payment.organization)
    transaction_obj = Transaction.objects.create(
        organization=payment.organization,
        transaction_type=Transaction.TYPE_INCOME,
        category=category,
        amount=payment.amount,
        date=payment.payment_date,
        description=f"Rent payment for lease {payment.lease_id}",
        property=payment.lease.unit.property if payment.lease.unit else None,
        unit=payment.lease.unit,
        tenant=payment.lease.tenant,
        lease=payment.lease,
        payment=payment,
        created_by=user,
    )

    try:
        _create_payment_journal_entry(payment, transaction_obj, user)
    except Exception:
        logging.getLogger(__name__).exception(
            "Unable to create journal entry for payment=%s", payment.id
        )


class CreatePaymentIntentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            import stripe
        except ImportError:
            return Response(
                {"detail": "Stripe dependency is not installed."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        lease_id = request.data.get("lease_id")
        if not lease_id:
            return Response(
                {"lease_id": "lease_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        organization = resolve_request_organization(request)
        if not organization:
            return Response(
                {"detail": "No organization context for this request."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            lease = Lease.objects.get(id=lease_id, organization=organization)
        except Lease.DoesNotExist:
            return Response(
                {"lease_id": "Lease not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        tenant_id = _tenant_for_user(request.user)
        if tenant_id and lease.tenant_id != tenant_id:
            return Response(
                {"detail": "You can only pay for your own lease."},
                status=status.HTTP_403_FORBIDDEN,
            )

        stripe.api_key = settings.STRIPE_SECRET_KEY
        amount_cents = int((Decimal(lease.monthly_rent) * 100).quantize(Decimal("1")))

        try:
            intent = stripe.PaymentIntent.create(
                amount=amount_cents,
                currency="usd",
                metadata={
                    "lease_id": str(lease.id),
                    "tenant_id": str(lease.tenant_id),
                    "user_id": str(request.user.id),
                },
            )
        except stripe.error.StripeError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "client_secret": intent.client_secret,
                "payment_intent_id": intent.id,
                "amount": str(lease.monthly_rent),
                "currency": "usd",
            }
        )


class ConfirmStripePaymentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            import stripe
        except ImportError:
            return Response(
                {"detail": "Stripe dependency is not installed."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        lease_id = request.data.get("lease_id")
        payment_intent_id = request.data.get("payment_intent_id")
        if not lease_id or not payment_intent_id:
            return Response(
                {"detail": "lease_id and payment_intent_id are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        organization = resolve_request_organization(request)
        if not organization:
            return Response(
                {"detail": "No organization context for this request."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            lease = Lease.objects.get(id=lease_id, organization=organization)
        except Lease.DoesNotExist:
            return Response(
                {"lease_id": "Lease not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        tenant_id = _tenant_for_user(request.user)
        if tenant_id and lease.tenant_id != tenant_id:
            return Response(
                {"detail": "You can only confirm your own lease payment."},
                status=status.HTTP_403_FORBIDDEN,
            )

        existing_payment = Payment.objects.filter(
            stripe_payment_intent_id=payment_intent_id,
            organization=organization,
        ).first()
        if existing_payment:
            _create_payment_transaction(existing_payment, request.user)
            return Response(PaymentSerializer(existing_payment).data)

        stripe.api_key = settings.STRIPE_SECRET_KEY
        try:
            intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        except stripe.error.StripeError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if intent.status != "succeeded":
            return Response(
                {"detail": "Payment has not succeeded yet."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        paid_amount = Decimal(intent.amount_received or intent.amount) / Decimal("100")

        payment = Payment.objects.create(
            lease=lease,
            organization=organization,
            amount=paid_amount,
            payment_date=timezone.now().date(),
            payment_method=Payment.PAYMENT_METHOD_CREDIT_CARD,
            status=Payment.STATUS_COMPLETED,
            stripe_payment_intent_id=payment_intent_id,
            notes="Stripe online rent payment",
        )
        _create_payment_transaction(payment, request.user)
        unit = lease.unit
        property_obj = unit.property if unit else None
        tenant_name = (
            f"{lease.tenant.first_name} {lease.tenant.last_name}".strip()
            if lease.tenant
            else "Tenant"
        )
        try:
            send_payment_confirmation(
                tenant_email=lease.tenant.email if lease.tenant else "",
                tenant_name=tenant_name,
                amount=payment.amount,
                property_name=property_obj.name if property_obj else "",
                unit_number=unit.unit_number if unit else "",
                confirmation_id=payment.id,
            )
            organization = payment.organization
            landlord_email = organization.owner.email if organization and organization.owner else None
            landlord_name = organization.name if organization else "Landlord"
            send_payment_received_landlord(
                landlord_email=landlord_email,
                landlord_name=landlord_name,
                tenant_name=tenant_name,
                amount=payment.amount,
                property_name=property_obj.name if property_obj else "",
                unit_number=unit.unit_number if unit else "",
            )
        except Exception:
            logging.getLogger(__name__).exception(
                "Failed to send payment notification emails for payment=%s", payment.id
            )
        return Response(
            PaymentSerializer(payment).data,
            status=status.HTTP_201_CREATED,
        )


class PaymentHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = Payment.objects.select_related("lease", "lease__tenant", "lease__unit")
        organization = getattr(request, "organization", None)
        if organization:
            queryset = queryset.filter(organization=organization)
        else:
            queryset = queryset.none()
        tenant_id = _tenant_for_user(request.user)
        if tenant_id:
            queryset = queryset.filter(lease__tenant_id=tenant_id)
        serializer = PaymentSerializer(queryset, many=True)
        return Response(serializer.data)
