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
  InventoryItem,
  ProductConsumption,
  Comanda,
  AppointmentDeletionLog,
  ClientPackage
} from '../types';
import { 
  getFirebaseInstance, 
  syncCollectionToFirestore, 
  fetchCollectionFromFirestore,
  deleteDocumentFromFirestore
} from './firebase';
import { idbStorage } from './idbStorage';
import avecClientsData from '../data/avecClients.json';

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (err: any) {
    if (err?.name === 'QuotaExceededError' || err?.code === 22) {
      console.warn(`LocalStorage quota exceeded for ${key}. Persisting via High-Capacity IndexedDB & Firebase Cloud.`);
    } else {
      console.warn(`Error writing to localStorage for ${key}:`, err);
    }
  }
}

export const STORAGE_KEYS = {
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
  CONSUMPTIONS: 'tb_consumptions_v3',
  COMANDAS: 'tb_comandas_v3',
  SETTINGS: 'tb_settings_v3',
  LOGIN_ATTEMPTS: 'tb_login_attempts_v1',
  DELETED_APPOINTMENTS: 'tb_deleted_appointments_v1',
  CLIENT_PACKAGES: 'tb_client_packages_v1'
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
    id: 'srv_pkg_cab_01',
    name: 'Pacote de Cabelo (4 Escovas - 10% OFF)',
    category: 'cabelo',
    description: 'Pacote com 4 escovas modeladas com 10% de desconto. Transforma-se em crédito na conta da cliente para uso durante o mês.',
    price: 252.00,
    durationMinutes: 40,
    commissionPercentage: 50,
    isActive: true,
    isPackage: true,
    packageConfig: {
      packageType: 'cabelo',
      items: [
        { serviceType: 'escova', serviceName: 'Escova', quantity: 4 },
      ],
      validityDays: 30,
    },
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
    id: 'srv_pkg_unha_01',
    name: 'Pacote de Unha (4 Manicures + 2 Pedicures)',
    category: 'unhas',
    description: 'Pacote mensal de unhas: 4 manicures e 2 pedicures com validade no mês por R$ 205,00. Transforma-se em crédito na conta da cliente.',
    price: 205.00,
    durationMinutes: 60,
    commissionPercentage: 50,
    isActive: true,
    isPackage: true,
    packageConfig: {
      packageType: 'unha',
      items: [
        { serviceType: 'manicure', serviceName: 'Manicure', quantity: 4 },
        { serviceType: 'pedicure', serviceName: 'Pedicure', quantity: 2 },
      ],
      validityDays: 30,
    },
  },
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
    specialty: 'Manicure & Nail Designer (Inativa)',
    phone: '',
    color: '#C58F9B',
    isActive: false, // Inativada conforme Requisito 15 (histórico preservado)
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

export const INITIAL_CLIENTS: Client[] = avecClientsData as Client[];

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

