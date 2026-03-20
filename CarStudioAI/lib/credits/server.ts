import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CS_WALLET_KEY,
  buildWalletMeta,
  type CreditReason,
  type CreditReferenceType,
} from "./constants";

type RpcResultRow = {
  new_balance?: number;
  ledger_id?: string;
};

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

function extractBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

export async function getAuthenticatedEmail(request: Request, supabase: SupabaseClient) {
  const token = extractBearerToken(request);
  if (!token) {
    return { email: null, error: "MISSING_AUTH" } as const;
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error) {
    return { email: null, error: "INVALID_AUTH" } as const;
  }

  const email = data.user?.email?.trim().toLowerCase() ?? null;
  if (!email) {
    return { email: null, error: "MISSING_EMAIL" } as const;
  }

  return { email, error: null } as const;
}

// ---------------------------------------------------------------------------
// User resolution (email → hub_users.id)
// ---------------------------------------------------------------------------

async function resolveUserIdByEmail(supabase: SupabaseClient, email: string): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase();

  const { data, error } = await supabase.rpc("cs_resolve_user_id_by_email", {
    p_email: normalizedEmail,
  });

  if (!error && data) {
    return String(data);
  }

  if (error) {
    throw error;
  }

  throw new Error("HUB_USER_NOT_FOUND");
}

// ---------------------------------------------------------------------------
// Balance
// ---------------------------------------------------------------------------

export async function getBalanceByEmail(supabase: SupabaseClient, email: string) {
  const userId = await resolveUserIdByEmail(supabase, email);

  const { data, error } = await supabase
    .from("user_credit_wallets")
    .select("balance")
    .eq("user_id", userId)
    .eq("wallet_key", CS_WALLET_KEY)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Number(data?.balance ?? 0);
}

// ---------------------------------------------------------------------------
// Spend (debit 1 credit for generation)
// ---------------------------------------------------------------------------

export async function consumeCreditByEmail(
  supabase: SupabaseClient,
  email: string,
  idempotencyKey: string,
  referenceId: string,
  meta: Record<string, unknown>,
) {
  const userId = await resolveUserIdByEmail(supabase, email);

  const { data, error } = await supabase.rpc("spend_credits", {
    p_user_id: userId,
    p_amount: 1,
    p_reason: "generation" satisfies CreditReason,
    p_reference_type: "generation_attempt" satisfies CreditReferenceType,
    p_reference_id: referenceId,
    p_idempotency_key: idempotencyKey,
    p_meta: buildWalletMeta(meta),
  });

  if (error) {
    throw error;
  }

  return extractNewBalance(data);
}

// ---------------------------------------------------------------------------
// Grant (refunds, purchases, admin)
// ---------------------------------------------------------------------------

export async function grantCreditByEmail(
  supabase: SupabaseClient,
  email: string,
  amount: number,
  reason: CreditReason,
  referenceType: CreditReferenceType,
  referenceId: string,
  idempotencyKey: string,
  meta: Record<string, unknown>,
) {
  const userId = await resolveUserIdByEmail(supabase, email);

  const { data, error } = await supabase.rpc("grant_credits", {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason,
    p_reference_type: referenceType,
    p_reference_id: referenceId,
    p_idempotency_key: idempotencyKey,
    p_meta: buildWalletMeta(meta),
  });

  if (error) {
    throw error;
  }

  return extractNewBalance(data);
}

// ---------------------------------------------------------------------------
// Error detection helpers
// ---------------------------------------------------------------------------

export function isInsufficientCreditsError(error: unknown) {
  if (!error || typeof error !== "object" || !("message" in error)) {
    return false;
  }

  const message = String(error.message).toLowerCase();
  return message.includes("insufficient_credits") || message.includes("insufficient credits");
}

export function isHubUserNotFoundError(error: unknown) {
  if (!error || typeof error !== "object" || !("message" in error)) {
    return false;
  }

  return String(error.message).includes("HUB_USER_NOT_FOUND");
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function extractNewBalance(data: unknown) {
  if (Array.isArray(data) && data.length > 0) {
    const row = data[0] as RpcResultRow;
    return Number(row.new_balance ?? 0);
  }

  if (data && typeof data === "object" && "new_balance" in data) {
    const row = data as RpcResultRow;
    return Number(row.new_balance ?? 0);
  }

  return 0;
}
