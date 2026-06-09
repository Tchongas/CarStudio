# Car Studio AI

Aplicação Next.js para transformar fotos de veículos em imagens com aparência de estúdio profissional usando IA.

---

## 🚀 Começando

### Pré-requisitos

- Node.js 18+
- Conta no Supabase
- Chave de API do Google Gemini
- (Opcional) Integração com Hub de membros

### Instalação

```bash
# Clone o repositório
git clone <repo-url>
cd CarStudioAI

# Instale dependências
npm install

# Configure variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas chaves

# Rode em desenvolvimento
npm run dev
```

Acesse `http://localhost:3000`

---

## 📋 Funcionalidades

- ✅ **Upload de imagens** - Drag & drop ou seleção manual
- ✅ **5 fundos predefinidos** - Estúdio branco, dark premium, industrial, rural, condomínio
- ✅ **Fundo personalizado** - Upload de imagem própria como background
- ✅ **Geração com IA** - Google Gemini para substituição de fundo
- ✅ **Sistema de créditos** - 1 crédito = 1 imagem gerada
- ✅ **Autenticação** - Google OAuth e Email/Password (Supabase)
- ✅ **Integração Hub** - Login via área de membros com Hotmart
- ✅ **Área administrativa** - Gestão de créditos de usuários
- ✅ **Reembolso automático** - Créditos devolvidos em caso de falha na geração

---

## 🏗️ Arquitetura

### Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS |
| Backend | Next.js API Routes, Server Actions |
| Banco de Dados | Supabase (PostgreSQL) |
| Autenticação | Supabase Auth + Hub JWT |
| IA | Google Gemini 2.5 Flash Image |
| Pagamentos | Hotmart (via webhook no Hub) |

### Estrutura do Projeto

```
app/
├── page.tsx              # Landing page (pública)
├── login/page.tsx        # Página de login
├── studio/page.tsx       # App principal (protegido)
├── admin/page.tsx        # Dashboard admin (protegido)
├── api/
│   ├── credits/route.ts       # GET saldo de créditos
│   ├── generate/route.ts      # POST gerar imagem
│   ├── admin/credits/route.ts # GET/POST gestão admin
│   └── auth/                  # Rotas de autenticação
└── auth/callback/route.ts # Callback OAuth

components/
├── studio-app.tsx        # Componente principal do studio
├── auth-form.tsx         # Formulário de login
├── admin/                # Componentes admin
└── studio/               # Componentes do studio

lib/
├── ai/                   # Integração Google Gemini
├── auth/                 # Autenticação Hub/Supabase
├── credits/              # Sistema de créditos
├── supabase/             # Clientes Supabase
└── admin/                # Autenticação admin
```

---

## 🔐 Autenticação

O sistema suporta dois fluxos de autenticação:

### 1. Via Hub (Área de Membros)
Fluxo principal para usuários que compraram pelo Hotmart. Integração via JWT.

### 2. Via Supabase Auth
Fallback para login direto com Google ou Email/Password.

---

## 💳 Sistema de Créditos

| Ação | Créditos | Descrição |
|------|----------|-----------|
| Nova conta | +2 | Brinde para novos usuários |
| Compra Hotmart | +N | Conforme pacote comprado |
| Geração de imagem | -1 | Por imagem processada |
| Falha na geração | +1 | Reembolso automático |
| Ajuste admin | ±N | Ajuste manual via /admin |

---

## 📚 Documentação

- **[Guia do Administrador](./docs/ADMIN_README.md)** - Documentação completa para devs e admins
- **[Arquitetura de Backend](./docs/backend-complete.md)** - Detalhes técnicos do sistema de créditos
- **[Contrato Supabase](./docs/supabase-credit-contract.md)** - Integração com banco compartilhado

---

## ⚙️ Variáveis de Ambiente

Veja `.env.example` para lista completa. Principais:

```bash
# Google Gemini
GEMINI_API_KEY=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Hub (opcional)
HUB_JWT_SECRET=
CAR_STUDIO_ADMIN_EMAILS=
```

---

## 🛠️ Comandos

```bash
# Desenvolvimento
npm run dev

# Build de produção
npm run build

# Lint
npm run lint

# Migrações SQL (requer psql)
psql $DATABASE_URL -f sql/migrations/010_cs_schema_from_zero.sql
```

---

## 🚀 Deploy

### Vercel (Recomendado)

1. Push para GitHub
2. Importe projeto na Vercel
3. Configure variáveis de ambiente
4. Deploy automático

```bash
vercel --prod
```

---

## 📝 Licença

Projeto proprietário - Car Studio AI.

---

## 🤝 Suporte

Para dúvidas técnicas, consulte:
- [Guia do Administrador](./docs/ADMIN_README.md)
- Documentação em `/docs/`
- Migrações SQL em `/sql/migrations/`

