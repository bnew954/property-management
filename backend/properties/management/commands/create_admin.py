from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from properties.models import Organization, UserProfile


class Command(BaseCommand):
    help = "Create default admin superuser for deployment environments."

    def handle(self, *args, **options):
        username = "admin"
        email = "admin@onyx-pm.com"
        password = "Admin2026!"

        user = User.objects.filter(username=username).first()
        if user:
            created = False
            if not user.is_superuser or not user.is_staff:
                user.is_superuser = True
                user.is_staff = True
                user.set_password(password)
                user.email = email
                user.save(update_fields=["is_superuser", "is_staff", "password", "email"])
        else:
            user = User.objects.create_superuser(
                username=username,
                email=email,
                password=password,
            )
            created = True

        org_name = "Onyx Properties"
        profile, _ = UserProfile.objects.get_or_create(
            user=user,
            defaults={"role": UserProfile.ROLE_LANDLORD},
        )

        organization = Organization.objects.filter(owner=user).first()
        if not organization:
            organization = Organization.objects.create(name=org_name, owner=user)
            created_org_msg = True
        else:
            created_org_msg = False

        if profile.role != UserProfile.ROLE_LANDLORD:
            profile.role = UserProfile.ROLE_LANDLORD
        profile.tenant = None
        profile.is_org_admin = True
        profile.organization = organization
        profile.save(update_fields=["role", "tenant", "is_org_admin", "organization"])

        if created:
            self.stdout.write("Superuser created")
        else:
            self.stdout.write("Superuser already exists")
        if created_org_msg:
            self.stdout.write("Created default superuser organization")
