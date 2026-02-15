from datetime import timedelta
import json
import logging

from django.core.management.base import BaseCommand
from django.utils import timezone

from properties.agent_executors import generate_preview
from properties.models import (
    AgentSkill,
    AgentTask,
    Bill,
    Lease,
    Lead,
    MaintenanceRequest,
    Organization,
    Payment,
)

logger = logging.getLogger(__name__)


RESOLVED_STATUS_VALUES = [
    AgentTask.STATUS_APPROVED,
    AgentTask.STATUS_DISMISSED,
    AgentTask.STATUS_AUTO_RESOLVED,
]


def enhance_task_with_ai(task):
    """Optionally enhance a task's recommendation with AI content."""
    try:
        preview = generate_preview(task)
        if isinstance(preview, dict):
            task.recommended_action = json.dumps(preview)
            task.save(update_fields=["recommended_action"])
    except Exception as e:
        logger.warning("Could not enhance task %s with AI: %s", task.id, e)


def scan_collections(org, with_ai=False):
    """Collections Agent - find overdue rent"""
    active_leases = Lease.objects.filter(organization=org, is_active=True)
    created_count = 0
    for lease in active_leases:
        today = timezone.now().date()
        current_month_payment = Payment.objects.filter(
            lease=lease,
            payment_date__month=today.month,
            payment_date__year=today.year,
            status=Payment.STATUS_COMPLETED,
        ).exists()
        if current_month_payment or today.day <= 5:
            continue

        existing = AgentTask.objects.filter(
            organization=org,
            task_type="rent_overdue",
            related_lease=lease,
            status=AgentTask.STATUS_PENDING,
        ).exists()
        if existing:
            continue

        tenant = lease.tenant
        tenant_name = f"{tenant.first_name} {tenant.last_name}" if tenant else "Unknown tenant"
        unit_number = lease.unit.unit_number if lease.unit else "N/A"
        tenant_email = tenant.email if tenant else "tenant"

        task = AgentTask.objects.create(
            organization=org,
            skill=AgentSkill.objects.get(organization=org, skill_type="collections"),
            task_type="rent_overdue",
            title=f"Rent overdue: {tenant_name}",
            description=(
                f"No payment received for {today.strftime('%B %Y')} from {tenant_name} in "
                f"Unit {unit_number}. Monthly rent: ${lease.monthly_rent}."
            ),
            priority=AgentTask.PRIORITY_HIGH if today.day > 15 else AgentTask.PRIORITY_MEDIUM,
            recommended_action=(
                f"Send payment reminder to {tenant_email}. If no response within 3 days, "
                "consider applying late fee."
            ),
            confidence=0.95,
            related_tenant=tenant,
            related_lease=lease,
            related_property=lease.unit.property if lease.unit else None,
            related_unit=lease.unit,
        )
        if with_ai:
            enhance_task_with_ai(task)
        created_count += 1

    return created_count


def scan_compliance(org, with_ai=False):
    """Compliance Agent - find expiring leases"""
    threshold = timezone.now().date() + timedelta(days=60)
    expiring = Lease.objects.filter(
        organization=org,
        is_active=True,
        end_date__lte=threshold,
        end_date__gte=timezone.now().date(),
    )
    created_count = 0
    for lease in expiring:
        days_left = (lease.end_date - timezone.now().date()).days
        existing = AgentTask.objects.filter(
            organization=org,
            task_type="lease_expiring",
            related_lease=lease,
            status=AgentTask.STATUS_PENDING,
        ).exists()
        if existing:
            continue

        tenant = lease.tenant
        tenant_name = f"{tenant.first_name} {tenant.last_name}" if tenant else "Unknown tenant"
        unit_number = lease.unit.unit_number if lease.unit else "N/A"

        task = AgentTask.objects.create(
            organization=org,
            skill=AgentSkill.objects.get(organization=org, skill_type="compliance"),
            task_type="lease_expiring",
            title=f"Lease expiring in {days_left} days: {tenant_name}",
            description=(
                f"Lease for {tenant_name} in Unit {unit_number} expires on "
                f"{lease.end_date.strftime('%b %d, %Y')}."
            ),
            priority=(
                AgentTask.PRIORITY_URGENT
                if days_left <= 14
                else AgentTask.PRIORITY_HIGH
                if days_left <= 30
                else AgentTask.PRIORITY_MEDIUM
            ),
            recommended_action=(
                "Contact tenant about renewal. Consider adjusting rent based on market "
                "rates before offering renewal terms."
            ),
            confidence=1.0,
            related_tenant=tenant,
            related_lease=lease,
            related_unit=lease.unit,
        )
        if with_ai:
            enhance_task_with_ai(task)
        created_count += 1

    return created_count


