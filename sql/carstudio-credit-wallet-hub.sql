-- Car Studio credits on shared hub schema (multi-wallet standard)
-- Template aligned with hub convention:
--   CODE      = CS
--   wallet_key= car_studio
--   product_id= car-studio
--
-- IMPORTANT:
-- - Apply through the shared DB migration flow.
-- - This script is idempotent and additive-first.
-- - It preserves compatibility wrappers (cs_*) while moving to canonical grant/spend model.

BEGIN;

-- 1) Wallet catalog
CREATE TABLE IF NOT EXISTS public.credit_wallet_definitions (
  wallet_key TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id),
  UNIQUE (code)
);

-- Register known wallets if products already exist in catalog
INSERT INTO public.credit_wallet_definitions (wallet_key, product_id, code, label, active)
SELECT 'festa_magica', 'festa-magica', 'FM', 'Festa Magica Credits', TRUE
WHERE EXISTS (SELECT 1 FROM public.products p WHERE p.id = 'festa-magica')
ON CONFLICT (wallet_key)
DO UPDATE SET
  product_id = EXCLUDED.product_id,
  code = EXCLUDED.code,
  label = EXCLUDED.label,
  active = TRUE,
  updated_at = NOW();

INSERT INTO public.credit_wallet_definitions (wallet_key, product_id, code, label, active)
SELECT 'car_studio', 'car-studio', 'CS', 'Car Studio Credits', TRUE
WHERE EXISTS (SELECT 1 FROM public.products p WHERE p.id = 'car-studio')
ON CONFLICT (wallet_key)
DO UPDATE SET
  product_id = EXCLUDED.product_id,
  code = EXCLUDED.code,
  label = EXCLUDED.label,
  active = TRUE,
  updated_at = NOW();

-- 2) user_credit_wallets (shared, isolated by wallet_key)
CREATE TABLE IF NOT EXISTS public.user_credit_wallets (
  user_id UUID NOT NULL REFERENCES public.hub_users(id) ON DELETE CASCADE,
  wallet_key TEXT NOT NULL REFERENCES public.credit_wallet_definitions(wallet_key) ON DELETE RESTRICT,
  balance INTEGER NOT NULL DEFAULT 0,
  lifetime_earned INTEGER NOT NULL DEFAULT 0,
  lifetime_spent INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, wallet_key)
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_credit_wallets'
      AND column_name = 'user_id'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_credit_wallets'
      AND column_name = 'wallet_key'
  ) THEN
    ALTER TABLE public.user_credit_wallets
      ADD COLUMN wallet_key TEXT;

    UPDATE public.user_credit_wallets
    SET wallet_key = 'festa_magica'
    WHERE wallet_key IS NULL;
  END IF;
END $$;

UPDATE public.user_credit_wallets
SET wallet_key = 'festa_magica'
WHERE wallet_key IS NULL;

ALTER TABLE public.user_credit_wallets
  ALTER COLUMN wallet_key SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_credit_wallets_wallet_key_fkey'
  ) THEN
    ALTER TABLE public.user_credit_wallets
      ADD CONSTRAINT user_credit_wallets_wallet_key_fkey
      FOREIGN KEY (wallet_key)
      REFERENCES public.credit_wallet_definitions(wallet_key)
      ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_credit_wallets'
      AND column_name = 'wallet_key'
  ) THEN
    -- Wallet-aware key (safe if already migrated)
    BEGIN
      ALTER TABLE public.user_credit_wallets DROP CONSTRAINT IF EXISTS user_credit_wallets_pkey;
      ALTER TABLE public.user_credit_wallets ADD CONSTRAINT user_credit_wallets_pkey PRIMARY KEY (user_id, wallet_key);
    EXCEPTION WHEN duplicate_table THEN
      NULL;
    WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_credit_wallets_wallet_balance
  ON public.user_credit_wallets (wallet_key, balance DESC);

-- 3) credit_ledger (shared, isolated by wallet_key)
CREATE TABLE IF NOT EXISTS public.credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.hub_users(id) ON DELETE CASCADE,
  wallet_key TEXT NOT NULL REFERENCES public.credit_wallet_definitions(wallet_key) ON DELETE RESTRICT,
  amount INTEGER NOT NULL,
  entry_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  reference_type TEXT,
  reference_id TEXT,
  idempotency_key TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'credit_ledger'
      AND column_name = 'user_id'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'credit_ledger'
      AND column_name = 'wallet_key'
  ) THEN
    ALTER TABLE public.credit_ledger
      ADD COLUMN wallet_key TEXT;

    UPDATE public.credit_ledger
    SET wallet_key = 'festa_magica'
    WHERE wallet_key IS NULL;
  END IF;
