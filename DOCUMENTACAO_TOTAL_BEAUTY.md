# TOTAL BEAUTY — Gestão Inteligente de Beleza
## Documentação Oficial de Entrega do Sistema

---

### 1. Resumo da Aplicação

O sistema **TOTAL BEAUTY — Gestão Inteligente de Beleza** foi totalmente projetado e desenvolvido de ponta a ponta como uma plataforma web de alta performance, elegante e funcional, com identidade visual premium para salão de beleza.

- **Status da Aplicação Local**: **ONLINE e Ativa em Execução** no endereço [`http://localhost:3000`](http://localhost:3000).
- **Diretório do Projeto**: `C:\Users\Total Beauty\.gemini\antigravity\scratch\total-beauty`
- **Repositório Git**: Inicializado e com commit das versões de produção.

---

### 2. Identidade Visual e Paleta Oficial Aplicada

A interface foi modelada respeitando com rigor a paleta solicitada:
- **Branco Puro**: `#FFFFFF` (superfícies e cartões principais)
- **Branco Marfim**: `#FFFCFA` (fundo suave e acolhedor)
- **Rosa Seco Principal**: `#C58F9B` (botões principais, destaques e ações)
- **Rosa Seco Claro**: `#E8CDD2` (bordas refinadas e divisores)
- **Rosa Blush**: `#F4E6E8` (chips selecionados, itens ativos de menu e avatares)
- **Bege Champagne**: `#E7D9C8` (elementos de suporte e badges)
- **Bege Claro**: `#F5EFE7` (áreas de preenchimento e campos secundários)
- **Marrom Suave**: `#8A7064` (rótulos e subtítulos)
- **Marrom Escuro**: `#493A35` (tipografia de leitura de alto contraste)
- **Cinza Neutro**: `#817A77` (metadados e datas secundárias)
- **Logomarca Oficial**: Integrada no cabeçalho, tela de login e menu lateral a partir da imagem fornecida pela cliente.

---

### 3. Credenciais Iniciais e Segurança

- **Usuário**: `admin`
- **Senha Inicial**: `admin123`
- **Troca Obrigatória no Primeiro Acesso**: Implementada e ativa. Ao entrar com `admin123`, o sistema bloqueia o acesso aos módulos reais até que uma nova senha pessoal seja definida e armazenada em hash seguro.
- **Proteção contra Força Bruta**: Bloqueio progressivo de 3 minutos caso ocorram 5 tentativas consecutivas de senha incorreta.

---

### 4. Módulos Implementados e Funcionais

1. **Autenticação & Controle de Sessão**:
   - Login seguro, persistência de sessão, logout e troca de senha.
2. **Dashboard Executivo**:
   - 10 Cards de Indicadores calculados dinamicamente dos dados reais: Agendamentos de Hoje, Atendimentos Concluídos, Total de Clientes, Faturamento Hoje, Faturamento Mês, Despesas Mês, Resultado Líquido, Ticket Médio, Taxa de Ocupação da Agenda e Valores a Receber.
   - Agenda resumida do dia com botões de WhatsApp direto e detalhes.
   - 6 Gráficos Interativos (Recharts): Faturamento no tempo, Volume de atendimentos, Ranking de serviços, Distribuição por forma de pagamento e Comparativo de Receitas x Despesas.
3. **Agenda Inteligente**:
   - 4 Visualizações: **Dia**, **Semana**, **Mês** e **Lista**.
   - Detecção de conflito de horários em tempo real para a mesma profissional.
   - Suporte a **Encaixes excepcionais** com confirmação explícita.
   - Cálculo automático do horário de término a partir da duração do serviço.
   - Cadastro de cliente rápido inline dentro do modal de agendamento.
   - Cancelamento com registro obrigatório de justificativa.
4. **Clientes (Gestão Completa de Carteira)**:
   - Tabela organizada com busca instantânea por nome, celular com DDD ou e-mail.
   - Filtros por: Todas, Recorrentes, Novas, Sem Retorno (+30 dias) e Arquivadas.
   - Ficha Completa da Cliente em 5 Abas:
     1. Dados Pessoais & Endereço
     2. Histórico de Atendimentos
     3. Agenda (Passados e Futuros)
     4. Histórico Financeiro detalhado
     5. Ficha de Preferências & Cuidados
   - Exportação completa da carteira em **CSV (compatível com Excel/BOM UTF-8)**.
5. **Integração Inteligente com WhatsApp**:
   - Normalização automática do telefone para formato internacional wa.me (`+55`).
   - Modal com modelos prontos e editáveis: *Confirmação de Agendamento*, *Lembrete de Horário*, *Agradecimento Pós-Visita*, *Convite de Retorno* e *Cliente Inativa*.
   - Preenchimento automático dinâmico das tags: `[NOME]`, `[DATA]`, `[HORÁRIO]`, `[SERVIÇO]`, `[PROFISSIONAL]`.
6. **Catálogo de Serviços**:
   - Categorias configuráveis (Cabelo, Unhas, Sobrancelhas, Cílios, Maquiagem, Estética, Outros).
   - Definição de preço padrão e duração em minutos.
   - Ativação e desativação sem excluir histórico financeiro.
7. **Atendimentos & Execução**:
   - Acompanhamento em tempo real das clientes em atendimento no salão.
   - Início de atendimento a partir da agenda ou avulso.
   - Conclusão com aplicação de descontos (R$ ou %) e forma de pagamento.
   - Sincronização direta com receitas financeiras sem dupla contagem.
8. **Módulo Financeiro**:
   - Receitas segregadas por forma de pagamento (PIX, Cartão Crédito, Cartão Débito, Dinheiro, Transferência).
   - Cadastro e categorização de despesas com datas de competência e vencimento.
   - Extrato financeiro unificado e exportação CSV.
9. **Relatórios Gerenciais**:
   - Filtros por Mês Atual, Últimos 30 Dias, Ano Vigente e Histórico Completo.
   - Ranking de serviços por faturamento e volume.
   - Indicadores de no-show (não comparecimento) e taxa de cancelamentos.
   - Impressão formatada para PDF com layout limpo `@media print`.
10. **Configurações da Empresa, Firebase & Backup**:
    - Edição dos dados da Total Beauty e horários de funcionamento.
    - Modelos de WhatsApp editáveis.
    - Interface de conexão ao vivo com **Firebase Firestore**: teste de conexão e sincronização de dados.
    - Backup e restauração completa em JSON.

---

### 5. Como Acessar no Localhost

A aplicação já está rodando em segundo plano:
- Acesse pelo navegador: **`http://localhost:3000`**
- Usuário inicial: **`admin`**
- Senha inicial: **`admin123`**
- Ao entrar, defina sua nova senha definitiva para desbloquear os dados completos do salão.

---

### 6. Como Conectar ao Firebase Firestore

1. No menu lateral, acesse **Configurações**.
2. Na seção **Banco de Dados Firebase**, insira as credenciais do seu projeto Firebase Console:
   - `API Key`
   - `Project ID`
   - `Auth Domain`
   - `Storage Bucket`
3. Clique em **Salvar & Testar Conexão**. O sistema fará o teste de comunicação em tempo real.
4. Clique em **Sincronizar Dados Locais para Nuvem** para enviar todos os clientes, serviços e atendimentos já cadastrados para o seu Firestore.

---

### 7. Como Publicar na Vercel

O projeto já contém o arquivo de configuração `vercel.json` e build de produção testado. Para publicar com seu link público oficial:

#### Opção A: Pelo Terminal (Vercel CLI)
Abra o PowerShell na pasta do projeto:
```powershell
cd "C:\Users\Total Beauty\.gemini\antigravity\scratch\total-beauty"
$env:Path = "C:\Users\Total Beauty\.tools\nodejs;C:\Users\Total Beauty\.tools\git\cmd;$env:Path"
npx vercel
```
O Vercel CLI solicitará que você faça login com sua conta (GitHub ou e-mail) e em instantes gerará seu link público (ex: `https://total-beauty.vercel.app`).

#### Opção B: Pelo Painel Web da Vercel
1. Acesse [https://vercel.com](https://vercel.com) e crie ou acesse sua conta.
2. Clique em **Add New... > Project**.
3. Importe a pasta ou o repositório Git do projeto `total-beauty`.
4. A Vercel detectará automaticamente o framework Vite e o comando `npm run build`.
5. Clique em **Deploy** e seu sistema estará no ar com certificado SSL gratuito e domínio público!