def scan_maintenance(org, with_ai=False):
    """Maintenance Triage - unassigned requests"""
    open_requests = MaintenanceRequest.objects.filter(
        organization=org,
        status__in=[MaintenanceRequest.STATUS_SUBMITTED, MaintenanceRequest.STATUS_IN_PROGRESS],
    )
    created_count = 0
    for req in open_requests:
        has_work_order = req.work_orders.exists()
        if has_work_order:
            continue

        existing = AgentTask.objects.filter(
            organization=org,
            task_type="vendor_assignment",
            related_maintenance=req,
            status=AgentTask.STATUS_PENDING,
        ).exists()
        if existing:
            continue

        task = AgentTask.objects.create(
            organization=org,
            skill=AgentSkill.objects.get(organization=org, skill_type="maintenance"),
            task_type="vendor_assignment",
            title=f"Assign vendor: {req.title}",
            description=(
                f"Maintenance request '{req.title}' in Unit {req.unit} has no vendor "
                f"assigned. Priority: {req.priority}."
            ),
            priority=(
                AgentTask.PRIORITY_URGENT
                if req.priority == MaintenanceRequest.PRIORITY_EMERGENCY
                else AgentTask.PRIORITY_HIGH
                if req.priority == MaintenanceRequest.PRIORITY_HIGH
                else AgentTask.PRIORITY_MEDIUM
            ),
            recommended_action=(
                f"Assign a {req.priority}-priority vendor. Check vendor availability and "
                "estimated response time."
            ),
            confidence=0.85,
            related_maintenance=req,
        )
        if with_ai:
            enhance_task_with_ai(task)
        created_count += 1

    return created_count


def scan_leasing(org, with_ai=False):
    """Leasing Agent - stale leads"""
    stale_threshold = timezone.now() - timedelta(days=3)
    stale_leads = Lead.objects.filter(
        organization=org,
        stage__in=[Lead.STAGE_NEW, Lead.STAGE_CONTACTED],
        updated_at__lt=stale_threshold,
    )
    created_count = 0
    for lead in stale_leads:
        existing = AgentTask.objects.filter(
            organization=org,
            task_type="lead_follow_up",
            related_lead=lead,
            status=AgentTask.STATUS_PENDING,
        ).exists()
        if existing:
            continue

        days_stale = (timezone.now() - lead.updated_at).days
        property_name = lead.property.name if lead.property else "general inquiry"

        task = AgentTask.objects.create(
            organization=org,
            skill=AgentSkill.objects.get(organization=org, skill_type="leasing"),
            task_type="lead_follow_up",
            title=f"Follow up: {lead.first_name} {lead.last_name}",
            description=(
                f"Lead {lead.first_name} {lead.last_name} ({lead.source}) has had no "
                f"activity for {days_stale} days. Stage: {lead.stage}."
            ),
            priority=AgentTask.PRIORITY_HIGH if days_stale > 5 else AgentTask.PRIORITY_MEDIUM,
            recommended_action=(
                f"Send follow-up email or call {lead.phone}. Lead expressed interest in "
                f"{property_name}."
            ),
            confidence=0.8,
            related_lead=lead,
            related_property=lead.property,
            related_unit=lead.unit,
        )
        if with_ai:
            enhance_task_with_ai(task)
        created_count += 1

    return created_count


