Multi-Tenancy, 4-Role Access Model & Data Segregation (j3d.msoms.ai)

1. Multi-Tenancy Architecture & Tenant Resolution

J3D is designed as a multi-tenant platform supporting both the flagship public UAE marketplace (tenant_slug = 'msoms-uae') and dedicated organizational tenants (such as UAE schools/universities, corporate gifting portals, or municipal innovation labs) within a single deployment.

Tenant Identification Order

Every incoming HTTP and WebSocket request resolves its tenant_id via TenantResolutionMiddleware in the following strict order:

Authenticated Session Claim (req.user.tenantId): Extracted from the signed HTTP-only __Host-j3d_access JWT cookie. Authenticated users can never override their tenant_id via headers or query parameters (except SUPER_ADMIN accounts inspecting tenant diagnostics).

Subdomain / Host Header: Resolves <tenant>.j3d.msoms.ai or defaults j3d.msoms.ai to the primary msoms-uae tenant UUID.

Explicit Header (X-Tenant-Slug): Used only for unauthenticated public landing page catalog fetches.

2. The Four User Groups & Role Segregation

Every user record belongs to a tenant_id and is assigned one of the four platform roles (UserRole enum):

User Group (UserRole)

Primary Persona

Data Visibility & Operational Scope

ADMIN (Administrators)

Platform & tenant operations team

Full tenant-wide CRUD over Users (with role filtering & pagination), generated .STL files, Categories, Templates, Disputes, Alarms, Audit Logs, Gemini AI Key/Model configuration, and Resend Email configuration.

CLIENT (Clients / Requesters)

Individuals, families, students, SMEs

Can run the AI Typeform 3D wizard, preview and customize .STL models, submit orders with Print & Delivery budgets in AED, approve counter-offers, view their own orders, and view their own 6-digit Delivery OTP.

PRINTER_PROVIDER (3D Printer Owners)

Local hobbyists & print farm owners in UAE

Can configure their printer fleet (bed dimensions, materials, multicolor capability), view open marketplace orders (PENDING_PRINTER, BIDDING_PRINTER), download .STL files for open/assigned jobs, submit print bids, upload batch completion photos, and view the 6-digit Pickup OTP for assigned couriers.

DELIVERY_PROVIDER (Delivery Services)

Independent UAE couriers & fleet drivers

Can toggle online availability, view packaged orders in UNDER_DELIVERY (READY_FOR_PICKUP, BIDDING_DELIVERY) with pickup/drop-off emirate & district, submit delivery bids in AED, and verify Pickup OTP and Delivery OTP codes to complete delivery.

3. PostgreSQL 16 Row-Level Security (RLS) Isolation

Every multi-tenant table in PostgreSQL 16 includes a mandatory tenant_id UUID NOT NULL column. Before executing any Prisma query, a NestJS Prisma $extends client extension wraps the query in a transaction that binds session-local variables:

SET LOCAL app.current_tenant_id = '0192f100-0000-7000-8000-000000000001';

SET LOCAL app.current_user_id   = '0192f100-0000-7000-8000-000000000042';

SET LOCAL app.current_user_role = 'PRINTER_PROVIDER';

Production SQL RLS Migration (prisma/migrations/0002_enable_rls.sql)

-- Enable and force RLS across all tenant-scoped tables

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

ALTER TABLE users FORCE ROW LEVEL SECURITY;

ALTER TABLE stl_files ENABLE ROW LEVEL SECURITY;

ALTER TABLE stl_files FORCE ROW LEVEL SECURITY;

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

ALTER TABLE orders FORCE ROW LEVEL SECURITY;

ALTER TABLE order_bids ENABLE ROW LEVEL SECURITY;

ALTER TABLE order_bids FORCE ROW LEVEL SECURITY;

ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

ALTER TABLE disputes FORCE ROW LEVEL SECURITY;

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;

-- 1. Strict Tenant Boundary Policy on Orders

CREATE POLICY orders_tenant_And_role_isolation ON orders

    USING (

        tenant_id = current_setting('app.current_tenant_id', true)::uuid

        AND (

            -- Administrators see all orders in the tenant

            current_setting('app.current_user_role', true) = 'ADMIN'

            -- Clients see only orders they created

            OR (

                current_setting('app.current_user_role', true) = 'CLIENT'

                AND client_id = current_setting('app.current_user_id', true)::uuid

            )

            -- 3D Printer Providers see open print jobs OR jobs assigned to them

            OR (

                current_setting('app.current_user_role', true) = 'PRINTER_PROVIDER'

                AND (

                    status IN ('PENDING_PRINTER', 'BIDDING_PRINTER')

                    OR printer_provider_id = current_setting('app.current_user_id', true)::uuid

                )

            )

            -- Delivery Providers see orders ready for delivery OR deliveries assigned to them

            OR (

                current_setting('app.current_user_role', true) = 'DELIVERY_PROVIDER'

                AND (

                    status IN ('READY_FOR_PICKUP', 'BIDDING_DELIVERY')

                    OR delivery_provider_id = current_setting('app.current_user_id', true)::uuid

                )

            )

        )

    );

-- 2. STL Files Access Policy

CREATE POLICY stl_files_isolation ON stl_files

    USING (

        tenant_id = current_setting('app.current_tenant_id', true)::uuid

        AND (

            current_setting('app.current_user_role', true) = 'ADMIN'

            OR creator_id = current_setting('app.current_user_id', true)::uuid

            OR is_marketplace_Order_attached = true

        )

    );

4. Field-Level PII & OTP Masking Rules

Even when an order row is accessible to multiple roles via RLS, the NestJS OrderResponseSerializer enforces strict column-level redaction based on the caller's role and current order stage:

Field

CLIENT

PRINTER_PROVIDER

DELIVERY_PROVIDER

ADMIN

Downloadable .STL URL

Yes

Yes (while open or assigned)

No (only sees package dimensions & weight)

Yes

Client Exact Street Address & Phone

Yes

Never (only sees general district/emirate)

Only after courier is assigned (DELIVERY_ASSIGNED / IN_TRANSIT)

Yes

Printer Exact Pickup Address & Phone

Never (only sees maker display name & rating)

Yes

Only after courier is assigned (DELIVERY_ASSIGNED / IN_TRANSIT)

Yes

6-Digit pickup_otp

Hidden

Visible (gives to courier at pickup)

Hidden (must enter via verification input)

Visible

6-Digit delivery_otp

Visible (gives to courier at drop-off)

Hidden

Hidden (must enter via verification input)

Visible

5. Automated Cross-Tenant & Cross-Role Leakage Verification

The test suite (apps/api/test/rls-isolation.e2e-spec.ts) runs automated assertions on every pull request to verify:

A user authenticated under tenant_a querying /api/v1/orders or /api/v1/admin/users receives 0 rows belonging to tenant_b.

A PRINTER_PROVIDER querying an assigned order never receives deliveryOtpCode, clientPhone, or clientStreetAddress in the JSON payload.

A DELIVERY_PROVIDER cannot download the Client's .STL intellectual property or view another courier's active delivery assignments.