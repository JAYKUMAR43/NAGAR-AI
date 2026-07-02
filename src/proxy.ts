import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJWT } from "@/lib/jwt";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Retrieve the session cookie
  const sessionCookie = request.cookies.get("official_session");
  const token = sessionCookie?.value;

  // Check if token exists and is valid
  let isValid = false;
  if (token) {
    const payload = await verifyJWT(token);
    if (payload) {
      isValid = true;
    }
  }

  if (!isValid) {
    // Redirect to login page, preserving the original destination if needed
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Intercept only official dashboard and insights routes
export const config = {
  matcher: ["/dashboard/:path*", "/insights/:path*"],
};
