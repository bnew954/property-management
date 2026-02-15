from decimal import Decimal, InvalidOperation
import logging

from django.utils import timezone

from .ai_service import get_ai_json
from .models import (
    AccountingCategory,
    LeadActivity,
    Message,
    Payment,
    Vendor,
    WorkOrder,
    Bill,
)

logger = logging.getLogger(__name__)


def _to_decimal(value, default=None):
    if value is None:
        return default
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return default


def _int_or_none(value):
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _message_sender(task):
    return task.organization.owner if task.organization_id else None


# =====================
# COLLECTIONS AGENT
# =====================


def generate_payment_reminder(task):
    """Generate a personalized payment reminder email for an overdue tenant."""
    lease = task.related_lease
    tenant = task.related_tenant
    if not lease or not tenant:
        return None

    payment_history = Payment.objects.filter(
        lease=lease, status="completed"
    ).order_by("-payment_date")[:5]

    history_text = ""
    for p in payment_history:
        history_text += f"- {p.payment_date}: ${p.amount} ({p.payment_method})\n"

    if not history_text:
        history_text = "No recent payment history found."

    days_overdue = (timezone.now().date() - lease.end_date.replace(day=1)).days

    context = f"""
Tenant: {tenant.first_name} {tenant.last_name}
Email: {tenant.email}
Unit: {lease.unit.unit_number if lease.unit else "Unknown"}
Monthly Rent: ${lease.monthly_rent}
Days Since Rent Due: {max(days_overdue, 0)}
Recent Payment History:
{history_text}
"""

    system_prompt = """You are a professional property management assistant drafting a rent payment reminder email.
Be firm but professional and empathetic. Do not threaten. Include the specific amount owed and how to pay.
Keep the email under 150 words. Return JSON with keys: "subject", "body"."""

    user_prompt = f"Draft a payment reminder email for this tenant:\n{context}"

    result = get_ai_json(system_prompt, user_prompt)
    if not result:
        result = {
            "subject": f"Rent Payment Reminder — Unit {lease.unit.unit_number if lease.unit else ''}",
            "body": (
                f"Dear {tenant.first_name},\n\n"
                f"This is a friendly reminder that your rent payment of ${lease.monthly_rent} "
                "is due. Please submit your payment at your earliest convenience.\n\n"
                "If you have already sent payment, please disregard this notice.\n\n"
                "Thank you,\nProperty Management"
            ),
        }
    return result


def execute_payment_reminder(task):
    """Execute: send the payment reminder as an in-app message."""
    reminder = generate_payment_reminder(task)
    if not reminder:
        return False, "Could not generate reminder"

    tenant = task.related_tenant
    if not tenant:
        return False, "No related tenant to send reminder to"

    sender = _message_sender(task)
    if not sender:
        return False, "No valid message sender configured"

    try:
        Message.objects.create(
            organization=task.organization,
            sender=sender,
            recipient_tenant=tenant,
            subject=(reminder.get("subject") or "").strip(),
            body=(reminder.get("body") or "").strip(),
        )
        return True, f"Payment reminder sent to {tenant.first_name} {tenant.last_name}"
    except Exception as e:
        logger.error("Failed to send payment reminder: %s", e)
        return False, str(e)


# =====================
# LEASING AGENT
# =====================


