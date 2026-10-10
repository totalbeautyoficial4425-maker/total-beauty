import { 
  Client, 
  Service, 
  Professional, 
  Appointment, 
  Attendance, 
  PaymentTransaction, 
  Expense, 
  CompanySettings,
  User 
} from '../types';
import { getFirebaseInstance, syncCollectionToFirestore, fetchCollectionFromFirestore } from './firebase';

const STORAGE_KEYS = {
  USERS: 'tb_users_v1',
  AUTH_SESSION: 'tb_session_v1',
  CLIENTS: 'tb_clients_v1',
  SERVICES: 'tb_services_v1',
  PROFESSIONALS: 'tb_professionals_v1',
  APPOINTMENTS: 'tb_appointments_v1',
  ATTENDANCES: 'tb_attendances_v1',
  PAYMENTS: 'tb_payments_v1',
  EXPENSES: 'tb_expenses_v1',
  SETTINGS: 'tb_settings_v1',
  LOGIN_ATTEMPTS: 'tb_login_attempts_v1'
};

// Simple secure hash simulation for browser client-side demo storage
export function hashPassword(password: string): string {
  let hash = 0;
  const salt = 'TB_SECURE_SALT_2025#@!';
  const str = password + salt;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `sha256_${Math.abs(hash).toString(16)}_${str.length}`;
}

const DEFAULT_USERS: User[] = [
  {
    id: 'user_admin_01',
    username: 'admin',
    email: 'gestao@totalbeautyoficial.com.br',
    name: 'Administradora Total Beauty',
    role: 'admin',
    forcePasswordChange: true, // Requires change on first access as requested!
    createdAt: new Date().toISOString(),
  }
];

export const INITIAL_SERVICES: Service[] = [
  {
    id: 'srv_1',
    name: 'Escova Modelada & Nutrição Glow',
    category: 'cabelo',
    description: 'Lavagem com massagem craniana, nutrição profunda e escova com acabamento premium.',
    price: 140.00,
    durationMinutes: 60,
    isActive: true,
  },
  {
    id: 'srv_2',
    name: 'Mechas Iluminadas & Matização',
    category: 'cabelo',
    description: 'Técnica personalizada de morena iluminada com plex reconstrutor e finalização.',
    price: 490.00,
    durationMinutes: 180,
    isActive: true,
  },
  {
    id: 'srv_3',
    name: 'Corte Visagista & Finalização',
    category: 'cabelo',
    description: 'Análise de formato facial, corte de alta precisão e styling com ondas.',
    price: 160.00,
    durationMinutes: 60,
    isActive: true,
  },
  {
    id: 'srv_4',
    name: 'Alongamento em Gel Slim',
    category: 'unhas',
    description: 'Estrutura ultra fina, nivelamento perfeito e esmaltação em gel de alta durabilidade.',
    price: 220.00,
    durationMinutes: 120,
    isActive: true,
  },
  {
    id: 'srv_5',
    name: 'Manicure & Spa dos Pés',
    category: 'unhas',
    description: 'Esfoliação com óleos essenciais, hidratação profunda, cuticulagem e esmaltação.',
    price: 95.00,
    durationMinutes: 50,
    isActive: true,
  },
  {
    id: 'srv_6',
    name: 'Design de Sobrancelhas com Henna',
    category: 'sobrancelhas',
    description: 'Mapeamento facial simétrico, alinhamento dos fios e aplicação de henna orgânica.',
    price: 85.00,
    durationMinutes: 40,
    isActive: true,
  },
  {
    id: 'srv_7',
    name: 'Extensão de Cílios Efeito Rímel',
    category: 'cilios',
    description: 'Aplicação fio a fio premium, curvatura e densidade elegante e leve.',
    price: 190.00,
    durationMinutes: 90,
    isActive: true,
  },
  {
    id: 'srv_8',
    name: 'Maquiagem Social Beauty',
    category: 'maquiagem',
    description: 'Pele blindada resistente à água, olhos esfumados com acabamento de alta definição.',
    price: 250.00,
    durationMinutes: 75,
    isActive: true,
  },
  {
    id: 'srv_9',
    name: 'Limpeza de Pele Profunda com LED',
    category: 'estetica',
    description: 'Extração indolor, alta frequência, hidratação biocompatível e fototerapia.',
    price: 210.00,
    durationMinutes: 80,
    isActive: true,
  }
];

