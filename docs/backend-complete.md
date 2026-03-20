# Car Studio AI — Complete Backend Architecture

## Overview

Car Studio AI shares a Supabase database with other products (e.g. Festa Mágica). Credits are isolated per product using a **multi-wallet architecture**. The Hub (members area, separate repo) handles Hotmart webhooks and purchase grants. This project only **reads balance** and **spends credits** for AI image generation.

---

## Naming Convention

| Field | Value |
|-------|-------|
| `CODE` | `CS` |
| `wallet_key` | `car_studio` |
| `product_id` | `car-studio` |
| Prompt aliases | `CS-credit-ledger`, `CS-user-credit-wallets` |
| SQL view aliases | `CS_credit_ledger`, `CS_user_credit_wallets` |

---

## Database Architecture

### Tables (shared, multi-wallet)

| Table | Purpose |
|-------|---------|
| `credit_wallet_definitions` | Catalog of wallets (`car_studio`, `festa_magica`, etc.) |
| `user_credit_wallets` | Per-user balance, keyed by `(user_id, wallet_key)` |
| `credit_ledger` | Immutable audit log of all credit movements |
| `hub_users` | Shared user table (email-based identity) |
| `products` | Product catalog (`car-studio`, `festa-magica`, etc.) |

### Canonical Functions (Postgres RPCs)

| Function | Purpose |
|----------|---------|
| `grant_credits(p_user_id, p_amount, p_reason, p_reference_type, p_reference_id, p_idempotency_key, p_meta)` | Add credits to wallet (purchases, refunds, manual grants) |
| `spend_credits(...)` | Debit credits from wallet (generation) |
| `set_wallet_balance_admin(p_user_id, p_wallet_key, p_new_balance, p_admin_note)` | Force-set balance for admin/support |
| `cs_resolve_user_id_by_email(p_email)` | Resolve email → `hub_users.id` |

### Constraint-Safe Values

**`reason`** (credit_ledger): `purchase`, `manual_grant`, `generation`, `refund`, `reversal`, `adjustment`

**`reference_type`** (credit_ledger): `webhook_event`, `generation_attempt`, `admin`

**`entry_type`** (credit_ledger): `grant`, `spend`, `adjustment`, `refund`

### Wallet Meta Convention

Every RPC call includes `p_meta` with `wallet_key` so the function knows which wallet to operate on:

```json
{
  "wallet_key": "car_studio",
  "wallet_code": "CS",
  "product_id": "car-studio"
}
```

---

## SQL Migration History

Run these in order. Each assumes previous ones already ran.

| File | Purpose |
|------|---------|
| `sql/carstudio-credit-wallet.sql` | Legacy CS-specific tables (`cs_credit_wallets`, `cs_credit_ledger`) — **already ran** |
| `sql/carstudio-credit-wallet-hub.sql` | Multi-wallet migration + canonical functions — **already ran** |
| `sql/migrations/001_ensure_car_studio_product.sql` | Ensure `car-studio` product + wallet definition exist |
| `sql/migrations/002_align_entry_type_constraint.sql` | Migrate old `credit/debit` entry_type to canonical `grant/spend` |
| `sql/migrations/003_canonical_bootstrap_trigger.sql` | Auto-grant 2 credits to new users via canonical `grant_credits` |
| `sql/migrations/004_admin_helpers_and_diagnostics.sql` | `set_wallet_balance_admin` function + CS views |

---

## App Backend Architecture

```
Browser
  ├─ Landing (/) → AuthForm (Google OAuth + email/password)
  │   └─ Supabase Auth → /auth/callback (code exchange) → redirect /studio
  │
  └─ Studio (/studio) — protected by middleware
      ├─ GET /api/credits → getBalanceByEmail → user_credit_wallets table
      └─ POST /api/generate
           ├─ spend_credits RPC (debit 1 credit)
           ├─ Google Gemini AI (background replacement)
           ├─ Auto-refund on failure via grant_credits RPC
           └─ Return image + updated balance
```

### File Map

