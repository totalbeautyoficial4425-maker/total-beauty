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
  InventoryItem
} from '../types';
import { storageService, getTodayDate, hashPassword } from '../services/storage';
import { getFirebaseInstance, subscribeToCollection } from '../services/firebase';
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
  monthCommissions: number;
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
  addAppointment: (appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>) => { success: boolean; appointment?: Appointment; error?: string };
  updateAppointment: (id: string, appointmentData: Partial<Appointment>) => { success: boolean; error?: string };
  updateAppointmentStatus: (id: string, status: AppointmentStatus, cancellationReason?: string) => { success: boolean; error?: string };
  cancelAppointment: (id: string, reason: string) => { success: boolean; error?: string };

  // Attendances & Execution
  startAttendance: (appointmentId?: string, clientId?: string, serviceId?: string, professionalId?: string) => { success: boolean; attendance?: Attendance; error?: string };
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
  const [settings, setSettings] = useState<CompanySettings>(storageService.getSettings());

  const loadAllData = useCallback(() => {
    setClients(storageService.getClients());
    setServices(storageService.getServices());
    setProfessionals(storageService.getProfessionals());
    setAppointments(storageService.getAppointments());
    setAttendances(storageService.getAttendances());
    setPayments(storageService.getPayments());
    setExpenses(storageService.getExpenses());
    setInventory(storageService.getInventory());
    setSettings(storageService.getSettings());
  }, []);

  useEffect(() => {
    loadAllData();

    // 1. Hydrate from High-Capacity IndexedDB if needed
    storageService.hydrateFromIndexedDB().then((restored) => {
      if (restored) {
        loadAllData();
      }
    });

    // 2. If Firebase Cloud Firestore is connected, pull latest data & subscribe to real-time updates
    const { isConnected } = getFirebaseInstance();
    if (!isConnected) return;

    storageService.pullAllFromFirestore().then((res) => {
      if (res.success) {
        loadAllData();
      }
    });

    const unsubscribers: Array<(() => void) | null> = [
      subscribeToCollection<Client>('clients', (items) => {
        if (items.length > 0) setClients(items);
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
    ];

    return () => {
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

    // Today's paid commissions
    const todayPaid = myTransactions.filter(p => p.date === today && p.status === 'pago');
    const todayCommissions = todayPaid.reduce((acc, p) => acc + (p.commissionAmount || 0), 0);

    // Month's paid commissions
    const monthPaid = myTransactions.filter(p => p.date.startsWith(currentMonth) && p.status === 'pago');
    const monthCommissions = monthPaid.reduce((acc, p) => acc + (p.commissionAmount || 0), 0);

    // Pending commissions (attendances concluded but client hasn't fully paid)
    const pendingTransactions = myTransactions.filter(p => p.status !== 'pago');
    const pendingCommissions = pendingTransactions.reduce((acc, p) => {
      const commPercent = p.commissionPercentage || 50;
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
      monthCommissions,
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
    const nextAppointments = appointments.map(a => {
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
    setAppointments(nextAppointments);
    storageService.saveAppointments(nextAppointments);
    return { success: true };
  };

  const cancelAppointment = (id: string, reason: string) => {
    return updateAppointmentStatus(id, 'cancelado', reason);
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

    // Calculate commission directly from the service
    const srv = services.find(s => s.id === atd.serviceId);
    const commPercent = srv?.commissionPercentage ?? 50;
    
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
        addAppointment,
        updateAppointment,
        updateAppointmentStatus,
        cancelAppointment,
        startAttendance,
        finishAttendance,
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
