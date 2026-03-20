import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { StudioApp } from "@/components/studio-app";
import {
  HUB_SESSION_COOKIE_NAME,
  verifyHubSessionToken,
} from "@/lib/auth/hub-handoff";

export default async function StudioPage() {
  const cookieStore = await cookies();
  const hubSessionCookie = cookieStore.get(HUB_SESSION_COOKIE_NAME)?.value;

  if (hubSessionCookie) {
    const hubSession = await verifyHubSessionToken(hubSessionCookie);
    if (hubSession?.email) {
      return <StudioApp />;
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    redirect("/api/auth/hub/start?redirect_to=%2Fstudio");
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

  if (!user) {
    redirect("/api/auth/hub/start?redirect_to=%2Fstudio");
  }

  return <StudioApp />;
}
