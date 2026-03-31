# codingLessonsLearnt.md — Kapakka PubApp

## ⚠️ UTASÍTÁSOK (MINDIG OLVASD EL ELŐSZÖR!)

**KÖTELEZŐ MUNKAFOLYAMAT — Minden fejlesztés előtt:**
1. Nyisd meg és olvasd végig ezt a fájlt MIELŐTT bármit kódolnál
2. Ellenőrizd, hogy az új kódod nem tartalmaz-e az itt felsorolt hibamintákat
3. Ha új hibát találsz/javítasz, AZONNAL appendeld a megfelelő kategóriába
4. SOHA ne töröld a meglévő tartalmat — csak hozzáadni szabad
5. SOHA ne hozz létre új fájlt ezzel a céllal — mindig ebbe a fájlba írd

**Struktúra minden hiba bejegyzésnél:**
```
### [HIBA-XXX] Rövid cím
- **Dátum**: Mikor fordult elő
- **Fájl**: Melyik fájlban volt
- **Hibaüzenet**: Pontos TypeScript/build error
- **Gyökérok**: Miért történt
- **Javítás**: Hogyan lett megoldva
- **Megelőzés**: Hogyan kerüld el a jövőben
```

---

## 🔴 KATEGÓRIA 1: TypeScript típus hibák

### [HIBA-001] Hiányzó property az interface-ből
- **Dátum**: 2026-03-30 (v1.1.0)
- **Fájl**: `src/app/admin/menu/templates/page.tsx:157`
- **Hibaüzenet**: `Type error: Property 'item_sort' does not exist on type 'TemplateItem'.`
- **Gyökérok**: A `TemplateItem` interface-ben nem volt definiálva az `item_sort` property, miközben a kód hivatkozott rá (`sort_order: item.item_sort`). Az interface-t kézzel írtam, és kifelejtettem egy mezőt amit az SQL tábla tartalmaz.
- **Javítás**: Hozzáadtam `item_sort: number` a `TemplateItem` interface-hez.
- **Megelőzés**: **MINDIG** hasonlítsd össze az interface mezőket az SQL tábla oszlopaival. Ha az SQL-ben van `item_sort`, az interface-ben is KELL lennie. Checklist: minden SQL oszlop = egy interface property.

### [HIBA-002] Supabase FK reláció típusozás — `.table.number` hiba
- **Dátum**: 2026-03-30 (v1.2.0)
- **Fájl**: `src/app/admin/reports/page.tsx:61`
- **Hibaüzenet**: `Type error: Property 'number' does not exist on type '{ number: any; }[]'.`
- **Gyökérok**: Supabase `.select('table:tables(number)')` esetén a TypeScript a relációt **tömbként** (`{ number: any }[]`) típusozza, nem objektumként. Ezért `o.table.number` helyett `o.table[0].number` kellene, de valójában futásidőben objektumot ad vissza (nem tömböt).
- **Javítás**: A `.map()` callback-ben `(o: any)` típust használtam: `.map((o: any) => [...])` — ez megkerüli a Supabase TS típus problémát.
- **Megelőzés**: **MINDIG** használj `(item: any)` cast-ot amikor Supabase `.select()` eredményt iterálsz és FK relációkat (`table:tables(...)`, `venue:venues(...)`, `menu_item:menu_items(...)`) használsz. VAGY használj `useState<any[]>([])` a state-hez. A kettő közül az egyik KÖTELEZŐ.

### [HIBA-003] Supabase FK — új oszlopok nem ismertek a TS típusokban
- **Dátum**: 2026-03-30 (v1.2.0)
- **Fájl**: `src/app/admin/reports/page.tsx:137`
- **Hibaüzenet**: Potenciális — `total_orders`, `total_spent` nem létezik a `profiles` Supabase típusban
- **Gyökérok**: Ha ALTER TABLE-lel új oszlopot adsz hozzá (`total_orders`, `total_spent`), a Supabase TS generált típusok nem frissülnek automatikusan. A `.select()` eredmény típusa nem tartalmazza az új mezőket.
- **Javítás**: `(c: any)` cast a `.map()` callback-ben.
- **Megelőzés**: Ha SQL migrációval új oszlopokat adsz egy meglévő táblához, az adott tábla select eredményeit MINDIG `(row: any)` casttal kezeld, amíg a típusok nem lesznek újragenerálva (`supabase gen types`).

---

## 🟡 KATEGÓRIA 2: SQL / RLS / Adatbázis hibák

### [HIBA-004] SQL szintaxis hiba — RLS policy zárójelezés
- **Dátum**: 2026-03-29 (v1.0.0)
- **Fájl**: `supabase/migrations/001_initial_schema.sql:47`
- **Hibaüzenet**: `syntax error at or near "or" LINE 47: ) or is_active = true;`
- **Gyökérok**: Az RLS policy USING() zárójelén kívül volt egy `or is_active = true` feltétel. A helyes szintaxis: `USING ((feltétel1) OR (feltétel2))` — minden feltétel a USING() BELSEJÉBE kerül.
- **Javítás**: Az egész policy-t újraírtam helyes zárójelezéssel.
- **Megelőzés**: RLS policy írásakor MINDIG ellenőrizd, hogy MINDEN feltétel a `USING(...)` zárójelen BELÜL van. Soha ne legyen logikai operátor a zárójelen kívül.

