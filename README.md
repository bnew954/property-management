# Onyx Property Management

## Context for agents

`onyx` is a full-stack property-management application with a Django REST Framework backend and a React SPA frontend.  
The code base is already organized around tenant-facing flows, landlord operations, accounting, and document/signature workflows.

Primary references for onboarding and planning:

- `README.md` (architecture + API + data flow)
- `ROADMAP.md` (current completed work and planned phases)

## High-level architecture

- **Backend**: Django 6 + Django REST Framework in `backend/`
- **Frontend**: React + Material UI in `frontend/`
- **Data model boundary**: Organization-level tenancy isolation using `Organization` + `UserProfile`
- **Auth**: JWT via `djangorestframework-simplejwt`
- **Background/automation**: Django management commands + model signals

## Backend architecture

### Core domains

- `backend/properties/models.py`
  - `Organization` with plan/max_units, owner, membership via `UserProfile.organization`
  - `Property` and `Unit` (including listing metadata for public marketing)
  - `Tenant`, `Lease`, `RentalApplication`, `ScreeningRequest`
  - `Payment`, `Transaction`, `RentLedgerEntry`, `LateFeeRule`
  - `AccountingCategory`, `JournalEntry`, `JournalEntryLine`, `AccountingPeriod`, `RecurringTransaction`
  - `MaintenanceRequest`, `Notification`, `Message`
  - `Document`, `Expense`, `OwnerStatement`
- `backend/properties/serializers.py`
  - Domain serializers + read-only computed fields + validation for public screening/lease forms
- `backend/properties/views.py`
  - Main API controllers using DRF viewsets and APIViews
- `backend/properties/mixins.py`
  - `OrganizationQuerySetMixin` for org-scoped queryset filtering
  - `resolve_request_organization` helper
- `backend/properties/permissions.py`
  - `IsLandlord` and `IsOrgAdmin`
- `backend/properties/middleware.py`
  - `OrganizationMiddleware` resolves `request.organization` from the authenticated user profile
- `backend/properties/signals.py`
  - Auto user profile creation
  - Payment -> ledger auto-posting and balance recalculation

### Public vs private API split

Public endpoints (`AllowAny`) are in `backend/properties/urls.py` and `backend/properties/views.py`:

- Public listing catalog and listing detail: `/api/listings/`, `/api/listings/<slug>/`
- Public application submit for a listing: `/api/listings/<slug>/apply/`
- Tenant/public screening consent: `/api/screening/consent/<token>/`
- Public lease signing: `/api/lease/sign/<token>/`

Protected/admin endpoints are under `/api/` (JWT required unless noted), served by DRF routers and custom API views in:

- `backend/properties/urls.py` (router + named custom paths)
- `backend/properties/payment_views.py` (Stripe intent + confirmation)
- `backend/properties/permissions.py` (role constraints)

### API feature coverage (backend)

- **Auth & profile**
  - `/api/token/`, `/api/token/refresh/`
  - `/api/register/`, `/api/me/`
- **Organization**
  - `/api/organization/`, `/api/organization/invite/`, `/api/organization/members/`
  - `/api/organization/users/`, `/api/organization/invitations/`
- **Leasing**
  - `/api/properties/`, `/api/units/`, `/api/tenants/`, `/api/leases/`
  - `/api/applications/` with actions: `approve`, `deny`, `create-lease`, `run-screening`
  - `/api/leases/<id>/generate-document/`, `/send-for-signing/`, `/landlord-sign/`
- **Payments & ledger**
  - `/api/payments/`, `/api/payments/history/`
  - `/api/payments/create-intent/`, `/api/payments/confirm/`
  - `/api/rent-ledger/`
  - `/api/accounting/*` dashboards and reports
- **Accounting**
  - `/api/accounting/categories`, `/api/accounting/transactions`
  - `/api/expenses/`, `/api/accounting/late-fee-rules/`, `/api/accounting/dashboard/`
  - `/api/accounting/pnl/`, `/api/accounting/cashflow/`, `/api/accounting/rent-roll/`
  - `/api/accounting/tax-report/`, `/api/accounting/owner-statements/`, `/api/accounting/generate-charges/`
- **Screening**
  - `/api/screenings/` plus `/send-consent` and `/run-screening`
  - public tokenized consent endpoint used by tenants
- **Operations**
  - `/api/maintenance-requests/`
  - `/api/messages/` with `sent/`, `users/`, `mark-read/`, `reply/`
  - `/api/notifications/`, `/api/notifications/mark-all-read/`, `/api/notifications/unread-count/`
  - `/api/documents/` with `/download/`

## Compact endpoint matrix (agent map)