export const INITIAL_PROFESSIONALS: Professional[] = [
  {
    id: 'prof_1',
    name: 'Gabriela Prado',
    specialty: 'Master Hair Stylist & Colorista',
    phone: '(11) 98765-4301',
    color: '#C58F9B',
    isActive: true,
  },
  {
    id: 'prof_2',
    name: 'Larissa Mendes',
    specialty: 'Nail Designer & Spa',
    phone: '(11) 98765-4302',
    color: '#8A7064',
    isActive: true,
  },
  {
    id: 'prof_3',
    name: 'Camila Rocha',
    specialty: 'Lash & Brow Specialist',
    phone: '(11) 98765-4303',
    color: '#E7D9C8',
    isActive: true,
  },
  {
    id: 'prof_4',
    name: 'Amanda Valença',
    specialty: 'Estética Facial & Makeup',
    phone: '(11) 98765-4304',
    color: '#E8CDD2',
    isActive: true,
  }
];

export const INITIAL_CLIENTS: Client[] = [
  {
    id: 'cli_1',
    name: 'Juliana Silva Ferreira',
    phone: '(11) 98452-1920',
    whatsapp: '(11) 98452-1920',
    email: 'juliana.silva@exemplo.com.br',
    birthDate: '1992-05-14',
    address: {
      street: 'Alameda dos Ipês',
      number: '420',
      neighborhood: 'Jardins',
      city: 'São Paulo',
      state: 'SP',
      zip: '01404-001'
    },
    notes: 'Prefere café sem açúcar. Alérgica a produtos com amônia forte.',
    createdAt: '2025-01-10T10:00:00Z',
    lastVisit: '2025-02-14',
    totalVisits: 4,
    totalSpent: 870.00,
    communicationConsent: true,
    isArchived: false,
  },
  {
    id: 'cli_2',
    name: 'Fernanda Oliveira Costa',
    phone: '(11) 99123-8841',
    whatsapp: '(11) 99123-8841',
    email: 'fernanda.costa@exemplo.com.br',
    birthDate: '1988-11-22',
    address: {
      street: 'Rua Bela Cintra',
      number: '1250',
      neighborhood: 'Consolação',
      city: 'São Paulo',
      state: 'SP',
      zip: '01415-000'
    },
    notes: 'Faz manutenção de unhas rigorosamente a cada 20 dias.',
    createdAt: '2025-01-15T14:30:00Z',
    lastVisit: '2025-02-10',
    totalVisits: 3,
    totalSpent: 535.00,
    communicationConsent: true,
    isArchived: false,
  },
  {
    id: 'cli_3',
    name: 'Mariana Albuquerque',
    phone: '(11) 97654-3210',
    whatsapp: '(11) 97654-3210',
    email: 'mariana.albuquerque@exemplo.com.br',
    birthDate: '1995-03-08',
    address: {
      street: 'Av. Paulista',
      number: '900',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      zip: '01310-100'
    },
    notes: 'Gosta de acabamento natural na sobrancelha e tom castanho médio.',
    createdAt: '2025-02-01T09:15:00Z',
    lastVisit: '2025-02-12',
    totalVisits: 2,
    totalSpent: 275.00,
    communicationConsent: true,
    isArchived: false,
  },
  {
    id: 'cli_4',
    name: 'Beatriz Fontes',
    phone: '(11) 98877-6655',
    whatsapp: '(11) 98877-6655',
    email: 'beatriz.fontes@exemplo.com.br',
    birthDate: '1990-09-17',
    notes: 'Cliente vip de mechas. Agendar sempre com Gabriela.',
    createdAt: '2025-01-05T11:00:00Z',
    lastVisit: '2025-01-20',
    totalVisits: 2,
    totalSpent: 980.00,
    communicationConsent: true,
    isArchived: false,
  },
  {
    id: 'cli_5',
    name: 'Carolina Martins',
    phone: '(11) 97112-3344',
    whatsapp: '(11) 97112-3344',
    email: 'carolina.martins@exemplo.com.br',
    birthDate: '1998-07-30',
    notes: 'Primeira cliente indicada por Juliana.',
    createdAt: '2025-02-14T16:00:00Z',
    lastVisit: '2025-02-14',
    totalVisits: 1,
    totalSpent: 190.00,
    communicationConsent: true,
    isArchived: false,
  }
];