### [HIBA-005] RLS policy circular dependency — profil olvasás blokkolva
- **Dátum**: 2026-03-29 (v1.0.1)
- **Fájl**: Profiles RLS policies
- **Hibaüzenet**: Profil lekérdezés sikertelen admin felhasználóknál
- **Gyökérok**: A profiles SELECT policy JOIN-t tartalmazott a `venues` táblára, ami maga is RLS-sel volt védve. Ha a venues policy is hivatkozott a profiles-ra → circular dependency. Az admin felhasználó nem tudta olvasni a saját profilját.
- **Javítás**: Egyszerű policy: `CREATE POLICY "profiles_select_authenticated" ON public.profiles FOR SELECT USING (auth.uid() IS NOT NULL);` — minden bejelentkezett felhasználó olvashat minden profilt.
- **Megelőzés**: **SOHA** ne legyen RLS SELECT policy-ban JOIN más RLS-védett táblára. Ha kell cross-table check, használj egyszerű `auth.uid()` alapú feltételt, vagy SECURITY DEFINER funkciót.

### [HIBA-006] Profil email NULL — role update 0 rows
- **Dátum**: 2026-03-29 (v1.0.1)
- **Hibaüzenet**: `UPDATE public.profiles SET role = 'admin' WHERE email = 'x@y.com'` → 0 rows affected
- **Gyökérok**: A `handle_new_user()` trigger nem másolta át az email-t az `auth.users` táblából a `profiles` táblába. A `profiles.email` mező NULL volt, ezért a WHERE feltétel nem talált sort.
- **Javítás**: JOIN-os UPDATE: `UPDATE profiles p SET role = 'admin' FROM auth.users u WHERE p.id = u.id AND u.email = 'x@y.com';`
- **Megelőzés**: A `handle_new_user()` trigger MINDIG másolja át az email-t: `NEW.raw_user_meta_data->>'email'` VAGY `(SELECT email FROM auth.users WHERE id = NEW.id)`. Soha ne feltételezd, hogy a profiles.email ki van töltve.

### [HIBA-007] Supabase FK constraint név — törékeny hivatkozás
- **Dátum**: 2026-03-30 (v1.1.0)
- **Fájl**: `src/app/siteadmin/venues/page.tsx`
- **Hibaüzenet**: Potenciális — `profiles!venues_owner_id_fkey` nem létezik
- **Gyökérok**: `.select('*, owner:profiles!venues_owner_id_fkey(full_name, email)')` — a constraint név adatbázisonként eltérhet. A Supabase automatikusan generálja a FK constraint nevet, és nem garantált, hogy mindig `venues_owner_id_fkey`.
- **Javítás**: Lecseréltem `.select('*, owner:profiles(full_name, email)')` — constraint név nélkül, a Supabase automatikusan feloldja.
- **Megelőzés**: **SOHA** ne használj explicit FK constraint nevet a `.select()` relációkban. Használd a szimpla `table_name(columns)` szintaxist. Ha ambiguous, használd a `table_name!column_name(columns)` formátumot (oszlop nevet, NEM constraint nevet).

---

## 🟠 KATEGÓRIA 3: Auth / Redirect / Session hibák

### [HIBA-008] Auth redirect loop — 4 helyen konkurens redirect
- **Dátum**: 2026-03-29 (v1.0.0 → v1.0.1)
- **Fájl**: middleware.ts + page.tsx + customer/page.tsx + admin/layout.tsx
- **Hibaüzenet**: Végtelen loading screen — az alkalmazás sosem jutott túl az „Átirányítás..." képernyőn
- **Gyökérok**: 4 különböző helyen volt routing logika, és egymásba irányítottak: middleware → /admin → admin/layout ellenőrzi → /customer → customer/page ellenőrzi → /admin → ∞ loop
- **Javítás**:
  1. `middleware.ts` — CSAK cookie frissítés, NULLA redirect
  2. `page.tsx` — Egyetlen auth check 4s timeout-tal, `hasRedirected` ref a dupla redirect ellen
  3. `customer/page.tsx` — Admin felhasználóknak "Admin panel megnyitása" GOMB, nem redirect
  4. `admin/layout.tsx` — Nem-admin felhasználóknak error screen, nem redirect
- **Megelőzés**: **EGY SZABÁLY**: Routing döntés KIZÁRÓLAG client-side, egyetlen helyen. Middleware SOHA ne redirecteljen. Ha jogosultsági hiba van, mutass error screen-t, ne redirectelj másik oldalra.

### [HIBA-009] getSession() vs getUser() — elavult session
- **Dátum**: 2026-03-29
- **Gyökérok**: `getSession()` a helyi cache-ből olvas, ami elavult lehet. `getUser()` mindig a Supabase szerverhez fordul.
- **Megelőzés**: Auth ellenőrzésnél MINDIG `getUser()` a megbízható módszer, NEM `getSession()`.

