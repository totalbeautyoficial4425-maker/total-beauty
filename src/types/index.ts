export type UserRole = 'admin' | 'gerente' | 'profissional' | 'recepcionista';

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  role: UserRole;
  professionalId?: string; // Link to professional profile if role === 'profissional'
  forcePasswordChange: boolean;
  passwordHash?: string;
  passwordUpdatedAt?: string;
  updatedAt?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  birthDate?: string;
  address?: {
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  notes?: string;
  createdAt: string;
  lastVisit?: string;
  totalVisits: number;
  totalSpent: number;
  communicationConsent: boolean;
  isArchived: boolean;
}

export type ServiceCategory = 
  | 'cabelo' 
  | 'unhas' 
  | 'sobrancelhas' 
  | 'cilios' 
  | 'maquiagem' 
  | 'estetica' 
  | 'outros'
  | string;

export interface Service {
  id: string;
  name: string;
  category: ServiceCategory;
  description: string;
  price: number;
  durationMinutes: number;
  commissionPercentage: number; // Percentual de comissão do serviço (ex: 50%)
  requiresProductConsumption?: boolean; // Exige registro de consumo de produtos/gramatura
  isPackage?: boolean;
  packageConfig?: {
    packageType: 'unha' | 'cabelo' | 'outro';
    items: Array<{ serviceType: string; serviceName: string; quantity: number }>;
    validityDays: number;
  };
  isActive: boolean;
  internalNotes?: string;
}

export interface Professional {
  id: string;
  name: string;
  specialty: string;
  phone: string;
  color: string;
  isActive: boolean;
  userId?: string; // ID da conta de usuário
  username?: string; // Nome de usuário para login
  commissionPercentage?: number; // % padrão de comissão da profissional
}

export type AppointmentStatus = 
  | 'agendado' 
  | 'confirmado' 
  | 'em_atendimento' 
  | 'concluido' 
  | 'cancelado' 
  | 'nao_compareceu';

export interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  serviceId: string;
  serviceName: string;
  professionalId: string;
  professionalName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationMinutes: number;
  price: number;
  notes?: string;
  status: AppointmentStatus;
  cancellationReason?: string;
  isFitIn?: boolean; // Encaixe
  fitInReason?: string; // Motivo do encaixe excepcional
  fitInAuthorizedBy?: string; // Quem autorizou
  sessionId?: string; // ID da sessão de múltiplos serviços
  executionMode?: 'sequencial' | 'simultaneo';
  deletedAt?: string;
  deletedBy?: string;
  deletionReason?: string;
  createdAt: string;
  createdBy?: string;
  updatedAt: string;
  updatedBy?: string;
  changeHistory?: Array<{
    date: string;
    user: string;
    action: string;
    details?: string;
  }>;
}

export interface AppointmentDeletionLog {
  id: string;
  appointmentId: string;
  clientId: string;
  clientName: string;
  clientPhone?: string;
  serviceName: string;
  professionalId: string;
  professionalName: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  price: number;
  reason: string;
  deletedBy: string;
  deletedAt: string;
}

export interface ScheduleBlock {
  id: string;
  professionalId: string;
  professionalName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationMinutes: number;
  reason: string; // Justificativa obrigatória (ex: "Almoço", "Consulta médica", "Compromisso pessoal", "Treinamento")
  notes?: string;
  createdBy?: string;
  createdAt: string;
}

export interface Attendance {
  id: string;
  appointmentId?: string;
  sessionId?: string; // ID da sessão vinculada
  comandaId?: string; // ID da comanda unificada
  clientId: string;
  clientName: string;
  serviceId: string;
  serviceName: string;
  professionalId: string;
  professionalName: string;
  date: string;
  startedAt: string;
  finishedAt?: string;
  grossValue: number;
  discountValue: number;
  discountType: 'fixed' | 'percentage';
  netValue: number;
  commissionPercentage: number; // Percentual de comissão aplicada (ex: 50%)
  commissionAmount: number; // Valor calculado em R$ da comissão
  notes?: string;
  paymentStatus: 'pago' | 'pendente' | 'parcial';
  paidAmount: number;
  paymentMethod?: PaymentMethod;
  packageId?: string; // Se o atendimento foi pago/coberto por crédito de pacote
  isPackageCovered?: boolean; // Se a sessão foi abonada pelo pacote
  createdAt: string;
  updatedAt?: string;
}