export const INITIAL_SETTINGS: CompanySettings = {
  name: 'TOTAL BEAUTY',
  tradingName: 'TOTAL BEAUTY — Gestão Inteligente de Beleza',
  logoUrl: '/logo.png',
  phone: '(11) 3280-9000',
  whatsapp: '(11) 98765-4300',
  email: 'contato@totalbeautyoficial.com.br',
  address: 'Rua Oscar Freire, 1120 — Jardins, São Paulo - SP, CEP 01426-001',
  timezone: 'America/Sao_Paulo',
  currency: 'BRL',
  openingHours: {
    'segunda': { open: '09:00', close: '19:00', isOpen: true },
    'terca': { open: '09:00', close: '20:00', isOpen: true },
    'quarta': { open: '09:00', close: '20:00', isOpen: true },
    'quinta': { open: '09:00', close: '20:00', isOpen: true },
    'sexta': { open: '08:30', close: '20:30', isOpen: true },
    'sabado': { open: '08:30', close: '19:00', isOpen: true },
    'domingo': { open: '10:00', close: '15:00', isOpen: false },
  },
  defaultServiceDuration: 60,
  defaultBufferMinutes: 10,
  whatsappTemplates: {
    confirmacao: 'Olá, [NOME]! Tudo bem? Aqui é da Total Beauty. Passando para confirmar seu horário no dia [DATA], às [HORÁRIO], para [SERVIÇO] com [PROFISSIONAL]. Será um prazer receber você!',
    lembrete: 'Olá, [NOME]! Passando para lembrar do seu horário especial hoje, às [HORÁRIO], na Total Beauty ([SERVIÇO]). Estamos preparando tudo com muito carinho para você!',
    agradecimento: 'Querida [NOME], foi maravilhoso ter você conosco hoje na Total Beauty! Esperamos que tenha amado sua experiência. Se precisar de qualquer cuidado adicional, estamos à disposição.',
    retorno: 'Olá, [NOME]! Já faz um tempinho desde sua última visita na Total Beauty ([SERVIÇO]). Que tal reservar um tempinho para renovar seu autocuidado esta semana? Me avise qual horário fica melhor para você!',
    inativa: 'Olá, [NOME]! Sentimos sua falta aqui na Total Beauty! Preparamos um mimo exclusivo para o seu retorno neste mês. Vamos agendar seu momento de bem-estar?'
  }
};

export function getTodayDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function generateSeedAppointments(): Appointment[] {
  const today = getTodayDate();
  return [
    {
      id: 'apt_1',
      clientId: 'cli_1',
      clientName: 'Juliana Silva Ferreira',
      clientPhone: '(11) 98452-1920',
      serviceId: 'srv_1',
      serviceName: 'Escova Modelada & Nutrição Glow',
      professionalId: 'prof_1',
      professionalName: 'Gabriela Prado',
      date: today,
      startTime: '09:30',
      endTime: '10:30',
      durationMinutes: 60,
      price: 140.00,
      notes: 'Gostou do shampoo da linha nutritiva na visita anterior.',
      status: 'confirmado',
      createdAt: '2025-02-14T08:00:00Z',
      updatedAt: '2025-02-14T08:00:00Z'
    },
    {
      id: 'apt_2',
      clientId: 'cli_2',
      clientName: 'Fernanda Oliveira Costa',
      clientPhone: '(11) 99123-8841',
      serviceId: 'srv_4',
      serviceName: 'Alongamento em Gel Slim',
      professionalId: 'prof_2',
      professionalName: 'Larissa Mendes',
      date: today,
      startTime: '11:00',
      endTime: '13:00',
      durationMinutes: 120,
      price: 220.00,
      notes: 'Manutenção formato amendoado.',
      status: 'em_atendimento',
      createdAt: '2025-02-14T08:30:00Z',
      updatedAt: '2025-02-14T11:00:00Z'
    },
    {
      id: 'apt_3',
      clientId: 'cli_3',
      clientName: 'Mariana Albuquerque',
      clientPhone: '(11) 97654-3210',
      serviceId: 'srv_6',
      serviceName: 'Design de Sobrancelhas com Henna',
      professionalId: 'prof_3',
      professionalName: 'Camila Rocha',
      date: today,
      startTime: '14:00',
      endTime: '14:40',
      durationMinutes: 40,
      price: 85.00,
      notes: 'Tom castanho natural suave.',
      status: 'agendado',
      createdAt: '2025-02-14T09:00:00Z',
      updatedAt: '2025-02-14T09:00:00Z'
    },
    {
      id: 'apt_4',
      clientId: 'cli_4',
      clientName: 'Beatriz Fontes',
      clientPhone: '(11) 98877-6655',
      serviceId: 'srv_2',
      serviceName: 'Mechas Iluminadas & Matização',
      professionalId: 'prof_1',
      professionalName: 'Gabriela Prado',
      date: today,
      startTime: '15:00',
      endTime: '18:00',
      durationMinutes: 180,
      price: 490.00,
      notes: 'Retoque de contorno e hidratação profunda.',
      status: 'confirmado',
      createdAt: '2025-02-14T09:30:00Z',
      updatedAt: '2025-02-14T09:30:00Z'
    }
  ];
}

