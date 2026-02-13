from rest_framework import serializers

from .models import Lease, MaintenanceRequest, Payment, Property, Tenant, Unit


class PropertySerializer(serializers.ModelSerializer):
    class Meta:
        model = Property
        fields = "__all__"


class UnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unit
        fields = "__all__"


class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = "__all__"


class LeaseSerializer(serializers.ModelSerializer):
    tenant_detail = TenantSerializer(source="tenant", read_only=True)
    unit_detail = UnitSerializer(source="unit", read_only=True)

    class Meta:
        model = Lease
        fields = "__all__"


class PaymentSerializer(serializers.ModelSerializer):
    lease_detail = LeaseSerializer(source="lease", read_only=True)

    class Meta:
        model = Payment
        fields = "__all__"


class MaintenanceRequestSerializer(serializers.ModelSerializer):
    unit_detail = UnitSerializer(source="unit", read_only=True)
    tenant_detail = TenantSerializer(source="tenant", read_only=True)

    class Meta:
        model = MaintenanceRequest
        fields = "__all__"
