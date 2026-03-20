import { GoogleGenAI } from "@google/genai";
import { BACKGROUND_VARIANTS, PROMPT_BASE, type BackgroundId } from "@/lib/ai/backgrounds";

const GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image";
const INVALID_VEHICLE_TEXT = "Imagem inválida";

type GenerateCarStudioImageInput = {
  base64Image: string;
  mimeType: string;
  backgroundId: BackgroundId;
  customBackgroundBase64?: string | null;
  customBackgroundMimeType?: string | null;
};

type GenerateCarStudioImageResult =
  | {
      imageUrl: string;
      error?: never;
    }
  | {
      imageUrl?: never;
      error: string;
    };

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não configurada no servidor.");
  }

  return new GoogleGenAI({ apiKey });
}

function stripBase64Prefix(value: string) {
  return value.split(",")[1] ?? value;
}

function buildPrompt(backgroundId: BackgroundId, hasCustomBackground: boolean) {
  const variant = BACKGROUND_VARIANTS[backgroundId];

  if (!variant) {
    throw new Error("Fundo inválido.");
  }

  return `${PROMPT_BASE}\n\n${hasCustomBackground ? "Use a imagem de fundo personalizada enviada pelo usuário como cenário principal." : variant.promptSuffix}`;
}

export async function generateCarStudioImage({
  base64Image,
  mimeType,
  backgroundId,
  customBackgroundBase64,
  customBackgroundMimeType,
}: GenerateCarStudioImageInput): Promise<GenerateCarStudioImageResult> {
  const ai = getGeminiClient();
  const hasCustomBackground = Boolean(customBackgroundBase64 && customBackgroundMimeType);
  const prompt = buildPrompt(backgroundId, hasCustomBackground);

  const parts: Array<{ inlineData: { data: string; mimeType: string } } | { text: string }> = [
    {
      inlineData: {
        data: stripBase64Prefix(base64Image),
        mimeType,
      },
    },
  ];

  if (hasCustomBackground && customBackgroundMimeType) {
    parts.push({
      inlineData: {
        data: stripBase64Prefix(customBackgroundBase64!),
        mimeType: customBackgroundMimeType,
      },
    });
  }

  parts.push({ text: prompt });

  const response = await ai.models.generateContent({
    model: GEMINI_IMAGE_MODEL,
    contents: {
      parts,
    },
    config: {
      temperature: 0.3,
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts ?? []) {
    if (part.inlineData?.data) {
      return {
        imageUrl: `data:image/png;base64,${part.inlineData.data}`,
      };
    }

    if (part.text?.includes(INVALID_VEHICLE_TEXT)) {
      return {
        error: "A imagem enviada não parece ser de um veículo. Por favor, tente outra foto.",
      };
    }
  }

  return {
    error: "Não foi possível gerar a imagem. Tente novamente.",
  };
}
