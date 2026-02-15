from datetime import datetime, timedelta

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .mixins import OrganizationQuerySetMixin
from .models import Lead, LeadActivity
from .permissions import IsLandlord
from .serializers import (
    LeadActivityCreateSerializer,
    LeadCreateSerializer,
    LeadDetailSerializer,
    LeadListSerializer,
)


class LeadViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    queryset = Lead.objects.select_related(
        "property",
        "unit",
        "application",
        "tenant",
        "assigned_to",
    ).prefetch_related("activities")
    permission_classes = [IsAuthenticated, IsLandlord]

    def get_queryset(self):
        queryset = super().get_queryset()

        stage = self.request.query_params.get("stage")
        source = self.request.query_params.get("source")
        priority = self.request.query_params.get("priority")
        property_filter = self.request.query_params.get("property")
        search = self.request.query_params.get("search")
        ordering = self.request.query_params.get("ordering", "-created_at")

        if stage:
            queryset = queryset.filter(stage=stage)
        if source:
            queryset = queryset.filter(source=source)
        if priority:
            queryset = queryset.filter(priority=priority)
        if property_filter:
            queryset = queryset.filter(property_id=property_filter)
        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(email__icontains=search)
                | Q(phone__icontains=search)
            )

        allowed_ordering = {
            "created_at",
            "-created_at",
            "updated_at",
            "-updated_at",
            "last_contacted_at",
            "-last_contacted_at",
        }
        if ordering not in allowed_ordering:
            ordering = "-created_at"

        return queryset.order_by(ordering)

    def get_serializer_class(self):
        if self.action == "retrieve":
            return LeadDetailSerializer
        if self.action in {"list", "pipeline", "summary"}:
            return LeadListSerializer
        if self.action in {"create", "update", "partial_update"}:
            return LeadCreateSerializer
        return LeadCreateSerializer

    @action(detail=True, methods=["post"])
    def add_activity(self, request, pk=None):
        lead = self.get_object()
        serializer = LeadActivityCreateSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        activity_type = serializer.validated_data.get("activity_type")
        communication_activity_types = {
            LeadActivity.ACTIVITY_TYPE_EMAIL_SENT,
            LeadActivity.ACTIVITY_TYPE_EMAIL_RECEIVED,
            LeadActivity.ACTIVITY_TYPE_PHONE_CALL,
            LeadActivity.ACTIVITY_TYPE_SMS_SENT,
            LeadActivity.ACTIVITY_TYPE_FOLLOW_UP,
            LeadActivity.ACTIVITY_TYPE_TOUR_SCHEDULED,
            LeadActivity.ACTIVITY_TYPE_TOUR_COMPLETED,
        }
        update_fields = []

        if activity_type == LeadActivity.ACTIVITY_TYPE_STAGE_CHANGE:
            new_stage = request.data.get("stage")
            if not new_stage:
                return Response(
                    {"stage": "stage is required for stage_change"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if new_stage not in {value for value, _ in Lead.STAGE_CHOICES}:
                return Response(
                    {"stage": "Invalid stage"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if lead.stage != new_stage:
                lead.stage = new_stage
                update_fields.append("stage")

        if activity_type in communication_activity_types:
            lead.last_contacted_at = timezone.now()
            update_fields.append("last_contacted_at")

        if update_fields:
            lead.updated_at = timezone.now()
            update_fields.append("updated_at")
            lead.save(update_fields=update_fields)

        LeadActivity.objects.create(lead=lead, **serializer.validated_data, created_by=request.user)
        return Response(LeadDetailSerializer(lead).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def schedule_tour(self, request, pk=None):
        lead = self.get_object()
        tour_date = request.data.get("tour_date")
        if not tour_date:
            return Response(
                {"tour_date": "This field is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        parsed_tour_date = self._parse_datetime(tour_date)
        if not parsed_tour_date:
            return Response(
                {"tour_date": "Invalid datetime format."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        lead.tour_date = parsed_tour_date
        lead.tour_notes = (request.data.get("tour_notes") or "").strip()
        lead.stage = Lead.STAGE_TOUR_SCHEDULED
        lead.last_contacted_at = timezone.now()
        lead.updated_at = timezone.now()
        lead.save(
            update_fields=["tour_date", "tour_notes", "stage", "last_contacted_at", "updated_at"]
        )

        LeadActivity.objects.create(
            lead=lead,
            created_by=request.user,
            activity_type=LeadActivity.ACTIVITY_TYPE_TOUR_SCHEDULED,
            subject="Tour scheduled",
            description=f"Tour scheduled for {parsed_tour_date.isoformat()}",
        )
        return Response(LeadDetailSerializer(lead).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def complete_tour(self, request, pk=None):
        lead = self.get_object()
        tour_notes = request.data.get("tour_notes")
        if tour_notes is not None:
            lead.tour_notes = str(tour_notes)

        lead.stage = Lead.STAGE_TOUR_COMPLETED
        lead.last_contacted_at = timezone.now()
        lead.updated_at = timezone.now()
        lead.save(update_fields=["tour_notes", "stage", "last_contacted_at", "updated_at"])

        LeadActivity.objects.create(
            lead=lead,
            created_by=request.user,
            activity_type=LeadActivity.ACTIVITY_TYPE_TOUR_COMPLETED,
            subject="Tour completed",
            description="Tour completed.",
        )
        return Response(LeadDetailSerializer(lead).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def mark_lost(self, request, pk=None):
        lead = self.get_object()
        lost_reason = (request.data.get("lost_reason") or "").strip()
        if not lost_reason:
            return Response(
                {"lost_reason": "lost_reason is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        lead.stage = Lead.STAGE_LOST
        lead.lost_reason = lost_reason
        lead.last_contacted_at = timezone.now()
        lead.updated_at = timezone.now()
        lead.save(update_fields=["stage", "lost_reason", "last_contacted_at", "updated_at"])

        LeadActivity.objects.create(
            lead=lead,
            created_by=request.user,
            activity_type=LeadActivity.ACTIVITY_TYPE_STAGE_CHANGE,
            subject="Lead marked as lost",
            description=f"Lead lost: {lost_reason}",
        )
        return Response(LeadDetailSerializer(lead).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def convert_to_application(self, request, pk=None):
        lead = self.get_object()
        lead.stage = Lead.STAGE_APPLIED
        lead.last_contacted_at = timezone.now()
        lead.updated_at = timezone.now()
        lead.save(update_fields=["stage", "last_contacted_at", "updated_at"])

        LeadActivity.objects.create(
            lead=lead,
            created_by=request.user,
            activity_type=LeadActivity.ACTIVITY_TYPE_APPLICATION_SUBMITTED,
            subject="Converted to application",
            description="Lead stage changed to applied.",
        )
        payload = LeadDetailSerializer(lead).data
        payload["note"] = (
            "Lead converted to application. Create the application from the Applications page."
        )
        return Response(payload, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def summary(self, request):
        queryset = self.get_queryset()
        total_leads = queryset.count()
        new_leads = queryset.filter(stage=Lead.STAGE_NEW).count()
        converted = queryset.filter(stage__in=[Lead.STAGE_APPLIED, Lead.STAGE_LEASED])
        converted_count = converted.count()
        tours_this_week_start = self._start_of_week(timezone.now())
        tours_this_week_end = tours_this_week_start + timedelta(days=7)
        tours_scheduled_this_week = queryset.filter(
            stage=Lead.STAGE_TOUR_SCHEDULED,
            tour_date__gte=tours_this_week_start,
            tour_date__lt=tours_this_week_end,
        ).count()

        conversion_rate = (
            (converted_count / total_leads) if total_leads else 0
        )
        converted_days = [(timezone.now() - lead.created_at).days for lead in converted]
        avg_days_to_convert = (
            (sum(converted_days) / len(converted_days)) if converted_days else 0
        )

        return Response(
            {
                "total_leads": total_leads,
                "new_leads": new_leads,
                "tours_scheduled_this_week": tours_scheduled_this_week,
                "conversion_rate": conversion_rate,
                "avg_days_to_convert": avg_days_to_convert,
                "leads_by_stage": self._counts_by_field(queryset, "stage", Lead.STAGE_CHOICES),
                "leads_by_source": self._counts_by_field(queryset, "source", Lead.SOURCE_CHOICES),
            }
        )

    @action(detail=False, methods=["get"])
    def pipeline(self, request):
        stages = [
            Lead.STAGE_NEW,
            Lead.STAGE_CONTACTED,
            Lead.STAGE_TOUR_SCHEDULED,
            Lead.STAGE_TOUR_COMPLETED,
            Lead.STAGE_APPLIED,
            Lead.STAGE_LEASED,
        ]
        pipeline = {}
        for stage in stages:
            leads = self.get_queryset().filter(stage=stage)
            pipeline[stage] = LeadListSerializer(leads, many=True).data
        return Response(pipeline)

    @staticmethod
    def _start_of_week(value):
        start = value - timedelta(days=value.weekday())
        return start.replace(hour=0, minute=0, second=0, microsecond=0)

    @staticmethod
    def _counts_by_field(queryset, field_name, choices):
        counts = {choice[0]: 0 for choice in choices}
        for row in queryset.values(field_name).annotate(count=Count("id")):
            counts[row[field_name]] = row["count"]
        return counts

    @staticmethod
    def _parse_datetime(raw):
        if isinstance(raw, datetime):
            parsed = raw
        else:
            if not raw:
                return None
            raw_value = str(raw).strip().replace("Z", "+00:00")
            try:
                parsed = datetime.fromisoformat(raw_value)
            except (TypeError, ValueError):
                try:
                    parsed = datetime.strptime(raw_value, "%Y-%m-%d")
                except (TypeError, ValueError):
                    return None

        if timezone.is_naive(parsed):
            parsed = timezone.make_aware(parsed)
        return parsed
