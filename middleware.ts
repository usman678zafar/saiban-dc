import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

function redirectTo(request: NextRequest, pathname: string, callbackPath?: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = callbackPath ? `callbackUrl=${encodeURIComponent(callbackPath)}` : '';
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const { pathname, search } = request.nextUrl;
  const callbackPath = `${pathname}${search}`;

  if (pathname === '/admin/login') {
    if (!token?.sessionInvalid && (token?.role === 'admin' || token?.role === 'super_admin')) {
      return redirectTo(request, '/admin');
    }
    return redirectTo(request, '/signin', callbackPath);
  }

  if (pathname.startsWith('/admin')) {
    if (!token || token.sessionInvalid) {
      return redirectTo(request, '/signin', callbackPath);
    }
    if (token.role !== 'admin' && token.role !== 'super_admin') {
      return redirectTo(request, '/applications');
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/supervisor')) {
    if (!token || token.sessionInvalid) {
      return redirectTo(request, '/signin', callbackPath);
    }
    if (token.role !== 'supervisor' && token.role !== 'admin' && token.role !== 'super_admin') {
      return redirectTo(request, '/applications');
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/reviewer')) {
    if (!token || token.sessionInvalid) {
      return redirectTo(request, '/signin', callbackPath);
    }
    if (token.role !== 'reviewer' && token.role !== 'admin' && token.role !== 'super_admin') {
      return redirectTo(request, '/applications');
    }
    return NextResponse.next();
  }

  if (!token || token.sessionInvalid) {
    return redirectTo(request, '/signin', callbackPath);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/supervisor/:path*', '/reviewer/:path*', '/dashboard', '/applications/:path*'],
};