#### Auth Flow
| File | Purpose |
|------|---------|
| `app/auth/callback/route.ts` | OAuth callback using `@supabase/ssr` — exchanges code for session cookie |
| `middleware.ts` | Protects `/studio/*` using `@supabase/ssr` — validates session, redirects if invalid |
| `lib/supabase/middleware.ts` | `createSupabaseMiddlewareClient` — SSR cookie handler for middleware |
| `lib/supabase/client.ts` | Browser-side Supabase client (anon key, session persistence) |
| `lib/supabase/server.ts` | Server-side Supabase client (service role key, no session) |
| `components/auth-form.tsx` | Login UI: Google OAuth + email/password with mode toggle |

#### Credit System
| File | Purpose |
|------|---------|
| `lib/credits/constants.ts` | `CS_WALLET_KEY`, `CS_WALLET_CODE`, `CS_PRODUCT_ID`, `buildWalletMeta()`, types |
| `lib/credits/server.ts` | `getAuthenticatedEmail`, `getBalanceByEmail`, `consumeCreditByEmail`, `grantCreditByEmail`, error helpers |

#### API Routes
| File | Method | Purpose |
|------|--------|---------|
| `app/api/credits/route.ts` | GET | Returns credit balance for authenticated user |
| `app/api/generate/route.ts` | POST | Debits 1 credit → Gemini AI → returns image or auto-refunds |

#### Hooks (reusable scaffold)
| File | Purpose |
|------|---------|
| `lib/hooks/use-auth.ts` | `useAuth()` — Supabase auth state, `getAccessToken`, `logout` |
| `lib/hooks/use-credits.ts` | `useCredits(getAccessToken)` — credit balance, `refresh()`, `updateBalance()` |

---

## Credit Flow Detail

### Generation (spend)
1. Frontend sends `POST /api/generate` with Bearer token + image data
2. Server extracts email from token → resolves `hub_users.id` via `cs_resolve_user_id_by_email`
3. Calls `spend_credits` RPC with `wallet_key=car_studio` in meta
4. Calls Gemini AI for background replacement
5. On success: returns image + balance after debit
6. On failure: calls `grant_credits` with `reason=refund` to auto-refund

### Purchase (grant — handled by Hub)
1. User purchases on Hotmart
2. Hotmart webhook → Hub members area
3. Hub calls `grant_credits` with `wallet_key=car_studio`, `reason=purchase`, `reference_type=webhook_event`
4. Idempotency key: `car_studio:<hotmart_event_id>`

### New User Bootstrap
1. New user signs up (Google or email) → Supabase Auth creates auth user
2. First API call resolves email in `hub_users` (user must exist there)
3. DB trigger `trg_cs_bootstrap_wallet_canonical` auto-grants 2 credits on `hub_users` INSERT

---

## Environment Variables

```env
# Google Gemini AI (image generation)
GEMINI_API_KEY=

# Supabase — public (exposed to browser)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Supabase — server only (NEVER expose to browser)
SUPABASE_SERVICE_ROLE_KEY=
```

---

## Hub Integration Contract

Car Studio depends on the Hub for:

1. **User creation** — Hub creates `hub_users` rows (email-based)
2. **Purchase grants** — Hub calls `grant_credits` when Hotmart purchase is approved
3. **Hotmart mapping** — Hub admin maps Hotmart product UCODE → `car-studio` with `grant_mode=credits`

### Hub Catalog Entry (required in Hub's `src/lib/credits/catalog.ts`)

```ts
{
  walletKey: 'car_studio',
  shortCode: 'CS',
  productId: 'car-studio',
  label: 'Car Studio',
  grantReason: 'purchase',
  referenceType: 'webhook_event',
}
```

---

## Troubleshooting

### Check wallet definition
```sql
SELECT wallet_key, product_id, code, label, active
FROM credit_wallet_definitions
WHERE wallet_key = 'car_studio';
```

### Check user balance
```sql
SELECT u.email, w.balance, w.lifetime_earned, w.lifetime_spent
FROM user_credit_wallets w
JOIN hub_users u ON u.id = w.user_id
WHERE w.wallet_key = 'car_studio'
  AND LOWER(u.email) = LOWER('user@example.com');
```

### Latest ledger entries
```sql
SELECT id, user_id, amount, entry_type, reason, reference_type, created_at
FROM credit_ledger
WHERE wallet_key = 'car_studio'
ORDER BY created_at DESC
LIMIT 20;
```

### Reload PostgREST cache
```sql
NOTIFY pgrst, 'reload schema';
```