def generate_lead_follow_up(task):
    """Generate a personalized follow-up email for a stale lead."""
    lead = task.related_lead
    if not lead:
        return None

    activities = list(lead.activities.order_by("-created_at")[:5]) if hasattr(lead, "activities") else []
    activity_text = ""
    for a in activities:
        description = (a.description or "").strip()
        activity_text += f"- {a.created_at.strftime('%b %d')}: {a.activity_type} — {description[:100]}\n"

    if not activity_text:
        activity_text = "No previous activity logged."

    context = f"""
Lead: {lead.first_name} {lead.last_name}
Email: {lead.email}
Phone: {lead.phone}
Source: {lead.get_source_display() if hasattr(lead, "get_source_display") else lead.source}
Stage: {lead.stage}
Interested In: {lead.property.name if lead.property else 'General inquiry'}{' — Unit ' + str(lead.unit.unit_number) if lead.unit else ''}
Budget: ${lead.budget_min or '?'} - ${lead.budget_max or '?'}
Desired Move-in: {lead.desired_move_in or 'Not specified'}
Days Since Last Contact: {(timezone.now() - lead.updated_at).days}
Activity History:
{activity_text}
"""

    system_prompt = """You are a friendly leasing agent following up with a prospective tenant.
Be warm, helpful, and encourage them to schedule a tour or ask questions.
Reference their specific interests if known. Keep under 120 words.
Return JSON with keys: "subject", "body"."""

    user_prompt = f"Draft a follow-up email for this lead:\n{context}"

    result = get_ai_json(system_prompt, user_prompt)
    if not result:
        result = {
            "subject": f"Still interested in {lead.property.name if lead.property else 'our properties'}?",
            "body": (
                f"Hi {lead.first_name},\n\n"
                "I wanted to follow up on your recent inquiry. We'd love to help you find the right place. "
                "Would you like to schedule a tour?\n\n"
                "Feel free to reply or call us anytime.\n\n"
                "Best regards,\nLeasing Team"
            ),
        }
    return result


def execute_lead_follow_up(task):
    """Execute: create the follow-up as a lead activity and optionally send message."""
    follow_up = generate_lead_follow_up(task)
    if not follow_up:
        return False, "Could not generate follow-up"

    lead = task.related_lead
    if not lead:
        return False, "No related lead found"

    try:
        if hasattr(lead, "activities"):
            LeadActivity.objects.create(
                lead=lead,
                activity_type="email_sent",
                description=f"AI-generated follow-up sent: {follow_up['subject']}",
                subject=follow_up["subject"],
                body=follow_up["body"],
            )
        lead.last_contacted_at = timezone.now()
        lead.save(update_fields=["last_contacted_at"])
        return (
            True,
            f"Follow-up drafted for {lead.first_name} {lead.last_name}: \"{follow_up['subject']}\"",
        )
    except Exception as e:
        logger.error("Failed to execute lead follow-up: %s", e)
        return False, str(e)


# =====================
# MAINTENANCE TRIAGE AGENT
# =====================


def generate_maintenance_triage(task):
    """AI analyzes a maintenance request and suggests vendor + priority + estimated cost."""
    request = task.related_maintenance
    if not request:
        return None

    vendors = Vendor.objects.filter(
        organization=task.organization, is_active=True
    ).values_list("name", "category", "id")
    vendor_text = "\n".join([f"- {v[0]} (Category: {v[1]}, ID: {v[2]})" for v in vendors])

    context = f"""
Maintenance Request: {request.title}
Description: {request.description if hasattr(request, "description") else "No description"}
Unit: {request.unit}
Current Priority: {request.priority}
Submitted: {request.created_at.strftime("%b %d, %Y") if hasattr(request, "created_at") else "Unknown"}

Available Vendors:
{vendor_text}
"""

    system_prompt = """You are a property maintenance expert triaging a maintenance request.
Analyze the request and suggest:
1. The best vendor category and specific vendor from the list
2. Appropriate priority level (low/medium/high/emergency)
3. Estimated cost range
4. Recommended timeline for resolution

Return JSON with keys: "recommended_vendor_id" (int or null), "recommended_vendor_name" (string),
"suggested_priority" (string), "estimated_cost_low" (number), "estimated_cost_high" (number),
"timeline" (string like "1-2 days"), "reasoning" (string, 1-2 sentences)."""

    user_prompt = f"Triage this maintenance request:\n{context}"

    result = get_ai_json(system_prompt, user_prompt)
    return result


