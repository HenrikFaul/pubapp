# Kapakka PubApp — Changelog

Minden változtatás dátummal és leírással. Append-only — korábbi bejegyzés nem törölhető, nem írható felül.
*(Kronológiai sorrend helyreállítva: v1.4.5 governance fix — tartalom érintetlen.)*

---

---

## [1.0.0] — 2026-03-28

### 🎉 Első kiadás
- Vendég oldal: helyszín kereső, QR rendelés, rendeléskövetés, kocsmakvíz, játékok
- Admin panel: kiszolgálás, rendelések, étlap, készlet, statisztikák, konfigurátor, segítség
- Supabase auth + RLS
- Valós idejű rendeléskezelés (Realtime)
- PWA manifest


---
## [1.0.1] — 2026-03-29

### 🐛 Hibajavítások
- Auth redirect loop javítása (middleware + page.tsx + customer/page.tsx + admin/layout.tsx egymásba irányított)
- RLS policy javítás: profil olvasás engedélyezés minden bejelentkezett felhasználónak
- Szerepkör hozzárendelés javítás: auth.users JOIN-nal email alapján
- Email mező szinkronizálás: handle_new_user() trigger javítás

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
## [1.4.0] — 2026-04-01

### 🗺️ Hungary local-first venue catalog
- **Új helyi venue-katalógus**: `places_hu_catalog` tábla a magyarországi venue / POI adatokhoz
- **Új lokális kereső RPC**: `search_hungary_places(...)` a gyors, adatbázis-alapú venue finderhez
- **Új sync állapot tábla**: `place_sync_state` a batch alapú országos frissítés cursorának tárolására
- **Új batch sync edge function**: `supabase/functions/sync-hu-places/index.ts`
  - Magyarország bounding box csempézése
  - Geoapify és TomTom batch letöltések
  - offsetes oldallapozás
  - helyi upsert a `places_hu_catalog` táblába
- **Napi frissítéshez ütemező helper**: `schedule_hu_place_sync(project_url, anon_key, schedule)` SQL függvény
  - alapértelmezett ütemezés: 15 percenként futó batch, amely 24 órán belül végigviszi a teljes országos ciklust

### 🐛 Venue finder javítások
- A venue finder többé **nem élő provider keresésre épül kizárólagosan**
- A `place-search` edge function mostantól:
  - először a lokális magyar venue-katalógusból keres
  - csak bootstrap helyzetben használ provider fallbacket
  - automatikusan háttérben elindít syncet, ha a katalógus üres vagy 24 óránál régebbi
- A `src/lib/place-search.ts` kliens helper mostantól local-first fallback logikát használ
- A külső provider hibák többé nem nullázzák le automatikusan a venue finder teljes eredményét

### 📚 Folyamat és dokumentáció
- A `codingLessonsLearnt.md` elejére bekerült a kötelező webkutatás + gyökérokelemzés + koncepciótesztelés módszertan
- Új versioning fájlpár létrehozva:
  - `versioning/14000041_v1.4.0_business_request_summary.pdf`
  - `versioning/14000041_v1.4.0_ai_dev_prompts.md`
- Ez a changelog bejegyzés ezekre a versioning fájlokra hivatkozik

### ✅ Ellenőrzési checklist ehhez a kiadáshoz
- [x] `codingLessonsLearnt.md` beolvasva
- [x] `changelog.md` beolvasva
- [x] Hivatalos internetes dokumentációk átnézve (Geoapify, TomTom, Supabase)
- [x] A venue finder hibájának gyökérokelemzése megtörtént
- [x] A provider-only keresés helyett local-first megoldás került be
- [x] A napi / folyamatos frissítéshez szükséges batch sync architektúra elkészült
- [x] A szállítás csak a cserélendő fájlokat tartalmazza


---
## [1.4.2] — 2026-04-03

### 🧩 Common Admin baseline rollout — append-only javítás
- A közös adminmodell Pubapp oldali baseline rolloutja **append-only changelog** elv szerint került korrigálásra.
- A korábbi release history teljes egészében megőrzésre került, az új adminbővítés új történeti szekcióként került hozzáadva.
- Az admin konfigurátor új **Common Admin** capability blokkot kapott.
- Az új common_admin baseline capability-k:
  - **Integrációk és hosting inventory**
  - **Alkalmazásverzió és deployment metaadatok**
  - **Changelog-alapú leszállított funkciólista**
  - **Lokális katalógus állapot és újraszinkron trigger**
- A már meglévő venue/config/design adminfunkciók változatlanul megmaradnak.

