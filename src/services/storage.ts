import { 
  Client, 
  Service, 
  Professional, 
  Appointment, 
  Attendance, 
  PaymentTransaction, 
  Expense, 
  CompanySettings,
  User,
  InventoryItem
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
  INVENTORY: 'tb_inventory_v3',
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
  },
  {
    id: 'user_prof_geovana',
    username: 'geovana',
    email: 'geovana@totalbeautyoficial.com.br',
    name: 'Geovana',
    role: 'profissional',
    professionalId: 'prof_geovana',
    forcePasswordChange: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user_prof_thalita',
    username: 'thalita',
    email: 'thalita@totalbeautyoficial.com.br',
    name: 'Thálita',
    role: 'profissional',
    professionalId: 'prof_thalita',
    forcePasswordChange: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user_prof_talitha',
    username: 'talitha',
    email: 'talitha@totalbeautyoficial.com.br',
    name: 'Talitha',
    role: 'profissional',
    professionalId: 'prof_talitha',
    forcePasswordChange: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user_prof_rose',
    username: 'rose',
    email: 'rose@totalbeautyoficial.com.br',
    name: 'Rose',
    role: 'profissional',
    professionalId: 'prof_rose',
    forcePasswordChange: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user_prof_elizama',
    username: 'elizama',
    email: 'elizama@totalbeautyoficial.com.br',
    name: 'Elizama',
    role: 'profissional',
    professionalId: 'prof_elizama',
    forcePasswordChange: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user_prof_leila',
    username: 'leila',
    email: 'leila@totalbeautyoficial.com.br',
    name: 'Leila',
    role: 'profissional',
    professionalId: 'prof_leila',
    forcePasswordChange: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user_prof_deborah',
    username: 'deborah',
    email: 'deborah@totalbeautyoficial.com.br',
    name: 'Deborah',
    role: 'profissional',
    professionalId: 'prof_deborah',
    forcePasswordChange: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user_prof_thais',
    username: 'thais',
    email: 'thais@totalbeautyoficial.com.br',
    name: 'Thaís',
    role: 'profissional',
    professionalId: 'prof_thais',
    forcePasswordChange: false,
    createdAt: new Date().toISOString(),
  },
];

