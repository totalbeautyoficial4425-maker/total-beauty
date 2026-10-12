import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  User, 
  Sparkles, 
  DollarSign, 
  AlertCircle, 
  Check, 
  Plus, 
  Scissors, 
  AlertTriangle 
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Appointment } from '../../types';
import { addMinutesToTime, formatBRL } from '../../utils/formatters';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentToEdit?: Appointment | null;
  initialDate?: string;
  initialTime?: string;
  initialClientId?: string;
}

export const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  appointmentToEdit,
  initialDate,
  initialTime,
  initialClientId,
}) => {
  const { currentUser } = useAuth();
  const { 
    clients, 
    services, 
    professionals, 
    addAppointment, 
    updateAppointment, 
    checkConflict, 
    addClient 
  } = useData();

  // Form State
  const [clientId, setClientId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [professionalId, setProfessionalId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [price, setPrice] = useState(0);
  const [notes, setNotes] = useState('');
  const [isFitIn, setIsFitIn] = useState(false);

  // Quick Client Inline Creation State
  const [isCreatingNewClient, setIsCreatingNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [quickClientError, setQuickClientError] = useState<string | null>(null);

  // Validation & Conflict
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const endTime = addMinutesToTime(startTime, durationMinutes);

  // Reset or fill form
  useEffect(() => {
    if (isOpen) {
      if (appointmentToEdit) {
        setClientId(appointmentToEdit.clientId);
        setServiceId(appointmentToEdit.serviceId);
        setProfessionalId(appointmentToEdit.professionalId);
        setDate(appointmentToEdit.date);
        setStartTime(appointmentToEdit.startTime);
        setDurationMinutes(appointmentToEdit.durationMinutes);
        setPrice(appointmentToEdit.price);
        setNotes(appointmentToEdit.notes || '');
        setIsFitIn(appointmentToEdit.isFitIn || false);
      } else {
        const todayStr = new Date().toISOString().split('T')[0];
        setDate(initialDate || todayStr);
        setStartTime(initialTime || '09:00');
        setClientId(initialClientId || (clients[0]?.id || ''));
        
        // Select first active service by default
        const firstService = services.find(s => s.isActive);
        if (firstService) {
          setServiceId(firstService.id);
          setDurationMinutes(firstService.durationMinutes);
          setPrice(firstService.price);
        }

        const loggedProf = professionals.find(p => 
          p.id === currentUser?.professionalId || 
          p.userId === currentUser?.id || 
          p.username === currentUser?.username
        );
        const selectedProf = loggedProf || professionals.find(p => p.isActive);
        if (selectedProf) {
          setProfessionalId(selectedProf.id);
        }

        setNotes('');
        setIsFitIn(false);
      }
      setIsCreatingNewClient(false);
      setQuickClientError(null);
      setConflictWarning(null);
      setFormError(null);
    }
  }, [isOpen, appointmentToEdit, initialDate, initialTime, initialClientId, clients, services, professionals]);

  // Handle service selection change
  const handleServiceChange = (selectedServiceId: string) => {
    setServiceId(selectedServiceId);
    const srv = services.find(s => s.id === selectedServiceId);
    if (srv) {
      setDurationMinutes(srv.durationMinutes);
      setPrice(srv.price);
    }
  };

  // Check conflicts in real-time
  useEffect(() => {
    if (date && startTime && professionalId && !isFitIn) {
      const calcEnd = addMinutesToTime(startTime, durationMinutes);
      const conflict = checkConflict(
        date, 
        startTime, 
        calcEnd, 
        professionalId, 
        appointmentToEdit?.id
      );
      if (conflict.hasConflict) {
        setConflictWarning(conflict.message || 'Conflito de horário detectado!');
      } else {
        setConflictWarning(null);
      }
    } else {
      setConflictWarning(null);
    }
  }, [date, startTime, durationMinutes, professionalId, isFitIn, checkConflict, appointmentToEdit]);

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
      communicationConsent: true,
    });

    if (!res.success || !res.client) {
      setQuickClientError(res.error || 'Erro ao cadastrar cliente.');
    } else {
      setClientId(res.client.id);
      setIsCreatingNewClient(false);
      setNewClientName('');
      setNewClientPhone('');
    }
  };

  // Submit appointment
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const client = clients.find(c => c.id === clientId);
    const service = services.find(s => s.id === serviceId);
    const prof = professionals.find(p => p.id === professionalId);

    if (!client) {
      setFormError('Por favor, selecione uma cliente.');
      return;
    }
    if (!service) {
      setFormError('Por favor, selecione um serviço.');
      return;
    }
    if (!prof) {
      setFormError('Por favor, selecione a profissional responsável.');
      return;
    }

    if (appointmentToEdit) {
      const res = updateAppointment(appointmentToEdit.id, {
        clientId: client.id,
        clientName: client.name,
        clientPhone: client.phone,
        serviceId: service.id,
        serviceName: service.name,
        professionalId: prof.id,
        professionalName: prof.name,
        date,
        startTime,
        endTime,
        durationMinutes,
        price,
        notes,
        isFitIn,
      });

      if (!res.success) {
        setFormError(res.error || 'Erro ao atualizar o agendamento.');
        return;
      }
    } else {
      const res = addAppointment({
        clientId: client.id,
        clientName: client.name,
        clientPhone: client.phone,
        serviceId: service.id,
        serviceName: service.name,
        professionalId: prof.id,
        professionalName: prof.name,
        date,
        startTime,
        endTime,
        durationMinutes,
        price,
        notes,
        status: 'agendado',
        isFitIn,
      });

      if (!res.success) {
        setFormError(res.error || 'Erro ao agendar horário.');
        return;
      }
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tb-brown-dark/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-tb-white rounded-2xl shadow-premium border border-tb-rose-light/50 w-full max-w-xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-tb-ivory border-b border-tb-rose-light/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-tb-rose-blush text-tb-rose-primary flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif-brand text-xl font-bold text-tb-brown-dark">
                {appointmentToEdit ? 'Editar Agendamento' : 'Novo Agendamento'}
              </h3>
              <p className="text-xs text-tb-gray-neutral">
                {appointmentToEdit ? 'Atualize as informações do compromisso' : 'Reserve o horário de atendimento na Total Beauty'}
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* Conflict Alert Warning */}
          {conflictWarning && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span className="font-medium">{conflictWarning}</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer pt-1 border-t border-amber-200">
                <input
                  type="checkbox"
                  checked={isFitIn}
                  onChange={e => setIsFitIn(e.target.checked)}
                  className="rounded text-tb-rose-primary focus:ring-tb-rose-primary"
                />
                <span className="text-amber-800 font-semibold">
                  Confirmar como Encaixe excepcional (permitir sobreposição)
                </span>
              </label>
            </div>
          )}

          {/* Client Selection & Quick Creation */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-tb-brown-dark flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-tb-rose-primary" />
                Cliente
              </label>
              <button
                type="button"
                onClick={() => setIsCreatingNewClient(!isCreatingNewClient)}
                className="text-xs text-tb-rose-primary hover:text-tb-brown-dark font-medium flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                {isCreatingNewClient ? 'Voltar para lista' : 'Nova Cliente Rápida'}
              </button>
            </div>

            {isCreatingNewClient ? (
              <div className="p-3.5 bg-tb-ivory rounded-xl border border-tb-rose-light/70 space-y-3">
                <span className="text-xs font-medium text-tb-brown-soft block">
                  Cadastrar Cliente Sem Sair do Agendamento:
                </span>
                {quickClientError && (
                  <p className="text-xs text-rose-600 font-medium">{quickClientError}</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Nome completo da cliente *"
                    value={newClientName}
                    onChange={e => setNewClientName(e.target.value)}
                    className="text-xs px-3 py-2 rounded-lg border border-tb-rose-light bg-tb-white"
                  />
                  <input
                    type="text"
                    placeholder="Celular com DDD (ex: 11 98765-4321) *"
                    value={newClientPhone}
                    onChange={e => setNewClientPhone(e.target.value)}
                    className="text-xs px-3 py-2 rounded-lg border border-tb-rose-light bg-tb-white"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsCreatingNewClient(false)}
                    className="px-3 py-1.5 text-xs text-tb-gray-neutral hover:text-tb-brown-dark"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveQuickClient}
                    className="px-3.5 py-1.5 bg-tb-rose-primary text-white text-xs font-medium rounded-lg"
                  >
                    Salvar Cliente
                  </button>
                </div>
              </div>
            ) : (
              <select
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                required
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark focus:ring-2 focus:ring-tb-rose-primary/30 focus:border-tb-rose-primary"
              >
                <option value="" disabled>Selecione uma cliente...</option>
                {clients.filter(c => !c.isArchived).map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.phone}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Service & Professional Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
                Serviço
              </label>
              <select
                value={serviceId}
                onChange={e => handleServiceChange(e.target.value)}
                required
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark focus:ring-2 focus:ring-tb-rose-primary/30 focus:border-tb-rose-primary"
              >
                <option value="" disabled>Selecione um serviço...</option>
                {Object.entries({
                  cabelo: 'Cabeleireiras & Cabelos',
                  unhas: 'Manicures & Unhas',
                  estetica: 'Esteticista & Depilação',
                  sobrancelhas: 'Designer Sobrancelhas',
                  cilios: 'Lash Designer',
                  maquiagem: 'Maquiagem & Penteado',
                }).map(([catKey, catLabel]) => {
                  const catServices = services.filter(s => s.isActive && s.category === catKey);
                  if (catServices.length === 0) return null;
                  return (
                    <optgroup key={catKey} label={catLabel}>
                      {catServices.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} — {s.durationMinutes} min ({formatBRL(s.price)})
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
                {/* Fallback for other categories */}
                {services.filter(s => s.isActive && !['cabelo', 'unhas', 'estetica', 'sobrancelhas', 'cilios', 'maquiagem'].includes(s.category)).map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.durationMinutes} min ({formatBRL(s.price)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
                Profissional Responsável
              </label>
              <select
                value={professionalId}
                onChange={e => setProfessionalId(e.target.value)}
                required
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark focus:ring-2 focus:ring-tb-rose-primary/30 focus:border-tb-rose-primary"
              >
                <option value="" disabled>Selecione o profissional...</option>
                {professionals.filter(p => p.isActive).map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.specialty})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date, Start Time & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
                Data
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
                className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark focus:ring-2 focus:ring-tb-rose-primary/30 focus:border-tb-rose-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
                Horário Início
              </label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                required
                className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark focus:ring-2 focus:ring-tb-rose-primary/30 focus:border-tb-rose-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
                Término Estimado
              </label>
              <div className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-tb-rose-light/50 bg-tb-beige-light text-tb-brown-dark font-medium flex items-center justify-between">
                <span>{endTime}</span>
                <span className="text-[10px] text-tb-gray-neutral">({durationMinutes} min)</span>
              </div>
            </div>
          </div>

          {/* Price Adjustment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
                Valor do Atendimento (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs text-tb-gray-neutral">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={e => setPrice(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs sm:text-sm pl-9 pr-3 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark focus:ring-2 focus:ring-tb-rose-primary/30 focus:border-tb-rose-primary"
                />
              </div>
              <p className="text-[10px] text-tb-gray-neutral mt-0.5">
                Alterações pontuais aqui não modificam o valor padrão do catálogo.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
                Duração Personalizada (minutos)
              </label>
              <input
                type="number"
                step="5"
                min="5"
                value={durationMinutes}
                onChange={e => setDurationMinutes(parseInt(e.target.value) || 30)}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark focus:ring-2 focus:ring-tb-rose-primary/30 focus:border-tb-rose-primary"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
              Observações do Agendamento
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ex: Cliente tem preferência por café sem açúcar, retoque de mechas, etc."
              className="w-full text-xs sm:text-sm p-3 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark focus:ring-2 focus:ring-tb-rose-primary/30 focus:border-tb-rose-primary resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-tb-rose-light/40 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-medium text-tb-brown-soft hover:text-tb-brown-dark rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!!conflictWarning && !isFitIn}
              className="px-6 py-2.5 text-xs sm:text-sm font-semibold bg-tb-rose-primary hover:bg-[#b57f8c] text-white rounded-xl shadow-soft hover:shadow-premium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {appointmentToEdit ? 'Atualizar Agendamento' : 'Confirmar e Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
