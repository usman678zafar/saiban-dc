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
    if (token?.role === 'admin') {
      return redirectTo(request, '/admin');
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/admin')) {
    if (!token) {
      return redirectTo(request, '/admin/login', callbackPath);
    }
    if (token.role !== 'admin') {
      return redirectTo(request, '/dashboard');
    }
    return NextResponse.next();
  }

  if (!token) {
    return redirectTo(request, '/signin', callbackPath);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard', '/applications/:path*'],
};