### 🔧 Technikai
- Új közös admin komponens: `src/components/admin/CommonAdminPanel.tsx`
- Új metaadat helper: `src/lib/commonAdminMetadata.ts`
- Az admin konfigurátor oldala új Common Admin nézettel bővült.
- Új versioning dokumentumpár:
  - `versioning/14040332_v1.4.2_business_request_summary.pdf`
  - `versioning/14040332_v1.4.2_ai_dev_prompts.md`

### ✅ Végellenőrzési checklist
- [x] A changelog korábbi tartalma megőrizve
- [x] Az új common_admin baseline hozzáappendelve
- [x] A meglévő admin konfigurációs funkciók megőrizve
- [x] A szállítás csak a cserélendő fájlokat tartalmazza

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
- Ez a link ráadásul közvetlenül a **`/siteadmin/venues`** oldalra mutatott, ezért úgy látszott, mintha a Site Admin „üres" lenne, miközben a common_admin dashboard valójában a **`/siteadmin`** route-on volt.

### 🔧 Technikai
- Módosult: `src/app/admin/layout.tsx`
- Módosult: `src/app/siteadmin/venues/page.tsx`
- Új versioning pár:
  - `versioning/14040336_v1.4.3_business_request_summary.pdf`
  - `versioning/14040336_v1.4.3_ai_dev_prompts.md`

### ✅ Végellenőrzési checklist
- [x] A Site Admin menüpont kikerült a venue-admin oldalsávból
- [x] A siteadmin/venues visszanavigálást kapott a /siteadmin dashboardra
- [x] A korábbi changelog history nem törlődött

---
## [1.4.4] — 2026-04-03

### 🛡️ Site Admin tényleges leválasztása a venue-adminról
- A **Site Admin** többé nem jelenik meg a venue-admin (`/admin`) shell részeként.
- A venue-admin oldalsávból kikerült a közvetlen **Site admin** menüpont.
- A venue-admin **Konfigurátor** oldalon megszűnt a Common Admin tab; a Common Admin kizárólag a különálló **`/siteadmin`** felületen marad elérhető.
- A külön platformszintű admin továbbra is a **`/siteadmin`** route-on érhető el, saját shell-lel és saját menüvel.
- A `siteadmin/venues` nézet a külön Site Admin részeként kapott egyértelmű visszalépést a Common Admin dashboardra.

### 🐛 Gyökérok
- A main ágban a venue-admin layout még mindig tartalmazta a Site Admin linket, ezért a platformszintű admin a szolgáltatói shell részeként látszott.
- A superadmin felhasználó a venue-adminba esett be, majd onnan tudott csak Site Adminra navigálni, ami sértette a kért szétválasztási modellt.
- A venue-admin konfigurátorban bent maradt a Common Admin tab, ezért a common_admin képességek duplán, rossz helyen is megjelentek.

### 🔧 Technikai
- Módosult: `src/app/admin/layout.tsx`
- Módosult: `src/app/admin/config/page.tsx`
- Módosult: `src/app/siteadmin/venues/page.tsx`
- Új versioning pár:
  - `versioning/14040337_v1.4.4_business_request_summary.pdf`
  - `versioning/14040337_v1.4.4_ai_dev_prompts.md`

### ✅ Végellenőrzési checklist
- [x] A Site Admin kikerült a venue-admin shellből
- [x] A Common Admin kikerült a venue-admin konfigurátorból
- [x] A külön `siteadmin` shell megmaradt
- [x] A korábbi changelog history nem törlődött

---
## [1.4.5] — 2026-04-03

### 🔧 Governance integritás helyreállítása

#### Changelog
- A v1.4.3-as bejegyzés bekerült a changelogba (korábban a `CHANGELOG_APPEND_v1.4.3.md` fájlban volt, de merge nélkül maradt).
- A changelog teljes history érintetlen: 1.0.0 → 1.0.1 → 1.1.0 → 1.3.6 → 1.4.0 → 1.4.2 → 1.4.3 → 1.4.4 → 1.4.5.

#### codingLessonsLearnt frissítések
- `codingLessonsLearnt.md` (root): HIBA-051 és HIBA-052 appendelve — siteadmin/venue-admin szétválasztás tanulságai (az `CODING_LESSONS_APPEND_v1.4.3.md` és `v1.4.4.md` fájlokból, átszámozva, mivel HIBA-036/037 már foglalt volt más tanulságokkal).
- `.governance/codingLessonsLearnt.md`: ugyanezek appendelve a megosztott tudásbázisba.
- `codingLessonsLearnt.local.md`: LOCAL-HIBA-001 változatlan (helyes volt).

