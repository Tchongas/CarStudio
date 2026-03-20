/**
 * Car Studio credit wallet constants.
 * Must match the values in credit_wallet_definitions and the Hub credit catalog.
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
  | "adjustment";

/**
 * Allowed reference_type values (enforced by credit_ledger_reference_type_check constraint).
 */
export type CreditReferenceType =
  | "webhook_event"
  | "generation_attempt"
  | "admin";

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
