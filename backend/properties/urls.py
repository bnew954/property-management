from django.urls import path
from rest_framework.routers import DefaultRouter

from .payment_views import (
    ConfirmStripePaymentView,
    CreatePaymentIntentView,
    PaymentHistoryView,
)
from .views import (
    AccountingDashboardView,
    AccountingCashflowView,
    AccountingCategoryViewSet,
    AccountingPnLView,
    AccountingPeriodViewSet,
    ReportingBalanceSheetView,
    AccountingRentRollView,
    AccountingTaxReportView,
    TransactionViewSet,
    OwnerStatementViewSet,
    GenerateOwnerStatementView,
    DocumentViewSet,
    ExpenseViewSet,
    GenerateChargesView,
    JournalEntryViewSet,
    RecordExpenseView,
    RecordIncomeView,
    RecordTransferView,
    RecurringTransactionViewSet,
    ReportingBalanceSheetView,
    ReportingGeneralLedgerView,
    ReportingTrialBalanceView,
    LeaseViewSet,
    LateFeeRuleViewSet,
    MaintenanceRequestViewSet,
    OrganizationDetailView,
    OrganizationInviteView,
    OrganizationInvitationsView,
    OrganizationMembersView,
    OrganizationUsersView,
    MessageViewSet,
    MeView,
    NotificationViewSet,
    PublicListingDetailView,
    PublicListingsView,
    PublicListingApplicationView,
    PaymentViewSet,
    PropertyViewSet,
    RegisterView,
    RentLedgerEntryViewSet,
    RentalApplicationViewSet,
    TransactionImportViewSet,
    ImportedTransactionViewSet,
    ScreeningRequestViewSet,
    ScreeningConsentPublicView,
    LeaseSigningPublicView,
    TenantViewSet,
    UnitViewSet,
    ClassificationRuleViewSet,
    BankReconciliationViewSet,
)
from .ai_views import AiChatView

router = DefaultRouter()
router.register("properties", PropertyViewSet, basename="property")
router.register("units", UnitViewSet, basename="unit")
router.register("tenants", TenantViewSet, basename="tenant")
router.register("leases", LeaseViewSet, basename="lease")
router.register("accounting/categories", AccountingCategoryViewSet, basename="accounting-category")
router.register("accounting/journal-entries", JournalEntryViewSet, basename="journal-entry")
router.register("accounting/transactions", TransactionViewSet, basename="transaction")
router.register("accounting/owner-statements", OwnerStatementViewSet, basename="owner-statement")
router.register("accounting/periods", AccountingPeriodViewSet, basename="accounting-period")
router.register("accounting/recurring", RecurringTransactionViewSet, basename="accounting-recurring")
router.register("accounting/classification-rules", ClassificationRuleViewSet, basename="accounting-classification-rules")
router.register("accounting/imports", TransactionImportViewSet, basename="accounting-import")
router.register(
    "accounting/imported-transactions",
    ImportedTransactionViewSet,
    basename="accounting-imported-transaction",
)
router.register(
    "accounting/reconciliations",
    BankReconciliationViewSet,
    basename="accounting-reconciliation",
)
router.register("payments", PaymentViewSet, basename="payment")
router.register("notifications", NotificationViewSet, basename="notification")
router.register("messages", MessageViewSet, basename="message")
router.register("screenings", ScreeningRequestViewSet, basename="screening")
router.register("documents", DocumentViewSet, basename="document")
router.register("expenses", ExpenseViewSet, basename="expense")
router.register("rent-ledger", RentLedgerEntryViewSet, basename="rent-ledger")
router.register("accounting/late-fee-rules", LateFeeRuleViewSet, basename="late-fee-rule")
router.register(
    "maintenance-requests",
    MaintenanceRequestViewSet,
    basename="maintenance-request",
)

urlpatterns = [
    path(
        "payments/create-intent/",
        CreatePaymentIntentView.as_view(),
        name="payments-create-intent",
    ),
    path(
        "payments/confirm/",
        ConfirmStripePaymentView.as_view(),
        name="payments-confirm",
    ),
    path(
        "payments/history/",
        PaymentHistoryView.as_view(),
        name="payments-history",
    ),
    path("register/", RegisterView.as_view(), name="register"),
    path("me/", MeView.as_view(), name="me"),
    path("organization/", OrganizationDetailView.as_view(), name="organization-detail"),
    path("organization/invite/", OrganizationInviteView.as_view(), name="organization-invite"),
    path("organization/members/", OrganizationMembersView.as_view(), name="organization-members"),
    path("organization/users/", OrganizationUsersView.as_view(), name="organization-users"),
    path(
        "organization/invitations/",
        OrganizationInvitationsView.as_view(),
        name="organization-invitations",
    ),
    path("listings/", PublicListingsView.as_view(), name="listings-public-index"),
    path(
        "listings/<slug:slug>/apply/",
        PublicListingApplicationView.as_view(),
        name="listing-application-submit",
    ),
    path(
        "listings/<slug:slug>/",
        PublicListingDetailView.as_view(),
        name="listings-public-detail",
    ),
    path(
        "screening/consent/<str:token>/",
        ScreeningConsentPublicView.as_view(),
        name="screening-consent",
    ),
    path(
        "lease/sign/<str:token>/",
        LeaseSigningPublicView.as_view(),
        name="lease-sign",
    ),
    path(
        "accounting/generate-charges/",
        GenerateChargesView.as_view(),
        name="accounting-generate-charges",
    ),
    path(
        "accounting/dashboard/",
        AccountingDashboardView.as_view(),
        name="accounting-dashboard",
    ),
    path(
        "accounting/pnl/",
        AccountingPnLView.as_view(),
        name="accounting-pnl",
    ),
    path(
        "accounting/record-income/",
        RecordIncomeView.as_view(),
        name="accounting-record-income",
    ),
    path(
        "accounting/record-expense/",
        RecordExpenseView.as_view(),
        name="accounting-record-expense",
    ),
    path(
        "accounting/record-transfer/",
        RecordTransferView.as_view(),
        name="accounting-record-transfer",
    ),
    path(
        "accounting/reports/trial-balance/",
        ReportingTrialBalanceView.as_view(),
        name="accounting-trial-balance",
    ),
    path(
        "accounting/reports/balance-sheet/",
        ReportingBalanceSheetView.as_view(),
        name="accounting-balance-sheet",
    ),
    path(
        "accounting/reports/general-ledger/",
        ReportingGeneralLedgerView.as_view(),
        name="accounting-general-ledger",
    ),
    path(
        "accounting/cashflow/",
        AccountingCashflowView.as_view(),
        name="accounting-cashflow",
    ),
    path(
        "accounting/rent-roll/",
        AccountingRentRollView.as_view(),
        name="accounting-rent-roll",
    ),
    path(
        "accounting/tax-report/",
        AccountingTaxReportView.as_view(),
        name="accounting-tax-report",
    ),
    path(
        "accounting/owner-statements/generate/",
        GenerateOwnerStatementView.as_view(),
        name="accounting-generate-owner-statement",
    ),
    path("api/ai/chat/", AiChatView.as_view(), name="ai-chat"),
    path("ai/chat/", AiChatView.as_view(), name="ai-chat-nested"),
]
router.register("applications", RentalApplicationViewSet, basename="rental-application")
urlpatterns += router.urls
