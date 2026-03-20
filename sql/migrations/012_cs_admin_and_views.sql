-- Migration 012: CS admin helpers + CS-prefixed diagnostic views
-- Assumes: 010 and 011 already ran.

BEGIN;

-- 1) Admin force-set balance on CS schema
CREATE OR REPLACE FUNCTION public.cs_set_wallet_balance_admin(
  p_user_id UUID,
  p_wallet_key TEXT,
  p_new_balance INTEGER,
  p_admin_note TEXT DEFAULT ''
)
RETURNS TABLE(old_balance INTEGER, new_balance INTEGER, ledger_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_balance INTEGER;
  v_diff INTEGER;
  v_direction TEXT;
  v_entry_type TEXT;
  v_reason TEXT;
  v_ledger_id UUID;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  IF p_wallet_key IS NULL OR LENGTH(TRIM(p_wallet_key)) = 0 THEN
    RAISE EXCEPTION 'p_wallet_key is required';
  END IF;

  IF p_new_balance IS NULL OR p_new_balance < 0 THEN
    RAISE EXCEPTION 'p_new_balance must be >= 0';
  END IF;

  SELECT balance INTO v_old_balance
  FROM public.cs_user_wallets
  WHERE user_id = p_user_id
    AND wallet_key = p_wallet_key
  FOR UPDATE;

  IF v_old_balance IS NULL THEN
    INSERT INTO public.cs_user_wallets (user_id, wallet_key, balance, lifetime_earned, lifetime_spent, updated_at)
    VALUES (p_user_id, p_wallet_key, 0, 0, 0, NOW());
    v_old_balance := 0;
  END IF;

  v_diff := p_new_balance - v_old_balance;

  IF v_diff = 0 THEN
    old_balance := v_old_balance;
    new_balance := v_old_balance;
    ledger_id := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_diff > 0 THEN
    v_direction := 'credit';
    v_entry_type := 'grant';
    v_reason := 'manual_grant';
  ELSE
    v_direction := 'debit';
    v_entry_type := 'adjustment';
    v_reason := 'adjustment';
  END IF;

  UPDATE public.cs_user_wallets
  SET
    balance = p_new_balance,
    lifetime_earned = CASE WHEN v_diff > 0 THEN lifetime_earned + v_diff ELSE lifetime_earned END,
    lifetime_spent = CASE WHEN v_diff < 0 THEN lifetime_spent + ABS(v_diff) ELSE lifetime_spent END,
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND wallet_key = p_wallet_key;

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
    p_wallet_key,
    v_direction,
    ABS(v_diff),
    v_entry_type,
    v_reason,
    'admin',
    'admin_balance_set',
    concat('cs:admin-set:', p_wallet_key, ':', p_user_id::text, ':', EXTRACT(EPOCH FROM NOW())::bigint::text),
    jsonb_build_object(
      'wallet_key', p_wallet_key,
      'old_balance', v_old_balance,
      'new_balance', p_new_balance,
      'admin_note', COALESCE(p_admin_note, '')
    )
  )
  RETURNING id INTO v_ledger_id;

  old_balance := v_old_balance;
  new_balance := p_new_balance;
  ledger_id := v_ledger_id;
  RETURN NEXT;
END;
$$;

-- 2) Diagnostic views
CREATE OR REPLACE VIEW public.cs_v_credit_ledger AS
SELECT *
FROM public.cs_credit_ledger
WHERE wallet_key = 'car_studio';

CREATE OR REPLACE VIEW public.cs_v_user_wallets AS
SELECT *
FROM public.cs_user_wallets
WHERE wallet_key = 'car_studio';

COMMIT;
