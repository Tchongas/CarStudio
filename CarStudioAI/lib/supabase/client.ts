/**
 * Cliente Supabase para uso no browser (client-side).
 *
 * Este cliente usa a ANON KEY que é segura para expor no frontend.
 * Ele gerencia automaticamente:
 * - Persistência de sessão (cookies)
 * - Refresh automático do token
 * - Detecção de sessão na URL (após OAuth callback)
 *
 * Use este cliente em componentes React para:
 * - Login/logout do usuário
 * - Obter dados da sessão atual
 * - Escutar mudanças de estado de autenticação
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function createBrowserSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}