### [HIBA-014] Venue JOIN a profil lekérdezésben blokkolja az auth-ot
- **Dátum**: 2026-03-30 (v1.2.0)
- **Fájl**: `src/app/admin/layout.tsx`
- **Hibaüzenet**: "Nincs hozzáférésed" — admin felhasználó nem tud belépni az admin panelre
- **Gyökérok**: A profil lekérdezés `select('*, venue:venues(*)')` formában volt, ami FK JOIN-t csinál a venues táblára. Ha a `profiles.venue_id` NULL (nincs venue hozzárendelve), VAGY ha nincs explicit FK constraint a DB-ben, VAGY ha az RLS policy blokkolja a venues lekérést, az EGÉSZ lekérdezés hibával tér vissza (`profileError` != null). Emiatt a kód a `no-permission` ágra futott, pedig a felhasználó valójában admin role-lal rendelkezett.
- **Javítás**: A profil és venue lekérdezést SZÉTVÁLASZTOTTAM:
  1. Először: `select('*')` a profiles-ból (FK JOIN nélkül) — ez az auth check
  2. Utána: külön `select('*')` a venues-ból venue_id alapján — ez már NEM blokkolja az auth-ot
- **Megelőzés**: **SOHA** ne legyen FK JOIN egy auth-kritikus lekérdezésben! Az auth ellenőrzés (profil + role check) MINDIG egyszerű, single-table query legyen. Ha kiegészítő adatok kellenek (venue, orders stb.), azokat KÜLÖN, NEM-BLOKKOLÓ lekérdezésben szerzd be MIUTÁN az auth check sikeres.

---

## 🔵 KATEGÓRIA 4: Build / Import / Kompatibilitás hibák

### [HIBA-010] Next.js fájlnév konvenció — page.tsx kötelező
- **Dátum**: 2026-03-29
- **Gyökérok**: A felhasználó a letöltött fájlokat `admin-layout.tsx` és `customer-page.tsx` néven mentette el `layout.tsx` és `page.tsx` helyett. Next.js App Router CSAK a `page.tsx`, `layout.tsx`, `loading.tsx` stb. pontos neveket ismeri fel.
- **Megelőzés**: Fájlok MINDIG a pontos Next.js konvenció szerinti nevekkel készüljenek. A letöltési/mentési utasításokban MINDIG jelöld meg a cél fájlnevet.

### [HIBA-011] Lucide React ikon import — nem létező ikon név
- **Dátum**: Általános (megelőző figyelmeztetés)
- **Megelőzés**: Lucide React ikonokat MINDIG a hivatalos listáról importáld. Ha nem biztos, hogy létezik, használj olyan ikont ami biztosan megvan (pl. `Settings`, `User`, `Search`, `Plus`, `Check`, `X`). A `lucide-react@0.363.0` verzióban ezek biztosan elérhetők: Zap, ClipboardList, UtensilsCrossed, Package, BarChart3, Settings, HelpCircle, Menu, Bell, LogOut, Shield, ChevronRight, X, Monitor, CalendarClock, FileDown, Plus, Pencil, Trash2, Search, CheckCircle, XCircle, Volume2, VolumeX, Maximize, Minimize, RefreshCw, Check, Clock, AlertTriangle, Download, FileSpreadsheet, Calendar, TrendingUp, ShoppingBag, Users, Phone, Mail, User, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, ArrowLeft, Sparkles, Star, MapPin, Store, ScrollText, LayoutDashboard, Activity, Info, AlertCircle, ToggleLeft, ToggleRight, Save, Filter, Bug, Send.

### [HIBA-015] Lucide React redesign patch — `House` ikon build hibát okozott
- **Dátum**: 2026-03-30 (v1.2.1)
- **Fájl**: `src/app/customer/page.tsx:15`
- **Hibaüzenet**: `Type error: "lucide-react" has no exported member named 'House'. Did you mean 'Mouse'?`
- **Gyökérok**: A redesign patch-ben olyan Lucide ikont importáltam (`House`), ami a projektben használt verzióban nem exportált. Ráadásul több más ikon is a "biztosan elérhető" listán kívül volt, ezért a patch nem követte a kötelező ikon-import szabályt.
- **Javítás**: A `House` importot `LayoutDashboard`-ra cseréltem, és a redesign patch összes új Lucide importját átnéztem. Az összes bizonytalan ikont lecseréltem a codingLessonsLearnt-ben felsorolt, biztosan elérhető ikonokra.
- **Megelőzés**: **MINDIG** ellenőrizd a redesign patch összes Lucide importját a `codingLessonsLearnt.md` [HIBA-011] pontja alapján. Új UI csomag kiadása előtt kötelező grep-pel végignézni az összes `from 'lucide-react'` importot, és csak a whitelistelt ikonok maradhatnak.



---

