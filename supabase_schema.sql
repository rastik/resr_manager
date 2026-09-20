-- RESR, s.r.o. - Complete Supabase Setup Script
-- Paste this entire script into your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/jjplixpjdyefibboerlq/sql/new

-- 1. Users table
CREATE TABLE IF NOT EXISTS public.users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(32) DEFAULT 'landlord',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Properties table
CREATE TABLE IF NOT EXISTS public.properties (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    unit_number VARCHAR(64) NOT NULL,
    address VARCHAR(255) NOT NULL,
    postal_code VARCHAR(32) DEFAULT '',
    city VARCHAR(100) NOT NULL,
    neighborhood VARCHAR(100) DEFAULT '',
    size_sqm NUMERIC(8, 2) NOT NULL DEFAULT 50,
    bedrooms INT NOT NULL DEFAULT 1,
    bathrooms NUMERIC(4, 1) NOT NULL DEFAULT 1.0,
    rent_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    base_rent NUMERIC(10, 2),
    utilities_amount NUMERIC(10, 2),
    status VARCHAR(32) NOT NULL DEFAULT 'vacant',
    active_lease_id VARCHAR(64),
    image_url TEXT,
    has_cellar BOOLEAN DEFAULT FALSE,
    cellar_area_sqm NUMERIC(6, 2),
    cellar_number VARCHAR(64),
    has_parking BOOLEAN DEFAULT FALSE,
    parking_spot_number VARCHAR(64),
    has_ac BOOLEAN DEFAULT FALSE,
    has_balcony BOOLEAN DEFAULT FALSE,
    furnishing_status VARCHAR(32) DEFAULT 'furnished',
    property_type VARCHAR(64) DEFAULT 'apartment',
    notes TEXT,
    photos TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Leases table
CREATE TABLE IF NOT EXISTS public.leases (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    property_id VARCHAR(64) NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    tenant_name VARCHAR(255) NOT NULL,
    tenant_email VARCHAR(255) NOT NULL,
    tenant_phone VARCHAR(64) NOT NULL,
    rent_amount NUMERIC(10, 2) NOT NULL,
    base_rent NUMERIC(10, 2),
    utilities_amount NUMERIC(10, 2),
    deposit_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    lease_type VARCHAR(32) DEFAULT 'standard',
    operator_company VARCHAR(255),
    move_in_photos TEXT[] DEFAULT '{}',
    contract_file_url TEXT,
    contract_file_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Circular FK for active_lease_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_properties_active_lease'
    ) THEN
        ALTER TABLE public.properties 
            ADD CONSTRAINT fk_properties_active_lease 
            FOREIGN KEY (active_lease_id) REFERENCES public.leases(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 4. Inventory items table
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    property_id VARCHAR(64) NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL,
    brand_model VARCHAR(255),
    serial_number VARCHAR(128),
    purchase_date DATE,
    replaced_date DATE,
    warranty_expires_at DATE,
    lifespan_years INT DEFAULT 8,
    cost NUMERIC(10, 2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    property_id VARCHAR(64) NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    category VARCHAR(64) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Hotel Revenue table
CREATE TABLE IF NOT EXISTS public.hotel_revenue (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    property_id VARCHAR(64) NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    lease_id VARCHAR(64) NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
    month VARCHAR(7) NOT NULL,
    revenue_amount NUMERIC(10, 2) NOT NULL,
    occupancy_percent NUMERIC(5, 2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(lease_id, month)
);

-- 7. Market comps table
CREATE TABLE IF NOT EXISTS public.market_comps (
    id VARCHAR(64) PRIMARY KEY,
    neighborhood VARCHAR(100) NOT NULL,
    avg_rent_per_sqm NUMERIC(8, 2) NOT NULL,
    property_type VARCHAR(64) NOT NULL,
    last_updated DATE NOT NULL,
    historical_trend_percent NUMERIC(5, 2) DEFAULT 0.00
);

-- 8. Vault Documents table
CREATE TABLE IF NOT EXISTS public.vault_documents (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    property_id VARCHAR(64) REFERENCES public.properties(id) ON DELETE SET NULL,
    lease_id VARCHAR(64) REFERENCES public.leases(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL,
    file_size VARCHAR(32) NOT NULL,
    upload_date DATE NOT NULL,
    expiry_date DATE,
    file_url TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_properties_user ON public.properties(user_id);
CREATE INDEX IF NOT EXISTS idx_leases_user ON public.leases(user_id);
CREATE INDEX IF NOT EXISTS idx_leases_property ON public.leases(property_id);
CREATE INDEX IF NOT EXISTS idx_inventory_user ON public.inventory_items(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_property ON public.inventory_items(property_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_property ON public.expenses(property_id);
CREATE INDEX IF NOT EXISTS idx_documents_user ON public.vault_documents(user_id);

-- Explicitly GRANT permissions for anon and authenticated roles to access tables via Data API
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;

-- Disable Row Level Security (RLS) for seamless direct access by the app, or enable open policies
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.leases DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_revenue DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_comps DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_documents DISABLE ROW LEVEL SECURITY;

-- Seed default user
INSERT INTO public.users (id, email, name, role) 
VALUES ('user_demo_landlord', 'alex.vance@resr.sk', 'Alex Vance (Portfolio Owner)', 'landlord')
ON CONFLICT (id) DO NOTHING;