export const INITIAL_SERVICES: Service[] = [
  // --- CABELEIREIRAS ---
  {
    id: 'srv_cab_01',
    name: 'Ultra gloss raiz',
    category: 'cabelo',
    description: 'Aplicação de ultra gloss na raiz para alinhamento e brilho espelhado',
    price: 170.00,
    durationMinutes: 30,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_cab_02',
    name: 'Ultra gloss raiz + tratamento + escova',
    category: 'cabelo',
    description: 'Ultra gloss na raiz combinado com tratamento profundo e escova finalizadora',
    price: 250.00,
    durationMinutes: 30,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_cab_03',
    name: 'Banho de brilho',
    category: 'cabelo',
    description: 'Banho de brilho capilar revitalizante e intensificador de cor',
    price: 150.00,
    durationMinutes: 30,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_cab_04',
    name: 'Camuflagem dos brilhos',
    category: 'cabelo',
    description: 'Camuflagem e uniformização dos fios com reflexos naturais',
    price: 170.00,
    durationMinutes: 30,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_cab_05',
    name: 'Ultra gloss cabelo todo',
    category: 'cabelo',
    description: 'Ultra gloss completo em toda a extensão dos cabelos',
    price: 220.00,
    durationMinutes: 30,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_cab_06',
    name: 'Coloração/ tonalização',
    category: 'cabelo',
    description: 'Coloração ou tonalização profissional completa',
    price: 150.00,
    durationMinutes: 50,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_cab_07',
    name: 'Aplic.coloração da cliente',
    category: 'cabelo',
    description: 'Aplicação técnica da coloração trazida pela cliente',
    price: 100.00,
    durationMinutes: 50,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_cab_08',
    name: 'Combo corte',
    category: 'cabelo',
    description: 'Combo de corte feminino completo com finalização',
    price: 150.00,
    durationMinutes: 60,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_cab_09',
    name: 'Corte masculino',
    category: 'cabelo',
    description: 'Corte masculino moderno com tesoura e máquina',
    price: 70.00,
    durationMinutes: 60,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_cab_10',
    name: 'Corte franja',
    category: 'cabelo',
    description: 'Aparação, alinhamento e modelagem de franja',
    price: 50.00,
    durationMinutes: 30,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_cab_11',
    name: 'Combo nutrição/hidratacao curto',
    category: 'cabelo',
    description: 'Combo intensivo de nutrição e hidratação para cabelos curtos',
    price: 160.00,
    durationMinutes: 45,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_cab_12',
    name: 'Combo nutrição/hidratacao médio',
    category: 'cabelo',
    description: 'Combo intensivo de nutrição e hidratação para cabelos médios',
    price: 180.00,
    durationMinutes: 45,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_cab_13',
    name: 'Combo nutrição/hidratacao longo',
    category: 'cabelo',
    description: 'Combo intensivo de nutrição e hidratação para cabelos longos',
    price: 200.00,
    durationMinutes: 45,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_cab_14',
    name: 'Combo reconstrução curto',
    category: 'cabelo',
    description: 'Reconstrução capilar profunda com reposição de massa para cabelos curtos',
    price: 220.00,
    durationMinutes: 45,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_cab_15',
    name: 'Combo reconstrução médio',
    category: 'cabelo',
    description: 'Reconstrução capilar profunda com reposição de massa para cabelos médios',
    price: 260.00,
    durationMinutes: 45,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_cab_16',
    name: 'Combo reconstrução longo',
    category: 'cabelo',
    description: 'Reconstrução capilar profunda com reposição de massa para cabelos longos',
    price: 280.00,
    durationMinutes: 45,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_cab_17',
    name: 'Ozônio terapia',
    category: 'cabelo',
    description: 'Ozonioterapia para oxigenação do couro cabeludo e fortalecimento dos fios',
    price: 20.00,
    durationMinutes: 20,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_cab_18',
    name: 'Escova curto',
    category: 'cabelo',
    description: 'Lavagem e escova modelada para cabelos curtos',
    price: 70.00,
    durationMinutes: 40,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_cab_19',
    name: 'Escova médio',
    category: 'cabelo',
    description: 'Lavagem e escova modelada para cabelos médios',
    price: 85.00,
    durationMinutes: 60,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_cab_20',
    name: 'Escova longo',
    category: 'cabelo',
    description: 'Lavagem e escova modelada para cabelos longos',
    price: 100.00,
    durationMinutes: 60,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_cab_21',
    name: 'Cachos e ondas',
    category: 'cabelo',
    description: 'Finalização e modelagem térmica de cachos ou ondas com babyliss',
    price: 20.00,
    durationMinutes: 30,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_cab_22',
    name: 'Pranchas',
    category: 'cabelo',
    description: 'Alinhamento liso com prancha térmica de alta performance',
    price: 20.00,
    durationMinutes: 40,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_cab_23',
    name: 'Secagem simples',
    category: 'cabelo',
    description: 'Lavagem e secagem simples com secador profissional',
    price: 50.00,
    durationMinutes: 30,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_cab_24',
    name: 'Higienização',
    category: 'cabelo',
    description: 'Higienização e lavagem capilar com produtos premium',
    price: 30.00,
    durationMinutes: 15,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_cab_25',
    name: 'Higienização especial',
    category: 'cabelo',
    description: 'Higienização especial com massagem capilar revigorante',
    price: 40.00,
    durationMinutes: 15,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_cab_26',
    name: 'Matização',
    category: 'cabelo',
    description: 'Matização para neutralizar e realçar os reflexos claros ou loiros',
    price: 60.00,
    durationMinutes: 30,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_cab_27',
    name: 'Mechas curto parcial',
    category: 'cabelo',
    description: 'Técnica de mechas parciais em cabelos de comprimento curto',
    price: 290.00,
    durationMinutes: 180,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_cab_28',
    name: 'Mechas médio parcial',
    category: 'cabelo',
    description: 'Técnica de mechas parciais em cabelos de comprimento médio',
    price: 390.00,
    durationMinutes: 180,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_cab_29',
    name: 'Mechas longo parcial',
    category: 'cabelo',
    description: 'Técnica de mechas parciais em cabelos de comprimento longo',
    price: 490.00,
    durationMinutes: 180,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_cab_30',
    name: 'Mechas curto global',
    category: 'cabelo',
    description: 'Técnica de mechas globais completas em cabelos curtos',
    price: 520.00,
    durationMinutes: 180,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_cab_31',
    name: 'Mechas médio global',
    category: 'cabelo',
    description: 'Técnica de mechas globais completas em cabelos médios',
    price: 620.00,
    durationMinutes: 180,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_cab_32',
    name: 'Mechas longo global',
    category: 'cabelo',
    description: 'Técnica de mechas globais completas em cabelos longos',
    price: 720.00,
    durationMinutes: 180,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_cab_33',
    name: 'Progressiva/selagem curto',
    category: 'cabelo',
    description: 'Alinhamento térmico progressiva ou selagem para cabelos curtos',
    price: 250.00,
    durationMinutes: 50,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_cab_34',
    name: 'Progressiva/selagem médio',
    category: 'cabelo',
    description: 'Alinhamento térmico progressiva ou selagem para cabelos médios',
    price: 300.00,
    durationMinutes: 50,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_cab_35',
    name: 'Progressiva/selagem longo',
    category: 'cabelo',
    description: 'Alinhamento térmico progressiva ou selagem para cabelos longos',
    price: 350.00,
    durationMinutes: 50,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_cab_36',
    name: 'Maquiagem',
    category: 'maquiagem',
    description: 'Maquiagem social completa para ocasiões e festas',
    price: 160.00,
    durationMinutes: 60,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_cab_37',
    name: 'Maquiagem mais cabelo',
    category: 'maquiagem',
    description: 'Combo completo de maquiagem profissional com produção de cabelo',
    price: 250.00,
    durationMinutes: 120,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_cab_38',
    name: 'Penteado',
    category: 'cabelo',
    description: 'Penteado elaborado para eventos e ocasiões especiais',
    price: 250.00,
    durationMinutes: 60,
    commissionPercentage: 50,
    isActive: true,
  },

  // --- MANICURES ---
  {
    id: 'srv_man_01',
    name: 'Manicure',
    category: 'unhas',
    description: 'Cutilagem e esmaltação tradicional das mãos',
    price: 40.00,
    durationMinutes: 30,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_man_02',
    name: 'Pedicure',
    category: 'unhas',
    description: 'Cutilagem, lixamento e esmaltação tradicional dos pés',
    price: 45.00,
    durationMinutes: 30,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_man_03',
    name: 'Pedicure e manicure',
    category: 'unhas',
    description: 'Combo completo de cuidados para mãos e pés',
    price: 70.00,
    durationMinutes: 60,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_man_04',
    name: 'Esmaltação',
    category: 'unhas',
    description: 'Aplicação e troca de esmalte simples',
    price: 25.00,
    durationMinutes: 15,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_man_05',
    name: 'Blindagem mão',
    category: 'unhas',
    description: 'Camada de proteção e fortalecimento em gel nas unhas das mãos',
    price: 120.00,
    durationMinutes: 60,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_man_06',
    name: 'Blindagem pé',
    category: 'unhas',
    description: 'Camada de proteção e fortalecimento em gel nas unhas dos pés',
    price: 90.00,
    durationMinutes: 60,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_man_07',
    name: 'Remoção',
    category: 'unhas',
    description: 'Remoção cuidadosa de blindagem, gel ou esmaltação prolongada',
    price: 30.00,
    durationMinutes: 30,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_man_08',
    name: 'SPA',
    category: 'unhas',
    description: 'Spa dos pés completo com esfoliação, imersão relaxante e hidratação profunda',
    price: 130.00,
    durationMinutes: 120,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_man_09',
    name: 'Higienização especial (unhas)',
    category: 'unhas',
    description: 'Higienização e assepsia profunda especializada para unhas',
    price: 80.00,
    durationMinutes: 60,
    commissionPercentage: 50,
    isActive: true,
  },

  // --- ESTETICISTA ---
  {
    id: 'srv_est_01',
    name: 'Depilação cava',
    category: 'estetica',
    description: 'Depilação da virilha / cava com cera descartável higiênica',
    price: 70.00,
    durationMinutes: 30,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_est_02',
    name: 'Depilação perna inteira',
    category: 'estetica',
    description: 'Depilação completa de pernas inteiras',
    price: 70.00,
    durationMinutes: 30,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_est_03',
    name: 'Depilação meia perna',
    category: 'estetica',
    description: 'Depilação de meia perna com cera morna',
    price: 45.00,
    durationMinutes: 20,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_est_04',
    name: 'Depilação axilas',
    category: 'estetica',
    description: 'Depilação de axilas com cera higiênica e calmante pós-depilatório',
    price: 35.00,
    durationMinutes: 15,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_est_05',
    name: 'Depilação buço',
    category: 'estetica',
    description: 'Depilação facial delicada da região do buço',
    price: 25.00,
    durationMinutes: 10,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_est_06',
    name: 'Designer sobrancelha',
    category: 'sobrancelhas',
    description: 'Design de sobrancelhas personalizado com pinça e alinhamento',
    price: 40.00,
    durationMinutes: 30,
    commissionPercentage: 50,
    isActive: true,
  },
  {
    id: 'srv_est_07',
    name: 'Micropigmentação',
    category: 'sobrancelhas',
    description: 'Micropigmentação de sobrancelhas com técnica natural e durabilidade',
    price: 300.00,
    durationMinutes: 180,
    commissionPercentage: 50,
    isActive: true,
  },

  // --- LASH ---
  {
    id: 'srv_lash_01',
    name: 'Lash designer',
    category: 'cilios',
    description: 'Extensão de cílios fio a fio personalizada com mapeamento do olhar',
    price: 160.00,
    durationMinutes: 240,
    commissionPercentage: 50,
    isActive: true,
  },
];

