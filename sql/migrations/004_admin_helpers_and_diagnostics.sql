-- Migration 004: Admin helpers + diagnostic views for Car Studio
-- Assumes: 001, 002, 003 ran.
--
-- Adds:
-- 1) set_wallet_balance_admin — force-set balance for admin recovery
-- 2) CS-specific diagnostic views (refresh)
-- 3) Fast troubleshooting queries as comments

BEGIN;

-- 1) Admin force-set balance (for recovery/support scenarios)
CREATE OR REPLACE FUNCTION public.set_wallet_balance_admin(
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
  v_entry_type TEXT;
  v_ledger_id UUID;
  v_idem_key TEXT;
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

  -- Get current balance (lock row)
  SELECT ucw.balance INTO v_old_balance
  FROM public.user_credit_wallets ucw
  WHERE ucw.user_id = p_user_id
    AND ucw.wallet_key = p_wallet_key
  FOR UPDATE;

  -- Create wallet if not exists
  IF v_old_balance IS NULL THEN
    INSERT INTO public.user_credit_wallets (user_id, wallet_key, balance, lifetime_earned, lifetime_spent, updated_at)
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

  -- Determine entry type
  IF v_diff > 0 THEN
    v_entry_type := 'grant';
  ELSE
    v_entry_type := 'spend';
  END IF;

  -- Update balance
  UPDATE public.user_credit_wallets
  SET
    balance = p_new_balance,
    lifetime_earned = CASE WHEN v_diff > 0 THEN lifetime_earned + v_diff ELSE lifetime_earned END,
    lifetime_spent = CASE WHEN v_diff < 0 THEN lifetime_spent + ABS(v_diff) ELSE lifetime_spent END,
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND wallet_key = p_wallet_key;

  -- Idempotency key for admin adjustments
  v_idem_key := concat(p_wallet_key, ':admin_set:', p_user_id::text, ':', EXTRACT(EPOCH FROM NOW())::bigint::text);

  -- Record in ledger
  INSERT INTO public.credit_ledger (
    user_id, wallet_key, amount, entry_type, reason,
    reference_type, reference_id, idempotency_key, meta
  )
  VALUES (
    p_user_id,
    p_wallet_key,
    v_diff,
    'adjustment',
    'adjustment',
    'admin',
    'admin_balance_set',
    v_idem_key,
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

-- 2) CS-specific readability views (idempotent refresh)
CREATE OR REPLACE VIEW public.CS_credit_ledger AS
SELECT * FROM public.credit_ledger WHERE wallet_key = 'car_studio';

CREATE OR REPLACE VIEW public.CS_user_credit_wallets AS
SELECT * FROM public.user_credit_wallets WHERE wallet_key = 'car_studio';

COMMIT;

-- ============================================================
-- DIAGNOSTIC QUERIES (do not run as part of migration)
-- Copy-paste these manually when troubleshooting.
-- ============================================================

-- Check constraints on credit_ledger
-- SELECT conname, pg_get_constraintdef(oid) AS definition
-- FROM pg_constraint
-- WHERE conname IN ('credit_ledger_reason_check', 'credit_ledger_reference_type_check', 'credit_ledger_entry_type_valid');

-- Check wallet definition
-- SELECT wallet_key, product_id, code, label, active
-- FROM credit_wallet_definitions
-- WHERE wallet_key = 'car_studio';

-- Latest CS ledger entries
-- SELECT id, user_id, wallet_key, amount, entry_type, reason, reference_type, reference_id, created_at
-- FROM credit_ledger
-- WHERE wallet_key = 'car_studio'
-- ORDER BY created_at DESC
-- LIMIT 20;

-- Check a specific user's CS wallet
-- SELECT u.email, w.balance, w.lifetime_earned, w.lifetime_spent, w.updated_at
-- FROM user_credit_wallets w
-- JOIN hub_users u ON u.id = w.user_id
-- WHERE w.wallet_key = 'car_studio'
--   AND LOWER(u.email) = LOWER('user@example.com');

-- List all registered functions
-- SELECT n.nspname AS schema, p.proname AS function_name,
--        pg_get_function_identity_arguments(p.oid) AS args
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public'
--   AND p.proname IN ('grant_credits', 'spend_credits', 'set_wallet_balance_admin',
--                     'cs_resolve_user_id_by_email', 'cs_bootstrap_wallet_canonical');

-- Reload PostgREST schema cache (run after function/constraint changes)
-- NOTIFY pgrst, 'reload schema';
