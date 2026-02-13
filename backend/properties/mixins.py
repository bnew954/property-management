from rest_framework.exceptions import PermissionDenied


class OrganizationQuerySetMixin:
    """Scope querysets and create mutations to the authenticated user's organization."""

    def get_queryset(self):
        queryset = super().get_queryset()
        organization = getattr(self.request, "organization", None)
        if not organization:
            return queryset.none()
        return queryset.filter(organization=organization)

    def perform_create(self, serializer):
        organization = getattr(self.request, "organization", None)
        if not organization:
            raise PermissionDenied("You must belong to an organization to create records.")
        serializer.save(organization=organization)