| Family | Endpoint | Methods | Auth | Notes |
|---|---|---|---|---|
| Identity | `/api/token/`, `/api/token/refresh/`, `/api/register/`, `/api/me/` | GET / POST / PATCH | Public / JWT | Token and profile bootstrap |
| Org mgmt | `/api/organization/`, `/api/organization/invite/`, `/api/organization/members/`, `/api/organization/users/`, `/api/organization/invitations/` | GET / PATCH / POST | JWT (admin for invites/members actions) | Org context controls tenancy |
| Catalog | `/api/properties/`, `/api/units/`, `/api/tenants/`, `/api/leases/` | CRUD | JWT | Tenant read, landlord write |
| Applications + signatures | `/api/applications/`, `/api/screenings/`, `/api/leases/{id}/generate-document/`, `/api/leases/{id}/send-for-signing/`, `/api/leases/{id}/landlord-sign/`, `/api/lease/sign/{token}/` | GET / POST / PATCH | JWT (public signing route) | Application, screening, and lease signature flows |
| Public funnels | `/api/listings/`, `/api/listings/{slug}/`, `/api/listings/{slug}/apply/`, `/api/screening/consent/{token}/` | GET / POST | Public | Candidate intake + consent capture |
| Billing + rent payment | `/api/payments/`, `/api/payments/create-intent/`, `/api/payments/confirm/`, `/api/payments/history/` | GET / POST | JWT | Payment confirmation creates `Transaction` and posts a JournalEntry (`rent_payment`) |
| Chart of accounts | `/api/accounting/categories/`, `/api/accounting/categories/{id}/ledger/` | GET / POST / PATCH / DELETE | Landlord | COA hierarchy + account ledger |
| Journal entries | `/api/accounting/journal-entries/`, `/api/accounting/journal-entries/{id}/post/`, `/api/accounting/journal-entries/{id}/reverse/`, `/api/accounting/journal-entries/{id}/void/` | GET / POST | Landlord | Double-entry write surface |
| Legacy accounting bridge | `/api/accounting/transactions/` | CRUD | Landlord | Kept for compatibility with older consumers |
| Quick entry endpoints | `/api/accounting/record-income/`, `/api/accounting/record-expense/`, `/api/accounting/record-transfer/` | POST | Landlord | Validated balanced entry creation |
| Reports | `/api/accounting/dashboard/`, `/api/accounting/pnl/`, `/api/accounting/cashflow/`, `/api/accounting/rent-roll/`, `/api/accounting/tax-report/`, `/api/accounting/reports/trial-balance/`, `/api/accounting/reports/balance-sheet/`, `/api/accounting/reports/general-ledger/` | GET | Landlord | Some current logic still reads `Transaction` aggregates |
| Owner statements | `/api/accounting/owner-statements/`, `/api/accounting/owner-statements/generate/` | GET / POST | Landlord | Existing workflow unchanged |
| Period + recurring | `/api/accounting/periods/`, `/api/accounting/periods/{id}/lock/`, `/api/accounting/periods/{id}/unlock/`, `/api/accounting/recurring/`, `/api/accounting/recurring/{id}/run/` | CRUD + POST | Landlord | Period lock checks and recurring template run |
| Operations | `/api/expenses/`, `/api/accounting/late-fee-rules/`, `/api/maintenance-requests/`, `/api/messages/`, `/api/notifications/`, `/api/documents/` | CRUD / action routes | JWT | Operational/supporting modules |

### Security / tenancy model

- `OrganizationQuerySetMixin` scopes ORM lookups to `request.organization`.
- `resolve_request_organization()` is called before most accounting writes.
- `IsLandlord` protects accounting-heavy write operations.
- Public intake routes intentionally bypass auth.

### Accounting rollout status (agent handoff)

- New journal models and extended `Transaction` model are present.
- New accounting routes are in `backend/properties/urls.py`.
- New serializers exist for journal/period/recurring and COA hierarchy data.
- New COA seeding helper is in `backend/properties/utils.py` and is invoked during accounting reads.
- Legacy `ensure_default_categories` seeding is now deprecated/no-op in favor of chart-of-accounts bootstrap.
- Added management command `cleanup_accounts` to remove duplicate `AccountingCategory` entries by organization.
- Stripe payment path now creates posted JE and links `Transaction.journal_entry`.
- Frontend COA display now handles both nested and flat chart payloads, sorts by account code, indents hierarchy, and exposes account code + header/balance rendering behavior.
- Rent roll API and UI now include/read explicit `property_name` and `unit_number` fields.
- `seed_accounts` and `run_recurring_transactions` commands are still pending; duplicate cleanup command is now available.
- Some accounting report paths still read legacy `Transaction` totals in selected legacy views while journal-line-backed endpoints are now primary for new reporting flows.

## Frontend architecture

- `frontend/src/App.js`
  - Route map for auth, public pages, and protected dashboard pages
  - Public routes:
    - `/`
    - `/login`, `/register`
    - `/listing/:slug`, `/listing/:slug/apply`, `/browse-listings`
    - `/screening/consent/:token`, `/lease/sign/:token`
  - Protected routes under shared layout:
    - `/dashboard`, `/properties`, `/tenants`, `/screenings`, `/applications`, `/leases`
    - `/payments`, `/accounting*`, `/maintenance`, `/messages`, `/documents`, `/templates`
    - `/my-lease`, `/pay-rent`, `/listings`, `/settings` etc.
- `frontend/src/services/auth.js`
  - In-memory token handling and register/login/refresh/logout helpers
