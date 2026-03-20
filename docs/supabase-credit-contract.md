# Contrato Car Studio - Padrão Oficial de Créditos no Hub Compartilhado

> Este documento está alinhado ao template oficial de créditos da base compartilhada (modelo multi-wallet com `wallet_key`).

## Convenção adotada para Car Studio
- `CODE`: `CS`
- `wallet_key`: `car_studio`
- `product_id`: `car-studio`

## Princípios do hub (obrigatórios)
1. Isolamento por carteira (`wallet_key`) dentro de tabelas compartilhadas.
2. Sem mistura de saldo entre produtos (FM, CS, etc.).
3. Fluxos de grant/spend via funções canônicas com idempotência.
4. Identidade do usuário por `hub_users` (resolvida por e-mail autenticado).

## Modelo padrão (hub)
- `public.credit_wallet_definitions`
  - catálogo de carteiras por produto.
- `public.user_credit_wallets`
  - saldo por `(user_id, wallet_key)`.
- `public.credit_ledger`
  - ledger compartilhado com `wallet_key` e `idempotency_key`.
- `public.grant_credits(...)`
  - crédito atômico/idempotente.
- `public.spend_credits(...)`
  - débito atômico/idempotente.

## Arquivo SQL recomendado
- `sql/carstudio-credit-wallet-hub.sql`

Esse arquivo já inclui:
- criação/ajuste idempotente das estruturas padrão do hub;
- registro da carteira CS em `credit_wallet_definitions`;
- funções canônicas (`grant_credits`, `spend_credits`) + helper de resolução por e-mail;
- backfill para garantir saldo inicial 2 em `wallet_key='car_studio'`;
- views opcionais `CS_credit_ledger` e `CS_user_credit_wallets`.

## Compatibilidade com ambiente legado
- O backend do app foi adaptado para priorizar funções canônicas (`spend_credits` / `grant_credits`) com `wallet_key` no `p_meta`.
- Caso o ambiente ainda não tenha as funções canônicas aplicadas, há fallback controlado para wrappers `cs_*` já existentes.

## Fluxo backend no `/carstudioAI`
1. Validar sessão do usuário no servidor.
2. Resolver `hub_users.id` por e-mail autenticado.
3. Consumir crédito com `spend_credits(...)` e `p_meta.wallet_key='car_studio'`.
4. Se sem saldo, responder `403`.
5. Em falha de geração, estornar com `grant_credits(...)` (`reason='refund'`).
6. Retornar saldo atualizado para o header.

## Grants (Members Area)
- Grants automáticos: webhook do Members Area chamando `grant_credits(...)` com `wallet_key='car_studio'` no `p_meta`.
- Grants manuais: `reason='manual_grant'`, `reference_type='admin'`, `idempotency_key` único.

## Decisões de negócio confirmadas
1. Toda conta começa com saldo inicial 2 no Car Studio.
2. Vínculo de créditos por e-mail autenticado (Google/e-mail auth).
3. Grants automáticos vêm do Members Area na DB compartilhada.
4. Grants manuais administrativos são obrigatórios.
5. Nomenclatura `CS`/`car_studio` aprovada.