#### Controller / governance alignment
- Hobbeast `.governance/controller.md`: kiegészítve a canonical governance controller hiányzó szekcióival (execution authority, common admin, append-only changelog szabályok).
- ReleaseGovernance `.governance/controller.md`: kiegészítve a common_admin és append-only changelog szabályokkal.
- Hobbeast `codingLessonsLearnt.local.md`: létrehozva (a governance catalog szerint kellene, de hiányzott).
- Governance central `codingLessonsLearnt.md`: HIBA-051 és HIBA-052 appendelve a megosztott poolba.

### 🐛 Gyökérok
- Az `CODING_LESSONS_APPEND_v*.md` és `CHANGELOG_APPEND_v1.4.3.md` fájlok soha nem kerültek be a fő fájlokba — a merge tool nem futott le automatikusan.
- A repo-specifikus controller fájlok elmaradtak a canonical governance controller frissítéseitől.
- Hobbeast nem rendelkezett `codingLessonsLearnt.local.md` fájllal, holott a governance catalog kötelezőnek jelölte.

### 🔧 Technikai
- Módosult: `changelog.md` (pubapp)
- Módosult: `codingLessonsLearnt.md` (pubapp root)
- Módosult: `.governance/codingLessonsLearnt.md` (pubapp)
- Módosult: `.governance/controller.md` (hobbeast, ReleaseGovernance)
- Létrehozva: `codingLessonsLearnt.local.md` (hobbeast)
- Módosult: `codingLessonsLearnt.md` (governance central)
- Új versioning pár:
  - `versioning/14040338_v1.4.5_business_request_summary.pdf`
  - `versioning/14040338_v1.4.5_ai_dev_prompts.md`

### ✅ Végellenőrzési checklist
- [x] v1.4.3 changelog bejegyzés betoldva (nem felülírva, hanem beillesztve)
- [x] HIBA-051/052 appendelve a megfelelő codingLessonsLearnt fájlokba
- [x] Hobbeast és ReleaseGovernance controller szinkronba hozva a canonical verzióval
- [x] Hobbeast codingLessonsLearnt.local.md létrehozva
- [x] Governance central tanulságok frissítve
- [x] Minden korábbi history érintetlen

---

## [1.4.6] — 2026-04-03

### 🛡️ SiteAdmin src patch — tényleges kódfeltöltés és nav kiegészítés

#### Probléma gyökérok
- A korábbi delivery (v1.4.3–v1.4.5) PATCH_FILE_LIST fájljai csak governance fájlokat tartalmaztak, ezért a fejlesztők nem töltötték fel a szükséges src fájlokat a repóba.
- A Vercel deployment így továbbra is a régi kódot futtatta: a siteadmin standalone shell és a Common Admin komponens soha nem kerültek be a live GitHub ágba.
- Az `src/app/siteadmin/` mappa (layout, page, venues, users, logs) hiányzott a repóból.
- A siteadmin layout nav hiányos volt: a Users és Logs oldalak léteztek, de nem jelentek meg a navigációban.

#### Elvégzett src változtatások
- **`src/app/admin/layout.tsx`**: superadmin redirect `/siteadmin`-re; a venue-admin NAV-ban nincs siteadmin link.
- **`src/app/admin/config/page.tsx`**: Common Admin tab eltávolítva a venue-admin konfigurátorból.
- **`src/app/siteadmin/layout.tsx`** *(új)*: standalone Site Admin shell, saját auth checkkel (csak superadmin); nav: Common Admin, Venue registry, Felhasználók, Aktivitás logok.
- **`src/app/siteadmin/page.tsx`** *(új)*: Site Admin főoldal, `<CommonAdminPanel />` beágyazva.
- **`src/app/siteadmin/venues/page.tsx`** *(új)*: Venue registry, visszanavigál `/siteadmin`-re.
- **`src/app/siteadmin/users/page.tsx`** *(új)*: Felhasználókezelés, szerepkör-módosítás.
- **`src/app/siteadmin/logs/page.tsx`** *(új)*: Aktivitás logok.
- **`src/components/admin/CommonAdminPanel.tsx`** *(új)*: integrációk, hosting, release snapshot, place-sync.
- **`src/lib/commonAdminMetadata.ts`** *(új)*: metaadat helper.

