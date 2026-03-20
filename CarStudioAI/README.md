# Car Studio AI (Produção)

Projeto Next.js para transformar fotos de veículos em imagens com aparência de estúdio profissional.

## Rodando localmente

1. Copie `.env.example` para `.env.local`
2. Configure as variáveis:
   - `GEMINI_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Instale dependências:
   - `npm install`
4. Rode em desenvolvimento:
   - `npm run dev`

## Funcionalidades implementadas

- Layout e componentes migrados da demo para Next.js App Router.
- Upload de imagem + seleção de fundo + geração de imagem + download.
- Endpoint server-side para Gemini (`/api/generate`) sem expor chave no browser.
- Base de autenticação Supabase com Google e Email (magic link).
- Leitura de créditos server-side via `GET /api/credits` usando token de sessão.
- Consumo atômico de crédito no `POST /api/generate` via funções `cs_*` no Supabase compartilhado.
- Atualização de saldo no header com retorno real da API.

## Próximo passo obrigatório

Aplicar o SQL do contrato `cs_*` no Supabase compartilhado e configurar permissões de `service_role` para as funções de crédito (documentado em `/docs`).
