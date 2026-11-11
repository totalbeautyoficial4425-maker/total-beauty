# 🌸 TOTAL BEAUTY — Gestão Inteligente de Beleza

[![CI Build](https://img.shields.io/badge/CI-Passing-brightgreen?style=for-the-badge&logo=githubactions)](https://github.com)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6.3-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5.4.11-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4.17-38B2AC?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com)
[![Neon Postgres](https://img.shields.io/badge/Neon-PostgreSQL-00E599?style=for-the-badge&logo=postgresql)](https://neon.tech)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?style=for-the-badge&logo=vercel)](https://vercel.com)

Plataforma web premium desenvolvida sob medida para a gestão completa, inteligente e de alta performance do salão **TOTAL BEAUTY**. Projetada com identidade visual sofisticada, arquitetura resiliente e sincronização bidirecional em tempo real entre celulares (iPhone/Android) e computadores.

---

## 🌟 Principais Recursos

- **📊 Dashboard Executivo Dinâmico**
  - 10 Cards de Indicadores atualizados em tempo real (Faturamento Hoje/Mês, Clientes, Despesas, Ticket Médio, Taxa de Ocupação).
  - 6 Gráficos interativos (Recharts): Receitas no tempo, Ranking de serviços mais realizados, Formas de pagamento e Balanço Receita x Despesa.
- **📅 Agenda Inteligente & Bloqueios**
  - Visualização diária e semanal com cards por horário e status de atendimento.
  - Bloqueio de horários com justificativa e sincronização imediata.
  - Integração nativa com WhatsApp (`wa.me`) para confirmação e lembretes com 1 clique.
- **🧾 Gestão de Comandas & Atendimentos**
  - Múltiplos serviços por comanda com autonomia de preços e comissões automáticas.
  - Funções avançadas de reabertura, cancelamento e troca de profissional sem duplicidade de lançamentos financeiros.
- **🎁 Módulo de Pacotes & Créditos**
  - Venda de pacotes de serviços (Ex: Pacote de Unha, Pacote de Cabelo).
  - Abatimento inteligente de créditos por atendimento com rateio proporcional sem distorção financeira.
- **👥 Gestão de Clientes & Avec**
  - Base oficial de clientes importada e unificada.
  - Filtro avançado e ferramenta integrada de unificação/higienização de cadastros duplicados.
- **🎂 Módulo de Aniversariantes**
  - Detecção precisa de aniversariantes do dia e do mês com suporte universal a formatos de data (`DD/MM`, `DD/MM/YYYY`, `YYYY-MM-DD`).
  - Disparo de mensagem personalizada de felicitações e agendamento via WhatsApp.
- **📦 Controle de Estoque & Consumo**
  - Acesso exclusivo do administrador com alertas automáticos de reposição (Lowell, Wella, Erick Kenedy).
  - Registro de consumo interno e geração de lista de compras.
- **💰 Gestão Financeira Completa**
  - Extrato detalhado de transações (Pix, Cartão de Crédito, Débito, Dinheiro, Crédito de Pacote).
  - Cálculo automatizado de comissões por profissional e controle de despesas operacionais.
- **👩‍💼 Painel da Profissional**
  - Acesso individual com login restrito.
  - Visualização exclusiva de atendimentos próprios, histórico de produção e comissões a receber.
- **🛡️ Arquitetura Anti-Crash & Resiliência Dupla**
  - **Sincronização em Nuvem Dupla**: Neon Postgres Serverless + Vercel Blob como réplica instantânea.
  - **Armazenamento Local Híbrido**: `localStorage` com overflow para `IndexedDB` de alta capacidade.
  - **React ErrorBoundary**: Tela de recuperação elegante que impede que qualquer falha inesperada torne a tela branca.

---

## 🎨 Identidade Visual Oficial

O projeto adota rigorosamente a paleta de cores institucional Total Beauty:

| Cor | Código Hex | Aplicação |
|---|---|---|
| **Branco Puro** | `#FFFFFF` | Superfícies e cartões principais |
| **Branco Marfim** | `#FFFCFA` | Fundo principal da aplicação |
| **Rosa Seco Principal** | `#C58F9B` | Botões primários, destaques e ações principais |
| **Rosa Seco Claro** | `#E8CDD2` | Bordas refinadas, divisores e contornos |
| **Rosa Blush** | `#F4E6E8` | Chips ativos, avatares e estados selecionados |
| **Bege Champagne** | `#E7D9C8` | Badges, indicadores e superfícies secundárias |
| **Bege Claro** | `#F5EFE7` | Campos de formulário e backgrounds neutros |
| **Marrom Suave** | `#8A7064` | Rótulos, ícones e tipografia secundária |
| **Marrom Escuro** | `#493A35` | Tipografia principal de alto contraste |
| **Cinza Neutro** | `#817A77` | Metadados, datas secundárias e placeholders |

---

## 🏗️ Estrutura de Diretórios

```
total-beauty/
├── .github/
│   ├── workflows/
│   │   └── ci.yml               # Pipeline de compilação e validação TypeScript
│   └── ISSUE_TEMPLATE/
│       ├── bug_report.md        # Template para relato de falhas
│       └── feature_request.md   # Template para novas funcionalidades
├── api/
│   └── sync.js                  # Endpoint serverless de sincronização em nuvem
├── data/
│   └── backups/                 # Backups históricos estruturados fora do bundle
├── public/
│   └── logo.png                 # Logotipo oficial Total Beauty
├── scripts/                     # Scripts de migração, diagnóstico e testes
├── src/
│   ├── components/
│   │   ├── common/              # ErrorBoundary, WhatsAppModal, ChangePasswordModal
│   │   ├── layout/              # Header, Sidebar
│   │   └── modals/              # Modais de cadastro, agendamento, estoque, pacotes
│   ├── context/
│   │   ├── AuthContext.tsx      # Controle de sessão, senhas e perfis
│   │   └── DataContext.tsx      # State global centralizado e sanitizado
│   ├── pages/                   # Telas principais da aplicação
│   ├── services/
│   │   ├── cloudSync.ts         # Heartbeat em tempo real e broadcast multi-abas
│   │   ├── firebase.ts          # Conexão Firestore opcional
│   │   ├── idbStorage.ts        # Armazenamento IndexedDB de alta capacidade
│   │   └── storage.ts           # Camada de persistência local unificada
│   ├── types/
│   │   └── index.ts             # Definições estritas de TypeScript
│   ├── utils/
│   │   ├── formatters.ts        # Moeda BRL, datas, WhatsApp wa.me e CSV
│   │   └── packageCalculations.ts # Cálculo de rateio e créditos de pacotes
│   ├── App.tsx                  # Roteamento e guards de perfil
│   ├── main.tsx                 # Ponto de entrada com ErrorBoundary
│   └── index.css                # Estilos Tailwind e classes utilitárias
├── .env.example                 # Guia seguro de variáveis de ambiente
├── .gitignore                   # Proteção estrita contra vazamento de credenciais
├── index.html                   # HTML base com fontes Cormorant Garamond e DM Sans
├── package.json                 # Dependências e scripts npm
├── tailwind.config.js           # Paleta Total Beauty e animações suaves
├── tsconfig.json                # Configuração TypeScript estrita
├── vercel.json                  # Headers de cache e rewrites de rotas
└── vite.config.ts               # Code-splitting modular e proxy local
```

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- [Node.js](https://nodejs.org/) versão 18 ou superior
- [npm](https://www.npmjs.com/) ou [pnpm](https://pnpm.io/)

### 1. Clonar ou Acessar o Repositório
```bash
git clone https://github.com/<SEU_USUARIO>/total-beauty.git
cd total-beauty
```

### 2. Instalar Dependências
```bash
npm install
```

### 3. Configurar Variáveis de Ambiente
Copie o arquivo de exemplo e preencha as variáveis de banco de dados se necessário:
```bash
cp .env.example .env.local
```

### 4. Executar em Modo Desenvolvimento
```bash
npm run dev
```
O sistema estará disponível em: [`http://localhost:3000`](http://localhost:3000)

### 5. Checagem de Tipagem e Build de Produção
```bash
# Validar tipagem TypeScript
npm run typecheck

# Gerar build minificado e otimizado
npm run build
```

---

## 🔒 Segurança e Credenciais

- **Controle de Senhas Criptografadas**: As senhas são geradas e validadas através de hash criptográfico com controle de versão individual.
- **Verificação de Identidade**: Redefinição de senha do administrador protegida por verificação de dados oficiais do salão.
- **Proteção Anti-Wipe**: A API em nuvem recusa requisições vazias ou incompletas, impedindo perda acidental de dados cadastrados.

---

## 🌐 Publicação e Vercel

O projeto está configurado para deploy automático na Vercel:
1. Conecte o repositório do GitHub à sua conta Vercel.
2. Adicione as variáveis de ambiente `DATABASE_URL` e `BLOB_READ_WRITE_TOKEN` no painel da Vercel.
3. Todo commit na branch principal (`main` ou `master`) compilará e atualizará o site de forma automatizada.

---

## 📄 Licença

Propriedade exclusiva do salão **Total Beauty**. Todos os direitos reservados.
