# Car Studio AI — Backend Scaffold

## Overview
This document describes the backend wiring scaffold for the Car Studio AI production app (`/CarStudioAI`).

---

## Architecture

```
Landing Page (/)
  └─ AuthForm component (Google OAuth + email/password)
       └─ Supabase Auth
            └─ /auth/callback (code exchange → redirect to /studio)

Middleware (middleware.ts)
  └─ Protects /studio/* routes
  └─ Reads Supabase session cookie → validates token → redirect if invalid

Studio Page (/studio)
  └─ StudioApp component
       ├─ Auth: useAuth hook (or inline in studio-app.tsx)
       ├─ Credits: useCredits hook → GET /api/credits
       └─ Generation: POST /api/generate
            ├─ Debit 1 credit (spend_credits RPC)
            ├─ Call Gemini AI (background replacement)
            ├─ Return result or auto-refund on failure
            └─ Return updated credit balance
```

---

## Files Created / Modified

### Auth Flow
| File | Purpose |
|------|---------|
| `app/auth/callback/route.ts` | OAuth callback — exchanges code for session, redirects to /studio |
| `middleware.ts` | Protects /studio, reads Supabase cookie, validates token |
| `components/auth-form.tsx` | Client component: Google OAuth button + email/password form |
| `app/page.tsx` | Landing page — now includes AuthForm in a side-by-side layout |

### Hooks (reusable scaffold)
| File | Purpose |
|------|---------|
| `lib/hooks/use-auth.ts` | `useAuth()` — manages Supabase auth state, provides getAccessToken, logout |
| `lib/hooks/use-credits.ts` | `useCredits(getAccessToken)` — manages credit balance, provides refresh/updateBalance |

### API Routes (already existed, documented here)
| File | Method | Purpose |
|------|--------|---------|
| `app/api/credits/route.ts` | GET | Returns credit balance for authenticated user |
| `app/api/generate/route.ts` | POST | Debits 1 credit, calls Gemini AI, returns result image or auto-refunds |

### Server Libraries (already existed, documented here)
| File | Purpose |
|------|---------|
| `lib/supabase/client.ts` | Browser-side Supabase client (anon key, session persistence) |
| `lib/supabase/server.ts` | Server-side Supabase client (service role key, no session) |
| `lib/credits/server.ts` | Full credit system: getBalance, consume, grant, refund, error detection |
| `lib/ai/backgrounds.ts` | Background variants, prompts, and types |

---

## Auth Flow Detail

1. User lands on `/` → sees AuthForm
2. **Google**: `signInWithOAuth` → Supabase redirects to Google → returns to `/auth/callback?code=...`
3. **Email**: `signInWithPassword` (login) or `signUp` (register with email confirmation)
4. `/auth/callback` exchanges code for session → redirects to `/studio`
5. `middleware.ts` checks Supabase cookie on every `/studio` request → redirects to `/` if invalid

## Credit Flow Detail

1. On studio load, `refreshCredits()` calls `GET /api/credits` with Bearer token
2. On generate, `POST /api/generate` debits 1 credit via `spend_credits` RPC
3. If AI fails or returns no image, credit is auto-refunded via `grant_credits` RPC
4. Updated balance is returned in every generate response

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=       # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Supabase anon/public key
SUPABASE_SERVICE_ROLE_KEY=      # Supabase service role key (server only)
GEMINI_API_KEY=                 # Google Gemini API key
```

## Hooks Usage (for future refactoring)

The hooks are ready to be adopted when refactoring `studio-app.tsx`:

```tsx
// In a future refactor of StudioApp:
const { user, getAccessToken, logout } = useAuth();
const { credits, isLoading, refresh, updateBalance } = useCredits(getAccessToken);
```

Currently `studio-app.tsx` manages auth and credits inline. The hooks provide the same logic
in a reusable form for when the component is split or new pages need credit/auth access.

---

## TODO / Next Steps
- [ ] Wire `useAuth` + `useCredits` hooks into `studio-app.tsx` (replace inline logic)
- [ ] Add `@supabase/ssr` for production-grade cookie-based SSR auth
- [ ] Add rate limiting to `/api/generate`
- [ ] Add "Download All" API endpoint for batch zip downloads
- [ ] Add webhook endpoint for Hotmart purchase → credit grant integration
