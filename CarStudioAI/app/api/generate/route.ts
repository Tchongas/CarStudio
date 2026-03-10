import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { BACKGROUND_VARIANTS, PROMPT_BASE, type BackgroundId } from "@/lib/ai/backgrounds";

type GenerateBody = {
  base64Image?: string;
  mimeType?: string;
  background?: BackgroundId;
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

  try {
    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const fullPrompt = `${PROMPT_BASE}\n\n${variant.promptSuffix}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [
          {
            inlineData: {
              data: body.base64Image.split(",")[1] ?? body.base64Image,
              mimeType: body.mimeType,
            },
          },
          { text: fullPrompt },
        ],
      },
      config: {
        temperature: 0.3,
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) {
        return NextResponse.json({ imageUrl: `data:image/png;base64,${part.inlineData.data}` });
      }

      if (part.text?.includes("Imagem inválida")) {
        return NextResponse.json(
          { error: "A imagem enviada não parece ser de um veículo. Por favor, tente outra foto." },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(
      { error: "Não foi possível gerar a imagem. Tente novamente." },
      { status: 502 },
    );
  } catch (error) {
    console.error("Error processing image:", error);
    return NextResponse.json(
      { error: "Erro ao conectar com o serviço de IA. Verifique sua conexão." },
      { status: 500 },
    );
  }
}
