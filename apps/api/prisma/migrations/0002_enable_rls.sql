-- Enable and force RLS across tenant-scoped tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stl_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS orders_tenant_and_role_isolation ON orders;
DROP POLICY IF EXISTS stl_files_isolation ON stl_files;
DROP POLICY IF EXISTS users_isolation ON users;

-- 1. Tenant Boundary Policy on Orders
CREATE POLICY orders_tenant_and_role_isolation ON orders
    USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR (
            tenant_id = current_setting('app.current_tenant_id', true)::uuid
            AND (
                current_setting('app.current_user_role', true) = 'ADMIN'
                OR (
                    current_setting('app.current_user_role', true) = 'CLIENT'
                    AND client_id = current_setting('app.current_user_id', true)::uuid
                )
                OR (
                    current_setting('app.current_user_role', true) = 'PRINTER_PROVIDER'
                    AND (
                        status IN ('PENDING_PRINTER', 'BIDDING_PRINTER')
                        OR printer_provider_id = current_setting('app.current_user_id', true)::uuid
                    )
                )
                OR (
                    current_setting('app.current_user_role', true) = 'DELIVERY_PROVIDER'
                    AND (
                        status IN ('READY_FOR_PICKUP', 'BIDDING_DELIVERY')
                        OR delivery_provider_id = current_setting('app.current_user_id', true)::uuid
                    )
                )
            )
        )
    );

-- 2. STL Files Access Policy
CREATE POLICY stl_files_isolation ON stl_files
    USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR (
            tenant_id = current_setting('app.current_tenant_id', true)::uuid
            AND (
                current_setting('app.current_user_role', true) = 'ADMIN'
                OR creator_id = current_setting('app.current_user_id', true)::uuid
                OR EXISTS (SELECT 1 FROM orders WHERE orders.stl_file_id = stl_files.id)
            )
        )
    );

-- 3. Users Isolation Policy
CREATE POLICY users_isolation ON users
    USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR (
            tenant_id = current_setting('app.current_tenant_id', true)::uuid
            AND (
                current_setting('app.current_user_role', true) = 'ADMIN'
                OR id = current_setting('app.current_user_id', true)::uuid
                OR role IN ('PRINTER_PROVIDER', 'DELIVERY_PROVIDER')
            )
        )
    );
