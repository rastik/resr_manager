# RESR, s.r.o. - Správa nehnuteľností 🏢

Moderná webová aplikácia pre správu portfólia bytov, nehnuteľností, nájomných zmlúv a inventára. Postavená na PostgreSQL 16 databáze bežiacej v Dockeri, Express REST API a React 18 + TypeScript + HeroUI + Tailwind CSS frontende.

---

## ⚡ Rýchly štart

### 1. Požiadavky
- [Docker](https://www.docker.com/) & Docker Compose
- [Node.js](https://nodejs.org/) (v18+)

### 2. Spustenie databázy a aplikácie
Z koreňového adresára:

```bash
# 1. Spustenie PostgreSQL v Dockeri (kontajner resr_postgres, databáza resr)
npm run db

# 2. Spustenie Backend API a Frontend klienta
npm run dev
```

- **Frontend klient**: [http://localhost:5173](http://localhost:5173)
- **Backend API Server**: [http://localhost:5000](http://localhost:5000)
- **PostgreSQL Databáza**: `localhost:5432` (`resr`)

---

## 📦 Technologický stack

- **Frontend**: React 18, TypeScript, Vite, HeroUI, Tailwind CSS, Lucide React ikony, Recharts, date-fns, canvas-confetti.
- **Backend**: Node.js, Express, TypeScript, `pg` (PostgreSQL Connection Pool).
- **Databáza**: PostgreSQL 16 Alpine bežiaca v Dockeri s perzistentným zväzkom `resr_pgdata` a kontajnerom `resr_postgres`.
- **Stav a synchronizácia**: Real-time REST API s lokálnou odolnou vyrovnávacou pamäťou.

---

## 🏗️ Database Schema & Normalized Collections

All queries and records are scoped to the authenticated landlord (`users/{userId}/*`):

1. **`properties`**:
   - `id`, `user_id`, `name`, `unit_number`, `address`, `postal_code`, `city`, `neighborhood`, `size_sqm`, `bedrooms`, `bathrooms`, `rent_amount`, `status` (`'occupied' | 'vacant' | 'maintenance'`), `active_lease_id`, `image_url`, `created_at`.
2. **`leases`**:
   - `id`, `user_id`, `property_id`, `tenant_name`, `tenant_email`, `tenant_phone`, `rent_amount`, `deposit_amount`, `start_date`, `end_date`, `status` (`'active' | 'expired' | 'draft'`), `contract_file_name`, `contract_file_url`.
3. **`inventory_items`**:
   - `id`, `user_id`, `property_id`, `name`, `category` (`'appliance' | 'furniture' | 'fixture'`), `brand_model`, `serial_number`, `purchase_date`, `replaced_date`, `warranty_expires_at`, `lifespan_years`, `cost`, `notes`.
4. **`expenses`**:
   - `id`, `user_id`, `property_id`, `category` (`'repair' | 'replacement' | 'tax' | 'utility'`), `amount`, `date`, `description`.
5. **`market_comps`**:
   - `id`, `neighborhood`, `avg_rent_per_sqm`, `property_type`, `last_updated`, `historical_trend_percent`.
6. **`vault_documents`**:
   - `id`, `user_id`, `property_id`, `lease_id`, `name`, `category` (`'tenancy' | 'inspection' | 'invoice' | 'other'`), `file_size`, `upload_date`, `expiry_date`, `file_url`, `notes`.
7. **`users`**:
   - `id`, `email`, `name`, `role`, `created_at`.

---

## 🚀 Functional Modules Implemented

### 1. Authentication & Onboarding
- Scoped tenant isolation by Landlord ID (`x-user-id` header).
- Switch landlord profile or toggle demo mode with 1 click.
- Real-time Docker database status check (`/api/health`).

### 2. Portfolio Overview (Dashboard Analytics)
- **5 Core KPI Cards**: Total units, occupancy rate (%), monthly gross rental income, upcoming lease expirations (30/60/90 days), and active maintenance expenditures.
- **Charts**:
  - Monthly Cash Flow Bar Chart (Gross Rental Income vs OPEX).
  - Portfolio Occupancy Breakdown Donut Chart (`Occupied`, `Vacant`, `Maintenance`).
- **Action Watchlists**: Lease renewal urgency countdown and appliance warranty radar.

### 3. Unit Directory & Detailed Profile View
- Filterable and searchable unit grid with status badges.
- **Full Unit Profile with 4 Tabbed Sections**:
  1. *Overview*: Unit specifications, rent per m², active tenant contact info, operational status selector.
  2. *Furniture & Appliance Timeline*: Chronological asset installation/replacement log, warranty status countdown, and replacement logger.
  3. *Lease & Contracts*: Tenancy agreement details, countdown timer to expiration, and download link for uploaded agreements.
  4. *Financial Ledger*: Net yield calculation, rental revenue vs recorded repairs and maintenance expenses.

### 4. Asset & Inventory Log (Appliances & Furniture)
- Multi-category asset registry (`appliance`, `furniture`, `fixture`).
- Lifespan progress bars (usage vs typical lifespan).
- Live warranty expiration alerts (&lt;60 days countdown).

### 5. Document Vault
- Drag-and-drop simulated file upload with progress bar.
- Category tagging (`tenancy`, `inspection`, `invoice`, `other`).
- Auto-computed expiry warning tied to corresponding lease end dates.
- In-browser document preview drawer and download links.

### 6. Local Area Market Rent Comparator
- Real-time comparison of each apartment's rent per square meter against neighborhood baseline comps (Mitte, Prenzlauer Berg, Neukölln, Charlottenburg, etc.).
- Visual benchmark delta badges (e.g. `+8.2% vs Market`, `-€140/mo below market`).
- Strategy recommendations for lease renewals.

---

## ⌨️ Keyboard Shortcuts
- `Ctrl + N` / `⌘N`: Open "Add Apartment" modal
- `Ctrl + M` / `⌘M`: Open "Log Maintenance Expense" modal
- `Esc`: Close any active modal