## 🟢 KATEGÓRIA 5: CSS / UI hibák

### [HIBA-012] Admin `.input` class hiányzik
- **Dátum**: 2026-03-30 (v1.1.0)
- **Gyökérok**: Az admin oldalak `.input` CSS class-t használnak az input mezőkhöz, de ez nem volt definiálva a globals.css-ben. A Tailwind nem generálja automatikusan.
- **Javítás**: `.input` class hozzáadása a globals.css-hez explicit CSS-ként.
- **Megelőzés**: Ha egyedi CSS class-t használsz (`.input`, `.status-badge`, `.animate-slide-up`), MINDIG ellenőrizd, hogy definiálva van-e a globals.css-ben.

### [HIBA-013] Admin sidebar mobil nézet — nem jelenik meg
- **Dátum**: 2026-03-30
- **Gyökérok**: A `display: none` `@media(max-width:768px)` felülírta a JavaScript-ből adott `translate-x-0` class-t.
- **Javítás**: CSS override: `.admin-sidebar.translate-x-0 { display: flex !important; }`
- **Megelőzés**: Ha egy elem CSS-ből `display:none`, a JS class hozzáadás NEM elég — `!important` kell a CSS-ben is.

---

### [HIBA-015] Patch-only csomagból kimaradt új supporting fájlak
- **Dátum**: 2026-03-30 (v1.2.1)
- **Fájl**: patch csomag / `src/app/layout.tsx`, `src/app/admin/config/page.tsx`
- **Hibaüzenet**: Build/import hiba, mert az újonnan hivatkozott `@/components/AppShellProviders` és `@/lib/themes` fájlok nem voltak benne a patch-only zipben.
- **Gyökérok**: A patch-only csomagolásnál nem csak a módosított meglévő fájlakat, hanem az újonnan BEVEZETETT supporting fájlokat is csomagolni kell. Ezek kimaradtak.
- **Javítás**: A patch-only csomag listáját úgy kell összeállítani, hogy minden új import célfájlja bekerüljön.
- **Megelőzés**: Patch készítés előtt **MINDIG** futtasd le ezt a checklistet: minden `import '@/...'` útvonalhoz létezik fájl ÉS a zipben is benne van, ha újonnan lett bevezetve.

### [HIBA-016] Design patch buildbiztonság — csak syntax-ellenőrzött fájl csomagolható
- **Dátum**: 2026-03-30 (v1.3.0)
- **Fájl**: összes új / módosított `.tsx` fájl
- **Hibaüzenet**: Potenciális — reszponzív redesign közben könnyű szintaktikai hibát vagy félbehagyott importot hagyni.
- **Gyökérok**: Nagy redesignnál sok fájl változik egyszerre, ezért megnő a hibázás esélye.
- **Javítás**: A patch csomagolás előtt a módosított TS/TSX fájlakat legalább TypeScript parser szinten ellenőrizni kell.
- **Megelőzés**: **MINDIG** legyen build-safety lépés: ha teljes `npm build` nem futtatható, akkor minimum parser/syntax ellenőrzést kell végezni minden módosított TS/TSX fájlra.

### [HIBA-017] Új adatbázis tábla / migráció még nincs fent — UI ne omoljon össze
- **Dátum**: 2026-03-30 (v1.3.0)
- **Fájl**: `src/app/customer/page.tsx`, `src/app/admin/config/page.tsx`, új social/place feature lekérdezések
- **Hibaüzenet**: Potenciális — ha a `place_favorites`, `friendships`, `place_lists`, `app_settings` vagy `reservations` migráció még nincs lefuttatva, a featurelekérdezések hibát dobhatnak.
- **Gyökérok**: A frontend hamarabb kerülhet fel, mint az új migráció.
- **Javítás**: A lekérdezések `maybeSingle()` / `|| []` fallback mintával készültek, és a feature nem auth-kritikus ágon fut.
- **Megelőzés**: **SOHA** ne legyen új opcionális feature táblára épített lekérdezés auth-kritikus vagy page-blocking. Új feature tábla = null-safe, fallbackes, nem-blokkoló betöltés.

## 📋 ELLENŐRZŐ LISTA (Minden commit előtt)

- [ ] Auth-kritikus lekérdezésben NINCS FK JOIN? (profiles select = egyszerű `select('*')`)
- [ ] Minden interface/type property megegyezik az SQL tábla oszlopaival?
- [ ] Supabase `.select()` FK relációk használatánál van `(row: any)` cast?
- [ ] Nincs explicit FK constraint név a Supabase select-ben?
- [ ] Nincs middleware-ben redirect?
- [ ] Auth check `getUser()`-t használ, nem `getSession()`-t?
- [ ] Fájlnevek Next.js konvenciónak megfelelnek (`page.tsx`, `layout.tsx`)?
- [ ] Egyedi CSS class-ok definiálva vannak a globals.css-ben?
- [ ] Lucide ikonok a hivatalos listáról importálva?
- [ ] Minden új import célfájlja benne van a patch-only csomagban?
- [ ] Parser/syntax ellenőrzés lefutott a módosított TS/TSX fájlakon?
- [ ] RLS policy-kban nincs cross-table JOIN más RLS-védett táblára?
- [ ] Új SQL oszlopok esetén a kód `(: any)` castot használ?

