export const PROMPT_BASE = `Você é um especialista em edição e fotografia automotiva.
Sua função é realizar uma substituição de fundo (background replacement) perfeita, mantendo a integridade absoluta do veículo original.

Regras CRÍTICAS de preservação:
1. O veículo deve ser tratado como um "recorte" da foto original.
2. Preserve EXATAMENTE a pintura, incluindo cada risco, amassado, sujeira ou imperfeição real.
3. NÃO remova defeitos, NÃO faça polimento digital e NÃO "embeleze" o carro.
4. NÃO altere rodas, faróis, acessórios, placa ou qualquer detalhe estrutural.
5. NÃO recrie ou re-imagine partes do carro; use o que está na imagem original.

Processo:
- Remova o fundo original da imagem enviada.
- Insira o veículo (sem nenhuma alteração) no novo cenário solicitado.
- Ajuste apenas a iluminação global e reflexos sutis para que o carro pareça estar naturalmente no novo ambiente, mas sem alterar sua cor ou estado.
- Aplique uma sombra de contato realista sob os pneus, integrada ao novo piso.
- Mantenha a proporção, perspectiva e ângulo originais do veículo.

Se a imagem não for claramente um carro, responda apenas: "Imagem inválida para processamento automotivo."`;

export const BACKGROUND_VARIANTS = {
  white: {
    id: "white",
    label: "Estúdio Branco",
    description: "Fundo infinito branco clássico para destaque total do veículo.",
    images: ["https://i.postimg.cc/3xM88M5C/fundo-branco-studio.png"],
    promptSuffix: "Use o estúdio branco fornecido.",
  },
  dark: {
    id: "dark",
    label: "Estúdio Dark Premium",
    description: "Ambiente escuro e sofisticado com iluminação dramática.",
    images: ["https://i.postimg.cc/qvBKGCqG/fundo-escuro.png"],
    promptSuffix: "Use o showroom escuro fornecido.",
  },
  industrial: {
    id: "industrial",
    label: "Galpão Industrial",
    description: "Estilo urbano com texturas de concreto e luz natural.",
    images: [
      "https://i.postimg.cc/FHtrrt5Z/fundo-industrial1.jpg",
      "https://i.postimg.cc/2SpkkpRG/fundo-industrial2.jpg",
      "https://i.postimg.cc/rw6VV6XQ/fundo-industrial3.jpg"
    ],
    promptSuffix: "Use o galpão industrial fornecido.",
  },
  farm: {
    id: "farm",
    label: "Off-Road / Rural",
    description: "Cenário de fazenda ideal para SUVs e picapes.",
    images: ["https://i.postimg.cc/gkb8x2hq/fundo-fazenda.png"],
    promptSuffix: "Use o cenário rural fornecido.",
  },
  condo: {
    id: "condo",
    label: "Condomínio Luxo",
    description: "Ambiente residencial limpo e arborizado.",
    images: ["https://i.postimg.cc/QdL88LGR/fundo-condominio.png"],
    promptSuffix: "Use o cenário de condomínio fornecido.",
  },
} as const;

export type BackgroundId = keyof typeof BACKGROUND_VARIANTS;
