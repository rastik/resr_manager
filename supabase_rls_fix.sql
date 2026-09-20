-- Supabase Fix: Allow full read and write access for application Data API
-- Paste and run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/jjplixpjdyefibboerlq/sql/new

-- 1. Grant schema usage and permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- 2. Explicit open RLS policies for each table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_users" ON public.users;
CREATE POLICY "allow_all_users" ON public.users FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_properties" ON public.properties;
CREATE POLICY "allow_all_properties" ON public.properties FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_leases" ON public.leases;
CREATE POLICY "allow_all_leases" ON public.leases FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_inventory" ON public.inventory_items;
CREATE POLICY "allow_all_inventory" ON public.inventory_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_expenses" ON public.expenses;
CREATE POLICY "allow_all_expenses" ON public.expenses FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.hotel_revenue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_hotel_revenue" ON public.hotel_revenue;
CREATE POLICY "allow_all_hotel_revenue" ON public.hotel_revenue FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.market_comps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_market_comps" ON public.market_comps;
CREATE POLICY "allow_all_market_comps" ON public.market_comps FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.vault_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_vault_documents" ON public.vault_documents;
CREATE POLICY "allow_all_vault_documents" ON public.vault_documents FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 3. Default demo landlord user
INSERT INTO public.users (id, email, name, role) 
VALUES ('user_demo_landlord', 'alex.vance@resr.sk', 'Alex Vance (Portfolio Owner)', 'landlord')
ON CONFLICT (id) DO NOTHING;
