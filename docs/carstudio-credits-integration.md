# Car Studio Credits Integration (App <-> Shared DB <-> Members Area)

## Objetivo
Documentar a integração do `/carstudioAI` com o padrão oficial do hub compartilhado:
- multi-wallet por `wallet_key`;
- funções canônicas (`grant_credits`, `spend_credits`);
- isolamento de créditos CS sem interferir em FM.

## Convenção de carteira CS
- `CODE`: `CS`
- `wallet_key`: `car_studio`
- `product_id`: `car-studio`

---

## Modelo SQL de referência
- Arquivo principal: `sql/carstudio-credit-wallet-hub.sql`
- Compatibilidade legada (temporária): `sql/carstudio-credit-wallet.sql`

### Objetos centrais do hub
1. `credit_wallet_definitions`
2. `user_credit_wallets` (PK: `user_id, wallet_key`)
3. `credit_ledger` (`wallet_key` + `idempotency_key`)
4. `grant_credits(...)`
5. `spend_credits(...)`

### Isolamento por carteira
Todos os grants/spends do Car Studio devem enviar no `p_meta`:

```json
{
  "wallet_key": "car_studio",
  "wallet_code": "CS",
  "product_id": "car-studio"
}
```

---

## Rotas internas no `/carstudioAI`

### `GET /api/credits`
- Arquivo: `carstudioAI/app/api/credits/route.ts`
- Fluxo:
  1. valida `Authorization: Bearer <access_token>`;
  2. resolve usuário por e-mail (`hub_users`);
  3. lê saldo de `user_credit_wallets` filtrando `wallet_key='car_studio'`;
  4. fallback controlado para helper legado `cs_get_balance_by_email` caso padrão novo ainda não esteja aplicado.

### `POST /api/generate`
- Arquivo: `carstudioAI/app/api/generate/route.ts`
- Fluxo:
  1. valida sessão;
  2. consome crédito com `spend_credits` + `wallet_key='car_studio'`;
  3. gera imagem no Gemini;
  4. se falhar, estorna 1 crédito com `grant_credits` (`reason='refund'`);
  5. retorna `creditsBalance` atualizado.

---

## Integração com Members Area

### Webhook de grants automáticos
Use RPC canônica `grant_credits`:

```ts
await supabase.rpc('grant_credits', {
  p_user_id: userId,
  p_amount: creditsAmount,
  p_reason: 'hotmart_purchase',
  p_reference_type: 'hotmart',
  p_reference_id: hotmartTransactionId,
  p_idempotency_key: `car_studio:${eventId}`,
  p_meta: {
    wallet_key: 'car_studio',
    wallet_code: 'CS',
    product_id: 'car-studio',
    source: 'hotmart',
    event_id: eventId,
    email,
  },
});
```

### Grants manuais (admin)
- `p_reason = 'manual_grant'`
- `p_reference_type = 'admin'`
- `p_reference_id = <ticket-or-operator-id>`
- `p_idempotency_key` único
- `p_meta.wallet_key = 'car_studio'`

---

## Segurança
1. `SUPABASE_SERVICE_ROLE_KEY` apenas no backend.
2. Preferir `EXECUTE` apenas para `service_role` nas funções de créditos.
3. Nunca escrever saldo direto pelo frontend.
4. Toda operação de saldo via backend/API.

---

## Regras de operação confirmadas
1. Toda conta começa com saldo inicial `2` na carteira CS.
2. Identidade por e-mail autenticado (Google/e-mail auth).
3. Grants automáticos vêm do Members Area na mesma DB.
4. Grants manuais administrativos são obrigatórios.
