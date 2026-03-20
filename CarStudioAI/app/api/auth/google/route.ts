import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  HUB_PENDING_NONCE_COOKIE_NAME,
  HUB_PENDING_REDIRECT_COOKIE_NAME,
  buildHubStartUrl,
  createAbsoluteUrl,
  getDefaultRedirectPath,
  parseCookieHeader,
  sanitizeRedirectPath,
} from "@/lib/auth/hub-handoff";

function buildCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 10,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedRedirect = url.searchParams.get("redirect_to");
  const safeRedirect = sanitizeRedirectPath(requestedRedirect, getDefaultRedirectPath());
  const callbackUrl = createAbsoluteUrl(request, "/api/auth/callback");
  const parsedCookies = parseCookieHeader(request.headers.get("cookie"));
  const existingPendingNonce = parsedCookies[HUB_PENDING_NONCE_COOKIE_NAME] ?? null;

  const hubLoginUrl = process.env.HUB_CARSTUDIO_LOGIN_URL?.trim();

  if (hubLoginUrl) {
    const { hubStartUrl, nonce } = buildHubStartUrl(request, safeRedirect, existingPendingNonce);
    const response = NextResponse.redirect(hubStartUrl);
    const cookieOptions = buildCookieOptions();

    response.cookies.set(HUB_PENDING_NONCE_COOKIE_NAME, nonce, cookieOptions);
    response.cookies.set(HUB_PENDING_REDIRECT_COOKIE_NAME, safeRedirect, cookieOptions);

    console.info(
      JSON.stringify({
        event: "car_studio_hub_start_redirect",
        mode: "hub",
        target: hubStartUrl,
        callback: callbackUrl.toString(),
        redirect_to: safeRedirect,
      }),
    );

    return response;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(createAbsoluteUrl(request, "/login?error=config"));
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const oauthCallback = createAbsoluteUrl(request, "/api/auth/callback");
  oauthCallback.searchParams.set("redirect_to", safeRedirect);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: oauthCallback.toString(),
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error || !data.url) {
    console.error(
      JSON.stringify({
        event: "car_studio_hub_start_redirect",
        mode: "supabase_fallback",
        ok: false,
        reason: error?.message ?? "missing_oauth_url",
      }),
    );
    return NextResponse.redirect(createAbsoluteUrl(request, "/login?error=auth_failed"));
  }

  const response = NextResponse.redirect(data.url);
  response.cookies.set(HUB_PENDING_REDIRECT_COOKIE_NAME, safeRedirect, buildCookieOptions());

  console.info(
    JSON.stringify({
      event: "car_studio_hub_start_redirect",
      mode: "supabase_fallback",
      target: data.url,
      callback: oauthCallback.toString(),
      redirect_to: safeRedirect,
    }),
  );

  return response;
}
