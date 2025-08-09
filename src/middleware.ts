import { NextResponse } from 'next/server';

export function middleware() {
  // Pass-through: per-route auth is enforced in server components and API routes
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};


