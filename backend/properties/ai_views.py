import os
from datetime import date, timedelta
from decimal import Decimal

import requests
from django.db.models import Sum
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .mixins import resolve_request_organization
from .models import (
    AccountingCategory,
    JournalEntry,
    JournalEntryLine,
    Lease,
    MaintenanceRequest,
    Payment,
    Property,
    RentLedgerEntry,
    Tenant,
    Unit,
)


def _to_decimal(value):
    if value is None:
        return Decimal("0.00")
    if isinstance(value, Decimal):
        return value
    try:
        return Decimal(str(value))
    except (TypeError, ValueError, ArithmeticError):
        return Decimal("0.00")


def _format_money(value):
    amount = _to_decimal(value)
    return f"${amount:,.2f}"


def _safe_context_append(context_parts, label, value_func):
    try:
        value_func(context_parts)
    except Exception:
        # Keep the API resilient: return partial context even when one section fails.
        pass


def _format_property_address(property_obj):
    if not property_obj:
        return ""
    address_parts = [
        property_obj.address_line1,
        property_obj.address_line2,
    ]
    city_state_zip = (
        f"{property_obj.city}, {property_obj.state} {property_obj.zip_code}".strip()
    )
    if city_state_zip.strip():
        address_parts.append(city_state_zip)
    return " | ".join([part for part in address_parts if part])


def gather_context(organization):
    """Build a compact text summary of the landlord's portfolio for the AI context."""
    context_parts = []

    properties = Property.objects.none()
    units = Unit.objects.none()
    tenants = Tenant.objects.none()
    leases = Lease.objects.none()
    properties_count = 0
    units_count = 0
    tenants_count = 0
    active_leases_count = 0

    def add_portfolio_summary(_parts):
        nonlocal properties, units, tenants, leases
        nonlocal properties_count, units_count, tenants_count, active_leases_count
        properties = Property.objects.filter(organization=organization)
        units = Unit.objects.filter(property__organization=organization)
        tenants = Tenant.objects.filter(organization=organization)
        leases = Lease.objects.filter(unit__property__organization=organization, is_active=True)

        properties_count = properties.count()
        units_count = units.count()
        tenants_count = tenants.count()
        active_leases_count = leases.count()

        context_parts.append(
            f"Portfolio: {properties_count} properties, {units_count} units, "
            f"{tenants_count} tenants, {active_leases_count} active leases."
        )

    def add_property_details(_parts):
        if not properties.exists():
            return

        for prop in properties[:20]:
            prop_units = units.filter(property=prop)
            occupied = prop_units.filter(lease__is_active=True).distinct().count()
            context_parts.append(
                f"Property: {prop.name} ({_format_property_address(prop)}) - "
                f"{prop_units.count()} units, {occupied} occupied."
            )

    def add_recent_payments(_parts):
        recent_payments = Payment.objects.filter(
            lease__unit__property__organization=organization,
            created_at__gte=timezone.now() - timedelta(days=30),
        )
        total_collected = recent_payments.aggregate(total=Sum("amount"))["total"]
        context_parts.append(
            "Payments last 30 days: "
            f"{recent_payments.count()} payments, {_format_money(total_collected)} collected."
        )

    def add_outstanding_balances(_parts):
        ledger_balances = (
            RentLedgerEntry.objects.filter(lease__unit__property__organization=organization)
            .values(
                "lease__tenant__first_name",
                "lease__tenant__last_name",
                "lease__unit__unit_number",
                "lease__unit__property__name",
            )
            .annotate(balance=Sum("amount"))
            .filter(balance__gt=0)
            .order_by("-balance")
        )

        if not ledger_balances:
            return

        context_parts.append("Outstanding balances:")
        for entry in ledger_balances[:20]:
            name = f"{entry['lease__tenant__first_name']} {entry['lease__tenant__last_name']}".strip() or "Unknown Tenant"
            context_parts.append(
                f"  {name} - Unit {entry['lease__unit__unit_number']} at "
                f"{entry['lease__unit__property__name']}: {_format_money(entry['balance'])}"
            )

    def add_maintenance_requests(_parts):
        open_requests = MaintenanceRequest.objects.filter(
            property__organization=organization,
            status__in=[
                MaintenanceRequest.STATUS_SUBMITTED,
                MaintenanceRequest.STATUS_IN_PROGRESS,
            ],
        )

        context_parts.append(f"Open maintenance requests: {open_requests.count()}")
        for request in open_requests[:10]:
            context_parts.append(
                f"  {request.unit.property.name} Unit {request.unit.unit_number if request.unit_id else 'N/A'}: "
                f"{request.description[:80]} (Status: {request.status}, Priority: {request.priority})"
            )

    def add_accounting_summary(_parts):
        month_start = date.today().replace(day=1)
        posted_entries = JournalEntry.objects.filter(
            organization=organization,
            status=JournalEntry.STATUS_POSTED,
            entry_date__gte=month_start,
        )

        income_lines = JournalEntryLine.objects.filter(
            journal_entry__in=posted_entries,
            account__account_type=AccountingCategory.TYPE_REVENUE,
        ).aggregate(total=Sum("credit_amount"))
        expense_lines = JournalEntryLine.objects.filter(
            journal_entry__in=posted_entries,
            account__account_type=AccountingCategory.TYPE_EXPENSE,
        ).aggregate(total=Sum("debit_amount"))

        revenue = income_lines["total"] or Decimal("0.00")
        expenses = expense_lines["total"] or Decimal("0.00")
        context_parts.append(
            f"This month: {_format_money(revenue)} revenue, {_format_money(expenses)} expenses, "
            f"{_format_money(revenue - expenses)} net income."
        )

    def add_lease_expirations(_parts):
        today = date.today()
        expiring_soon = Lease.objects.filter(
            unit__property__organization=organization,
            is_active=True,
            end_date__lte=today + timedelta(days=60),
            end_date__gte=today,
        ).order_by("end_date")

        if not expiring_soon:
            return

        context_parts.append(
            f"Leases expiring in next 60 days: {expiring_soon.count()}"
        )
        for lease in expiring_soon[:10]:
            tenant_name = f"{lease.tenant.first_name} {lease.tenant.last_name}"
            context_parts.append(
                f"  {tenant_name} - Unit {lease.unit.unit_number} at {lease.unit.property.name}: "
                f"expires {lease.end_date}"
            )

    def add_vacant_units(_parts):
        vacant_units = units.exclude(id__in=Lease.objects.filter(is_active=True).values("unit_id"))
        if not vacant_units:
            return

        context_parts.append(f"Vacant units: {vacant_units.count()}")
        for unit in vacant_units[:10]:
            rent_display = f"{unit.rent_amount:.2f}" if unit.rent_amount is not None else "0.00"
            context_parts.append(
                f"  {unit.property.name} - Unit {unit.unit_number} "
                f"({unit.bedrooms}BR, ${rent_display}/mo)"
            )

    _safe_context_append(context_parts, "portfolio", add_portfolio_summary)
    _safe_context_append(context_parts, "property details", add_property_details)
    _safe_context_append(context_parts, "recent payments", add_recent_payments)
    _safe_context_append(context_parts, "outstanding balances", add_outstanding_balances)
    _safe_context_append(context_parts, "maintenance", add_maintenance_requests)
    _safe_context_append(context_parts, "accounting", add_accounting_summary)
    _safe_context_append(context_parts, "lease expirations", add_lease_expirations)
    _safe_context_append(context_parts, "vacancy", add_vacant_units)

    context_summary = f"{properties_count} properties, {units_count} units"
    return "\n".join(context_parts), context_summary


