import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { isSessionIdleExpired } from './lib/session-timeout';

function redirectTo(request: NextRequest, pathname: string, callbackPath?: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = callbackPath ? `callbackUrl=${encodeURIComponent(callbackPath)}` : '';
  return NextResponse.redirect(url);
}

function portalHome(role: unknown) {
  if (role === 'supervisor') return '/supervisor';
  if (role === 'reviewer') return '/reviewer';
  if (role === 'viewer') return '/viewer';
  if (role === 'admin' || role === 'super_admin') return '/admin';
  return '/applications';
}

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const { pathname, search } = request.nextUrl;
  const callbackPath = `${pathname}${search}`;
  const hasInvalidSession = !token || token.sessionInvalid || isSessionIdleExpired(token.lastActiveAt);
  const mustChangePassword = Boolean(token?.passwordChangeRequired) && ['reviewer', 'supervisor'].includes(String(token?.role ?? ''));

  if (pathname === '/change-password') {
    if (hasInvalidSession) {
      return redirectTo(request, '/signin', callbackPath);
    }
    if (!mustChangePassword) {
      return redirectTo(request, portalHome(token.role));
    }
    return NextResponse.next();
  }

  if (pathname === '/admin/login') {
    if (!hasInvalidSession && (token?.role === 'admin' || token?.role === 'super_admin')) {
      return redirectTo(request, '/admin');
    }
    return redirectTo(request, '/signin', callbackPath);
  }

  if (pathname.startsWith('/admin')) {
    if (hasInvalidSession) {
      return redirectTo(request, '/signin', callbackPath);
    }
    if (token.role !== 'admin' && token.role !== 'super_admin') {
      return redirectTo(request, portalHome(token.role));
    }
    if (mustChangePassword) {
      return redirectTo(request, '/change-password', callbackPath);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/viewer')) {
    if (hasInvalidSession) {
      return redirectTo(request, '/signin', callbackPath);
    }
    if (token.role !== 'viewer') {
      return redirectTo(request, portalHome(token.role));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/supervisor')) {
    if (hasInvalidSession) {
      return redirectTo(request, '/signin', callbackPath);
    }
    if (token.role !== 'supervisor' && token.role !== 'admin' && token.role !== 'super_admin') {
      return redirectTo(request, portalHome(token.role));
    }
    if (mustChangePassword) {
      return redirectTo(request, '/change-password', callbackPath);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/reviewer')) {
    if (hasInvalidSession) {
      return redirectTo(request, '/signin', callbackPath);
    }
    if (token.role !== 'reviewer' && token.role !== 'admin' && token.role !== 'super_admin') {
      return redirectTo(request, portalHome(token.role));
    }
    if (mustChangePassword) {
      return redirectTo(request, '/change-password', callbackPath);
    }
    return NextResponse.next();
  }

  if (hasInvalidSession) {
    return redirectTo(request, '/signin', callbackPath);
  }

  if (mustChangePassword) {
    return redirectTo(request, '/change-password', callbackPath);
  }

  if (token.role === 'viewer') {
    return redirectTo(request, pathname.startsWith('/applications') ? '/viewer/applications' : '/viewer');
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/viewer/:path*', '/supervisor/:path*', '/reviewer/:path*', '/dashboard', '/applications/:path*', '/change-password'],
};
