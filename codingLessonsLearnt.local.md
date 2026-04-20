# codingLessonsLearnt.local

# Ide appendelődnek az adott repo saját új tanulságai.

## ➕ APPEND - 2026-04-03 siteadmin szétválasztás a venue-adminból

### [LOCAL-HIBA-001] A különálló siteadmin route önmagában nem elég, ha a venue-admin shellben bent marad a link és a common_admin tab
- **Dátum**: 2026-04-03
- **Fájl**: `src/app/admin/layout.tsx`, `src/app/admin/config/page.tsx`
- **Gyökérok**: A siteadmin saját route és saját layout már létezett, de a régi venue-admin shellben bent maradt a Site Admin entrypoint és a Common Admin tab. Emiatt a platformszintű admin funkciók továbbra is a szolgáltatói admin részeként látszottak.
- **Javítás**: A Site Admin menüpont kikerült a venue-admin oldalsávból, a Common Admin tab kikerült a venue-admin konfigurátorból, és a siteadmin/venues oldal a külön siteadmin shellen belül kapott visszanavigálást a `/siteadmin` dashboardra.
- **Megelőzés**: Ha egy funkciót külön adminhatókörre választunk le, akkor nem elég új route-ot létrehozni. Kötelező ellenőrizni az összes régi shellt, oldalsávot, config tabot és entrypointot is, hogy ott ne maradjon bent a leválasztott funkció.

## ➕ APPEND - 2026-04-20 siteadmin entrypoint + venueadmin route átnevezés

### [LOCAL-HIBA-002] Hibás siteadmin entrypoint (`/siteadmin/CommonAdmin`) elrejti a tényleges dashboardot
- **Dátum**: 2026-04-20
- **Fájl**: `src/app/siteadmin/layout.tsx`
- **Gyökérok**: A Site Admin nav első pontja nem létező route-ra mutatott (`/siteadmin/CommonAdmin`), miközben a Common Admin valójában a `/siteadmin` route-on van.
- **Javítás**: A nav entrypoint egységesen `/siteadmin` lett.
- **Megelőzés**: Külön admin shellnél a nav root entrypointot mindig a tényleges `page.tsx` route-ra kell kötni, nem címke-alapú, kézzel kitalált útvonalra.

### [LOCAL-HIBA-003] Route-átnevezésnél a belső hardcoded linkek könnyen szétesnek
- **Dátum**: 2026-04-20
- **Fájl**: `src/app/page.tsx`, `src/app/admin/layout.tsx`, `src/app/siteadmin/page.tsx`, `next.config.js`, és kapcsolódó admin oldalak
- **Gyökérok**: A venue admin route kért új neve (`/venueadmin`) csak részben volt átvezetve, ezért több helyen továbbra is `/admin` linkek maradtak.
- **Javítás**: Minden belső route-hivatkozás átállt `/venueadmin`-ra, a legacy `/admin` pedig központi redirectet kapott.
- **Megelőzés**: URL-átnevezésnél kötelező teljeskörű route-inventory alapú csere + kompatibilitási redirect, különben funkciók „láthatóan eltűnnek” vagy rossz shellbe esnek.

### [LOCAL-HIBA-004] Böngészőből közvetlen Edge Function hívásnál preflight CORS/gateway hiba blokkolhat
- **Dátum**: 2026-04-20
- **Fájl**: `src/components/siteadmin/CommonAdminPanel.tsx`
- **Gyökérok**: A `supabase.functions.invoke('sync-hu-places')` közvetlen cross-origin hívás preflight (`OPTIONS`) hibát kaphat, ami UI oldalon „Edge Function nem érhető el” hibának látszik.
- **Javítás**: A kliens nem közvetlenül az Edge Functiont hívja, hanem saját originen lévő Next API proxyt (`/api/siteadmin/sync-hu-places`), ami szerveroldalon továbbítja a kérést.
- **Megelőzés**: Admin/ops jellegű műveleteknél (különösen manual trigger) preferáld a server-side proxyt a böngészőből történő közvetlen edge function invoke helyett.

### [LOCAL-HIBA-005] `sb_publishable` kulcs nem használható Edge Function Bearer tokenként
- **Dátum**: 2026-04-20
- **Fájl**: `src/app/api/siteadmin/sync-hu-places/route.ts`
- **Gyökérok**: A publishable kulcs nem HS256 JWT token (`eyJ...`), ezért Edge Function hitelesítésnél `UNAUTHORIZED_UNSUPPORTED_TOKEN_ALGORITHM (ES256)` hibát okozhat.
- **Javítás**: A proxy elsődlegesen `SUPABASE_SERVICE_ROLE_KEY`-t használ, és kulcsformátum-validációt végez hívás előtt.
- **Megelőzés**: Szerveroldali Edge Function invoke esetén mindig JWT-alapú kulcsot használj Bearerhez (service role vagy legacy anon JWT), `sb_publishable`/`sb_secret` kulcsot ne.