def scan_bookkeeping(org, with_ai=False):
    """Bookkeeping Agent - bills due soon"""
    upcoming = timezone.now().date() + timedelta(days=7)
    due_bills = Bill.objects.filter(
        organization=org,
        status__in=[Bill.STATUS_PENDING, Bill.STATUS_PARTIAL],
        due_date__lte=upcoming,
    )
    created_count = 0
    for bill in due_bills:
        days_until = (bill.due_date - timezone.now().date()).days
        existing = AgentTask.objects.filter(
            organization=org,
            task_type="categorize_transaction",
            related_bill=bill,
            status=AgentTask.STATUS_PENDING,
        ).exists()
        if existing:
            continue

        task_type = "anomaly_detected" if days_until < 0 else "categorize_transaction"
        description = (
            f"Bill #{bill.bill_number or bill.id} from {bill.vendor.name} for "
            f"${bill.total_amount} is {'due in ' + str(days_until) + ' days' if days_until >= 0 else str(abs(days_until)) + ' days overdue'}. "
            f"Balance: ${bill.balance_due}."
        )

        task = AgentTask.objects.create(
            organization=org,
            skill=AgentSkill.objects.get(organization=org, skill_type="bookkeeping"),
            task_type=task_type,
            title=(
                f"Bill due: {bill.vendor.name} - ${bill.balance_due}"
                if days_until >= 0
                else f"Overdue bill: {bill.vendor.name} - ${bill.balance_due}"
            ),
            description=description,
            priority=(
                AgentTask.PRIORITY_URGENT
                if days_until < 0
                else AgentTask.PRIORITY_HIGH
                if days_until <= 3
                else AgentTask.PRIORITY_MEDIUM
            ),
            recommended_action=(
                f"Review and schedule payment for ${bill.balance_due} to {bill.vendor.name}."
            ),
            confidence=0.95,
            related_bill=bill,
            related_property=bill.property,
        )
        if with_ai:
            enhance_task_with_ai(task)
        created_count += 1

    return created_count


AGENT_SCANNERS = {
    "leasing": scan_leasing,
    "collections": scan_collections,
    "maintenance": scan_maintenance,
    "bookkeeping": scan_bookkeeping,
    "compliance": scan_compliance,
    "rent_optimizer": lambda _org, with_ai=False: 0,
}


def sync_skill_counts(skill):
    skill.tasks_pending = AgentTask.objects.filter(
        skill=skill, status=AgentTask.STATUS_PENDING
    ).count()
    skill.tasks_completed = AgentTask.objects.filter(
        skill=skill, status__in=RESOLVED_STATUS_VALUES
    ).count()
    skill.save(update_fields=["tasks_pending", "tasks_completed"])


def ensure_agent_skills(organization):
    for skill_type, _ in AgentSkill.SKILL_CHOICES:
        AgentSkill.objects.get_or_create(
            organization=organization,
            skill_type=skill_type,
            defaults={"status": AgentSkill.STATUS_ACTIVE},
        )


def run_skill_scan(organization, skill, with_ai=False):
    scanner = AGENT_SCANNERS.get(skill.skill_type)
    if not scanner:
        return 0
    created = scanner(organization, with_ai=with_ai)
    skill.last_run_at = timezone.now()
    sync_skill_counts(skill)
    return created


def run_organization_scan(organization, with_ai=False):
    ensure_agent_skills(organization)

    now = timezone.now()
    created_total = 0
    for skill in AgentSkill.objects.filter(organization=organization):
        if skill.status == AgentSkill.STATUS_ACTIVE:
            scanner = AGENT_SCANNERS.get(skill.skill_type)
            if scanner:
                created_total += scanner(organization, with_ai=with_ai)
        skill.last_run_at = now
        sync_skill_counts(skill)

    return created_total


class Command(BaseCommand):
    help = "Run all active property AI agent scanners for every organization."

    def add_arguments(self, parser):
        parser.add_argument(
            "--with-ai",
            action="store_true",
            help="Enhance tasks with AI-generated content",
        )

    def handle(self, *args, **options):
        with_ai = options.get("with_ai", False)
        organizations = Organization.objects.all().order_by("id")
        if not organizations.exists():
            self.stdout.write(self.style.WARNING("No organizations found."))
            return

        total_created = 0
        for organization in organizations:
            created_count = run_organization_scan(organization, with_ai=with_ai)
            total_created += created_count
            self.stdout.write(
                f"Scanned org {organization.id}: created {created_count} new tasks"
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Agent scans complete. Organizations: {organizations.count()}, "
                f"new tasks: {total_created}"
            )
        )

