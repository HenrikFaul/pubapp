## ➕ APPEND — 2026-04-03 siteadmin / venue-admin route-separation hiba

### [HIBA-036] Site Admin rossz entrypointra mutatott a venue-admin shellből
- **Dátum**: 2026-04-03 (v1.4.3)
- **Fájl**: `src/app/admin/layout.tsx`
- **Hibaüzenet**: A venue-admin oldalsávban továbbra is megjelent a Site Admin link, ami ráadásul nem a Site Admin főoldalra, hanem a `siteadmin/venues` nézetre vitt.
- **Gyökérok**: A siteadmin külön route már létrejött, de a régi /admin shellben bent maradt a keverő menüpont, és az rossz célútvonalra (`/siteadmin/venues`) mutatott.
- **Javítás**: A közvetlen sidebar menüpont kikerült a venue-admin navigációból; helyette superadmin esetén csak elkülönítő átvezető CTA marad a külön `'/siteadmin'` felületre.
- **Megelőzés**: Ha két adminhatókör szétválik (venue-admin vs site-admin), **SOHA** ne maradjon az egyik shell főnavigációjában a másik teljes felülete ugyanazon prioritású menüpontként. Az entrypointnak a megfelelő gyökér route-ra kell mutatnia.
