import "server-only";

import { createServerClient } from "@supabase/ssr";
import { type User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerSupabaseServiceClient } from "@/lib/supabase/server";
import { getAuthenticatedEmail, normalizeEmail } from "@/lib/credits/server";

export function getAdminEmailAllowlist() {
  const raw = process.env.CAR_STUDIO_ADMIN_EMAILS ?? "";

  return raw
    .split(",")
    .map((item) => normalizeEmail(item))
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined) {
  if (!email) {
    return false;
  }

  return getAdminEmailAllowlist().includes(normalizeEmail(email));
}

function isGoogleUser(user: User | null) {
  if (!user) {
    return false;
  }

  const provider = typeof user.app_metadata?.provider === "string"
    ? user.app_metadata.provider.toLowerCase()
    : "";

  const providers = Array.isArray(user.app_metadata?.providers)
    ? user.app_metadata.providers.map((item) => String(item).toLowerCase())
    : [];

  return provider === "google" || providers.includes("google");
}

export async function requireAdminRequest(request: Request) {
  const supabase = createServerSupabaseServiceClient();
  const authResult = await getAuthenticatedEmail(request, supabase);

  if (!authResult.email) {
    return { ok: false as const, status: 401, error: "Faça login com Google para acessar a área administrativa." };
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return { ok: false as const, status: 401, error: "Sessão administrativa inválida. Entre novamente com Google." };
  }

  const { data, error } = await supabase.auth.getUser(token);
  const user = data.user ?? null;

  if (error || !user || !isGoogleUser(user)) {
    return { ok: false as const, status: 403, error: "A área administrativa requer login via Google." };
  }

  if (!isAdminEmail(authResult.email)) {
    return { ok: false as const, status: 403, error: "Você não tem permissão para acessar a área administrativa." };
  }

  return {
    ok: true as const,
    email: normalizeEmail(authResult.email),
    supabase,
  };
}

export async function requireAdminPageAccess() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    redirect("/");
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email ? normalizeEmail(user.email) : null;

  if (!user || !email || !isGoogleUser(user)) {
    redirect("/api/auth/google?redirect_to=%2Fadmin&force_supabase=1");
  }

  if (!isAdminEmail(email)) {
    redirect("/studio");
  }

  return {
    email,
  };
}
