import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { HUB_SESSION_COOKIE_NAME, verifyHubSessionToken } from "@/lib/auth/hub-handoff";
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

export async function requireAdminRequest(request: Request) {
  const supabase = createServerSupabaseServiceClient();
  const authResult = await getAuthenticatedEmail(request, supabase);

  if (!authResult.email) {
    return { ok: false as const, status: 401, error: "Faça login para acessar a área administrativa." };
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
  const hubSessionCookie = cookieStore.get(HUB_SESSION_COOKIE_NAME)?.value;

  if (hubSessionCookie) {
    const hubSession = await verifyHubSessionToken(hubSessionCookie);
    const hubEmail = hubSession?.email ? normalizeEmail(hubSession.email) : null;

    if (hubEmail && isAdminEmail(hubEmail)) {
      return {
        email: hubEmail,
      };
    }
  }

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

  if (!user || !email) {
    redirect("/api/auth/google?redirect_to=%2Fadmin&force_supabase=1");
  }

  if (!isAdminEmail(email)) {
    redirect("/studio");
  }

  return {
    email,
  };
}
