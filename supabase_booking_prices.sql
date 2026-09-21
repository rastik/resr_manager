-- RESR, s.r.o. - Booking.com Price History Schema & RLS
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/jjplixpjdyefibboerlq/sql/new

CREATE TABLE IF NOT EXISTS public.booking_price_history (
    id VARCHAR(64) PRIMARY KEY,
    property_id VARCHAR(64) NOT NULL,
    room_name VARCHAR(255) NOT NULL DEFAULT 'Apartmán Deluxe',
    date DATE NOT NULL,
    price_per_night NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(8) NOT NULL DEFAULT 'EUR',
    min_nights INT NOT NULL DEFAULT 1,
    occupancy_guests INT NOT NULL DEFAULT 2,
    cancellation_policy TEXT DEFAULT 'Bezplatné zrušenie do 7 dní',
    breakfast_included BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    source_url TEXT,
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(property_id, date)
);

-- Index for fast ordering by date
CREATE INDEX IF NOT EXISTS idx_booking_price_history_property_date 
ON public.booking_price_history(property_id, date ASC);

-- Enable RLS
ALTER TABLE public.booking_price_history ENABLE ROW LEVEL SECURITY;

-- Permissions
GRANT ALL ON public.booking_price_history TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "allow_all_booking_price_history" ON public.booking_price_history;
CREATE POLICY "allow_all_booking_price_history" ON public.booking_price_history 
FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Seed initial historical days for Apartmán Deluxe (Aplend Ovruč)
INSERT INTO public.booking_price_history (
    id, property_id, room_name, date, price_per_night, currency, min_nights, occupancy_guests, cancellation_policy, breakfast_included, notes, scraped_at
) VALUES 
('bkr_ovruc_1', 'prop_ovruc_deluxe', 'Apartmán Deluxe', '2026-09-01', 122.00, 'EUR', 1, 2, 'Bezplatné zrušenie do 7 dní', false, 'Mimosezónna cena po prázdninách', '2026-09-01T08:00:00Z'),
('bkr_ovruc_2', 'prop_ovruc_deluxe', 'Apartmán Deluxe', '2026-09-07', 125.00, 'EUR', 1, 2, 'Bezplatné zrušenie do 7 dní', false, 'Štandardný jesenný týždeň', '2026-09-07T08:00:00Z'),
('bkr_ovruc_3', 'prop_ovruc_deluxe', 'Apartmán Deluxe', '2026-09-14', 134.00, 'EUR', 2, 2, 'Bezplatné zrušenie do 7 dní', false, 'Zvýšený dopyt na víkend', '2026-09-14T08:00:00Z'),
('bkr_ovruc_4', 'prop_ovruc_deluxe', 'Apartmán Deluxe', '2026-09-20', 128.00, 'EUR', 1, 2, 'Bezplatné zrušenie do 7 dní', false, 'Aktuálna ponuka na Booking.com', '2026-09-20T10:00:00Z'),
('bkr_ovruc_5', 'prop_ovruc_deluxe', 'Apartmán Deluxe', '2026-09-21', 128.00, 'EUR', 1, 2, 'Bezplatné zrušenie do 7 dní', false, 'Denný monitoring cien', '2026-09-21T08:00:00Z')
ON CONFLICT (property_id, date) DO UPDATE 
SET price_per_night = EXCLUDED.price_per_night,
    scraped_at = EXCLUDED.scraped_at,
    notes = EXCLUDED.notes;
