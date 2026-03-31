# Kapakka PubApp — Changelog

Minden változtatás dátummal és leírással.

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


---

## [1.3.6] — 2026-03-31

### 🐛 Regressziójavítások
- **Input fókuszvesztés javítva** a bejelentkezési / regisztrációs / venue finder mezőkön
  - a page komponenseken belüli remountoló belső komponensek megszüntetve
  - a kereső- és jelszómezők már nem halnak meg 1 karakter után
- **Venue finder stabilizálva**
  - megszűnt a többször egymásra dobott „Nincs találat” toast
  - a kereső már csak inline empty state-et mutat
  - a kliens oldali keresés szélesebb fallbackgel hívja a `place-search` edge functiont
- **Select dropdown olvashatóság javítva**
  - a sötét témás option elemek explicit színt kaptak
- **Aktív becsekkolási logika visszaállítva**
  - a főoldali gyorselérés csempék csak aktív venue / asztal kontextus esetén látszanak
  - a becsekkolt venue neve és asztalszáma megjelenik
  - a scan és venue oldalak elmentik a becsekkolt kontextust

### ♻️ Visszatett korábbi funkciók
- **Játékok menü visszaállítva**
  - a külön Barátok menü helyére visszakerült a **Játékok** menüpont
  - ismét elérhető: kocsmakvíz / dice / igazság vagy mersz / részegségmérő
- **Barátok és közös listák** visszarakva a **Profil** oldal aljára
- **Hűségpont fókusz** visszaállítva a Profil oldalon
- **Egyéni ajánlataim** blokk hozzáadva a Profil oldalhoz
- **Admin oldali Étlap menüpont** visszaállítva az oldalsávba
- **Digitális étlap belépési pont** megőrizve és visszahangsúlyozva a vendég oldalon

### 🔧 Technikai
- `src/app/page.tsx` auth képernyő refaktor a fókuszvesztés megszüntetésére
- `src/app/customer/page.tsx` teljes regressziófix:
  - tabstruktúra helyreállítás
  - discover / games / profile logika rendezése
  - check-in context kezelés
- `src/components/PlaceAutocomplete.tsx` stabilabb controlled input viselkedés
- `src/app/customer/scan/page.tsx` és `src/app/customer/pub/[id]/page.tsx` aktív venue context mentés
- `src/lib/place-search.ts` szélesebb fallback keresés
- `supabase/functions/place-search/index.ts` szélesebb provider lekérés és jobb geocode/nearby összevonás

### 📝 Megjegyzés
- Ez a kiadás kifejezetten a korábban működő funkciók visszaállítására és a redesign regressziók megszüntetésére készült.


---

## [1.3.9] — 2026-04-01

### Hivatkozások
- Versioning: `versioning/13903921_v1.3.9_ai_dev_prompts.md`

### 🐛 Hibajavítások — Venue finder és address search

#### `supabase/functions/place-search/index.ts`

- **[HIBA-034] Geoapify `name` paraméter javítva** — A Places API v2 endpoint-on a `text` param csendben figyelmen kívül volt hagyva (geocoding API param). Lecserélve `name`-re, ami a Places v2 dokumentált POI névszűrő paramétere. A két Geoapify mód szét lett választva: `searchGeoapifyByName()` (name-filtered) és `searchGeoapifyNearby()` (pure category nearby).

- **[HIBA-035] TomTom `fuzzySearch` by-name / `poiSearch` nearby szétválasztás** — A korábbi kód `"BUDAPEST restaurant"` kombináció-t adott poiSearch-nek, ami 0 találatot eredményezett. A javítás: két önálló TomTom hívás: `searchTomTomByName()` (`fuzzySearch/{query}`) szabad szöveges névkereséshez, `searchTomTomNearby()` (`poiSearch/{category}`) csak kategória alapú közelségi kereséshez.

- **[HIBA-036] Score-alapú relevancia szűrő** — A hard `textMatchesQuery()` filter cserélve score + lenient fallback stratégiára. Score 3 = névegyezés, score 2 = cím/városegyezés, score 1 = részleges szóegyezés. Ha egyik sem egyezik, az összes találat megmarad (távolság szerint rendezve). A végeredmény soha nem üres puszta szűrési hiba miatt.

- **[HIBA-037] `open_now` filter javítva** — `open_now === true || !Array.isArray(...)` → `open_now !== false`. Az ismeretlen nyitvatartású helyszínek (`null`/`undefined`) többé nem esnek ki.

- **`_debug` mező hozzáadva** a response-hoz: query, resolvedCenter, providerCounts, returned — debug-safe, a klienst nem befolyásolja.

#### `src/lib/place-search.ts`

- **[HIBA-038] Kliensoldali szűrés eltávolítva** az edge function eredményéről — a normalizálás és `external_id` check megmaradt, de az edge function már elvégzi a relevancia-szűrést.

- **Fallback lépcsők bővítve** (3+cache): open_now ejtés → category ejtés → coordinates ejtés → places_cache. Minden lépésnél csak akkor lép a következőre, ha ténylegesen 0 a találat.

### ✅ Regresszióvédelmi checklist
- [x] `PlaceAutocomplete` publikus API nem sérült
- [x] Vendégoldali többi funkció (játékok, profil, rendelések, QR flow) nem módosítva
- [x] Admin oldali navigáció és étlapkezelés nem módosítva
- [x] Fókuszvesztéses komponensminta (HIBA-030) nem kerül vissza
- [x] Toast spam (HIBA-033) nem kerül vissza
