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

function applySecurityHeaders(response: NextResponse, isApiRoute: boolean) {
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  
  // Only apply strict CORP/COOP on API routes - these can break Vercel's CDN for page assets
  if (isApiRoute) {
    response.headers.set('Cross-Origin-Resource-Policy', 'same-origin')
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  }
  
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: blob: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
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
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/')
  
  if (isApiRoute) {
    if (isRateLimited(request)) {
      const response = NextResponse.json({ success: false, error: 'Too many requests.' }, { status: 429 })
      applySecurityHeaders(response, true)
      return response
    }
  }

  const response = NextResponse.next()
  applySecurityHeaders(response, isApiRoute)
  return response
}

export const config = {
  matcher: ['/api/:path*'],
}
