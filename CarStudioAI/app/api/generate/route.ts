import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { BACKGROUND_VARIANTS, PROMPT_BASE, type BackgroundId } from "@/lib/ai/backgrounds";
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
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
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

    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const hasCustomBackground = Boolean(body.customBackgroundBase64 && body.customBackgroundMimeType);
    const fullPrompt = `${PROMPT_BASE}\n\n${hasCustomBackground ? "Use a imagem de fundo personalizada enviada pelo usuário como cenário principal." : variant.promptSuffix}`;

    const parts: Array<{ inlineData: { data: string; mimeType: string } } | { text: string }> = [
      {
        inlineData: {
          data: body.base64Image.split(",")[1] ?? body.base64Image,
          mimeType: body.mimeType,
        },
      },
    ];

    if (hasCustomBackground && body.customBackgroundMimeType) {
      parts.push({
        inlineData: {
          data: body.customBackgroundBase64!.split(",")[1] ?? body.customBackgroundBase64!,
          mimeType: body.customBackgroundMimeType,
        },
      });
    }

    parts.push({ text: fullPrompt });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts,
      },
      config: {
        temperature: 0.3,
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) {
        return NextResponse.json({
          imageUrl: `data:image/png;base64,${part.inlineData.data}`,
          creditsBalance: balanceAfterDebit,
        });
      }

      if (part.text?.includes("Imagem inválida")) {
        const refundedBalance = await grantCreditByEmail(
          supabase,
          authResult.email,
          1,
          "refund",
          "generation_attempt",
          debitReference,
          refundKey,
          {
            reason: "invalid_vehicle_image",
          },
        );
        creditedBack = true;

        return NextResponse.json(
          {
            error: "A imagem enviada não parece ser de um veículo. Por favor, tente outra foto.",
            creditsBalance: refundedBalance,
          },
          { status: 400 },
        );
      }
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
        reason: "empty_ai_response",
      },
    );
    creditedBack = true;

    return NextResponse.json(
      {
        error: "Não foi possível gerar a imagem. Tente novamente.",
        creditsBalance: refundedBalance,
      },
      { status: 502 },
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
