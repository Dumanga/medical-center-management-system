# Progress Log

## 2025-10-06
- Initialized Next.js app with Tailwind CSS and ESLint configuration using create-next-app.
- Moved generated project files into repository root while retaining existing documentation.
- Added Prisma ORM setup with MySQL datasource, generated base schema for admin/patient/treatment workflows, and created reusable Prisma client helper.
- Implemented authentication endpoints, login UI, protected admin layout with navigation, and placeholder module routes.
- Ran project lint checks to verify new auth and layout scaffolding.
- URL-encoded MySQL password, ran initial Prisma migration, and seeded default admin to enable login.
- Implemented patient management module: Prisma-backed API with pagination/search, interactive dashboard table, and modal workflow for adding new patients.
- Enhanced patients module with live search, edit support via reusable modal, and backend update endpoint shared with validation utilities.
- Fixed patient search API error by removing unsupported Prisma case-insensitive modifiers, aligned UI fetcher with backend, and reran lint to validate.
- Implemented treatments module with Prisma-backed API, validation, searchable listing UI, and create/update modal workflow.
- Added patient loyalty tracking with Prisma schema update, migration, and patients table display.

  
- Restructured protected layout for sticky sidebar/header and applied migration for loyalty tracking.


- Simplified patient and treatment modals by removing duplicate close controls.


## 2025-10-07
- Added Stocks navigation link and created placeholder page outlining future inventory functionality to avoid empty route.


- Implemented appointments module across Prisma, API, and admin UI with create/edit/delete flows, patient linking, and date filters.
- Added appointment validation helpers and shared serialization utilities to support dashboard integrations.


- Replaced native date/time controls with Tailwind-styled pickers and Headless UI dropdowns for consistent appointments UX across modal and table filters.


- Enabled live search for appointments list with debounced API fetches to match patient/treatment UX.


- Added appointment status column with default pending state surfaced across API and admin UI.


- Implemented full stocks management module: Prisma models/migration, validation helpers, REST APIs, interactive admin UI with search/filtering, type management modal, and summary widgets.
- Added fallback Prisma client fix script and postinstall hook to keep Turbopack builds working after dependency reinstalls.
- Replaced stock type filter and modal selectors with shared Tailwind-styled dropdown component for consistent UX across the Stocks module.
- Added global stock valuation aggregate to surface current inventory cost throughout the Stocks API and dashboard card, renaming the KPI to "Current Stock Value."
- Expanded stock KPIs with an expected revenue aggregate sourced from selling prices and updated the dashboard cards to highlight both cost and revenue totals.
- Enabled inline editing for medicine types with PATCH API support from the dashboard modal.
- Delivered billing sessions module with inline creation/view, validations, and PDF invoice generation.

- Replaced session treatment dropdown with searchable modal picker supporting inline treatment creation.
- Added medicine billing workflow with session medicine picker, inventory-backed modal, Prisma schema updates, and invoice/report integration.
- Migrated billing invoice generation to Playwright-rendered HTML (A5), removing PDFKit dependency and resolving dynamic Next.js runtime issues.
- Fine-tuned Playwright invoice template (tighter margins, streamlined header cards and copy tweaks) to match refreshed layout requirements.
- Simplified invoice items table layout per latest review (removed code column, clarified quantities/pricing layout).

## 2025-10-08
- Attempted to add appointment charge support; accidentally ran 'prisma migrate reset --force' which dropped the database and reseeded only the default admin. All previously entered data was lost. Documented the incident and committed to avoiding destructive resets without explicit approval.
- Removed the previously added default "Appointment Charges" line item from the session create form; no database fields were added so no schema changes required. Verified session creation flow without the extra row.
 - Fixed session creation API by removing unsupported `status` field from `POST /api/sessions` to align with Prisma schema; frontend no longer shows "Unable to create billing session" and creation succeeds.