export interface ProductConsumption {
  id: string;
  attendanceId?: string;
  appointmentId?: string;
  clientId: string;
  clientName: string;
  serviceId: string;
  serviceName: string;
  professionalId: string;
  professionalName: string;
  productId: string;
  productName: string;
  quantity: number; // Quantidade informada (ex: 40 para 40g)
  unit: string; // 'g', 'ml', 'un', 'tubo', etc.
  costPrice?: number;
  date: string; // YYYY-MM-DD
  createdAt: string;
}

export interface ComandaPayment {
  id: string;
  paymentMethod: PaymentMethod;
  amount: number;
  date: string;
  notes?: string;
  createdAt: string;
}

export interface Comanda {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone?: string;
  date: string; // YYYY-MM-DD
  attendanceIds: string[];
  subtotal: number;
  discountTotal: number;
  netTotal: number;
  paidTotal: number;
  pendingTotal: number;
  status: 'pago' | 'parcial' | 'pendente';
  payments: ComandaPayment[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethod = 
  | 'dinheiro' 
  | 'pix' 
  | 'cartao_debito' 
  | 'cartao_credito' 
  | 'transferencia' 
  | 'pacote_credito'
  | 'outros';

export type PackageStatus = 'ativo' | 'em_andamento' | 'concluido' | 'esgotado' | 'expirado' | 'vencido' | 'cancelado';

export interface PackageItemBalance {
  serviceType: string;
  serviceName: string;
  totalQty: number;
  usedQty: number;
  remainingQty: number;
  referencePrice?: number; // Preço de tabela individual de referência (ex: R$ 30,00 para mão, R$ 35,00 para pé)
  unitPackagePrice?: number; // Valor proporcional unitário no pacote (ex: R$ 32,37 para mão, R$ 37,63 para pé)
  totalItemValue?: number; // Valor proporcional total atribuído ao item (ex: 4 x 32,37 = 129,48)
  consumedItemValue?: number; // Valor já consumido deste item
}

export interface PackageMovementLog {
  id: string;
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO
  type: 'venda' | 'baixa' | 'estorno' | 'repasse_pago' | 'cancelamento' | 'ajuste' | 'renovacao';
  serviceType?: string;
  serviceName?: string;
  quantity?: number; // Ex: -1 para baixa, +1 para estorno, etc.
  attendanceId?: string;
  professionalId?: string;
  professionalName?: string;
  financialAmount?: number;
  abatedFinancialAmount?: number; // Valor proporcional abatido do saldo financeiro
  remainingFinancialBalance?: number; // Saldo financeiro restante do pacote
  reason?: string;
  userName?: string;
}

export interface PackageUsageLog {
  id: string;
  date: string;
  serviceType: string;
  serviceName: string;
  attendanceId?: string;
  professionalId?: string;
  professionalName?: string;
  abatedAmount?: number; // Valor proporcional abatido nesta utilização
  notes?: string;
  usedAt: string;
}

export interface ClientPackage {
  id: string;
  name?: string;
  packageName?: string; // Mantido para compatibilidade
  clientId: string;
  clientName: string;
  clientPhone?: string;
  professionalId?: string; // Profissional vinculada ao pacote / repasse
  professionalName?: string;
  packageServiceId?: string; // Opcional
  packageType?: 'unha' | 'cabelo' | 'estetica' | 'outro';
  totalPricePaid: number; // Ex: 205.00
  consumedValue?: number; // Valor financeiro total já consumido (ex: 64,74)
  financialBalance?: number; // Saldo financeiro restante (ex: 140,26)
  paymentMethod?: PaymentMethod;
  paymentDate?: string;
  purchaseDate: string; // YYYY-MM-DD
  expiryDate?: string; // YYYY-MM-DD
  lastUsageDate?: string; // Data da última utilização
  status: PackageStatus;
  items: PackageItemBalance[];
  totalCredits?: number;
  usedCredits?: number;
  remainingCredits?: number;
  // Comissão e Repasse da profissional (calculada na venda sobre o valor integral do pacote)
  commissionPercentage?: number; // Ex: 40%
  commissionAmount?: number; // Ex: R$ 82,00 (no pacote de R$ 205,00)
  salonMargin?: number; // Ex: R$ 123,00 (valor que fica com o estabelecimento)
  repassType?: 'percentual' | 'fixo';
  repassValue?: number; // Ex: 40 (%) ou 82.00
  repassTotal?: number; // Ex: 82.00
  repassStatus?: 'pendente' | 'parcial' | 'pago';
  repassPaidAmount?: number;
  repassPaidDate?: string;
  repassPaymentMethod?: PaymentMethod;
  repassNotes?: string;
  // Histórico de auditoria e movimentações
  movements?: PackageMovementLog[];
  usageHistory: PackageUsageLog[];
  completedAt?: string;
  notes?: string;
  attendanceId?: string;
  comandaId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentTransaction {
  id: string;
  attendanceId?: string;
  comandaId?: string;
  packageId?: string;
  clientId?: string;
  clientName?: string;
  serviceName?: string;
  professionalId?: string;
  professionalName?: string;
  description: string;
  grossValue: number;
  discount: number;
  discountPercentage?: number;
  netValue: number;
  paidAmount: number;
  pendingAmount: number;
  commissionPercentage?: number;
  commissionAmount?: number;
  paymentMethod: PaymentMethod;
  status: 'pago' | 'pendente' | 'parcial';
  date: string; // YYYY-MM-DD
  type: 'receita';
  createdAt: string;
  updatedAt?: string;
}

export type ExpenseCategory = 
  | 'aluguel' 
  | 'materiais' 
  | 'produtos' 
  | 'contas' 
  | 'marketing' 
  | 'manutencao' 
  | 'comissoes' 
  | 'outros';

export interface Expense {
  id: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
  competenceDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  paymentDate?: string; // YYYY-MM-DD
  status: 'pago' | 'pendente' | 'atrasado';
  paymentMethod?: PaymentMethod;
  notes?: string;
  createdAt: string;
}

export interface CompanySettings {
  name: string;
  tradingName: string;
  logoUrl?: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  timezone: string;
  currency: string;
  openingHours: {
    [day: string]: { open: string; close: string; isOpen: boolean };
  };
  defaultServiceDuration: number;
  defaultBufferMinutes: number;
  financialStartDate?: string;
  whatsappTemplates: {
    confirmacao: string;
    lembrete: string;
    agradecimento: string;
    retorno: string;
    inativa: string;
    aniversario: string;
  };
  firebaseConfig?: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
}

export type NavigationPage = 
  | 'dashboard' 
  | 'agenda' 
  | 'clientes' 
  | 'pacotes'
  | 'servicos' 
  | 'profissionais' 
  | 'atendimentos' 
  | 'estoque'
  | 'financeiro' 
  | 'relatorios' 
  | 'configuracoes'
  | 'aniversariantes'
  | 'minha-producao'; // Página exclusiva das profissionais

export type InventoryCategory =
  | 'Tintas & Colorações'
  | 'Pó Descolorante'
  | 'Água Oxigenada'
  | 'Hidratações & Máscaras'
  | 'Shampoos'
  | 'Condicionadores'
  | 'Progressivas & Alinhamentos'
  | 'Finalizadores & Óleos'
  | 'Esmaltes & Manicure'
  | 'Descartáveis & Higiene'
  | 'Outros'
  | string;

export interface StockMovement {
  id: string;
  itemId: string;
  type: 'entrada' | 'saida' | 'ajuste';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason?: string;
  createdAt: string;
  userName?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  brand: string; // Ex: 'Lowell', 'Wella', 'Erick Kenedy'
  category: InventoryCategory;
  currentStock: number;
  minStock: number; // Dispara alerta quando currentStock <= minStock
  unit: string; // 'un', 'tubo', 'frasco', 'pote', 'litro', 'kg', 'cx'
  costPrice?: number; // Preço de custo unitário em R$
  supplier?: string; // Fornecedor / Representante
  location?: string; // Local de armazenamento (ex: Armário das Tintas, Lavatório)
  notes?: string;
  lastRestockedAt?: string;
  createdAt: string;
  updatedAt: string;
}
