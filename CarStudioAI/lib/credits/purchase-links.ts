/**
 * Links de compra de créditos via Hotmart.
 *
 * Como funciona:
 * - Usuário clica no link e é direcionado para checkout Hotmart
 * - Após pagamento aprovado, Hotmart envia webhook para a Área de Membros (Hub)
 * - O Hub processa o webhook e chama a função grant_credits() no Supabase
 * - Os créditos aparecem automaticamente na conta do usuário
 *
 * IMPORTANTE: Não modificar os IDs de checkout (T105074666S, etc.)
 * sem atualizar também o mapeamento no Hub, ou os webhooks falharão.
 */
export const CREDIT_PURCHASE_OPTIONS = [
  {
    credits: 50,
    href: "https://pay.hotmart.com/T105074666S",
    label: "Comprar 50 créditos",
  },
  {
    credits: 150,
    href: "https://pay.hotmart.com/T105074747H",
    label: "Comprar 150 créditos",
  },
  {
    credits: 400,
    href: "https://pay.hotmart.com/H105074788J",
    label: "Comprar 400 créditos",
  },
] as const;
