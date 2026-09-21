import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import type { JWTPayload } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET!;
const COOKIE_NAME = 'smmo_token';

const PUBLIC_PATHS = ['/login', '/setup', '/api/auth/login', '/api/setup'];

const CEO_ONLY_PATHS = [
  '/payments',
  '/finance',
  '/bookings',
  '/reports',
  '/workers',
  '/documents',
  '/api/reports',
  '/api/agreements',
];
// Note: '/api/billing/*' (the payments backend) and '/api/finance/*' are
// intentionally NOT listed here — their handlers already enforce CEO-only
// (or CEO/CLIENT-with-ownership) access themselves, and CLIENT needs to
// reach parts of '/api/billing' for its own payments. See each route.
// '/api/users' is intentionally NOT in CEO_ONLY_PATHS: the route handlers
// themselves already enforce "CEO, or self" (see /api/users/[id]/route.ts),
// so every role needs at least self-service access (e.g. changing your own
// password from Settings/Account) — the handler is the real authorization
// boundary here, not this coarse path gate.

function matchesPath(pathname: string, paths: string[]): boolean {
  return paths.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

function dashboardFor(role: JWTPayload['role']): string {
  if (role === 'CEO') return '/dashboard';
  if (role === 'CLIENT') return '/client/dashboard';
  return '/worker/dashboard';
}

// CLIENT is a financial-data role connected to exactly one Client record, so
// unlike WORKER (default-allow API, deny a short CEO-only list) it gets a
// default-DENY allowlist: only these API families can ever be reached, and
// every one of them re-checks clientId ownership itself (see e.g.
// /api/clients/[id]/route.ts, /api/billing/payments/route.ts) so a CLIENT can
// never read or act on another client's data even with a crafted URL.
const CLIENT_ALLOWED_API_PREFIXES = ['/api/auth', '/api/users', '/api/clients', '/api/billing', '/api/content', '/api/bookings'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  if (matchesPath(pathname, PUBLIC_PATHS)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const secretKey = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secretKey);
    const user = payload as unknown as JWTPayload;

    if (pathname === '/login' || pathname === '/') {
      return NextResponse.redirect(new URL(dashboardFor(user.role), request.url));
    }

    if (user.role === 'WORKER') {
      const isWorkerPath = pathname.startsWith('/worker/');
      const isSharedApi =
        pathname.startsWith('/api/tasks') ||
        pathname.startsWith('/api/clients') ||
        pathname.startsWith('/api/boards') ||
        pathname.startsWith('/api/content') ||
        pathname.startsWith('/api/auth');
      const isCeoOnlyPath = matchesPath(pathname, CEO_ONLY_PATHS);

      if (isCeoOnlyPath) {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        return NextResponse.redirect(new URL('/worker/dashboard', request.url));
      }

      // Note: '/client/...' pages are already caught here too, since they're
      // neither a worker page nor an API path — no separate check needed.
      if (!isWorkerPath && !isSharedApi && !pathname.startsWith('/api/')) {
        return NextResponse.redirect(new URL('/worker/dashboard', request.url));
      }
    }

    if (user.role === 'CLIENT') {
      const isClientPath = pathname.startsWith('/client/');

      if (pathname.startsWith('/api/')) {
        const isAllowed = CLIENT_ALLOWED_API_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
        if (!isAllowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        return NextResponse.next();
      }

      if (!isClientPath) {
        return NextResponse.redirect(new URL('/client/dashboard', request.url));
      }
    }

    if (user.role === 'CEO' && (pathname.startsWith('/worker/') || pathname.startsWith('/client/'))) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
}

// Next.js 16 requires the named `proxy` export (used by the middleware template).
// The default export is also provided for backwards compatibility with next-server's
// Node.js middleware loading path which calls: adapterFn = middlewareModule.default || middlewareModule
export default proxy;

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
