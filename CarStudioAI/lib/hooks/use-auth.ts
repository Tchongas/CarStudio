"use client";

import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type AuthState = {
  user: { email: string } | null;
  isLoading: boolean;
  accessToken: string | null;
};

/**
 * Hook that manages Supabase auth state.
 * Returns the current user, loading state, access token getter, and logout fn.
 */
export function useAuth() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    accessToken: null,
  });

  const getAccessToken = useCallback(async () => {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, [supabase]);

  const logout = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setState({ user: null, isLoading: false, accessToken: null });
    window.location.href = "/";
  }, [supabase]);

  useEffect(() => {
    if (!supabase) {
      setState((s) => ({ ...s, isLoading: false }));
      return;
    }

    supabase.auth.getUser().then(({ data }: { data: { user: User | null } }) => {
      const email = data.user?.email;
      setState((s) => ({
        ...s,
        user: email ? { email } : null,
        isLoading: false,
      }));
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        const email = session?.user?.email;
        setState({
          user: email ? { email } : null,
          isLoading: false,
          accessToken: session?.access_token ?? null,
        });
      },
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  return {
    user: state.user,
    isLoading: state.isLoading,
    supabase,
    getAccessToken,
    logout,
  };
}
