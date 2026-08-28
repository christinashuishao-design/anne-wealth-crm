import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items) => {
        items.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  // getClaims verifies the signed access token locally (with cached JWKS for
  // asymmetric projects). Unlike getUser it does not require a user-record
  // network request on every internal page navigation.
  const { data: claimsData } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(claimsData?.claims?.sub);
  const publicPath = request.nextUrl.pathname.startsWith("/login") || request.nextUrl.pathname.startsWith("/auth") || request.nextUrl.pathname.startsWith("/forgot-password") || request.nextUrl.pathname.startsWith("/setup") || request.nextUrl.pathname.startsWith("/api/communications/") || request.nextUrl.pathname.startsWith("/api/cron/");
  if (!isAuthenticated && !publicPath) return NextResponse.redirect(new URL("/login", request.url));
  if (isAuthenticated && request.nextUrl.pathname === "/login") return NextResponse.redirect(new URL("/dashboard", request.url));
  return response;
}