---

*Utoljára frissítve: 2026-03-30 — v1.3.0*
*Ez egy FOLYAMATOSAN BŐVÜLŐ fájl. Új hibákat MINDIG appendelj, SOHA ne törölj!*

## ➕ APPEND — 2026-03-31 build hiba kiegészítés

### [HIBA-023] Supabase Edge Function `Deno` globál — Next.js build alatti típushiba
- **Dátum**: 2026-03-31 (v1.3.3)
- **Fájl**: `supabase/functions/place-search/index.ts:110`, `tsconfig.json`
- **Hibaüzenet**: `Type error: Cannot find name 'Deno'.`
- **Gyökérok**: A Next.js root build / TypeScript ellenőrzés belefutott a `supabase/functions/...` alatti Supabase Edge Function fájlba, ami Deno runtime-ra íródott (`Deno.serve(...)`). A Next/Node oldali TypeScript környezet nem ismeri automatikusan a `Deno` globált, ezért a build megállt. A probléma nem a business logika volt, hanem a runtime-keveredés: a Deno-s Edge Function ugyanabban a typecheck körben maradt, mint a Next app.
- **Javítás**:
  1. A root `tsconfig.json` `exclude` listájába bekerült a `supabase/functions/**/*`, így a Next.js build nem typecheckeli a Deno edge functionöket.
  2. A `supabase/functions/place-search/index.ts` fájl tetejére explicit ambient `Deno` deklaráció került, hogy a function önmagában is egyértelműen Deno runtime globálra támaszkodik.
- **Megelőzés**: **SOHA** ne hagyd a Deno runtime-ra írt Supabase Edge Function fájlokat a Next.js root typecheck hatókörében. Node/Next build és Supabase Edge Function typecheck legyen külön kezelve. Új Edge Functionnél azonnal ellenőrizd, hogy a `supabase/functions/**` mappa ki van-e zárva a root `tsconfig.json`-ból.

## 📋 ELLENŐRZŐ LISTA — új buildbiztonsági pontok

- [ ] A `supabase/functions/**` mappa ki van zárva a Next.js root `tsconfig.json` typecheckjéből?
- [ ] A Deno runtime-os Edge Function saját runtime deklarációval vagy típussal rendelkezik?
- [ ] A Supabase Edge Function ellenőrzése külön történik a Next app buildtől?


## 🟣 KATEGÓRIA 6: Supabase Edge Functions / Deno / Deploy

### [HIBA-023] Next.js build beletípusellenőrzi a Supabase Edge Functionöket → `Cannot find name 'Deno'`
- **Dátum**: 2026-03-31 (internetes gyűjtés)
- **Fájl**: `supabase/functions/**` + `tsconfig.json` (Next.js)
- **Hibaüzenet**: `Type error: Cannot find name 'Deno'.` (vagy: `Cannot find module 'https://deno.land/...' or its corresponding type declarations.`)
- **Gyökérok**: A Next.js `next build` TypeScript lépése a repo-ban lévő `.ts/.tsx` fájlokat a saját `tsconfig.json` szerint típusellenőrzi. A Supabase Edge Functionök viszont Deno kompatibilis runtime-ra készülnek (Deno globálokkal, import map-pel / URL-es importokkal), ezért a Node/Next TypeScript környezetben a `Deno.*` és a Deno-specifikus importok ismeretlenek → build blokkol.
- **Javítás**:
  1. Zárd ki a Deno-s Edge Function könyvtárat a Next TypeScript buildből (és garantáld, hogy a Next app _nem importál_ közvetlenül `supabase/functions/**` alól):
     ```json
     // tsconfig.json
     {
       "exclude": [
         "node_modules",
         "supabase/functions/**/*"
       ]
     }
     ```
  2. Az Edge Function fájlok tetején add hozzá a Supabase Edge Runtime típusdefiníciókat (editor support + Deno globálok):
     ```ts
     // supabase/functions/<fn>/index.ts
     import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
     ```
  3. VSCode-ban engedélyezd a Deno language servert csak a `supabase/functions` folderre (ne az egész workspace-re), hogy ne ütközzön a Next-es TS szerverrel:
     ```json
     // .vscode/settings.json
     {
       "deno.enablePaths": ["./supabase/functions"],
       "deno.importMap": "./supabase/functions/import_map.json"
     }
     ```
- **Megelőzés**:
  - Monorepo (Next + Deno) esetén különítsd el a type-check környezeteket: Next build = Node/TS, Edge Functions = Deno (külön ellenőrzés: `supabase functions serve` / Deno check).
  - Checklist:
    - [ ] `supabase/functions/**` ki van zárva a Next `tsconfig.json`-ből?
    - [ ] Minden Edge Function tetején ott van az `edge-runtime.d.ts` import?
    - [ ] A Deno VSCode extension csak a `supabase/functions` útvonalon fut?