export const INITIAL_PROFESSIONALS: Professional[] = [
  // --- MANICURES ---
  {
    id: 'prof_geovana',
    name: 'Geovana',
    specialty: 'Manicure & Pedicure',
    phone: '',
    color: '#D98880',
    isActive: true,
    userId: 'user_prof_geovana',
    username: 'geovana',
  },
  {
    id: 'prof_thalita',
    name: 'Thálita',
    specialty: 'Manicure & Nail Designer',
    phone: '',
    color: '#C58F9B',
    isActive: true,
    userId: 'user_prof_thalita',
    username: 'thalita',
  },
  {
    id: 'prof_talitha',
    name: 'Talitha',
    specialty: 'Manicure & Spa dos Pés',
    phone: '',
    color: '#E59866',
    isActive: true,
    userId: 'user_prof_talitha',
    username: 'talitha',
  },

  // --- ESTETICISTA ---
  {
    id: 'prof_rose',
    name: 'Rose',
    specialty: 'Esteticista & Depilação',
    phone: '',
    color: '#5DADE2',
    isActive: true,
    userId: 'user_prof_rose',
    username: 'rose',
  },

  // --- CABELEIREIRAS ---
  {
    id: 'prof_elizama',
    name: 'Elizama',
    specialty: 'Cabeleireira & Maquiagem',
    phone: '',
    color: '#AF7AC5',
    isActive: true,
    userId: 'user_prof_elizama',
    username: 'elizama',
  },
  {
    id: 'prof_leila',
    name: 'Leila',
    specialty: 'Cabeleireira & Terapeuta Capilar',
    phone: '',
    color: '#48C9B0',
    isActive: true,
    userId: 'user_prof_leila',
    username: 'leila',
  },

  // --- LASH ---
  {
    id: 'prof_deborah',
    name: 'Deborah',
    specialty: 'Lash Designer',
    phone: '',
    color: '#F48FB1',
    isActive: true,
    userId: 'user_prof_deborah',
    username: 'deborah',
  },

  // --- MAQUIAGEM ---
  {
    id: 'prof_thais',
    name: 'Thaís',
    specialty: 'Maquiagem & Visagismo',
    phone: '',
    color: '#F1948A',
    isActive: true,
    userId: 'user_prof_thais',
    username: 'thais',
  },
];

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
    inativa: 'Olá, [NOME]! Sentimos sua falta aqui na Total Beauty! Preparamos um mimo exclusivo para o seu retorno neste mês. Vamos agendar seu momento de bem-estar?',
    aniversario: 'Parabéns, [NOME]! 🎂✨ Toda a equipe da Total Beauty deseja a você um feliz aniversário, com muita saúde, luz e momentos especiais! Para comemorar essa data tão especial, preparamos um carinho exclusivo no seu próximo atendimento conosco. Vamos agendar seu momento de bem-estar?'
  }
};

