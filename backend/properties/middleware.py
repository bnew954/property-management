from django.utils.deprecation import MiddlewareMixin
from django.contrib.auth.models import AnonymousUser

from .models import UserProfile


class OrganizationMiddleware(MiddlewareMixin):
    def process_request(self, request):
        user = getattr(request, "user", None)
        if not user or isinstance(user, AnonymousUser) or not user.is_authenticated:
            request.organization = None
            return

        try:
            profile = getattr(user, "profile", None)
        except UserProfile.DoesNotExist:
            profile = None

        if profile:
            request.organization = profile.organization
        else:
            request.organization = None
