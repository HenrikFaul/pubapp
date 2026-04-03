---
## [1.4.4] — 2026-04-03

### 🛡️ Site Admin tényleges leválasztása a venue-adminról
- A **Site Admin** kikerült a venue-admin (`/admin`) shell fő navigációjából.
- A venue-admin **Konfigurátor** oldalon megszűnt a **Common Admin** tab.
- A Common Admin kizárólag a különálló **`/siteadmin`** felületen marad elérhető.
- A `siteadmin/venues` nézet egyértelmű visszalépést kapott a `/siteadmin` dashboardra.

### 🐛 Gyökérok
- A main ágban a venue-admin layout még mindig kirakta a Site Admin elérést.
- A Common Admin még mindig bent volt a venue-admin konfigurátorban.
- Emiatt a külön route ellenére a funkció UX-ben továbbra is a szolgáltatói admin részének tűnt.

### 🔧 Technikai
- Módosult: `src/app/admin/layout.tsx`
- Módosult: `src/app/admin/config/page.tsx`
- Módosult: `src/app/siteadmin/venues/page.tsx`
- Új versioning pár:
  - `versioning/14040337_v1.4.4_business_request_summary.pdf`
  - `versioning/14040337_v1.4.4_ai_dev_prompts.md`
