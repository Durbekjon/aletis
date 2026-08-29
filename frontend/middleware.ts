import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = request.headers.get('host') || '';

  // Check if it's the pos subdomain (pos.aletis.me or pos.localhost:3000)
  if (hostname.startsWith('pos.')) {
    // If the path already starts with /pos, we don't need to rewrite
    if (!url.pathname.startsWith('/pos')) {
      url.pathname = `/pos${url.pathname === '/' ? '' : url.pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
