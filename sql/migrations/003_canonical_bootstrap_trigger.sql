-- Migration 003: Canonical bootstrap trigger for new hub users
-- Assumes: 001, 002 ran. grant_credits function exists.
--
-- When a new hub_user is created (e.g. first login via Supabase Auth),
-- auto-grant 2 credits to their car_studio wallet using the canonical grant_credits.
--
-- Uses constraint-compliant values:
--   reason = 'manual_grant'  (allowed by credit_ledger_reason_check)
--   reference_type = 'admin' (allowed by credit_ledger_reference_type_check)
--
-- The old trigger (trg_cs_bootstrap_wallet_new_hub_user) wrote to legacy cs_credit_wallets.
-- This new trigger writes to canonical user_credit_wallets via grant_credits.

BEGIN;

-- 1) Drop old legacy bootstrap trigger if it exists
DROP TRIGGER IF EXISTS trg_cs_bootstrap_wallet_new_hub_user ON public.hub_users;

-- 2) Create canonical bootstrap function
CREATE OR REPLACE FUNCTION public.cs_bootstrap_wallet_canonical()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result RECORD;
BEGIN
  -- Grant 2 initial credits to car_studio wallet
  SELECT * INTO v_result
  FROM public.grant_credits(
    NEW.id,                                       -- p_user_id
    2,                                            -- p_amount
    'manual_grant',                               -- p_reason (constraint-safe)
    'admin',                                      -- p_reference_type (constraint-safe)
    'initial_balance',                            -- p_reference_id
    concat('car_studio:welcome:', NEW.id::text),  -- p_idempotency_key
    jsonb_build_object(
      'wallet_key', 'car_studio',
      'wallet_code', 'CS',
      'product_id', 'car-studio',
      'note', 'Initial Car Studio balance (2 free credits)'
    )                                             -- p_meta
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail user creation if credit grant fails
    RAISE WARNING 'CS bootstrap grant failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- 3) Attach trigger to hub_users INSERT
CREATE TRIGGER trg_cs_bootstrap_wallet_canonical
AFTER INSERT ON public.hub_users
FOR EACH ROW EXECUTE FUNCTION public.cs_bootstrap_wallet_canonical();

-- 4) Backfill any existing users missing car_studio wallet (idempotent)
--    Uses canonical grant_credits with idempotency keys to prevent duplicates.
DO $$
DECLARE
  v_user RECORD;
  v_result RECORD;
BEGIN
  FOR v_user IN
    SELECT hu.id
    FROM public.hub_users hu
    LEFT JOIN public.user_credit_wallets ucw
      ON ucw.user_id = hu.id AND ucw.wallet_key = 'car_studio'
    WHERE ucw.user_id IS NULL
  LOOP
    BEGIN
      SELECT * INTO v_result
      FROM public.grant_credits(
        v_user.id,
        2,
        'manual_grant',
        'admin',
        'initial_balance_backfill',
        concat('car_studio:welcome:', v_user.id::text),
        jsonb_build_object(
          'wallet_key', 'car_studio',
          'wallet_code', 'CS',
          'product_id', 'car-studio',
          'note', 'Initial Car Studio balance backfill'
        )
      );
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Backfill failed for user %: %', v_user.id, SQLERRM;
    END;
  END LOOP;
END $$;

COMMIT;
