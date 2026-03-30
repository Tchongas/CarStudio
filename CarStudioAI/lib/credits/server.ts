import type { SupabaseClient } from "@supabase/supabase-js";
import { getHubSessionFromRequest } from "@/lib/auth/hub-handoff";
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

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

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

  if (token) {
    const { data, error } = await supabase.auth.getUser(token);
    if (!error) {
      const email = data.user?.email?.trim().toLowerCase() ?? null;
      if (email) {
        return { email, error: null } as const;
      }
    }
  }

  const hubSession = await getHubSessionFromRequest(request);
  if (hubSession?.email) {
    return { email: hubSession.email, error: null } as const;
  }

  if (token) {
    return { email: null, error: "INVALID_AUTH" } as const;
  }

  return { email: null, error: "MISSING_AUTH" } as const;
}

// ---------------------------------------------------------------------------
// User resolution (email → hub_users.id)
// ---------------------------------------------------------------------------

async function resolveUserIdByEmail(supabase: SupabaseClient, email: string): Promise<string> {
  const normalizedEmail = normalizeEmail(email);

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
    .from("cs_user_wallets")
    .select("balance")
    .eq("user_id", userId)
    .eq("wallet_key", CS_WALLET_KEY)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Number(data?.balance ?? 0);
}

export async function setBalanceByEmail(
  supabase: SupabaseClient,
  email: string,
  targetBalance: number,
  adminEmail: string,
  referenceId: string,
) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedAdminEmail = normalizeEmail(adminEmail);
  const safeTargetBalance = Math.max(0, Math.trunc(targetBalance));
  const currentBalance = await getBalanceByEmail(supabase, normalizedEmail);
  const delta = safeTargetBalance - currentBalance;

  if (delta === 0) {
    return {
      previousBalance: currentBalance,
      newBalance: currentBalance,
      adjustmentAmount: 0,
    };
  }

  const userId = await resolveUserIdByEmail(supabase, normalizedEmail);
  const idempotencyKey = `cs:admin-balance:${referenceId}`;
  const meta = buildWalletMeta({
    target_balance: safeTargetBalance,
    previous_balance: currentBalance,
    admin_email: normalizedAdminEmail,
    target_email: normalizedEmail,
  });

  if (delta > 0) {
    const { data, error } = await supabase.rpc("cs_grant_credits", {
      p_user_id: userId,
      p_amount: delta,
      p_reason: "adjustment" satisfies CreditReason,
      p_reference_type: "admin" satisfies CreditReferenceType,
      p_reference_id: referenceId,
      p_idempotency_key: idempotencyKey,
      p_meta: meta,
    });

    if (error) {
      throw error;
    }

    return {
      previousBalance: currentBalance,
      newBalance: extractNewBalance(data),
      adjustmentAmount: delta,
    };
  }

  const { data, error } = await supabase.rpc("cs_spend_credits", {
    p_user_id: userId,
    p_amount: Math.abs(delta),
    p_reason: "adjustment" satisfies CreditReason,
    p_reference_type: "admin" satisfies CreditReferenceType,
    p_reference_id: referenceId,
    p_idempotency_key: idempotencyKey,
    p_meta: meta,
  });

  if (error) {
    throw error;
  }

  return {
    previousBalance: currentBalance,
    newBalance: extractNewBalance(data),
    adjustmentAmount: delta,
  };
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

  const { data, error } = await supabase.rpc("cs_spend_credits", {
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

  const { data, error } = await supabase.rpc("cs_grant_credits", {
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
