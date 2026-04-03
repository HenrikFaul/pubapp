export interface CommonAdminHostRow { label: string; value: string; description: string; }
export interface CommonAdminIntegrationGroup { title: string; providers: Array<{ name: string; detail: string; active: boolean }>; }
export interface CommonAdminReleaseSnapshot { version: string; deployedAt: string; delivered: string[]; notes: string; }

export const COMMON_ADMIN_HOSTS: CommonAdminHostRow[] = [
  { label: 'Adatbázis', value: 'Supabase Postgres', description: 'venues, orders, profiles, local place catalog, realtime.' },
  { label: 'Backend', value: 'Supabase Edge Functions', description: 'place-search, sync-hu-places és egyéb szerveroldali rutinok.' },
  { label: 'Domain / frontend', value: 'Next.js web app hosting', description: 'Publikus app domain + admin felület hosting.' },
];

export const COMMON_ADMIN_INTEGRATIONS: CommonAdminIntegrationGroup[] = [
  { title: 'Hely / cím provider stack', providers: [
    { name: 'Lokális Hungary catalog', detail: 'elsődleges local-first venue finder', active: true },
    { name: 'Geoapify', detail: 'bootstrap / enrichment fallback', active: true },
    { name: 'TomTom', detail: 'bootstrap / enrichment fallback', active: true },
    { name: 'AWS Location', detail: 'környezeti szinten jelen van, de a jelenlegi main keresőútban nem aktív provider', active: false },
  ]},
  { title: 'Üzemi külső szolgáltatók', providers: [
    { name: 'Supabase Auth / Realtime', detail: 'auth, DB, realtime értesítés', active: true },
    { name: 'QR / PWA runtime', detail: 'table scan és web app shell', active: true },
  ]},
];

export const COMMON_ADMIN_RELEASE: CommonAdminReleaseSnapshot = {
  version: '1.4.1',
  deployedAt: 'Deployment ideje environment vagy release pipeline alapján ellenőrizendő',
  delivered: [
    'Hungary local-first venue catalog és sync',
    'Venue finder regressziófixek és menük visszaállítása',
    'Admin konfigurátor és runtime theme kezelés',
    'Common Admin inventory és release panel baseline',
  ],
  notes: 'A lista a helyi changelog alapján készült rövid összefoglaló.',
};