- **Források**:
  - https://supabase.com/docs/guides/functions/development-environment
  - https://supabase.com/docs/guides/functions/auth
  - https://github.com/orgs/supabase/discussions/22470
  - https://jsr.io/@supabase/functions-js/doc/edge-runtime.d.ts/
  - https://www.typescriptlang.org/tsconfig#exclude

### [HIBA-024] Next.js Edge Runtime / middleware: Node modul import → build/runtime crash
- **Dátum**: 2026-03-31 (internetes gyűjtés)
- **Fájl**: `middleware.ts` (és bármely Edge runtime-ban futó Route Handler/Proxy)
- **Hibaüzenet**: `Error: The edge runtime does not support Node.js 'crypto' module` (és hasonló: `fs`, `child_process`, `process` stb.)
- **Gyökérok**: A Next.js middleware és az Edge Runtime környezet nem támogat natív Node.js API-kat és globálokat. Ha middleware-ben vagy Edge runtime-os route-ban Node-only csomag (vagy transzitív Node import) jelenik meg, a build vagy a futásidő elhasal.
- **Javítás**:
  1. Middleware-ben csak Web API-kompatibilis kód legyen (pl. `fetch`, Web Crypto API).
  2. Node-only logikát (fájlkezelés, Node crypto, child_process, stb.) vidd át Node runtime-ágnak megfelelő helyre (pl. Server Action / Node runtime-os Route Handler), és a middleware maradjon minimális (routing, header/cookie kezelés).
- **Megelőzés**:
  - Checklist:
    - [ ] `middleware.ts` nem importál Node modulokat (`crypto`, `fs`, `path`, `child_process`...)?
    - [ ] Edge runtime-ban használt dependency-k ESM kompatibilisek és nem használnak natív Node API-kat?

- **Források**:
  - https://nextjs.org/docs/messages/node-module-in-edge-runtime
  - https://nextjs.org/docs/app/api-reference/edge
  - https://vercel.com/docs/functions/runtimes/edge

### [HIBA-025] Supabase Edge Function hívás böngészőből: CORS preflight (OPTIONS) hiánya
- **Dátum**: 2026-03-31 (internetes gyűjtés)
- **Fájl**: `supabase/functions/<fn>/index.ts`
- **Hibaüzenet**: Böngésző konzol: `blocked by CORS policy` / `Response to preflight request doesn't pass access control check` / `No 'Access-Control-Allow-Origin' header...`
- **Gyökérok**: Böngészőből hívott Edge Function esetén a CORS preflight (OPTIONS) kérés kötelező. Ha a function nem kezeli az OPTIONS-t, vagy nem adja vissza a szükséges `Access-Control-Allow-*` headereket (különösen `authorization, x-client-info, apikey, content-type`), a böngésző blokkolja a hívást, még akkor is, ha a function logikája egyébként helyes.
- **Javítás**:
  1. **Ajánlott (supabase-js v2.95.0+)**: használd a `corsHeaders` exportot, hogy mindig szinkronban legyen a kliens által küldött headerekkel:
     ```ts
     import { corsHeaders } from '@supabase/supabase-js/cors'

     Deno.serve(async (req) => {
       if (req.method === 'OPTIONS') {
         return new Response('ok', { headers: corsHeaders })
       }

       // ...logic...

       return new Response(JSON.stringify({ ok: true }), {
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
         status: 200,
       })
     })
     ```
  2. Régebbi supabase-js verziónál `_shared/cors.ts` file-ba tedd a `corsHeaders` objektumot, és importáld.
- **Megelőzés**:
  - Checklist:
    - [ ] Minden browserből hívható Edge Function kezeli az OPTIONS preflightot?
    - [ ] A response minden ágon tartalmazza a CORS headereket (success + error is)?

- **Források**:
  - https://supabase.com/docs/guides/functions/cors
  - https://supabase.com/docs/guides/troubleshooting/unable-to-call-edge-function

### [HIBA-026] Edge Functionben hiányzó env var / secret: `Deno.env.get()` → `undefined` productionban
- **Dátum**: 2026-03-31 (internetes gyűjtés)
- **Fájl**: `supabase/functions/<fn>/index.ts` + Supabase secrets (Dashboard/CLI)
- **Hibaüzenet**: 500 / runtime exception (pl. hiányzó API key), vagy logban: `undefined` / `null` értékek a `Deno.env.get('...')` hívásnál
- **Gyökérok**: Lokálisan működik (mert `.env` jelen van), de deploy után a secret nincs beállítva a Supabase projectben. Edge Functions-ben a production env varokat külön kell felvenni (Dashboard vagy `supabase secrets set`). Lokálisan sem mindegy, hogy hova kerül az `.env` (alapértelmezett: `supabase/functions/.env`, vagy explicit `--env-file`).
- **Javítás**:
  1. Lokális fejlesztés: használj `supabase/functions/.env` fájlt **vagy** indításkor explicit env file-t:
     ```bash
     supabase functions serve <fn> --env-file .env.local
     ```
  2. Production: secrets feltöltése Dashboardon vagy CLI-vel:
     ```bash
     supabase secrets set --env-file .env
     # vagy egyenként:
     supabase secrets set STRIPE_SECRET_KEY=...
     ```
  3. A function elején *fail fast* ellenőrzés (hogy a hiba azonnal, érthetően derüljön ki):
     ```ts
     const KEY = Deno.env.get('STRIPE_SECRET_KEY')
     if (!KEY) return new Response('Missing STRIPE_SECRET_KEY', { status: 500 })
     ```
