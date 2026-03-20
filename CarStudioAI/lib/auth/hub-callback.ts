import "server-only";

import { NextResponse } from "next/server";
import {
  HUB_SESSION_COOKIE_NAME,
  HubHandoffError,
  createAbsoluteUrl,
  createHubSessionToken,
  getDefaultRedirectPath,
  logHubHandoffError,
  sanitizeRedirectPath,
  verifyHubHandoffToken,
} from "@/lib/auth/hub-handoff";

function getErrorCode(reason: string) {
  if (reason === "invalid_hub_product") {
    return "invalid_hub_product";
  }

  if (reason === "missing_hub_token") {
    return "missing_hub_token";
  }

  return "invalid_hub_token";
}

export async function handleHubCallback(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const requestedRedirect = url.searchParams.get("redirect_to");
  const destinationPath = sanitizeRedirectPath(requestedRedirect, getDefaultRedirectPath());
  const correlationId = crypto.randomUUID();

  if (!token) {
    logHubHandoffError("missing_hub_token", {
      correlationId,
      callbackPath: url.pathname,
      hasRedirectTo: Boolean(requestedRedirect),
    });

    return NextResponse.redirect(
      createAbsoluteUrl(request, `/login?error=${encodeURIComponent(getErrorCode("missing_hub_token"))}`),
    );
  }

  try {
    const verified = await verifyHubHandoffToken(token);
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

    return response;
  } catch (error) {
    const reason = error instanceof HubHandoffError ? error.reason : "invalid_hub_token";

    logHubHandoffError(reason, {
      correlationId,
      callbackPath: url.pathname,
      hasRedirectTo: Boolean(requestedRedirect),
      productClaimExpected: "car-studio",
    });

    return NextResponse.redirect(
      createAbsoluteUrl(request, `/login?error=${encodeURIComponent(getErrorCode(reason))}`),
    );
  }
}
