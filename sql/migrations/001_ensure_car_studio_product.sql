-- Migration 001: Ensure car-studio product exists in products table
-- Prerequisite: products table exists (from shared DB)
-- Assumes: DBdump.sql, carstudio-credit-wallet.sql, carstudio-credit-wallet-hub.sql already ran
--
-- Run this FIRST before any other migration.

BEGIN;

-- 1) Ensure the car-studio product exists in the shared products catalog
INSERT INTO public.products (id, name, description, icon_name, image, color, url, price, duration_months, is_lifetime, features, active, shop_link, modal_html)
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
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  active = TRUE,
  updated_at = NOW();

-- 2) Re-ensure wallet definition is registered (idempotent)
INSERT INTO public.credit_wallet_definitions (wallet_key, product_id, code, label, active)
VALUES ('car_studio', 'car-studio', 'CS', 'Car Studio Credits', TRUE)
ON CONFLICT (wallet_key) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  code = EXCLUDED.code,
  label = EXCLUDED.label,
  active = TRUE,
  updated_at = NOW();

COMMIT;
