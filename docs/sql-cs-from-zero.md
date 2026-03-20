# Car Studio SQL From Zero (CS-prefixed)

## Objective

Rebuild Car Studio credit schema from scratch using **CS-prefixed tables only**, without relying on old scripts:

- `sql/carstudio-credit-wallet-hub.sql` (legacy)
- `sql/carstudio-credit-wallet.sql` (legacy)

## New migration order

Run these in order:

1. `sql/migrations/010_cs_schema_from_zero.sql`
2. `sql/migrations/011_cs_runtime_and_bootstrap.sql`
3. `sql/migrations/012_cs_admin_and_views.sql`

## What each migration does

### 010_cs_schema_from_zero.sql
Creates the CS baseline schema:

- `cs_wallet_definitions`
- `cs_user_wallets`
- `cs_credit_ledger`

Also ensures `products.id = 'car-studio'` exists.

### 011_cs_runtime_and_bootstrap.sql
Creates runtime functions and bootstrap automation:

- `cs_resolve_user_id_by_email(p_email)`
- `cs_grant_credits(...)`
- `cs_spend_credits(...)`
- trigger function `cs_bootstrap_wallet_on_hub_user_insert()`
- trigger `trg_cs_bootstrap_wallet_on_hub_user_insert`
- backfill for existing users missing `car_studio` wallet

### 012_cs_admin_and_views.sql
Creates admin helper and diagnostics:

- `cs_set_wallet_balance_admin(...)`
- `cs_v_credit_ledger`
- `cs_v_user_wallets`

## Notes

- This stack is **independent** from previous `credit_ledger` / `user_credit_wallets` tables.
- All new Car Studio tables use `cs_` prefix.
- If app code still points to old canonical functions (`grant_credits`, `spend_credits`) or old shared tables, a follow-up app update is required to switch to `cs_*` runtime functions.

## Quick validation queries

```sql
-- tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('cs_wallet_definitions', 'cs_user_wallets', 'cs_credit_ledger');

-- functions
SELECT proname
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND proname IN (
    'cs_resolve_user_id_by_email',
    'cs_grant_credits',
    'cs_spend_credits',
    'cs_set_wallet_balance_admin',
    'cs_bootstrap_wallet_on_hub_user_insert'
  );

-- trigger
SELECT tgname
FROM pg_trigger
WHERE tgname = 'trg_cs_bootstrap_wallet_on_hub_user_insert';
```
