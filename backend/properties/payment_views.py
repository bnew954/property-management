from decimal import Decimal

from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Lease, Payment, UserProfile
from .serializers import PaymentSerializer


def _tenant_for_user(user):
    profile = getattr(user, "profile", None)
    if not profile:
        return None
    if profile.role != UserProfile.ROLE_TENANT:
        return None
    return profile.tenant_id


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

        organization = getattr(request, "organization", None)
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

        organization = getattr(request, "organization", None)
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
