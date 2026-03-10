# Car Studio AI - Arquitetura de Produção (Fase 1)

## Objetivo
Migrar o MVP da pasta `/demo` para um projeto real em Next.js na pasta `/carstudioAI`, mantendo o mesmo fluxo visual e funcional principal.

## Stack adotada
- Next.js (App Router)
- React + TypeScript
- Tailwind CSS
- Supabase JS (auth inicial)
- Google Gemini via rota server-side

## O que foi entregue nesta fase
1. **Base Next.js pronta para deploy Vercel**
   - Estrutura `app/`
   - Configurações de build e TypeScript
2. **UI migrada da demo com mesmo design base**
   - Upload de imagem
   - Seleção de fundo
   - Geração
   - Download
3. **Proteção da chave Gemini no backend**
   - Endpoint `POST /api/generate` processa imagem no servidor
4. **Fundação de autenticação Supabase**
   - Login com Google
   - Login por e-mail (magic link)
5. **Regra de créditos aplicada no front (fallback inicial)**
   - 2 créditos iniciais
   - Cada geração consome 1 crédito
   - Sem créditos => bloqueia geração e exibe mensagem

## Decisões técnicas
- O fluxo de IA foi movido para API Route para não expor `GEMINI_API_KEY` no client.
- Como os detalhes da base compartilhada ainda não foram entregues, créditos ficaram temporariamente em fallback local para permitir operação ponta a ponta sem quebrar UX.
- A integração definitiva com Supabase compartilhado ficou especificada em documento separado (`supabase-credit-contract.md`).

## Limitações conhecidas (intencionais nesta fase)
- Créditos ainda não persistem na base compartilhada real.
- Novos usuários recebem 2 créditos via fallback local, não via trigger no banco.
- Sem RLS/policies implementadas neste repositório até receber contrato oficial da DB.

## Próxima fase
Implementar contrato de créditos no Supabase compartilhado e substituir fallback local por leitura/consumo transacional no backend.
