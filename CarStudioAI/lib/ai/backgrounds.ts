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
    label: "Fundo Branco Clean",
    description: "Estúdio profissional com fundo infinito branco e iluminação suave.",
    promptSuffix:
      "Cenário desejado: Estúdio fotográfico profissional com fundo infinito branco, iluminação de softbox, reflexos controlados e sombra de contato realista no chão.",
  },
  dark: {
    id: "dark",
    label: "Showroom Escuro Premium",
    description: "Ambiente luxuoso com iluminação dramática e tons escuros.",
    promptSuffix:
      "Cenário desejado: Showroom automotivo premium com paredes escuras, piso de concreto polido refletivo, iluminação dramática de teto (rim light) e atmosfera sofisticada.",
  },
  industrial: {
    id: "industrial",
    label: "Industrial Moderno",
    description: "Galpão moderno com texturas de concreto e luz natural.",
    promptSuffix:
      "Cenário desejado: Galpão industrial moderno e limpo, paredes de concreto aparente, janelas amplas com luz natural difusa, ambiente urbano e contemporâneo.",
  },
  farm: {
    id: "farm",
    label: "Fazenda & Natureza",
    description: "Cenário rural ideal para caminhonetes e off-road.",
    promptSuffix:
      "Cenário desejado: Estrada de terra batida em uma fazenda ao entardecer, cercas de madeira, grama verde, árvores ao fundo e luz solar dourada (golden hour) criando reflexos naturais na lataria.",
  },
  condo: {
    id: "condo",
    label: "Condomínio Residencial",
    description: "Rua sem saída com árvores e grama ao fundo.",
    promptSuffix:
      "Cenário desejado: Rua sem saída redonda (cul-de-sac) em um condomínio de luxo, asfalto limpo e preservado, calçadas com grama aparada, árvores ornamentais ao fundo e iluminação de dia claro.",
  },
} as const;

export type BackgroundId = keyof typeof BACKGROUND_VARIANTS;
