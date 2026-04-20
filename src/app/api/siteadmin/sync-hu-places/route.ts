import { NextResponse } from 'next/server'
import { createHmac } from 'crypto'

function withSlashTrimmed(url: string) {
  return url.replace(/\/+$/, '')
}

function base64UrlEncode(value: string) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function decodeJwtHeader(token: string): Record<string, any> | null {
  const [headerPart] = token.split('.')
  if (!headerPart) return null
  try {
    const normalized = headerPart.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'))
  } catch {
    return null
  }
}

function inferProjectRef(supabaseUrl: string) {
  try {
    const host = new URL(supabaseUrl).hostname
    return host.split('.')[0] || null
  } catch {
    return null
  }
}

function signLegacyServiceRoleJwt(projectRef: string, jwtSecret: string) {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'HS256', typ: 'JWT' }
  const payload = {
    iss: 'supabase',
    ref: projectRef,
    role: 'service_role',
    iat: now,
    exp: now + 60 * 60,
  }

  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const signingInput = `${encodedHeader}.${encodedPayload}`
  const signature = createHmac('sha256', jwtSecret)
    .update(signingInput)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')

  return `${signingInput}.${signature}`
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const legacyAnonJwt = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const legacyJwtSecret = process.env.SUPABASE_LEGACY_JWT_SECRET
  const explicitProjectRef = process.env.SUPABASE_PROJECT_REF

  let authKey = serviceRoleKey || legacyAnonJwt

  if (!supabaseUrl) {
    return NextResponse.json(
      { error: 'Hiányzó NEXT_PUBLIC_SUPABASE_URL környezeti változó.' },
      { status: 500 }
    )
  }

  const projectRef = explicitProjectRef || inferProjectRef(supabaseUrl)

  if (!authKey && legacyJwtSecret && projectRef) {
    authKey = signLegacyServiceRoleJwt(projectRef, legacyJwtSecret)
  }

  if (!authKey) {
    return NextResponse.json(
      {
        error:
          'Hiányzó hitelesítő kulcs. Állítsd be a SUPABASE_SERVICE_ROLE_KEY-t (legacy JWT), vagy add meg a SUPABASE_LEGACY_JWT_SECRET + SUPABASE_PROJECT_REF env-eket.',
      },
      { status: 500 }
    )
  }

  if (!authKey.startsWith('eyJ')) {
    return NextResponse.json(
      {
        error:
          'A sync proxy JWT alapú kulcsot vár (pl. legacy service_role kulcs). A publishable/sb_* kulcsok nem használhatók Authorization Bearer tokenként.',
      },
      { status: 500 }
    )
  }

  const jwtHeader = decodeJwtHeader(authKey)
  if (!jwtHeader?.alg || jwtHeader.alg !== 'HS256') {
    return NextResponse.json(
      {
        error:
          'A megadott JWT kulcs algoritmusa nem HS256. Edge Function híváshoz legacy JWT (HS256) szükséges. Használd a legacy service_role key-t vagy a SUPABASE_LEGACY_JWT_SECRET-et.',
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
