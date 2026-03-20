# Hub Handoff Auth Integration

## Purpose

This document describes how Car Studio accepts authenticated handoff from Hub and creates a local Car Studio session.

## Hub start contract

Hub start endpoint:

`GET https://membros.allanfulcher.com/api/auth/car-studio/start`

Car Studio now starts auth through:

`/api/auth/google?redirect_to=/studio`

When `HUB_CARSTUDIO_LOGIN_URL` is set, `/api/auth/google` builds the Hub URL with required params:
- `product=car-studio`
- `return_to=<CAR_STUDIO_BASE_URL>/api/auth/callback`
- `redirect_to=<safe-relative-path>`
- `nonce=<one-time-random-value>`

If `HUB_CARSTUDIO_LOGIN_URL` is missing, `/api/auth/google` falls back to direct Supabase Google OAuth flow and sends users back to `/api/auth/callback?code=...`.

Hub query params:
- `product=car-studio` (required)
- `return_to=<absolute callback URL in allowlist>` (required)
- `redirect_to=/relative-path` (optional)

On success, Hub redirects browser to:

`<return_to>?token=<HUB_JWT>&redirect_to=<optional-relative-path>`

Compatibility route:
- `/api/auth/hub/start` now forwards to `/api/auth/google`.

## Callback routes (Car Studio)

Implemented routes:
- `/api/auth/callback`
- `/auth/callback/google` (compatibility)

Both routes call the same server-only callback handler.

`/api/auth/callback` accepts either:
- `token` (Hub handoff JWT), or
- `code` (Supabase OAuth code)

## JWT verification rules

File: `lib/auth/hub-handoff.ts`

- Verifies token with `HUB_JWT_SECRET`
- Algorithm restricted to `HS256`
- Requires `sub` and `email`
- Requires `product === 'car-studio'`
- Requires token nonce to match pending one-time nonce cookie
- Rejects invalid/expired tokens

## Local session bridge

After successful token validation, Car Studio creates an httpOnly cookie session:

- cookie name: `car_studio_hub_session`
- contains signed JWT with:
  - `sub` (Hub user id)
  - `email`
  - `name` (optional)
  - `provider = 'hub_handoff'`
- max age: 7 days
- secure in production, sameSite=lax

This gives a stable local identity keyed by Hub `sub`.

Before setting the local session cookie, callback resolves or creates the matching `hub_users` record in shared DB.

## Redirect safety

`redirect_to` is sanitized:
- allowed: relative paths starting with `/`
- blocked: absolute URLs and `//...`
- fallback: `CAR_STUDIO_DEFAULT_REDIRECT` (or `/studio`)

One-time pending cookies are used and cleared after callback:
- `car_studio_hub_nonce`
- `car_studio_hub_redirect`

## Error handling

On invalid/missing token, callback redirects to:

`/login?error=<code>`

Current error codes:
- `missing_hub_token`
- `invalid_hub_token`
- `invalid_hub_product`
- `invalid_hub_nonce`
- `hub_user_sync_failed`

Structured server logging event:
- `car_studio_hub_handoff_error`
- includes reason + correlation id + callback path
- never logs raw JWT token

## Middleware and API auth

### Middleware

`middleware.ts` now allows access to `/studio` when either:
1. valid Hub session cookie exists, or
2. valid Supabase session exists

Otherwise redirects to `/api/auth/google?redirect_to=/studio...`.

### API auth fallback

`lib/credits/server.ts` auth resolution now supports:
1. Bearer Supabase access token (existing)
2. Hub session cookie fallback (new)

This enables Hub-handoff users to use `/api/credits` and `/api/generate` without client-side Supabase token.

## Required env vars

```env
HUB_CARSTUDIO_LOGIN_URL=
HUB_JWT_SECRET=
CAR_STUDIO_BASE_URL=
CAR_STUDIO_DEFAULT_REDIRECT=/studio
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Logout behavior

`POST /api/auth/logout` clears the Hub session cookie.
The studio header logout action now calls this endpoint and also signs out Supabase if present.
