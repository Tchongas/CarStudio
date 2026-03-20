# Hub Handoff Auth Integration

## Purpose

This document describes how Car Studio accepts authenticated handoff from Hub and creates a local Car Studio session.

## Hub start contract

Hub start endpoint:

`GET https://membros.allanfulcher.com/api/auth/car-studio/start`

Car Studio now redirects to this endpoint through an internal bridge route:

`/api/auth/hub/start?redirect_to=/studio`

The bridge route builds the Hub URL with required params:
- `product=car-studio`
- `return_to=<CAR_STUDIO_BASE_URL>/api/auth/callback`
- `redirect_to=<safe-relative-path>`

Hub query params:
- `product=car-studio` (required)
- `return_to=<absolute callback URL in allowlist>` (required)
- `redirect_to=/relative-path` (optional)

On success, Hub redirects browser to:

`<return_to>?token=<HUB_JWT>&redirect_to=<optional-relative-path>`

## Callback routes (Car Studio)

Implemented routes:
- `/api/auth/callback`
- `/auth/callback/google` (compatibility)

Both routes call the same server-only callback handler.

## JWT verification rules

File: `lib/auth/hub-handoff.ts`

- Verifies token with `HUB_JWT_SECRET`
- Algorithm restricted to `HS256`
- Requires `sub` and `email`
- Requires `product === 'car-studio'`
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

## Redirect safety

`redirect_to` is sanitized:
- allowed: relative paths starting with `/`
- blocked: absolute URLs and `//...`
- fallback: `CAR_STUDIO_DEFAULT_REDIRECT` (or `/studio`)

## Error handling

On invalid/missing token, callback redirects to:

`/login?error=<code>`

Current error codes:
- `missing_hub_token`
- `invalid_hub_token`
- `invalid_hub_product`

Structured server logging event:
- `car_studio_hub_handoff_error`
- includes reason + correlation id + callback path
- never logs raw JWT token

## Middleware and API auth

### Middleware

`middleware.ts` now allows access to `/studio` when either:
1. valid Hub session cookie exists, or
2. valid Supabase session exists

Otherwise redirects to `/api/auth/hub/start?redirect_to=/studio...`.

### API auth fallback

`lib/credits/server.ts` auth resolution now supports:
1. Bearer Supabase access token (existing)
2. Hub session cookie fallback (new)

This enables Hub-handoff users to use `/api/credits` and `/api/generate` without client-side Supabase token.

## Required env vars

```env
HUB_JWT_SECRET=
CAR_STUDIO_BASE_URL=
CAR_STUDIO_DEFAULT_REDIRECT=/studio
```

## Logout behavior

`POST /api/auth/logout` clears the Hub session cookie.
The studio header logout action now calls this endpoint and also signs out Supabase if present.
