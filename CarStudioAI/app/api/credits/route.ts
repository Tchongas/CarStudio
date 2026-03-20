import { NextResponse } from "next/server";
import {
  getAuthenticatedEmail,
  getBalanceByEmail,
  isHubUserNotFoundError,
} from "@/lib/credits/server";
import { createServerSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  console.log("Credits API: starting request");
  
  // Mock data for development testing
  if (process.env.NEXT_PUBLIC_SUPABASE_URL === "https://test.supabase.co") {
    console.log("Credits API: using mock data for development");
    return NextResponse.json({
      creditsBalance: 2,
      email: "test@example.com",
    });
  }
  
  try {
    const supabase = createServerSupabaseServiceClient();
    console.log("Credits API: supabase client created");
    const authResult = await getAuthenticatedEmail(request, supabase);
    console.log("Credits API: auth result", authResult);

    if (!authResult.email) {
      console.log("Credits API: no authenticated email");
      return NextResponse.json(
        { error: "Faça login para consultar seus créditos." },
        { status: 401 },
      );
    }

    console.log("Credits API: getting balance for email", authResult.email);
    const balance = await getBalanceByEmail(supabase, authResult.email);
    console.log("Credits API: balance retrieved", balance);

    return NextResponse.json({
      creditsBalance: Math.max(balance, 0),
      email: authResult.email,
    });
  } catch (error) {
    console.log("Credits API: caught error", error);
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
