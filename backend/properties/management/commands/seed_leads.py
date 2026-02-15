import random
from datetime import date, timedelta

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from properties.models import (
    Lead,
    LeadActivity,
    Organization,
    Property,
    RentalApplication,
    Tenant,
    Unit,
    UserProfile,
)


class Command(BaseCommand):
    help = "Seed realistic lead data for the lead pipeline."

    def add_arguments(self, parser):
        parser.add_argument(
            "--username",
            type=str,
            default=None,
            help="Optional user to attribute created lead activities.",
        )

    def handle(self, *args, **options):
        username = options.get("username")
        actor, organization = self._resolve_seed_target(username)

        properties = list(Property.objects.filter(organization=organization))
        units = list(Unit.objects.filter(organization=organization))
        tenants = list(Tenant.objects.filter(organization=organization))
        applications = list(RentalApplication.objects.filter(organization=organization))

        if not properties:
            raise CommandError("No properties found for target organization.")
        if not units:
            raise CommandError("No units found for target organization.")

        today = timezone.now()
        lead_plan = [
            (Lead.STAGE_NEW, 4),
            (Lead.STAGE_CONTACTED, 3),
            (Lead.STAGE_TOUR_SCHEDULED, 3),
            (Lead.STAGE_TOUR_COMPLETED, 2),
            (Lead.STAGE_APPLIED, 2),
            (Lead.STAGE_LEASED, 2),
            (Lead.STAGE_LOST, 1),
        ]

        with transaction.atomic():
            lead_count = 0
            activity_count = 0

            for stage, count in lead_plan:
                for _ in range(count):
                    lead = self._create_lead(
                        organization=organization,
                        actor=actor,
                        properties=properties,
                        units=units,
                        tenants=tenants,
                        applications=applications,
                        stage=stage,
                        today=today,
                    )
                    lead_count += 1
                    activity_count += self._create_lead_activities(
                        lead=lead,
                        stage=stage,
                        actor=actor,
                    )

            self.stdout.write(self.style.SUCCESS(f"Seeded {lead_count} leads with {activity_count} activities."))

    def _resolve_seed_target(self, username):
        if username:
            user = User.objects.filter(username=username).first()
            if not user:
                raise CommandError(f"User '{username}' not found.")
            profile = getattr(user, "profile", None)
            if not profile or not profile.organization:
                raise CommandError(
                    f"User '{username}' is not associated with an organization."
                )
            return user, profile.organization

        organization = self._resolve_seed_organization()
        if organization:
            actor = organization.owner
            if not actor:
                actor = User.objects.filter(profile__organization=organization).order_by("id").first()
            if not actor:
                actor = User.objects.filter(is_superuser=True).order_by("id").first()
            if actor:
                return actor, organization

        fallback_user = User.objects.filter(profile__organization__isnull=False).order_by("id").first()
        if not fallback_user:
            raise CommandError("No users with organization found for seed target.")
        return fallback_user, fallback_user.profile.organization

    @staticmethod
    def _resolve_seed_organization():
        # Prefer an organization that has at least one property and one unit.
        org_with_units = Organization.objects.filter(
            id__in=Unit.objects.values_list("organization_id", flat=True).exclude(organization_id__isnull=True)
        ).filter(
            id__in=Property.objects.values_list("organization_id", flat=True).exclude(organization_id__isnull=True)
        )
        if org_with_units.exists():
            return org_with_units.order_by("id").first()

        # Fallback to any organization with at least a property.
        return Organization.objects.filter(
            id__in=Property.objects.values_list("organization_id", flat=True).exclude(organization_id__isnull=True)
        ).order_by("id").first()

    def _create_lead(
        self,
        *,
        organization,
        actor,
        properties,
        units,
        tenants,
        applications,
        stage,
        today,
    ):
        source = random.choice(
            [
                Lead.SOURCE_LISTING,
                Lead.SOURCE_ZILLOW,
                Lead.SOURCE_APARTMENTS_COM,
                Lead.SOURCE_REALTOR_COM,
                Lead.SOURCE_REFERRAL,
                Lead.SOURCE_PHONE,
                Lead.SOURCE_WALK_IN,
            ]
        )
        lead_property = random.choice(properties)
        property_units = [unit for unit in units if unit.property_id == lead_property.id]
        lead_unit = random.choice(property_units) if property_units else random.choice(units)
        first_name = random.choice(
            [
                "Alex",
                "Jordan",
                "Maya",
                "Noah",
                "Avery",
                "Kai",
                "Liam",
                "Riley",
            ]
        )
        last_name = random.choice(
            [
                "Carter",
                "Mills",
                "Hughes",
                "Sloane",
                "Parker",
                "Bennett",
                "Reed",
                "Diaz",
            ]
        )
        lead = Lead.objects.create(
            organization=organization,
            first_name=first_name,
            last_name=last_name,
            email=f"{first_name.lower()}.{last_name.lower()}@example.com",
            phone=f"(865) {random.randint(200, 899)}-{random.randint(1000, 9999)}",
            source=source,
            stage=stage,
            priority=random.choice(
                [Lead.PRIORITY_COLD, Lead.PRIORITY_WARM, Lead.PRIORITY_HOT]
            ),
            property=lead_property,
            unit=lead_unit,
            desired_move_in=(today + timedelta(days=random.randint(7, 45))).date(),
            budget_min=1200 + random.randint(0, 150),
            budget_max=2200 + random.randint(0, 600),
            bedrooms_needed=random.choice([1, 2, 3]),
            assigned_to=actor,
            tour_notes="Initial tour preference to be confirmed."
            if stage in {Lead.STAGE_TOUR_SCHEDULED, Lead.STAGE_TOUR_COMPLETED}
            else "",
            notes="Seeded lead.",
            last_contacted_at=timezone.now() - timedelta(days=random.randint(0, 5)),
            lost_reason=(
                random.choice(["Found another apartment", "Budget too high", "Decided elsewhere"])
                if stage == Lead.STAGE_LOST
                else ""
            ),
        )

        if stage in {Lead.STAGE_APPLIED, Lead.STAGE_LEASED} and applications:
            lead.application = random.choice(applications)
        if stage in {Lead.STAGE_TOUR_SCHEDULED, Lead.STAGE_TOUR_COMPLETED}:
            lead.tour_date = timezone.now() + timedelta(
                days=random.randint(1, 7) if stage == Lead.STAGE_TOUR_SCHEDULED else -random.randint(1, 5)
            )
        if stage == Lead.STAGE_LEASED and tenants:
            lead.tenant = random.choice(tenants)
        lead.save(
            update_fields=[
                "tour_date",
                "application",
                "tenant",
                "lost_reason",
            ]
        )
        return lead

    def _create_lead_activities(self, *, lead, stage, actor):
        count = 0
        self._create_activity(
            lead=lead,
            created_by=actor,
            activity_type=LeadActivity.ACTIVITY_TYPE_NOTE,
            subject="Initial inquiry",
            description="Lead submitted an initial inquiry from the website/portal.",
        )
        count += 1

        self._create_activity(
            lead=lead,
            created_by=actor,
            activity_type=random.choice(
                [LeadActivity.ACTIVITY_TYPE_EMAIL_SENT, LeadActivity.ACTIVITY_TYPE_PHONE_CALL]
            ),
            subject="Follow-up",
            description="Reached out to lead for initial follow-up.",
        )
        count += 1

        if stage != Lead.STAGE_NEW:
            stage_name = dict(Lead.STAGE_CHOICES).get(stage, stage)
            self._create_activity(
                lead=lead,
                created_by=actor,
                activity_type=LeadActivity.ACTIVITY_TYPE_STAGE_CHANGE,
                subject="Stage change",
                description=f"Lead moved to {stage_name}.",
            )
            count += 1

        if stage == Lead.STAGE_TOUR_SCHEDULED:
            self._create_activity(
                lead=lead,
                created_by=actor,
                activity_type=LeadActivity.ACTIVITY_TYPE_TOUR_SCHEDULED,
                subject="Tour scheduled",
                description=f"Tour scheduled for {lead.tour_date}.",
            )
            count += 1

        if stage == Lead.STAGE_TOUR_COMPLETED:
            self._create_activity(
                lead=lead,
                created_by=actor,
                activity_type=LeadActivity.ACTIVITY_TYPE_TOUR_SCHEDULED,
                subject="Tour scheduled",
                description=f"Tour scheduled for {lead.tour_date}.",
            )
            self._create_activity(
                lead=lead,
                created_by=actor,
                activity_type=LeadActivity.ACTIVITY_TYPE_TOUR_COMPLETED,
                subject="Tour completed",
                description="Tour completed with lead.",
            )
            count += 2

        if stage == Lead.STAGE_APPLIED:
            self._create_activity(
                lead=lead,
                created_by=actor,
                activity_type=LeadActivity.ACTIVITY_TYPE_APPLICATION_SUBMITTED,
                subject="Application submitted",
                description="Lead converted to application pipeline.",
            )
            count += 1

        if stage == Lead.STAGE_LEASED:
            self._create_activity(
                lead=lead,
                created_by=actor,
                activity_type=LeadActivity.ACTIVITY_TYPE_NOTE,
                subject="Lease signed",
                description="Lead is now leased and moved to active lease status.",
            )
            count += 1

        if stage == Lead.STAGE_LOST:
            self._create_activity(
                lead=lead,
                created_by=actor,
                activity_type=LeadActivity.ACTIVITY_TYPE_FOLLOW_UP,
                subject="Lost reason",
                description=f"Marked lost because: {lead.lost_reason}",
            )
            count += 1

        return count

    def _create_activity(self, *, lead, created_by, activity_type, subject, description):
        LeadActivity.objects.create(
            lead=lead,
            activity_type=activity_type,
            created_by=created_by,
            subject=subject,
            description=description,
            body="",
        )
