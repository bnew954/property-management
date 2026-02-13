import logging
from rest_framework.exceptions import PermissionDenied

logger = logging.getLogger(__name__)


def resolve_request_organization(request):
    """Resolve organization from request context.

    `OrganizationMiddleware` runs before DRF authentication, so JWT-authenticated
    requests can arrive with `request.user` populated as anonymous at middleware
    time. In that case, we fall back to `request.user.profile.organization` once
    DRF has set the authenticated user.
    """

    organization = getattr(request, "organization", None)
    if organization:
        return organization

    user = getattr(request, "user", None)
    if not user or not user.is_authenticated:
        return None

    profile = getattr(user, "profile", None)
    return getattr(profile, "organization", None)


class OrganizationQuerySetMixin:
    """Scope querysets and create mutations to the authenticated user's organization."""

    def get_queryset(self):
        queryset = super().get_queryset()
        organization = resolve_request_organization(self.request)
        if not organization:
            return queryset.none()
        return queryset.filter(organization=organization)

    def perform_create(self, serializer):
        organization = resolve_request_organization(self.request)
        if not organization:
            if self.request.user and self.request.user.is_authenticated:
                logger.warning(
                    "Creating %s without organization context. User=%s",
                    self.__class__.__name__,
                    getattr(self.request.user, "id", None),
                )
                serializer.save()
                return
            raise PermissionDenied("Authentication credentials were not provided.")
        serializer.save(organization=organization)
