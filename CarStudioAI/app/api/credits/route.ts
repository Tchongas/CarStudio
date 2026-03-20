import { NextResponse } from "next/server";
import {
  getAuthenticatedEmail,
  getBalanceByEmail,
  isHubUserNotFoundError,
} from "@/lib/credits/server";
import { createServerSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = createServerSupabaseServiceClient();
    const authResult = await getAuthenticatedEmail(request, supabase);

    if (!authResult.email) {
      return NextResponse.json(
        { error: "Faça login para consultar seus créditos." },
        { status: 401 },
      );
    }

    const balance = await getBalanceByEmail(supabase, authResult.email);

    return NextResponse.json({ creditsBalance: Math.max(balance, 0) });
  } catch (error) {
    if (isHubUserNotFoundError(error)) {
      return NextResponse.json(
        { error: "Sua conta ainda não está sincronizada na área de membros." },
        { status: 403 },
      );
    }

    console.error("Error loading credits:", error);
    return NextResponse.json(
      { error: "Não foi possível carregar seus créditos." },
      { status: 500 },
    );
  }
}
