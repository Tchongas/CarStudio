import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin/auth";
import {
  getBalanceByEmail,
  isHubUserNotFoundError,
  normalizeEmail,
  setBalanceByEmail,
} from "@/lib/credits/server";

type UpdateBalanceBody = {
  email?: string;
  targetBalance?: number;
};

export async function GET(request: Request) {
  const admin = await requireAdminRequest(request);

  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const url = new URL(request.url);
  const email = url.searchParams.get("email");

  if (!email?.trim()) {
    return NextResponse.json({ error: "Informe o e-mail do usuário." }, { status: 400 });
  }

  try {
    const normalizedEmail = normalizeEmail(email);
    const creditsBalance = await getBalanceByEmail(admin.supabase, normalizedEmail);

    return NextResponse.json({
      email: normalizedEmail,
      creditsBalance: Math.max(creditsBalance, 0),
    });
  } catch (error) {
    if (isHubUserNotFoundError(error)) {
      return NextResponse.json({ error: "Usuário não encontrado na base compartilhada." }, { status: 404 });
    }

    console.error("Admin credits lookup error:", error);
    return NextResponse.json({ error: "Não foi possível consultar os créditos do usuário." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await requireAdminRequest(request);

  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const body = (await request.json()) as UpdateBalanceBody;
  const email = body.email?.trim();
  const targetBalance = body.targetBalance;

  if (!email) {
    return NextResponse.json({ error: "Informe o e-mail do usuário." }, { status: 400 });
  }

  if (typeof targetBalance !== "number" || Number.isNaN(targetBalance) || targetBalance < 0) {
    return NextResponse.json({ error: "Informe um saldo válido maior ou igual a zero." }, { status: 400 });
  }

  try {
    const referenceId = `admin-balance:${normalizeEmail(email)}:${Date.now()}`;
    const result = await setBalanceByEmail(
      admin.supabase,
      email,
      targetBalance,
      admin.email,
      referenceId,
    );

    return NextResponse.json({
      email: normalizeEmail(email),
      previousBalance: result.previousBalance,
      creditsBalance: Math.max(result.newBalance, 0),
      adjustmentAmount: result.adjustmentAmount,
    });
  } catch (error) {
    if (isHubUserNotFoundError(error)) {
      return NextResponse.json({ error: "Usuário não encontrado na base compartilhada." }, { status: 404 });
    }

    console.error("Admin credits update error:", error);
    return NextResponse.json({ error: "Não foi possível atualizar o saldo do usuário." }, { status: 500 });
  }
}
