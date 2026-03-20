-- Migration 011: CS runtime functions + bootstrap on CS-prefixed schema
-- Assumes: 010_cs_schema_from_zero.sql already ran.

BEGIN;

-- 1) Resolve hub user id by email
CREATE OR REPLACE FUNCTION public.cs_resolve_user_id_by_email(p_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF p_email IS NULL OR LENGTH(TRIM(p_email)) = 0 THEN
    RAISE EXCEPTION 'INVALID_EMAIL';
  END IF;

  SELECT hu.id INTO v_user_id
  FROM public.hub_users hu
  WHERE LOWER(hu.email) = LOWER(TRIM(p_email))
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'HUB_USER_NOT_FOUND';
  END IF;

  RETURN v_user_id;
END;
$$;

-- 2) Grant credits (canonical, CS-prefixed tables)
CREATE OR REPLACE FUNCTION public.cs_grant_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT,
  p_reference_type TEXT,
  p_reference_id TEXT,
  p_idempotency_key TEXT,
  p_meta JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(new_balance INTEGER, ledger_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet_key TEXT;
  v_ledger_id UUID;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'p_amount must be > 0';
  END IF;

  v_wallet_key := NULLIF(TRIM(COALESCE(p_meta->>'wallet_key', 'car_studio')), '');

  IF p_idempotency_key IS NOT NULL THEN
    SELECT cl.id, uw.balance
      INTO v_ledger_id, new_balance
    FROM public.cs_credit_ledger cl
    JOIN public.cs_user_wallets uw
      ON uw.user_id = cl.user_id AND uw.wallet_key = cl.wallet_key
    WHERE cl.idempotency_key = p_idempotency_key
    LIMIT 1;

    IF v_ledger_id IS NOT NULL THEN
      ledger_id := v_ledger_id;
      RETURN NEXT;
      RETURN;
    END IF;
  END IF;

  INSERT INTO public.cs_user_wallets (user_id, wallet_key, balance, lifetime_earned, lifetime_spent, updated_at)
  VALUES (p_user_id, v_wallet_key, p_amount, p_amount, 0, NOW())
  ON CONFLICT (user_id, wallet_key)
  DO UPDATE SET
    balance = public.cs_user_wallets.balance + EXCLUDED.balance,
    lifetime_earned = public.cs_user_wallets.lifetime_earned + EXCLUDED.lifetime_earned,
    updated_at = NOW();

  INSERT INTO public.cs_credit_ledger (
    user_id,
    wallet_key,
    direction,
    amount,
    entry_type,
    reason,
    reference_type,
    reference_id,
    idempotency_key,
    meta
  )
  VALUES (
    p_user_id,
    v_wallet_key,
    'credit',
    p_amount,
    'grant',
    COALESCE(NULLIF(TRIM(p_reason), ''), 'manual_grant'),
    COALESCE(NULLIF(TRIM(p_reference_type), ''), 'admin'),
    NULLIF(TRIM(COALESCE(p_reference_id, '')), ''),
    NULLIF(TRIM(COALESCE(p_idempotency_key, '')), ''),
    COALESCE(p_meta, '{}'::jsonb)
  )
  RETURNING id INTO v_ledger_id;

  SELECT balance INTO new_balance
  FROM public.cs_user_wallets
  WHERE user_id = p_user_id
    AND wallet_key = v_wallet_key;

  ledger_id := v_ledger_id;
  RETURN NEXT;
END;
$$;

-- 3) Spend credits (canonical, CS-prefixed tables)
CREATE OR REPLACE FUNCTION public.cs_spend_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT,
  p_reference_type TEXT,
  p_reference_id TEXT,
  p_idempotency_key TEXT,
  p_meta JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(new_balance INTEGER, ledger_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet_key TEXT;
  v_current_balance INTEGER;
  v_ledger_id UUID;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'p_amount must be > 0';
  END IF;

  v_wallet_key := NULLIF(TRIM(COALESCE(p_meta->>'wallet_key', 'car_studio')), '');

  IF p_idempotency_key IS NOT NULL THEN
    SELECT cl.id, uw.balance
      INTO v_ledger_id, new_balance
    FROM public.cs_credit_ledger cl
    JOIN public.cs_user_wallets uw
      ON uw.user_id = cl.user_id AND uw.wallet_key = cl.wallet_key
    WHERE cl.idempotency_key = p_idempotency_key
    LIMIT 1;

    IF v_ledger_id IS NOT NULL THEN
      ledger_id := v_ledger_id;
      RETURN NEXT;
      RETURN;
    END IF;
  END IF;

  SELECT balance INTO v_current_balance
  FROM public.cs_user_wallets
  WHERE user_id = p_user_id
    AND wallet_key = v_wallet_key
  FOR UPDATE;

  IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
    RAISE EXCEPTION 'insufficient_credits';
  END IF;

  UPDATE public.cs_user_wallets
  SET
    balance = balance - p_amount,
    lifetime_spent = lifetime_spent + p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND wallet_key = v_wallet_key
  RETURNING balance INTO new_balance;

  INSERT INTO public.cs_credit_ledger (
    user_id,
    wallet_key,
    direction,
    amount,
    entry_type,
    reason,
    reference_type,
    reference_id,
    idempotency_key,
    meta
  )
  VALUES (
    p_user_id,
    v_wallet_key,
    'debit',
    p_amount,
    'spend',
    COALESCE(NULLIF(TRIM(p_reason), ''), 'generation'),
    COALESCE(NULLIF(TRIM(p_reference_type), ''), 'generation_attempt'),
    NULLIF(TRIM(COALESCE(p_reference_id, '')), ''),
    NULLIF(TRIM(COALESCE(p_idempotency_key, '')), ''),
    COALESCE(p_meta, '{}'::jsonb)
  )
  RETURNING id INTO v_ledger_id;

  ledger_id := v_ledger_id;
  RETURN NEXT;
END;
$$;

-- 4) Ensure wallet exists (idempotent, called from app on every login)
--    Creates wallet + grants 8 free credits ONLY if wallet does not exist yet.
CREATE OR REPLACE FUNCTION public.cs_ensure_wallet(
  p_user_id UUID,
  p_meta JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(new_balance INTEGER, already_existed BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_balance INTEGER;
  v_result RECORD;
BEGIN
  -- Check if wallet already exists
  SELECT balance INTO v_existing_balance
  FROM public.cs_user_wallets
  WHERE user_id = p_user_id
    AND wallet_key = 'car_studio';

  IF v_existing_balance IS NOT NULL THEN
    -- Wallet already exists, return current balance
    new_balance := v_existing_balance;
    already_existed := TRUE;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Wallet does not exist: create it with 8 free credits
  SELECT * INTO v_result
  FROM public.cs_grant_credits(
    p_user_id,
    8,
    'initial_balance',
    'bootstrap',
    'welcome_grant',
    concat('cs:welcome:', p_user_id::text),
    jsonb_build_object(
      'wallet_key', 'car_studio',
      'wallet_code', 'CS',
      'product_id', 'car-studio',
      'note', 'Initial Car Studio balance (8 free credits)'
    )
  );

  new_balance := COALESCE(v_result.new_balance, 8);
  already_existed := FALSE;
  RETURN NEXT;
END;
$$;

-- 5) Bootstrap trigger: every new hub user receives 8 CS credits
CREATE OR REPLACE FUNCTION public.cs_bootstrap_wallet_on_hub_user_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result RECORD;
BEGIN
  SELECT * INTO v_result
  FROM public.cs_grant_credits(
    NEW.id,
    8,
    'initial_balance',
    'bootstrap',
    'welcome_grant',
    concat('cs:welcome:', NEW.id::text),
    jsonb_build_object(
      'wallet_key', 'car_studio',
      'wallet_code', 'CS',
      'product_id', 'car-studio',
      'note', 'Initial Car Studio balance (8 free credits)'
    )
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'CS bootstrap failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cs_bootstrap_wallet_on_hub_user_insert ON public.hub_users;
CREATE TRIGGER trg_cs_bootstrap_wallet_on_hub_user_insert
AFTER INSERT ON public.hub_users
FOR EACH ROW EXECUTE FUNCTION public.cs_bootstrap_wallet_on_hub_user_insert();

-- 6) Backfill users missing CS wallet
DO $$
DECLARE
  v_user RECORD;
  v_result RECORD;
BEGIN
  FOR v_user IN
    SELECT hu.id
    FROM public.hub_users hu
    LEFT JOIN public.cs_user_wallets uw
      ON uw.user_id = hu.id
     AND uw.wallet_key = 'car_studio'
    WHERE uw.user_id IS NULL
  LOOP
    BEGIN
      SELECT * INTO v_result
      FROM public.cs_grant_credits(
        v_user.id,
        8,
        'initial_balance',
        'migration',
        'welcome_grant_backfill',
        concat('cs:welcome:backfill:', v_user.id::text),
        jsonb_build_object(
          'wallet_key', 'car_studio',
          'wallet_code', 'CS',
          'product_id', 'car-studio',
          'note', 'Initial Car Studio balance backfill (8 free credits)'
        )
      );
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'CS backfill failed for user %: %', v_user.id, SQLERRM;
    END;
  END LOOP;
END $$;

COMMIT;
