import { NextResponse } from 'next/server'

function withSlashTrimmed(url: string) {
  return url.replace(/\/+$/, '')
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const legacyAnonJwt = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const authKey = serviceRoleKey || legacyAnonJwt

  if (!supabaseUrl || !authKey) {
    return NextResponse.json(
      { error: 'Hiányzó NEXT_PUBLIC_SUPABASE_URL és/vagy SUPABASE_SERVICE_ROLE_KEY környezeti változó.' },
      { status: 500 }
    )
  }

  if (!authKey.startsWith('eyJ')) {
    return NextResponse.json(
      {
        error:
          'A sync proxy JWT alapú kulcsot vár (pl. SUPABASE_SERVICE_ROLE_KEY). A publishable/sb_* kulcsok nem használhatók Authorization Bearer tokenként.',
      },
      { status: 500 }
    )
  }

  let reason = 'common-admin-manual'
  try {
    const body = await request.json().catch(() => ({}))
    if (typeof body?.reason === 'string' && body.reason.trim()) {
      reason = body.reason.trim()
    }
  } catch {
    // marad az alapértelmezett reason
  }

  const endpoint = `${withSlashTrimmed(supabaseUrl)}/functions/v1/sync-hu-places`

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authKey}`,
      apikey: authKey,
    },
    body: JSON.stringify({ reason }),
    cache: 'no-store',
  })

  const text = await response.text()
  let payload: any = null
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    payload = text
  }

  if (!response.ok) {
    if (payload?.code === 'UNAUTHORIZED_UNSUPPORTED_TOKEN_ALGORITHM') {
      return NextResponse.json(
        {
          error:
            'A Supabase Edge Function JWT token algoritmus hibát adott (ES256). Állíts be HS256 JWT kulcsot a szerveroldali env-ben: SUPABASE_SERVICE_ROLE_KEY.',
          details: payload,
        },
        { status: 401 }
      )
    }

    if (response.status === 404) {
      return NextResponse.json(
        {
          error:
            'A sync-hu-places Edge Function nem található a Supabase projektben. Deployold a függvényt: `supabase functions deploy sync-hu-places`.',
          details: payload,
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        error: 'A sync-hu-places futtatása sikertelen.',
        status: response.status,
        details: payload,
      },
      { status: response.status }
    )
  }

  return NextResponse.json({
    ok: true,
    data: payload,
  })
}
