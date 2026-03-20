-- Car Studio isolated credit wallet on shared database
-- Non-breaking: additive objects only, does not alter existing FM/shared wallet tables.

-- 1) Dedicated wallet for Car Studio (separate from FM/legacy credits)
create table if not exists public.cs_credit_wallets (
  user_id uuid primary key references public.hub_users(id) on delete cascade,
  balance integer not null default 2 check (balance >= 0),
  lifetime_earned integer not null default 2 check (lifetime_earned >= 0),
  lifetime_spent integer not null default 0 check (lifetime_spent >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cs_credit_wallets_updated_at
  on public.cs_credit_wallets(updated_at desc);

-- 2) Car Studio credit ledger for auditability/idempotency
create table if not exists public.cs_credit_ledger (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.hub_users(id) on delete cascade,
  direction text not null check (direction in ('credit', 'debit')),
  amount integer not null check (amount > 0),
  reason text not null check (reason in ('initial_balance', 'purchase', 'manual_grant', 'generation', 'refund', 'reversal', 'adjustment')),
  reference_type text not null check (reference_type in ('generation_attempt', 'webhook_event', 'admin', 'migration', 'system')),
  reference_id text,
  idempotency_key text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint cs_credit_ledger_idempotency_key_key unique (idempotency_key)
);

create index if not exists idx_cs_credit_ledger_user_created
  on public.cs_credit_ledger(user_id, created_at desc);

-- 3) Optional generation attempts table for tracing image generation lifecycle
create table if not exists public.cs_generation_attempts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.hub_users(id) on delete cascade,
  status text not null check (status in ('started', 'succeeded', 'failed', 'refunded')),
  credit_cost integer not null default 1 check (credit_cost > 0),
  idempotency_key text not null unique,
  background_id text,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cs_generation_attempts_user_created
  on public.cs_generation_attempts(user_id, created_at desc);

-- 4) Keep balances updated
create or replace function public.cs_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_cs_credit_wallets_touch_updated_at on public.cs_credit_wallets;
create trigger trg_cs_credit_wallets_touch_updated_at
before update on public.cs_credit_wallets
for each row execute function public.cs_touch_updated_at();

drop trigger if exists trg_cs_generation_attempts_touch_updated_at on public.cs_generation_attempts;
create trigger trg_cs_generation_attempts_touch_updated_at
before update on public.cs_generation_attempts
for each row execute function public.cs_touch_updated_at();

-- 5) Bootstrap wallet when a new hub user is created
create or replace function public.cs_bootstrap_wallet_for_new_hub_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.cs_credit_wallets (user_id, balance, lifetime_earned, lifetime_spent)
  values (new.id, 2, 2, 0)
  on conflict (user_id) do nothing;

  insert into public.cs_credit_ledger (
    user_id,
    direction,
    amount,
    reason,
    reference_type,
    reference_id,
    idempotency_key,
    meta
  )
  values (
    new.id,
    'credit',
    2,
    'initial_balance',
    'system',
    'hub_user_created',
    concat('cs:welcome:', new.id::text),
    jsonb_build_object('note', 'Initial Car Studio balance')
  )
  on conflict (idempotency_key) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_cs_bootstrap_wallet_new_hub_user on public.hub_users;
create trigger trg_cs_bootstrap_wallet_new_hub_user
after insert on public.hub_users
for each row execute function public.cs_bootstrap_wallet_for_new_hub_user();

-- 6) Backfill existing users once (idempotent)
insert into public.cs_credit_wallets (user_id, balance, lifetime_earned, lifetime_spent)
select hu.id, 2, 2, 0
from public.hub_users hu
left join public.cs_credit_wallets w on w.user_id = hu.id
where w.user_id is null;

insert into public.cs_credit_ledger (
  user_id,
  direction,
  amount,
  reason,
  reference_type,
  reference_id,
  idempotency_key,
  meta
)
select
  hu.id,
  'credit',
  2,
  'initial_balance',
  'migration',
  'initial_backfill',
  concat('cs:welcome:backfill:', hu.id::text),
  jsonb_build_object('note', 'Initial Car Studio balance backfill')
from public.hub_users hu
left join public.cs_credit_ledger l
  on l.idempotency_key = concat('cs:welcome:backfill:', hu.id::text)
where l.id is null;

-- 7) Atomic consume for Car Studio generation
create or replace function public.cs_consume_credit(
  p_user_id uuid,
  p_idempotency_key text,
  p_reference_id text default null,
  p_meta jsonb default '{}'::jsonb
)
returns integer
language plpgsql
security definer
as $$
declare
  v_balance integer;
  v_existing integer;
