/**
 * Cliente Supabase para uso no servidor (server-side only).
 *
 * IMPORTANTE: Este cliente usa a SERVICE ROLE KEY que tem acesso total ao banco.
 * NUNCA use este cliente no browser ou exponha a SERVICE_ROLE_KEY no frontend.
 *
 * Use este cliente para:
 * - Operações administrativas (consultar/ajustar saldo de créditos)
 * - Operações que precisam ignorar RLS (Row Level Security)
 * - Chamadas RPC que requerem privilégios elevados
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function createServerSupabaseServiceClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Supabase server variables are not configured.");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