END $$;

UPDATE public.credit_ledger
SET wallet_key = 'festa_magica'
WHERE wallet_key IS NULL;

ALTER TABLE public.credit_ledger
  ALTER COLUMN wallet_key SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'credit_ledger_wallet_key_fkey'
  ) THEN
    ALTER TABLE public.credit_ledger
      ADD CONSTRAINT credit_ledger_wallet_key_fkey
      FOREIGN KEY (wallet_key)
      REFERENCES public.credit_wallet_definitions(wallet_key)
      ON DELETE RESTRICT;
  END IF;
END $$;

-- Normalize legacy entry_type values before enforcing canonical constraint
UPDATE public.credit_ledger SET entry_type = 'grant'      WHERE entry_type = 'credit';
UPDATE public.credit_ledger SET entry_type = 'spend'      WHERE entry_type = 'debit';
UPDATE public.credit_ledger SET entry_type = 'adjustment' WHERE entry_type IS NULL;

DO $$
DECLARE
  v_conname TEXT;
BEGIN
  -- Drop any previous CHECK on entry_type (including old definitions that reused
  -- the same constraint name but still validate only credit/debit/adjustment).
  FOR v_conname IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE t.relname = 'credit_ledger'
      AND n.nspname = 'public'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%entry_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.credit_ledger DROP CONSTRAINT IF EXISTS %I', v_conname);
  END LOOP;

  ALTER TABLE public.credit_ledger
    ADD CONSTRAINT credit_ledger_entry_type_valid
    CHECK (entry_type IN ('grant', 'spend', 'adjustment', 'refund'));
END $$;

ALTER TABLE public.credit_ledger
  ALTER COLUMN entry_type SET DEFAULT 'adjustment';

-- Legacy compatibility: some shared DBs still enforce credit_ledger.direction NOT NULL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'credit_ledger'
      AND column_name = 'direction'
  ) THEN
    ALTER TABLE public.credit_ledger
      ADD COLUMN direction TEXT;
  END IF;
END $$;

UPDATE public.credit_ledger
SET direction = CASE
  WHEN entry_type IN ('grant', 'refund') THEN 'credit'
  WHEN entry_type = 'spend' THEN 'debit'
  WHEN amount >= 0 THEN 'credit'
  ELSE 'debit'
END
WHERE direction IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'credit_ledger_direction_valid'
  ) THEN
    ALTER TABLE public.credit_ledger
      ADD CONSTRAINT credit_ledger_direction_valid
      CHECK (direction IN ('credit', 'debit'));
  END IF;
END $$;

ALTER TABLE public.credit_ledger
  ALTER COLUMN direction SET DEFAULT 'credit';

ALTER TABLE public.credit_ledger
  ALTER COLUMN direction SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_ledger_idempotency_unique
  ON public.credit_ledger (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_credit_ledger_wallet_user_created
  ON public.credit_ledger (wallet_key, user_id, created_at DESC);

-- 4) Helpers
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