export const INITIAL_INVENTORY: InventoryItem[] = [
  // 1. Tintas & Colorações (Wella)
  {
    id: 'inv_wella_cp_60',
    name: 'Color Perfect 6.0 Louro Escuro 60g',
    brand: 'Wella',
    category: 'Tintas & Colorações',
    currentStock: 6,
    minStock: 3,
    unit: 'tubo',
    costPrice: 38.50,
    supplier: 'Representante Wella Professional',
    location: 'Armário das Tintas',
    notes: 'Base fundamental para cobertura de fios brancos',
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
  },
  {
    id: 'inv_wella_cp_71',
    name: 'Color Perfect 7.1 Louro Médio Acinzentado 60g',
    brand: 'Wella',
    category: 'Tintas & Colorações',
    currentStock: 2,
    minStock: 3,
    unit: 'tubo',
    costPrice: 38.50,
    supplier: 'Representante Wella Professional',
    location: 'Armário das Tintas',
    notes: 'Muito utilizado para neutralização de tons quentes',
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
  },
  {
    id: 'inv_wella_cp_80',
    name: 'Color Perfect 8.0 Louro Claro 60g',
    brand: 'Wella',
    category: 'Tintas & Colorações',
    currentStock: 1,
    minStock: 2,
    unit: 'tubo',
    costPrice: 38.50,
    supplier: 'Representante Wella Professional',
    location: 'Armário das Tintas',
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
  },
  {
    id: 'inv_wella_cp_50',
    name: 'Color Perfect 5.0 Castanho Claro 60g',
    brand: 'Wella',
    category: 'Tintas & Colorações',
    currentStock: 0,
    minStock: 2,
    unit: 'tubo',
    costPrice: 38.50,
    supplier: 'Representante Wella Professional',
    location: 'Armário das Tintas',
    notes: 'Urgente para retoque de raiz de clientes agendadas',
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
  },

  // 2. Pó Descolorante (Wella & Lowell)
  {
    id: 'inv_wella_blondor',
    name: 'Blondor Multi Blonde Pó Descolorante 800g',
    brand: 'Wella',
    category: 'Pó Descolorante',
    currentStock: 3,
    minStock: 2,
    unit: 'pote',
    costPrice: 145.00,
    supplier: 'Representante Wella Professional',
    location: 'Bancada Química',
    notes: 'Abre até 7 tons, clareamento limpo e seguro',
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
  },
  {
    id: 'inv_lowell_descolorante',
    name: 'Pó Descolorante Lowell Protect Care 500g',
    brand: 'Lowell',
    category: 'Pó Descolorante',
    currentStock: 1,
    minStock: 2,
    unit: 'pote',
    costPrice: 78.00,
    supplier: 'Distribuidora Lowell',
    location: 'Bancada Química',
    notes: 'Ação rápida com queratina protetora',
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
  },

  // 3. Água Oxigenada (Wella & Lowell)
  {
    id: 'inv_wella_ox_20',
    name: 'Welloxon Perfect 20 Volumes (6%) 1000ml',
    brand: 'Wella',
    category: 'Água Oxigenada',
    currentStock: 4,
    minStock: 2,
    unit: 'frasco',
    costPrice: 49.00,
    supplier: 'Representante Wella Professional',
    location: 'Lavatório / Bancada',
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
  },
  {
    id: 'inv_wella_ox_30',
    name: 'Welloxon Perfect 30 Volumes (9%) 1000ml',
    brand: 'Wella',
    category: 'Água Oxigenada',
    currentStock: 2,
    minStock: 2,
    unit: 'frasco',
    costPrice: 49.00,
    supplier: 'Representante Wella Professional',
    location: 'Lavatório / Bancada',
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
  },
  {
    id: 'inv_lowell_ox_20',
    name: 'Emulsão Reveladora Lowell 20 Vol 900ml',
    brand: 'Lowell',
    category: 'Água Oxigenada',
    currentStock: 3,
    minStock: 2,
    unit: 'frasco',
    costPrice: 34.00,
    supplier: 'Distribuidora Lowell',
    location: 'Lavatório / Bancada',
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
  },

  // 4. Hidratações & Máscaras (Lowell, Wella & Erick Kenedy)
  {
    id: 'inv_lowell_protect_mask',
    name: 'Máscara Protect Care Power Nutri 450g',
    brand: 'Lowell',
    category: 'Hidratações & Máscaras',
    currentStock: 3,
    minStock: 2,
    unit: 'pote',
    costPrice: 88.00,
    supplier: 'Distribuidora Lowell',
    location: 'Lavatório - Tratamentos',
    notes: 'Nutrição profunda para cabelos ressecados',
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
  },
  {
    id: 'inv_erick_mascara_rec',
    name: 'Máscara Reconstrutora Erick Kenedy 500g',
    brand: 'Erick Kenedy',
    category: 'Hidratações & Máscaras',
    currentStock: 2,
    minStock: 2,
    unit: 'pote',
    costPrice: 95.00,
    supplier: 'Erick Kenedy Cosméticos',
    location: 'Lavatório - Tratamentos',
    notes: 'Reconstrução com aminoácidos pós-química',
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
  },
  {
    id: 'inv_wella_oil_mask',
    name: 'Wella Oil Reflections Máscara 500ml',
    brand: 'Wella',
    category: 'Hidratações & Máscaras',
    currentStock: 2,
    minStock: 1,
    unit: 'pote',
    costPrice: 135.00,
    supplier: 'Representante Wella Professional',
    location: 'Lavatório - Premium',
    notes: 'Luminosidade e maciez extrema com óleos preciosos',
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
  },

  // 5. Shampoos & Condicionadores (Lowell & Erick Kenedy)
  {
    id: 'inv_lowell_shampoo_lav',
    name: 'Shampoo Lavatório Protect Care 2.5L',
    brand: 'Lowell',
    category: 'Shampoos',
    currentStock: 2,
    minStock: 1,
    unit: 'frasco',
    costPrice: 98.00,
    supplier: 'Distribuidora Lowell',
    location: 'Lavatório Principal',
    notes: 'Galão grande de uso profissional diário',
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
  },
  {
    id: 'inv_lowell_cond_lav',
    name: 'Condicionador Lavatório Protect Care 2.5L',
    brand: 'Lowell',
    category: 'Condicionadores',
    currentStock: 2,
    minStock: 1,
    unit: 'frasco',
    costPrice: 98.00,
    supplier: 'Distribuidora Lowell',
    location: 'Lavatório Principal',
    notes: 'Galão grande de uso profissional diário',
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
  },
  {
    id: 'inv_erick_shampoo_nutri',
    name: 'Shampoo Nutritivo Erick Kenedy 1000ml',
    brand: 'Erick Kenedy',
    category: 'Shampoos',
    currentStock: 3,
    minStock: 2,
    unit: 'frasco',
    costPrice: 72.00,
    supplier: 'Erick Kenedy Cosméticos',
    location: 'Lavatório',
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
  },

  // 6. Progressivas & Alinhamento Sem Formol (Erick Kenedy & Lowell)
  {
    id: 'inv_erick_alinhamento',
    name: 'Alinhamento Térmico Sem Formol 1000ml',
    brand: 'Erick Kenedy',
    category: 'Progressivas & Alinhamentos',
    currentStock: 1,
    minStock: 2,
    unit: 'frasco',
    costPrice: 195.00,
    supplier: 'Erick Kenedy Cosméticos',
    location: 'Armário de Químicas',
    notes: 'Zero formol, alinhamento perfeito compatível com loiras e morenas',
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
  },
  {
    id: 'inv_lowell_bioplastia',
    name: 'Bioplastia Selagem / Alinhamento 1000ml',
    brand: 'Lowell',
    category: 'Progressivas & Alinhamentos',
    currentStock: 2,
    minStock: 1,
    unit: 'frasco',
    costPrice: 165.00,
    supplier: 'Distribuidora Lowell',
    location: 'Armário de Químicas',
    notes: 'Redução de volume e blindagem dos fios',
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
  },
];

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
const CATALOG_VERSION_FLAG = 'tb_official_catalog_v2';
const PROFESSIONALS_VERSION_FLAG = 'tb_official_professionals_v3';
const ADMIN_AUTH_SYNC_FLAG = 'tb_admin_auth_sync_v7';

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

    // Initialize clean empty data in storage, and seed the official 55 services and 8 professionals
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(INITIAL_SERVICES));
    localStorage.setItem(STORAGE_KEYS.PROFESSIONALS, JSON.stringify(INITIAL_PROFESSIONALS));
    localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.ATTENDANCES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));

    // Set passwords for all default users
    DEFAULT_USERS.forEach(u => {
      const pwd = u.role === 'admin' ? 'admin123' : `${u.username}123`;
      if (!localStorage.getItem('tb_pwd_' + u.id)) {
        localStorage.setItem('tb_pwd_' + u.id, hashPassword(pwd));
      }
    });

    localStorage.setItem(CLEAN_PROD_FLAG, 'true');
    localStorage.setItem(CATALOG_VERSION_FLAG, 'true');
    localStorage.setItem(PROFESSIONALS_VERSION_FLAG, 'true');
  }

  // Ensure official catalog of services is loaded for active browsers
  const hasCatalog = localStorage.getItem(CATALOG_VERSION_FLAG);
  if (!hasCatalog) {
    localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(INITIAL_SERVICES));
    localStorage.setItem(CATALOG_VERSION_FLAG, 'true');
    syncCollectionToFirestore('services', INITIAL_SERVICES);
  }

  // Ensure official professionals are loaded for active browsers
  const hasProfessionals = localStorage.getItem(PROFESSIONALS_VERSION_FLAG);
  if (!hasProfessionals) {
    localStorage.setItem(STORAGE_KEYS.PROFESSIONALS, JSON.stringify(INITIAL_PROFESSIONALS));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));

    DEFAULT_USERS.forEach(u => {
      const pwd = u.role === 'admin' ? 'admin123' : `${u.username}123`;
      if (!localStorage.getItem('tb_pwd_' + u.id)) {
        localStorage.setItem('tb_pwd_' + u.id, hashPassword(pwd));
      }
    });

    localStorage.setItem(PROFESSIONALS_VERSION_FLAG, 'true');
    syncCollectionToFirestore('professionals', INITIAL_PROFESSIONALS);
    syncCollectionToFirestore('users', DEFAULT_USERS);
  }

  // Ensure admin user and password hash are 100% active and uncorrupted
  const hasAdminSync = localStorage.getItem(ADMIN_AUTH_SYNC_FLAG);
  if (!hasAdminSync) {
    const rawUsers = localStorage.getItem(STORAGE_KEYS.USERS);
    let usersList: User[] = rawUsers ? JSON.parse(rawUsers) : [];
    
    let admin = usersList.find(u => u.username.toLowerCase() === 'admin');
    if (!admin) {
      usersList.unshift(DEFAULT_USERS[0]);
    } else {
      admin.role = 'admin';
      admin.forcePasswordChange = false;
    }

    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(usersList));
    localStorage.setItem('tb_pwd_user_admin_01', hashPassword('admin123'));
    if (admin?.id) {
      localStorage.setItem('tb_pwd_' + admin.id, hashPassword('admin123'));
    }
    localStorage.removeItem('tb_login_attempts_v1');
    localStorage.setItem(ADMIN_AUTH_SYNC_FLAG, 'true');
  }
}

