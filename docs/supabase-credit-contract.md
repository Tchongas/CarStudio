# Contrato Proposto - Créditos e Auth (Supabase Compartilhado)

> Documento de alinhamento para integração definitiva quando os detalhes da DB compartilhada forem disponibilizados.

## Requisitos de produto refletidos
- Auth via Supabase com Google e E-mail.
- E-mails são os mesmos usuários do ecossistema Hotmart.
- Cada geração consome 1 crédito.
- Conta nova deve iniciar com 2 créditos.
- Sem crédito => não gera imagem.
- Header sempre exibe créditos.

## Proposta de modelo mínimo (referência)

### Tabela de créditos por usuário
```sql
create table if not exists public.user_credits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  credits integer not null default 2,
  updated_at timestamptz not null default now()
);
```

### Trigger de bootstrap de crédito
```sql
create or replace function public.handle_new_user_credits()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.user_credits (user_id, credits)
  values (new.id, 2)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created_credits
after insert on auth.users
for each row execute function public.handle_new_user_credits();
```

## Operação segura de consumo (atomicidade)

### RPC recomendada
```sql
create or replace function public.consume_credit(p_user_id uuid)
returns integer
language plpgsql
security definer
as $$
declare
  v_credits integer;
begin
  update public.user_credits
  set credits = credits - 1,
      updated_at = now()
  where user_id = p_user_id
    and credits > 0
  returning credits into v_credits;

  if v_credits is null then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  return v_credits;
end;
$$;
```

## Fluxo backend recomendado no projeto `/carstudioAI`
1. Validar sessão do usuário no servidor.
2. Executar `consume_credit(user_id)` antes de chamar Gemini.
3. Se sem crédito, retornar `403` com mensagem amigável.
4. Se gerar imagem com sucesso, responder imagem + novo saldo.
5. Exibir saldo atualizado no header.

## Políticas (RLS) esperadas
- Usuário só pode ler seu próprio saldo.
- Escrita direta bloqueada para client.
- Consumo deve ocorrer por RPC segura no backend.

## Variáveis de ambiente já previstas
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY`

## Status atual
- Auth UI já habilitada no app.
- Bloqueio por créditos já habilitado.
- Falta ligar o consumo/leitura ao Supabase compartilhado assim que o contrato real for entregue.
