import "server-only";

import { SignJWT, jwtVerify } from "jose";

const HUB_START_ENDPOINT = "https://membros.allanfulcher.com/api/auth/car-studio/start";
const HUB_PRODUCT = "car-studio";
const DEFAULT_REDIRECT = "/studio";

export const HUB_SESSION_COOKIE_NAME = "car_studio_hub_session";
export const HUB_PENDING_NONCE_COOKIE_NAME = "car_studio_hub_nonce";
export const HUB_PENDING_REDIRECT_COOKIE_NAME = "car_studio_hub_redirect";

type HubHandoffClaims = {
  sub: string;
  email: string;
  name?: string;
  product: string;
  nonce?: string;
};

export type HubSession = {
  hubSub: string;
  email: string;
  name?: string;
  provider: "hub_handoff";
};

export class HubHandoffError extends Error {
  reason: string;

  constructor(reason: string) {
    super(reason);
    this.reason = reason;
  }
}

function parseAsString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function getSecretBuffer() {
  const secret = process.env.HUB_JWT_SECRET;
  if (!secret) {
    throw new HubHandoffError("missing_hub_jwt_secret");
  }

  return new TextEncoder().encode(secret);
}

export function getDefaultRedirectPath() {
  return sanitizeRedirectPath(process.env.CAR_STUDIO_DEFAULT_REDIRECT ?? null, DEFAULT_REDIRECT);
}

export function sanitizeRedirectPath(
  redirectTo: string | null | undefined,
  fallback = DEFAULT_REDIRECT,
) {
  if (!redirectTo) {
    return fallback;
  }

  if (!redirectTo.startsWith("/") || redirectTo.startsWith("//")) {
    return fallback;
  }

  return redirectTo;
}

export function getBaseUrlFromRequest(request: Request) {
  const configuredBase = process.env.CAR_STUDIO_BASE_URL;

  if (configuredBase) {
    return configuredBase;
  }

  return new URL(request.url).origin;
}

export function createAbsoluteUrl(request: Request, path: string) {
  return new URL(path, getBaseUrlFromRequest(request));
}

export function buildHubStartUrl(
  request: Request,
  redirectTo?: string | null,
  forcedNonce?: string | null,
) {
  const configuredHubLoginUrl = process.env.HUB_CARSTUDIO_LOGIN_URL?.trim();
  const url = new URL(configuredHubLoginUrl || HUB_START_ENDPOINT);
  const callbackUrl = new URL("/api/auth/callback", getBaseUrlFromRequest(request)).toString();
  const safeRedirect = sanitizeRedirectPath(redirectTo, getDefaultRedirectPath());
  const nonce = forcedNonce?.trim() || crypto.randomUUID();

  url.searchParams.set("product", HUB_PRODUCT);
  url.searchParams.set("return_to", callbackUrl);
  url.searchParams.set("redirect_to", safeRedirect);
  url.searchParams.set("nonce", nonce);

  return {
    hubStartUrl: url.toString(),
    callbackUrl,
    safeRedirect,
    nonce,
  };
}

export function getHubStartEndpointFromEnv() {
  return process.env.HUB_CARSTUDIO_LOGIN_URL?.trim() || HUB_START_ENDPOINT;
}

export function parseCookieHeader(cookieHeader: string | null) {
  if (!cookieHeader) {
    return {} as Record<string, string>;
  }

  return cookieHeader.split(";").reduce<Record<string, string>>((acc, chunk) => {
    const separatorIndex = chunk.indexOf("=");
    if (separatorIndex <= 0) {
      return acc;
    }

    const name = chunk.slice(0, separatorIndex).trim();
    const value = chunk.slice(separatorIndex + 1).trim();

    if (!name) {
      return acc;
    }

    try {
      acc[name] = decodeURIComponent(value);
    } catch {
      acc[name] = value;
    }

    return acc;
  }, {});
}

export function logHubHandoffError(reason: string, details: Record<string, unknown>) {
  console.error(
    JSON.stringify({
      event: "car_studio_hub_handoff_error",
      reason,
      ...details,
    }),
  );
}

export async function verifyHubHandoffToken(token: string) {
  let payload: HubHandoffClaims;

  try {
    const verification = await jwtVerify(token, getSecretBuffer(), {
      algorithms: ["HS256"],
    });

    payload = verification.payload as HubHandoffClaims;
  } catch {
    throw new HubHandoffError("invalid_hub_token");
  }

  const sub = parseAsString(payload.sub).trim();
  const email = parseAsString(payload.email).trim().toLowerCase();
  const name = parseAsString(payload.name).trim();
  const product = parseAsString(payload.product).trim();
  const nonce = parseAsString(payload.nonce).trim();

  if (!sub || !email) {
    throw new HubHandoffError("invalid_hub_claims");
  }

  if (product !== HUB_PRODUCT) {
    throw new HubHandoffError("invalid_hub_product");
  }

  return {
    sub,
    email,
    name: name || undefined,
    product,
    nonce: nonce || undefined,
  };
}

export async function createHubSessionToken(session: HubSession) {
  return await new SignJWT({
    sub: session.hubSub,
    email: session.email,
    name: session.name,
    provider: session.provider,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretBuffer());
}

export async function verifyHubSessionToken(token: string): Promise<HubSession | null> {
  try {
    const verification = await jwtVerify(token, getSecretBuffer(), {
      algorithms: ["HS256"],
    });

    const payload = verification.payload as Record<string, unknown>;
    const hubSub = parseAsString(payload.sub).trim();
    const email = parseAsString(payload.email).trim().toLowerCase();
    const name = parseAsString(payload.name).trim();
    const provider = parseAsString(payload.provider).trim();

    if (!hubSub || !email || provider !== "hub_handoff") {
      return null;
    }

    return {
      hubSub,
      email,
      name: name || undefined,
      provider: "hub_handoff",
    };
  } catch {
    return null;
  }
}

export async function getHubSessionFromRequest(request: Request): Promise<HubSession | null> {
  const cookieHeader = request.headers.get("cookie");
  const cookies = parseCookieHeader(cookieHeader);
  const sessionToken = cookies[HUB_SESSION_COOKIE_NAME];

  if (!sessionToken) {
    return null;
  }

  return await verifyHubSessionToken(sessionToken);
}