- **Megelőzés**:
  - Checklist:
    - [ ] Secrets be vannak állítva a Supabase Dashboard/CLI-ban, nem csak lokális `.env`-ben?
    - [ ] `.env` file-ok gitignore-ban vannak?
    - [ ] A kritikus secret-ekre van `fail fast` ellenőrzés?

- **Források**:
  - https://supabase.com/docs/guides/functions/secrets
  - https://supabase.com/docs/guides/functions/deploy

### [HIBA-027] Edge Function 401 „Invalid JWT / Missing authorization header” még a kód futása előtt
- **Dátum**: 2026-03-31 (internetes gyűjtés)
- **Fájl**: Supabase Edge Function platform beállítás (`verify_jwt`) + `supabase/config.toml` + invokáció (client/fetch/cURL)
- **Hibaüzenet**: `{ "code": 401, "message": "Invalid JWT" }` vagy `{ "code": 401, "message": "Missing authorization header" }` (a function logban sokszor SEMMI, mert a kód meg sem fut)
- **Gyökérok**:
  - A Supabase Edge Functions-ben van egy built-in (legacy) JWT ellenőrzés, ami a function kód futása előtt történik. Ha az Authorization header hiányzik, a token lejárt/hibás, vagy a projekt már az új (aszimmetrikus) kulcsokra váltott, a legacy ellenőrzés elbukik és 401-et ad vissza.
  - Új API key modellnél (publishable/secret `sb_...`) a legacy JWT ellenőrzés nem mindig kompatibilis, ezért a beépített check letiltása és saját auth implementáció javasolt.
- **Javítás**:
  1. Ha a functionnek **kell** auth: ellenőrizd, hogy a hívásban tényleg van `Authorization: Bearer <token>` (Supabase kliens általában automatikusan adja).
  2. Ha webhook/public endpoint vagy új kulcsmigráció miatt **nem** használható legacy JWT check:
     - Kapcsold ki a built-in ellenőrzést function szinten:
       ```toml
       # supabase/config.toml
       [functions.<fn>]
       verify_jwt = false
       ```
       vagy deploy-nál:
       ```bash
       supabase functions deploy <fn> --no-verify-jwt
       ```
     - Implementálj auth-ot a functionben (pl. Supabase Auth `getClaims(token)` / vagy jose JWKS validáció template alapján).
- **Megelőzés**:
  - Checklist:
    - [ ] Minden Edge Functionnél tudatos döntés: `verify_jwt` ON vagy OFF?
    - [ ] Ha OFF: a function saját auth middleware-t tartalmaz (API key / JWT verify / signature verify)?
    - [ ] 401 esetén első lépés: response body alapján eldönteni, hogy platform adta-e (legacy check), vagy a saját kód.

- **Források**:
  - https://supabase.com/docs/guides/troubleshooting/edge-function-401-error-response
  - https://supabase.com/docs/guides/functions/function-configuration
  - https://supabase.com/docs/guides/functions/deploy
  - https://supabase.com/docs/guides/functions/auth
  - https://supabase.com/docs/guides/api/api-keys

### [HIBA-028] Service role / secret key véletlen kiexportálása a böngészőbe (NEXT_PUBLIC + bundle inline)
- **Dátum**: 2026-03-31 (internetes gyűjtés)
- **Fájl**: `.env*`, `next.config.*`, bármely kliens oldali (`"use client"`) komponens, illetve minden böngészőbe bundle-ölt kód
- **Hibaüzenet**: Nincs „klasszikus” build error — a hiba általában security incident formájában derül ki. Tipikus jel: a kulcs megtalálható a böngésző bundle-ben / DevToolsban.
- **Gyökérok**:
  - Next.js-ben a `NEXT_PUBLIC_` prefixű env varok „beégetődnek” a kliens bundle-be `next build` során.
  - A Supabase `service_role` / secret key teljes hozzáférést ad és BYPASSRLS-sel működik, ezért publikusan sosem kerülhet ki.
- **Javítás**:
  1. Soha ne használj `NEXT_PUBLIC_` prefixet sem `SERVICE_ROLE`, sem `SB_SECRET`, sem egyéb admin kulcs esetén.
  2. Admin műveletek (pl. `supabase.auth.admin.*`, RLS bypass) kizárólag szerver-oldali környezetben (Edge Function, Server Action, backend) futhatnak.