def execute_maintenance_triage(task):
    """Execute: create work order with AI-suggested vendor."""
    triage = generate_maintenance_triage(task)
    if not triage:
        return False, "Could not generate triage"

    request = task.related_maintenance
    if not request:
        return False, "No related maintenance request found"

    vendor = None
    vendor_id = _int_or_none(triage.get("recommended_vendor_id"))
    if vendor_id:
        try:
            vendor = Vendor.objects.get(id=vendor_id, organization=task.organization)
        except Vendor.DoesNotExist:
            vendor = None

    if not vendor:
        return (
            True,
            f"Triage complete but no vendor auto-assigned. Suggested: {triage.get('recommended_vendor_name', 'Unknown')}. {triage.get('reasoning', '')}",
        )

    estimated_cost = _to_decimal(
        triage.get("estimated_cost_high"),
        default=None,
    )

    try:
        WorkOrder.objects.create(
            organization=task.organization,
            maintenance_request=request,
            vendor=vendor,
            title=request.title,
            description=(
                "Auto-assigned by AI triage.\n\n"
                f"Reasoning: {triage.get('reasoning', '')}\n"
                f"Estimated cost: ${triage.get('estimated_cost_low', '?')} - ${triage.get('estimated_cost_high', '?')}\n"
                f"Timeline: {triage.get('timeline', 'TBD')}"
            ),
            priority=(triage.get("suggested_priority") or request.priority),
            estimated_cost=estimated_cost,
            property=request.property if hasattr(request, "property") else None,
            unit=request.unit if hasattr(request, "unit") else None,
        )
        return (
            True,
            f"Work order created — assigned to {vendor.name}. "
            f"Est. ${triage.get('estimated_cost_low')}-${triage.get('estimated_cost_high')}",
        )
    except Exception as e:
        logger.error("Failed to execute maintenance triage: %s", e)
        return False, str(e)


# =====================
# BOOKKEEPING AGENT
# =====================


def generate_transaction_categorization(task):
    """AI suggests which account a transaction should be categorized to."""
    bill = task.related_bill
    if not bill:
        return None

    categories = AccountingCategory.objects.filter(
        organization=task.organization,
        is_header=False,
        is_active=True,
    ).values_list("id", "account_code", "name", "account_type")
    account_text = "\n".join(
        [f"- {c[1]} {c[2]} (Type: {c[3]}, ID: {c[0]})" for c in categories]
    )

    context = f"""
Bill: #{bill.bill_number or bill.id}
Vendor: {bill.vendor.name} (Category: {bill.vendor.category})
Amount: ${bill.total_amount}
Description: {bill.description}
Property: {bill.property.name if bill.property else "Not specified"}

Chart of Accounts:
{account_text}
"""

    system_prompt = """You are a property management bookkeeper categorizing an expense.
Based on the vendor category, description, and amount, suggest the most appropriate expense account.
Return JSON with keys: "suggested_account_id" (int), "suggested_account_name" (string),
"reasoning" (string, 1 sentence), "confidence" (float 0-1)."""

    user_prompt = f"Categorize this expense:\n{context}"

    result = get_ai_json(system_prompt, user_prompt)
    return result


def execute_transaction_categorization(task):
    """Execute: set the bill's category to the AI suggestion."""
    categorization = generate_transaction_categorization(task)
    if not categorization:
        return False, "Could not generate categorization"

    bill = task.related_bill
    if not bill:
        return False, "No related bill found"

    account_id = _int_or_none(categorization.get("suggested_account_id"))
    if not account_id:
        return False, "No account suggested"

    try:
        category = AccountingCategory.objects.get(id=account_id, organization=task.organization)
    except AccountingCategory.DoesNotExist:
        return False, f"Suggested account ID {account_id} not found"

    try:
        bill.category = category
        bill.save(update_fields=["category"])
        return True, (
            f"Categorized as {category.account_code} — {category.name}. "
            f"Reasoning: {categorization.get('reasoning', '')}"
        )
    except Exception as e:
        logger.error("Failed to execute categorization: %s", e)
        return False, str(e)


# =====================
# COMPLIANCE AGENT
# =====================


