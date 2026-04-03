---
## [1.4.3] — 2026-04-03

### 🛡️ Site Admin és venue-admin szétválasztás javítása
- A **Site Admin** többé nem a venue-admin oldalsávjának részeként él.
- A venue-admin (`/admin`) oldalsávból a közvetlen, keverő **Site admin** menüpont kikerült.
- Superadmin esetén a venue-admin shellben csak külön, elkülönítő átvezető kártya marad a **`/siteadmin`** felületre.
- A külön platformszintű admin belépési pont a **`/siteadmin`** gyökérútvonal lett, nem a `siteadmin/venues`.
- A `siteadmin/venues` nézet most már egyértelműen a **külön Site Admin shell** részeként kommunikálja, hogy a common_admin funkciók a Site Admin főoldalon vannak, és közvetlen visszalépést ad a Common Admin dashboardra.

### 🐛 Gyökérok
- A venue-admin layout még mindig kirakta a **Site admin** linket a szolgáltatói admin oldalsávban.
- Ez a link ráadásul közvetlenül a **`/siteadmin/venues`** oldalra mutatott, ezért úgy látszott, mintha a Site Admin "üres" lenne, miközben a common_admin dashboard valójában a **`/siteadmin`** route-on volt.

### 🔧 Technikai
- Módosult: `src/app/admin/layout.tsx`
- Módosult: `src/app/siteadmin/venues/page.tsx`
- Új versioning pár:
  - `versioning/14040336_v1.4.3_business_request_summary.pdf`
  - `versioning/14040336_v1.4.3_ai_dev_prompts.md`