- **Megelőzés**:
  - Checklist:
    - [ ] Nincs `NEXT_PUBLIC_*` env varban admin/service_role/secret key?
    - [ ] `service_role` / secret key csak szerveren használódik (Edge Functions / backend), sosem böngészőben?
    - [ ] Build artifact ellenőrzés: grep a bundle-ben `sb_secret_` / `service_role` mintákra.

- **Források**:
  - https://nextjs.org/docs/pages/guides/environment-variables
  - https://supabase.com/docs/guides/api/api-keys
  - https://supabase.com/docs/guides/database/secure-data

### [HIBA-029] SSR + token refresh + CDN cache: rossz token „kiszivárog” cache-elt `Set-Cookie` válaszon
- **Dátum**: 2026-03-31 (internetes gyűjtés)
- **Fájl**: `lib/supabase/*` (SSR kliens), proxy/middleware/session refresh réteg, CDN/hosting beállítások
- **Hibaüzenet**: Ritka, de kritikus: másik felhasználó sessionével „bejelentkezett” állapot / össze-vissza auth állapotok, főleg CDN/ISR környezetben.
- **Gyökérok**: Ha SSR közben session refresh történik, a frissített token `Set-Cookie` headerben megy ki. Ha ezt a választ CDN cache-eli (és másik usernek adja), a másik user böngészője eltárolja a rossz tokent → account mix-up.
- **Javítás**:
  1. `@supabase/ssr` használata esetén a `setAll` callbackből kapott cache headereket alkalmazd a response-on (a library v0.10.0+ automatikusan küldi a szükséges `Cache-Control/Expires/Pragma` headereket token refresh esetén).
  2. Auth-kritikus route-ok legyenek cache-mentesek (CDN oldalon is): `Cache-Control: no-store` / `private` jellegű beállítások.
  3. Page/route szinten kerüld az ISR-t ott, ahol `Set-Cookie` előfordulhat.
- **Megelőzés**:
  - Checklist:
    - [ ] Session refresh válaszok **nem** cache-elődnek (CDN/ISR tiltva)?
    - [ ] `@supabase/ssr` `setAll` cache headereit ténylegesen beállítod a response-on?
    - [ ] Auth védelemhez a server oldalon `getClaims()` (nem `getSession()`) jellegű, validált megoldás van?

- **Források**:
  - https://supabase.com/docs/guides/auth/server-side/creating-a-client
  - https://supabase.com/docs/guides/auth/server-side/advanced-guide





### [HIBA-030] Venue finder keresőmező nincs összekötve a discovery state-tel
- **Dátum**: 2026-03-31 (v1.3.4)
- **Fájl**: `src/app/customer/page.tsx`, `src/components/PlaceAutocomplete.tsx`
- **Hibaüzenet**: Funkcionális hiba — a felhasználó beírta a keresett várost/címet, de a "Keresés frissítése" gomb mégis üres queryvel futott le, ezért nem jöttek venue találatok.
- **Gyökérok**: A `PlaceAutocomplete` belső lokális state-ben tartotta a beírt szöveget, miközben a parent `runDiscover()` a külön `query` state-et használta. A kettő nem volt összekötve, ezért a discovery lekérdezés nem azt a szöveget kapta, amit a user látott az inputban.
- **Javítás**: A `PlaceAutocomplete` controlled input támogatást kapott (`value`, `onChange`, `onSubmit`), és a venue finder parent `query` state-jére lett kötve.
- **Megelőzés**: Kereső inputnál **MINDIG** ellenőrizd, hogy ugyanazt a state-et látja-e a UI és a végrehajtott lekérdezés. Ha a parent indítja a keresést, az input értéke is parent-owned state legyen.

### [HIBA-031] Redesign regresszió — a működő étlap entry point vizuálisan eltűnt
- **Dátum**: 2026-03-31 (v1.3.4)
- **Fájl**: `src/app/customer/page.tsx`
- **Hibaüzenet**: Funkcionális regresszió — a digitális étlap technikailag megmaradt a venue oldalon, de a vendégoldalról eltűnt a jól látható belépési pont, ezért a user úgy érzékelte, hogy az étlap funkció megszűnt.
- **Gyökérok**: A redesign túlzottan a venue discovery flow-ra helyezte a hangsúlyt, és közben a már működő, üzletileg kritikus `étlap` CTA nem maradt hangsúlyos. Ez sérti a legfontosabb szabályt: működő funkciót nem szabad regresszióval elrejteni.
- **Javítás**: Visszakerült külön `Digitális étlap` CTA a főoldalra, a venue listakártyákra és a részletes helynézetbe.
- **Megelőzés**: Redesign átadás előtt kötelező regressziós UX checklist: minden korábbi elsődleges CTA (`Étlap`, `Rendelés`, `QR`, `Foglalás`) továbbra is egyértelműen látható és legfeljebb 1-2 kattintással elérhető.

---

*Utoljára frissítve: 2026-03-31 — v1.3.4*
*Ez egy FOLYAMATOSAN BŐVÜLŐ fájl. Új hibákat MINDIG appendelj, SOHA ne törölj!*