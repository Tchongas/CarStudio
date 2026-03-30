# Admin Credits Dashboard

## Objetivo

A área `/admin` permite consultar e ajustar o saldo de créditos de um usuário do Car Studio AI sem alterar a wallet diretamente. Todo ajuste gera movimentação via ledger usando os RPCs `cs_grant_credits` e `cs_spend_credits` com `reference_type = 'admin'`.

## Segurança

- A página `/admin` exige sessão autenticada.
- O acesso só é liberado para usuários autenticados com Google.
- O e-mail autenticado precisa existir na env `CAR_STUDIO_ADMIN_EMAILS`.
- As rotas `/api/admin/credits` repetem a validação no servidor.
- As rotas exigem bearer token válido do Supabase para confirmar que o provider autenticado é Google.

## Env necessária

```env
CAR_STUDIO_ADMIN_EMAILS=admin1@email.com,admin2@email.com
```

## Fluxo

1. O admin entra com Google.
2. A página `/admin` valida se o e-mail está na allowlist.
3. O dashboard consulta o saldo atual por e-mail.
4. Ao salvar um novo saldo, o sistema calcula a diferença para o saldo atual.
5. Se a diferença for positiva, usa `cs_grant_credits`.
6. Se a diferença for negativa, usa `cs_spend_credits`.
7. O ajuste fica registrado no ledger com metadados de admin, saldo anterior e saldo alvo.

## Observações

- O saldo alvo é normalizado para inteiro maior ou igual a zero.
- Ajustes sem mudança de saldo não criam nova movimentação.
- Usuários fora da base compartilhada retornam erro de usuário não encontrado.
