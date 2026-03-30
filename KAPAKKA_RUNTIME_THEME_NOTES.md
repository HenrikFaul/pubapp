# Kapakka runtime design csomag

Ez a csomag már úgy van összerakva, hogy a zip tartalma közvetlenül a repo **gyökérkönyvtárába** bontható ki.
Nincs külön külső mappa, ezért nem kell kézzel másolgatni a fájlokat.

## Fő változás
- 4 választható design téma
- adminból váltható: `/admin/config` → `Design`
- redeploy nélkül érvényesül
- új Supabase migráció: `supabase/migrations/002_theme_settings.sql`

## Fontos
A runtime váltás per alkalmazás történik az `app_settings` táblán keresztül.
