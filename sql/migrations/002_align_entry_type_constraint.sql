-- Migration 002: Align credit_ledger entry_type constraint to canonical model
-- Assumes: 001 ran, carstudio-credit-wallet-hub.sql already ran
--
-- The old DB schema had entry_type CHECK ('credit','debit','adjustment').
-- The canonical model uses ('grant','spend','adjustment','refund').
-- The hub migration already added credit_ledger_entry_type_valid if missing,
-- but we need to handle the case where the OLD constraint still exists too.
--
-- This migration:
-- 1) Drops the old entry_type CHECK if it exists (from original schema)
-- 2) Migrates old entry_type values to canonical equivalents
-- 3) Re-ensures the canonical constraint exists

BEGIN;

-- 1) Drop old-style entry_type constraint (original schema used inline CHECK)
--    The constraint name varies by DB; try common patterns.
DO $$
DECLARE
  v_conname TEXT;
BEGIN
  -- Find any CHECK constraint on credit_ledger.entry_type that allows 'credit'/'debit'
  -- (the old schema values) but NOT the canonical ones
  FOR v_conname IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE t.relname = 'credit_ledger'
      AND n.nspname = 'public'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%entry_type%'
      AND c.conname <> 'credit_ledger_entry_type_valid'
  LOOP
    EXECUTE format('ALTER TABLE public.credit_ledger DROP CONSTRAINT IF EXISTS %I', v_conname);
    RAISE NOTICE 'Dropped old entry_type constraint: %', v_conname;
  END LOOP;
END $$;

-- 2) Migrate old entry_type values to canonical equivalents
UPDATE public.credit_ledger SET entry_type = 'grant'      WHERE entry_type = 'credit';
UPDATE public.credit_ledger SET entry_type = 'spend'      WHERE entry_type = 'debit';

-- 3) Ensure canonical constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'credit_ledger_entry_type_valid'
  ) THEN
    ALTER TABLE public.credit_ledger
      ADD CONSTRAINT credit_ledger_entry_type_valid
      CHECK (entry_type IN ('grant', 'spend', 'adjustment', 'refund'));
  END IF;
END $$;

-- 4) Set canonical default for entry_type
ALTER TABLE public.credit_ledger
  ALTER COLUMN entry_type SET DEFAULT 'adjustment';

COMMIT;