def call_llm(system_prompt, messages, provider="anthropic"):
    provider = (provider or "anthropic").lower()

    if provider == "openai":
        api_key = os.environ.get("OPENAI_API_KEY", "").strip()
        if not api_key:
            return "The AI assistant requires an API key. Add ANTHROPIC_API_KEY or OPENAI_API_KEY to your .env file."

        payload = {
            "model": "gpt-4o-mini",
            "messages": [{"role": "system", "content": system_prompt}] + messages,
            "max_tokens": 1024,
        }
        try:
            response = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}",
                },
                json=payload,
                timeout=30,
            )
            if response.status_code == 200:
                data = response.json()
                return data["choices"][0]["message"]["content"]
            return f"AI service error: {response.status_code}"
        except requests.Timeout:
            return "The AI service is taking too long. Please try again."
        except requests.RequestException:
            return "AI service error: unable to reach provider."

    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        return "The AI assistant requires an API key. Add ANTHROPIC_API_KEY or OPENAI_API_KEY to your .env file."

    payload = {
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 1024,
        "system": system_prompt,
        "messages": messages,
    }
    try:
        response = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "Content-Type": "application/json",
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
            },
            json=payload,
            timeout=30,
        )
        if response.status_code == 200:
            data = response.json()
            return data["content"][0]["text"]
        return f"AI service error: {response.status_code}"
    except requests.Timeout:
        return "The AI service is taking too long. Please try again."
    except requests.RequestException:
        return "AI service error: unable to reach provider."


class AiChatView(APIView):
    permission_classes = [IsAuthenticated]

    # AI Assistant Configuration:
    # AI_PROVIDER=anthropic  # or openai
    # ANTHROPIC_API_KEY=your-key-here
    # OPENAI_API_KEY=your-key-here

    def post(self, request):
        organization = resolve_request_organization(request)
        payload = request.data or {}

        user_message = (payload.get("message") or "").strip()
        if not user_message:
            return Response({"detail": "message is required."}, status=400)

        history = payload.get("history") or []
        conversation = []
        for msg in history:
            if not isinstance(msg, dict):
                continue
            role = str(msg.get("role", "")).strip().lower()
            content = str(msg.get("content", "")).strip()
            if role in {"user", "assistant"} and content:
                conversation.append({"role": role, "content": content})
        conversation.append({"role": "user", "content": user_message})

        context, context_summary = gather_context(organization)
        system_prompt = (
            "You are the Onyx PM AI Assistant — a helpful, knowledgeable property management assistant.\n"
            "You have access to the landlord's real portfolio data. Use it to answer questions accurately.\n"
            "Be concise and direct. Use specific numbers and names from the data.\n"
            "If you don't have enough data to answer, say so honestly.\n"
            "Format currency as $X,XXX.XX. Use the tenant and property names from the data.\n\n"
            f"Current date: {date.today().isoformat()}\n\n"
            "PORTFOLIO DATA:\n"
            f"{context}"
        )

        provider = request.META.get("AI_PROVIDER", os.environ.get("AI_PROVIDER", "anthropic"))
        ai_response = call_llm(
            system_prompt=system_prompt,
            messages=conversation,
            provider=str(provider).strip(),
        )

        return Response(
            {
                "message": ai_response,
                "context_summary": context_summary,
            }
        )
