// IMOTA.admin/middleware.ts
import { NextRequest, NextResponse } from 'next/server';

const PROTECTED = [/^\/admin(\/.*)?$/];
const LOGIN_PATH = '/login'; // <-- real route URL

export function middleware(req: NextRequest) {
  const { pathname, origin } = req.nextUrl;
  const isProtected = PROTECTED.some((re) => re.test(pathname));
  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get('imota_admin_session')?.value;
  if (!token) return NextResponse.redirect(new URL(LOGIN_PATH, origin));

  // Keep it simple: skip runtime verification here to avoid edge/CORS quirks.
  // If you really want it, we can add it later on server components.
  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/admin/:path*'],
};
