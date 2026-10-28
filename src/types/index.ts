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
  updatedAt: string;
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

export interface PackageItemBalance {
  serviceType: string;
  serviceName: string;
  totalQty: number;
  usedQty: number;
  remainingQty: number;
}

export interface PackageUsageLog {
  id: string;
  date: string;
  serviceType: string;
  serviceName: string;
  attendanceId?: string;
  professionalId?: string;
  professionalName?: string;
  notes?: string;
  usedAt: string;
}

export interface ClientPackage {
  id: string;
  clientId: string;
  clientName: string;
  packageServiceId: string;
  packageName: string;
  packageType: 'unha' | 'cabelo' | 'outro';
  totalPricePaid: number;
  purchaseDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  status: 'ativo' | 'esgotado' | 'expirado';
  items: PackageItemBalance[];
  usageHistory: PackageUsageLog[];
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
