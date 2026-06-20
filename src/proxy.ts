import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import type { JWTPayload } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET!;
const COOKIE_NAME = 'smmo_token';

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/seed'];

const CEO_ONLY_PATHS = [
  '/payments',
  '/reports',
  '/workers',
  '/documents',
  '/api/payments',
  '/api/reports',
  '/api/users',
  '/api/agreements',
];

function matchesPath(pathname: string, paths: string[]): boolean {
  return paths.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

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

    if (pathname === '/login') {
      const redirectTo = user.role === 'CEO' ? '/dashboard' : '/worker/dashboard';
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }

    if (pathname === '/') {
      const redirectTo = user.role === 'CEO' ? '/dashboard' : '/worker/dashboard';
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }

    if (user.role === 'WORKER') {
      const isWorkerPath = pathname.startsWith('/worker/');
      const isSharedApi = pathname.startsWith('/api/tasks') || pathname.startsWith('/api/clients') || pathname.startsWith('/api/boards') || pathname.startsWith('/api/content') || pathname.startsWith('/api/auth');
      const isCeoOnlyPath = matchesPath(pathname, CEO_ONLY_PATHS);

      if (isCeoOnlyPath) {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        return NextResponse.redirect(new URL('/worker/dashboard', request.url));
      }

      if (!isWorkerPath && !isSharedApi && !pathname.startsWith('/api/')) {
        return NextResponse.redirect(new URL('/worker/dashboard', request.url));
      }
    }

    if (user.role === 'CEO' && pathname.startsWith('/worker/')) {
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

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