#### Végeredmény architektúra
```
/customer  → Felhasználói felület (standalone)
/admin     → Szolgáltatói felület (standalone, venue admin + staff)
/siteadmin → Site Admin felület (standalone, csak superadmin)
              ├── Common Admin (integrációk, hosting, release, place-sync)
              ├── Venue registry
              ├── Felhasználók
              └── Aktivitás logok
```

### ✅ Végellenőrzési checklist
- [x] `/admin` NAV-ban nincs siteadmin link
- [x] superadmin `/admin`-ra lépve automatikusan `/siteadmin`-re kerül
- [x] `/siteadmin` önálló shellel rendelkezik (nem a venue-admin shell child-ja)
- [x] Common Admin kizárólag a `/siteadmin` főoldalon jelenik meg
- [x] venue-admin konfigurátorból (config/page.tsx) kikerült a Common Admin tab
- [x] siteadmin nav teljes: Common Admin, Venue registry, Felhasználók, Aktivitás logok
- [x] Korábbi history érintetlen

---

## [1.4.7] — 2026-04-03

### 🛡️ CommonAdminPanel áthelyezése + admin/layout.tsx javítás feltöltési hiba után

#### Probléma
- A v1.4.6 patch feltöltésekor az `src/app/admin/layout.tsx` nem került be a repóba, ezért a "Site admin" menüpont megmaradt a venue-admin oldalsávban.
- A `CommonAdminPanel.tsx` komponens a `src/components/admin/` mappába volt elhelyezve, holott architektúrálisan a `src/components/siteadmin/` mappába tartozik.

#### Javítások
- **`src/components/admin/CommonAdminPanel.tsx` → `src/components/siteadmin/CommonAdminPanel.tsx`** — áthelyezve a helyes architektúrális könyvtárba.
- **`src/app/siteadmin/page.tsx`** — import frissítve: `@/components/siteadmin/CommonAdminPanel`.
- **`src/app/admin/layout.tsx`** — explicit újrajelölve patch-be: "Site admin" nincs a NAV-ban, superadmin automatikusan `/siteadmin`-re kerül.

#### Végső architektúra
```
src/components/
  ├── admin/           ← venue-admin komponensek (CommonAdminPanel NEM ide való)
  └── siteadmin/
        └── CommonAdminPanel.tsx  ← platform szintű admin komponens

/customer  → Felhasználói felület (standalone)
/admin     → Szolgáltatói felület (venue admin + staff, superadminnak redirect /siteadmin-re)
/siteadmin → Site Admin felület (standalone, csak superadmin)
              ├── Common Admin dashboard (CommonAdminPanel)
              ├── Venue registry
              ├── Felhasználók
              └── Aktivitás logok
```

### ✅ Végellenőrzési checklist
- [x] `src/components/admin/CommonAdminPanel.tsx` törölve a repóból
- [x] `src/components/siteadmin/CommonAdminPanel.tsx` létrehozva
- [x] `src/app/siteadmin/page.tsx` import frissítve
- [x] `src/app/admin/layout.tsx` NAV-ban nincs "Site admin"
- [x] superadmin → /siteadmin redirect működik
- [x] venue admin és siteadmin teljesen különálló shell

---
## [1.4.8] — 2026-04-20

### 🧭 SiteAdmin láthatósági javítás + route átnevezés

#### Gyökérok
- A SiteAdmin oldalsávban a Common Admin menüpont hibás route-ra mutatott (`/siteadmin/CommonAdmin`), miközben a tényleges dashboard route a `/siteadmin`.
- A venue admin belső route-hivatkozások továbbra is `/admin` prefixet használtak, ezért a kért `venueadmin` név nem volt konzisztensen érvényesítve.

#### Javítások
- A SiteAdmin Common Admin menüpont route-ja javítva: **`/siteadmin`**.
- Új, különálló venue admin route-fa létrehozva: **`/venueadmin`** (minden korábbi admin aloldal elérhető ezen is).
- A teljes belső hivatkozási lánc frissítve `venueadmin` névre:
  - login/signup role redirectek
  - venue admin oldalsáv navigation
  - setup/menu/customer/siteadmin átjárások
- Kompatibilitási és regresszióvédelmi célból a régi `/admin` és `/admin/:path*` útvonalak **301 redirecttel** a `/venueadmin` útvonalra mutatnak (`next.config.js`).

#### Végeredmény
- **`/siteadmin`**: különálló, működő Site Admin shell és Common Admin dashboard.
- **`/venueadmin`**: különálló venue admin shell (korábbi `/admin` funkciók).
- **`/admin`**: legacy belépési pont, automatikus átirányítás `/venueadmin`-ra.
