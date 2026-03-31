# Kapakka PubApp — Changelog

Minden változtatás dátummal és leírással.

---

## [1.3.4] — 2026-03-31

### 🐛 Hibajavítások
- Venue finder keresőmező újra össze lett kötve a szülő state-tel, így a beírt név / cím ténylegesen bekerül a discovery lekérdezésbe
- `PlaceAutocomplete` most már controlled módban is működik, Enterrel is indítható keresés
- A `place-search` helper kezeli az Edge Function hiba payloadot is, és `places_cache` fallbacket használ
- A `place-search` Edge Function geokódolási fallbacket kapott, így város / cím alapú keresésből is venue lista képezhető
- Visszakerült a jól látható **digitális étlap** entry point a vendég felületre: külön étlap CTA a főoldalon, a venue listában és a hely részletes nézetében

### 🛡️ Regresszió megelőzés
- A `codingLessonsLearnt.md` tetejére bekerült az elsődleges szabály: **legfontosabb, hogy semmilyen működő funkciót ne ronts el**

---

## [1.3.0] — 2026-03-30

### ✨ Új funkciók

#### Cool redesign / responsive overhaul
- **Cosmic Pulse** új, extra menő default theme a fiatalosabb, nightlife fókuszú megjelenéshez
- Vendég oldalon teljesen új **venue explorer** élmény:
  - kategória szűrés: pub / bár / étterem / kávézó
  - **nyitva most** szűrő
  - **távolság szűrő** a jelenlegi tartózkodási hely alapján
  - rendezés **távolság szerint**
  - részletes place drawer: cím, kategória, rating, képek, website, telefon, tagek
- **Barát meghívás** és **közös helylisták** UI + adatmodell
- **Kedvencek** mentése belső venue-kre és külső place találatokra is
- Venue oldalon új:
  - kedvencekhez adás
  - venue megosztás / meghívás
  - **asztalfoglalás beküldése** közvetlenül a vendég felületről
- Rendeléskövetésnél **automatikus státuszjelzés** támogatás a browser notification rétegre előkészítve

#### Geoapify / TomTom place discovery integráció
- Új **Supabase edge function**: `place-search`
  - Geoapify primary keresés
  - TomTom fallback / enrichment
  - merge + dedupe + ranking
  - `places_cache` upsert támogatás
- Új frontend helper: `src/lib/place-search.ts`
- Új újrahasznosítható komponens: `src/components/PlaceAutocomplete.tsx`
- Admin konfigurátorban venue cím / hely adat gyors kitöltése place autocomplete-tal

#### Admin / venue side bővítések
- Új, erősen responsive admin layout
- Konfigurátorban új szekciók:
  - venue profil
  - szolgáltatási és élmény kapcsolók
  - foglalási jóváhagyás / slot / max party size
  - automatikus rendelésjelzések kapcsolói
  - runtime design választó
- Asztalok és QR belépés kártyás, modernebb kezelése

### 🗄️ Adatbázis és backend
- Új `app_settings` tábla a globális runtime theme-hez
- Új `reservations` tábla ha még nem létezett
- Új `places_cache` tábla + unique constraint `(provider, external_id)`
- Új `place_favorites` tábla
- Új `friendships` tábla
- Új `place_lists`, `place_list_members`, `place_list_items` táblák
- `venues` tábla bővítve új élmény/foglalási mezőkkel:
  - `reservation_requires_approval`
  - `reservation_slot_minutes`
  - `reservation_max_party_size`
  - `auto_notify_processing`
  - `auto_notify_ready`
  - `allow_external_place_shares`
  - `allow_friend_lists`
- Új trigger: `notify_customer_on_order_status_change()`
  - accepted / preparing / ready státuszokra automatikus notification insert

### 🎨 UI/UX
- Mobilon natívabb, weben tágasabb layout
- Erősebb vizuális hierarchia a vendég és admin oldalon
- Több CTA a fogyasztás és társasági aktivitás ösztönzésére
- Átláthatóbb venue és order flow

---

## [1.2.0] — 2026-03-30

