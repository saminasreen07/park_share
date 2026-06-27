import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("parkshare_token")?.value;
  const role = request.cookies.get("parkshare_role")?.value;
  const { pathname } = request.nextUrl;

  // Define route categories
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/signup");
  const isOwnerRoute = pathname.startsWith("/owner");
  const isAdminRoute = pathname.startsWith("/admin");
  const isOnboardingRoute = pathname.startsWith("/onboarding");
  const isDriverRoute = 
    pathname.startsWith("/search") ||
    pathname.startsWith("/bookings") ||
    pathname.startsWith("/wallet") ||
    pathname.startsWith("/favorites") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/booking") ||
    pathname.startsWith("/messages");

  // 1. If not authenticated and trying to access a protected route
  if (!token) {
    if (isOwnerRoute || isAdminRoute || isDriverRoute || isOnboardingRoute) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. If authenticated and trying to access login/signup
  if (token && isAuthRoute) {
    // Redirect to respective dashboard depending on role
    if (role === "admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    } else if (role === "owner") {
      return NextResponse.redirect(new URL("/owner/dashboard", request.url));
    } else {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // 3. If authenticated but role mismatch
  if (token) {
    // If trying to access owner portal but is not an owner
    if (isOwnerRoute && role !== "owner") {
      // Driver might need to onboard as owner first
      return NextResponse.redirect(new URL("/onboarding/owner", request.url));
    }

    // If trying to access admin portal but is not an admin
    if (isAdminRoute && role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

// Config to specify matching paths
export const config = {
  matcher: [
    "/login",
    "/signup",
    "/onboarding/:path*",
    "/search",
    "/bookings/:path*",
    "/wallet",
    "/favorites",
    "/profile",
    "/booking/:path*",
    "/messages",
    "/owner/:path*",
    "/admin/:path*",
  ],
};
