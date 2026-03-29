import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: This refreshes the session cookie. Don't remove.
  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // ─── RULE 1: Protect /customer and /admin from unauthenticated users ───
  if (!user && (path.startsWith('/customer') || path.startsWith('/admin'))) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // ─── RULE 2: If logged in and on /, redirect based on role ───
  // This is the ONLY role-based redirect in middleware.
  // It prevents the landing page from flashing for logged-in users.
  if (user && path === '/') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role || (user.user_metadata?.role as string) || 'customer'

    if (['admin', 'staff', 'superadmin'].includes(role)) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
    return NextResponse.redirect(new URL('/customer', request.url))
  }

  // ─── RULE 3: Don't do role-based routing for /admin or /customer ───
  // Let the client-side code handle role mismatches.
  // This prevents redirect loops between middleware and client.

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