export const INITIAL_INVENTORY: InventoryItem[] = [];

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
const AVEC_CLIENTS_VERSION_FLAG = 'tb_official_avec_clients_v1';

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

    // Initialize clean data in storage, and seed the official 3,074 clients, 55 services and 8 professionals
    safeSetItem(STORAGE_KEYS.CLIENTS, JSON.stringify(INITIAL_CLIENTS));
    idbStorage.setItem(STORAGE_KEYS.CLIENTS, INITIAL_CLIENTS);
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
    localStorage.setItem(AVEC_CLIENTS_VERSION_FLAG, 'true');
  }

  // Ensure official 3,074 Avec clients are loaded for active browsers
  const hasAvecClients = localStorage.getItem(AVEC_CLIENTS_VERSION_FLAG);
  if (!hasAvecClients) {
    let existingClients: Client[] = [];
    try {
      const rawCli = localStorage.getItem(STORAGE_KEYS.CLIENTS);
      if (rawCli) existingClients = JSON.parse(rawCli);
    } catch {
      existingClients = [];
    }
    const existingIds = new Set(existingClients.map(c => c.id));
    const mergedClients = [
      ...existingClients,
      ...INITIAL_CLIENTS.filter(c => !existingIds.has(c.id))
    ];
    safeSetItem(STORAGE_KEYS.CLIENTS, JSON.stringify(mergedClients));
    idbStorage.setItem(STORAGE_KEYS.CLIENTS, mergedClients);
    localStorage.setItem(AVEC_CLIENTS_VERSION_FLAG, 'true');
    syncCollectionToFirestore('clients', mergedClients);
  }

  // Ensure official catalog of services is loaded for active browsers
  const hasCatalog = localStorage.getItem(CATALOG_VERSION_FLAG);
  if (!hasCatalog) {
    localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(INITIAL_SERVICES));
    localStorage.setItem(CATALOG_VERSION_FLAG, 'true');
    syncCollectionToFirestore('services', INITIAL_SERVICES);
  }

  // Ensure package services (Pacote de Unha and Pacote de Cabelo) are merged into services
  const PACKAGE_SERVICES_FLAG = 'tb_official_package_services_v1';
  const hasPackageServices = localStorage.getItem(PACKAGE_SERVICES_FLAG);
  if (!hasPackageServices) {
    let existingServices: Service[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SERVICES);
      if (raw) existingServices = JSON.parse(raw);
    } catch {
      existingServices = [];
    }
    const packageServices = INITIAL_SERVICES.filter(s => s.isPackage);
    const existingIds = new Set(existingServices.map(s => s.id));
    const merged = [
      ...existingServices,
      ...packageServices.filter(s => !existingIds.has(s.id))
    ];
    localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(merged));
    localStorage.setItem(PACKAGE_SERVICES_FLAG, 'true');
    syncCollectionToFirestore('services', merged);
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

  // Cleanup Deborah example training attendances & payments if not already cleaned
  const hasCleanedDeborah = localStorage.getItem('tb_deborah_examples_cleanup_v1');
  if (!hasCleanedDeborah) {
    storageService.cleanupDeborahExampleData();
    localStorage.setItem('tb_deborah_examples_cleanup_v1', 'true');
  }

  // Cleanup example stock/inventory items if not already cleaned
  const hasCleanedInventory = localStorage.getItem('tb_inventory_examples_cleanup_v1');
  if (!hasCleanedInventory) {
    storageService.cleanupExampleInventory();
    localStorage.setItem('tb_inventory_examples_cleanup_v1', 'true');
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
      safeSetItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      idbStorage.setItem(STORAGE_KEYS.USERS, users);
    }

    return users;
  },

  saveUsers(users: User[]): void {
    safeSetItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    idbStorage.setItem(STORAGE_KEYS.USERS, users);
    syncCollectionToFirestore('users', users);
  },

  getUserPasswordHash(userId: string): string | null {
    const user = this.getUsers().find(u => u.id === userId);
    const defaultPlain = user?.role === 'admin' ? 'admin123' : `${user?.username || 'prof'}123`;
    return localStorage.getItem('tb_pwd_' + userId) || hashPassword(defaultPlain);
  },

  setUserPassword(userId: string, newPlainPassword: string): void {
    const hashed = hashPassword(newPlainPassword);
    safeSetItem('tb_pwd_' + userId, hashed);
    idbStorage.setItem('tb_pwd_' + userId, hashed);
  },

  getClients(): Client[] {
    ensureCleanProductionState();
    const raw = localStorage.getItem(STORAGE_KEYS.CLIENTS);
    if (!raw) {
      safeSetItem(STORAGE_KEYS.CLIENTS, JSON.stringify(INITIAL_CLIENTS));
      idbStorage.setItem(STORAGE_KEYS.CLIENTS, INITIAL_CLIENTS);
      return INITIAL_CLIENTS;
    }
    try {
      const parsed: Client[] = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        safeSetItem(STORAGE_KEYS.CLIENTS, JSON.stringify(INITIAL_CLIENTS));
        idbStorage.setItem(STORAGE_KEYS.CLIENTS, INITIAL_CLIENTS);
        return INITIAL_CLIENTS;
      }
      return parsed;
    } catch {
      safeSetItem(STORAGE_KEYS.CLIENTS, JSON.stringify(INITIAL_CLIENTS));
      return INITIAL_CLIENTS;
    }
  },

  saveClients(clients: Client[]): void {
    safeSetItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
    idbStorage.setItem(STORAGE_KEYS.CLIENTS, clients);
    syncCollectionToFirestore('clients', clients);
  },

  getServices(): Service[] {
    ensureCleanProductionState();
    const raw = localStorage.getItem(STORAGE_KEYS.SERVICES);
    if (!raw) {
      safeSetItem(STORAGE_KEYS.SERVICES, JSON.stringify(INITIAL_SERVICES));
      return INITIAL_SERVICES;
    }
    let services: Service[] = JSON.parse(raw);
    if (services.length === 0) {
      services = INITIAL_SERVICES;
      safeSetItem(STORAGE_KEYS.SERVICES, JSON.stringify(INITIAL_SERVICES));
    }
    // Ensure commission percentage is present
    return services.map(s => ({
      ...s,
      commissionPercentage: s.commissionPercentage ?? 50,
    }));
  },

  saveServices(services: Service[]): void {
    safeSetItem(STORAGE_KEYS.SERVICES, JSON.stringify(services));
    idbStorage.setItem(STORAGE_KEYS.SERVICES, services);
    syncCollectionToFirestore('services', services);
  },

  getProfessionals(): Professional[] {
    ensureCleanProductionState();
    const raw = localStorage.getItem(STORAGE_KEYS.PROFESSIONALS);
    if (!raw) {
      safeSetItem(STORAGE_KEYS.PROFESSIONALS, JSON.stringify(INITIAL_PROFESSIONALS));
      return INITIAL_PROFESSIONALS;
    }
    let profs: Professional[] = JSON.parse(raw);
    if (profs.length === 0) {
      profs = INITIAL_PROFESSIONALS;
      safeSetItem(STORAGE_KEYS.PROFESSIONALS, JSON.stringify(INITIAL_PROFESSIONALS));
    }
    // Requisito 15: Thálita inativada operacionalmente preservando integridade histórica
    profs = profs.map(p => (p.id === 'prof_thalita' || p.username === 'thalita' ? { ...p, isActive: false } : p));
    return profs;
  },

  saveProfessionals(professionals: Professional[]): void {
    safeSetItem(STORAGE_KEYS.PROFESSIONALS, JSON.stringify(professionals));
    idbStorage.setItem(STORAGE_KEYS.PROFESSIONALS, professionals);
    syncCollectionToFirestore('professionals', professionals);
  },

  getAppointments(): Appointment[] {
    const raw = localStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
    if (!raw) {
      const initial = generateSeedAppointments();
      safeSetItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  },

  saveAppointments(appointments: Appointment[]): void {
    safeSetItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(appointments));
    idbStorage.setItem(STORAGE_KEYS.APPOINTMENTS, appointments);
    syncCollectionToFirestore('appointments', appointments);
  },

  getAttendances(): Attendance[] {
    const raw = localStorage.getItem(STORAGE_KEYS.ATTENDANCES);
    return raw ? JSON.parse(raw) : [];
  },

  saveAttendances(attendances: Attendance[]): void {
    safeSetItem(STORAGE_KEYS.ATTENDANCES, JSON.stringify(attendances));
    idbStorage.setItem(STORAGE_KEYS.ATTENDANCES, attendances);
    syncCollectionToFirestore('attendances', attendances);
  },

  getPayments(): PaymentTransaction[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
    if (!raw) {
      const initial = generateSeedPayments();
      safeSetItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  },

  savePayments(payments: PaymentTransaction[]): void {
    safeSetItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
    idbStorage.setItem(STORAGE_KEYS.PAYMENTS, payments);
    syncCollectionToFirestore('payments', payments);
  },

  getExpenses(): Expense[] {
    const raw = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    if (!raw) {
      const initial = generateSeedExpenses();
      safeSetItem(STORAGE_KEYS.EXPENSES, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  },

  saveExpenses(expenses: Expense[]): void {
    safeSetItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
    idbStorage.setItem(STORAGE_KEYS.EXPENSES, expenses);
    syncCollectionToFirestore('expenses', expenses);
  },

  getInventory(): InventoryItem[] {
    const raw = localStorage.getItem(STORAGE_KEYS.INVENTORY);
    if (!raw) {
      return [];
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveInventory(inventory: InventoryItem[]): void {
    safeSetItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inventory));
    idbStorage.setItem(STORAGE_KEYS.INVENTORY, inventory);
    syncCollectionToFirestore('inventory', inventory);
  },

  getConsumptions(): ProductConsumption[] {
    const raw = localStorage.getItem(STORAGE_KEYS.CONSUMPTIONS);
    return raw ? JSON.parse(raw) : [];
  },

  saveConsumptions(consumptions: ProductConsumption[]): void {
    safeSetItem(STORAGE_KEYS.CONSUMPTIONS, JSON.stringify(consumptions));
    idbStorage.setItem(STORAGE_KEYS.CONSUMPTIONS, consumptions);
    syncCollectionToFirestore('consumptions', consumptions);
  },

  getComandas(): Comanda[] {
    const raw = localStorage.getItem(STORAGE_KEYS.COMANDAS);
    return raw ? JSON.parse(raw) : [];
  },

  saveComandas(comandas: Comanda[]): void {
    safeSetItem(STORAGE_KEYS.COMANDAS, JSON.stringify(comandas));
    idbStorage.setItem(STORAGE_KEYS.COMANDAS, comandas);
    syncCollectionToFirestore('comandas', comandas);
  },

  getSettings(): CompanySettings {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      safeSetItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
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
    safeSetItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    idbStorage.setItem(STORAGE_KEYS.SETTINGS, settings);
    const { db, isConnected } = getFirebaseInstance();
    if (isConnected && db) {
      syncCollectionToFirestore('settings', [{ id: 'general', ...settings }]);
    }
  },

  deleteFromCloud(collectionName: string, docId: string): void {
    deleteDocumentFromFirestore(collectionName, docId);
  },

  getAppointmentDeletionLogs(): AppointmentDeletionLog[] {
    const raw = localStorage.getItem(STORAGE_KEYS.DELETED_APPOINTMENTS);
    return raw ? JSON.parse(raw) : [];
  },

  saveAppointmentDeletionLog(log: AppointmentDeletionLog): void {
    const existing = this.getAppointmentDeletionLogs();
    const next = [log, ...existing];
    safeSetItem(STORAGE_KEYS.DELETED_APPOINTMENTS, JSON.stringify(next));
    idbStorage.setItem(STORAGE_KEYS.DELETED_APPOINTMENTS, next);
    syncCollectionToFirestore('deletedAppointments', next);
  },

  cleanupDeborahExampleData(): { deletedAttendances: number; deletedPayments: number; deletedAppointments: number } {
    // 1. Clean attendances
    const rawAttendances = localStorage.getItem(STORAGE_KEYS.ATTENDANCES);
    let attendancesList: Attendance[] = rawAttendances ? JSON.parse(rawAttendances) : [];
    const deborahAtdIds = new Set<string>();
    const deborahAptIds = new Set<string>();

    const remainingAttendances = attendancesList.filter(a => {
      const isDeborah = a.professionalId === 'prof_deborah' || 
                        a.professionalName?.toLowerCase().includes('deborah') || 
                        a.professionalName?.toLowerCase().includes('déborah');
      if (isDeborah) {
        deborahAtdIds.add(a.id);
        if (a.appointmentId) deborahAptIds.add(a.appointmentId);
        deleteDocumentFromFirestore('attendances', a.id);
        return false;
      }
      return true;
    });

    safeSetItem(STORAGE_KEYS.ATTENDANCES, JSON.stringify(remainingAttendances));
    idbStorage.setItem(STORAGE_KEYS.ATTENDANCES, remainingAttendances);

    // 2. Clean payments
    const rawPayments = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
    let paymentsList: PaymentTransaction[] = rawPayments ? JSON.parse(rawPayments) : [];
    const remainingPayments = paymentsList.filter(p => {
      const isDeborah = p.professionalId === 'prof_deborah' || 
                        p.professionalName?.toLowerCase().includes('deborah') || 
                        p.professionalName?.toLowerCase().includes('déborah') ||
                        (p.attendanceId && deborahAtdIds.has(p.attendanceId));
      if (isDeborah) {
        deleteDocumentFromFirestore('payments', p.id);
        return false;
      }
      return true;
    });

    safeSetItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(remainingPayments));
    idbStorage.setItem(STORAGE_KEYS.PAYMENTS, remainingPayments);

    // 3. Clean appointments (up to today or associated with Deborah's training attendances)
    const rawAppointments = localStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
    let appointmentsList: Appointment[] = rawAppointments ? JSON.parse(rawAppointments) : [];
    const remainingAppointments = appointmentsList.filter(apt => {
      const isDeborah = apt.professionalId === 'prof_deborah' || 
                        apt.professionalName?.toLowerCase().includes('deborah') || 
                        apt.professionalName?.toLowerCase().includes('déborah') ||
                        deborahAptIds.has(apt.id);
      if (isDeborah) {
        deleteDocumentFromFirestore('appointments', apt.id);
        return false;
      }
      return true;
    });

    safeSetItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(remainingAppointments));
    idbStorage.setItem(STORAGE_KEYS.APPOINTMENTS, remainingAppointments);

    // 4. Clean comandas
    const rawComandas = localStorage.getItem(STORAGE_KEYS.COMANDAS);
    if (rawComandas) {
      try {
        let comandasList: Comanda[] = JSON.parse(rawComandas);
        const remainingComandas = comandasList
          .map(c => ({
            ...c,
            attendanceIds: c.attendanceIds.filter(id => !deborahAtdIds.has(id))
          }))
          .filter(c => c.attendanceIds.length > 0);
        safeSetItem(STORAGE_KEYS.COMANDAS, JSON.stringify(remainingComandas));
        idbStorage.setItem(STORAGE_KEYS.COMANDAS, remainingComandas);
      } catch {
        // ignore
      }
    }

    // 5. Clean consumptions
    const rawConsumptions = localStorage.getItem(STORAGE_KEYS.CONSUMPTIONS);
    if (rawConsumptions) {
      try {
        const consumptionsList: ProductConsumption[] = JSON.parse(rawConsumptions);
        const remainingConsumptions = consumptionsList.filter(c => c.attendanceId ? !deborahAtdIds.has(c.attendanceId) : true);
        safeSetItem(STORAGE_KEYS.CONSUMPTIONS, JSON.stringify(remainingConsumptions));
        idbStorage.setItem(STORAGE_KEYS.CONSUMPTIONS, remainingConsumptions);
      } catch {
        // ignore
      }
    }

    return {
      deletedAttendances: deborahAtdIds.size,
      deletedPayments: paymentsList.length - remainingPayments.length,
      deletedAppointments: appointmentsList.length - remainingAppointments.length,
    };
  },

  cleanupExampleInventory(): { deletedItemsCount: number } {
    const raw = localStorage.getItem(STORAGE_KEYS.INVENTORY);
    let items: InventoryItem[] = [];
    try {
      if (raw) items = JSON.parse(raw);
    } catch {
      items = [];
    }

    items.forEach(i => {
      deleteDocumentFromFirestore('inventory', i.id);
    });

    safeSetItem(STORAGE_KEYS.INVENTORY, JSON.stringify([]));
    idbStorage.setItem(STORAGE_KEYS.INVENTORY, []);
    syncCollectionToFirestore('inventory', []);

    safeSetItem(STORAGE_KEYS.CONSUMPTIONS, JSON.stringify([]));
    idbStorage.setItem(STORAGE_KEYS.CONSUMPTIONS, []);
    syncCollectionToFirestore('consumptions', []);

    return { deletedItemsCount: items.length };
  },

  getClientPackages(): ClientPackage[] {
    const raw = localStorage.getItem(STORAGE_KEYS.CLIENT_PACKAGES);
    return raw ? JSON.parse(raw) : [];
  },

  saveClientPackages(packages: ClientPackage[]): void {
    safeSetItem(STORAGE_KEYS.CLIENT_PACKAGES, JSON.stringify(packages));
    idbStorage.setItem(STORAGE_KEYS.CLIENT_PACKAGES, packages);
    syncCollectionToFirestore('clientPackages', packages);
  },

  /**
   * Hydrate collections from High-Capacity IndexedDB into memory/localStorage
   */
  async hydrateFromIndexedDB(): Promise<boolean> {
    try {
      const keys = [
        STORAGE_KEYS.CLIENTS,
        STORAGE_KEYS.SERVICES,
        STORAGE_KEYS.PROFESSIONALS,
        STORAGE_KEYS.APPOINTMENTS,
        STORAGE_KEYS.ATTENDANCES,
        STORAGE_KEYS.PAYMENTS,
        STORAGE_KEYS.EXPENSES,
        STORAGE_KEYS.INVENTORY,
        STORAGE_KEYS.CONSUMPTIONS,
        STORAGE_KEYS.COMANDAS,
        STORAGE_KEYS.USERS,
        STORAGE_KEYS.SETTINGS,
        STORAGE_KEYS.CLIENT_PACKAGES,
      ];

      let restoredAny = false;
      for (const key of keys) {
        const idbVal = await idbStorage.getItem<any>(key);
        if (idbVal !== null && idbVal !== undefined) {
          const localRaw = localStorage.getItem(key);
          if (!localRaw) {
            safeSetItem(key, JSON.stringify(idbVal));
            restoredAny = true;
          } else if (Array.isArray(idbVal)) {
            try {
              const localArr = JSON.parse(localRaw);
              if (Array.isArray(localArr) && idbVal.length > localArr.length) {
                safeSetItem(key, JSON.stringify(idbVal));
                restoredAny = true;
              }
            } catch {
              // ignore parse error
            }
          }
        } else {
          // Ensure existing localStorage data is backed up into IndexedDB
          const localRaw = localStorage.getItem(key);
          if (localRaw) {
            try {
              await idbStorage.setItem(key, JSON.parse(localRaw));
            } catch {
              // ignore
            }
          }
        }
      }
      return restoredAny;
    } catch (err) {
      console.warn('Hydrate from IndexedDB error:', err);
      return false;
    }
  },

  /**
   * Upload all local collections to Firebase Cloud Firestore
   */
  async pushAllToFirestore(): Promise<{
    success: boolean;
    totalRecords: number;
    message: string;
  }> {
    const { isConnected } = getFirebaseInstance();
    if (!isConnected) {
      return {
        success: false,
        totalRecords: 0,
        message: 'Conecte e salve as credenciais do Firebase primeiro.',
      };
    }

    try {
      const clients = this.getClients();
      const services = this.getServices();
      const professionals = this.getProfessionals();
      const appointments = this.getAppointments();
      const attendances = this.getAttendances();
      const payments = this.getPayments();
      const expenses = this.getExpenses();
      const inventory = this.getInventory();
      const users = this.getUsers();
      const settings = this.getSettings();

      await Promise.all([
        syncCollectionToFirestore('clients', clients),
        syncCollectionToFirestore('services', services),
        syncCollectionToFirestore('professionals', professionals),
        syncCollectionToFirestore('appointments', appointments),
        syncCollectionToFirestore('attendances', attendances),
        syncCollectionToFirestore('payments', payments),
        syncCollectionToFirestore('expenses', expenses),
        syncCollectionToFirestore('inventory', inventory),
        syncCollectionToFirestore('users', users),
        syncCollectionToFirestore('settings', [{ id: 'general', ...settings }]),
      ]);

      const totalRecords =
        clients.length +
        services.length +
        professionals.length +
        appointments.length +
        attendances.length +
        payments.length +
        expenses.length +
        inventory.length +
        users.length +
        1;

      return {
        success: true,
        totalRecords,
        message: `Sincronização concluída! ${totalRecords} registros salvos no banco de dados Firebase Firestore.`,
      };
    } catch (err: any) {
      return {
        success: false,
        totalRecords: 0,
        message: `Erro ao enviar dados para o Firebase: ${err?.message || 'Falha de rede'}`,
      };
    }
  },

  /**
   * Download all collections from Firebase Cloud Firestore into local & IndexedDB storage
   */
  async pullAllFromFirestore(): Promise<{
    success: boolean;
    totalRecords: number;
    message: string;
  }> {
    const { isConnected } = getFirebaseInstance();
    if (!isConnected) {
      return {
        success: false,
        totalRecords: 0,
        message: 'Firebase não está conectado.',
      };
    }

    try {
      const [
        remoteClients,
        remoteServices,
        remoteProfessionals,
        remoteAppointments,
        remoteAttendances,
        remotePayments,
        remoteExpenses,
        remoteInventory,
        remoteUsers,
        remoteSettings,
      ] = await Promise.all([
        fetchCollectionFromFirestore<Client>('clients'),
        fetchCollectionFromFirestore<Service>('services'),
        fetchCollectionFromFirestore<Professional>('professionals'),
        fetchCollectionFromFirestore<Appointment>('appointments'),
        fetchCollectionFromFirestore<Attendance>('attendances'),
        fetchCollectionFromFirestore<PaymentTransaction>('payments'),
        fetchCollectionFromFirestore<Expense>('expenses'),
        fetchCollectionFromFirestore<InventoryItem>('inventory'),
        fetchCollectionFromFirestore<User>('users'),
        fetchCollectionFromFirestore<any>('settings'),
      ]);

      let totalRecords = 0;

      if (remoteClients && remoteClients.length > 0) {
        const localClients = this.getClients();
        const remoteIds = new Set(remoteClients.map(c => c.id));
        const mergedClients = [
          ...remoteClients,
          ...localClients.filter(c => !remoteIds.has(c.id))
        ];
        safeSetItem(STORAGE_KEYS.CLIENTS, JSON.stringify(mergedClients));
        await idbStorage.setItem(STORAGE_KEYS.CLIENTS, mergedClients);
        totalRecords += mergedClients.length;
        if (mergedClients.length > remoteClients.length) {
          syncCollectionToFirestore('clients', mergedClients);
        }
      }
      if (remoteServices && remoteServices.length > 0) {
        safeSetItem(STORAGE_KEYS.SERVICES, JSON.stringify(remoteServices));
        await idbStorage.setItem(STORAGE_KEYS.SERVICES, remoteServices);
        totalRecords += remoteServices.length;
      }
      if (remoteProfessionals && remoteProfessionals.length > 0) {
        safeSetItem(STORAGE_KEYS.PROFESSIONALS, JSON.stringify(remoteProfessionals));
        await idbStorage.setItem(STORAGE_KEYS.PROFESSIONALS, remoteProfessionals);
        totalRecords += remoteProfessionals.length;
      }
      if (remoteAppointments && remoteAppointments.length > 0) {
        safeSetItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(remoteAppointments));
        await idbStorage.setItem(STORAGE_KEYS.APPOINTMENTS, remoteAppointments);
        totalRecords += remoteAppointments.length;
      }
      if (remoteAttendances && remoteAttendances.length > 0) {
        safeSetItem(STORAGE_KEYS.ATTENDANCES, JSON.stringify(remoteAttendances));
        await idbStorage.setItem(STORAGE_KEYS.ATTENDANCES, remoteAttendances);
        totalRecords += remoteAttendances.length;
      }
      if (remotePayments && remotePayments.length > 0) {
        safeSetItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(remotePayments));
        await idbStorage.setItem(STORAGE_KEYS.PAYMENTS, remotePayments);
        totalRecords += remotePayments.length;
      }
      if (remoteExpenses && remoteExpenses.length > 0) {
        safeSetItem(STORAGE_KEYS.EXPENSES, JSON.stringify(remoteExpenses));
        await idbStorage.setItem(STORAGE_KEYS.EXPENSES, remoteExpenses);
        totalRecords += remoteExpenses.length;
      }
      if (remoteInventory && remoteInventory.length > 0) {
        safeSetItem(STORAGE_KEYS.INVENTORY, JSON.stringify(remoteInventory));
        await idbStorage.setItem(STORAGE_KEYS.INVENTORY, remoteInventory);
        totalRecords += remoteInventory.length;
      }
      if (remoteUsers && remoteUsers.length > 0) {
        safeSetItem(STORAGE_KEYS.USERS, JSON.stringify(remoteUsers));
        await idbStorage.setItem(STORAGE_KEYS.USERS, remoteUsers);
        totalRecords += remoteUsers.length;
      }
      if (remoteSettings && remoteSettings.length > 0) {
        const gen = remoteSettings.find((s: any) => s.id === 'general') || remoteSettings[0];
        if (gen) {
          const { id, ...cleanSettings } = gen;
          safeSetItem(STORAGE_KEYS.SETTINGS, JSON.stringify(cleanSettings));
          await idbStorage.setItem(STORAGE_KEYS.SETTINGS, cleanSettings);
          totalRecords += 1;
        }
      }

      if (totalRecords === 0) {
        // Cloud database is empty on first connection -> automatically push initial data to cloud!
        const pushRes = await this.pushAllToFirestore();
        return {
          success: pushRes.success,
          totalRecords: pushRes.totalRecords,
          message: `Banco na nuvem inicializado com ${pushRes.totalRecords} registros do sistema!`,
        };
      }

      return {
        success: true,
        totalRecords,
        message: `${totalRecords} registros carregados com sucesso do Firebase Firestore!`,
      };
    } catch (err: any) {
      return {
        success: false,
        totalRecords: 0,
        message: `Erro ao buscar dados do Firebase: ${err?.message || 'Falha de conexão'}`,
      };
    }
  },

  exportFullBackup(): string {
    const data = {
      version: '3.0',
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
      consumptions: this.getConsumptions(),
      comandas: this.getComandas(),
      clientPackages: this.getClientPackages(),
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
      if (parsed.consumptions) this.saveConsumptions(parsed.consumptions);
      if (parsed.comandas) this.saveComandas(parsed.comandas);
      if (parsed.clientPackages) this.saveClientPackages(parsed.clientPackages);
      if (parsed.settings) this.saveSettings(parsed.settings);
      return true;
    } catch (e) {
      console.error('Failed to import backup:', e);
      return false;
    }
  },

  clearAllData(): void {
    this.saveClients(INITIAL_CLIENTS);
    this.saveServices(INITIAL_SERVICES);
    this.saveProfessionals(INITIAL_PROFESSIONALS);
    this.saveAppointments([]);
    this.saveAttendances([]);
    this.savePayments([]);
    this.saveExpenses([]);
    this.saveInventory(INITIAL_INVENTORY);
    this.saveClientPackages([]);
    this.saveUsers(DEFAULT_USERS);

    DEFAULT_USERS.forEach(u => {
      const pwd = u.role === 'admin' ? 'admin123' : `${u.username}123`;
      if (!localStorage.getItem('tb_pwd_' + u.id)) {
        safeSetItem('tb_pwd_' + u.id, hashPassword(pwd));
      }
    });
  }
};
