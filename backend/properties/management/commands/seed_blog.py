from datetime import datetime

from django.core.management.base import BaseCommand
from django.utils import timezone

from properties.models import BlogPost


class Command(BaseCommand):
    help = "Create seeded published blog posts for the Onyx PM marketing blog."

    def handle(self, *args, **options):
        posts = [
            {
                "title": "Why Small Landlords Are Switching to Free Property Management Software",
                "slug": "why-small-landlords-switching-to-free-property-management-software",
                "excerpt": "Small landlords are abandoning expensive platforms in favor of modern free tools that remove hidden fees and unlock essential automations.",
                "content": """# Why Small Landlords Are Switching to Free Property Management Software

Small landlords managing 1 to 50 units are one of the most underserved groups in the software market.
For many years, the core promise of property management software was simple:
centralize tasks, send reminders, track payments, and report income.
Yet the pricing models of many established platforms have quietly moved away from this promise.

## The True Cost of Expensive Platforms

Most legacy tools charge by unit, with pricing tiers that become painful at 10, 20, or 50 units.
What starts as a manageable monthly bill can quickly become a fixed overhead line:

- **Per-unit pricing** that grows with your portfolio
- **Role-based add-ons** that gate basic features
- **Fee stacks** for text alerts, maintenance photos, and banking integrations
- **Overage charges** for invoices, custom email, or extra users

The result is a hidden burden. A landlord who starts at one property can end up paying more than they would in property taxes and insurance, especially during slow vacancy periods.

## Where Traditional Systems Fall Short

Many mainstream solutions were built for large portfolios first and then scaled down, which creates friction for smaller operators:

- Feature gates that hide useful capabilities unless the account is upgraded.
- Workflows designed around enterprise-style teams rather than solo owners.
- Complicated onboarding and support plans that feel heavy for lean teams.

When a landlord only needs dependable tools - tenant communication, rent tracking, accounting, and document storage - too many features become complexity, not value.

## The Rise of Free Alternatives

The market is now shifting toward **free-first models**:

1. Lower or zero base costs with premium optional modules.
2. Usage that favors scale, not unit count.
3. Transparent pricing where every extra charge is clear.
4. Faster onboarding for first-time operators.

This shift is not about giving away quality. It is about removing unnecessary friction.
Modern infrastructure allows teams to charge for support and value-add services while keeping the core platform accessible.

## Why Free Is Attractive in 2026

Small landlords care about predictability.
A free platform can reduce fixed monthly software spend, allowing capital to stay in the business for
property upgrades, emergency reserves, and tenant retention.
This is especially important for portfolios still growing from 1-3 units into 20-30 units, where margins are tight.

## Why Onyx PM Stands Out

Onyx PM is built for long-run growth without surprise pricing.
Our platform supports **unlimited units at no base charge**, while giving small landlords access to the same production workflows used by larger operators:

- Lease and tenant lifecycle tools
- Built-in accounting and double-entry transaction handling
- Maintenance request pipelines
- Reporting for occupancy, cash flow, and aging balances

If you are evaluating whether to move off Buildium or AppFolio, the question is no longer whether a free platform can do the job.
The question is whether legacy pricing can still justify its friction.

For small landlords, the answer is getting harder to defend.
""",
                "author_name": "Onyx PM Team",
                "category": "industry_news",
                "tags": "property management, free software, landlords, cost savings",
                "featured_image_url": "",
                "is_published": True,
                "published_at": timezone.make_aware(datetime(2026, 1, 3, 9, 0, 0)),
                "read_time_minutes": 6,
                "meta_description": "Explore why small landlords are leaving expensive platforms for free property management tools, and how Onyx PM supports unlimited units.",
            },
            {
                "title": "Double-Entry Accounting for Property Managers: A Complete Guide",
                "slug": "double-entry-accounting-for-property-managers-a-complete-guide",
                "excerpt": "Learn how double-entry accounting works in property management and how rent rolls, expenses, and revenue flow through debit and credit lines.",
                "content": """# Double-Entry Accounting for Property Managers: A Complete Guide

If you still track rental income with spreadsheets and mental math, you are leaving clarity and control on the table.
Double-entry accounting is the foundation of reliable financial reporting, and it is especially important for property operations.

## The Core Idea

Every transaction has two sides:

- A **debit** to one account
- A **credit** to another account

This is not bureaucracy; it is the mechanism that keeps the books balanced.
The total debits and credits for any entry must always match.

## Why It Matters for Rental Properties

Rental businesses often move through many recurring financial events:

- Rent posted from tenant invoices
- Maintenance invoices from vendors
- Mortgage and insurance payments
- Security deposit handling
- Owner distributions and reserves

Without structured accounting, these items blur together quickly.
Double-entry gives each payment and bill a clear identity in the ledger.

## The Main Account Structure

A clean chart of accounts should separate:

- **Assets**: cash, bank accounts, accounts receivable, security deposits
- **Liabilities**: mortgage, accounts payable, security deposit liabilities
- **Equity**: owner contributions, capital accounts, retained earnings
- **Revenue**: rental income, late fees, application fees
- **Expenses**: repairs, insurance, property tax, utilities, payroll, software

When this structure is stable, performance and tax reporting become much easier.

## Common Property Management Entries

### 1) Rent Received
- Debit: Cash or Bank
- Credit: Rental Income

### 2) Repair Expense
- Debit: Repairs and Maintenance Expense
- Credit: Accounts Payable or Cash

### 3) Mortgage Payment
- Debit: Interest Expense and/or Principal Reduction
- Credit: Cash/Bank

## Where Errors Usually Happen

Most mistakes happen when people reverse the sides of a line item:

- Crediting asset accounts by accident
- Mixing maintenance and property-level expenses
- Forgetting to close payment batches to the same period
- Letting deposits and operating cash flow stay in one vague bucket

Each error may look small but accumulates into reconciliation delays and tax surprises.

## How Onyx PM Automates Accounting

Onyx PM handles these repetitive movements with templates and validation checks.
You can define recurring transactions for rent charges, bank reconciliations, and routine bills.
Journal entries are posted with complete debit/credit detail, so your books remain balanced and auditable.

For property operators, this is not only cleaner reporting.
It is a lower-cost path to professional financial control.
""",
                "author_name": "Onyx PM Team",
                "category": "accounting",
                "tags": "accounting, double-entry, bookkeeping, property management, chart of accounts",
                "featured_image_url": "",
                "is_published": True,
                "published_at": timezone.make_aware(datetime(2026, 1, 10, 9, 0, 0)),
                "read_time_minutes": 8,
                "meta_description": "A practical guide to double-entry bookkeeping for landlords covering debits, credits, account structure, and recurring entries in property management.",
            },
            {
                "title": "How AI is Transforming Property Management in 2026",
                "slug": "how-ai-is-transforming-property-management-in-2026",
                "excerpt": "Discover how AI powers smarter maintenance triage, expense auto-categorization, and occupancy forecasting in modern property operations.",
                "content": """# How AI is Transforming Property Management in 2026

Artificial intelligence is no longer a future concept for landlords.
It is becoming the engine behind faster service, cleaner data, and better forecasting.

## Practical AI in Everyday Operations

The first wave of AI in property management can be grouped into three operational areas.

### 1) Automation
- Classify expense rows into chart-of-accounts categories
- Suggest follow-up actions for overdue payments
- Draft tenant email templates for late notices and maintenance updates

### 2) Intelligence
- Prioritize tickets by risk and urgency
- Identify vacancy patterns by month and unit type
- Flag unusual spending spikes before they become budget problems

### 3) Assistant Layer
- Answer leasing or tenant questions with context from property files
- Help staff draft notices and replies
- Summarize payment and occupancy trends quickly

## AI vs. AI-Native Platforms

Many teams bolt on chatbots that reply from generic scripts.
That helps only at the edge.

An AI-native platform, on the other hand, feeds the model with:

- Lease terms
- Financial postings
- Maintenance history
- Resident interactions and preferences

This deeper context enables better recommendations and fewer irrelevant outputs.

## Where AI Helps the Most

### Expense Processing
Insurance claims, repair invoices, and software bills often have messy vendor names.
AI can learn your mappings and reduce manual posting errors.

### Maintenance Triage
Support teams can lose hours prioritizing incoming requests.
AI can score urgency by keywords, lease terms, and historical patterns.

### Predictive Vacancy Planning
Machine learning models estimate which units or buildings are at highest churn risk.
That supports better leasing strategy and proactive marketing.

## Addressing Concerns

Landlords often ask if AI will replace judgment.
The strongest use case is not replacement, but amplification.
AI can summarize data, highlight exceptions, and propose actions.
Your team still approves and communicates the human parts.

## The Onyx PM Difference

Onyx PM is architected as a property-aware assistant platform rather than a generic chatbot.
Our workflows connect property records, accounting, and communication so AI suggestions are grounded in real operational data.

The shift in 2026 is clear:
successful landlords are not choosing whether to use AI.
They are choosing which platform gives them trustworthy, explainable, and actionable AI.
""",
                "author_name": "Onyx PM Team",
                "category": "ai_technology",
                "tags": "AI, property management, automation, machine learning, proptech",
                "featured_image_url": "",
                "is_published": True,
                "published_at": timezone.make_aware(datetime(2026, 1, 17, 9, 0, 0)),
                "read_time_minutes": 7,
                "meta_description": "Understand how AI is reshaping property management with practical examples in triage, automation, prediction, and tenant/landlord workflows.",
            },
            {
                "title": "The Complete Tenant Screening Checklist for Landlords",
                "slug": "complete-tenant-screening-checklist-for-landlords",
                "excerpt": "A step-by-step tenant screening checklist covering income verification, credit checks, references, and fair housing compliance.",
                "content": """# The Complete Tenant Screening Checklist for Landlords

Tenant screening protects occupancy, reduces disputes, and protects your cash flow.
Without a consistent process, good applicants can be missed and risky tenants accepted too easily.

## 1) Build a Structured Application

Start with a complete application form that captures:

- Personal and contact information
- Employment and income details
- Credit and background consent
- Prior landlord and references
- Emergency contacts

Consistency at intake is critical for comparing applicants side by side.

## 2) Verify Income Early

A common benchmark is the **3x rule**:
monthly gross income should be at least three times the monthly rent.
Use pay stubs, tax returns, or bank statements.

If income is near the threshold, collect additional proof before approval.

## 3) Perform Credit Check

Credit history helps estimate payment reliability.
Focus on late trends and revolving debt burden, not just score alone.
A high score with recent severe delinquencies may still require caution.

## 4) Background and Eviction Search

Run criminal and eviction history checks according to local rules.
Do not rely on informal references for legal verification.

Check:

- Eviction filings and judgments
- Criminal convictions linked to violence or property damage
- Outstanding civil judgments that indicate financial stress

## 5) Reference Checks

Never skip current employer, previous landlord, and personal references.
Ask for timelines, payment patterns, and property care habits.

## 6) Respect Fair Housing

Screening must be neutral and documented.
Apply the same criteria to every application.
Avoid protected-class discrimination and keep notes objective:
income, credit, occupancy history, and references.

## 7) Final Approval Workflow

Create a transparent scoring flow so every reviewer can replicate the decision.
Document approvals and declines with concise reasons.

## How Onyx PM Helps

Onyx PM includes a built-in screening workflow so teams can move from application intake to review faster.
You can standardize required documents, track status, and keep communication in one place.

Better screening is not about rejecting people.
It is about selecting reliable tenants with enough information to reduce disputes and vacancies.
""",
                "author_name": "Onyx PM Team",
                "category": "tips_tricks",
                "tags": "tenant screening, background checks, credit checks, landlord tips, fair housing",
                "featured_image_url": "",
                "is_published": True,
                "published_at": timezone.make_aware(datetime(2026, 1, 24, 9, 0, 0)),
                "read_time_minutes": 6,
                "meta_description": "A practical checklist for landlords covering application review, income rules, background checks, references, and fair-housing compliant tenant screening.",
            },
            {
                "title": "Introducing Bank Reconciliation and CSV Import in Onyx PM",
                "slug": "introducing-bank-reconciliation-and-csv-import-in-onyx-pm",
                "excerpt": "Learn how to import bank statements, map CSV columns, review matches, and complete reconciliation workflows in Onyx PM.",
                "content": """# Introducing Bank Reconciliation and CSV Import in Onyx PM

Accounting accuracy improves once cash movement can be traced back to original bank activity.
That is why bank reconciliation is a major accounting milestone.

Onyx PM now includes a full CSV import and reconciliation flow designed for small-to-midsize landlords.

## Import Flow: Upload to Book

### Step 1: Upload
From the reconciliation workspace, upload your bank export CSV.
The file can include raw transaction rows with date, description, amount, and balance.

### Step 2: Map Columns
The mapper lets you assign CSV headers to required fields.
This one-time setup can be reused per bank for consistency.

### Step 3: Review
Imported transactions appear as pending items.
Review them before posting to avoid wrong account mappings.

### Step 4: Book
Once mapped and reviewed, transactions are converted into draft ledger activity that can be posted into your chart of accounts.

## Reconciliation Workspace

Once imports are posted, reconciliation compares:
- Bank transactions
- Existing book entries
- Unmatched exceptions

You can mark matches, create auto-rules, and resolve differences directly from the interface.
This replaces guesswork and scattered spreadsheets.

## Why Auto-Classification Helps

Machine-assisted classification rules learn repeating patterns:
- Vendor name -> category
- Description text -> account
- Amount range -> typical expense type

This is especially useful for repair vendors and recurring service charges.

## Typical Landlord Benefits

- Faster month-end close
- Clearer visibility into outstanding items
- Reduced manual posting errors
- Better tax-ready financials
- Stronger communication with accountants

## Onyx PM Workflow in Practice

1. Upload January statement.
2. Map your bank columns once.
3. Review pending lines and approve postings.
4. Match statement rows against journal entries.
5. Resolve any unmatched differences in one screen.

This workflow is now available for active users and designed to scale with your portfolio.
""",
                "author_name": "Onyx PM Team",
                "category": "product_updates",
                "tags": "product update, bank reconciliation, CSV import, accounting, Onyx PM",
                "featured_image_url": "",
                "is_published": True,
                "published_at": timezone.make_aware(datetime(2026, 1, 31, 9, 0, 0)),
                "read_time_minutes": 5,
                "meta_description": "Announcing Onyx PM bank reconciliation and CSV import flow, with guided mapping, review, matching, and posting for accurate monthly close.",
            },
            {
                "title": "5 Common Bookkeeping Mistakes Landlords Make (And How to Avoid Them)",
                "slug": "5-common-bookkeeping-mistakes-landlords-make-and-how-to-avoid-them",
                "excerpt": "Avoid costly bookkeeping errors with practical fixes for personal account mixing, unreconciled statements, and tax season surprises.",
                "content": """# 5 Common Bookkeeping Mistakes Landlords Make (And How to Avoid Them)

Many landlords are strong on property operations but weak on disciplined bookkeeping.
These recurring errors can quietly drain cash and create tax stress.

## 1) Mixing Personal and Business Expenses

**Consequence:** Profit and tax positions become distorted, and deductions become harder to defend.

**Fix:** Create separate bank feeds and account rules. Every vendor card and utility bill should flow to business accounts only.

## 2) Not Tracking All Income

Late fees, application fees, and damage recoveries often get recorded inconsistently.

**Consequence:** Income statements understate revenue; occupancy and pricing decisions become less reliable.

**Fix:** Post every accepted payment and fee using standardized transaction templates with clear line accounts.

## 3) Skipping Bank Reconciliation

If your books are not reconciled, you do not truly know your cash position.

**Consequence:** Duplicate charges, missing fees, and payment posting mistakes persist.

**Fix:** Reconcile monthly and compare each bank line to posted entries.

## 4) Ignoring Depreciation and Capitalization

Many operators expense everything and later find asset replacement and tax treatment inconsistent.

**Consequence:** Profit can look volatile; tax planning becomes uncertain.

**Fix:** Track capital assets properly and work with your accountant on depreciation methods that match portfolio structure.

## 5) Weak Record Retention

Disorganized invoices and receipts make year-end close painful.

**Consequence:** Missed deductions, delayed filings, and compliance risk.

**Fix:** Centralize documents by property and transaction type with searchable metadata.

## Why Software Helps

The right system enforces repeatable processes:
- Categorized imports
- Reconciled reports
- Audit trails
- Consistent recurring entries

Onyx PM is built to reduce these five mistakes with better organization and practical guardrails.
""",
                "author_name": "Onyx PM Team",
                "category": "tips_tricks",
                "tags": "bookkeeping, landlord mistakes, accounting tips, property management",
                "featured_image_url": "",
                "is_published": True,
                "published_at": timezone.make_aware(datetime(2026, 2, 7, 9, 0, 0)),
                "read_time_minutes": 6,
                "meta_description": "Avoid the five biggest landlord bookkeeping mistakes with practical fixes for expense tracking, reconciliation, and tax-ready records.",
            },
            {
                "title": "Digital Lease Signing: Why Paper Leases Are Dead",
                "slug": "digital-lease-signing-why-paper-leases-are-dead",
                "excerpt": "Discover how digital lease signing improves speed, auditability, and tenant conversion while staying legally compliant.",
                "content": """# Digital Lease Signing: Why Paper Leases Are Dead

Paper leases have served property management for decades, but they do not serve remote-first leasing workflows.
Digital signing is now the practical standard, and for good reason.

## Speed

Paper documents require printing, shipping, printing, and manual follow-up.
Digital signing turns this into an instant notification and signature cycle.

Benefits include:
- Faster execution for remote applicants
- Reduced lost paperwork
- Faster occupancy and lease start dates

## Convenience

Tenants complete signing from phone or laptop.
Property teams review and countersign without waiting for in-person delivery.

## Legal Validity

Electronic signatures are legally recognized under e-signature frameworks in most jurisdictions when implemented correctly.
Key requirements include consent, traceability, and secure audit logging.

## Audit Trail

Digital flows create immutable timestamps, IP metadata, and version history.
This transparency is critical when disputes occur.

## Onyx PM Digital Lease Process

1. Generate lease document
2. Send secure tenant link
3. Tenant signs remotely
4. Landlord countersigns
5. Lease activates automatically in tenant and property records

This reduces coordination overhead and improves compliance.

## Common Concerns

Some teams worry about legal exposure.
The solution is to combine compliant templates, clear consent messaging, and complete signing logs.

Onyx PM provides controls so you can preserve legal strength while improving operational speed.

In practice, digital leases are not a gimmick.
They are a productivity shift that converts faster and documents better.
""",
                "author_name": "Onyx PM Team",
                "category": "property_management",
                "tags": "lease signing, e-signatures, digital leases, property management, paperless",
                "featured_image_url": "",
                "is_published": True,
                "published_at": timezone.make_aware(datetime(2026, 2, 14, 9, 0, 0)),
                "read_time_minutes": 5,
                "meta_description": "Learn why digital lease signing improves lease speed, legal compliance, and auditability while reducing delays and paperwork.",
            },
            {
                "title": "How to Set Up a Chart of Accounts for Your Rental Properties",
                "slug": "how-to-set-up-a-chart-of-accounts-for-your-rental-properties",
                "excerpt": "A practical setup guide for organizing accounts into assets, liabilities, equity, revenue, and expenses in property management.",
                "content": """# How to Set Up a Chart of Accounts for Your Rental Properties

A clean chart of accounts is the foundation of clean reporting.
Without it, your income statements and tax prep are always a cleanup project.

## Start with the Core Structure

Use a standardized hierarchy that can scale across properties.

### Assets
- Cash
- Bank Accounts
- Accounts Receivable
- Security Deposits Held

### Liabilities
- Accounts Payable
- Security Deposit Liability
- Mortgage Payable

### Equity
- Owner's Equity
- Retained Earnings

### Revenue
- Rental Income
- Late Fees
- Application Fees

### Expenses
- Repairs and Maintenance
- Insurance
- Property Taxes
- Utilities
- Management Fees

## Practical Setup Process

1. Create high-level accounts first
2. Add property-specific sub-accounts where needed
3. Set tax tags and reporting names consistently
4. Connect recurring templates and import rules

## Why Consistency Matters

Inconsistent naming creates confusion in reporting.
A tenant's late fee posted to two different revenue accounts can hide true property performance.

## Mapping Property Activity

For each transaction type, define one default debit and credit account pair.
When exceptions occur, enforce review before posting.

## Tax Readiness

Clear account structure shortens annual close.
You can run P&L and property-level reports without reclassification during audit season.

## Onyx PM Auto-Seeded COA

To save setup time, Onyx PM can auto-seed a landlord-ready chart of accounts.
It gives you a practical default and remains customizable by property type, jurisdiction, and workflow.

For growing landlords, this prevents the most common problem: delaying setup until after problems appear.
""",
                "author_name": "Onyx PM Team",
                "category": "accounting",
                "tags": "chart of accounts, accounting setup, rental properties, bookkeeping, COA",
                "featured_image_url": "",
                "is_published": True,
                "published_at": timezone.make_aware(datetime(2026, 2, 21, 9, 0, 0)),
                "read_time_minutes": 7,
                "meta_description": "Set up a practical chart of accounts for rental properties with asset, liability, equity, revenue, and expense structure plus implementation tips.",
            },
        ]

        for post_data in posts:
            BlogPost.objects.update_or_create(
                slug=post_data["slug"],
                defaults=post_data,
            )

        self.stdout.write(self.style.SUCCESS(f"Seeded {len(posts)} blog posts."))
