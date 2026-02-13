import random
from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from properties.models import (
    Document,
    Expense,
    LateFeeRule,
    Lease,
    MaintenanceRequest,
    Message,
    Notification,
    Organization,
    Payment,
    Property,
    RentLedgerEntry,
    ScreeningRequest,
    Tenant,
    Unit,
    UserProfile,
)
from properties.signals import recalculate_lease_balances


class Command(BaseCommand):
    help = "Populate Onyx PM with realistic demo data."

    def add_arguments(self, parser):
        parser.add_argument(
            "--username",
            type=str,
            help="Seed data into the organization owned/used by this user.",
            default=None,
        )

    def handle(self, *args, **options):
        target_username = options.get("username")

        random.seed(42)
        today = timezone.now().date()

        with transaction.atomic():
            actor, organization = self._resolve_seed_target(target_username)
            self.stdout.write(
                f"Using seed actor: {actor.username} ({actor.email})"
            )
            self.stdout.write(
                f"Using seed organization: {organization.name} ({organization.slug})"
            )

            self.stdout.write("Clearing existing demo data (keeping superusers)...")
            self._clear_existing_data(organization)

            properties = self._create_properties(organization)
            self.stdout.write(self.style.SUCCESS(f"Created {len(properties)} properties"))

            units = self._create_units(properties, organization)
            occupied_units = [u for u in units if not u.is_available]
            self.stdout.write(
                self.style.SUCCESS(
                    f"Created {len(units)} units ({len(occupied_units)} occupied)"
                )
            )

            tenants = self._create_tenants(organization)
            self.stdout.write(self.style.SUCCESS(f"Created {len(tenants)} tenants"))

            tenant_users = self._create_tenant_users(tenants, organization)
            self.stdout.write(self.style.SUCCESS(f"Created {len(tenant_users)} tenant users"))

            leases = self._create_leases(occupied_units, tenants, today, organization)
            active_leases = [lease for lease in leases if lease.is_active]
            self.stdout.write(
                self.style.SUCCESS(
                    f"Created {len(leases)} leases ({len(active_leases)} active)"
                )
            )

            self._create_late_fee_rules(properties, organization)
            self.stdout.write(self.style.SUCCESS("Created late fee rules for all properties"))

            payments = self._create_payments(leases, today, organization)
            completed_payments = [p for p in payments if p.status == Payment.STATUS_COMPLETED]
            failed_payments = [p for p in payments if p.status == Payment.STATUS_FAILED]
            self.stdout.write(
                self.style.SUCCESS(
                    f"Created {len(payments)} payments ({len(completed_payments)} completed, "
                    f"{len(failed_payments)} failed)"
                )
            )

            maintenance_requests = self._create_maintenance_requests(
                units, leases, tenants, organization, today
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f"Created {len(maintenance_requests)} maintenance requests"
                )
            )

            charge_count, late_fee_count = self._create_rent_ledger_entries(
                active_leases, today, organization
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f"Created {charge_count} charge entries and {late_fee_count} late fee entries"
                )
            )

            documents = self._create_documents(
                actor, properties, units, tenants, leases, organization
            )
            self.stdout.write(self.style.SUCCESS(f"Created {len(documents)} documents"))

            expenses = self._create_expenses(
                actor, properties, units, documents, organization, today
            )
            self.stdout.write(self.style.SUCCESS(f"Created {len(expenses)} expenses"))

            screenings = self._create_screenings(actor, tenants, organization)
            self.stdout.write(self.style.SUCCESS(f"Created {len(screenings)} screening requests"))

            notifications = self._create_notifications(
                actor, tenant_users, leases, organization, today
            )
            self.stdout.write(
                self.style.SUCCESS(f"Created {len(notifications)} notifications")
            )

            messages = self._create_messages(actor, tenant_users, organization, today)
            self.stdout.write(self.style.SUCCESS(f"Created {len(messages)} messages"))

        self.stdout.write(self.style.SUCCESS("Seed complete. Run with: python manage.py seed_data"))

    def _clear_existing_data(self, organization):
        if not organization:
            return

        Message.objects.filter(organization=organization).delete()
        Notification.objects.filter(organization=organization).delete()
        RentLedgerEntry.objects.filter(organization=organization).delete()
        Expense.objects.filter(organization=organization).delete()
        LateFeeRule.objects.filter(organization=organization).delete()
        ScreeningRequest.objects.filter(organization=organization).delete()
        Document.objects.filter(organization=organization).delete()
        Payment.objects.filter(organization=organization).delete()
        MaintenanceRequest.objects.filter(organization=organization).delete()
        Lease.objects.filter(organization=organization).delete()
        Unit.objects.filter(organization=organization).delete()
        Property.objects.filter(organization=organization).delete()
        Tenant.objects.filter(organization=organization).delete()
        UserProfile.objects.filter(
            organization=organization
        ).exclude(user__is_superuser=True).delete()
        User.objects.filter(
            profile__organization=organization,
            is_superuser=False,
        ).delete()

    def _resolve_seed_target(self, username):
        if not username:
            return self._ensure_seed_admin_and_org()

        user = User.objects.filter(username=username).first()
        if not user:
            raise CommandError(f"User '{username}' not found.")

        profile = getattr(user, "profile", None)
        if not profile or not profile.organization:
            raise CommandError(
                f"User '{username}' does not belong to an organization."
            )

        self.stdout.write(
            f"Resolved seed target from --username: {user.username}"
        )
        return user, profile.organization

    def _ensure_seed_admin_and_org(self):
        admin = User.objects.filter(is_superuser=True).order_by("id").first()
        if not admin:
            admin = User.objects.create_superuser(
                username="admin",
                email="admin@onyx-pm.com",
                password="Admin2026!",
                first_name="Onyx",
                last_name="Admin",
            )
        profile, _ = UserProfile.objects.get_or_create(
            user=admin,
            defaults={
                "role": UserProfile.ROLE_LANDLORD,
                "is_org_admin": True,
            },
        )
        profile.role = UserProfile.ROLE_LANDLORD
        profile.is_org_admin = True
        profile.tenant = None
        profile.save(update_fields=["role", "is_org_admin", "tenant"])

        organization = Organization.objects.filter(
            name="Demo Properties",
            owner=admin,
        ).first()
        if not organization:
            organization = Organization.objects.create(
                name="Demo Properties",
                owner=admin,
            )
        organization.owner = admin
        organization.save(update_fields=["owner"])

        profile.organization = organization
        profile.save(update_fields=["organization"])
        return admin, organization

    def _create_properties(self, organization):
        property_seed = [
            {
                "name": "Riverside Apartments",
                "address_line1": "1824 Riverside Drive",
                "city": "Knoxville",
                "state": "TN",
                "zip_code": "37915",
                "property_type": Property.PROPERTY_TYPE_RESIDENTIAL,
            },
            {
                "name": "Oak Park Townhomes",
                "address_line1": "7412 Oak Park Lane",
                "city": "Knoxville",
                "state": "TN",
                "zip_code": "37919",
                "property_type": Property.PROPERTY_TYPE_RESIDENTIAL,
            },
            {
                "name": "Commerce Plaza",
                "address_line1": "500 Clinch Avenue",
                "city": "Knoxville",
                "state": "TN",
                "zip_code": "37902",
                "property_type": Property.PROPERTY_TYPE_COMMERCIAL,
            },
            {
                "name": "Maple Ridge Condos",
                "address_line1": "3906 Maple Ridge Way",
                "city": "Knoxville",
                "state": "TN",
                "zip_code": "37921",
                "property_type": Property.PROPERTY_TYPE_RESIDENTIAL,
            },
            {
                "name": "Downtown Lofts",
                "address_line1": "112 S Central Street",
                "city": "Knoxville",
                "state": "TN",
                "zip_code": "37902",
                "property_type": Property.PROPERTY_TYPE_RESIDENTIAL,
            },
            {
                "name": "Sunset Villas",
                "address_line1": "2680 Sunset Boulevard",
                "city": "Knoxville",
                "state": "TN",
                "zip_code": "37918",
                "property_type": Property.PROPERTY_TYPE_RESIDENTIAL,
            },
            {
                "name": "Pinnacle Office Center",
                "address_line1": "9200 Kingston Pike",
                "city": "Knoxville",
                "state": "TN",
                "zip_code": "37922",
                "property_type": Property.PROPERTY_TYPE_COMMERCIAL,
            },
            {
                "name": "Harbor View Residences",
                "address_line1": "1440 Sequoyah Avenue",
                "city": "Knoxville",
                "state": "TN",
                "zip_code": "37920",
                "property_type": Property.PROPERTY_TYPE_RESIDENTIAL,
            },
        ]

        properties = []
        for payload in property_seed:
            description = (
                "Modern mixed-use asset with strong occupancy and convenient Knoxville access."
                if payload["property_type"] == Property.PROPERTY_TYPE_COMMERCIAL
                else "Well-maintained community in a high-demand Knoxville neighborhood."
            )
            properties.append(
                Property.objects.create(
                    organization=organization,
                    description=description,
                    **payload,
                )
            )
        return properties

    def _create_units(self, properties, organization):
        units_per_property = [5, 4, 4, 5, 4, 3, 4, 4]
        units = []
        for prop, count in zip(properties, units_per_property):
            for idx in range(1, count + 1):
                if prop.property_type == Property.PROPERTY_TYPE_COMMERCIAL:
                    unit = Unit.objects.create(
                        property=prop,
                        organization=organization,
                        unit_number=f"Suite {100 + idx}",
                        bedrooms=0,
                        bathrooms=Decimal("1.0"),
                        square_feet=random.randint(1100, 5000),
                        rent_amount=self._money(random.randint(1800, 6500)),
                        is_available=True,
                    )
                else:
                    bedrooms = random.choice([1, 1, 2, 2, 3])
                    bathrooms = random.choice(
                        [Decimal("1.0"), Decimal("1.0"), Decimal("1.5"), Decimal("2.0")]
                    )
                    sq_ft = random.randint(550, 1500)
                    base_rent = 700 + bedrooms * 350 + int((sq_ft - 500) * 0.45)
                    rent = min(max(base_rent + random.randint(-120, 140), 800), 2200)
                    unit = Unit.objects.create(
                        property=prop,
                        organization=organization,
                        unit_number=str(100 + idx),
                        bedrooms=bedrooms,
                        bathrooms=bathrooms,
                        square_feet=sq_ft,
                        rent_amount=self._money(rent),
                        is_available=True,
                    )
                units.append(unit)

        occupied_count = int(round(len(units) * 0.8))
        for unit in random.sample(units, occupied_count):
            unit.is_available = False
            unit.save(update_fields=["is_available"])
        return units

    def _create_tenants(self, organization):
        tenant_data = [
            ("Liam", "Carter"),
            ("Olivia", "Bennett"),
            ("Noah", "Mitchell"),
            ("Emma", "Reed"),
            ("Elijah", "Brooks"),
            ("Ava", "Coleman"),
            ("James", "Bryant"),
            ("Sophia", "Hayes"),
            ("Benjamin", "Foster"),
            ("Isabella", "Price"),
            ("Lucas", "Ward"),
            ("Mia", "Sullivan"),
            ("Henry", "Parker"),
            ("Charlotte", "Murphy"),
            ("Alexander", "Powell"),
            ("Amelia", "Russell"),
            ("Michael", "Long"),
            ("Harper", "Jenkins"),
            ("Daniel", "Griffin"),
            ("Evelyn", "Perry"),
            ("Matthew", "Hughes"),
            ("Abigail", "Washington"),
            ("Joseph", "Henderson"),
            ("Ella", "Gibson"),
            ("Samuel", "Hamilton"),
            ("Scarlett", "Ford"),
            ("David", "Mason"),
            ("Aria", "West"),
            ("Andrew", "Fisher"),
            ("Lily", "Owens"),
        ]

        tenants = []
        for idx, (first_name, last_name) in enumerate(tenant_data, start=1):
            tenants.append(
                Tenant.objects.create(
                    organization=organization,
                    first_name=first_name,
                    last_name=last_name,
                    email=f"{first_name.lower()}.{last_name.lower()}{idx}@example.com",
                    phone=f"(865) {random.randint(200, 899)}-{random.randint(1000, 9999)}",
                    date_of_birth=date(
                        random.randint(1970, 2003),
                        random.randint(1, 12),
                        random.randint(1, 28),
                    ),
                )
            )
        return tenants
    def _create_tenant_users(self, tenants, organization):
        tenant_users = []
        for tenant in tenants[:22]:
            username = f"{tenant.first_name.lower()}.{tenant.last_name.lower()}"
            user = User.objects.create_user(
                username=f"{username}{tenant.id}",
                email=tenant.email,
                password="tenant123!",
                first_name=tenant.first_name,
                last_name=tenant.last_name,
            )
            profile = user.profile
            profile.organization = organization
            profile.role = UserProfile.ROLE_TENANT
            profile.tenant = tenant
            profile.is_org_admin = False
            profile.save(update_fields=["organization", "role", "tenant", "is_org_admin"])
            tenant_users.append(user)
        return tenant_users

    def _create_leases(self, occupied_units, tenants, today, organization):
        leases = []
        tenant_pool = tenants[:]
        random.shuffle(tenant_pool)
        for index, unit in enumerate(occupied_units):
            tenant = tenant_pool[index % len(tenant_pool)]
            start_days_ago = random.randint(20, 400)
            start_date = today - timedelta(days=start_days_ago)
            end_date = start_date + timedelta(days=365)
            is_active = end_date >= today and random.random() > 0.08
            leases.append(
                Lease.objects.create(
                    unit=unit,
                    tenant=tenant,
                    organization=organization,
                    start_date=start_date,
                    end_date=end_date,
                    monthly_rent=unit.rent_amount,
                    security_deposit=unit.rent_amount,
                    is_active=is_active,
                )
            )
        return leases

    def _create_late_fee_rules(self, properties, organization):
        for prop in properties:
            LateFeeRule.objects.create(
                property=prop,
                organization=organization,
                grace_period_days=5,
                fee_type=(
                    LateFeeRule.TYPE_PERCENTAGE
                    if random.random() > 0.4
                    else LateFeeRule.TYPE_FLAT
                ),
                fee_amount=self._money(random.choice([5, 7, 8, 10, 75, 100])),
                max_fee=self._money(150),
                is_active=True,
            )

    def _create_payments(self, leases, today, organization):
        payments = []
        failed_budget = 3
        method_choices = [
            Payment.PAYMENT_METHOD_BANK_TRANSFER,
            Payment.PAYMENT_METHOD_BANK_TRANSFER,
            Payment.PAYMENT_METHOD_BANK_TRANSFER,
            Payment.PAYMENT_METHOD_CREDIT_CARD,
            Payment.PAYMENT_METHOD_CHECK,
            Payment.PAYMENT_METHOD_CASH,
        ]
        for lease in leases:
            start_month = date(lease.start_date.year, lease.start_date.month, 1)
            current_month = date(today.year, today.month, 1)
            month_cursor = current_month
            month_count = random.randint(6, 12)
            lease_months = []
            while month_cursor >= start_month and len(lease_months) < month_count:
                lease_months.append(month_cursor)
                month_cursor = self._prev_month(month_cursor)
            lease_months.reverse()

            for month_start in lease_months:
                due_date = self._lease_due_date(lease.start_date.day, month_start)
                if random.random() < 0.12:
                    if failed_budget > 0 and random.random() < 0.45:
                        failed_budget -= 1
                        payments.append(
                            Payment.objects.create(
                                lease=lease,
                                organization=organization,
                                amount=lease.monthly_rent,
                                payment_date=due_date + timedelta(days=random.randint(0, 7)),
                                payment_method=random.choice(method_choices),
                                status=Payment.STATUS_FAILED,
                                notes="Insufficient funds",
                            )
                        )
                    continue

                late = random.random() < 0.18
                offset_days = random.randint(6, 14) if late else random.randint(0, 2)
                payments.append(
                    Payment.objects.create(
                        lease=lease,
                        organization=organization,
                        amount=lease.monthly_rent,
                        payment_date=due_date + timedelta(days=offset_days),
                        payment_method=random.choice(method_choices),
                        status=Payment.STATUS_COMPLETED,
                        stripe_payment_intent_id=f"pi_seed_{lease.id}_{month_start.year}{month_start.month:02d}",
                        notes="Paid online" if random.random() > 0.5 else "",
                    )
                )
        return payments

    def _create_maintenance_requests(self, units, leases, tenants, organization, today):
        request_templates = [
            ("Leaking faucet in kitchen", "Water dripping continuously under sink."),
            ("AC not cooling", "Air conditioner runs but does not cool apartment."),
            ("Broken window latch", "Bedroom window does not lock securely."),
            ("Garbage disposal jammed", "Disposal hums but blades do not turn."),
            ("Water heater making noise", "Loud rumbling sound when hot water runs."),
            ("Parking lot light out", "Pole light near Building B is not working."),
            ("Mold in bathroom", "Dark spots around shower caulking."),
            ("Dryer not heating", "Dryer tumbles but clothes remain damp."),
            ("Front door lock sticking", "Deadbolt requires force to lock/unlock."),
            ("Dishwasher leaking", "Water pooling at base during cycle."),
        ]
        priorities = [
            MaintenanceRequest.PRIORITY_LOW,
            MaintenanceRequest.PRIORITY_MEDIUM,
            MaintenanceRequest.PRIORITY_HIGH,
            MaintenanceRequest.PRIORITY_EMERGENCY,
        ]
        statuses = [
            MaintenanceRequest.STATUS_SUBMITTED,
            MaintenanceRequest.STATUS_IN_PROGRESS,
            MaintenanceRequest.STATUS_COMPLETED,
            MaintenanceRequest.STATUS_CANCELLED,
        ]

        leases_by_unit_id = {lease.unit_id: lease for lease in leases}
        requests = []
        for _ in range(random.randint(15, 20)):
            unit = random.choice(units)
            lease = leases_by_unit_id.get(unit.id)
            tenant = lease.tenant if lease else random.choice(tenants)
            title, desc = random.choice(request_templates)
            requests.append(
                MaintenanceRequest.objects.create(
                    unit=unit,
                    tenant=tenant,
                    organization=organization,
                    title=title,
                    description=desc,
                    priority=random.choice(priorities),
                    status=random.choice(statuses),
                )
            )
        return requests

    def _create_rent_ledger_entries(self, active_leases, today, organization):
        charge_count = 0
        late_fee_count = 0

        completed_by_lease_month = {}
        completed = Payment.objects.filter(
            status=Payment.STATUS_COMPLETED,
            organization=organization,
        ).select_related("lease")
        for payment in completed:
            key = (payment.lease_id, payment.payment_date.year, payment.payment_date.month)
            if key not in completed_by_lease_month:
                completed_by_lease_month[key] = payment

        for lease in active_leases:
            start_month = date(lease.start_date.year, lease.start_date.month, 1)
            end_month = date(today.year, today.month, 1)
            month_cursor = start_month
            while month_cursor <= end_month:
                due_date = self._lease_due_date(lease.start_date.day, month_cursor)
                description = due_date.strftime("%B %Y Rent")
                if not RentLedgerEntry.objects.filter(
                    lease=lease,
                    organization=organization,
                    entry_type=RentLedgerEntry.TYPE_CHARGE,
                    date=due_date,
                    description=description,
                ).exists():
                    RentLedgerEntry.objects.create(
                        lease=lease,
                        organization=organization,
                        entry_type=RentLedgerEntry.TYPE_CHARGE,
                        description=description,
                        amount=lease.monthly_rent,
                        balance=Decimal("0.00"),
                        date=due_date,
                    )
                    charge_count += 1

                payment = completed_by_lease_month.get((lease.id, month_cursor.year, month_cursor.month))
                if payment and payment.payment_date > (due_date + timedelta(days=5)):
                    late_fee_amount = self._money(lease.monthly_rent * Decimal("0.05"))
                    late_fee_desc = due_date.strftime("%B %Y Late Fee")
                    if not RentLedgerEntry.objects.filter(
                        lease=lease,
                        organization=organization,
                        entry_type=RentLedgerEntry.TYPE_LATE_FEE,
                        date=payment.payment_date,
                        description=late_fee_desc,
                    ).exists():
                        RentLedgerEntry.objects.create(
                            lease=lease,
                            organization=organization,
                            entry_type=RentLedgerEntry.TYPE_LATE_FEE,
                            description=late_fee_desc,
                            amount=late_fee_amount,
                            balance=Decimal("0.00"),
                            date=payment.payment_date,
                        )
                        late_fee_count += 1

                month_cursor = self._next_month(month_cursor)

            recalculate_lease_balances(lease.id)

        return charge_count, late_fee_count
    def _create_documents(self, actor, properties, units, tenants, leases, organization):
        doc_seed = [
            ("Lease Agreement - Unit 101.pdf", Document.TYPE_LEASE_AGREEMENT),
            ("Move-in Inspection - Harbor View 3B.pdf", Document.TYPE_INSPECTION_REPORT),
            ("Insurance Certificate 2026.pdf", Document.TYPE_INSURANCE),
            ("Property Tax Statement Q1 2026.pdf", Document.TYPE_TAX_DOCUMENT),
            ("Late Payment Notice - Unit 204.pdf", Document.TYPE_NOTICE),
            ("Plumbing Repair Receipt - March 2026.pdf", Document.TYPE_RECEIPT),
            ("Exterior Photo - Building A.jpg", Document.TYPE_PHOTO),
            ("Emergency Contact Protocol.docx", Document.TYPE_OTHER),
            ("Lease Template - Residential.pdf", Document.TYPE_LEASE_AGREEMENT),
            ("Inspection Checklist Template.docx", Document.TYPE_INSPECTION_REPORT),
            ("Roof Repair Receipt.pdf", Document.TYPE_RECEIPT),
            ("Parking Policy Notice.pdf", Document.TYPE_NOTICE),
        ]
        documents = []
        for idx, (name, doc_type) in enumerate(doc_seed, start=1):
            filename = name.lower().replace(" ", "_")
            ext = filename.split(".")[-1]
            chosen_property = random.choice(properties)
            chosen_unit = random.choice(
                [u for u in units if u.property_id == chosen_property.id] or units
            )
            chosen_tenant = random.choice(tenants)
            chosen_lease = random.choice(leases)
            documents.append(
                Document.objects.create(
                    organization=organization,
                    name=name,
                    file=f"documents/{filename}",
                    document_type=doc_type,
                    description="Seeded demo document",
                    uploaded_by=actor,
                    property=chosen_property,
                    unit=chosen_unit,
                    tenant=chosen_tenant,
                    lease=chosen_lease,
                    is_template=idx in (9, 10),
                    file_size=random.randint(45_000, 2_500_000),
                    file_type=ext,
                )
            )
        return documents

    def _create_expenses(self, actor, properties, units, documents, organization, today):
        categories = [
            Expense.CATEGORY_MAINTENANCE,
            Expense.CATEGORY_INSURANCE,
            Expense.CATEGORY_TAXES,
            Expense.CATEGORY_UTILITIES,
            Expense.CATEGORY_MANAGEMENT_FEE,
            Expense.CATEGORY_LANDSCAPING,
        ]
        expense_descriptions = {
            Expense.CATEGORY_MAINTENANCE: "General repair and maintenance service",
            Expense.CATEGORY_INSURANCE: "Monthly property insurance premium",
            Expense.CATEGORY_TAXES: "Quarterly property tax payment",
            Expense.CATEGORY_UTILITIES: "Water, electric, and waste utility bill",
            Expense.CATEGORY_MANAGEMENT_FEE: "Monthly property management fee",
            Expense.CATEGORY_LANDSCAPING: "Landscaping and exterior grounds service",
        }
        expense_amount_ranges = {
            Expense.CATEGORY_MAINTENANCE: (50, 500),
            Expense.CATEGORY_INSURANCE: (100, 300),
            Expense.CATEGORY_TAXES: (500, 2000),
            Expense.CATEGORY_UTILITIES: (100, 400),
            Expense.CATEGORY_MANAGEMENT_FEE: (250, 900),
            Expense.CATEGORY_LANDSCAPING: (150, 600),
        }
        receipt_docs = [doc for doc in documents if doc.document_type == Document.TYPE_RECEIPT]
        expenses = []
        for _ in range(random.randint(30, 40)):
            prop = random.choice(properties)
            category = random.choice(categories)
            min_amt, max_amt = expense_amount_ranges[category]
            recurring = category in {
                Expense.CATEGORY_INSURANCE,
                Expense.CATEGORY_UTILITIES,
                Expense.CATEGORY_MANAGEMENT_FEE,
            }
            expenses.append(
                Expense.objects.create(
                    organization=organization,
                    property=prop,
                    unit=random.choice([u for u in units if u.property_id == prop.id] + [None]),
                    category=category,
                    vendor_name=random.choice(
                        [
                            "Knox Utility Services",
                            "Volunteer Insurance Co.",
                            "Smoky Mountain Repairs",
                            "Tennessee Property Services",
                            "Summit Landscape Group",
                        ]
                    ),
                    description=expense_descriptions[category],
                    amount=self._money(random.randint(min_amt, max_amt)),
                    date=today - timedelta(days=random.randint(1, 360)),
                    is_recurring=recurring,
                    recurring_frequency=(
                        random.choice(
                            [Expense.FREQ_MONTHLY, Expense.FREQ_QUARTERLY, Expense.FREQ_ANNUALLY]
                        )
                        if recurring and random.random() > 0.35
                        else None
                    ),
                    receipt=random.choice(receipt_docs) if receipt_docs and random.random() > 0.55 else None,
                    created_by=actor,
                )
            )
        return expenses

    def _create_screenings(self, actor, tenants, organization):
        screenings = []
        selected_tenants = random.sample(tenants, random.randint(5, 8))
        for tenant in selected_tenants:
            credit_score = random.randint(550, 800)
            if credit_score >= 740:
                rating = ScreeningRequest.CREDIT_RATING_EXCELLENT
            elif credit_score >= 680:
                rating = ScreeningRequest.CREDIT_RATING_GOOD
            elif credit_score >= 620:
                rating = ScreeningRequest.CREDIT_RATING_FAIR
            else:
                rating = ScreeningRequest.CREDIT_RATING_POOR

            background = random.choices(
                [
                    ScreeningRequest.BACKGROUND_CLEAR,
                    ScreeningRequest.BACKGROUND_REVIEW_NEEDED,
                    ScreeningRequest.BACKGROUND_FLAGGED,
                ],
                weights=[0.7, 0.2, 0.1],
                k=1,
            )[0]
            eviction = random.choices(
                [
                    ScreeningRequest.EVICTION_NONE_FOUND,
                    ScreeningRequest.EVICTION_RECORDS_FOUND,
                ],
                weights=[0.82, 0.18],
                k=1,
            )[0]

            if (
                credit_score > 670
                and background == ScreeningRequest.BACKGROUND_CLEAR
                and eviction == ScreeningRequest.EVICTION_NONE_FOUND
            ):
                recommendation = ScreeningRequest.RECOMMENDATION_APPROVED
            elif credit_score < 580 or eviction == ScreeningRequest.EVICTION_RECORDS_FOUND:
                recommendation = ScreeningRequest.RECOMMENDATION_DENIED
            else:
                recommendation = ScreeningRequest.RECOMMENDATION_CONDITIONAL

            income = self._money(random.randint(2500, 9000))
            screenings.append(
                ScreeningRequest.objects.create(
                    tenant=tenant,
                    requested_by=actor,
                    organization=organization,
                    status=ScreeningRequest.STATUS_COMPLETED,
                    credit_score=credit_score,
                    credit_rating=rating,
                    background_check=background,
                    eviction_history=eviction,
                    income_verified=random.random() > 0.1,
                    monthly_income=income,
                    recommendation=recommendation,
                    notes="Automated screening result generated for seed data.",
                    report_data={
                        "provider": "MockScreen",
                        "score_band": rating,
                        "risk_flag": background != ScreeningRequest.BACKGROUND_CLEAR,
                    },
                )
            )
        return screenings

    def _create_notifications(self, landlord, tenant_users, leases, organization, today):
        notifications = []
        lease_samples = random.sample(leases, min(len(leases), 8))
        recipients = tenant_users[:]
        if landlord not in recipients:
            recipients.append(landlord)
        random.shuffle(recipients)

        for _ in range(random.randint(10, 15)):
            lease = random.choice(lease_samples) if lease_samples else None
            notif_type = random.choice(
                [
                    Notification.TYPE_RENT_DUE,
                    Notification.TYPE_LEASE_EXPIRING,
                    Notification.TYPE_MAINTENANCE_UPDATE,
                ]
            )
            if notif_type == Notification.TYPE_RENT_DUE and lease:
                title = "Rent due soon"
                message = (
                    f"Your rent for Unit {lease.unit.unit_number} at {lease.unit.property.name} "
                    "is due soon."
                )
                link = "/pay-rent"
            elif notif_type == Notification.TYPE_LEASE_EXPIRING and lease:
                title = "Lease expiring soon"
                message = (
                    f"Lease for Unit {lease.unit.unit_number} expires on "
                    f"{lease.end_date:%b %d, %Y}."
                )
                link = "/my-lease"
            else:
                title = "Maintenance update"
                message = (
                    "A maintenance request has changed status. Review the latest update."
                )
                link = "/maintenance"

            notifications.append(
                Notification.objects.create(
                    recipient=random.choice(recipients),
                    organization=organization,
                    title=title,
                    message=message,
                    notification_type=notif_type,
                    is_read=random.random() > 0.45,
                    link=link,
                )
            )
        return notifications

    def _create_messages(self, landlord, tenant_users, organization, today):
        messages = []
        subjects = [
            "Lease renewal reminder",
            "Maintenance follow-up",
            "Payment confirmation",
            "Community notice",
            "Inspection scheduling",
        ]
        recipients = tenant_users[:10]
        for recipient in recipients:
            subject = random.choice(subjects)
            parent = Message.objects.create(
                sender=landlord,
                recipient=recipient,
                organization=organization,
                subject=subject,
                body="Please review this update and reply with any questions.",
                is_read=random.random() > 0.4,
            )
            messages.append(parent)
            if random.random() > 0.35:
                reply = Message.objects.create(
                    sender=recipient,
                    recipient=landlord,
                    organization=organization,
                    subject=f"Re: {subject}",
                    body="Thanks for the update. I have received this message.",
                    is_read=random.random() > 0.5,
                    parent=parent,
                )
                messages.append(reply)
        return messages

    def _next_month(self, month_start):
        if month_start.month == 12:
            return date(month_start.year + 1, 1, 1)
        return date(month_start.year, month_start.month + 1, 1)

    def _prev_month(self, month_start):
        if month_start.month == 1:
            return date(month_start.year - 1, 12, 1)
        return date(month_start.year, month_start.month - 1, 1)

    def _lease_due_date(self, preferred_day, month_start):
        if month_start.month == 12:
            month_end = date(month_start.year + 1, 1, 1) - timedelta(days=1)
        else:
            month_end = date(month_start.year, month_start.month + 1, 1) - timedelta(days=1)
        day = min(preferred_day, month_end.day)
        return date(month_start.year, month_start.month, day)

    def _money(self, value):
        return Decimal(value).quantize(Decimal("0.01"))
