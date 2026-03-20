-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.activation_codes (
  code text NOT NULL,
  product_id text NOT NULL,
  used boolean DEFAULT false,
  used_by uuid,
  used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  CONSTRAINT activation_codes_pkey PRIMARY KEY (code),
  CONSTRAINT activation_codes_used_by_fkey FOREIGN KEY (used_by) REFERENCES public.hub_users(id)
);
CREATE TABLE public.banners (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  image_url text NOT NULL,
  image_mobile_url text DEFAULT ''::text,
  link_url text DEFAULT ''::text,
  link_target text DEFAULT '_self'::text CHECK (link_target = ANY (ARRAY['_self'::text, '_blank'::text])),
  html_content text DEFAULT ''::text,
  sort_order integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT banners_pkey PRIMARY KEY (id)
);
CREATE TABLE public.credit_ledger (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  direction text NOT NULL CHECK (direction = ANY (ARRAY['credit'::text, 'debit'::text])),
  amount integer NOT NULL CHECK (amount > 0),
  reason text NOT NULL CHECK (reason = ANY (ARRAY['purchase'::text, 'manual_grant'::text, 'generation'::text, 'refund'::text, 'reversal'::text, 'adjustment'::text])),
  reference_type text NOT NULL CHECK (reference_type = ANY (ARRAY['webhook_event'::text, 'generation_attempt'::text, 'admin'::text])),
  reference_id text,
  idempotency_key text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  entry_type text NOT NULL DEFAULT 'adjustment'::text CHECK (entry_type = ANY (ARRAY['credit'::text, 'debit'::text, 'adjustment'::text])),
  source text NOT NULL DEFAULT 'legacy'::text,
  CONSTRAINT credit_ledger_pkey PRIMARY KEY (id),
  CONSTRAINT credit_ledger_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.hub_users(id)
);
CREATE TABLE public.fm_kits (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  theme text NOT NULL,
  child_name text,
  child_age text,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'generating'::text, 'completed'::text, 'failed'::text])),
  items jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT fm_kits_pkey PRIMARY KEY (id),
  CONSTRAINT fm_kits_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.hub_users(id)
);
CREATE TABLE public.generation_attempts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  kit_item_type text NOT NULL,
  status text NOT NULL CHECK (status = ANY (ARRAY['started'::text, 'succeeded'::text, 'failed'::text, 'refunded'::text])),
  credit_cost integer NOT NULL CHECK (credit_cost > 0),
  idempotency_key text NOT NULL UNIQUE,
  error_code text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT generation_attempts_pkey PRIMARY KEY (id),
  CONSTRAINT generation_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.hub_users(id)
);
CREATE TABLE public.hotmart_grants (
  id bigint NOT NULL DEFAULT nextval('hotmart_grants_id_seq'::regclass),
  purchase_transaction text NOT NULL,
  product_id text NOT NULL,
  user_id uuid NOT NULL,
  source_event_id text NOT NULL,
  purchase_status text NOT NULL,
  granted_at timestamp with time zone NOT NULL DEFAULT now(),
  revoked_at timestamp with time zone,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  credits_amount integer,
  grant_type text NOT NULL DEFAULT 'product'::text CHECK (grant_type = ANY (ARRAY['product'::text, 'credit'::text])),
  CONSTRAINT hotmart_grants_pkey PRIMARY KEY (id),
  CONSTRAINT hotmart_grants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT hotmart_grants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.hub_users(id),
  CONSTRAINT hotmart_grants_source_event_id_fkey FOREIGN KEY (source_event_id) REFERENCES public.hotmart_webhook_events(hotmart_event_id)
);
CREATE TABLE public.hotmart_product_mappings (
  id bigint NOT NULL DEFAULT nextval('hotmart_product_mappings_id_seq'::regclass),
  hotmart_product_ucode text NOT NULL UNIQUE,
  product_id text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  notes text DEFAULT ''::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  grant_mode text NOT NULL DEFAULT 'access'::text CHECK (grant_mode = ANY (ARRAY['access'::text, 'credits'::text])),
  credits_amount integer,
  CONSTRAINT hotmart_product_mappings_pkey PRIMARY KEY (id),
  CONSTRAINT hotmart_product_mappings_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.hotmart_webhook_events (
  id bigint NOT NULL DEFAULT nextval('hotmart_webhook_events_id_seq'::regclass),
  hotmart_event_id text NOT NULL UNIQUE,
  event_name text NOT NULL,
  version text,
  hottok_valid boolean NOT NULL DEFAULT false,
  product_ucode text,
  buyer_email text,
  payload jsonb NOT NULL,
  processing_status text NOT NULL DEFAULT 'received'::text,
  processing_error text,
  processed_at timestamp with time zone,
  received_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT hotmart_webhook_events_pkey PRIMARY KEY (id)
);
CREATE TABLE public.hub_users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT hub_users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.hub_users_dedup_backup (
  backup_id bigint NOT NULL DEFAULT nextval('hub_users_dedup_backup_backup_id_seq'::regclass),
  backup_run_at timestamp with time zone NOT NULL DEFAULT now(),
  duplicate_id text NOT NULL,
  canonical_id text NOT NULL,
  email text,
  hub_user_row jsonb NOT NULL,
  CONSTRAINT hub_users_dedup_backup_pkey PRIMARY KEY (backup_id)
);
CREATE TABLE public.products (
  id text NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  icon_name text DEFAULT 'sparkles'::text,
  image text DEFAULT ''::text,
  color text DEFAULT 'blue'::text,
  url text NOT NULL,
  price numeric DEFAULT 0,
  duration_months integer DEFAULT 3,
  is_lifetime boolean DEFAULT false,
  features jsonb DEFAULT '[]'::jsonb,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  shop_link text DEFAULT ''::text,
  modal_html text DEFAULT ''::text,
  CONSTRAINT products_pkey PRIMARY KEY (id)
);
CREATE TABLE public.sessions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  product_id text NOT NULL DEFAULT 'festa-magica'::text,
  token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sessions_pkey PRIMARY KEY (id),
  CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.hub_users(id)
);
CREATE TABLE public.used_nonces (
  nonce text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT used_nonces_pkey PRIMARY KEY (nonce)
);
CREATE TABLE public.user_credit_wallets (
  user_id uuid NOT NULL,
  balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  lifetime_earned integer NOT NULL DEFAULT 0,
  lifetime_spent integer NOT NULL DEFAULT 0,
  CONSTRAINT user_credit_wallets_pkey PRIMARY KEY (user_id),
  CONSTRAINT user_credit_wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.hub_users(id)
);
CREATE TABLE public.user_products (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  product_id text NOT NULL,
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'expired'::text, 'cancelled'::text])),
  activated_at timestamp with time zone NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  activation_code text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  is_lifetime boolean DEFAULT false,
  CONSTRAINT user_products_pkey PRIMARY KEY (id),
  CONSTRAINT user_products_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.hub_users(id)
);
CREATE TABLE public.user_products_dedup_backup (
  backup_id bigint NOT NULL DEFAULT nextval('user_products_dedup_backup_backup_id_seq'::regclass),
  backup_run_at timestamp with time zone NOT NULL DEFAULT now(),
  source_user_id text NOT NULL,
  canonical_user_id text NOT NULL,
  product_id text,
  user_product_row jsonb NOT NULL,
  CONSTRAINT user_products_dedup_backup_pkey PRIMARY KEY (backup_id)
);
CREATE TABLE public.webhook_events (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  provider text NOT NULL,
  external_event_id text NOT NULL,
  email_normalized text,
  payload_hash text,
  status text NOT NULL CHECK (status = ANY (ARRAY['received'::text, 'processed'::text, 'ignored'::text, 'failed'::text])),
  error text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT webhook_events_pkey PRIMARY KEY (id)
);