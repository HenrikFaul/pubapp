# Kapakka — PubApp

A vendéglátóhelyek digitális kiszolgáló rendszere. QR-kódos rendelés, valós idejű admin panel, kocsmakvíz játék.

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Realtime + Auth)
- **Hosting**: Vercel
- **Maps**: AWS Location Services

## Funkciók

### 👤 Vendég oldal
- Helyszín kereső (geolokáció + szöveges keresés)
- QR kód szkennelés (asztal azonosítás)
- Étlap megtekintés és rendelés leadás
- Valós idejű rendeléskövetés
- Kocsmakvíz és játékok
- Hűségpontok

### 🍺 Admin / Vendéglős oldal
- Valós idejű rendeléskezelés (Kiszolgálás panel)
- Étlapkezelés (termékek, kategóriák, képek)
- Készletkezelés és figyelmeztetések
- Statisztikák és riportok
- Konfigurátor (nyitvatartás, fizetési módok, asztalok, QR kódok)
- Munkatárs kezelés

## Telepítés

```bash
npm install
cp .env.local.example .env.local
# Töltsd ki az env változókat
npm run dev
```

## Supabase konfiguráció

Futtasd a `supabase/migrations/001_initial_schema.sql` fájlt a Supabase SQL editorban.

## Deploy (Vercel)

```bash
vercel
```

A Vercel dashboard-on add hozzá a környezeti változókat:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_AWS_LOCATION_API_KEY`

## Projekt struktúra

```
src/
├── app/
│   ├── page.tsx              # Landing / Login oldal
│   ├── customer/             # Vendég oldal
│   │   ├── page.tsx          # Főoldal (helyszín kereső)
│   │   ├── pub/[id]/         # Helyszín részletek + rendelés
│   │   ├── orders/[id]/      # Rendeléskövetés
│   │   ├── scan/             # QR szkennelő
│   │   └── games/quiz/       # Kocsmakvíz
│   └── admin/                # Admin panel
│       ├── layout.tsx         # Sidebar layout
│       ├── page.tsx           # Kiszolgálás (live orders)
│       ├── orders/            # Rendelések listája
│       ├── menu/              # Étlapkezelés
│       ├── inventory/         # Készletkezelés
│       ├── stats/             # Statisztikák
│       ├── config/            # Konfigurátor
│       └── help/              # Segítség
├── lib/
│   ├── supabase.ts           # Supabase kliens
│   └── utils.ts              # Segédfüggvények
└── types/
    └── index.ts              # TypeScript típusok
```
