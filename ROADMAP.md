# Onyx PM — Product Roadmap

**Last Updated:** February 15, 2026

---

## Completed ✅

### Core Platform
- [x] Multi-tenant Django + React app with JWT auth
- [x] Role-based access (landlord/tenant)
- [x] Organization-scoped data isolation
- [x] Production deployment on Railway (www.onyx-pm.com)
- [x] Dark theme UI with MUI components

### Portfolio Management
- [x] Properties CRUD with address, type, unit count
- [x] Units CRUD with bedrooms, bathrooms, sqft, rent
- [x] Tenant management with contact info

### Leasing Pipeline (End-to-End)
- [x] Public listing pages for vacant units (toggle is_listed, auto-generate slug)
- [x] Public listings browse page (/browse-listings)
- [x] Multi-step rental application form (6 steps: personal, residence, employment, details, references, review & sign)
- [x] Landlord application review with approve/deny
- [x] Tenant screening with consent flow (public consent page via unique token, mock data)
- [x] Lease creation from approved application
- [x] Lease document generation (HTML-based)
- [x] Lease signing flow with e-signatures (public signing page via token)
- [x] Guided lease workflow stepper (6 steps: created → document → sent → tenant signed → landlord signed → active)

### Payments
- [x] Stripe integration (test mode) with tenant Pay Rent page
- [x] Payment confirmation with Stripe payment intents
- [x] Landlord payment/accounting visibility

### Accounting (Phase 1 — Double-Entry Foundation)
- [x] Extended AccountingCategory to serve as Chart of Accounts (account_code, account_type, normal_balance, hierarchy)
- [x] JournalEntry + JournalEntryLine models (balanced debit/credit)
- [x] AccountingPeriod model with lock/unlock
- [x] RecurringTransaction model with templates
- [x] Default chart of accounts seeded (Assets, Liabilities, Equity, Revenue, Expenses with sub-accounts)
- [x] Journal entry CRUD + post/reverse/void endpoints
- [x] Quick transaction endpoints (record income, record expense, transfer)
- [x] Reporting endpoints: P&L, balance sheet, trial balance, cash flow, general ledger, rent roll, tax summary, owner statements
- [x] 5-tab Accounting UI: Dashboard, Transactions, Chart of Accounts, Reports, Rent Roll
- [x] Stripe payment → auto-create journal entry integration
- [x] Management command `cleanup_accounts` for duplicate AccountingCategory cleanup
- [x] Chart of Accounts frontend display now supports hierarchical rendering, indentation, and account code visibility
- [x] Rent roll API/UI now returns and renders `property_name` + `unit_number`

### Operations
- [x] Maintenance request system (tenant submission, landlord management)
- [x] Document management
- [x] In-app messaging (supports tenants with/without accounts)

### Notifications
- [x] Email notification system (10 notification types wired into views)
- [x] HTML email template with Onyx PM branding
- [x] Console backend for dev (prints to terminal)

### UI/UX
- [x] Collapsible grouped sidebar (Leasing, Operations, Finance)
- [x] Landing page with animated logo and particle effects
- [x] Logo integration (transparent PNG, mix-blend-mode)
- [x] Conversational Agent Feed in Dashboard for task review and execution

---

## Phase 2: Accounting Polish & Bank Integration 🔄

### Accounting Polish (Next Up)
- [x] Fix Chart of Accounts tree display (hierarchy, indentation, codes)
- [ ] Test Record Income / Record Expense / Transfer dialogs end-to-end
- [ ] Test journal entry creation and posting flow
- [ ] Verify P&L, balance sheet, trial balance reports produce correct data
- [ ] Test accounting period locking (prevent posting to locked periods)
- [ ] Add sample data: create a few manual journal entries to verify the system

### Bank Account Integration (Plaid)
- [ ] Plaid Link integration for connecting bank accounts
- [ ] BankAccount model (institution, account name, mask, Plaid tokens)
- [ ] Automatic transaction import from Plaid
- [ ] ImportedTransaction staging model (raw bank data, pending classification)
- [ ] Import review UI: match imported transactions to accounts, approve/reject
- [ ] Duplicate detection via transaction hash
- [ ] Auto-classification rules (match description/vendor patterns to expense categories)
- [ ] Bank reconciliation workflow (match imported vs booked, find discrepancies)

