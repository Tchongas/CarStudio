/**
 * Constantes da carteira de créditos do Car Studio.
 * Devem corresponder aos valores em credit_wallet_definitions e no catálogo de créditos do Hub.
 *
 * Convenções usadas:
 * - CS_WALLET_KEY: chave única da carteira no banco (usada em todas as tabelas)
 * - CS_WALLET_CODE: código curto para identificação
 * - CS_PRODUCT_ID: ID do produto no sistema Hotmart/Hub
 *
 * Esses valores são usados em:
 * - user_credit_wallets (saldo do usuário)
 * - credit_ledger (histórico de transações)
 * - credit_wallet_definitions (catálogo de carteiras)
 */

export const CS_WALLET_KEY = "car_studio" as const;
export const CS_WALLET_CODE = "CS" as const;
export const CS_PRODUCT_ID = "car-studio" as const;

/**
 * Allowed reason values (enforced by credit_ledger_reason_check constraint).
 */
export type CreditReason =
  | "purchase"
  | "manual_grant"
  | "generation"
  | "refund"
  | "reversal"
  | "adjustment"
  | "initial_balance";

/**
 * Allowed reference_type values (enforced by cs_credit_ledger CHECK constraint).
 */
export type CreditReferenceType =
  | "webhook_event"
  | "generation_attempt"
  | "admin"
  | "migration"
  | "bootstrap";

/**
 * Build canonical wallet meta for RPC calls.
 * grant_credits and spend_credits extract wallet_key from p_meta.
 */
export function buildWalletMeta(extra: Record<string, unknown> = {}) {
  return {
    wallet_key: CS_WALLET_KEY,
    wallet_code: CS_WALLET_CODE,
    product_id: CS_PRODUCT_ID,
    ...extra,
  };
}
