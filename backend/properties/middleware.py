from django.utils.deprecation import MiddlewareMixin


class OrganizationMiddleware(MiddlewareMixin):
    def process_request(self, request):
        profile = getattr(getattr(request, "user", None), "profile", None)
        if getattr(request, "user", None) and request.user.is_authenticated and profile:
            request.organization = profile.organization
        else:
            request.organization = None