def generate_renewal_offer(task):
    """AI drafts a lease renewal offer with suggested rent."""
    lease = task.related_lease
    tenant = task.related_tenant
    if not lease or not tenant:
        return None

    days_left = (lease.end_date - timezone.now().date()).days

    context = f"""
Tenant: {tenant.first_name} {tenant.last_name}
Current Rent: ${lease.monthly_rent}
Lease Start: {lease.start_date}
Lease End: {lease.end_date}
Days Until Expiration: {days_left}
Unit: {lease.unit.unit_number if lease.unit else "Unknown"}
Property: {lease.property.name if hasattr(lease, "property") and lease.property else "Unknown"}
"""

    system_prompt = """You are a property manager drafting a lease renewal offer.
Consider a typical 3-5% annual rent increase. Be professional and encouraging.
Return JSON with keys: "suggested_new_rent" (number), "rent_increase_pct" (number),
"subject" (string), "body" (string, the email body under 150 words),
"reasoning" (string, 1 sentence explaining the suggested increase)."""

    user_prompt = f"Draft a renewal offer:\n{context}"

    result = get_ai_json(system_prompt, user_prompt)
    if not result:
        increase = float(lease.monthly_rent) * 0.03
        new_rent = float(lease.monthly_rent) + increase
        result = {
            "suggested_new_rent": round(new_rent, 2),
            "rent_increase_pct": 3.0,
            "subject": f"Lease Renewal — Unit {lease.unit.unit_number if lease.unit else ''}",
            "body": (
                f"Dear {tenant.first_name},\n\n"
                f"Your current lease is expiring on {lease.end_date.strftime('%B %d, %Y')}. "
                "We'd love to have you continue as a tenant. We're offering a renewal at "
                f"${round(new_rent, 2)}/month (a 3% increase).\n\n"
                "Please let us know if you'd like to proceed.\n\n"
                "Best regards,\nManagement"
            ),
            "reasoning": "Standard 3% annual increase applied.",
        }
    return result


def execute_renewal_offer(task):
    """Execute: send renewal offer as message."""
    offer = generate_renewal_offer(task)
    if not offer:
        return False, "Could not generate renewal offer"

    tenant = task.related_tenant
    if not tenant:
        return False, "No related tenant found"

    sender = _message_sender(task)
    if not sender:
        return False, "No valid message sender configured"

    try:
        Message.objects.create(
            organization=task.organization,
            sender=sender,
            recipient_tenant=tenant,
            subject=(offer.get("subject") or "").strip(),
            body=(offer.get("body") or "").strip(),
        )
        return (
            True,
            f"Renewal offer sent to {tenant.first_name}. "
            f"Suggested rent: ${offer.get('suggested_new_rent', '?')} "
            f"({offer.get('rent_increase_pct', '?')}% increase). {offer.get('reasoning', '')}",
        )
    except Exception as e:
        logger.error("Failed to send renewal offer: %s", e)
        return False, str(e)


# =====================
# EXECUTOR ROUTER
# =====================

EXECUTORS = {
    "rent_overdue": execute_payment_reminder,
    "payment_reminder": execute_payment_reminder,
    "lead_follow_up": execute_lead_follow_up,
    "vendor_assignment": execute_maintenance_triage,
    "maintenance_triage": execute_maintenance_triage,
    "categorize_transaction": execute_transaction_categorization,
    "anomaly_detected": execute_transaction_categorization,
    "lease_expiring": execute_renewal_offer,
}

GENERATORS = {
    "rent_overdue": generate_payment_reminder,
    "payment_reminder": generate_payment_reminder,
    "lead_follow_up": generate_lead_follow_up,
    "vendor_assignment": generate_maintenance_triage,
    "maintenance_triage": generate_maintenance_triage,
    "categorize_transaction": generate_transaction_categorization,
    "anomaly_detected": generate_transaction_categorization,
    "lease_expiring": generate_renewal_offer,
}


def execute_task(task):
    """Route a task to its executor."""
    executor = EXECUTORS.get(task.task_type)
    if executor:
        return executor(task)
    return False, f"No executor for task type: {task.task_type}"


def generate_preview(task):
    """Generate AI preview content for a task without executing."""
    generator = GENERATORS.get(task.task_type)
    if generator:
        return generator(task)
    return None