begin
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'INVALID_IDEMPOTENCY_KEY';
  end if;

  -- idempotent replay: if already debited with same key, return current balance
  select w.balance into v_existing
  from public.cs_credit_ledger l
  join public.cs_credit_wallets w on w.user_id = l.user_id
  where l.idempotency_key = p_idempotency_key
    and l.user_id = p_user_id
    and l.direction = 'debit'
  limit 1;

  if v_existing is not null then
    return v_existing;
  end if;

  update public.cs_credit_wallets
  set balance = balance - 1,
      lifetime_spent = lifetime_spent + 1,
      updated_at = now()
  where user_id = p_user_id
    and balance > 0
  returning balance into v_balance;

  if v_balance is null then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  insert into public.cs_credit_ledger (
    user_id,
    direction,
    amount,
    reason,
    reference_type,
    reference_id,
    idempotency_key,
    meta
  )
  values (
    p_user_id,
    'debit',
    1,
    'generation',
    'generation_attempt',
    p_reference_id,
    p_idempotency_key,
    coalesce(p_meta, '{}'::jsonb)
  );

  return v_balance;
end;
$$;

-- 8) Credit grant function for webhook/admin integration
create or replace function public.cs_grant_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_reference_type text,
  p_reference_id text,
  p_idempotency_key text,
  p_meta jsonb default '{}'::jsonb
)
returns integer
language plpgsql
security definer
as $$
declare
  v_balance integer;
  v_existing integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'INVALID_IDEMPOTENCY_KEY';
  end if;

  select w.balance into v_existing
  from public.cs_credit_ledger l
  join public.cs_credit_wallets w on w.user_id = l.user_id
  where l.idempotency_key = p_idempotency_key
    and l.user_id = p_user_id
    and l.direction = 'credit'
  limit 1;

  if v_existing is not null then
    return v_existing;
  end if;

  insert into public.cs_credit_wallets (user_id, balance, lifetime_earned, lifetime_spent)
  values (p_user_id, 0, 0, 0)
  on conflict (user_id) do nothing;

  update public.cs_credit_wallets
  set balance = balance + p_amount,
      lifetime_earned = lifetime_earned + p_amount,
      updated_at = now()
  where user_id = p_user_id
  returning balance into v_balance;

  insert into public.cs_credit_ledger (
    user_id,
    direction,
    amount,
    reason,
    reference_type,
    reference_id,
    idempotency_key,
    meta
  )
  values (
    p_user_id,
    'credit',
    p_amount,
    p_reason,
    p_reference_type,
    p_reference_id,
    p_idempotency_key,
    coalesce(p_meta, '{}'::jsonb)
  );

  return v_balance;
end;
$$;

-- 9) Balance lookup helper
create or replace function public.cs_get_balance(p_user_id uuid)
returns integer
language sql
security definer
as $$
  select coalesce((select balance from public.cs_credit_wallets where user_id = p_user_id), 0);
$$;

-- 10) Resolve shared user by e-mail (case-insensitive)
create or replace function public.cs_resolve_user_id_by_email(p_email text)
returns uuid
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
begin
  if p_email is null or length(trim(p_email)) = 0 then
    raise exception 'INVALID_EMAIL';
  end if;

  select hu.id into v_user_id
  from public.hub_users hu
  where lower(hu.email) = lower(trim(p_email))
  limit 1;

  if v_user_id is null then
    raise exception 'HUB_USER_NOT_FOUND';
  end if;

  return v_user_id;
end;
$$;

-- 11) Webhook/admin helper: grant credits by e-mail
create or replace function public.cs_grant_credits_by_email(
  p_email text,
  p_amount integer,
  p_reason text,
  p_reference_type text,
  p_reference_id text,
  p_idempotency_key text,
  p_meta jsonb default '{}'::jsonb
)
returns integer
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
begin
  v_user_id := public.cs_resolve_user_id_by_email(p_email);

  return public.cs_grant_credits(
    v_user_id,
    p_amount,
    p_reason,
    p_reference_type,
    p_reference_id,
    p_idempotency_key,
    p_meta
  );
end;
$$;

-- 12) Backend helper: read balance by e-mail
create or replace function public.cs_get_balance_by_email(p_email text)
returns integer
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
begin
  v_user_id := public.cs_resolve_user_id_by_email(p_email);
  return public.cs_get_balance(v_user_id);
end;
$$;

-- 13) Optional RLS (commented until auth mapping is confirmed)
-- alter table public.cs_credit_wallets enable row level security;
-- create policy "cs_wallet_read_own_email"
-- on public.cs_credit_wallets
-- for select
-- to authenticated
-- using (
--   exists (
--     select 1
--     from public.hub_users hu
--     where hu.id = user_id
--       and lower(hu.email) = lower((auth.jwt() ->> 'email'))
--   )
-- );
