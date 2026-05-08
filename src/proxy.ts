import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from '@/lib/auth';

const protectedRoutes = ['/dashboard', '/expenses', '/balances', '/settlements'];
const publicRoutes = ['/login'];
const adminRoutes = ['/admin'];

export default async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route));
  const isPublicRoute = publicRoutes.some(route => path.startsWith(route));
  const isAdminRoute = adminRoutes.some(route => path.startsWith(route));

  const sessionCookie = request.cookies.get('session')?.value;
  let session = null;
  
  if (sessionCookie) {
    try {
      session = await decrypt(sessionCookie);
    } catch (e) {
      session = null;
    }
  }

  // Redirect to login if accessing protected route without session
  if ((isProtectedRoute || isAdminRoute) && !session) {
    return NextResponse.redirect(new URL('/login', request.nextUrl));
  }

  // Redirect to dashboard if accessing public route with session
  if (isPublicRoute && session && !path.startsWith('/api')) {
    return NextResponse.redirect(new URL('/dashboard', request.nextUrl));
  }

  // Check admin role
  if (isAdminRoute && session?.user?.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
