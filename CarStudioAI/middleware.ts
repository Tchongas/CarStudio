import { NextResponse, type NextRequest } from "next/server";
import {
  HUB_SESSION_COOKIE_NAME,
  verifyHubSessionToken,
} from "@/lib/auth/hub-handoff";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware";

/**
 * Production-grade middleware using @supabase/ssr.
 * Protects /studio — redirects unauthenticated users to /.
 * Also refreshes the session cookie on every request.
 */

const PROTECTED_PATHS = ["/studio", "/admin"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const hubSessionCookie = request.cookies.get(HUB_SESSION_COOKIE_NAME)?.value;
  if (hubSessionCookie) {
    const hubSession = await verifyHubSessionToken(hubSessionCookie);
    if (hubSession?.email) {
      return NextResponse.next();
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  const { supabase, response } = createSupabaseMiddlewareClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const handoffStartUrl = new URL("/api/auth/google", request.url);
    handoffStartUrl.searchParams.set("redirect_to", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(handoffStartUrl);
  }

  return response;
}

export const config = {
  matcher: ["/studio/:path*", "/admin/:path*"],
};
