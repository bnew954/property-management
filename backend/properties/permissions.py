from rest_framework.permissions import BasePermission

from .mixins import resolve_request_organization


class IsLandlord(BasePermission):
    def has_permission(self, request, view):
        profile = getattr(request.user, "profile", None)
        return bool(
            request.user
            and request.user.is_authenticated
            and profile
            and profile.role == "landlord"
        )


class IsOrgAdmin(BasePermission):
    def has_permission(self, request, view):
        profile = getattr(request.user, "profile", None)
        organization = resolve_request_organization(request)
        return bool(
            request.user
            and request.user.is_authenticated
            and profile
            and organization
            and profile.is_org_admin
            and profile.organization_id == organization.id
        )

    def has_object_permission(self, request, view, obj):
        profile = getattr(request.user, "profile", None)
        if not profile:
            return False
        organization = resolve_request_organization(request)
        obj_org = getattr(obj, "organization", None)
        obj_org_id = getattr(obj_org, "id", None)
        return bool(
            profile.is_org_admin
            and organization
            and profile.organization_id == organization.id
            and (obj_org_id is None or obj_org_id == organization.id)
        )
