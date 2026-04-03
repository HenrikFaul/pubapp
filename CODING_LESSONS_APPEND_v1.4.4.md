## ➕ APPEND — 2026-04-03 siteadmin teljes leválasztása

### [HIBA-037] A külön siteadmin route létrehozása önmagában nem szünteti meg a funkcionális keveredést
- **Dátum**: 2026-04-03 (v1.4.4)
- **Fájl**: `src/app/admin/layout.tsx`, `src/app/admin/config/page.tsx`
- **Hibaüzenet**: A siteadmin továbbra is a szolgáltatói admin felület részeként látszott, és a Common Admin is bent maradt a venue-admin konfigurátorban.
- **Gyökérok**: A siteadmin saját route és layout már megvolt, de a régi entrypointok és tabok bent maradtak a venue-admin shellben.
- **Javítás**: A venue-adminból kikerült a Site Admin navigációs pont és a Common Admin tab, a `siteadmin/venues` pedig visszalépést kapott a külön `/siteadmin` dashboardra.
- **Megelőzés**: Ha adminhatóköröket választunk szét, a régi shellből **minden** korábbi entrypointot, tabot és menüpontot is el kell távolítani. Nem elég csak az új route-ot létrehozni.
