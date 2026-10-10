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
  PaymentMethod
} from '../types';
import { storageService, getTodayDate } from '../services/storage';
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

interface DataContextType {
  clients: Client[];
  services: Service[];
  professionals: Professional[];
  appointments: Appointment[];
  attendances: Attendance[];
  payments: PaymentTransaction[];
  expenses: Expense[];
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

  // Settings & Utilities
  updateSettings: (newSettings: CompanySettings) => void;
  refreshData: () => void;

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
  const [settings, setSettings] = useState<CompanySettings>(storageService.getSettings());

  const loadAllData = useCallback(() => {
    setClients(storageService.getClients());
    setServices(storageService.getServices());
    setProfessionals(storageService.getProfessionals());
    setAppointments(storageService.getAppointments());
    setAttendances(storageService.getAttendances());
    setPayments(storageService.getPayments());
    setExpenses(storageService.getExpenses());
    setSettings(storageService.getSettings());
  }, []);

  useEffect(() => {
    loadAllData();
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

  // APPOINTMENT CONFLICT CHECKING
  const checkConflict = (
    date: string, 
    startTime: string, 
    endTime: string, 
    professionalId: string, 
    excludeAppointmentId?: string
  ): ConflictResult => {
    // Only check against active appointments (agendado, confirmado, em_atendimento)
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
    // Validation
    if (!appointmentData.clientId) return { success: false, error: 'Selecione uma cliente.' };
    if (!appointmentData.serviceId) return { success: false, error: 'Selecione um serviço.' };
    if (!appointmentData.date) return { success: false, error: 'Selecione a data.' };
    if (!appointmentData.startTime) return { success: false, error: 'Informe o horário inicial.' };

    const calculatedEndTime = appointmentData.endTime || addMinutesToTime(appointmentData.startTime, appointmentData.durationMinutes);

    // Conflict Check (unless explicitly marked as encaixe)
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

    // Update client last visit / upcoming record
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

    // Update Attendance
    const updatedAttendance: Attendance = {
      ...atd,
      finishedAt: finishedTime,
      grossValue: options.grossValue,
      discountValue: options.discountValue,
      discountType: options.discountType,
      netValue: options.netValue,
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
    
    // Check if there is already a payment record for this attendance
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
        description: `Atendimento Concluído — ${atd.serviceName}`,
        grossValue: options.grossValue,
        discount: options.discountValue,
        netValue: options.netValue,
        paidAmount: options.paidAmount,
        pendingAmount,
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

  // METRICS & INDICATORS
  const financialSummary = useMemo(() => {
    let grossRevenue = 0;
    let discountsGiven = 0;
    let netRevenue = 0;
    let receivedAmount = 0;
    let pendingAmount = 0;

    payments.forEach(p => {
      grossRevenue += p.grossValue;
      discountsGiven += p.discount;
      netRevenue += p.netValue;
      receivedAmount += p.paidAmount;
      pendingAmount += p.pendingAmount;
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
    // Standard working hours per day: 10 hours * 60 = 600 min per professional
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
        settings,
        addClient,
        updateClient,
        archiveClient,
        checkDuplicateClient,
        addService,
        updateService,
        toggleServiceActive,
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
        updateSettings,
        refreshData: loadAllData,
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
