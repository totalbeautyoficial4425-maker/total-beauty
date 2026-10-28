import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  User, 
  Sparkles, 
  DollarSign, 
  AlertCircle, 
  Plus, 
  Scissors, 
  AlertTriangle,
  Trash2,
  Layers,
  ArrowRight,
  Cake,
  Search,
  Check,
  Phone
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Appointment } from '../../types';
import { addMinutesToTime, formatBRL, isClientBirthdayToday } from '../../utils/formatters';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentToEdit?: Appointment | null;
  initialDate?: string;
  initialTime?: string;
  initialClientId?: string;
  initialProfessionalId?: string;
}

interface SelectedServiceEntry {
  id: string; // local temporary key
  serviceId: string;
  professionalId: string;
  durationMinutes: number;
  price: number;
  notes?: string;
}

export const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  appointmentToEdit,
  initialDate,
  initialTime,
  initialClientId,
  initialProfessionalId,
}) => {
  const { currentUser } = useAuth();
  const { 
    clients, 
    services, 
    professionals, 
    addAppointment, 
    addMultiServiceAppointment,
    updateAppointment, 
    deleteAppointment,
    checkConflict, 
    checkMultiConflict,
    addClient 
  } = useData();

  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Active professionals only (excluding inactive ones like Thálita)
  const activeProfessionals = useMemo(() => {
    return professionals.filter(p => p.isActive);
  }, [professionals]);

  // Form State
  const [clientId, setClientId] = useState('');
  const [isChangingClient, setIsChangingClient] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [executionMode, setExecutionMode] = useState<'sequencial' | 'simultaneo'>('sequencial');
  const [serviceEntries, setServiceEntries] = useState<SelectedServiceEntry[]>([]);
  const [serviceFilter, setServiceFilter] = useState<{ [id: string]: string }>({});
  const [generalNotes, setGeneralNotes] = useState('');
  
  // Fit-in / Encaixe forçado
  const [isFitIn, setIsFitIn] = useState(false);
  const [fitInReason, setFitInReason] = useState('');

  // Quick Client Inline Creation State
  const [isCreatingNewClient, setIsCreatingNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientBirthDate, setNewClientBirthDate] = useState('');
  const [quickClientError, setQuickClientError] = useState<string | null>(null);

  // Validation & Conflict
  const [conflictWarnings, setConflictWarnings] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // Active client object
  const selectedClient = useMemo(() => {
    return clients.find(c => c.id === clientId);
  }, [clients, clientId]);

  // Filtered clients for search list
  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    const active = clients.filter(c => !c.isArchived);
    if (!q) return active;
    return active.filter(c => 
      c.name.toLowerCase().includes(q) || 
      (c.phone && c.phone.includes(q))
    );
  }, [clients, clientSearch]);

  // Session guard to prevent background sync from wiping user's open form selections
  const lastOpenedKeyRef = useRef<string | null>(null);

  // Initialize or reset form only on modal open or target change
  useEffect(() => {
    if (!isOpen) {
      lastOpenedKeyRef.current = null;
      return;
    }

    const currentKey = `${appointmentToEdit?.id || 'new'}_${initialDate || ''}_${initialTime || ''}_${initialClientId || ''}_${initialProfessionalId || ''}`;
    if (lastOpenedKeyRef.current === currentKey) {
      // Form already open and parameters unchanged: do not reset user selections on background sync!
      return;
    }
    lastOpenedKeyRef.current = currentKey;

    if (appointmentToEdit) {
      // Edit mode (single appointment)
      setClientId(appointmentToEdit.clientId);
      setIsChangingClient(false);
      setDate(appointmentToEdit.date);
      setStartTime(appointmentToEdit.startTime);
      setGeneralNotes(appointmentToEdit.notes || '');
      setIsFitIn(appointmentToEdit.isFitIn || false);
      setFitInReason(appointmentToEdit.fitInReason || '');
      setExecutionMode(appointmentToEdit.executionMode || 'sequencial');

      setServiceEntries([
        {
          id: 'entry_edit',
          serviceId: appointmentToEdit.serviceId,
          professionalId: appointmentToEdit.professionalId,
          durationMinutes: appointmentToEdit.durationMinutes,
          price: appointmentToEdit.price,
          notes: appointmentToEdit.notes,
        }
      ]);
    } else {
      // Create mode
      const todayStr = new Date().toISOString().split('T')[0];
      setDate(initialDate || todayStr);
      setStartTime(initialTime || '09:00');
      setClientId(initialClientId || '');
      setIsChangingClient(!initialClientId);
      setExecutionMode('sequencial');
      setGeneralNotes('');
      setIsFitIn(false);
      setFitInReason('');

      const defaultService = services.find(s => s.isActive) || services[0];
      
      let defaultProf = activeProfessionals.find(p => p.id === initialProfessionalId);
      if (!defaultProf) {
        defaultProf = activeProfessionals.find(p => 
          p.id === currentUser?.professionalId || 
          p.userId === currentUser?.id || 
          p.username === currentUser?.username
        ) || activeProfessionals[0];
      }

      setServiceEntries([
        {
          id: 'entry_1',
          serviceId: defaultService?.id || '',
          professionalId: defaultProf?.id || '',
          durationMinutes: defaultService?.durationMinutes || 30,
          price: defaultService?.price || 0,
        }
      ]);
    }

    setIsCreatingNewClient(false);
    setClientSearch('');
    setServiceFilter({});
    setQuickClientError(null);
    setConflictWarnings([]);
    setFormError(null);
  }, [isOpen, appointmentToEdit, initialDate, initialTime, initialClientId, initialProfessionalId, services, activeProfessionals, currentUser]);

  // Add another service row
  const handleAddServiceRow = () => {
    const defaultService = services.find(s => s.isActive) || services[0];
    const defaultProf = activeProfessionals[0];

    setServiceEntries(prev => [
      ...prev,
      {
        id: `entry_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        serviceId: defaultService?.id || '',
        professionalId: defaultProf?.id || '',
        durationMinutes: defaultService?.durationMinutes || 30,
        price: defaultService?.price || 0,
      }
    ]);
  };

  // Remove a service row
  const handleRemoveServiceRow = (id: string) => {
    if (serviceEntries.length <= 1) return;
    setServiceEntries(prev => prev.filter(entry => entry.id !== id));
  };

  // Update a service row
  const handleUpdateServiceEntry = (id: string, field: keyof SelectedServiceEntry, value: any) => {
    setServiceEntries(prev => prev.map(entry => {
      if (entry.id !== id) return entry;

      if (field === 'serviceId') {
        const srv = services.find(s => s.id === value);
        return {
          ...entry,
          serviceId: value,
          durationMinutes: srv?.durationMinutes || entry.durationMinutes,
          price: srv?.price ?? entry.price,
        };
      }

      return {
        ...entry,
        [field]: value
      };
    }));
  };

  // Calculate schedule and totals
  const { totalDuration, totalPrice, scheduledServicesWithTimes } = useMemo(() => {
    let currentStart = startTime;
    let sumDuration = 0;
    let maxDuration = 0;
    let sumPrice = 0;

    const list = serviceEntries.map(entry => {
      const srv = services.find(s => s.id === entry.serviceId);
      const prof = activeProfessionals.find(p => p.id === entry.professionalId);
      const dur = entry.durationMinutes || srv?.durationMinutes || 30;
      const prc = entry.price ?? (srv?.price || 0);

      sumPrice += prc;
      sumDuration += dur;
      maxDuration = Math.max(maxDuration, dur);

      let sStart = startTime;
      let sEnd = '';
      if (executionMode === 'sequencial') {
        sStart = currentStart;
        sEnd = addMinutesToTime(sStart, dur);
        currentStart = sEnd;
      } else {
        sStart = startTime;
        sEnd = addMinutesToTime(startTime, dur);
      }

      return {
        ...entry,
        serviceObj: srv,
        profObj: prof,
        calculatedStart: sStart,
        calculatedEnd: sEnd,
      };
    });

    const finalDuration = executionMode === 'sequencial' ? sumDuration : maxDuration;

    return {
      totalDuration: finalDuration,
      totalPrice: sumPrice,
      scheduledServicesWithTimes: list,
    };
  }, [serviceEntries, startTime, executionMode, services, activeProfessionals]);

  // Real-time Conflict Checking
  useEffect(() => {
    if (date && startTime && serviceEntries.length > 0 && !isFitIn) {
      if (appointmentToEdit) {
        // Single edit check
        const entry = serviceEntries[0];
        if (entry && entry.professionalId) {
          const calcEnd = addMinutesToTime(startTime, entry.durationMinutes);
          const c = checkConflict(date, startTime, calcEnd, entry.professionalId, appointmentToEdit.id);
          if (c.hasConflict && c.message) {
            setConflictWarnings([c.message]);
          } else {
            setConflictWarnings([]);
          }
        }
      } else {
        // Multi-service conflict check
        const multi = checkMultiConflict(date, startTime, executionMode, serviceEntries);
        if (multi.hasConflict) {
          setConflictWarnings(multi.conflicts);
        } else {
          setConflictWarnings([]);
        }
      }
    } else {
      setConflictWarnings([]);
    }
  }, [date, startTime, executionMode, serviceEntries, isFitIn, checkConflict, checkMultiConflict, appointmentToEdit]);

  // Inline Quick Client creation
  const handleSaveQuickClient = (e: React.MouseEvent) => {
    e.preventDefault();
    setQuickClientError(null);
    if (!newClientName.trim() || !newClientPhone.trim()) {
      setQuickClientError('Nome e telefone com DDD são obrigatórios.');
      return;
    }

    const res = addClient({
      name: newClientName.trim(),
      phone: newClientPhone.trim(),
      whatsapp: newClientPhone.trim(),
      birthDate: newClientBirthDate || undefined,
      communicationConsent: true,
    });

    if (!res.success || !res.client) {
      setQuickClientError(res.error || 'Erro ao cadastrar cliente.');
    } else {
      setClientId(res.client.id);
      setIsChangingClient(false);
      setIsCreatingNewClient(false);
      setNewClientName('');
      setNewClientPhone('');
      setNewClientBirthDate('');
    }
  };

  // Submit appointment
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const client = clients.find(c => c.id === clientId);
    if (!client) {
      setFormError('Por favor, selecione uma cliente.');
      return;
    }

    if (serviceEntries.length === 0) {
      setFormError('Adicione pelo menos um serviço ao agendamento.');
      return;
    }

    // Verify each entry has service and professional
    for (let i = 0; i < serviceEntries.length; i++) {
      const entry = serviceEntries[i];
      if (!entry.serviceId) {
        setFormError(`Selecione o serviço na linha #${i + 1}.`);
        return;
      }
      if (!entry.professionalId) {
        setFormError(`Selecione a profissional na linha #${i + 1}.`);
        return;
      }
    }

    // If there is conflict and not fit-in, block
    if (conflictWarnings.length > 0 && !isFitIn) {
      setFormError('Existem conflitos de horário. Marque "Forçar Agendamento / Encaixe" para prosseguir excepcionalmente.');
      return;
    }

    if (appointmentToEdit) {
      // Update single
      const entry = serviceEntries[0];
      const srv = services.find(s => s.id === entry.serviceId);
      const prof = activeProfessionals.find(p => p.id === entry.professionalId);
      const calcEnd = addMinutesToTime(startTime, entry.durationMinutes);

      const res = updateAppointment(appointmentToEdit.id, {
        clientId: client.id,
        clientName: client.name,
        clientPhone: client.phone,
        serviceId: entry.serviceId,
        serviceName: srv?.name || appointmentToEdit.serviceName,
        professionalId: entry.professionalId,
        professionalName: prof?.name || appointmentToEdit.professionalName,
        date,
        startTime,
        endTime: calcEnd,
        durationMinutes: entry.durationMinutes,
        price: entry.price,
        notes: generalNotes,
        isFitIn,
        fitInReason,
        fitInAuthorizedBy: isFitIn ? (currentUser?.name || 'Administração') : undefined,
      });

      if (!res.success) {
        setFormError(res.error || 'Erro ao atualizar o agendamento.');
        return;
      }
    } else {
      // Add multi-service appointment
      const res = addMultiServiceAppointment({
        clientId: client.id,
        date,
        startTime,
        executionMode,
        services: serviceEntries.map(entry => ({
          serviceId: entry.serviceId,
          professionalId: entry.professionalId,
          durationMinutes: entry.durationMinutes,
          price: entry.price,
          notes: entry.notes,
        })),
        isFitIn,
        fitInReason,
        notes: generalNotes,
      });

      if (!res.success) {
        setFormError(res.error || 'Erro ao criar o agendamento.');
        return;
      }
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-tb-brown-dark/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-tb-white rounded-3xl shadow-premium border border-tb-rose-light/50 w-full max-w-2xl overflow-hidden flex flex-col max-h-[96vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-tb-ivory border-b border-tb-rose-light/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-tb-rose-blush text-tb-rose-primary flex items-center justify-center shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif-brand text-xl font-bold text-tb-brown-dark">
                {appointmentToEdit ? 'Editar Agendamento' : 'Agendamento Inteligente com Múltiplos Serviços'}
              </h3>
              <p className="text-xs text-tb-gray-neutral">
                {appointmentToEdit ? 'Atualize as informações do atendimento' : 'Adicione vários serviços para a mesma cliente de uma única vez'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-tb-gray-neutral hover:text-tb-brown-dark rounded-lg hover:bg-tb-beige-light transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* Conflict Warnings Banner */}
          {conflictWarnings.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-900 space-y-2.5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Aviso de Conflito de Horário!</span>
                  <ul className="list-disc pl-4 space-y-0.5 mt-1 text-[11px]">
                    {conflictWarnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Force / Fit-In Checkbox */}
              <div className="pt-2 border-t border-amber-200 flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFitIn}
                    onChange={e => setIsFitIn(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                  />
                  <span className="text-amber-900 font-bold">
                    Forçar agendamento / Realizar Encaixe Excepcional (permitir sobreposição)
                  </span>
                </label>

                {isFitIn && (
                  <input
                    type="text"
                    placeholder="Motivo do encaixe excepcional (ex: urgência, cliente especial, retorno...)"
                    value={fitInReason}
                    onChange={e => setFitInReason(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 rounded-xl border border-amber-300 bg-white text-amber-950 placeholder:text-amber-700/60"
                  />
                )}
              </div>
            </div>
          )}

          {/* Client Selection & Quick Creation */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-tb-brown-dark flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-tb-rose-primary" />
                Cliente Total Beauty *
              </label>
              <button
                type="button"
                onClick={() => setIsCreatingNewClient(!isCreatingNewClient)}
                className="text-xs text-tb-rose-primary hover:text-tb-brown-dark font-medium flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                {isCreatingNewClient ? 'Voltar para lista' : 'Cadastrar Nova Cliente'}
              </button>
            </div>

            {isCreatingNewClient ? (
              <div className="p-3.5 bg-tb-ivory rounded-2xl border border-tb-rose-light space-y-3">
                <span className="text-xs font-semibold text-tb-brown-dark block">
                  Cadastrar Cliente Sem Sair do Agendamento:
                </span>
                {quickClientError && (
                  <p className="text-xs text-rose-600 font-medium">{quickClientError}</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-tb-brown-dark block mb-1">
                      Nome completo *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Maria Silva"
                      value={newClientName}
                      onChange={e => setNewClientName(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-white text-tb-brown-dark focus:ring-2 focus:ring-tb-rose-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-tb-brown-dark block mb-1">
                      Celular com DDD *
                    </label>
                    <input
                      type="text"
                      placeholder="(34) 99999-9999"
                      value={newClientPhone}
                      onChange={e => setNewClientPhone(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-white text-tb-brown-dark focus:ring-2 focus:ring-tb-rose-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-tb-brown-dark block mb-1 flex items-center gap-1">
                      <Cake className="w-3.5 h-3.5 text-tb-rose-primary" />
                      Data de Aniversário
                    </label>
                    <input
                      type="date"
                      value={newClientBirthDate}
                      onChange={e => setNewClientBirthDate(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-white text-tb-brown-dark focus:ring-2 focus:ring-tb-rose-primary/30"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingNewClient(false);
                      setNewClientBirthDate('');
                    }}
                    className="px-3 py-1.5 text-xs text-tb-gray-neutral hover:text-tb-brown-dark"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveQuickClient}
                    className="px-4 py-1.5 bg-tb-rose-primary text-white text-xs font-semibold rounded-xl"
                  >
                    Salvar e Selecionar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Confirmed Client Card */}
                {selectedClient && !isChangingClient ? (
                  <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <Check className="w-4 h-4 font-bold" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-tb-brown-dark flex items-center gap-1.5 flex-wrap">
                          <span className="truncate">{selectedClient.name}</span>
                          {isClientBirthdayToday(selectedClient.birthDate) && (
                            <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1 shrink-0">
                              <Cake className="w-2.5 h-2.5" /> Aniversário Hoje!
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-tb-gray-neutral flex items-center gap-2 mt-0.5">
                          {selectedClient.phone ? (
                            <span className="flex items-center gap-1 font-medium">
                              <Phone className="w-3 h-3 text-tb-rose-primary shrink-0" /> {selectedClient.phone}
                            </span>
                          ) : (
                            <span>Sem telefone cadastrado</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsChangingClient(true);
                        setClientSearch('');
                      }}
                      className="text-xs font-semibold text-tb-rose-primary hover:text-tb-rose-dark px-3 py-1.5 rounded-xl border border-tb-rose-light hover:bg-tb-white transition-colors shrink-0"
                    >
                      Trocar Cliente
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Search Input */}
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-tb-gray-neutral pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Pesquisar cliente por nome ou celular (ex: Maria, 34 9999)..."
                        value={clientSearch}
                        onChange={e => setClientSearch(e.target.value)}
                        className="w-full text-xs pl-9 pr-8 py-2.5 rounded-xl border border-tb-rose-light bg-tb-white text-tb-brown-dark font-medium focus:ring-2 focus:ring-tb-rose-primary/20"
                        autoFocus={isChangingClient}
                      />
                      {clientSearch && (
                        <button
                          type="button"
                          onClick={() => setClientSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-tb-gray-neutral hover:text-tb-brown-dark"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Filtered Clients List */}
                    <div className="max-h-48 overflow-y-auto rounded-xl border border-tb-rose-light/60 bg-tb-white divide-y divide-tb-rose-light/30 shadow-xs">
                      {filteredClients.length === 0 ? (
                        <div className="p-3 text-xs text-center text-tb-gray-neutral">
                          Nenhuma cliente encontrada com "{clientSearch}". Use o botão "Nova Cliente Rápida" acima para cadastrar.
                        </div>
                      ) : (
                        filteredClients.slice(0, 35).map(c => {
                          const isCurrent = c.id === clientId;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setClientId(c.id);
                                setIsChangingClient(false);
                                setClientSearch('');
                              }}
                              className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between hover:bg-tb-ivory transition-colors ${
                                isCurrent ? 'bg-emerald-50/70 font-semibold' : ''
                              }`}
                            >
                              <div className="min-w-0 pr-2">
                                <div className="text-xs font-bold text-tb-brown-dark flex items-center gap-1.5">
                                  <span className="truncate">{c.name}</span>
                                  {isClientBirthdayToday(c.birthDate) && (
                                    <span className="text-[9px] bg-rose-100 text-rose-700 px-1 py-0.2 rounded-full font-bold shrink-0">
                                      🎂 Aniversário
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-tb-gray-neutral">{c.phone || 'Sem celular'}</div>
                              </div>
                              {isCurrent ? (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                                  <Check className="w-3 h-3" /> Selecionada
                                </span>
                              ) : (
                                <span className="text-[10px] text-tb-rose-primary hover:underline font-semibold shrink-0">
                                  Selecionar
                                </span>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>

                    {selectedClient && isChangingClient && (
                      <div className="flex justify-between items-center pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsChangingClient(false);
                            setClientSearch('');
                          }}
                          className="text-xs text-tb-gray-neutral hover:text-tb-brown-dark underline"
                        >
                          Cancelar troca e manter {selectedClient.name}
                        </button>
                        <span className="text-[11px] text-tb-gray-neutral">
                          {filteredClients.length} cliente(s) encontrada(s)
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Date & Initial Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
                Data do Atendimento *
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
                Horário de Início *
              </label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                required
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark font-medium"
              />
            </div>
          </div>

          {/* Execution Mode Selector (Sequencial vs Simultâneo) */}
          {!appointmentToEdit && serviceEntries.length > 1 && (
            <div className="p-3.5 bg-tb-ivory rounded-2xl border border-tb-rose-light/80 space-y-2">
              <label className="block text-xs font-bold text-tb-brown-dark">
                Modalidade de Execução dos Serviços:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExecutionMode('sequencial')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    executionMode === 'sequencial'
                      ? 'bg-tb-rose-primary text-white border-tb-rose-primary shadow-sm font-semibold'
                      : 'bg-tb-white text-tb-brown-dark border-tb-rose-light/60 hover:bg-tb-beige-light'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold mb-0.5">
                    <ArrowRight className="w-3.5 h-3.5" />
                    Opção A — Serviços Sequenciais
                  </div>
                  <p className={`text-[10px] leading-relaxed ${executionMode === 'sequencial' ? 'text-white/90' : 'text-tb-gray-neutral'}`}>
                    Um serviço após o outro (duração somada).
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setExecutionMode('simultaneo')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    executionMode === 'simultaneo'
                      ? 'bg-tb-rose-primary text-white border-tb-rose-primary shadow-sm font-semibold'
                      : 'bg-tb-white text-tb-brown-dark border-tb-rose-light/60 hover:bg-tb-beige-light'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold mb-0.5">
                    <Layers className="w-3.5 h-3.5" />
                    Opção B — Serviços Simultâneos
                  </div>
                  <p className={`text-[10px] leading-relaxed ${executionMode === 'simultaneo' ? 'text-white/90' : 'text-tb-gray-neutral'}`}>
                    No mesmo horário com profissionais diferentes.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Multi-Service List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-tb-brown-dark uppercase tracking-wider flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5 text-tb-rose-primary" />
                  Serviços da Sessão ({serviceEntries.length})
                </h4>
                <p className="text-[11px] text-tb-gray-neutral">
                  Escolha os serviços e a profissional responsável por cada um
                </p>
              </div>

              {!appointmentToEdit && (
                <button
                  type="button"
                  onClick={handleAddServiceRow}
                  className="px-3.5 py-1.5 text-xs font-bold bg-tb-ivory hover:bg-tb-beige-light text-tb-rose-primary border border-tb-rose-light rounded-xl flex items-center gap-1.5 transition-all shadow-2xs"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Serviço
                </button>
              )}
            </div>

            <div className="space-y-3">
              {scheduledServicesWithTimes.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-4 bg-tb-ivory rounded-2xl border border-tb-rose-light/70 space-y-3 relative shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-tb-brown-dark flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-tb-rose-blush text-tb-rose-primary flex items-center justify-center text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      Horário Previsto: {item.calculatedStart} às {item.calculatedEnd} ({item.durationMinutes} min)
                    </span>

                    {serviceEntries.length > 1 && !appointmentToEdit && (
                      <button
                        type="button"
                        onClick={() => handleRemoveServiceRow(item.id)}
                        className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Remover serviço"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Service Selector with search filter */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-semibold text-tb-brown-dark">
                          Serviço *
                        </label>
                        {item.serviceId && (
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold border border-emerald-200/80">
                            ✓ Confirmado
                          </span>
                        )}
                      </div>

                      {/* Fast search filter input */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-tb-gray-neutral pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Buscar serviço por nome (ex: corte, escova, unha)..."
                          value={serviceFilter[item.id] || ''}
                          onChange={e => setServiceFilter(prev => ({ ...prev, [item.id]: e.target.value }))}
                          className="w-full text-xs pl-8 pr-7 py-1.5 rounded-xl border border-tb-rose-light/70 bg-tb-white text-tb-brown-dark focus:ring-1 focus:ring-tb-rose-primary"
                        />
                        {(serviceFilter[item.id] || '') && (
                          <button
                            type="button"
                            onClick={() => setServiceFilter(prev => ({ ...prev, [item.id]: '' }))}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-tb-gray-neutral hover:text-tb-brown-dark p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <select
                        value={item.serviceId}
                        onChange={e => handleUpdateServiceEntry(item.id, 'serviceId', e.target.value)}
                        required
                        className="w-full text-xs px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-white text-tb-brown-dark font-medium"
                      >
                        <option value="">Selecione o serviço...</option>
                        {(() => {
                          const filterText = (serviceFilter[item.id] || '').trim().toLowerCase();
                          const activeServices = services.filter(s => s.isActive);
                          const matchingServices = filterText
                            ? activeServices.filter(s => s.name.toLowerCase().includes(filterText) || s.category.toLowerCase().includes(filterText))
                            : activeServices;

                          // Ensure current service stays in the options so browser never unselects it
                          const currentObj = activeServices.find(s => s.id === item.serviceId);
                          const finalServices = [...matchingServices];
                          if (currentObj && !finalServices.some(s => s.id === currentObj.id)) {
                            finalServices.unshift(currentObj);
                          }

                          return (
                            <>
                              {Object.entries({
                                cabelo: 'Cabeleireiras & Cabelos',
                                unhas: 'Manicures & Unhas',
                                estetica: 'Esteticista & Depilação',
                                sobrancelhas: 'Designer Sobrancelhas',
                                cilios: 'Lash Designer',
                                maquiagem: 'Maquiagem & Penteado',
                              }).map(([catKey, catLabel]) => {
                                const catServices = finalServices.filter(s => s.category === catKey);
                                if (catServices.length === 0) return null;
                                return (
                                  <optgroup key={catKey} label={catLabel}>
                                    {catServices.map(s => (
                                      <option key={s.id} value={s.id}>
                                        {s.name} ({formatBRL(s.price)})
                                      </option>
                                    ))}
                                  </optgroup>
                                );
                              })}
                              {finalServices.filter(s => !['cabelo', 'unhas', 'estetica', 'sobrancelhas', 'cilios', 'maquiagem'].includes(s.category)).map(s => (
                                <option key={s.id} value={s.id}>
                                  {s.name} ({formatBRL(s.price)})
                                </option>
                              ))}
                            </>
                          );
                        })()}
                      </select>
                    </div>

                    {/* Professional Selector (active only) */}
                    <div>
                      <label className="block text-[11px] font-semibold text-tb-brown-dark mb-1">
                        Profissional Responsável *
                      </label>
                      <select
                        value={item.professionalId}
                        onChange={e => handleUpdateServiceEntry(item.id, 'professionalId', e.target.value)}
                        required
                        className="w-full text-xs px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-white text-tb-brown-dark font-medium"
                      >
                        <option value="">Selecione a profissional...</option>
                        {activeProfessionals.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} — {p.specialty}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Duration and Price adjustments */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[10px] text-tb-gray-neutral mb-0.5">
                        Duração Estimada (minutos)
                      </label>
                      <input
                        type="number"
                        step="5"
                        min="5"
                        value={item.durationMinutes}
                        onChange={e => handleUpdateServiceEntry(item.id, 'durationMinutes', parseInt(e.target.value) || 30)}
                        className="w-full text-xs px-3 py-1.5 rounded-xl border border-tb-rose-light bg-tb-white text-tb-brown-dark font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-tb-gray-neutral mb-0.5">
                        Valor (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.price}
                        onChange={e => handleUpdateServiceEntry(item.id, 'price', parseFloat(e.target.value) || 0)}
                        className="w-full text-xs px-3 py-1.5 rounded-xl border border-tb-rose-light bg-tb-white text-tb-brown-dark font-bold text-tb-rose-primary"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Session Summary Banner */}
          <div className="p-4 bg-gradient-to-r from-tb-rose-blush/60 via-tb-ivory to-tb-white rounded-2xl border border-tb-rose-light flex items-center justify-between">
            <div>
              <span className="text-[11px] text-tb-brown-soft block">
                Modalidade: <span className="font-semibold text-tb-brown-dark capitalize">{executionMode}</span>
              </span>
              <span className="text-xs text-tb-brown-dark font-medium">
                Duração Total da Sessão: <span className="font-bold">{totalDuration} minutos</span>
              </span>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-tb-gray-neutral block tracking-wider">
                Valor Total Previsto
              </span>
              <span className="text-xl font-bold text-tb-brown-dark">
                {formatBRL(totalPrice)}
              </span>
            </div>
          </div>

          {/* General Notes */}
          <div>
            <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
              Observações do Agendamento
            </label>
            <textarea
              rows={2}
              value={generalNotes}
              onChange={e => setGeneralNotes(e.target.value)}
              placeholder="Ex: Cliente tem preferência por café, retoque de cor, unhas decoradas..."
              className="w-full text-xs p-3 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark resize-none"
            />
          </div>

          {/* Fit-In (Encaixe Forçado) Checkbox if no conflicts currently triggered */}
          {conflictWarnings.length === 0 && (
            <div className="pt-2 border-t border-tb-rose-light/30">
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={isFitIn}
                  onChange={e => setIsFitIn(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="font-semibold text-tb-brown-dark">
                  Marcar este agendamento como ENCAIXE
                </span>
              </label>
              {isFitIn && (
                <input
                  type="text"
                  placeholder="Motivo do encaixe..."
                  value={fitInReason}
                  onChange={e => setFitInReason(e.target.value)}
                  className="w-full mt-2 text-xs px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50/40"
                />
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-tb-rose-light/40 flex items-center justify-between gap-3">
            <div>
              {appointmentToEdit && (
                <button
                  type="button"
                  onClick={() => {
                    setIsConfirmingDelete(true);
                    setDeleteReason('');
                    setDeleteError(null);
                  }}
                  className="px-3.5 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all flex items-center gap-1.5 border border-rose-200"
                >
                  <Trash2 className="w-4 h-4 stroke-[2.2]" />
                  Excluir Agendamento
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-medium text-tb-brown-soft hover:text-tb-brown-dark rounded-xl"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={conflictWarnings.length > 0 && !isFitIn}
                className="px-6 py-2.5 text-xs sm:text-sm font-semibold bg-tb-rose-primary hover:bg-[#b57f8c] text-white rounded-xl shadow-soft hover:shadow-premium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {appointmentToEdit ? 'Atualizar Agendamento' : `Confirmar Agendamento (${serviceEntries.length} serviço${serviceEntries.length > 1 ? 's' : ''})`}
              </button>
            </div>
          </div>
        </form>

        {/* Delete Confirmation Modal with Justification */}
        {isConfirmingDelete && appointmentToEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tb-brown-dark/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-tb-white rounded-3xl p-6 border border-rose-200 w-full max-w-md space-y-4 shadow-premium">
              <div className="flex items-center gap-2.5 pb-2 border-b border-tb-rose-light/40">
                <div className="p-2.5 rounded-2xl bg-rose-100 text-rose-700">
                  <Trash2 className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-serif-brand text-lg font-bold text-tb-brown-dark">
                    Excluir Agendamento
                  </h3>
                  <p className="text-[11px] text-tb-brown-soft">
                    Remover permanentemente da grade
                  </p>
                </div>
              </div>

              <div className="bg-tb-ivory/80 rounded-2xl p-3 border border-tb-rose-light/40 text-xs space-y-1.5">
                <p><strong>Cliente:</strong> {appointmentToEdit.clientName}</p>
                <p><strong>Profissional:</strong> {appointmentToEdit.professionalName}</p>
                <p><strong>Serviço:</strong> {appointmentToEdit.serviceName}</p>
                <p><strong>Horário:</strong> {appointmentToEdit.date} às {appointmentToEdit.startTime}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-tb-brown-dark mb-1">
                  Justificativa da Exclusão <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex: Agendamento teste para ensinar as meninas / Cliente cancelou e liberou o horário..."
                  value={deleteReason}
                  onChange={e => {
                    setDeleteReason(e.target.value);
                    if (deleteError) setDeleteError(null);
                  }}
                  className="w-full text-xs p-3 rounded-xl border border-rose-300 bg-tb-ivory text-tb-brown-dark focus:ring-2 focus:ring-rose-400 focus:outline-none resize-none"
                />

                <div className="flex flex-wrap gap-1 mt-2">
                  {[
                    'Agendamento de teste / exemplo',
                    'Cliente desistiu e liberou o horário',
                    'Lançamento duplicado por engano',
                  ].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDeleteReason(preset)}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-tb-ivory hover:bg-rose-50 text-tb-brown-soft hover:text-rose-700 border border-tb-rose-light/40 transition-colors"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>

                {deleteError && (
                  <p className="text-xs text-rose-600 font-semibold mt-2 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {deleteError}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-tb-rose-light/30">
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(false)}
                  className="px-4 py-2 text-xs font-semibold text-tb-brown-soft"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!deleteReason.trim()) {
                      setDeleteError('Por favor, informe a justificativa da exclusão.');
                      return;
                    }
                    const res = deleteAppointment(appointmentToEdit.id, deleteReason.trim());
                    if (res.success) {
                      setIsConfirmingDelete(false);
                      onClose();
                    } else {
                      setDeleteError(res.error || 'Erro ao excluir.');
                    }
                  }}
                  className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-soft transition-all flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  Confirmar Exclusão
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
