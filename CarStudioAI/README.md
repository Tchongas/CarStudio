# Car Studio AI (Produção)

Projeto Next.js para transformar fotos de veículos em imagens com aparência de estúdio profissional.

## Rodando localmente

1. Copie `.env.example` para `.env.local`
2. Configure as variáveis:
   - `GEMINI_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Instale dependências:
   - `npm install`
4. Rode em desenvolvimento:
   - `npm run dev`

## Funcionalidades implementadas

- Layout e componentes migrados da demo para Next.js App Router.
- Upload de imagem + seleção de fundo + geração de imagem + download.
- Endpoint server-side para Gemini (`/api/generate`) sem expor chave no browser.
- Base de autenticação Supabase com Google e Email (magic link).
- Controle inicial de créditos no cliente (2 créditos iniciais) com bloqueio quando zerar.

## Próximo passo obrigatório

Integrar a leitura/escrita de créditos na base Supabase compartilhada (documentado em `/docs`).
