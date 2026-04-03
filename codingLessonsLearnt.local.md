# codingLessonsLearnt.local

# Ide appendelődnek az adott repo saját új tanulságai.

## ➕ APPEND - 2026-04-03 siteadmin szétválasztás a venue-adminból

### [LOCAL-HIBA-001] A különálló siteadmin route önmagában nem elég, ha a venue-admin shellben bent marad a link és a common_admin tab
- **Dátum**: 2026-04-03
- **Fájl**: `src/app/admin/layout.tsx`, `src/app/admin/config/page.tsx`
- **Gyökérok**: A siteadmin saját route és saját layout már létezett, de a régi venue-admin shellben bent maradt a Site Admin entrypoint és a Common Admin tab. Emiatt a platformszintű admin funkciók továbbra is a szolgáltatói admin részeként látszottak.
- **Javítás**: A Site Admin menüpont kikerült a venue-admin oldalsávból, a Common Admin tab kikerült a venue-admin konfigurátorból, és a siteadmin/venues oldal a külön siteadmin shellen belül kapott visszanavigálást a `/siteadmin` dashboardra.
- **Megelőzés**: Ha egy funkciót külön adminhatókörre választunk le, akkor nem elég új route-ot létrehozni. Kötelező ellenőrizni az összes régi shellt, oldalsávot, config tabot és entrypointot is, hogy ott ne maradjon bent a leválasztott funkció.
