import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Client, 
  Service, 
  Professional, 
  Appointment, 
  Attendance, 
  PaymentTransaction, 
  Expense, 
  CompanySettings,
  AppointmentStatus,
  PaymentMethod,
  User,
  InventoryItem,
  ProductConsumption,
  Comanda,
  ComandaPayment,
  AppointmentDeletionLog,
  ClientPackage,
  PackageUsageLog,
  ScheduleBlock
} from '../types';
import { storageService, getTodayDate, hashPassword } from '../services/storage';
import { cloudSyncService } from '../services/cloudSync';
import { getFirebaseInstance, subscribeToCollection, deleteDocumentFromFirestore } from '../services/firebase';
import { 
  addMinutesToTime, 
  isTimeOverlapping, 
  generateId,
  normalizePhoneForWhatsApp
} from '../utils/formatters';

interface ConflictResult {
  hasConflict: boolean;
  conflictingAppointment?: Appointment;
  message?: string;
}

export interface ProfessionalMetrics {
  todayCommissions: number;
  todayGross: number;
  todayNet: number;
  monthCommissions: number;
  monthGross: number;
  monthNet: number;
  pendingCommissions: number;
  todayCompletedCount: number;
  monthCompletedCount: number;
  todayAppointments: Appointment[];
  myTransactions: PaymentTransaction[];
}

interface DataContextType {
  clients: Client[];
  services: Service[];
  professionals: Professional[];
  appointments: Appointment[];
  attendances: Attendance[];
  payments: PaymentTransaction[];
  expenses: Expense[];
  inventory: InventoryItem[];
  consumptions: ProductConsumption[];
  comandas: Comanda[];
  clientPackages: ClientPackage[];
  scheduleBlocks: ScheduleBlock[];
  lowStockCount: number;
  outOfStockCount: number;
  totalInventoryValue: number;
  settings: CompanySettings;
  
  // Clients
  addClient: (clientData: Omit<Client, 'id' | 'createdAt' | 'totalVisits' | 'totalSpent' | 'isArchived'>) => { success: boolean; client?: Client; error?: string };
  updateClient: (id: string, clientData: Partial<Client>) => { success: boolean; error?: string };
  archiveClient: (id: string, isArchived: boolean) => void;
  checkDuplicateClient: (phone: string, email?: string, excludeId?: string) => { isDuplicate: boolean; field?: string; clientName?: string };
  
  // Services
  addService: (serviceData: Omit<Service, 'id'>) => { success: boolean; service?: Service; error?: string };
  updateService: (id: string, serviceData: Partial<Service>) => { success: boolean; error?: string };
  toggleServiceActive: (id: string) => void;

  // Professionals Management
  addProfessional: (data: { 
    name: string; 
    specialty: string; 
    phone: string; 
    color?: string; 
    commissionPercentage?: number; 
    username: string; 
    password?: string 
  }) => { success: boolean; professional?: Professional; error?: string };
  updateProfessional: (id: string, data: Partial<Professional> & { password?: string }) => { success: boolean; error?: string };
  deleteProfessional: (id: string) => { success: boolean; error?: string };
  getProfessionalMetrics: (professionalId: string) => ProfessionalMetrics;

  // Appointments
  checkConflict: (date: string, startTime: string, endTime: string, professionalId: string, excludeAppointmentId?: string) => ConflictResult;
  checkMultiConflict: (date: string, startTime: string, executionMode: 'sequencial' | 'simultaneo', services: Array<{ serviceId: string; professionalId: string; durationMinutes: number }>) => { hasConflict: boolean; conflicts: string[] };
  addAppointment: (appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>) => { success: boolean; appointment?: Appointment; error?: string };
  addMultiServiceAppointment: (data: { 
    clientId: string; 
    date: string; 
    startTime: string; 
    executionMode: 'sequencial' | 'simultaneo'; 
    services: Array<{ serviceId: string; professionalId: string; durationMinutes: number; price: number; notes?: string }>; 
    isFitIn?: boolean; 
    fitInReason?: string; 
    notes?: string 
  }) => { success: boolean; appointments?: Appointment[]; error?: string; conflicts?: string[] };
  updateAppointment: (id: string, appointmentData: Partial<Appointment>) => { success: boolean; error?: string };
  updateAppointmentStatus: (id: string, status: AppointmentStatus, cancellationReason?: string) => { success: boolean; error?: string };
  cancelAppointment: (id: string, reason: string) => { success: boolean; error?: string };
  deleteAppointment: (id: string, reason: string) => { success: boolean; error?: string };
  cleanupDeborahAttendances: () => { success: boolean; message: string };
  clearExampleInventory: () => { success: boolean; message: string };

  // Schedule Blocks (Bloqueio de Agenda)
  addScheduleBlock: (data: { 
    professionalId: string; 
    date: string; 
    startTime: string; 
    endTime: string; 
    reason: string; 
    notes?: string 
  }) => { success: boolean; block?: ScheduleBlock; error?: string };
  deleteScheduleBlock: (id: string) => { success: boolean; error?: string };

  // Attendances & Execution
  startAttendance: (appointmentId?: string, clientId?: string, serviceId?: string, professionalId?: string) => { success: boolean; attendance?: Attendance; error?: string };
  revertAttendance: (attendanceId: string) => { success: boolean; error?: string };
  finishAttendance: (attendanceId: string, options: { 
    grossValue: number; 
    discountValue: number; 
    discountType: 'fixed' | 'percentage'; 
    netValue: number; 
    paymentMethod: PaymentMethod;
    paymentStatus: 'pago' | 'pendente' | 'parcial';
    paidAmount: number;
    notes?: string;
  }) => { success: boolean; error?: string };

  // Unified Comanda & Multi-Payment
  getComandaByClientAndDate: (clientId: string, date: string) => { comanda?: Comanda; clientAttendances: Attendance[] };
  finishUnifiedComanda: (data: {
    clientId: string;
    date: string;
    attendancesUpdates: Array<{
      attendanceId: string;
      grossValue: number;
      discountValue: number;
      discountType: 'fixed' | 'percentage';
      netValue: number;
      packageId?: string;
      isPackageCovered?: boolean;
    }>;
    payments: Array<{
      paymentMethod: PaymentMethod;
      amount: number;
      notes?: string;
    }>;
    notes?: string;
  }) => { success: boolean; comanda?: Comanda; error?: string };

  // Client Packages & Prepaid Credits
  getClientActivePackages: (clientId: string) => ClientPackage[];
  addClientPackage: (pkg: Omit<ClientPackage, 'id' | 'createdAt' | 'updatedAt'>) => { success: boolean; package?: ClientPackage; error?: string };
  deductPackageSession: (packageId: string, serviceType: string, attendanceId: string, professionalId?: string, professionalName?: string, notes?: string) => { success: boolean; error?: string };

  // Product Consumption Tracking (Gramatura)
  addConsumption: (consumptionData: Omit<ProductConsumption, 'id' | 'createdAt'>) => { success: boolean; consumption?: ProductConsumption; error?: string };
  deleteConsumption: (id: string) => { success: boolean; error?: string };
  getConsumptionsByAttendance: (attendanceId: string) => ProductConsumption[];

  // Financial
  addExpense: (expenseData: Omit<Expense, 'id' | 'createdAt'>) => { success: boolean; expense?: Expense; error?: string };
  updateExpense: (id: string, expenseData: Partial<Expense>) => { success: boolean; error?: string };
  deleteExpense: (id: string) => void;
  addPayment: (paymentData: Omit<PaymentTransaction, 'id' | 'createdAt' | 'type'>) => { success: boolean; payment?: PaymentTransaction; error?: string };