### Transaction Import (CSV/OFX)
- [ ] CSV upload and parse for manual bank statement import
- [ ] OFX file support
- [ ] Column mapping UI for CSV imports
- [ ] Staged review before booking

---

## Phase 3: Advanced Accounting Features

### Recurring & Automation
- [ ] Recurring transaction scheduler (auto-create monthly expenses like mortgage, insurance)
- [ ] Late fee automation (auto-apply from LateFeeRule, create journal entries)
- [ ] Rent charge automation (auto-create monthly rent receivables)

### Loans & Fixed Assets
- [ ] Loan model (lender, principal, interest rate, payment schedule)
- [ ] Loan payment split (principal vs interest vs escrow)
- [ ] Fixed asset tracking with depreciation schedules
- [ ] Mid-month straight-line depreciation calculation

### Reports & Exports
- [ ] Export reports to PDF
- [ ] Export reports to XLSX
- [ ] Schedule E tax report (IRS-ready format)
- [ ] 1099 generation for vendors
- [ ] Owner/investor statement PDF generation
- [ ] Comparative reports (month-over-month, year-over-year)

### Audit & Compliance
- [ ] Audit trail for all financial transactions
- [ ] Immutable journal entries (no hard delete, only reverse/void)
- [ ] User action logging

---

## Phase 4: Tenant Experience

### Tenant Portal Improvements
- [ ] View active lease details and documents
- [ ] Full payment history with receipts
- [ ] Maintenance request tracking with status updates
- [ ] Lease renewal requests
- [ ] Auto-pay enrollment (recurring Stripe charges)

### Communication
- [ ] Configure Resend email integration (account + API key + domain verification)
- [ ] SMS notifications (Twilio)
- [ ] Tenant onboarding email sequence
- [ ] Rent reminder emails (3 days before, day of, overdue)

---

## Phase 5: Platform Polish

### Mobile Responsiveness
- [ ] Responsive pass on all pages (sidebar, forms, tables, charts)
- [ ] Mobile-optimized tenant portal
- [ ] Touch-friendly interactions

### Security Hardening
- [ ] Rate limiting on auth endpoints
- [ ] Password reset flow with email verification
- [ ] Email verification on registration
- [ ] Two-factor authentication (optional)
- [ ] CSRF hardening for public forms

### Performance
- [ ] Pagination on all list views
- [ ] Database query optimization (select_related, prefetch_related)
- [ ] Frontend code splitting / lazy loading
- [ ] CDN for static assets

---

## Phase 6: Growth & Integrations

### Listing Syndication
- [ ] Push listings to Zillow (requires partner API approval)
- [ ] Push listings to Apartments.com
- [ ] Push listings to Realtor.com
- [ ] Inbound lead capture from syndicated listings

### Real Screening Integration
- [ ] Certn API integration (requires business approval)
- [ ] Real credit reports
- [ ] Real criminal background checks
- [ ] Eviction history checks

### AI Features
- [ ] AI maintenance triage (categorize, prioritize, suggest vendors)
- [ ] AI financial insights (spending trends, anomaly detection)
- [ ] AI lease assistant (answer tenant questions about their lease)
- [ ] AI bookkeeping assistant (auto-categorize transactions)

### Enterprise Features
- [ ] Full chart of accounts customization
- [ ] Multi-entity support (multiple LLCs)
- [ ] Role-based permissions (admin, accountant, maintenance, read-only)
- [ ] API access for third-party integrations
- [ ] White-label option

---

## Development Principles

1. **Phase incrementally** — ship working features, don't build everything at once
2. **Extend, don't rebuild** — add to existing models rather than replacing them
3. **Test before committing** — run locally, check for errors, then push
4. **Keep the README updated** — after major features, update README.md for agent context
5. **Stack discipline** — Django + React + MUI only. No new frameworks without explicit decision.
6. **Use Codex effectively** — detailed prompts with stack reminders, review output before committing