- `frontend/src/services/api.js`
  - Central API client (axios) with request/refresh interceptors
  - Dedicated methods for each backend endpoint including public + tenant/landlord flows
- `frontend/src/services/userContext.js`
  - User + organization context + role flags (`isTenant`, `isLandlord`, `isOrgAdmin`)
- `frontend/src/services/themeContext.js`
  - Session-scoped dark/light theme
- `frontend/src/components/Layout.js`
  - Sidebar, role-based nav sections, top bar, notifications
- `frontend/src/components/NotificationBell.js`
  - Read/unread UX with mark-as-read and popover list

## Data flow diagrams (agent quick references)

### 1) Tenant payment to double-entry

```text
Tenant
  -> POST /api/payments/create-intent/
  -> POST /api/payments/confirm/ (Stripe succeeded)
  -> Payment row written
  -> Transaction row written (legacy income record)
  -> _create_payment_journal_entry creates:
    - JournalEntry(status=posted, source_type=rent_payment)
    - JournalEntryLine: debit cash(1020), credit income(4100)
  -> Transaction.journal_entry points at created JournalEntry
```

### 2) Journal entry state transitions

```text
Landlord
  -> POST /api/accounting/record-income|record-expense|record-transfer
  or POST /api/accounting/journal-entries/
  -> _create_posted_journal_entry
    - validates debit/credit totals
    - validates locked periods and non-header/non-inactive accounts
    - creates JournalEntry + JournalEntryLines

Draft JE
  -> POST /api/accounting/journal-entries/{id}/post/
  -> revalidate balance + lock state
  -> set status=posted, posted_at

Posted JE
  -> POST /api/accounting/journal-entries/{id}/reverse/
  -> create mirror JE, mark source as reversed

Draft JE only
  -> POST /api/accounting/journal-entries/{id}/void/
  -> set status=voided
```

### 3) Reporting from posted lines

```text
JournalEntry(status=posted)
  -> JournalEntryLine (account, debit_amount, credit_amount)
  -> _posted_line_queryset(org, filters)
  -> reporting endpoints:
    - /api/accounting/categories/{id}/ledger/
    - /api/accounting/reports/trial-balance/
    - /api/accounting/reports/balance-sheet/
    - /api/accounting/reports/general-ledger/
  -> running balances use account.normal_balance
```

### 4) Org request context flow

```text
Request
  -> token/role middleware
  -> resolve_request_organization(request)
  -> querysets scoped to organization
  -> permissions + action-level rules
```

## Operational workflows

- **Tenant onboarding + listing flow**
  - Tenant submits public application -> landlord reviews -> approve/deny -> optionally create lease
  - Lease docs can be generated and sent to tenant via tokenized link
- **Screening flow**
  - landlord creates/runs screening and sends tokenized tenant consent link
  - public consent endpoint records tenant status/ssn/timestamp
- **Payments and accounting**
  - Stripe intents for monthly payment (tenant side)
  - Payment creation posts financial records and keeps rent ledger consistent via signals
  - Accounting layer supports reporting, top categories, PnL, cashflow, tax exports, and owner statements
- **Notifications**
  - recurring in-app notifications and optional email side effects through command jobs and action triggers

## Automation / jobs

Configured as Django management commands (callable manually, suitable for scheduler hooks):

- `backend/properties/management/commands/check_notifications.py`
  - emits rent due/overdue and lease-expiry notifications
- `backend/properties/management/commands/apply_late_fees.py`
  - computes late fees for delinquent active leases
- `backend/properties/management/commands/cleanup_accounts.py`
  - removes duplicate COA categories per organization for name-based collisions
- `backend/properties/management/commands/seed_data.py`
  - loads demo dataset for local environments
- `backend/properties/management/commands/create_admin.py`
  - creates default admin + org (used by backend startup config)

## Environment and run notes

Backend expects env vars in `backend/.env`:

- `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`
- `DATABASE_URL` (defaults to sqlite if unset)
- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`
- email settings: `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`
- optional `EMAIL_BACKEND` override

Frontend expects:

- `REACT_APP_API_URL` (base API URL)
- `REACT_APP_STRIPE_PUBLISHABLE_KEY`

## Quick start

```bash
# backend
cd backend
python -m venv .venv
# activate venv
pip install -r requirements.txt
cp .env.example .env   # if you create one from backend/.env
python manage.py migrate
python manage.py create_admin
python manage.py runserver

# frontend
cd ../frontend
npm install
npm start
```

## Deployment/build artifacts

- `backend/Procfile`: runs `create_admin` then `gunicorn backend.wsgi`
- `frontend/Dockerfile`: builds static React bundle and serves on port 3000 via `serve`
- `backend/build.sh`: install deps, collectstatic, migrate, create default superuser

## Notes for contributors

This README is intended as a fast onboarding map for agents:
- start by reading `backend/properties/models.py`, `backend/properties/views.py`, and `frontend/src/App.js`
- for cross-cutting tenancy behavior, inspect `backend/properties/middleware.py`, `mixins.py`, and `permissions.py`
