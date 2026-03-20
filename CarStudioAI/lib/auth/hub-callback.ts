import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  HUB_PENDING_NONCE_COOKIE_NAME,
  HUB_PENDING_REDIRECT_COOKIE_NAME,
  HUB_SESSION_COOKIE_NAME,
  HubHandoffError,
  createAbsoluteUrl,
  createHubSessionToken,
  getDefaultRedirectPath,
  logHubHandoffError,
  sanitizeRedirectPath,
  verifyHubHandoffToken,
} from "@/lib/auth/hub-handoff";
import { createServerSupabaseServiceClient } from "@/lib/supabase/server";

function getErrorCode(reason: string) {
  if (reason === "invalid_hub_product") {
    return "invalid_hub_product";
  }

  if (reason === "missing_hub_token") {
    return "missing_hub_token";
  }

  if (reason === "invalid_hub_nonce") {
    return "invalid_hub_nonce";
  }

  if (reason === "hub_user_sync_failed") {
    return "hub_user_sync_failed";
  }

  if (reason === "missing_code") {
    return "missing_code";
  }

  return "invalid_hub_token";
}

function getPendingCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}

function clearPendingHandoffCookies(response: NextResponse) {
  const options = getPendingCookieOptions();
  response.cookies.set(HUB_PENDING_NONCE_COOKIE_NAME, "", options);
  response.cookies.set(HUB_PENDING_REDIRECT_COOKIE_NAME, "", options);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function resolveOrCreateHubUser(sub: string, email: string, name?: string) {
  const supabase = createServerSupabaseServiceClient();

  const { data: existingUser, error: existingError } = await supabase
    .from("hub_users")
    .select("id, email, name")
    .eq("email", email)
    .maybeSingle();

  if (existingError) {
    throw new HubHandoffError("hub_user_sync_failed");
  }

  if (existingUser?.id) {
    if (name && existingUser.name !== name) {
      await supabase.from("hub_users").update({ name, updated_at: new Date().toISOString() }).eq("id", existingUser.id);
    }
    return existingUser.id;
  }

  if (!isUuid(sub)) {
    throw new HubHandoffError("hub_user_sync_failed");
  }

  const fallbackName = name?.trim() || email.split("@")[0] || "Car Studio User";
  const { data: insertedUser, error: insertError } = await supabase
    .from("hub_users")
    .insert({ id: sub, email, name: fallbackName })
    .select("id")
    .single();

  if (insertError || !insertedUser?.id) {
    throw new HubHandoffError("hub_user_sync_failed");
  }

  return insertedUser.id;
}

export async function handleHubCallback(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const code = url.searchParams.get("code");
  const requestedRedirect = url.searchParams.get("redirect_to");
  const correlationId = crypto.randomUUID();
  const cookieStore = await cookies();
  const pendingRedirect = cookieStore.get(HUB_PENDING_REDIRECT_COOKIE_NAME)?.value ?? null;
  const destinationPath = sanitizeRedirectPath(requestedRedirect || pendingRedirect, getDefaultRedirectPath());

  if (!token && !code) {
    logHubHandoffError("missing_hub_token", {
      correlationId,
      callbackPath: url.pathname,
      hasRedirectTo: Boolean(requestedRedirect),
    });

    const response = NextResponse.redirect(
      createAbsoluteUrl(request, `/login?error=${encodeURIComponent(getErrorCode("missing_hub_token"))}`),
    );
    clearPendingHandoffCookies(response);
    return response;
  }

  if (token) {
    try {
      const verified = await verifyHubHandoffToken(token);
      const pendingNonce = cookieStore.get(HUB_PENDING_NONCE_COOKIE_NAME)?.value?.trim() || "";

      if (!verified.nonce || !pendingNonce || verified.nonce !== pendingNonce) {
        throw new HubHandoffError("invalid_hub_nonce");
      }

      await resolveOrCreateHubUser(verified.sub, verified.email, verified.name);

      const sessionToken = await createHubSessionToken({
        hubSub: verified.sub,
        email: verified.email,
        name: verified.name,
        provider: "hub_handoff",
      });

      const response = NextResponse.redirect(createAbsoluteUrl(request, destinationPath));
      response.cookies.set(HUB_SESSION_COOKIE_NAME, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
      clearPendingHandoffCookies(response);

      console.info(
        JSON.stringify({
          event: "car_studio_hub_callback",
          mode: "token",
          correlationId,
          tokenVerification: "ok",
          sessionCookieSet: true,
          redirect_to: destinationPath,
        }),
      );

      return response;
    } catch (error) {
      const reason = error instanceof HubHandoffError ? error.reason : "invalid_hub_token";

      logHubHandoffError(reason, {
        correlationId,
        callbackPath: url.pathname,
        hasRedirectTo: Boolean(requestedRedirect),
        productClaimExpected: "car-studio",
      });

      const response = NextResponse.redirect(
        createAbsoluteUrl(request, `/login?error=${encodeURIComponent(getErrorCode(reason))}`),
      );
      clearPendingHandoffCookies(response);
      return response;
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    const response = NextResponse.redirect(createAbsoluteUrl(request, "/login?error=config"));
    clearPendingHandoffCookies(response);
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code!);

  if (error) {
    logHubHandoffError("oauth_exchange_failed", {
      correlationId,
      callbackPath: url.pathname,
      reason: error.message,
    });
    const response = NextResponse.redirect(
      createAbsoluteUrl(request, "/login?error=auth_failed"),
    );
    clearPendingHandoffCookies(response);
    return response;
  }

  const response = NextResponse.redirect(createAbsoluteUrl(request, destinationPath));
  clearPendingHandoffCookies(response);
  console.info(
    JSON.stringify({
      event: "car_studio_hub_callback",
      mode: "code",
      correlationId,
      tokenVerification: "skipped",
      sessionCookieSet: false,
      redirect_to: destinationPath,
    }),
  );
  return response;
}