-- 5) Canonical grant_credits
CREATE OR REPLACE FUNCTION public.grant_credits(
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

  v_wallet_key := NULLIF(TRIM(COALESCE(p_meta->>'wallet_key', '')), '');
  IF v_wallet_key IS NULL THEN
    RAISE EXCEPTION 'wallet_key is required in p_meta';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT cl.id, ucw.balance
      INTO v_ledger_id, new_balance
    FROM public.credit_ledger cl
    JOIN public.user_credit_wallets ucw
      ON ucw.user_id = cl.user_id AND ucw.wallet_key = cl.wallet_key
    WHERE cl.idempotency_key = p_idempotency_key
    LIMIT 1;

    IF v_ledger_id IS NOT NULL THEN
      ledger_id := v_ledger_id;
      RETURN NEXT;
      RETURN;
    END IF;
  END IF;

  INSERT INTO public.user_credit_wallets (user_id, wallet_key, balance, lifetime_earned, updated_at)
  VALUES (p_user_id, v_wallet_key, p_amount, p_amount, NOW())
  ON CONFLICT (user_id, wallet_key)
  DO UPDATE SET
    balance = public.user_credit_wallets.balance + EXCLUDED.balance,
    lifetime_earned = public.user_credit_wallets.lifetime_earned + EXCLUDED.lifetime_earned,
    updated_at = NOW();

  INSERT INTO public.credit_ledger (
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
    COALESCE(p_reason, ''),
    NULLIF(TRIM(COALESCE(p_reference_type, '')), ''),
    NULLIF(TRIM(COALESCE(p_reference_id, '')), ''),
    NULLIF(TRIM(COALESCE(p_idempotency_key, '')), ''),
    COALESCE(p_meta, '{}'::jsonb)
  )
  RETURNING id INTO v_ledger_id;

  SELECT balance INTO new_balance
  FROM public.user_credit_wallets
  WHERE user_id = p_user_id
    AND wallet_key = v_wallet_key;

  ledger_id := v_ledger_id;
  RETURN NEXT;
END;
$$;

-- 6) Canonical spend_credits
CREATE OR REPLACE FUNCTION public.spend_credits(
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

  v_wallet_key := NULLIF(TRIM(COALESCE(p_meta->>'wallet_key', '')), '');
  IF v_wallet_key IS NULL THEN
    RAISE EXCEPTION 'wallet_key is required in p_meta';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT cl.id, ucw.balance
      INTO v_ledger_id, new_balance
    FROM public.credit_ledger cl
    JOIN public.user_credit_wallets ucw
      ON ucw.user_id = cl.user_id AND ucw.wallet_key = cl.wallet_key
    WHERE cl.idempotency_key = p_idempotency_key
    LIMIT 1;

    IF v_ledger_id IS NOT NULL THEN
      ledger_id := v_ledger_id;
      RETURN NEXT;
      RETURN;
    END IF;
  END IF;

  SELECT balance INTO v_current_balance
  FROM public.user_credit_wallets
  WHERE user_id = p_user_id
    AND wallet_key = v_wallet_key
  FOR UPDATE;

  IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
    RAISE EXCEPTION 'insufficient credits';
  END IF;

  UPDATE public.user_credit_wallets
  SET
    balance = balance - p_amount,
    lifetime_spent = lifetime_spent + p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND wallet_key = v_wallet_key
  RETURNING balance INTO new_balance;

  INSERT INTO public.credit_ledger (
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
    -p_amount,
    'spend',
    COALESCE(p_reason, ''),
    NULLIF(TRIM(COALESCE(p_reference_type, '')), ''),
    NULLIF(TRIM(COALESCE(p_reference_id, '')), ''),
    NULLIF(TRIM(COALESCE(p_idempotency_key, '')), ''),
    COALESCE(p_meta, '{}'::jsonb)
  )
  RETURNING id INTO v_ledger_id;

  ledger_id := v_ledger_id;
  RETURN NEXT;
END;
$$;

-- 7) Ensure every account starts with 2 credits for CS wallet
INSERT INTO public.user_credit_wallets (user_id, wallet_key, balance, lifetime_earned, lifetime_spent, updated_at)
SELECT hu.id, 'car_studio', 2, 2, 0, NOW()
FROM public.hub_users hu
LEFT JOIN public.user_credit_wallets ucw
  ON ucw.user_id = hu.id
 AND ucw.wallet_key = 'car_studio'
WHERE ucw.user_id IS NULL;

INSERT INTO public.credit_ledger (
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
SELECT
  hu.id,
  'car_studio',
  'credit',
  2,
  'grant',
  'initial_balance',
  'migration',
  'initial_backfill',
  concat('cs:initial-balance:', hu.id::text),
  jsonb_build_object('wallet_key', 'car_studio', 'wallet_code', 'CS', 'product_id', 'car-studio')
FROM public.hub_users hu
LEFT JOIN public.credit_ledger cl
  ON cl.idempotency_key = concat('cs:initial-balance:', hu.id::text)
WHERE cl.id IS NULL;

-- 8) Optional readability views
CREATE OR REPLACE VIEW public.CS_credit_ledger AS
SELECT * FROM public.credit_ledger WHERE wallet_key = 'car_studio';

CREATE OR REPLACE VIEW public.CS_user_credit_wallets AS
SELECT * FROM public.user_credit_wallets WHERE wallet_key = 'car_studio';

COMMIT;
