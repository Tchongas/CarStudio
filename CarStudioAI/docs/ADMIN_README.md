# Car Studio AI - Guia do Administrador

> Documentação para desenvolvedores e administradores do sistema.

---

## Sumário

1. [Visão Geral](#visão-geral)
2. [Páginas Administrativas](#páginas-administrativas)
3. [Variáveis de Ambiente](#variáveis-de-ambiente)
4. [Fluxo de Autenticação](#fluxo-de-autenticação)
5. [Sistema de Créditos](#sistema-de-créditos)
6. [Estrutura do Banco de Dados](#estrutura-do-banco-de-dados)
7. [APIs Disponíveis](#apis-disponíveis)
8. [Deploy e Manutenção](#deploy-e-manutenção)
9. [Troubleshooting](#troubleshooting)

---

## Visão Geral

O Car Studio AI é uma aplicação Next.js que transforma fotos de veículos em imagens de estúdio profissional usando IA (Google Gemini).

### Stack Tecnológico

- **Framework**: Next.js 15 (App Router)
- **Linguagem**: TypeScript
- **Estilização**: Tailwind CSS
- **Banco de Dados**: Supabase (PostgreSQL)
- **Autenticação**: Supabase Auth + Hub (área de membros)
- **IA**: Google Gemini API
- **Pagamentos**: Hotmart (via webhook no Hub)
- **Deploy**: Vercel

### Estrutura de Pastas

```
CarStudioAI/
├── app/                    # Rotas do Next.js App Router
│   ├── admin/              # Página administrativa
│   ├── api/                # API Routes
│   │   ├── admin/credits/  # API de gestão de créditos (admin)
│   │   ├── auth/           # Rotas de autenticação
│   │   ├── credits/        # API de consulta de saldo
│   │   └── generate/       # API de geração de imagens
│   ├── auth/callback/      # Callback OAuth
│   ├── login/              # Página de login
│   ├── page.tsx            # Landing page
│   └── studio/             # Página principal do studio
├── components/             # Componentes React
│   ├── admin/              # Componentes admin
│   ├── studio/             # Componentes do studio
│   ├── auth-form.tsx       # Form de login
│   └── studio-app.tsx      # App principal do studio
├── lib/                    # Bibliotecas e utilidades
│   ├── admin/              # Autenticação admin
│   ├── ai/                 # Integração com Gemini
│   ├── auth/               # Autenticação Hub/Supabase
│   ├── credits/            # Sistema de créditos
│   ├── hooks/              # React hooks
│   └── supabase/           # Clientes Supabase
├── docs/                   # Documentação
└── sql/                    # Migrações SQL
```

---

## Páginas Administrativas

### `/admin` - Dashboard de Créditos

**URL**: `https://seudominio.com/admin`

**Funcionalidades**:
- Consultar saldo de créditos de qualquer usuário por e-mail
- Ajustar saldo de créditos (aumentar ou diminuir)
- Histórico auditável no ledger

**Como acessar**:
1. Configure a variável `CAR_STUDIO_ADMIN_EMAILS` no `.env.local`
2. Faça login com um e-mail que esteja na lista
3. Acesse `/admin` diretamente

**Segurança**:
- Apenas e-mails na whitelist podem acessar
- Todas as operações são logadas no `credit_ledger`
- Sessão expira em 7 dias (cookie do Hub) ou conforme política do Supabase

---

## Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto com as seguintes variáveis:

```bash
# ============================================
# GOOGLE GEMINI (Geração de Imagens)
# ============================================
# Chave da API do Google AI Studio
# Obtenha em: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# ============================================
# SUPABASE (Banco de Dados)
# ============================================
# Estas variáveis são expostas no browser (NEXT_PUBLIC_)
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_aqui

# Esta variável é SERVER-ONLY (nunca expor no frontend)
# Usada para operações administrativas e RPCs
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui

# ============================================
# HUB (Área de Membros Integrada)
# ============================================
# URL da API de login do Hub
HUB_CARSTUDIO_LOGIN_URL=https://membros.allanfulcher.com/api/auth/car-studio/start

# Segredo JWT para validar tokens do Hub
# Deve ser o mesmo valor usado no Hub
HUB_JWT_SECRET=seu_segredo_jwt_aqui

# URL base da aplicação (usada em redirects)
CAR_STUDIO_BASE_URL=https://seu-dominio.vercel.app

# Página padrão após login
CAR_STUDIO_DEFAULT_REDIRECT=/studio

# ============================================
# ADMINISTRAÇÃO
# ============================================
# Lista de e-mails com acesso ao /admin (separados por vírgula)
CAR_STUDIO_ADMIN_EMAILS=admin1@email.com,admin2@email.com
```

### Onde obter cada variável

| Variável | Onde obter |
|----------|-----------|
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `NEXT_PUBLIC_SUPABASE_URL` | Dashboard Supabase > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Dashboard Supabase > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Dashboard Supabase > Settings > API (service role) |
| `HUB_JWT_SECRET` | Configuração do projeto Hub |
| `CAR_STUDIO_*` | Configuração própria do deploy |

---

## Fluxo de Autenticação

O sistema suporta dois métodos de autenticação:

### 1. Via Hub (Área de Membros) - Principal

```
Usuário clica "Entrar" na landing
    ↓
Redirecionado para /api/auth/google
    ↓
Middleware detecta HUB_CARSTUDIO_LOGIN_URL configurado
    ↓
Redirecionado para Hub (membros.allanfulcher.com)
    ↓
Hub valida assinatura ativa do produto
    ↓
Hub gera token JWT e redireciona para /api/auth/callback?token=xxx
    ↓
Valida token, cria cookie de sessão (7 dias)
    ↓
Redireciona para /studio
```

**Vantagens**:
- Usuário já logado no Hub não precisa digitar senha novamente
- Validação automática de assinatura ativa
- Sincronização automática de créditos comprados via Hotmart

### 2. Via Supabase (Fallback)

```
Usuário escolhe "Entrar com Google" ou "E-mail/senha"
    ↓
Supabase Auth inicia OAuth ou valida credenciais
    ↓
Callback em /auth/callback troca code por sessão
    ↓
Redireciona para /studio
```

**Vantagens**:
- Funciona independentemente do Hub
- Magic link por e-mail
- Usuários que não compraram via Hotmart

---

## Sistema de Créditos

### Conceitos Fundamentais

| Conceito | Descrição |
|----------|-----------|
| **Crédito** | 1 crédito = 1 imagem gerada |
| **Wallet** | Carteira virtual por usuário (`car_studio`) |
| **Ledger** | Registro imutável de todas as transações |
| **Idempotência** | Chaves únicas evitam duplicidade |

### Tabelas no Banco

```sql
-- Definição das carteiras por produto
credit_wallet_definitions
  - wallet_key: 'car_studio'
  - product_id: 'car-studio'
  - code: 'CS'

-- Saldo por usuário
user_credit_wallets
  - user_id → hub_users.id
  - wallet_key: 'car_studio'
  - balance: saldo atual
  - lifetime_earned: total recebido
  - lifetime_spent: total gasto

-- Histórico de transações (imutável)
credit_ledger
  - user_id, wallet_key
  - amount: valor movimentado
  - entry_type: 'grant' | 'spend' | 'adjustment'
  - reason: 'purchase' | 'generation' | 'refund' | etc
  - idempotency_key: evita duplicidade
```

### Fluxos de Crédito

#### Compra (Hotmart)
```
Usuário compra no Hotmart
    ↓
Hotmart envia webhook → Hub
    ↓
Hub chama grant_credits(wallet_key='car_studio')
    ↓
Saldo aparece automaticamente no Car Studio
```

#### Consumo (Geração de Imagem)
```
Usuário clica "Gerar Imagem"
    ↓
API chama cs_spend_credits(p_amount=1)
    ↓
Se sucesso: gera imagem e retorna
    ↓
Se falha: grant_credits(reason='refund') automaticamente
```

#### Ajuste Manual (Admin)
```
Admin acessa /admin
    ↓
Busca usuário por e-mail
    ↓
Define novo saldo
    ↓
API ajusta via grant_credits ou spend_credits
    ↓
Registra no ledger como 'adjustment'
```

---

## Estrutura do Banco de Dados

### Diagrama Simplificado

```
┌─────────────────┐     ┌─────────────────────┐     ┌─────────────────┐
│   hub_users     │     │ user_credit_wallets │     │  credit_ledger  │
├─────────────────┤     ├─────────────────────┤     ├─────────────────┤
│ id (PK)         │◄────┤ user_id (FK)        │     │ id (PK)         │
│ email           │     │ wallet_key          │     │ user_id (FK)    │
│ name            │     │ balance             │     │ wallet_key      │
│ created_at      │     │ lifetime_earned     │     │ amount          │
└─────────────────┘     │ lifetime_spent      │     │ entry_type      │
                        └─────────────────────┘     │ reason          │
                                                    │ reference_type  │
                                                    │ idempotency_key │
                                                    │ created_at      │
                                                    └─────────────────┘

┌──────────────────────────┐
│ credit_wallet_definitions│
├──────────────────────────┤
│ wallet_key (PK)          │
│ product_id               │
│ code                     │
│ label                    │
│ active                   │
└──────────────────────────┘
```

### Funções RPC Principais

```sql
-- Resolves e-mail para user_id
cs_resolve_user_id_by_email(p_email TEXT) → UUID

-- Concede créditos (compras, reembolsos, ajustes)
cs_grant_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT,
  p_reference_type TEXT,
  p_reference_id TEXT,
  p_idempotency_key TEXT,
  p_meta JSONB
) → TABLE(new_balance INTEGER, ledger_id UUID)

-- Consome créditos (geração de imagem)
cs_spend_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT,
  p_reference_type TEXT,
  p_reference_id TEXT,
  p_idempotency_key TEXT,
  p_meta JSONB
) → TABLE(new_balance INTEGER, ledger_id UUID)

-- Cria carteira se não existir (bootstrap)
cs_ensure_wallet(p_user_id UUID) → TABLE(new_balance INTEGER)
```

---

## APIs Disponíveis

### APIs Públicas (autenticadas)

#### `GET /api/credits`
Consulta saldo de créditos do usuário logado.

**Resposta**:
```json
{
  "creditsBalance": 10,
  "email": "usuario@email.com"
}
```

---

#### `POST /api/generate`
Gera imagem de estúdio a partir de foto de veículo.

**Request**:
```json
{
  "base64Image": "data:image/jpeg;base64,/9j/4AAQ...",
  "mimeType": "image/jpeg",
  "background": "white",
  "customBackgroundBase64": null,
  "customBackgroundMimeType": null,
  "requestId": "uuid-para-idempotencia"
}
```

**Resposta Sucesso**:
```json
{
  "imageUrl": "data:image/png;base64,iVBORw0KG...",
  "creditsBalance": 9
}
```

**Resposta Erro (sem créditos)**:
```json
{
  "error": "Você não tem créditos suficientes para gerar imagens."
}
```

---

### APIs Administrativas

#### `GET /api/admin/credits?email=usuario@email.com`
Consulta saldo de um usuário específico.

**Resposta**:
```json
{
  "email": "usuario@email.com",
  "creditsBalance": 10
}
```

---

#### `POST /api/admin/credits`
Ajusta saldo de um usuário.

**Request**:
```json
{
  "email": "usuario@email.com",
  "targetBalance": 25
}
```

**Resposta**:
```json
{
  "email": "usuario@email.com",
  "previousBalance": 10,
  "creditsBalance": 25,
  "adjustmentAmount": 15
}
```

---

## Deploy e Manutenção

### Deploy na Vercel

1. **Fork/push do código** para GitHub

2. **Crie projeto na Vercel**:
   ```bash
   vercel --prod
   ```

3. **Configure variáveis de ambiente** no dashboard da Vercel

4. **Deploy**:
   ```bash
   git push origin main
   # ou
   vercel --prod
   ```

### Migrações SQL

Execute as migrações na ordem correta:

```bash
# Migração inicial (estrutura base)
psql $DATABASE_URL -f sql/migrations/010_cs_schema_from_zero.sql

# Funções runtime e bootstrap
psql $DATABASE_URL -f sql/migrations/011_cs_runtime_and_bootstrap.sql

# Views e helpers admin
psql $DATABASE_URL -f sql/migrations/012_cs_admin_and_views.sql
```

### Atualização de Dependências

```bash
# Verificar atualizações
npm outdated

# Atualizar seguro (semver)
npm update

# Atualizar major versions (cuidado!)
npm install next@latest react@latest
```

---

## Troubleshooting

### Problemas Comuns

#### "HUB_USER_NOT_FOUND"
**Causa**: Usuário autenticado no Supabase mas não existe na tabela `hub_users`

**Solução**:
```sql
-- Insere usuário manualmente
INSERT INTO hub_users (id, email, name)
VALUES (gen_random_uuid(), 'usuario@email.com', 'Nome Usuário');

-- Ou verifica se o sync no callback está funcionando
```

---

#### "insufficient_credits"
**Causa**: Usuário tentou gerar imagem sem créditos suficientes

**Solução**:
1. Verifique saldo no admin: `/admin`
2. Adicione créditos manualmente se necessário
3. Verifique se webhook Hotmart está funcionando

---

#### "GEMINI_API_KEY não configurada"
**Causa**: Variável de ambiente não definida

**Solução**:
```bash
# Verifique se está no .env.local
grep GEMINI_API_KEY .env.local

# Reinicie o servidor Next.js após alterar .env.local
npm run dev
```

---

### Comandos Úteis para Debug

```sql
-- Verificar definição da carteira
SELECT * FROM credit_wallet_definitions WHERE wallet_key = 'car_studio';

-- Verificar saldo de usuário
SELECT u.email, w.balance, w.lifetime_earned, w.lifetime_spent
FROM user_credit_wallets w
JOIN hub_users u ON u.id = w.user_id
WHERE w.wallet_key = 'car_studio'
  AND u.email = 'usuario@email.com';

-- Ver últimas transações no ledger
SELECT l.*, u.email
FROM credit_ledger l
JOIN hub_users u ON u.id = l.user_id
WHERE l.wallet_key = 'car_studio'
ORDER BY l.created_at DESC
LIMIT 20;

-- Verificar se funções RPC existem
SELECT proname, proargnames
FROM pg_proc
WHERE proname LIKE 'cs_%'
ORDER BY proname;
```

### Logs Importantes

```bash
# Ver logs do Vercel
vercel logs --json

# Logs específicos de erro
vercel logs --json | grep -i error
```

---

## Contato e Suporte

Para questões técnicas:
- Documentação completa: `/docs/` no repositório
- SQL de referência: `/sql/migrations/`
- Contratos de integração: `/docs/supabase-credit-contract.md`

---

**Última atualização**: Junho 2026
**Versão do documento**: 1.0
