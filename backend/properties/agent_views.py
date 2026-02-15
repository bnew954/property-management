from datetime import timedelta

from django.db.models import Case, Count, IntegerField, Value, When
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .management.commands.run_agents import run_skill_scan
from .mixins import OrganizationQuerySetMixin
from .models import AgentSkill, AgentTask
from .permissions import IsLandlord
from .serializers import (
    AgentSkillSerializer,
    AgentTaskDetailSerializer,
    AgentTaskListSerializer,
)


def _priority_sort_expression():
    return Case(
        When(priority=AgentTask.PRIORITY_URGENT, then=Value(4)),
        When(priority=AgentTask.PRIORITY_HIGH, then=Value(3)),
        When(priority=AgentTask.PRIORITY_MEDIUM, then=Value(2)),
        default=Value(1),
        output_field=IntegerField(),
    )


class AgentSkillViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    queryset = AgentSkill.objects.select_related("organization").all()
    serializer_class = AgentSkillSerializer
    permission_classes = [IsAuthenticated, IsLandlord]

    def partial_update(self, request, *args, **kwargs):
        skill = self.get_object()
        requested_status = request.data.get("status")

        if requested_status is None:
            requested_status = (
                AgentSkill.STATUS_PAUSED
                if skill.status == AgentSkill.STATUS_ACTIVE
                else AgentSkill.STATUS_ACTIVE
            )

        valid_statuses = {status_value for status_value, _ in AgentSkill.STATUS_CHOICES}
        if requested_status not in valid_statuses:
            return Response(
                {"detail": "Invalid status value."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        skill.status = requested_status
        skill.save(update_fields=["status"])
        return Response(self.get_serializer(skill).data)

    @action(detail=True, methods=["post"])
    def toggle(self, request, pk=None):
        skill = self.get_object()
        if skill.status == AgentSkill.STATUS_ACTIVE:
            skill.status = AgentSkill.STATUS_PAUSED
        else:
            skill.status = AgentSkill.STATUS_ACTIVE
        skill.save(update_fields=["status"])
        return Response(self.get_serializer(skill).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def run(self, request, pk=None):
        skill = self.get_object()
        created_count = run_skill_scan(skill.organization, skill)
        serializer = self.get_serializer(skill)
        return Response(
            {"created": created_count, "skill": serializer.data},
            status=status.HTTP_200_OK,
        )


class AgentTaskViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    queryset = AgentTask.objects.select_related(
        "organization",
        "skill",
        "related_property",
        "related_unit",
        "related_tenant",
        "related_lease",
        "related_maintenance",
        "related_lead",
        "related_bill",
        "resolved_by",
    ).all()
    serializer_class = AgentTaskListSerializer
    permission_classes = [IsAuthenticated, IsLandlord]

    def get_queryset(self):
        queryset = super().get_queryset()
        status_filter = self.request.query_params.get("status")
        priority = self.request.query_params.get("priority")
        task_type = self.request.query_params.get("task_type")
        skill_type = self.request.query_params.get("skill__skill_type")

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if priority:
            queryset = queryset.filter(priority=priority)
        if task_type:
            queryset = queryset.filter(task_type=task_type)
        if skill_type:
            queryset = queryset.filter(skill__skill_type=skill_type)

        return queryset.annotate(
            _priority_rank=_priority_sort_expression()
        ).order_by("-created_at", "-_priority_rank")

    def get_serializer_class(self):
        if self.action == "list":
            return AgentTaskListSerializer
        return AgentTaskDetailSerializer

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        task = self.get_object()
        execute = request.data.get("execute", False)
        resolution_note = (request.data.get("resolution_note") or "").strip()

        task.status = AgentTask.STATUS_APPROVED
        task.resolved_at = timezone.now()
        task.resolved_by = request.user
        task.resolution_note = resolution_note
        task.save(
            update_fields=[
                "status",
                "resolved_at",
                "resolved_by",
                "resolution_note",
                "updated_at",
            ]
        )
        task.skill.tasks_completed += 1
        task.skill.tasks_pending = max(0, task.skill.tasks_pending - 1)
        task.skill.save(update_fields=["tasks_completed", "tasks_pending"])

        execution_result = None
        if execute:
            from .agent_executors import execute_task

            success, message = execute_task(task)
            execution_result = {"success": success, "message": message}
            task.resolution_note = message
            task.save(update_fields=["resolution_note", "status", "resolved_at", "resolved_by"])

        serializer_data = AgentTaskDetailSerializer(task).data
        return Response(
            {
                "status": "approved",
                "execution_result": execution_result,
                "task": serializer_data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"])
    def preview(self, request, pk=None):
        """Preview what the AI agent would do for this task without executing."""
        task = self.get_object()
        from .agent_executors import generate_preview

        preview_data = generate_preview(task)
        return Response(
            {
                "task_id": task.id,
                "task_type": task.task_type,
                "preview": preview_data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def execute(self, request, pk=None):
        """Approve and execute the task in one step."""
        task = self.get_object()
        from .agent_executors import execute_task

        success, message = execute_task(task)

        task.status = AgentTask.STATUS_APPROVED if success else AgentTask.STATUS_PENDING
        task.resolved_at = timezone.now() if success else None
        task.resolved_by = request.user if success else None
        task.resolution_note = message
        task.save(
            update_fields=[
                "status",
                "resolved_at",
                "resolved_by",
                "resolution_note",
                "updated_at",
            ]
        )

        if success:
            task.skill.tasks_completed += 1
            task.skill.tasks_pending = max(0, task.skill.tasks_pending - 1)
            task.skill.save(update_fields=["tasks_completed", "tasks_pending"])
        else:
            task.skill.save(update_fields=["tasks_pending"])

        return Response(
            {
                "success": success,
                "message": message,
                "task": AgentTaskDetailSerializer(task).data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def dismiss(self, request, pk=None):
        task = self.get_object()
        resolution_note = (request.data.get("resolution_note") or "").strip()
        task.status = AgentTask.STATUS_DISMISSED
        task.resolved_at = timezone.now()
        task.resolved_by = request.user
        task.resolution_note = resolution_note
        task.save(
            update_fields=[
                "status",
                "resolved_at",
                "resolved_by",
                "resolution_note",
                "updated_at",
            ]
        )
        sync_skill_counts(task.skill)
        return Response(self.get_serializer(task).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def summary(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        pending_tasks = queryset.filter(status=AgentTask.STATUS_PENDING)
        resolved_statuses = [
            AgentTask.STATUS_APPROVED,
            AgentTask.STATUS_DISMISSED,
            AgentTask.STATUS_AUTO_RESOLVED,
        ]
        resolved_tasks = queryset.filter(status__in=resolved_statuses)

        total_by_priority = {
            AgentTask.PRIORITY_URGENT: pending_tasks.filter(priority=AgentTask.PRIORITY_URGENT).count(),
            AgentTask.PRIORITY_HIGH: pending_tasks.filter(priority=AgentTask.PRIORITY_HIGH).count(),
            AgentTask.PRIORITY_MEDIUM: pending_tasks.filter(priority=AgentTask.PRIORITY_MEDIUM).count(),
            AgentTask.PRIORITY_LOW: pending_tasks.filter(priority=AgentTask.PRIORITY_LOW).count(),
        }
        total_by_skill = {skill_type: 0 for skill_type, _ in AgentSkill.SKILL_CHOICES}
        for row in pending_tasks.values("skill__skill_type").annotate(count=Count("id")):
            total_by_skill[row["skill__skill_type"]] = row["count"]

        today = timezone.now().date()
        week_start = timezone.now() - timedelta(days=7)

        return Response(
            {
                "total_pending": pending_tasks.count(),
                "total_by_priority": total_by_priority,
                "total_by_skill": total_by_skill,
                "resolved_today": resolved_tasks.filter(resolved_at__date=today).count(),
                "resolved_this_week": resolved_tasks.filter(
                    resolved_at__gte=week_start
                ).count(),
            }
        )

    @action(detail=False, methods=["get"])
    def feed(self, request):
        queryset = self.get_queryset()
        queryset = queryset.filter(status=AgentTask.STATUS_PENDING).annotate(
            _feed_priority=_priority_sort_expression()
        ).order_by("-_feed_priority", "-created_at")[:20]
        serializer = AgentTaskListSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
