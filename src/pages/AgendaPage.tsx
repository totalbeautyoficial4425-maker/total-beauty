import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Filter, 
  Clock, 
  User, 
  MessageCircle, 
  MoreVertical, 
  CheckCircle2, 
  Play, 
  XCircle, 
  Edit, 
  AlertTriangle,
  List,
  CalendarDays,
  CalendarRange,
  Search
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { Appointment, AppointmentStatus } from '../types';
import { formatBRL, formatDateBR, addMinutesToTime } from '../utils/formatters';

interface AgendaPageProps {
  onOpenNewAppointment: (initialDate?: string, initialTime?: string) => void;
  onEditAppointment: (appointment: Appointment) => void;
  onOpenWhatsApp: (clientName: string, clientPhone: string, appointment?: any) => void;
}

type ViewMode = 'dia' | 'semana' | 'mes' | 'lista';

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; badgeClass: string; borderClass: string }> = {
  agendado: { label: 'Agendado', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200', borderClass: 'border-l-blue-400' },
  confirmado: { label: 'Confirmado', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', borderClass: 'border-l-emerald-500' },
  em_atendimento: { label: 'Em Atendimento', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse', borderClass: 'border-l-amber-500' },
  concluido: { label: 'Concluído', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200', borderClass: 'border-l-purple-500' },
  cancelado: { label: 'Cancelado', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200', borderClass: 'border-l-rose-400' },
  nao_compareceu: { label: 'Não Compareceu', badgeClass: 'bg-gray-100 text-gray-700 border-gray-300', borderClass: 'border-l-gray-400' },
};

const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', 
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', 
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', 
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'
];

export const AgendaPage: React.FC<AgendaPageProps> = ({
  onOpenNewAppointment,
  onEditAppointment,
  onOpenWhatsApp,
}) => {
  const { 
    appointments, 
    professionals, 
    services, 
    updateAppointmentStatus, 
    cancelAppointment, 
    startAttendance 
  } = useData();

  const [viewMode, setViewMode] = useState<ViewMode>('dia');
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // Filters
  const [selectedProfessional, setSelectedProfessional] = useState<string>('todos');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState('');

  // Cancel Modal Prompt State
  const [cancelingAppointmentId, setCancelingAppointmentId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Action Menu dropdown state
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Navigate date
  const handlePrevDate = () => {
    const d = new Date(selectedDate + 'T00:00:00');
    if (viewMode === 'dia') d.setDate(d.getDate() - 1);
    else if (viewMode === 'semana') d.setDate(d.getDate() - 7);
    else if (viewMode === 'mes') d.setMonth(d.getMonth() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDate = () => {
    const d = new Date(selectedDate + 'T00:00:00');
    if (viewMode === 'dia') d.setDate(d.getDate() + 1);
    else if (viewMode === 'semana') d.setDate(d.getDate() + 7);
    else if (viewMode === 'mes') d.setMonth(d.getMonth() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  // Filtered appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter(apt => {
      // Date filter based on view mode
      if (viewMode === 'dia' && apt.date !== selectedDate) return false;
      if (viewMode === 'semana') {
        const sel = new Date(selectedDate + 'T00:00:00');
        const startWeek = new Date(sel);
        startWeek.setDate(sel.getDate() - sel.getDay());
        const endWeek = new Date(startWeek);
        endWeek.setDate(startWeek.getDate() + 6);
        const aptDate = new Date(apt.date + 'T00:00:00');
        if (aptDate < startWeek || aptDate > endWeek) return false;
      }
      if (viewMode === 'mes' && apt.date.substring(0, 7) !== selectedDate.substring(0, 7)) return false;

      // Professional filter
      if (selectedProfessional !== 'todos' && apt.professionalId !== selectedProfessional) return false;

      // Status filter
      if (selectedStatus !== 'todos' && apt.status !== selectedStatus) return false;

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          apt.clientName.toLowerCase().includes(q) ||
          apt.serviceName.toLowerCase().includes(q) ||
          apt.clientPhone.includes(q)
        );
      }

      return true;
    });
  }, [appointments, selectedDate, viewMode, selectedProfessional, selectedStatus, searchQuery]);

  const handleConfirmCancel = () => {
    if (cancelingAppointmentId) {
      cancelAppointment(cancelingAppointmentId, cancelReason.trim() || 'Cancelado pela administradora');
      setCancelingAppointmentId(null);
      setCancelReason('');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Controls Bar */}
      <div className="bg-tb-white rounded-3xl p-5 border border-tb-rose-light/50 shadow-soft flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Left: View Mode Toggle & Date Navigator */}
        <div className="flex flex-wrap items-center gap-3">
          {/* View mode switcher */}
          <div className="flex bg-tb-ivory p-1 rounded-2xl border border-tb-rose-light/50">
            {[
              { id: 'dia', label: 'Dia', icon: CalendarDays },
              { id: 'semana', label: 'Semana', icon: CalendarRange },
              { id: 'mes', label: 'Mês', icon: CalendarIcon },
              { id: 'lista', label: 'Lista', icon: List },
            ].map(vm => {
              const Icon = vm.icon;
              const isActive = viewMode === vm.id;
              return (
                <button
                  key={vm.id}
                  onClick={() => setViewMode(vm.id as ViewMode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-tb-rose-primary text-white shadow-sm'
                      : 'text-tb-brown-soft hover:text-tb-brown-dark hover:bg-tb-beige-light'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {vm.label}
                </button>
              );
            })}
          </div>

          {/* Date Navigator */}
          <div className="flex items-center gap-1.5 bg-tb-ivory px-2 py-1 rounded-2xl border border-tb-rose-light/50">
            <button
              onClick={handlePrevDate}
              className="p-1 rounded-lg text-tb-gray-neutral hover:text-tb-brown-dark hover:bg-tb-beige-light"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-medium text-tb-brown-dark hover:text-tb-rose-primary"
            >
              Hoje
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="text-xs px-2 py-0.5 rounded-lg border-0 bg-transparent text-tb-brown-dark font-semibold focus:ring-0"
            />
            <button
              onClick={handleNextDate}
              className="p-1 rounded-lg text-tb-gray-neutral hover:text-tb-brown-dark hover:bg-tb-beige-light"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: Action Button */}
        <button
          onClick={() => onOpenNewAppointment(selectedDate)}
          className="px-5 py-2.5 rounded-2xl bg-tb-rose-primary hover:bg-[#b57f8c] text-white text-xs sm:text-sm font-semibold shadow-soft hover:shadow-premium transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Novo Agendamento
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-tb-white rounded-2xl p-4 border border-tb-rose-light/40 shadow-soft flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-tb-gray-neutral absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Filtrar por cliente, telefone ou serviço..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark focus:ring-2 focus:ring-tb-rose-primary/20"
          />
        </div>

        {/* Professional filter */}
        <select
          value={selectedProfessional}
          onChange={e => setSelectedProfessional(e.target.value)}
          className="text-xs px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark"
        >
          <option value="todos">Todas as Profissionais</option>
          {professionals.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={selectedStatus}
          onChange={e => setSelectedStatus(e.target.value)}
          className="text-xs px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark"
        >
          <option value="todos">Todos os Status</option>
          <option value="agendado">Agendados</option>
          <option value="confirmado">Confirmados</option>
          <option value="em_atendimento">Em Atendimento</option>
          <option value="concluido">Concluídos</option>
          <option value="cancelado">Cancelados</option>
          <option value="nao_compareceu">Não Compareceu</option>
        </select>

        <span className="text-xs font-semibold text-tb-gray-neutral ml-auto">
          {filteredAppointments.length} agendamento(s)
        </span>
      </div>

      {/* Main Agenda Grid / Views */}

      {/* VIEW: DIA (Time Grid) */}
      {viewMode === 'dia' && (
        <div className="bg-tb-white rounded-3xl border border-tb-rose-light/50 shadow-soft overflow-hidden">
          <div className="p-4 bg-tb-ivory border-b border-tb-rose-light/40 flex items-center justify-between">
            <h3 className="font-serif-brand text-lg font-bold text-tb-brown-dark">
              Grade Diária — {formatDateBR(selectedDate)}
            </h3>
            <span className="text-xs text-tb-gray-neutral">
              Clique em um horário vago para agendar imediatamente
            </span>
          </div>

          <div className="divide-y divide-tb-rose-light/20 max-h-[750px] overflow-y-auto">
            {TIME_SLOTS.map(time => {
              const slotAppointments = filteredAppointments.filter(
                a => a.startTime <= time && a.endTime > time
              );

              return (
                <div 
                  key={time} 
                  className="flex items-start min-h-[58px] hover:bg-tb-ivory/50 transition-colors group"
                >
                  {/* Time Column */}
                  <div className="w-20 sm:w-24 px-3 py-2 text-right border-r border-tb-rose-light/30 shrink-0">
                    <span className="text-xs font-semibold text-tb-brown-soft">{time}</span>
                  </div>

                  {/* Slot Appointments Container */}
                  <div className="flex-1 p-1.5 flex flex-wrap gap-2 items-center">
                    {slotAppointments.length === 0 ? (
                      <button
                        onClick={() => onOpenNewAppointment(selectedDate, time)}
                        className="w-full text-left py-1 px-3 text-[11px] text-tb-gray-neutral/40 hover:text-tb-rose-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 rounded-lg hover:bg-tb-rose-blush/30"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Livre — Agendar às {time}
                      </button>
                    ) : (
                      slotAppointments.map(apt => {
                        const statusMeta = STATUS_CONFIG[apt.status];
                        return (
                          <div
                            key={apt.id}
                            className={`p-3 rounded-2xl bg-tb-ivory border ${statusMeta.borderClass} border-l-4 shadow-2xs hover:shadow-soft transition-all flex items-center justify-between gap-4 flex-1 min-w-[280px] max-w-xl`}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-tb-brown-dark">
                                  {apt.clientName}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusMeta.badgeClass}`}>
                                  {statusMeta.label}
                                </span>
                                {apt.isFitIn && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-200 text-amber-900">
                                    Encaixe
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-tb-brown-soft mt-0.5">
                                {apt.serviceName} • {apt.startTime} às {apt.endTime} ({apt.durationMinutes} min)
                              </p>
                              <p className="text-[10px] text-tb-gray-neutral">
                                Profissional: <span className="font-medium text-tb-brown-dark">{apt.professionalName}</span> • {formatBRL(apt.price)}
                              </p>
                            </div>

                            {/* Card Actions */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => onOpenWhatsApp(apt.clientName, apt.clientPhone, apt)}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="WhatsApp"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>

                              {apt.status === 'agendado' && (
                                <button
                                  onClick={() => updateAppointmentStatus(apt.id, 'confirmado')}
                                  className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                                  title="Confirmar Presença"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                              )}

                              {['agendado', 'confirmado'].includes(apt.status) && (
                                <button
                                  onClick={() => startAttendance(apt.id)}
                                  className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                  title="Iniciar Atendimento Agora"
                                >
                                  <Play className="w-4 h-4" />
                                </button>
                              )}

                              <button
                                onClick={() => onEditAppointment(apt)}
                                className="p-1.5 text-tb-brown-soft hover:bg-tb-beige-light rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              {!['cancelado', 'concluido'].includes(apt.status) && (
                                <button
                                  onClick={() => setCancelingAppointmentId(apt.id)}
                                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Cancelar"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW: LISTA */}
      {viewMode === 'lista' && (
        <div className="bg-tb-white rounded-3xl border border-tb-rose-light/50 shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-tb-ivory border-b border-tb-rose-light/40 text-tb-brown-soft font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Data & Horário</th>
                  <th className="px-5 py-3.5">Cliente</th>
                  <th className="px-5 py-3.5">Serviço</th>
                  <th className="px-5 py-3.5">Profissional</th>
                  <th className="px-5 py-3.5">Valor</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tb-rose-light/20 text-tb-brown-dark">
                {filteredAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-tb-gray-neutral">
                      Nenhum agendamento encontrado para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredAppointments.map(apt => {
                    const statusMeta = STATUS_CONFIG[apt.status];
                    return (
                      <tr key={apt.id} className="hover:bg-tb-ivory/60 transition-colors">
                        <td className="px-5 py-3.5 font-medium whitespace-nowrap">
                          {formatDateBR(apt.date)} às {apt.startTime} - {apt.endTime}
                        </td>
                        <td className="px-5 py-3.5 font-bold">
                          {apt.clientName}
                          <span className="block text-[11px] font-normal text-tb-gray-neutral">{apt.clientPhone}</span>
                        </td>
                        <td className="px-5 py-3.5">{apt.serviceName}</td>
                        <td className="px-5 py-3.5">{apt.professionalName}</td>
                        <td className="px-5 py-3.5 font-semibold text-tb-rose-primary">{formatBRL(apt.price)}</td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusMeta.badgeClass}`}>
                            {statusMeta.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => onOpenWhatsApp(apt.clientName, apt.clientPhone, apt)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                              title="WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onEditAppointment(apt)}
                              className="p-1.5 text-tb-brown-soft hover:bg-tb-beige-light rounded-lg"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {!['cancelado', 'concluido'].includes(apt.status) && (
                              <button
                                onClick={() => setCancelingAppointmentId(apt.id)}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                                title="Cancelar"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW: SEMANA & MÊS (Calendar Cards) */}
      {(viewMode === 'semana' || viewMode === 'mes') && (
        <div className="bg-tb-white rounded-3xl p-6 border border-tb-rose-light/50 shadow-soft space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-tb-rose-light/30">
            <h3 className="font-serif-brand text-xl font-bold text-tb-brown-dark">
              Visão Geral de Agendamentos ({filteredAppointments.length} registrados)
            </h3>
            <span className="text-xs text-tb-gray-neutral">Referência: {formatDateBR(selectedDate)}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredAppointments.length === 0 ? (
              <div className="col-span-full p-12 text-center text-xs text-tb-gray-neutral">
                Nenhum agendamento para este período.
              </div>
            ) : (
              filteredAppointments.map(apt => {
                const statusMeta = STATUS_CONFIG[apt.status];
                return (
                  <div 
                    key={apt.id}
                    className={`p-4 rounded-2xl bg-tb-ivory border ${statusMeta.borderClass} border-l-4 shadow-2xs hover:shadow-soft transition-all flex flex-col justify-between space-y-3`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-tb-brown-dark">{apt.clientName}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusMeta.badgeClass}`}>
                          {statusMeta.label}
                        </span>
                      </div>
                      <p className="text-xs text-tb-rose-primary font-medium mt-1">{apt.serviceName}</p>
                      <p className="text-[11px] text-tb-brown-soft mt-0.5">
                        {formatDateBR(apt.date)} • {apt.startTime} às {apt.endTime}
                      </p>
                      <p className="text-[11px] text-tb-gray-neutral">
                        Com {apt.professionalName} • {formatBRL(apt.price)}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-tb-rose-light/30 flex items-center justify-between">
                      <button
                        onClick={() => onOpenWhatsApp(apt.clientName, apt.clientPhone, apt)}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        WhatsApp
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onEditAppointment(apt)}
                          className="px-2.5 py-1 text-xs font-medium text-tb-brown-dark hover:bg-tb-beige-light rounded-lg"
                        >
                          Detalhes
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Cancellation Reason Modal */}
      {cancelingAppointmentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tb-brown-dark/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-tb-white rounded-2xl shadow-premium border border-tb-rose-light/50 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-serif-brand text-xl font-bold text-tb-brown-dark">
                Cancelar Agendamento
              </h3>
            </div>

            <p className="text-xs text-tb-gray-neutral">
              Informe o motivo do cancelamento para registro histórico no prontuário da cliente:
            </p>

            <textarea
              rows={3}
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="Ex: Cliente solicitou cancelamento por imprevisto pessoal..."
              className="w-full text-xs p-3 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark resize-none"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelingAppointmentId(null)}
                className="px-4 py-2 text-xs font-medium text-tb-brown-soft hover:text-tb-brown-dark rounded-xl"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="px-5 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm"
              >
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