export function generateSeedPayments(): PaymentTransaction[] {
  const today = getTodayDate();
  return [
    {
      id: 'pay_1',
      clientId: 'cli_1',
      clientName: 'Juliana Silva Ferreira',
      serviceName: 'Escova Modelada & Nutrição Glow',
      description: 'Atendimento Concluído - Juliana Silva',
      grossValue: 140.00,
      discount: 0,
      netValue: 140.00,
      paidAmount: 140.00,
      pendingAmount: 0,
      paymentMethod: 'pix',
      status: 'pago',
      date: today,
      type: 'receita',
      createdAt: '2025-02-14T10:30:00Z'
    },
    {
      id: 'pay_2',
      clientId: 'cli_5',
      clientName: 'Carolina Martins',
      serviceName: 'Extensão de Cílios Efeito Rímel',
      description: 'Atendimento Concluído - Carolina Martins',
      grossValue: 190.00,
      discount: 10.00,
      netValue: 180.00,
      paidAmount: 180.00,
      pendingAmount: 0,
      paymentMethod: 'cartao_credito',
      status: 'pago',
      date: today,
      type: 'receita',
      createdAt: '2025-02-14T11:45:00Z'
    },
    {
      id: 'pay_3',
      clientId: 'cli_4',
      clientName: 'Beatriz Fontes',
      serviceName: 'Corte Visagista & Finalização',
      description: 'Atendimento Realizado - Beatriz Fontes',
      grossValue: 160.00,
      discount: 0,
      netValue: 160.00,
      paidAmount: 160.00,
      pendingAmount: 0,
      paymentMethod: 'cartao_debito',
      status: 'pago',
      date: '2025-02-10',
      type: 'receita',
      createdAt: '2025-02-10T14:00:00Z'
    }
  ];
}

export function generateSeedExpenses(): Expense[] {
  const today = getTodayDate();
  return [
    {
      id: 'exp_1',
      description: 'Aluguel do Espaço & Condomínio Jardins',
      category: 'aluguel',
      amount: 3200.00,
      competenceDate: today.substring(0, 7) + '-01',
      dueDate: today.substring(0, 7) + '-10',
      paymentDate: today.substring(0, 7) + '-08',
      status: 'pago',
      paymentMethod: 'transferencia',
      notes: 'Espaço principal de atendimento.',
      createdAt: '2025-02-01T10:00:00Z'
    },
    {
      id: 'exp_2',
      description: 'Reposição Linha Nutritiva Capilar & Descolorantes',
      category: 'produtos',
      amount: 680.00,
      competenceDate: today.substring(0, 7) + '-05',
      dueDate: today.substring(0, 7) + '-15',
      paymentDate: today.substring(0, 7) + '-10',
      status: 'pago',
      paymentMethod: 'pix',
      notes: 'Fornecedor autorizado L\'Oréal e Wella.',
      createdAt: '2025-02-05T14:00:00Z'
    },
    {
      id: 'exp_3',
      description: 'Campanha de Tráfego Pago Instagram Total Beauty',
      category: 'marketing',
      amount: 450.00,
      competenceDate: today.substring(0, 7) + '-01',
      dueDate: today.substring(0, 7) + '-20',
      status: 'pendente',
      paymentMethod: 'cartao_credito',
      notes: 'Foco em noivas e morena iluminada.',
      createdAt: '2025-02-08T11:00:00Z'
    },
    {
      id: 'exp_4',
      description: 'Conta de Energia Elétrica & Água',
      category: 'contas',
      amount: 380.00,
      competenceDate: today.substring(0, 7) + '-01',
      dueDate: today.substring(0, 7) + '-25',
      status: 'pendente',
      notes: 'Enel e Sabesp.',
      createdAt: '2025-02-09T09:00:00Z'
    }
  ];
}

