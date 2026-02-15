from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from .mixins import OrganizationQuerySetMixin, resolve_request_organization
from .models import WorkOrder, WorkOrderNote
from .permissions import IsLandlord
from .serializers import (
    WorkOrderCreateSerializer,
    WorkOrderListSerializer,
    WorkOrderSerializer,
)


class WorkOrderViewSet(OrganizationQuerySetMixin, ModelViewSet):
    queryset = WorkOrder.objects.select_related(
        "organization",
        "maintenance_request",
        "vendor",
        "property",
        "unit",
    ).prefetch_related("notes")
    permission_classes = [IsAuthenticated, IsLandlord]

    def get_serializer_class(self):
        if self.action == "list":
            return WorkOrderListSerializer
        if self.action == "create":
            return WorkOrderCreateSerializer
        if self.action in {"add_note", "summary"}:
            return WorkOrderSerializer
        return WorkOrderSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params

        status_filter = params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        vendor_id = params.get("vendor")
        if vendor_id:
            queryset = queryset.filter(vendor_id=vendor_id)

        property_id = params.get("property")
        if property_id:
            queryset = queryset.filter(property_id=property_id)

        priority_filter = params.get("priority")
        if priority_filter:
            queryset = queryset.filter(priority=priority_filter)

        ordering = params.get("ordering", "-created_at")
        allowed_ordering = {
            "created_at",
            "-created_at",
            "scheduled_date",
            "-scheduled_date",
            "priority",
            "-priority",
        }
        if ordering not in allowed_ordering:
            ordering = "-created_at"

        return queryset.order_by(ordering)

    @action(detail=True, methods=["post"], url_path="add-note")
    def add_note(self, request, pk=None):
        work_order = self.get_object()
        message = (request.data or {}).get("message", "")
        if not str(message).strip():
            return Response(
                {"message": "message is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        author_name = (request.user.get_full_name() or request.user.username).strip()
        WorkOrderNote.objects.create(
            work_order=work_order,
            author=request.user,
            author_name=author_name,
            is_vendor=False,
            message=str(message).strip(),
        )
        return Response(WorkOrderSerializer(work_order).data)

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        organization = resolve_request_organization(request)
        if not organization:
            return Response(
                {
                    "total_work_orders": 0,
                    "assigned": 0,
                    "in_progress": 0,
                    "completed_this_month": 0,
                    "total_cost_this_month": 0,
                }
            )

        today = timezone.now().date()
        queryset = WorkOrder.objects.filter(organization=organization)

        completed_this_month = queryset.filter(
            status=WorkOrder.STATUS_COMPLETED,
            completed_date__year=today.year,
            completed_date__month=today.month,
        )
        total_cost_this_month = (
            completed_this_month.aggregate(total=Sum("actual_cost"))["total"] or Decimal("0.00")
        )

        return Response(
            {
                "total_work_orders": queryset.count(),
                "assigned": queryset.filter(status=WorkOrder.STATUS_ASSIGNED).count(),
                "in_progress": queryset.filter(status=WorkOrder.STATUS_IN_PROGRESS).count(),
                "completed_this_month": completed_this_month.count(),
                "total_cost_this_month": total_cost_this_month,
            }
        )
