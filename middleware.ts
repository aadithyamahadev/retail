import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

type CounterState = {
  count: number
  resetAt: number
}

const RATE_LIMIT_WINDOW_MS = 60_000
const counters = new Map<string, CounterState>()

function getRateLimit(pathname: string) {
  if (pathname.startsWith('/api/photo-mode')) {
    return 12
  }

  if (pathname.startsWith('/api/billing-mode')) {
    return 20
  }

  if (pathname.startsWith('/api/analytics')) {
    return 40
  }

  return 100
}

function applySecurityHeaders(response: NextResponse) {
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin')
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: blob:; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  )
}

function isRateLimited(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const key = `${ip}:${request.nextUrl.pathname}`
  const now = Date.now()
  const maxRequests = getRateLimit(request.nextUrl.pathname)

  const current = counters.get(key)
  if (!current || now > current.resetAt) {
    counters.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  if (current.count >= maxRequests) {
    return true
  }

  current.count += 1
  counters.set(key, current)
  return false
}

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    if (isRateLimited(request)) {
      const response = NextResponse.json({ success: false, error: 'Too many requests.' }, { status: 429 })
      applySecurityHeaders(response)
      return response
    }
  }

  const response = NextResponse.next()
  applySecurityHeaders(response)
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
