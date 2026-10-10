export type UserRole = 'admin' | 'gerente' | 'profissional' | 'recepcionista';

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  role: UserRole;
  forcePasswordChange: boolean;
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
  createdAt: string;
  updatedAt: string;
}

export interface Attendance {
  id: string;
  appointmentId?: string;
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
  notes?: string;
  paymentStatus: 'pago' | 'pendente' | 'parcial';
  paidAmount: number;
  paymentMethod?: PaymentMethod;
  createdAt: string;
}

export type PaymentMethod = 
  | 'dinheiro' 
  | 'pix' 
  | 'cartao_debito' 
  | 'cartao_credito' 
  | 'transferencia' 
  | 'outros';

export interface PaymentTransaction {
  id: string;
  attendanceId?: string;
  clientId?: string;
  clientName?: string;
  serviceName?: string;
  description: string;
  grossValue: number;
  discount: number;
  netValue: number;
  paidAmount: number;
  pendingAmount: number;
  paymentMethod: PaymentMethod;
  status: 'pago' | 'pendente' | 'parcial';
  date: string; // YYYY-MM-DD
  type: 'receita';
  createdAt: string;
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
  whatsappTemplates: {
    confirmacao: string;
    lembrete: string;
    agradecimento: string;
    retorno: string;
    inativa: string;
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
  | 'atendimentos' 
  | 'financeiro' 
  | 'relatorios' 
  | 'configuracoes';