  // Inventory
  addInventoryItem: (itemData: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => { success: boolean; item?: InventoryItem; error?: string };
  updateInventoryItem: (id: string, itemData: Partial<InventoryItem>) => { success: boolean; error?: string };
  deleteInventoryItem: (id: string) => { success: boolean; error?: string };
  adjustStock: (id: string, quantityChange: number, reason?: string, type?: 'entrada' | 'saida' | 'ajuste') => { success: boolean; error?: string };

  // Settings & Utilities
  updateSettings: (newSettings: CompanySettings) => void;
  refreshData: () => void;
  clearAllData: () => void;

  // Real-time Calculators
  financialSummary: {
    grossRevenue: number;
    discountsGiven: number;
    netRevenue: number;
    receivedAmount: number;
    pendingAmount: number;
    paidExpenses: number;
    pendingExpenses: number;
    periodNetResult: number;
    averageTicket: number;
    totalCommissionsPaid: number;
  };

  dashboardMetrics: {
    todayAppointmentsCount: number;
    todayCompletedCount: number;
    totalActiveClients: number;
    todayGrossRevenue: number;
    todayReceivedRevenue: number;
    todayCommissionsToPay: number;
    todaySalonNet: number;
    monthGrossRevenue: number;
    monthReceivedRevenue: number;
    monthPaidExpenses: number;
    monthNetResult: number;
    averageTicket: number;
    occupancyRatePercentage: number;
    upcomingTodayAppointments: Appointment[];
  };
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [consumptions, setConsumptions] = useState<ProductConsumption[]>([]);
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [clientPackages, setClientPackages] = useState<ClientPackage[]>([]);
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([]);
  const [settings, setSettings] = useState<CompanySettings>(storageService.getSettings());

  const loadAllData = useCallback(() => {
    const loadedClients = storageService.getClients();
    const loadedServices = storageService.getServices();
    const loadedProfessionals = storageService.getProfessionals();
    const loadedAppointments = storageService.getAppointments();
    const loadedAttendances = storageService.getAttendances();
    let loadedPayments = storageService.getPayments();
    const loadedExpenses = storageService.getExpenses();
    const loadedInventory = storageService.getInventory();
    const loadedConsumptions = storageService.getConsumptions();
    const loadedComandas = storageService.getComandas();
    const loadedClientPackages = storageService.getClientPackages();
    const loadedScheduleBlocks = storageService.getScheduleBlocks();
    const loadedSettings = storageService.getSettings();

    // Auto-heal / sync: ensure every finished/paid attendance has its matching PaymentTransaction with professionalId & commissionAmount
    let hasRepaired = false;
    const paymentMapByAttendance = new Map<string, PaymentTransaction>();
    loadedPayments.forEach(p => {
      if (p.attendanceId) {
        paymentMapByAttendance.set(p.attendanceId, p);
      }
    });

    const profMap = new Map<string, Professional>();
    loadedProfessionals.forEach(p => {
      profMap.set(p.id, p);
      if (p.name) profMap.set(p.name.toLowerCase(), p);
      if (p.username) profMap.set(p.username.toLowerCase(), p);
    });

    const repairedPayments = loadedPayments.map(p => {
      const atd = p.attendanceId ? loadedAttendances.find(a => a.id === p.attendanceId) : undefined;
      const profId = p.professionalId || atd?.professionalId;
      const prof = profId ? profMap.get(profId) : (p.professionalName ? profMap.get(p.professionalName.toLowerCase()) : undefined);
      const srv = atd?.serviceId 
        ? loadedServices.find(s => s.id === atd.serviceId) 
        : (p.serviceName ? loadedServices.find(s => s.name.toLowerCase() === (p.serviceName || '').toLowerCase()) : undefined);
      const expectedCommPercent = srv?.commissionPercentage ?? atd?.commissionPercentage ?? p.commissionPercentage ?? 50;
      const isPkgCovered = atd?.isPackageCovered || p.description?.includes('CRÉDITO DE PACOTE') || false;
      const baseForComm = isPkgCovered ? (p.grossValue || p.netValue) : (p.paidAmount || p.netValue);
      const expectedCommAmount = (baseForComm * expectedCommPercent) / 100;

      let changed = false;
      const updated = { ...p };

      if (!updated.professionalId && prof?.id) {
        updated.professionalId = prof.id;
        updated.professionalName = prof.name;
        changed = true;
      }

      if (updated.commissionPercentage !== expectedCommPercent) {
        updated.commissionPercentage = expectedCommPercent;
        changed = true;
      }

      if (Math.abs((updated.commissionAmount || 0) - expectedCommAmount) > 0.05) {
        updated.commissionAmount = expectedCommAmount;
        changed = true;
      }

      if (changed) {
        hasRepaired = true;
      }
      return updated;
    });

    const missingPayments: PaymentTransaction[] = [];
    loadedAttendances.forEach(atd => {
      if ((atd.paymentStatus === 'pago' || atd.paymentStatus === 'parcial') && !paymentMapByAttendance.has(atd.id)) {
        hasRepaired = true;
        const prof = atd.professionalId ? profMap.get(atd.professionalId) : undefined;
        const srv = atd.serviceId ? loadedServices.find(s => s.id === atd.serviceId) : undefined;
        const commPercent = srv?.commissionPercentage ?? atd.commissionPercentage ?? 50;
        const atdPaidAmount = atd.paidAmount || atd.netValue;
        const baseForComm = atd.isPackageCovered ? atd.grossValue : atdPaidAmount;
        const commAmount = atd.commissionAmount || ((baseForComm * commPercent) / 100);
        missingPayments.push({
          id: generateId('pay'),
          attendanceId: atd.id,
          comandaId: atd.comandaId,
          clientId: atd.clientId,
          clientName: atd.clientName,
          serviceName: atd.serviceName,
          professionalId: atd.professionalId,
          professionalName: atd.professionalName,
          description: atd.isPackageCovered
            ? `Atendimento — ${atd.serviceName} (${atd.professionalName}) via CRÉDITO DE PACOTE`
            : `Atendimento — ${atd.serviceName} (${atd.professionalName})`,
          grossValue: atd.grossValue || atd.netValue,
          discount: atd.discountValue || 0,
          discountPercentage: atd.grossValue > 0 ? Math.round((atd.discountValue / atd.grossValue) * 100) : 0,
          netValue: atd.netValue,
          paidAmount: atdPaidAmount,
          pendingAmount: Math.max(0, atd.netValue - atdPaidAmount),
          commissionPercentage: commPercent,
          commissionAmount: commAmount,
          paymentMethod: atd.paymentMethod || 'pix',
          status: atd.paymentStatus,
          date: atd.date,
          type: 'receita',
          createdAt: atd.createdAt || new Date().toISOString(),
        });
      }
    });

    if (hasRepaired) {
      loadedPayments = [...missingPayments, ...repairedPayments];
      storageService.savePayments(loadedPayments);
    }

    setClients(loadedClients);
    setServices(loadedServices);
    setProfessionals(loadedProfessionals);
    setAppointments(loadedAppointments);
    setAttendances(loadedAttendances);
    setPayments(loadedPayments);
    setExpenses(loadedExpenses);
    setInventory(loadedInventory);
    setConsumptions(loadedConsumptions);
    setComandas(loadedComandas);
    setClientPackages(loadedClientPackages);
    setScheduleBlocks(loadedScheduleBlocks);
    setSettings(loadedSettings);
  }, []);

  useEffect(() => {
    loadAllData();

    // 1. Hydrate from High-Capacity IndexedDB if needed
    storageService.hydrateFromIndexedDB().then((restored) => {
      if (restored) {
        loadAllData();
      }
    });

    // 2. Start Vercel Cloud Auto-Sync (bidirectional real-time sync across PC, iPhone, Android)
    const stopCloudSync = cloudSyncService.startAutoSync(() => {
      loadAllData();
    });

    // 3. If Firebase Cloud Firestore is connected, pull latest data & subscribe to real-time updates
    const { isConnected } = getFirebaseInstance();
    let unsubscribers: Array<(() => void) | null> = [];

    if (isConnected) {
      storageService.pullAllFromFirestore().then((res) => {
        if (res.success) {
          loadAllData();
        }
      });

      unsubscribers = [
        subscribeToCollection<Client>('clients', (items) => {
          if (items.length > 0) {
            setClients((prev) => {
              if (items.length >= prev.length) return items;
              const itemMap = new Map(items.map(i => [i.id, i]));
              return prev.map(p => itemMap.get(p.id) || p);
            });
          }
        }),
        subscribeToCollection<Service>('services', (items) => {
          if (items.length > 0) setServices(items);
        }),
        subscribeToCollection<Professional>('professionals', (items) => {
          if (items.length > 0) setProfessionals(items);
        }),
        subscribeToCollection<Appointment>('appointments', (items) => {
          if (items.length > 0) setAppointments(items);
        }),
        subscribeToCollection<Attendance>('attendances', (items) => {
          if (items.length > 0) setAttendances(items);
        }),
        subscribeToCollection<PaymentTransaction>('payments', (items) => {
          if (items.length > 0) setPayments(items);
        }),
        subscribeToCollection<Expense>('expenses', (items) => {
          if (items.length > 0) setExpenses(items);
        }),
        subscribeToCollection<InventoryItem>('inventory', (items) => {
          if (items.length > 0) setInventory(items);
        }),
        subscribeToCollection<ClientPackage>('clientPackages', (items) => {
          if (items.length > 0) setClientPackages(items);
        }),
        subscribeToCollection<ScheduleBlock>('scheduleBlocks', (items) => {
          if (items.length > 0) setScheduleBlocks(items);
        }),
      ];
    }

    return () => {
      stopCloudSync();
      unsubscribers.forEach((unsub) => {
        if (unsub) unsub();
      });
    };
  }, [loadAllData]);

  // Recalculate client statistics based on completed payments and attendances
  const recalculateClientStats = useCallback((updatedPayments: PaymentTransaction[], updatedClients: Client[]) => {
    return updatedClients.map(client => {
      const clientPayments = updatedPayments.filter(p => p.clientId === client.id && p.status === 'pago');
      const totalSpent = clientPayments.reduce((acc, curr) => acc + curr.paidAmount, 0);
      const totalVisits = clientPayments.length;
      return {
        ...client,
        totalSpent,
        totalVisits: Math.max(totalVisits, client.totalVisits)
      };
    });
  }, []);

  // CLIENTS
  const checkDuplicateClient = (phone: string, email?: string, excludeId?: string): { isDuplicate: boolean; field?: string; clientName?: string } => {
    const { normalized } = normalizePhoneForWhatsApp(phone);
    for (const c of clients) {
      if (excludeId && c.id === excludeId) continue;
      const { normalized: cNorm } = normalizePhoneForWhatsApp(c.phone);
      if (normalized && cNorm && normalized === cNorm) {
        return { isDuplicate: true, field: 'telefone', clientName: c.name };
      }
      if (email && c.email && email.trim().toLowerCase() === c.email.trim().toLowerCase()) {
        return { isDuplicate: true, field: 'e-mail', clientName: c.name };
      }
    }
    return { isDuplicate: false };
  };

  const addClient = (clientData: Omit<Client, 'id' | 'createdAt' | 'totalVisits' | 'totalSpent' | 'isArchived'>) => {
    if (!clientData.name.trim()) {
      return { success: false, error: 'O nome completo da cliente é obrigatório.' };
    }
    if (!clientData.phone.trim()) {
      return { success: false, error: 'O telefone com DDD é obrigatório.' };
    }

    const dup = checkDuplicateClient(clientData.phone, clientData.email);
    if (dup.isDuplicate) {
      return { 
        success: false, 
        error: `Atenção: Já existe um cadastro com este ${dup.field} (${dup.clientName}). Verifique antes de continuar.` 
      };
    }

    const newClient: Client = {
      ...clientData,
      id: generateId('cli'),
      createdAt: new Date().toISOString(),
      totalVisits: 0,
      totalSpent: 0,
      isArchived: false,
    };

    const nextClients = [newClient, ...clients];
    setClients(nextClients);
    storageService.saveClients(nextClients);
    return { success: true, client: newClient };
  };

  const updateClient = (id: string, clientData: Partial<Client>) => {
    if (clientData.phone) {
      const dup = checkDuplicateClient(clientData.phone, clientData.email, id);
      if (dup.isDuplicate) {
        return { 
          success: false, 
          error: `Atenção: Já existe outro cadastro com este ${dup.field} (${dup.clientName}).` 
        };
      }
    }

    const nextClients = clients.map(c => (c.id === id ? { ...c, ...clientData } : c));
    setClients(nextClients);
    storageService.saveClients(nextClients);
    return { success: true };
  };

  const archiveClient = (id: string, isArchived: boolean) => {
    const nextClients = clients.map(c => (c.id === id ? { ...c, isArchived } : c));
    setClients(nextClients);
    storageService.saveClients(nextClients);
  };

  // SERVICES
  const addService = (serviceData: Omit<Service, 'id'>) => {
    if (!serviceData.name.trim()) {
      return { success: false, error: 'O nome do serviço é obrigatório.' };
    }
    if (serviceData.price < 0 || isNaN(serviceData.price)) {
      return { success: false, error: 'O preço padrão deve ser um valor válido.' };
    }
    if (serviceData.durationMinutes <= 0) {
      return { success: false, error: 'A duração estimada deve ser de pelo menos 1 minuto.' };
    }

    const newService: Service = {
      ...serviceData,
      commissionPercentage: serviceData.commissionPercentage ?? 50,
      id: generateId('srv'),
    };

    const nextServices = [...services, newService];
    setServices(nextServices);
    storageService.saveServices(nextServices);
    return { success: true, service: newService };
  };

  const updateService = (id: string, serviceData: Partial<Service>) => {
    const nextServices = services.map(s => (s.id === id ? { ...s, ...serviceData } : s));
    setServices(nextServices);
    storageService.saveServices(nextServices);
    return { success: true };
  };

  const toggleServiceActive = (id: string) => {
    const nextServices = services.map(s => (s.id === id ? { ...s, isActive: !s.isActive } : s));
    setServices(nextServices);
    storageService.saveServices(nextServices);
  };

  // PROFESSIONALS & USER ACCOUNTS
  const addProfessional = (data: { 
    name: string; 
    specialty: string; 
    phone: string; 
    color?: string; 
    commissionPercentage?: number; 
    username: string; 
    password?: string 
  }) => {
    if (!data.name.trim()) return { success: false, error: 'Nome da profissional é obrigatório.' };
    if (!data.username.trim()) return { success: false, error: 'Nome de usuário para login é obrigatório.' };

    const users = storageService.getUsers();
    if (users.some(u => u.username.toLowerCase() === data.username.trim().toLowerCase())) {
      return { success: false, error: 'Esse nome de usuário já está em uso.' };
    }

    const profId = generateId('prof');
    const userId = generateId('user');

    // Create User Account
    const newUser: User = {
      id: userId,
      username: data.username.trim().toLowerCase(),
      email: `${data.username.trim().toLowerCase()}@totalbeautyoficial.com.br`,
      name: data.name.trim(),
      role: 'profissional',
      professionalId: profId,
      forcePasswordChange: false,
      createdAt: new Date().toISOString(),
    };

    const plainPassword = data.password?.trim() || `${data.username.trim().toLowerCase()}123`;
    storageService.setUserPassword(userId, plainPassword);

    const nextUsers = [...users, newUser];
    storageService.saveUsers(nextUsers);

    // Create Professional Profile
    const newProfessional: Professional = {
      id: profId,
      name: data.name.trim(),
      specialty: data.specialty.trim() || 'Especialista da Beleza',
      phone: data.phone.trim(),
      color: data.color || '#C58F9B',
      isActive: true,
      userId,
      username: data.username.trim().toLowerCase(),
      commissionPercentage: data.commissionPercentage ?? 50,
    };

    const nextProfessionals = [...professionals, newProfessional];
    setProfessionals(nextProfessionals);
    storageService.saveProfessionals(nextProfessionals);

    return { success: true, professional: newProfessional };
  };

  const updateProfessional = (id: string, data: Partial<Professional> & { password?: string }) => {
    const prof = professionals.find(p => p.id === id);
    if (!prof) return { success: false, error: 'Profissional não encontrada.' };

    const users = storageService.getUsers();
    let targetUserId = prof.userId;
    if (!targetUserId) {
      const match = users.find(u => 
        u.professionalId === prof.id || 
        u.username.toLowerCase() === (prof.username || '').toLowerCase()
      );
      if (match) {
        targetUserId = match.id;
      }
    }

    // If password provided, update user password
    if (data.password && targetUserId) {
      storageService.setUserPassword(targetUserId, data.password.trim());
    }

    // Update user display name or username if changed
    if (targetUserId && (data.name || data.username)) {
      const nextUsers = users.map(u => {
        if (u.id === targetUserId) {
          return {
            ...u,
            name: data.name || u.name,
            username: data.username ? data.username.trim().toLowerCase() : u.username,
          };
        }
        return u;
      });
      storageService.saveUsers(nextUsers);
    }

    const nextProfessionals = professionals.map(p => (p.id === id ? { ...p, ...data, userId: targetUserId || p.userId } : p));
    setProfessionals(nextProfessionals);
    storageService.saveProfessionals(nextProfessionals);

    // If commission percentage changed, synchronize active attendances and transactions for this professional
    if (data.commissionPercentage !== undefined) {
      const newPerc = data.commissionPercentage;
      const nextAttendances = attendances.map(a => {
        if (a.professionalId === id && !a.finishedAt) {
          const disc = a.discountValue || 0;
          const net = Math.max(0, a.grossValue - disc);
          const base = a.isPackageCovered ? a.grossValue : net;
          return {
            ...a,
            commissionPercentage: newPerc,
            commissionAmount: (base * newPerc) / 100,
          };
        }
        return a;
      });
      setAttendances(nextAttendances);
      storageService.saveAttendances(nextAttendances);

      const nextPayments = payments.map(p => {
        if (p.professionalId === id) {
          const isPkg = p.description?.includes('CRÉDITO DE PACOTE') || false;
          const base = isPkg ? (p.grossValue || p.netValue) : (p.paidAmount || p.netValue);
          return {
            ...p,
            commissionPercentage: newPerc,
            commissionAmount: (base * newPerc) / 100,
          };
        }
        return p;
      });
      setPayments(nextPayments);
      storageService.savePayments(nextPayments);
    }

    return { success: true };
  };

  const deleteProfessional = (id: string) => {
    const prof = professionals.find(p => p.id === id);
    if (!prof) return { success: false, error: 'Profissional não encontrada.' };

    if (prof.userId) {
      const users = storageService.getUsers();
      const nextUsers = users.filter(u => u.id !== prof.userId);
      storageService.saveUsers(nextUsers);
    }

    const nextProfessionals = professionals.filter(p => p.id !== id);
    setProfessionals(nextProfessionals);
    storageService.saveProfessionals(nextProfessionals);
    storageService.deleteFromCloud('professionals', id);
    return { success: true };
  };

  // INDIVIDUAL PROFESSIONAL METRICS CALCULATOR
  const getProfessionalMetrics = (professionalId: string): ProfessionalMetrics => {
    const today = getTodayDate();
    const currentMonth = today.substring(0, 7);

    // All payments for this professional
    const myTransactions = payments
      .filter(p => p.professionalId === professionalId)
      .sort((a, b) => b.date.localeCompare(a.date));

    // Today's metrics (paid commissions + gross + net)
    const todayTransactions = myTransactions.filter(p => p.date === today);
    const todayPaid = todayTransactions.filter(p => p.status === 'pago' || (p.status === 'parcial' && p.paidAmount > 0));
    const todayCommissions = todayPaid.reduce((acc, p) => acc + (p.commissionAmount || 0), 0);
    const todayGross = todayTransactions.reduce((acc, p) => acc + (p.grossValue || 0), 0);
    const todayNet = todayTransactions.reduce((acc, p) => acc + (p.netValue || 0), 0);

    // Month's metrics
    const monthTransactions = myTransactions.filter(p => p.date.startsWith(currentMonth));
    const monthPaid = monthTransactions.filter(p => p.status === 'pago' || (p.status === 'parcial' && p.paidAmount > 0));
    const monthCommissions = monthPaid.reduce((acc, p) => acc + (p.commissionAmount || 0), 0);
    const monthGross = monthTransactions.reduce((acc, p) => acc + (p.grossValue || 0), 0);
    const monthNet = monthTransactions.reduce((acc, p) => acc + (p.netValue || 0), 0);

    const prof = professionals.find(p => p.id === professionalId);
    const profComm = prof?.commissionPercentage ?? 50;

    // Pending commissions (attendances concluded but client hasn't fully paid)
    const pendingTransactions = myTransactions.filter(p => p.status !== 'pago');
    const pendingCommissions = pendingTransactions.reduce((acc, p) => {
      const commPercent = p.commissionPercentage || profComm;
      return acc + ((p.pendingAmount * commPercent) / 100);
    }, 0);

    // Appointments for this professional
    const myAppointments = appointments.filter(a => a.professionalId === professionalId);
    const todayAppointments = myAppointments
      .filter(a => a.date === today && !['cancelado', 'nao_compareceu'].includes(a.status))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    const todayCompletedCount = myAppointments.filter(a => a.date === today && a.status === 'concluido').length;
    const monthCompletedCount = myAppointments.filter(a => a.date.startsWith(currentMonth) && a.status === 'concluido').length;

    return {
      todayCommissions,
      todayGross,
      todayNet,
      monthCommissions,
      monthGross,
      monthNet,
      pendingCommissions,
      todayCompletedCount,
      monthCompletedCount,
      todayAppointments,
      myTransactions,
    };
  };

  // APPOINTMENT CONFLICT CHECKING
  const checkConflict = (
    date: string, 
    startTime: string, 
    endTime: string, 
    professionalId: string, 
    excludeAppointmentId?: string
  ): ConflictResult => {
    const activeAppointments = appointments.filter(apt => 
      apt.date === date &&
      apt.professionalId === professionalId &&
      apt.id !== excludeAppointmentId &&
      !['cancelado', 'nao_compareceu'].includes(apt.status)
    );

    for (const apt of activeAppointments) {
      if (isTimeOverlapping(startTime, endTime, apt.startTime, apt.endTime)) {
        return {
          hasConflict: true,
          conflictingAppointment: apt,
          message: `Conflito de horário! A profissional ${apt.professionalName} já possui compromisso (${apt.serviceName} com ${apt.clientName}) das ${apt.startTime} às ${apt.endTime}.`
        };
      }
    }

    // Check against active schedule blocks (Bloqueio de Agenda)
    const activeBlocks = scheduleBlocks.filter(b => 
      b.date === date && 
      b.professionalId === professionalId
    );

    for (const block of activeBlocks) {
      if (isTimeOverlapping(startTime, endTime, block.startTime, block.endTime)) {
        return {
          hasConflict: true,
          message: `Horário Bloqueado! A profissional ${block.professionalName} possui bloqueio de agenda neste horário: "${block.reason}" (${block.startTime} às ${block.endTime}).`
        };
      }
    }

    return { hasConflict: false };
  };

  const addAppointment = (appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!appointmentData.clientId) return { success: false, error: 'Selecione uma cliente.' };
    if (!appointmentData.serviceId) return { success: false, error: 'Selecione um serviço.' };
    if (!appointmentData.date) return { success: false, error: 'Selecione a data.' };
    if (!appointmentData.startTime) return { success: false, error: 'Informe o horário inicial.' };

    const calculatedEndTime = appointmentData.endTime || addMinutesToTime(appointmentData.startTime, appointmentData.durationMinutes);

    if (!appointmentData.isFitIn) {
      const conflict = checkConflict(
        appointmentData.date, 
        appointmentData.startTime, 
        calculatedEndTime, 
        appointmentData.professionalId
      );
      if (conflict.hasConflict) {
        return { success: false, error: conflict.message };
      }
    }

    const nowIso = new Date().toISOString();
    const newAppointment: Appointment = {
      ...appointmentData,
      id: generateId('apt'),
      endTime: calculatedEndTime,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const nextAppointments = [...appointments, newAppointment];
    setAppointments(nextAppointments);
    storageService.saveAppointments(nextAppointments);

    const nextClients = clients.map(c => {
      if (c.id === appointmentData.clientId) {
        return { ...c, lastVisit: appointmentData.date };
      }
      return c;
    });
    setClients(nextClients);
    storageService.saveClients(nextClients);

    return { success: true, appointment: newAppointment };
  };

  const updateAppointment = (id: string, appointmentData: Partial<Appointment>) => {
    const existing = appointments.find(a => a.id === id);
    if (!existing) return { success: false, error: 'Agendamento não encontrado.' };

    const targetDate = appointmentData.date || existing.date;
    const targetStart = appointmentData.startTime || existing.startTime;
    const targetDuration = appointmentData.durationMinutes ?? existing.durationMinutes;
    const targetEnd = appointmentData.endTime || addMinutesToTime(targetStart, targetDuration);
    const targetProf = appointmentData.professionalId || existing.professionalId;
    const isFitIn = appointmentData.isFitIn ?? existing.isFitIn;

    if (!isFitIn && (appointmentData.date || appointmentData.startTime || appointmentData.durationMinutes || appointmentData.professionalId)) {
      const conflict = checkConflict(targetDate, targetStart, targetEnd, targetProf, id);
      if (conflict.hasConflict) {
        return { success: false, error: conflict.message };
      }
    }

    const nextAppointments = appointments.map(a => {
      if (a.id === id) {
        return {
          ...a,
          ...appointmentData,
          endTime: targetEnd,
          updatedAt: new Date().toISOString()
        };
      }
      return a;
    });

    setAppointments(nextAppointments);
    storageService.saveAppointments(nextAppointments);
    return { success: true };
  };

  const updateAppointmentStatus = (id: string, status: AppointmentStatus, cancellationReason?: string) => {
    setAppointments(prev => {
      const nextAppointments = prev.map(a => {
        if (a.id === id) {
          return {
            ...a,
            status,
            cancellationReason: cancellationReason || a.cancellationReason,
            updatedAt: new Date().toISOString()
          };
        }
        return a;
      });
      storageService.saveAppointments(nextAppointments);
      return nextAppointments;
    });
    return { success: true };
  };

  const cancelAppointment = (id: string, reason: string) => {
    return updateAppointmentStatus(id, 'cancelado', reason);
  };

  const deleteAppointment = (id: string, reason: string): { success: boolean; error?: string } => {
    if (!reason || !reason.trim()) {
      return { success: false, error: 'A justificativa para a exclusão do agendamento é obrigatória.' };
    }

    const aptToDelete = appointments.find(a => a.id === id);
    if (!aptToDelete) {
      return { success: false, error: 'Agendamento não encontrado.' };
    }

    // 1. Audit log of the deletion
    const nowIso = new Date().toISOString();
    const deletionLog: AppointmentDeletionLog = {
      id: generateId('del_apt'),
      appointmentId: aptToDelete.id,
      clientId: aptToDelete.clientId,
      clientName: aptToDelete.clientName,
      clientPhone: aptToDelete.clientPhone,
      serviceName: aptToDelete.serviceName,
      professionalId: aptToDelete.professionalId,
      professionalName: aptToDelete.professionalName,
      date: aptToDelete.date,
      startTime: aptToDelete.startTime,
      durationMinutes: aptToDelete.durationMinutes,
      price: aptToDelete.price,
      reason: reason.trim(),
      deletedBy: 'Profissional / Administração',
      deletedAt: nowIso,
    };
    storageService.saveAppointmentDeletionLog(deletionLog);

    // 2. Remove appointment from state and persistent storage
    const nextAppointments = appointments.filter(a => a.id !== id);
    setAppointments(nextAppointments);
    storageService.saveAppointments(nextAppointments);
    deleteDocumentFromFirestore('appointments', id);

    // 3. Remove unfinished attendance if linked to this appointment
    const linkedAttendance = attendances.find(a => a.appointmentId === id);
    if (linkedAttendance && (!linkedAttendance.finishedAt || linkedAttendance.paymentStatus !== 'pago')) {
      const nextAttendances = attendances.filter(a => a.id !== linkedAttendance.id);
      setAttendances(nextAttendances);
      storageService.saveAttendances(nextAttendances);
      deleteDocumentFromFirestore('attendances', linkedAttendance.id);
    }

    return { success: true };
  };

  const cleanupDeborahAttendances = () => {
    const res = storageService.cleanupDeborahExampleData();
    loadAllData();
    return {
      success: true,
      message: `${res.deletedAttendances} atendimento(s) e registros de teste da Deborah foram removidos com sucesso.`
    };
  };

  const clearExampleInventory = () => {
    const res = storageService.cleanupExampleInventory();
    loadAllData();
    return {
      success: true,
      message: `${res.deletedItemsCount} item(ns) de exemplo foram removidos do estoque com sucesso.`
    };
  };

  const addScheduleBlock = (data: {
    professionalId: string;
    date: string;
    startTime: string;
    endTime: string;
    reason: string;
    notes?: string;
  }) => {
    if (!data.professionalId) return { success: false, error: 'Selecione a profissional.' };
    if (!data.date) return { success: false, error: 'Selecione a data.' };
    if (!data.startTime) return { success: false, error: 'Informe o horário inicial.' };
    if (!data.endTime) return { success: false, error: 'Informe o horário final.' };
    if (!data.reason || !data.reason.trim()) return { success: false, error: 'A justificativa do bloqueio é obrigatória.' };

    const [sh, sm] = data.startTime.split(':').map(Number);
    const [eh, em] = data.endTime.split(':').map(Number);
    const startMins = (sh || 0) * 60 + (sm || 0);
    const endMins = (eh || 0) * 60 + (em || 0);

    if (endMins <= startMins) {
      return { success: false, error: 'O horário final deve ser posterior ao horário inicial.' };
    }

    const prof = professionals.find(p => p.id === data.professionalId);
    const profName = prof?.name || 'Profissional';
    const duration = endMins - startMins;

    // Check overlap with another schedule block for same professional on same date
    const overlappingBlock = scheduleBlocks.find(b => 
      b.date === data.date && 
      b.professionalId === data.professionalId &&
      isTimeOverlapping(data.startTime, data.endTime, b.startTime, b.endTime)
    );
    if (overlappingBlock) {
      return { 
        success: false, 
        error: `Já existe um bloqueio para ${profName} neste período: "${overlappingBlock.reason}" (${overlappingBlock.startTime} às ${overlappingBlock.endTime}).` 
      };
    }

    const newBlock: ScheduleBlock = {
      id: generateId('block'),
      professionalId: data.professionalId,
      professionalName: profName,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      durationMinutes: duration,
      reason: data.reason.trim(),
      notes: data.notes?.trim() || undefined,
      createdBy: 'Sistema Total Beauty',
      createdAt: new Date().toISOString(),
    };

    const nextBlocks = [...scheduleBlocks, newBlock];
    setScheduleBlocks(nextBlocks);
    storageService.saveScheduleBlocks(nextBlocks);
    return { success: true, block: newBlock };
  };

  const deleteScheduleBlock = (id: string) => {
    const nextBlocks = scheduleBlocks.filter(b => b.id !== id);
    setScheduleBlocks(nextBlocks);
    storageService.saveScheduleBlocks(nextBlocks);
    deleteDocumentFromFirestore('scheduleBlocks', id);
    return { success: true };
  };

  const checkMultiConflict = (
    date: string,
    startTime: string,
    executionMode: 'sequencial' | 'simultaneo',
    selectedServices: Array<{ serviceId: string; professionalId: string; durationMinutes: number }>
  ): { hasConflict: boolean; conflicts: string[] } => {
    const conflicts: string[] = [];

    // Simultaneous check: ensure no professional is assigned twice simultaneously
    if (executionMode === 'simultaneo') {
      const profCounts: Record<string, number> = {};
      selectedServices.forEach(s => {
        if (s.professionalId) {
          profCounts[s.professionalId] = (profCounts[s.professionalId] || 0) + 1;
        }
      });
      for (const [pId, count] of Object.entries(profCounts)) {
        if (count > 1) {
          const pName = professionals.find(p => p.id === pId)?.name || 'Profissional';
          conflicts.push(`A profissional ${pName} não pode executar múltiplos atendimentos simultaneamente no mesmo horário.`);
        }
      }
    }

    let currentStart = startTime;
    selectedServices.forEach((s, idx) => {
      const srv = services.find(serv => serv.id === s.serviceId);
      const prof = professionals.find(p => p.id === s.professionalId);
      const duration = s.durationMinutes || srv?.durationMinutes || 30;

      let sStart = startTime;
      let sEnd = '';
      if (executionMode === 'sequencial') {
        sStart = currentStart;
        sEnd = addMinutesToTime(sStart, duration);
        currentStart = sEnd;
      } else {
        sStart = startTime;
        sEnd = addMinutesToTime(startTime, duration);
      }

      if (s.professionalId) {
        const conflict = checkConflict(date, sStart, sEnd, s.professionalId);
        if (conflict.hasConflict) {
          conflicts.push(`[Serviço ${idx + 1}: ${srv?.name || 'Serviço'} com ${prof?.name || 'Profissional'}] ${conflict.message}`);
        }
      }
    });

    return {
      hasConflict: conflicts.length > 0,
      conflicts
    };
  };

  const addMultiServiceAppointment = (data: {
    clientId: string;
    date: string;
    startTime: string;
    executionMode: 'sequencial' | 'simultaneo';
    services: Array<{ serviceId: string; professionalId: string; durationMinutes: number; price: number; notes?: string }>;
    isFitIn?: boolean;
    fitInReason?: string;
    notes?: string;
  }) => {
    if (!data.clientId) return { success: false, error: 'Selecione uma cliente.' };
    if (!data.services || data.services.length === 0) return { success: false, error: 'Adicione pelo menos um serviço.' };
    if (!data.date) return { success: false, error: 'Selecione a data.' };
    if (!data.startTime) return { success: false, error: 'Informe o horário inicial.' };

    const client = clients.find(c => c.id === data.clientId);
    if (!client) return { success: false, error: 'Cliente não encontrada.' };

    if (!data.isFitIn) {
      const multiConflict = checkMultiConflict(data.date, data.startTime, data.executionMode, data.services);
      if (multiConflict.hasConflict) {
        return {
          success: false,
          error: 'Conflito de horários detectado para um ou mais profissionais.',
          conflicts: multiConflict.conflicts
        };
      }
    }

    const sessionId = generateId('ses');
    const nowIso = new Date().toISOString();
    const createdAppointments: Appointment[] = [];
    let currentStart = data.startTime;

    data.services.forEach(item => {
      const srv = services.find(s => s.id === item.serviceId);
      const prof = professionals.find(p => p.id === item.professionalId);
      const dur = item.durationMinutes || srv?.durationMinutes || 30;
      
      let sStart = data.startTime;
      let sEnd = '';
      if (data.executionMode === 'sequencial') {
        sStart = currentStart;
        sEnd = addMinutesToTime(sStart, dur);
        currentStart = sEnd;
      } else {
        sStart = data.startTime;
        sEnd = addMinutesToTime(data.startTime, dur);
      }

      const newApt: Appointment = {
        id: generateId('apt'),
        sessionId,
        executionMode: data.executionMode,
        clientId: client.id,
        clientName: client.name,
        clientPhone: client.phone,
        serviceId: item.serviceId,
        serviceName: srv?.name || 'Serviço',
        professionalId: item.professionalId,
        professionalName: prof?.name || 'Profissional',
        date: data.date,
        startTime: sStart,
        endTime: sEnd,
        durationMinutes: dur,
        price: item.price ?? (srv?.price || 0),
        notes: item.notes || data.notes || '',
        status: 'agendado',
        isFitIn: data.isFitIn || false,
        fitInReason: data.fitInReason,
        fitInAuthorizedBy: data.isFitIn ? 'Administração / Usuário Autorizado' : undefined,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      createdAppointments.push(newApt);
    });

    const nextAppointments = [...appointments, ...createdAppointments];
    setAppointments(nextAppointments);
    storageService.saveAppointments(nextAppointments);

    const nextClients = clients.map(c => {
      if (c.id === data.clientId) {
        return { ...c, lastVisit: data.date };
      }
      return c;
    });
    setClients(nextClients);
    storageService.saveClients(nextClients);

    return { success: true, appointments: createdAppointments };
  };

  // ATTENDANCES
  const startAttendance = (appointmentId?: string, clientId?: string, serviceId?: string, professionalId?: string) => {
    let clientObj: Client | undefined;
    let serviceObj: Service | undefined;
    let profObj: Professional | undefined;

    if (appointmentId) {
      const apt = appointments.find(a => a.id === appointmentId);
      if (apt) {
        clientObj = clients.find(c => c.id === apt.clientId);
        serviceObj = services.find(s => s.id === apt.serviceId);
        profObj = professionals.find(p => p.id === apt.professionalId);
        updateAppointmentStatus(appointmentId, 'em_atendimento');
      }
    } else {
      clientObj = clients.find(c => c.id === clientId);
      serviceObj = services.find(s => s.id === serviceId);
      profObj = professionals.find(p => p.id === professionalId);
    }

    if (!clientObj || !serviceObj) {
      return { success: false, error: 'Dados da cliente ou do serviço não encontrados.' };
    }

    const commPercent = serviceObj.commissionPercentage ?? 50;

    const newAttendance: Attendance = {
      id: generateId('atd'),
      appointmentId,
      clientId: clientObj.id,
      clientName: clientObj.name,
      serviceId: serviceObj.id,
      serviceName: serviceObj.name,
      professionalId: profObj?.id || '',
      professionalName: profObj?.name || 'Não atribuído',
      date: getTodayDate(),
      startedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      grossValue: serviceObj.price,
      discountValue: 0,
      discountType: 'fixed',
      netValue: serviceObj.price,
      commissionPercentage: commPercent,
      commissionAmount: (serviceObj.price * commPercent) / 100,
      paymentStatus: 'pendente',
      paidAmount: 0,
      createdAt: new Date().toISOString(),
    };

    const nextAttendances = [newAttendance, ...attendances];
    setAttendances(nextAttendances);
    storageService.saveAttendances(nextAttendances);

    return { success: true, attendance: newAttendance };
  };

  const revertAttendance = (attendanceId: string): { success: boolean; error?: string } => {
    const atd = attendances.find(a => a.id === attendanceId);
    if (!atd) {
      return { success: false, error: 'Atendimento não encontrado.' };
    }

    // 1. If tied to an appointment, restore appointment status back to 'agendado'
    // Preserving all appointment information (client, service, professional, date, time, notes)
    if (atd.appointmentId) {
      const nextAppointments = appointments.map(apt => {
        if (apt.id === atd.appointmentId) {
          return {
            ...apt,
            status: 'agendado' as const,
            updatedAt: new Date().toISOString()
          };
        }
        return apt;
      });
      setAppointments(nextAppointments);
      storageService.saveAppointments(nextAppointments);
    }

    // 2. Remove the attendance from attendances state and storage
    const nextAttendances = attendances.filter(a => a.id !== attendanceId);
    setAttendances(nextAttendances);
    storageService.saveAttendances(nextAttendances);
    storageService.deleteFromCloud('attendances', attendanceId);

    // 3. Clean up comanda: remove this attendance from any comanda
    const nextComandas = comandas
      .map(c => ({
        ...c,
        attendanceIds: c.attendanceIds.filter(id => id !== attendanceId)
      }))
      .filter(c => c.attendanceIds.length > 0);
    setComandas(nextComandas);
    storageService.saveComandas(nextComandas);

    // 4. Remove any product consumption records linked to this attendance
    const consumptionsToRemove = consumptions.filter(c => c.attendanceId === attendanceId);
    if (consumptionsToRemove.length > 0) {
      consumptionsToRemove.forEach(c => {
        storageService.deleteFromCloud('consumptions', c.id);
      });
      const nextConsumptions = consumptions.filter(c => c.attendanceId !== attendanceId);
      setConsumptions(nextConsumptions);
      storageService.saveConsumptions(nextConsumptions);
    }

    // 5. Remove any payment transaction linked to this attendance
    const paymentsToRemove = payments.filter(p => p.attendanceId === attendanceId);
    if (paymentsToRemove.length > 0) {
      paymentsToRemove.forEach(p => {
        storageService.deleteFromCloud('payments', p.id);
      });
      const nextPayments = payments.filter(p => p.attendanceId !== attendanceId);
      setPayments(nextPayments);
      storageService.savePayments(nextPayments);
    }

    return { success: true };
  };

  const finishAttendance = (
    attendanceId: string, 
    options: {
      grossValue: number;
      discountValue: number;
      discountType: 'fixed' | 'percentage';
      netValue: number;
      paymentMethod: PaymentMethod;
      paymentStatus: 'pago' | 'pendente' | 'parcial';
      paidAmount: number;
      notes?: string;
    }
  ) => {
    const atd = attendances.find(a => a.id === attendanceId);
    if (!atd) return { success: false, error: 'Atendimento não encontrado.' };

    const finishedTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Calculate commission directly from the service percentage (Admin configured)
    const srv = services.find(s => s.id === atd.serviceId);
    const commPercent = srv?.commissionPercentage ?? atd.commissionPercentage ?? 50;
    
    // Commission is calculated based on received payment (if paid) or net value
    const effectiveCommission = options.paymentStatus === 'pago'
      ? (options.netValue * commPercent) / 100
      : (options.paidAmount * commPercent) / 100;

    // Update Attendance
    const updatedAttendance: Attendance = {
      ...atd,
      finishedAt: finishedTime,
      grossValue: options.grossValue,
      discountValue: options.discountValue,
      discountType: options.discountType,
      netValue: options.netValue,
      commissionPercentage: commPercent,
      commissionAmount: effectiveCommission,
      paymentMethod: options.paymentMethod,
      paymentStatus: options.paymentStatus,
      paidAmount: options.paidAmount,
      notes: options.notes,
    };

    const nextAttendances = attendances.map(a => (a.id === attendanceId ? updatedAttendance : a));
    setAttendances(nextAttendances);
    storageService.saveAttendances(nextAttendances);

    // If attendance is tied to appointment, mark appointment as 'concluido'
    if (atd.appointmentId) {
      updateAppointmentStatus(atd.appointmentId, 'concluido');
    }

    // Register Revenue in Financials without duplication
    const pendingAmount = Math.max(0, options.netValue - options.paidAmount);
    
    const existingPayment = payments.find(p => p.attendanceId === attendanceId);
    let nextPayments: PaymentTransaction[];

    if (existingPayment) {
      nextPayments = payments.map(p => {
        if (p.attendanceId === attendanceId) {
          return {
            ...p,
            grossValue: options.grossValue,
            discount: options.discountValue,
            netValue: options.netValue,
            paidAmount: options.paidAmount,
            pendingAmount,
            commissionPercentage: commPercent,
            commissionAmount: effectiveCommission,
            paymentMethod: options.paymentMethod,
            status: options.paymentStatus,
          };
        }
        return p;
      });
    } else {
      const newPayment: PaymentTransaction = {
        id: generateId('pay'),
        attendanceId,
        clientId: atd.clientId,
        clientName: atd.clientName,
        serviceName: atd.serviceName,
        professionalId: atd.professionalId,
        professionalName: atd.professionalName,
        description: `Atendimento Concluído — ${atd.serviceName}`,
        grossValue: options.grossValue,
        discount: options.discountValue,
        netValue: options.netValue,
        paidAmount: options.paidAmount,
        pendingAmount,
        commissionPercentage: commPercent,
        commissionAmount: effectiveCommission,
        paymentMethod: options.paymentMethod,
        status: options.paymentStatus,
        date: atd.date,
        type: 'receita',
        createdAt: new Date().toISOString(),
      };
      nextPayments = [newPayment, ...payments];
    }

    setPayments(nextPayments);
    storageService.savePayments(nextPayments);

    // Recalculate client statistics
    const recalculatedClients = recalculateClientStats(nextPayments, clients);
    setClients(recalculatedClients);
    storageService.saveClients(recalculatedClients);

    return { success: true };
  };

  // UNIFIED COMANDA & MULTI-PAYMENT METHODS
  const getComandaByClientAndDate = (clientId: string, date: string) => {
    const clientAttendances = attendances.filter(a => a.clientId === clientId && a.date === date);
    const existingComanda = comandas.find(c => c.clientId === clientId && c.date === date);
    return { comanda: existingComanda, clientAttendances };
  };

  const finishUnifiedComanda = (data: {
    clientId: string;
    date: string;
    attendancesUpdates: Array<{
      attendanceId: string;
      grossValue: number;
      discountValue: number;
      discountType: 'fixed' | 'percentage';
      netValue: number;
      packageId?: string;
      isPackageCovered?: boolean;
    }>;
    payments: Array<{
      paymentMethod: PaymentMethod;
      amount: number;
      notes?: string;
    }>;
    notes?: string;
  }) => {
    const client = clients.find(c => c.id === data.clientId);
    if (!client) return { success: false, error: 'Cliente não encontrada.' };
    if (!data.attendancesUpdates || data.attendancesUpdates.length === 0) {
      return { success: false, error: 'Nenhum serviço selecionado para fechamento da comanda.' };
    }

    const finishedTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    let subtotal = 0;
    let discountTotal = 0;
    let netTotal = 0;

    const updateMap = new Map(data.attendancesUpdates.map(u => [u.attendanceId, u]));
    const finishedAttendanceIds: string[] = [];
    const finishedAttendances: Attendance[] = [];
    const appointmentIdsToComplete = new Set<string>();

    const nextAttendances = attendances.map(atd => {
      const update = updateMap.get(atd.id);
      if (update) {
        finishedAttendanceIds.push(atd.id);
        if (atd.appointmentId) {
          appointmentIdsToComplete.add(atd.appointmentId);
        }
        const srv = services.find(s => s.id === atd.serviceId);
        const commPercent = srv?.commissionPercentage ?? atd.commissionPercentage ?? 50;
        
        // Fair commission calculation: if session is covered by prepaid package, commission is based on gross value
        const commBase = update.isPackageCovered ? update.grossValue : update.netValue;
        const commAmount = (commBase * commPercent) / 100;

        subtotal += update.grossValue;
        discountTotal += update.discountValue;
        netTotal += update.netValue;

        const updatedAtd: Attendance = {
          ...atd,
          finishedAt: atd.finishedAt || finishedTime,
          grossValue: update.grossValue,
          discountValue: update.discountValue,
          discountType: update.discountType,
          netValue: update.netValue,
          commissionPercentage: commPercent,
          commissionAmount: commAmount,
          packageId: update.packageId || atd.packageId,
          isPackageCovered: update.isPackageCovered || atd.isPackageCovered,
          notes: data.notes || atd.notes,
        };
        finishedAttendances.push(updatedAtd);
        return updatedAtd;
      }
      return atd;
    });

    const paidTotal = data.payments.reduce((acc, p) => acc + (p.amount || 0), 0);
    const pendingTotal = Math.max(0, netTotal - paidTotal);
    const status: 'pago' | 'parcial' | 'pendente' = 
      pendingTotal <= 0.01 ? 'pago' : paidTotal > 0 ? 'parcial' : 'pendente';

    const existingComanda = comandas.find(c => c.clientId === data.clientId && c.date === data.date);
    const comandaId = existingComanda?.id || generateId('cmd');

    const finalAttendances = nextAttendances.map(atd => {
      if (updateMap.has(atd.id)) {
        const atdPaidAmount = atd.isPackageCovered
          ? 0
          : status === 'pago' 
            ? atd.netValue 
            : Math.min(atd.netValue, netTotal > 0 ? (paidTotal / netTotal) * atd.netValue : 0);
        return {
          ...atd,
          comandaId,
          paymentStatus: atd.isPackageCovered ? 'pago' : status,
          paidAmount: atdPaidAmount,
        };
      }
      return atd;
    });

    setAttendances(finalAttendances);
    storageService.saveAttendances(finalAttendances);

    // Conclude all associated appointments in a single batch
    if (appointmentIdsToComplete.size > 0) {
      setAppointments(prev => {
        const nextAppointments = prev.map(a => {
          if (appointmentIdsToComplete.has(a.id)) {
            return {
              ...a,
              status: 'concluido' as AppointmentStatus,
              updatedAt: new Date().toISOString()
            };
          }
          return a;
        });
        storageService.saveAppointments(nextAppointments);
        return nextAppointments;
      });
    }

    const newPaymentsList: ComandaPayment[] = data.payments.map(p => ({
      id: generateId('cmp'),
      paymentMethod: p.paymentMethod,
      amount: p.amount,
      date: data.date,
      notes: p.notes,
      createdAt: new Date().toISOString(),
    }));

    const allComandaPayments = existingComanda 
      ? [...existingComanda.payments, ...newPaymentsList]
      : newPaymentsList;

    const comandaObj: Comanda = {
      id: comandaId,
      clientId: data.clientId,
      clientName: client.name,
      clientPhone: client.phone,
      date: data.date,
      attendanceIds: finishedAttendanceIds,
      subtotal,
      discountTotal,
      netTotal,
      paidTotal,
      pendingTotal,
      status,
      payments: allComandaPayments,
      notes: data.notes,
      createdAt: existingComanda?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const nextComandas = existingComanda
      ? comandas.map(c => c.id === existingComanda.id ? comandaObj : c)
      : [comandaObj, ...comandas];

    setComandas(nextComandas);
    storageService.saveComandas(nextComandas);

    // Register financial revenues cleanly per professional attendance
    // This guarantees immediate daily calculation of gross value and commission payout!
    const oldPaymentAttendanceIds = new Set(finishedAttendanceIds);
    const cleanedPayments = payments.filter(p => !p.attendanceId || !oldPaymentAttendanceIds.has(p.attendanceId));

    const primaryPaymentMethod: PaymentMethod = data.payments.length === 1 
      ? data.payments[0].paymentMethod 
      : (data.payments[0]?.paymentMethod || 'pix');

    const paymentMethodsSummary = data.payments.map(p => p.paymentMethod.toUpperCase()).join(' + ');

    const newFinancialTransactions: PaymentTransaction[] = finishedAttendances.map(atd => {
      const paidRatio = netTotal > 0 ? (paidTotal / netTotal) : 1;
      const atdPaidAmount = atd.isPackageCovered 
        ? 0 
        : status === 'pago' 
          ? atd.netValue 
          : Math.min(atd.netValue, atd.netValue * paidRatio);
      const atdPendingAmount = atd.isPackageCovered ? 0 : Math.max(0, atd.netValue - atdPaidAmount);
      
      const atdCommission = atd.isPackageCovered
        ? (atd.grossValue * (atd.commissionPercentage || 50)) / 100
        : (atdPaidAmount * (atd.commissionPercentage || 50)) / 100;

      const discPct = atd.grossValue > 0 && atd.discountValue > 0 
        ? Math.round((atd.discountValue / atd.grossValue) * 100) 
        : 0;

      const methodToUse = atd.isPackageCovered ? 'pacote_credito' : primaryPaymentMethod;

      return {
        id: generateId('pay'),
        attendanceId: atd.id,
        comandaId,
        packageId: atd.packageId,
        clientId: client.id,
        clientName: client.name,
        serviceName: atd.serviceName,
        professionalId: atd.professionalId,
        professionalName: atd.professionalName,
        description: atd.isPackageCovered
          ? `Comanda ${comandaId.slice(-4).toUpperCase()} — ${atd.serviceName} (${atd.professionalName}) via CRÉDITO DE PACOTE`
          : `Comanda ${comandaId.slice(-4).toUpperCase()} — ${atd.serviceName} (${atd.professionalName}) via ${paymentMethodsSummary}`,
        grossValue: atd.grossValue,
        discount: atd.discountValue,
        discountPercentage: discPct,
        netValue: atd.netValue,
        paidAmount: atdPaidAmount,
        pendingAmount: atdPendingAmount,
        commissionPercentage: atd.commissionPercentage || 50,
        commissionAmount: atdCommission,
        paymentMethod: methodToUse,
        status: atd.isPackageCovered ? 'pago' : status,
        date: data.date,
        type: 'receita',
        createdAt: new Date().toISOString(),
      };
    });

    const nextPayments = [...newFinancialTransactions, ...cleanedPayments];
    setPayments(nextPayments);
    storageService.savePayments(nextPayments);

    const recalculated = recalculateClientStats(nextPayments, clients);
    setClients(recalculated);
    storageService.saveClients(recalculated);

    // --- AUTOMATIC CLIENT PACKAGES CREATION & USAGE DEDUCTIONS ---
    const addDaysToDate = (dateStr: string, days: number): string => {
      try {
        const [y, m, d] = dateStr.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        date.setDate(date.getDate() + days);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      } catch {
        return dateStr;
      }
    };

    let currentClientPackages = [...clientPackages];
    let packagesChanged = false;

    // 1. If comanda includes a package service purchase, instantiate new ClientPackage
    finishedAttendances.forEach(atd => {
      const srv = services.find(s => s.id === atd.serviceId);
      if (srv?.isPackage && srv.packageConfig) {
        const existingPkg = currentClientPackages.find(p => p.attendanceId === atd.id || (p.comandaId === comandaId && p.packageServiceId === srv.id));
        if (!existingPkg) {
          const validityDays = srv.packageConfig.validityDays || 30;
          const expiryDate = addDaysToDate(data.date, validityDays);
          const newPkg: ClientPackage = {
            id: generateId('cpkg'),
            clientId: client.id,
            clientName: client.name,
            packageServiceId: srv.id,
            packageName: srv.name,
            packageType: srv.packageConfig.packageType,
            totalPricePaid: atd.netValue,
            purchaseDate: data.date,
            expiryDate,
            status: 'ativo',
            items: srv.packageConfig.items.map(it => ({
              serviceType: it.serviceType,
              serviceName: it.serviceName,
              totalQty: it.quantity,
              usedQty: 0,
              remainingQty: it.quantity,
            })),
            usageHistory: [],
            attendanceId: atd.id,
            comandaId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          currentClientPackages = [newPkg, ...currentClientPackages];
          packagesChanged = true;
        }
      }
    });

    // 2. If comanda includes an attendance covered by a package, deduct session & add usage history
    finishedAttendances.forEach(atd => {
      if (atd.packageId && atd.isPackageCovered) {
        const targetPkgIdx = currentClientPackages.findIndex(p => p.id === atd.packageId);
        if (targetPkgIdx >= 0) {
          const pkg = currentClientPackages[targetPkgIdx];
          const alreadyLogged = pkg.usageHistory.some(u => u.attendanceId === atd.id);
          if (!alreadyLogged) {
            const srv = services.find(s => s.id === atd.serviceId);
            const srvNameLower = (srv?.name || atd.serviceName).toLowerCase();

            let itemIndex = pkg.items.findIndex(it =>
              it.remainingQty > 0 && (
                srvNameLower.includes(it.serviceType.toLowerCase()) ||
                srvNameLower.includes(it.serviceName.toLowerCase()) ||
                it.serviceName.toLowerCase().includes(srvNameLower)
              )
            );
            if (itemIndex === -1) {
              itemIndex = pkg.items.findIndex(it => it.remainingQty > 0);
            }

            if (itemIndex >= 0) {
              const updatedItems = [...pkg.items];
              const matchedItem = updatedItems[itemIndex];
              updatedItems[itemIndex] = {
                ...matchedItem,
                usedQty: matchedItem.usedQty + 1,
                remainingQty: Math.max(0, matchedItem.remainingQty - 1),
              };

              const newLog: PackageUsageLog = {
                id: generateId('pul'),
                date: data.date,
                serviceType: matchedItem.serviceType,
                serviceName: atd.serviceName,
                attendanceId: atd.id,
                professionalId: atd.professionalId,
                professionalName: atd.professionalName,
                notes: `Utilizado na Comanda ${comandaId.slice(-4).toUpperCase()}`,
                usedAt: new Date().toISOString(),
              };

              const totalRemaining = updatedItems.reduce((acc, i) => acc + i.remainingQty, 0);

              currentClientPackages[targetPkgIdx] = {
                ...pkg,
                items: updatedItems,
                usageHistory: [newLog, ...pkg.usageHistory],
                status: totalRemaining === 0 ? 'esgotado' : 'ativo',
                updatedAt: new Date().toISOString(),
              };
              packagesChanged = true;
            }
          }
        }
      }
    });

    if (packagesChanged) {
      setClientPackages(currentClientPackages);
      storageService.saveClientPackages(currentClientPackages);
    }

    return { success: true, comanda: comandaObj };
  };

  // CLIENT PACKAGES & PREPAID CREDITS HELPERS
  const getClientActivePackages = (clientId: string): ClientPackage[] => {
    return clientPackages.filter(p => 
      p.clientId === clientId && 
      p.status === 'ativo' && 
      p.items.some(i => i.remainingQty > 0)
    );
  };

  const addClientPackage = (pkgData: Omit<ClientPackage, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newPkg: ClientPackage = {
      ...pkgData,
      id: generateId('cpkg'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const next = [newPkg, ...clientPackages];
    setClientPackages(next);
    storageService.saveClientPackages(next);
    return { success: true, package: newPkg };
  };

  const deductPackageSession = (
    packageId: string, 
    serviceType: string, 
    attendanceId: string, 
    professionalId?: string, 
    professionalName?: string, 
    notes?: string
  ) => {
    const pkgIdx = clientPackages.findIndex(p => p.id === packageId);
    if (pkgIdx === -1) return { success: false, error: 'Pacote não encontrado.' };
    
    const pkg = clientPackages[pkgIdx];
    const itemIdx = pkg.items.findIndex(i => 
      (i.serviceType.toLowerCase() === serviceType.toLowerCase() || 
       i.serviceName.toLowerCase().includes(serviceType.toLowerCase())) && 
      i.remainingQty > 0
    );
    if (itemIdx === -1) return { success: false, error: 'Sessões deste serviço esgotadas no pacote.' };

    const updatedItems = [...pkg.items];
    const item = updatedItems[itemIdx];
    updatedItems[itemIdx] = {
      ...item,
      usedQty: item.usedQty + 1,
      remainingQty: Math.max(0, item.remainingQty - 1),
    };

    const newLog: PackageUsageLog = {
      id: generateId('pul'),
      date: getTodayDate(),
      serviceType: item.serviceType,
      serviceName: item.serviceName,
      attendanceId,
      professionalId,
      professionalName,
      notes,
      usedAt: new Date().toISOString(),
    };

    const totalRemaining = updatedItems.reduce((acc, i) => acc + i.remainingQty, 0);

    const updatedPkg: ClientPackage = {
      ...pkg,
      items: updatedItems,
      usageHistory: [newLog, ...pkg.usageHistory],
      status: totalRemaining === 0 ? 'esgotado' : 'ativo',
      updatedAt: new Date().toISOString(),
    };

    const next = clientPackages.map((p, idx) => idx === pkgIdx ? updatedPkg : p);
    setClientPackages(next);
    storageService.saveClientPackages(next);

    return { success: true };
  };

  // PRODUCT CONSUMPTION TRACKING (GRAMATURA)
  const addConsumption = (consumptionData: Omit<ProductConsumption, 'id' | 'createdAt'>) => {
    if (!consumptionData.productId) return { success: false, error: 'Selecione o produto.' };
    if (consumptionData.quantity <= 0) return { success: false, error: 'Informe a quantidade consumida.' };

    const item = inventory.find(i => i.id === consumptionData.productId);
    if (!item) return { success: false, error: 'Produto não encontrado no estoque.' };

    let stockToDeduct = consumptionData.quantity;
    
    // Automatic conversion
    if (item.unit.toLowerCase().includes('kg') && consumptionData.unit.toLowerCase() === 'g') {
      stockToDeduct = consumptionData.quantity / 1000;
    } else if (item.unit.toLowerCase().includes('litro') && consumptionData.unit.toLowerCase() === 'ml') {
      stockToDeduct = consumptionData.quantity / 1000;
    } else {
      const match = item.name.match(/(\d+(?:\.\d+)?)\s*(?:g|ml)/i);
      if (match && ['tubo', 'frasco', 'pote', 'un'].includes(item.unit.toLowerCase())) {
        const packageSize = parseFloat(match[1]);
        if (packageSize > 0) {
          stockToDeduct = Math.round((consumptionData.quantity / packageSize) * 100) / 100;
        }
      }
    }

    const newConsumption: ProductConsumption = {
      ...consumptionData,
      id: generateId('con'),
      costPrice: item.costPrice,
      createdAt: new Date().toISOString(),
    };

    const nextConsumptions = [newConsumption, ...consumptions];
    setConsumptions(nextConsumptions);
    storageService.saveConsumptions(nextConsumptions);

    adjustStock(
      item.id,
      stockToDeduct,
      `Consumo: ${consumptionData.clientName} — ${consumptionData.serviceName} (${consumptionData.quantity}${consumptionData.unit})`,
      'saida'
    );

    return { success: true, consumption: newConsumption };
  };

  const deleteConsumption = (id: string) => {
    const con = consumptions.find(c => c.id === id);
    if (!con) return { success: false, error: 'Registro de consumo não encontrado.' };

    const item = inventory.find(i => i.id === con.productId);
    if (item) {
      let stockToRestore = con.quantity;
      if (item.unit.toLowerCase().includes('kg') && con.unit.toLowerCase() === 'g') {
        stockToRestore = con.quantity / 1000;
      } else if (item.unit.toLowerCase().includes('litro') && con.unit.toLowerCase() === 'ml') {
        stockToRestore = con.quantity / 1000;
      } else {
        const match = item.name.match(/(\d+(?:\.\d+)?)\s*(?:g|ml)/i);
        if (match && ['tubo', 'frasco', 'pote', 'un'].includes(item.unit.toLowerCase())) {
          const packageSize = parseFloat(match[1]);
          if (packageSize > 0) stockToRestore = Math.round((con.quantity / packageSize) * 100) / 100;
        }
      }
      adjustStock(item.id, stockToRestore, `Estorno de consumo: ${con.clientName} — ${con.serviceName}`, 'entrada');
    }

    const nextConsumptions = consumptions.filter(c => c.id !== id);
    setConsumptions(nextConsumptions);
    storageService.saveConsumptions(nextConsumptions);
    return { success: true };
  };

  const getConsumptionsByAttendance = (attendanceId: string): ProductConsumption[] => {
    return consumptions.filter(c => c.attendanceId === attendanceId);
  };

  // FINANCIAL
  const addExpense = (expenseData: Omit<Expense, 'id' | 'createdAt'>) => {
    if (!expenseData.description.trim()) {
      return { success: false, error: 'A descrição da despesa é obrigatória.' };
    }
    if (expenseData.amount <= 0 || isNaN(expenseData.amount)) {
      return { success: false, error: 'Informe um valor válido para a despesa.' };
    }

    const newExpense: Expense = {
      ...expenseData,
      id: generateId('exp'),
      createdAt: new Date().toISOString(),
    };

    const nextExpenses = [newExpense, ...expenses];
    setExpenses(nextExpenses);
    storageService.saveExpenses(nextExpenses);
    return { success: true, expense: newExpense };
  };

  const updateExpense = (id: string, expenseData: Partial<Expense>) => {
    const nextExpenses = expenses.map(e => (e.id === id ? { ...e, ...expenseData } : e));
    setExpenses(nextExpenses);
    storageService.saveExpenses(nextExpenses);
    return { success: true };
  };

  const deleteExpense = (id: string) => {
    const nextExpenses = expenses.filter(e => e.id !== id);
    setExpenses(nextExpenses);
    storageService.saveExpenses(nextExpenses);
    storageService.deleteFromCloud('expenses', id);
  };

  const addPayment = (paymentData: Omit<PaymentTransaction, 'id' | 'createdAt' | 'type'>) => {
    const newPayment: PaymentTransaction = {
      ...paymentData,
      id: generateId('pay'),
      type: 'receita',
      createdAt: new Date().toISOString(),
    };

    const nextPayments = [newPayment, ...payments];
    setPayments(nextPayments);
    storageService.savePayments(nextPayments);

    const recalculated = recalculateClientStats(nextPayments, clients);
    setClients(recalculated);
    storageService.saveClients(recalculated);

    return { success: true, payment: newPayment };
  };

  const updateSettings = (newSettings: CompanySettings) => {
    setSettings(newSettings);
    storageService.saveSettings(newSettings);
  };

  // INVENTORY MANAGEMENT
  const addInventoryItem = (itemData: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const now = new Date().toISOString();
      const newItem: InventoryItem = {
        ...itemData,
        id: generateId('inv'),
        createdAt: now,
        updatedAt: now,
      };
      const nextInventory = [newItem, ...inventory];
      setInventory(nextInventory);
      storageService.saveInventory(nextInventory);
      return { success: true, item: newItem };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Erro ao adicionar item ao estoque' };
    }
  };

  const updateInventoryItem = (id: string, itemData: Partial<InventoryItem>) => {
    try {
      const now = new Date().toISOString();
      const nextInventory = inventory.map(item =>
        item.id === id ? { ...item, ...itemData, updatedAt: now } : item
      );
      setInventory(nextInventory);
      storageService.saveInventory(nextInventory);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Erro ao atualizar produto do estoque' };
    }
  };

  const deleteInventoryItem = (id: string) => {
    try {
      const nextInventory = inventory.filter(item => item.id !== id);
      setInventory(nextInventory);
      storageService.saveInventory(nextInventory);
      storageService.deleteFromCloud('inventory', id);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Erro ao remover produto do estoque' };
    }
  };

  const adjustStock = (id: string, quantityChange: number, reason?: string, type: 'entrada' | 'saida' | 'ajuste' = 'ajuste') => {
    try {
      const now = new Date().toISOString();
      const target = inventory.find(i => i.id === id);
      if (!target) {
        return { success: false, error: 'Item não localizado no estoque' };
      }

      let newStock = target.currentStock;
      if (type === 'ajuste') {
        newStock = Math.max(0, quantityChange);
      } else if (type === 'entrada') {
        newStock = Math.max(0, target.currentStock + Math.abs(quantityChange));
      } else if (type === 'saida') {
        newStock = Math.max(0, target.currentStock - Math.abs(quantityChange));
      }

      const nextInventory = inventory.map(item => {
        if (item.id === id) {
          return {
            ...item,
            currentStock: newStock,
            lastRestockedAt: (type === 'entrada' || (type === 'ajuste' && newStock > item.currentStock)) ? now : item.lastRestockedAt,
            updatedAt: now,
          };
        }
        return item;
      });

      setInventory(nextInventory);
      storageService.saveInventory(nextInventory);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Erro ao movimentar estoque' };
    }
  };

  const lowStockCount = useMemo(() => {
    return inventory.filter(item => item.currentStock <= item.minStock && item.currentStock > 0).length;
  }, [inventory]);

  const outOfStockCount = useMemo(() => {
    return inventory.filter(item => item.currentStock <= 0).length;
  }, [inventory]);

  const totalInventoryValue = useMemo(() => {
    return inventory.reduce((acc, item) => acc + (item.currentStock * (item.costPrice || 0)), 0);
  }, [inventory]);

  const clearAllData = useCallback(() => {
    storageService.clearAllData();
    loadAllData();
  }, [loadAllData]);

  // METRICS & INDICATORS
  const financialSummary = useMemo(() => {
    let grossRevenue = 0;
    let discountsGiven = 0;
    let netRevenue = 0;
    let receivedAmount = 0;
    let pendingAmount = 0;
    let totalCommissionsPaid = 0;

    payments.forEach(p => {
      grossRevenue += p.grossValue;
      discountsGiven += p.discount;
      netRevenue += p.netValue;
      receivedAmount += p.paidAmount;
      pendingAmount += p.pendingAmount;
      if (p.status === 'pago') {
        totalCommissionsPaid += p.commissionAmount || 0;
      }
    });

    let paidExpenses = 0;
    let pendingExpenses = 0;

    expenses.forEach(e => {
      if (e.status === 'pago') {
        paidExpenses += e.amount;
      } else {
        pendingExpenses += e.amount;
      }
    });

    const periodNetResult = receivedAmount - paidExpenses;

    const paidTransactionsCount = payments.filter(p => p.status === 'pago' && p.paidAmount > 0).length;
    const averageTicket = paidTransactionsCount > 0 ? receivedAmount / paidTransactionsCount : 0;

    return {
      grossRevenue,
      discountsGiven,
      netRevenue,
      receivedAmount,
      pendingAmount,
      paidExpenses,
      pendingExpenses,
      periodNetResult,
      averageTicket,
      totalCommissionsPaid,
    };
  }, [payments, expenses]);

  const dashboardMetrics = useMemo(() => {
    const today = getTodayDate();
    const currentMonth = today.substring(0, 7); // YYYY-MM

    const todayAppointments = appointments.filter(a => a.date === today);
    const todayAppointmentsCount = todayAppointments.filter(a => !['cancelado', 'nao_compareceu'].includes(a.status)).length;
    
    const todayCompletedCount = todayAppointments.filter(a => a.status === 'concluido').length;
    const totalActiveClients = clients.filter(c => !c.isArchived).length;

    // Today's financials
    const todayPayments = payments.filter(p => p.date === today);
    const todayGrossRevenue = todayPayments.reduce((acc, p) => acc + p.grossValue, 0);
    const todayReceivedRevenue = todayPayments.reduce((acc, p) => acc + p.paidAmount, 0);
    const todayCommissionsToPay = todayPayments
      .filter(p => p.status === 'pago' || (p.status === 'parcial' && p.paidAmount > 0))
      .reduce((acc, p) => acc + (p.commissionAmount || 0), 0);
    const todaySalonNet = Math.max(0, todayReceivedRevenue - todayCommissionsToPay);

    // Month's financials
    const monthPayments = payments.filter(p => p.date.startsWith(currentMonth));
    const monthGrossRevenue = monthPayments.reduce((acc, p) => acc + p.grossValue, 0);
    const monthReceivedRevenue = monthPayments.reduce((acc, p) => acc + p.paidAmount, 0);

    const monthExpenses = expenses.filter(e => e.competenceDate.startsWith(currentMonth) || e.dueDate.startsWith(currentMonth));
    const monthPaidExpenses = monthExpenses.filter(e => e.status === 'pago').reduce((acc, e) => acc + e.amount, 0);
    
    const monthNetResult = monthReceivedRevenue - monthPaidExpenses;

    // Average ticket
    const paidMonthCount = monthPayments.filter(p => p.status === 'pago' && p.paidAmount > 0).length;
    const averageTicket = paidMonthCount > 0 ? monthReceivedRevenue / paidMonthCount : 0;

    // Salon Occupancy Rate
    const activeProfCount = Math.max(1, professionals.filter(p => p.isActive).length);
    const totalDailyCapacityMinutes = activeProfCount * 10 * 60;
    const todayScheduledMinutes = todayAppointments
      .filter(a => !['cancelado', 'nao_compareceu'].includes(a.status))
      .reduce((acc, a) => acc + a.durationMinutes, 0);
    const occupancyRatePercentage = Math.min(100, Math.round((todayScheduledMinutes / totalDailyCapacityMinutes) * 100));

    // Upcoming appointments for today
    const upcomingTodayAppointments = todayAppointments
      .filter(a => !['cancelado', 'nao_compareceu'].includes(a.status))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    return {
      todayAppointmentsCount,
      todayCompletedCount,
      totalActiveClients,
      todayGrossRevenue,
      todayReceivedRevenue,
      todayCommissionsToPay,
      todaySalonNet,
      monthGrossRevenue,
      monthReceivedRevenue,
      monthPaidExpenses,
      monthNetResult,
      averageTicket,
      occupancyRatePercentage,
      upcomingTodayAppointments,
    };
  }, [appointments, clients, payments, expenses, professionals]);

  return (
    <DataContext.Provider
      value={{
        clients,
        services,
        professionals,
        appointments,
        attendances,
        payments,
        expenses,
        inventory,
        consumptions,
        comandas,
        clientPackages,
        scheduleBlocks,
        lowStockCount,
        outOfStockCount,
        totalInventoryValue,
        settings,
        addClient,
        updateClient,
        archiveClient,
        checkDuplicateClient,
        addService,
        updateService,
        toggleServiceActive,
        addProfessional,
        updateProfessional,
        deleteProfessional,
        getProfessionalMetrics,
        checkConflict,
        checkMultiConflict,
        addAppointment,
        addMultiServiceAppointment,
        updateAppointment,
        updateAppointmentStatus,
        cancelAppointment,
        deleteAppointment,
        cleanupDeborahAttendances,
        clearExampleInventory,
        addScheduleBlock,
        deleteScheduleBlock,
        startAttendance,
        revertAttendance,
        finishAttendance,
        getComandaByClientAndDate,
        finishUnifiedComanda,
        getClientActivePackages,
        addClientPackage,
        deductPackageSession,
        addConsumption,
        deleteConsumption,
        getConsumptionsByAttendance,
        addExpense,
        updateExpense,
        deleteExpense,
        addPayment,
        addInventoryItem,
        updateInventoryItem,
        deleteInventoryItem,
        adjustStock,
        updateSettings,
        refreshData: loadAllData,
        clearAllData,
        financialSummary,
        dashboardMetrics,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
