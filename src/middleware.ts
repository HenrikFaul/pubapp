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

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  if (!user && (path.startsWith('/customer') || path.startsWith('/admin'))) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (user) {
    if (path === '/') {
      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()
      const role = profile?.role || (user.user_metadata?.role as string) || 'customer'
      if (['admin','staff','superadmin'].includes(role))
        return NextResponse.redirect(new URL('/admin', request.url))
      return NextResponse.redirect(new URL('/customer', request.url))
    }

    if (path.startsWith('/customer')) {
      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()
      const role = profile?.role || (user.user_metadata?.role as string) || 'customer'
      if (['admin','staff','superadmin'].includes(role))
        return NextResponse.redirect(new URL('/admin', request.url))
    }

    if (path.startsWith('/admin') && !path.startsWith('/admin/setup')) {
      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()
      const role = profile?.role || (user.user_metadata?.role as string) || 'customer'
      if (!['admin','staff','superadmin'].includes(role))
        return NextResponse.redirect(new URL('/customer', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
