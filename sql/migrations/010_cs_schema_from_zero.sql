-- Migration 010: CS schema from zero (table names with cs_ prefix)
-- This migration is intended to be the new baseline for Car Studio.
-- It does NOT depend on legacy carstudio-credit-wallet*.sql scripts.

BEGIN;

-- 1) Ensure product exists in shared catalog
INSERT INTO public.products (
  id,
  name,
  description,
  icon_name,
  image,
  color,
  url,
  price,
  duration_months,
  is_lifetime,
  features,
  active,
  shop_link,
  modal_html
)
VALUES (
  'car-studio',
  'Car Studio AI',
  'Transforme fotos comuns de carros em imagens com visual de estúdio profissional.',
  'camera',
  '',
  'blue',
  '/studio',
  0,
  NULL,
  TRUE,
  '["Substituição de fundo com IA","5 cenários profissionais","Iluminação automática","Download em alta resolução"]'::jsonb,
  TRUE,
  '',
  ''
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  active = TRUE,
  updated_at = NOW();

-- 2) Wallet definitions (CS-prefixed table)
CREATE TABLE IF NOT EXISTS public.cs_wallet_definitions (
  wallet_key TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.cs_wallet_definitions (wallet_key, product_id, code, label, active)
VALUES ('car_studio', 'car-studio', 'CS', 'Car Studio Credits', TRUE)
ON CONFLICT (wallet_key) DO UPDATE
SET
  product_id = EXCLUDED.product_id,
  code = EXCLUDED.code,
  label = EXCLUDED.label,
  active = TRUE,
  updated_at = NOW();

-- 3) User wallets (CS-prefixed table)
CREATE TABLE IF NOT EXISTS public.cs_user_wallets (
  user_id UUID NOT NULL REFERENCES public.hub_users(id) ON DELETE CASCADE,
  wallet_key TEXT NOT NULL REFERENCES public.cs_wallet_definitions(wallet_key) ON DELETE RESTRICT,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  lifetime_earned INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_earned >= 0),
  lifetime_spent INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_spent >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, wallet_key)
);

CREATE INDEX IF NOT EXISTS idx_cs_user_wallets_wallet_balance
  ON public.cs_user_wallets (wallet_key, balance DESC);

-- 4) Credit ledger (CS-prefixed table)
CREATE TABLE IF NOT EXISTS public.cs_credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.hub_users(id) ON DELETE CASCADE,
  wallet_key TEXT NOT NULL REFERENCES public.cs_wallet_definitions(wallet_key) ON DELETE RESTRICT,
  direction TEXT NOT NULL CHECK (direction IN ('credit', 'debit')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  entry_type TEXT NOT NULL CHECK (entry_type IN ('grant', 'spend', 'adjustment', 'refund')),
  reason TEXT NOT NULL CHECK (reason IN ('purchase', 'manual_grant', 'generation', 'refund', 'reversal', 'adjustment', 'initial_balance')),
  reference_type TEXT NOT NULL CHECK (reference_type IN ('webhook_event', 'generation_attempt', 'admin', 'migration', 'bootstrap')),
  reference_id TEXT,
  idempotency_key TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cs_credit_ledger_idempotency_unique
  ON public.cs_credit_ledger (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cs_credit_ledger_wallet_user_created
  ON public.cs_credit_ledger (wallet_key, user_id, created_at DESC);

COMMIT;