// LocalStorage helpers with automatic seeding
export const storageService = {
  getUsers(): User[] {
    ensureCleanProductionState();
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    let users: User[] = raw ? JSON.parse(raw) : [];

    // Ensure all default users (admin and registered professionals) exist
    let modified = false;
    DEFAULT_USERS.forEach(defUser => {
      if (!users.some(u => u.username.toLowerCase() === defUser.username.toLowerCase())) {
        users.push(defUser);
        modified = true;
      }
      // Ensure password hash exists
      const pwd = defUser.role === 'admin' ? 'admin123' : `${defUser.username}123`;
      if (!localStorage.getItem('tb_pwd_' + defUser.id)) {
        localStorage.setItem('tb_pwd_' + defUser.id, hashPassword(pwd));
      }
    });

    if (modified || !raw) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
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
    ensureCleanProductionState();
    const raw = localStorage.getItem(STORAGE_KEYS.SERVICES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(INITIAL_SERVICES));
      return INITIAL_SERVICES;
    }
    let services: Service[] = JSON.parse(raw);
    if (services.length === 0) {
      services = INITIAL_SERVICES;
      localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(INITIAL_SERVICES));
    }
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
    ensureCleanProductionState();
    const raw = localStorage.getItem(STORAGE_KEYS.PROFESSIONALS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.PROFESSIONALS, JSON.stringify(INITIAL_PROFESSIONALS));
      return INITIAL_PROFESSIONALS;
    }
    let profs: Professional[] = JSON.parse(raw);
    if (profs.length === 0) {
      profs = INITIAL_PROFESSIONALS;
      localStorage.setItem(STORAGE_KEYS.PROFESSIONALS, JSON.stringify(INITIAL_PROFESSIONALS));
    }
    return profs;
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

  getInventory(): InventoryItem[] {
    const raw = localStorage.getItem(STORAGE_KEYS.INVENTORY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(INITIAL_INVENTORY));
      return INITIAL_INVENTORY;
    }
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(INITIAL_INVENTORY));
        return INITIAL_INVENTORY;
      }
      return parsed;
    } catch {
      localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(INITIAL_INVENTORY));
      return INITIAL_INVENTORY;
    }
  },

  saveInventory(inventory: InventoryItem[]): void {
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inventory));
    syncCollectionToFirestore('inventory', inventory);
  },

  getSettings(): CompanySettings {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
      return INITIAL_SETTINGS;
    }
    const parsed: CompanySettings = JSON.parse(raw);
    if (!parsed.whatsappTemplates) {
      parsed.whatsappTemplates = INITIAL_SETTINGS.whatsappTemplates;
    } else if (!parsed.whatsappTemplates.aniversario) {
      parsed.whatsappTemplates.aniversario = INITIAL_SETTINGS.whatsappTemplates.aniversario;
    }
    return parsed;
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
      inventory: this.getInventory(),
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
      if (parsed.inventory) this.saveInventory(parsed.inventory);
      if (parsed.settings) this.saveSettings(parsed.settings);
      return true;
    } catch (e) {
      console.error('Failed to import backup:', e);
      return false;
    }
  },

  clearAllData(): void {
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(INITIAL_SERVICES));
    localStorage.setItem(STORAGE_KEYS.PROFESSIONALS, JSON.stringify(INITIAL_PROFESSIONALS));
    localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.ATTENDANCES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(INITIAL_INVENTORY));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));

    DEFAULT_USERS.forEach(u => {
      const pwd = u.role === 'admin' ? 'admin123' : `${u.username}123`;
      if (!localStorage.getItem('tb_pwd_' + u.id)) {
        localStorage.setItem('tb_pwd_' + u.id, hashPassword(pwd));
      }
    });

    // Clear Firestore collections if connected, keeping official services & professionals & inventory
    syncCollectionToFirestore('clients', []);
    syncCollectionToFirestore('services', INITIAL_SERVICES);
    syncCollectionToFirestore('professionals', INITIAL_PROFESSIONALS);
    syncCollectionToFirestore('inventory', INITIAL_INVENTORY);
    syncCollectionToFirestore('users', DEFAULT_USERS);
    syncCollectionToFirestore('appointments', []);
    syncCollectionToFirestore('attendances', []);
    syncCollectionToFirestore('payments', []);
    syncCollectionToFirestore('expenses', []);
  }
};