// LocalStorage helpers with automatic seeding
export const storageService = {
  getUsers(): User[] {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!raw) {
      // Store default demo user
      const users = [...DEFAULT_USERS];
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      // Store initial hash
      localStorage.setItem('tb_pwd_' + users[0].id, hashPassword('admin123'));
      return users;
    }
    return JSON.parse(raw);
  },

  saveUsers(users: User[]): void {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    syncCollectionToFirestore('users', users);
  },

  getUserPasswordHash(userId: string): string | null {
    return localStorage.getItem('tb_pwd_' + userId) || hashPassword('admin123');
  },

  setUserPassword(userId: string, newPlainPassword: string): void {
    const hashed = hashPassword(newPlainPassword);
    localStorage.setItem('tb_pwd_' + userId, hashed);
  },

  getClients(): Client[] {
    const raw = localStorage.getItem(STORAGE_KEYS.CLIENTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(INITIAL_CLIENTS));
      return INITIAL_CLIENTS;
    }
    return JSON.parse(raw);
  },

  saveClients(clients: Client[]): void {
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
    syncCollectionToFirestore('clients', clients);
  },

  getServices(): Service[] {
    const raw = localStorage.getItem(STORAGE_KEYS.SERVICES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(INITIAL_SERVICES));
      return INITIAL_SERVICES;
    }
    return JSON.parse(raw);
  },

  saveServices(services: Service[]): void {
    localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(services));
    syncCollectionToFirestore('services', services);
  },

  getProfessionals(): Professional[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFESSIONALS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.PROFESSIONALS, JSON.stringify(INITIAL_PROFESSIONALS));
      return INITIAL_PROFESSIONALS;
    }
    return JSON.parse(raw);
  },

  saveProfessionals(professionals: Professional[]): void {
    localStorage.setItem(STORAGE_KEYS.PROFESSIONALS, JSON.stringify(professionals));
    syncCollectionToFirestore('professionals', professionals);
  },

  getAppointments(): Appointment[] {
    const raw = localStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
    if (!raw) {
      const initial = generateSeedAppointments();
      localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  },

  saveAppointments(appointments: Appointment[]): void {
    localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(appointments));
    syncCollectionToFirestore('appointments', appointments);
  },

  getAttendances(): Attendance[] {
    const raw = localStorage.getItem(STORAGE_KEYS.ATTENDANCES);
    return raw ? JSON.parse(raw) : [];
  },

  saveAttendances(attendances: Attendance[]): void {
    localStorage.setItem(STORAGE_KEYS.ATTENDANCES, JSON.stringify(attendances));
    syncCollectionToFirestore('attendances', attendances);
  },

  getPayments(): PaymentTransaction[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
    if (!raw) {
      const initial = generateSeedPayments();
      localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  },

  savePayments(payments: PaymentTransaction[]): void {
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
    syncCollectionToFirestore('payments', payments);
  },

  getExpenses(): Expense[] {
    const raw = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    if (!raw) {
      const initial = generateSeedExpenses();
      localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  },

  saveExpenses(expenses: Expense[]): void {
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
    syncCollectionToFirestore('expenses', expenses);
  },

  getSettings(): CompanySettings {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
      return INITIAL_SETTINGS;
    }
    return JSON.parse(raw);
  },

  saveSettings(settings: CompanySettings): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    const { db, isConnected } = getFirebaseInstance();
    if (isConnected && db) {
      syncCollectionToFirestore('settings', [{ id: 'general', ...settings }]);
    }
  },

  exportFullBackup(): string {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      clients: this.getClients(),
      services: this.getServices(),
      professionals: this.getProfessionals(),
      appointments: this.getAppointments(),
      attendances: this.getAttendances(),
      payments: this.getPayments(),
      expenses: this.getExpenses(),
      settings: this.getSettings(),
    };
    return JSON.stringify(data, null, 2);
  },

  importFullBackup(jsonContent: string): boolean {
    try {
      const parsed = JSON.parse(jsonContent);
      if (parsed.clients) this.saveClients(parsed.clients);
      if (parsed.services) this.saveServices(parsed.services);
      if (parsed.professionals) this.saveProfessionals(parsed.professionals);
      if (parsed.appointments) this.saveAppointments(parsed.appointments);
      if (parsed.attendances) this.saveAttendances(parsed.attendances);
      if (parsed.payments) this.savePayments(parsed.payments);
      if (parsed.expenses) this.saveExpenses(parsed.expenses);
      if (parsed.settings) this.saveSettings(parsed.settings);
      return true;
    } catch (e) {
      console.error('Failed to import backup:', e);
      return false;
    }
  }
};
