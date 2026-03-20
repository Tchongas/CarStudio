import { NextResponse } from "next/server";
import { BACKGROUND_VARIANTS, type BackgroundId } from "@/lib/ai/backgrounds";
import { generateCarStudioImage } from "@/lib/ai/gemini-service";
import {
  consumeCreditByEmail,
  getAuthenticatedEmail,
  grantCreditByEmail,
  isHubUserNotFoundError,
  isInsufficientCreditsError,
} from "@/lib/credits/server";
import { createServerSupabaseServiceClient } from "@/lib/supabase/server";

type GenerateBody = {
  base64Image?: string;
  mimeType?: string;
  background?: BackgroundId;
  customBackgroundBase64?: string | null;
  customBackgroundMimeType?: string | null;
  requestId?: string;
};

export async function POST(request: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY não configurada no servidor." },
      { status: 500 },
    );
  }

  const body = (await request.json()) as GenerateBody;
  if (!body.base64Image || !body.mimeType || !body.background) {
    return NextResponse.json(
      { error: "Dados inválidos para processar imagem." },
      { status: 400 },
    );
  }

  const variant = BACKGROUND_VARIANTS[body.background];
  if (!variant) {
    return NextResponse.json({ error: "Fundo inválido." }, { status: 400 });
  }

  const supabase = createServerSupabaseServiceClient();
  const authResult = await getAuthenticatedEmail(request, supabase);

  if (!authResult.email) {
    return NextResponse.json({ error: "Faça login para gerar imagens." }, { status: 401 });
  }

  const requestId = typeof body.requestId === "string" && body.requestId.trim().length > 0
    ? body.requestId.trim()
    : crypto.randomUUID();

  const debitKey = `cs:generate:${requestId}`;
  const debitReference = `cs-generate:${requestId}`;
  const refundKey = `cs:refund:${requestId}`;

  let creditedBack = false;
  let debitApplied = false;

  try {
    const balanceAfterDebit = await consumeCreditByEmail(
      supabase,
      authResult.email,
      debitKey,
      debitReference,
      {
        background: body.background,
      },
    );
    debitApplied = true;

    const result = await generateCarStudioImage({
      base64Image: body.base64Image,
      mimeType: body.mimeType,
      backgroundId: body.background,
      customBackgroundBase64: body.customBackgroundBase64,
      customBackgroundMimeType: body.customBackgroundMimeType,
    });

    if (result.imageUrl) {
      return NextResponse.json({
        imageUrl: result.imageUrl,
        creditsBalance: balanceAfterDebit,
      });
    }

    const refundedBalance = await grantCreditByEmail(
      supabase,
      authResult.email,
      1,
      "refund",
      "generation_attempt",
      debitReference,
      refundKey,
      {
        reason: result.error === "A imagem enviada não parece ser de um veículo. Por favor, tente outra foto."
          ? "invalid_vehicle_image"
          : "empty_ai_response",
      },
    );
    creditedBack = true;

    return NextResponse.json(
      {
        error: result.error,
        creditsBalance: refundedBalance,
      },
      {
        status: result.error === "A imagem enviada não parece ser de um veículo. Por favor, tente outra foto." ? 400 : 502,
      },
    );
  } catch (error) {
    if (isInsufficientCreditsError(error)) {
      return NextResponse.json(
        { error: "Você não tem créditos suficientes para gerar imagens." },
        { status: 403 },
      );
    }

    if (isHubUserNotFoundError(error)) {
      return NextResponse.json(
        { error: "Sua conta ainda não está sincronizada na área de membros. Tente novamente em instantes." },
        { status: 403 },
      );
    }

    if (debitApplied && !creditedBack) {
      try {
        await grantCreditByEmail(
          supabase,
          authResult.email,
          1,
          "refund",
          "generation_attempt",
          debitReference,
          refundKey,
          {
            reason: "unexpected_error",
          },
        );
      } catch (refundError) {
        console.error("Refund failed:", refundError);
      }
    }

    console.error("Error processing image:", error);
    return NextResponse.json(
      { error: "Erro ao conectar com o serviço de IA. Verifique sua conexão." },
      { status: 500 },
    );
  }
}