### ✨ Új funkciók
- **Runtime theme switcher** az admin konfigurátorból
- 4 választható beépített design skin:
  - Taproom Classic
  - Neon Arcade
  - Botanical Brew
  - Midnight Reserve
- Theme aktiválás **redeploy nélkül**
- `codingLessonsLearnt.md` beemelése a fejlesztési workflow kötelező részévé

### 🔧 Technikai
- `app_settings` alapú theme mentés előkészítése
- Theme bootstrapping a root layoutban és kliens oldali providerrel
- Patch-only csomagolási forma bevezetése

---

## [1.1.0] — 2026-03-30

### ✨ Új funkciók

#### Site Admin Panel (`/siteadmin/`)
- **Dashboard**: Összes felhasználó, helyszín, rendelés, bevétel metrikák valós időben
- **Felhasználó kezelés**: Szerepkörök módosítása, felhasználók tiltása/engedélyezése, keresés
- **Helyszín áttekintés**: Összes regisztrált venue státusza, aktivitása, bevételi adatok
- **Aktivitás logok**: Rendszer szintű eseménynapló (regisztrációk, rendelések, hibák)

#### Étlap/Itallap Sablonok (Vendéglátói panel)
- **Magyar kocsma sablon**: Csapolt sörök, üveges sörök, borok, röviditalok, koktélok, üdítők — 40+ előre kitöltött termék
- **Étterem sablon**: Előételek, levesek, főételek, desszertek, gyerekmenü — 30+ termék
- **Kávézó sablon**: Kávék, teák, limonádék, sütemények — 25+ termék
- **Koktélbár sablon**: Klasszikus és signature koktélok, gin&tonic, whisky válogatás — 35+ termék
- Egyetlen kattintással betölthetők az étlapra
- Kategóriák automatikus létrehozásával

#### Vendéglátói UI fejlesztések
- Továbbfejlesztett admin sidebar: ikonok Lucide React-ból, tooltipek, aktív állapot vizuálisan kiemelt
- Admin fejléc: venue név + élő rendelésjellző badge
- Konfigurátor bővítés: Asztal kapacitás szerkesztése, QR kód letöltés gomb
- Étlap szerkesztő: "Sablon betöltése" gomb a gyors induláshoz

### 🎨 UI/UX javítások
- Admin sidebar: sötét háttér gradienssel, átlátszó blur effekt mobil nézetben
- Státusz badge-ek: konzisztens szín és ikon rendszer (sárga/kék/narancs/zöld)
- Kártya design: finomabb árnyékok, lekerekített sarkok (16px)
- Gombok: hover animáció, disabled állapot vizuális visszajelzés
- Mobile-first responsive elrendezés az összes új oldalon
- Admin oldalsáv: Lucide ikonok az emoji ikonok helyett
- Siteadmin link a superadmin felhasználók számára

### 🗄️ Adatbázis
- `activity_logs` tábla: rendszer szintű eseménynaplózás
- `menu_templates` tábla: előre definiált étlap sablonok
- `menu_template_items` tábla: sablon tételek
- RLS policies az új táblákhoz
- Trigger: automatikus logolás regisztrációnál és rendelésnél

### 🔧 Technikai
- `changelog.md` bevezetése a változtatások nyomon követésére

---

## [1.0.1] — 2026-03-29

### 🐛 Hibajavítások
- Auth redirect loop javítása (middleware + page.tsx + customer/page.tsx + admin/layout.tsx egymásba irányított)
- RLS policy javítás: profil olvasás engedélyezés minden bejelentkezett felhasználónak
- Szerepkör hozzárendelés javítás: auth.users JOIN-nal email alapján
- Email mező szinkronizálás: handle_new_user() trigger javítás

---

## [1.0.0] — 2026-03-28

### 🎉 Első kiadás
- Vendég oldal: helyszín kereső, QR rendelés, rendeléskövetés, kocsmakvíz, játékok
- Admin panel: kiszolgálás, rendelések, étlap, készlet, statisztikák, konfigurátor, segítség
- Supabase auth + RLS
- Valós idejű rendeléskezelés (Realtime)
- PWA manifest
