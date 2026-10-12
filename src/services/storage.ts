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
  USERS: 'tb_users_v3',
  AUTH_SESSION: 'tb_session_v1',
  CLIENTS: 'tb_clients_v3',
  SERVICES: 'tb_services_v3',
  PROFESSIONALS: 'tb_professionals_v3',
  APPOINTMENTS: 'tb_appointments_v3',
  ATTENDANCES: 'tb_attendances_v3',
  PAYMENTS: 'tb_payments_v3',
  EXPENSES: 'tb_expenses_v3',
  SETTINGS: 'tb_settings_v3',
  LOGIN_ATTEMPTS: 'tb_login_attempts_v1'
};

// Simple secure hash simulation for browser client-side storage
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

export const DEFAULT_USERS: User[] = [
  {
    id: 'user_admin_01',
    username: 'admin',
    email: 'gestao@totalbeautyoficial.com.br',
    name: 'Administradora Total Beauty',
    role: 'admin',
    forcePasswordChange: false,
    createdAt: new Date().toISOString(),
  }
];

export const INITIAL_SERVICES: Service[] = [];

export const INITIAL_PROFESSIONALS: Professional[] = [];

export const INITIAL_CLIENTS: Client[] = [];

export const INITIAL_SETTINGS: CompanySettings = {
  name: 'TOTAL BEAUTY',
  tradingName: 'TOTAL BEAUTY — Gestão Inteligente de Beleza',
  logoUrl: '/logo.png',
  phone: '',
  whatsapp: '',
  email: '',
  address: '',
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
  return [];
}

export function generateSeedPayments(): PaymentTransaction[] {
  return [];
}

export function generateSeedExpenses(): Expense[] {
  return [];
}

// Clean production migration helper to ensure previously cached demo data in user's browser is completely wiped
const CLEAN_PROD_FLAG = 'tb_clean_production_v5';

export function ensureCleanProductionState(): void {
  if (typeof window === 'undefined') return;
  const isClean = localStorage.getItem(CLEAN_PROD_FLAG);
  if (!isClean) {
    // Wipe all previous demo storage keys
    const demoKeys = [
      'tb_clients_v1', 'tb_clients_v2',
      'tb_services_v1', 'tb_services_v2',
      'tb_professionals_v1', 'tb_professionals_v2',
      'tb_appointments_v1', 'tb_appointments_v2',
      'tb_attendances_v1',
      'tb_payments_v1', 'tb_payments_v2',
      'tb_expenses_v1',
      'tb_users_v1', 'tb_users_v2',
      'tb_pwd_user_prof_01', 'tb_pwd_user_prof_02',
      'tb_pwd_user_prof_03', 'tb_pwd_user_prof_04'
    ];
    demoKeys.forEach(k => localStorage.removeItem(k));

    // Initialize clean empty data in storage
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.PROFESSIONALS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.ATTENDANCES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));

    // Ensure admin user password hash exists
    if (!localStorage.getItem('tb_pwd_user_admin_01')) {
      localStorage.setItem('tb_pwd_user_admin_01', hashPassword('admin123'));
    }

    localStorage.setItem(CLEAN_PROD_FLAG, 'true');
  }
}

// LocalStorage helpers with automatic seeding
export const storageService = {
  getUsers(): User[] {
    ensureCleanProductionState();
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    let users: User[] = raw ? JSON.parse(raw) : [];

    // Ensure admin user is registered
    if (!users.some(u => u.username.toLowerCase() === 'admin')) {
      users.push(DEFAULT_USERS[0]);
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }

    // Set initial password hash for admin if not present
    if (!localStorage.getItem('tb_pwd_user_admin_01')) {
      localStorage.setItem('tb_pwd_user_admin_01', hashPassword('admin123'));
    }

    return users;
  },

  saveUsers(users: User[]): void {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    syncCollectionToFirestore('users', users);
  },

  getUserPasswordHash(userId: string): string | null {
    const user = this.getUsers().find(u => u.id === userId);
    const defaultPlain = user?.role === 'admin' ? 'admin123' : `${user?.username || 'prof'}123`;
    return localStorage.getItem('tb_pwd_' + userId) || hashPassword(defaultPlain);
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
    const services: Service[] = JSON.parse(raw);
    // Ensure commission percentage is present
    return services.map(s => ({
      ...s,
      commissionPercentage: s.commissionPercentage ?? 50,
    }));
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
    const profs: Professional[] = JSON.parse(raw);
    return profs.map(p => ({
      ...p,
      commissionPercentage: p.commissionPercentage ?? 50,
    }));
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
      version: '2.0',
      exportedAt: new Date().toISOString(),
      users: this.getUsers(),
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
      if (parsed.users) this.saveUsers(parsed.users);
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
  },

  clearAllData(): void {
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.PROFESSIONALS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.ATTENDANCES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));

    if (!localStorage.getItem('tb_pwd_user_admin_01')) {
      localStorage.setItem('tb_pwd_user_admin_01', hashPassword('admin123'));
    }

    // Clear Firestore collections if connected
    syncCollectionToFirestore('clients', []);
    syncCollectionToFirestore('services', []);
    syncCollectionToFirestore('professionals', []);
    syncCollectionToFirestore('appointments', []);
    syncCollectionToFirestore('attendances', []);
    syncCollectionToFirestore('payments', []);
    syncCollectionToFirestore('expenses', []);
  }
};
