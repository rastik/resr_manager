-- RESR, s.r.o. - PostgreSQL Database Schema & Initial Seed Data

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(32) DEFAULT 'landlord',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Properties table
CREATE TABLE IF NOT EXISTS properties (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    unit_number VARCHAR(64) NOT NULL,
    address VARCHAR(255) NOT NULL,
    postal_code VARCHAR(32) NOT NULL,
    city VARCHAR(100) NOT NULL,
    neighborhood VARCHAR(100) NOT NULL,
    size_sqm NUMERIC(8, 2) NOT NULL,
    floor INT,
    bedrooms INT NOT NULL DEFAULT 1,
    bathrooms NUMERIC(4, 1) NOT NULL DEFAULT 1.0,
    rent_amount NUMERIC(10, 2) NOT NULL,
    base_rent NUMERIC(10, 2),
    utilities_amount NUMERIC(10, 2),
    status VARCHAR(32) NOT NULL DEFAULT 'vacant', -- 'occupied', 'vacant', 'maintenance'
    active_lease_id VARCHAR(64),
    image_url TEXT,
    has_cellar BOOLEAN DEFAULT FALSE,
    cellar_area_sqm NUMERIC(6, 2),
    cellar_number VARCHAR(64),
    has_parking BOOLEAN DEFAULT FALSE,
    parking_spot_number VARCHAR(64),
    has_ac BOOLEAN DEFAULT FALSE,
    has_balcony BOOLEAN DEFAULT FALSE,
    balcony_area_sqm NUMERIC(6, 2),
    furnishing_status VARCHAR(32) DEFAULT 'furnished',
    property_type VARCHAR(64) DEFAULT 'flat',
    notes TEXT,
    photos TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Leases table
CREATE TABLE IF NOT EXISTS leases (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    property_id VARCHAR(64) NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    tenant_name VARCHAR(255) NOT NULL,
    tenant_email VARCHAR(255) NOT NULL,
    tenant_phone VARCHAR(64) NOT NULL,
    rent_amount NUMERIC(10, 2) NOT NULL,
    base_rent NUMERIC(10, 2),
    utilities_amount NUMERIC(10, 2),
    deposit_amount NUMERIC(10, 2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active', -- 'active', 'expired', 'draft'
    contract_file_url TEXT,
    contract_file_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Circular FK for active_lease_id
ALTER TABLE properties 
    ADD CONSTRAINT fk_properties_active_lease 
    FOREIGN KEY (active_lease_id) REFERENCES leases(id) ON DELETE SET NULL;

-- 4. Inventory items table (Appliances, Furniture, Fixtures)
CREATE TABLE IF NOT EXISTS inventory_items (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    property_id VARCHAR(64) NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL, -- 'appliance', 'furniture', 'fixture'
    brand_model VARCHAR(255),
    serial_number VARCHAR(128),
    purchase_date DATE NOT NULL,
    replaced_date DATE,
    warranty_expires_at DATE,
    lifespan_years INT DEFAULT 8,
    cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    property_id VARCHAR(64) NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    category VARCHAR(64) NOT NULL, -- 'repair', 'replacement', 'tax', 'utility'
    amount NUMERIC(10, 2) NOT NULL,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Market comps table
CREATE TABLE IF NOT EXISTS market_comps (
    id VARCHAR(64) PRIMARY KEY,
    neighborhood VARCHAR(100) NOT NULL,
    avg_rent_per_sqm NUMERIC(8, 2) NOT NULL,
    property_type VARCHAR(64) NOT NULL,
    last_updated DATE NOT NULL,
    historical_trend_percent NUMERIC(5, 2) DEFAULT 0.00
);

-- 7. Vault Documents table
CREATE TABLE IF NOT EXISTS vault_documents (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    property_id VARCHAR(64) REFERENCES properties(id) ON DELETE SET NULL,
    lease_id VARCHAR(64) REFERENCES leases(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL, -- 'tenancy', 'inspection', 'invoice', 'other'
    file_size VARCHAR(32) NOT NULL,
    upload_date DATE NOT NULL,
    expiry_date DATE,
    file_url TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for lightning fast queries
CREATE INDEX IF NOT EXISTS idx_properties_user ON properties(user_id);
CREATE INDEX IF NOT EXISTS idx_leases_user ON leases(user_id);
CREATE INDEX IF NOT EXISTS idx_leases_property ON leases(property_id);
CREATE INDEX IF NOT EXISTS idx_inventory_user ON inventory_items(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_property ON inventory_items(property_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_property ON expenses(property_id);
CREATE INDEX IF NOT EXISTS idx_documents_user ON vault_documents(user_id);

-- SEED DATA
-- Insert Demo Landlord
INSERT INTO users (id, email, name, role) 
VALUES ('user_demo_landlord', 'alex.vance@resr.sk', 'Alex Vance (Portfolio Owner)', 'landlord')
ON CONFLICT (id) DO NOTHING;

-- Insert Properties
INSERT INTO properties (id, user_id, name, unit_number, address, postal_code, city, neighborhood, size_sqm, bedrooms, bathrooms, rent_amount, status, image_url)
VALUES 
('prop_1', 'user_demo_landlord', 'Riverside Residences', 'Apt 4B', '124 Spreeufer Boulevard', '10178', 'Berlin', 'Mitte', 78.50, 2, 1.5, 1850.00, 'occupied', 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80'),
('prop_2', 'user_demo_landlord', 'Kollwitz Court Loft', 'Unit 12', '45 Kollwitzstrasse', '10405', 'Berlin', 'Prenzlauer Berg', 92.00, 3, 2.0, 2350.00, 'occupied', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1000&q=80'),
('prop_3', 'user_demo_landlord', 'Canal View Studio', 'Studio 2A', '89 Maybachufer', '12047', 'Berlin', 'Neukölln', 42.00, 1, 1.0, 980.00, 'occupied', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1000&q=80'),
('prop_4', 'user_demo_landlord', 'Schiller Garden Suite', 'Suite 103', '14 Schillerpromenade', '12049', 'Berlin', 'Neukölln', 64.00, 2, 1.0, 1420.00, 'vacant', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1000&q=80'),
('prop_5', 'user_demo_landlord', 'Savigny Atelier Penthouse', 'PH-1', '32 Knesebeckstrasse', '10623', 'Berlin', 'Charlottenburg', 115.00, 3, 2.5, 3100.00, 'maintenance', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80')
ON CONFLICT (id) DO NOTHING;

-- Insert Leases
INSERT INTO leases (id, user_id, property_id, tenant_name, tenant_email, tenant_phone, rent_amount, deposit_amount, start_date, end_date, status, contract_file_name, contract_file_url)
VALUES
('lease_1', 'user_demo_landlord', 'prop_1', 'Dr. Maximilian Weber', 'm.weber@charite.de', '+49 171 4920194', 1850.00, 5550.00, '2025-11-01', '2026-10-31', 'active', 'Lease_Agreement_Riverside_4B.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'),
('lease_2', 'user_demo_landlord', 'prop_2', 'Elena Rostova & Kai Becker', 'elena.rostova@techcorp.io', '+49 176 8820411', 2350.00, 7050.00, '2024-03-01', '2026-12-15', 'active', 'Contract_Kollwitz_Unit12_Signed.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'),
('lease_3', 'user_demo_landlord', 'prop_3', 'Sophie Laurent', 'sophie.laurent@designstudio.fr', '+49 152 3349018', 980.00, 2940.00, '2025-05-01', '2026-10-15', 'active', 'Tenancy_Maybachufer_2A.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf')
ON CONFLICT (id) DO NOTHING;

-- Link active leases
UPDATE properties SET active_lease_id = 'lease_1' WHERE id = 'prop_1';
UPDATE properties SET active_lease_id = 'lease_2' WHERE id = 'prop_2';
UPDATE properties SET active_lease_id = 'lease_3' WHERE id = 'prop_3';

-- Insert Inventory Items (Appliances, Furniture, Fixtures)
INSERT INTO inventory_items (id, user_id, property_id, name, category, brand_model, serial_number, purchase_date, warranty_expires_at, lifespan_years, cost, notes)
VALUES
('inv_1', 'user_demo_landlord', 'prop_1', 'Induction Cooktop 80cm', 'appliance', 'Siemens iQ700 EX875KYW1E', 'SN-SIEM-984210', '2023-04-15', '2026-11-15', 10, 1199.00, 'Under extended 3-year store warranty. Top glass scratch-free.'),
('inv_2', 'user_demo_landlord', 'prop_1', 'Integrated Dishwasher', 'appliance', 'Bosch Serie 6 SMV6ZCX07E', 'SN-BOSCH-441029', '2022-08-10', '2024-08-10', 8, 849.00, 'Warranty expired. Regular descaling scheduled.'),
('inv_3', 'user_demo_landlord', 'prop_1', 'EcoSmart Washing Machine', 'appliance', 'Miele TwinDos WWI860', 'SN-MIELE-772910', '2024-01-20', '2027-01-20', 12, 1450.00, 'Premium motor with 10-year parts guarantee.'),
('inv_4', 'user_demo_landlord', 'prop_2', 'French Door Refrigerator', 'appliance', 'Liebherr Monolith EKB9471', 'SN-LIEB-553198', '2023-09-05', '2026-10-05', 12, 2890.00, 'Dual cooling circuit. Filters replaced May 2026.'),
('inv_5', 'user_demo_landlord', 'prop_2', 'Designer Modular Sofa', 'furniture', 'BoConcept Carmo Velvet', 'SOFA-BC-2023', '2023-10-01', '2028-10-01', 10, 3400.00, 'Treated with water-repellent nanofiber coat.'),
('inv_6', 'user_demo_landlord', 'prop_3', 'Compact Washer-Dryer', 'appliance', 'AEG DualSense 7000', 'SN-AEG-102943', '2024-06-12', '2026-10-25', 7, 720.00, 'Warranty expiring in 35 days! Needs pre-expiry inspection.'),
('inv_7', 'user_demo_landlord', 'prop_4', 'Air Source Heat Pump AC', 'fixture', 'Daikin Emura FTXJ35', 'SN-DAIK-901823', '2024-02-14', '2029-02-14', 15, 2600.00, 'Smart WiFi thermostat connected. Highest efficiency A+++.'),
('inv_8', 'user_demo_landlord', 'prop_5', 'Smart Oven & Steamer', 'appliance', 'Gaggenau Series 400', 'SN-GAG-332910', '2021-03-01', '2023-03-01', 12, 3800.00, 'Requires heating element replacement during current renovation.')
ON CONFLICT (id) DO NOTHING;

-- Insert Expenses
INSERT INTO expenses (id, user_id, property_id, category, amount, date, description)
VALUES
('exp_1', 'user_demo_landlord', 'prop_1', 'repair', 185.00, '2026-08-14', 'Kitchen sink siphon leak fix & gasket sealing'),
('exp_2', 'user_demo_landlord', 'prop_2', 'utility', 240.00, '2026-08-01', 'Annual chimney sweep and carbon monoxide ventilation inspection'),
('exp_3', 'user_demo_landlord', 'prop_3', 'tax', 410.00, '2026-07-15', 'Quarterly municipal property tax (Grundsteuer)'),
('exp_4', 'user_demo_landlord', 'prop_5', 'replacement', 1250.00, '2026-09-02', 'Parquet floor sanding and ecological hardwax oil refurbishment'),
('exp_5', 'user_demo_landlord', 'prop_5', 'repair', 620.00, '2026-09-10', 'Master bathroom concealed shower cartridge overhaul'),
('exp_6', 'user_demo_landlord', 'prop_2', 'repair', 145.00, '2026-06-20', 'Balcony drain clearing and waterproof membrane touch-up')
ON CONFLICT (id) DO NOTHING;

-- Insert Market Comps
INSERT INTO market_comps (id, neighborhood, avg_rent_per_sqm, property_type, last_updated, historical_trend_percent)
VALUES
('comp_1', 'Mitte', 24.80, 'Apartment', '2026-09-01', 4.2),
('comp_2', 'Prenzlauer Berg', 23.50, 'Loft / Altbau', '2026-09-01', 5.1),
('comp_3', 'Neukölln', 21.20, 'Studio / 2-Room', '2026-09-01', 6.8),
('comp_4', 'Charlottenburg', 25.50, 'Luxury Penthouse', '2026-09-01', 3.4),
('comp_5', 'Friedrichshain', 22.90, 'Modern Flat', '2026-09-01', 4.9),
('comp_6', 'Kreuzberg', 23.90, 'Altbau High Ceilings', '2026-09-01', 5.5)
ON CONFLICT (id) DO NOTHING;

-- Insert Vault Documents
INSERT INTO vault_documents (id, user_id, property_id, lease_id, name, category, file_size, upload_date, expiry_date, file_url, notes)
VALUES
('doc_1', 'user_demo_landlord', 'prop_1', 'lease_1', 'Residential Lease Agreement 2025-2026', 'tenancy', '2.4 MB', '2025-10-28', '2026-10-31', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'Fully executed bilateral contract with Dr. Maximilian Weber.'),
('doc_2', 'user_demo_landlord', 'prop_1', 'lease_1', 'Handover Protocol & Meter Readings', 'inspection', '4.1 MB', '2025-11-01', NULL, 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'Contains 28 photos of unit condition and initial water/electricity counters.'),
('doc_3', 'user_demo_landlord', 'prop_2', 'lease_2', 'Signed Tenancy Agreement - Kollwitz Court', 'tenancy', '3.1 MB', '2024-02-28', '2026-12-15', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'Co-signed by Elena Rostova & Kai Becker.'),
('doc_4', 'user_demo_landlord', 'prop_5', NULL, 'Renovation Contractor Invoice & Guarantee', 'invoice', '1.2 MB', '2026-09-05', '2031-09-05', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'Includes 5-year workmanship guarantee from Meisterbau GmbH.')
ON CONFLICT (id) DO NOTHING;
