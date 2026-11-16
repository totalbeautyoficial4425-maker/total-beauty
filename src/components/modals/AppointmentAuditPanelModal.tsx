import React, { useState, useMemo } from 'react';
import { 
  X, 
  History, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  User, 
  UserCheck, 
  Edit3, 
  Trash2, 
  XCircle, 
  CheckCircle2, 
  Download, 
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Eye,
  SlidersHorizontal
} from 'lucide-react';
import { AppointmentAuditLog, Professional } from '../../types';
import { useData } from '../../context/DataContext';
import { formatDateBR, formatDateTimeBR, formatBRL, downloadCSV } from '../../utils/formatters';
import { AppointmentHistoryModal } from './AppointmentHistoryModal';

interface AppointmentAuditPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppointmentAuditPanelModal: React.FC<AppointmentAuditPanelModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { appointmentAuditLogs, professionals, appointments } = useData();

  // Filters state
  const [clientSearch, setClientSearch] = useState('');
  const [selectedProfessional, setSelectedProfessional] = useState('todos');
  const [selectedCreator, setSelectedCreator] = useState('todos');
  const [selectedModifier, setSelectedModifier] = useState('todos');
  const [selectedAction, setSelectedAction] = useState('todos');
  const [selectedStatus, setSelectedStatus] = useState<'todos' | 'ativos' | 'cancelados' | 'excluidos'>('todos');
  const [dateFilterType, setDateFilterType] = useState<'agendamento' | 'operacao'>('agendamento');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected appointment for timeline detail modal
  const [inspectingAppointmentId, setInspectingAppointmentId] = useState<string | null>(null);

  // Active professionals list
  const activeProfessionals = useMemo(() => {
    return professionals.filter(p => p.isActive && p.id !== 'prof_thalita');
  }, [professionals]);

  // Unique creators list for filter dropdown
  const creatorsList = useMemo(() => {
    const set = new Set<string>();
    appointmentAuditLogs.forEach(l => {
      if (l.createdBy) set.add(l.createdBy);
      if (l.action === 'criado' && l.userName) set.add(l.userName);
    });
    return Array.from(set).sort();
  }, [appointmentAuditLogs]);

  // Unique modifiers/actors list for filter dropdown
  const modifiersList = useMemo(() => {
    const set = new Set<string>();
    appointmentAuditLogs.forEach(l => {
      if (l.userName) set.add(l.userName);
    });
    return Array.from(set).sort();
  }, [appointmentAuditLogs]);

  // Filtered audit logs
  const filteredLogs = useMemo(() => {
    const qClient = clientSearch.trim().toLowerCase();

    return appointmentAuditLogs.filter(log => {
      // 1. Client filter
      if (qClient) {
        const matchName = log.clientName.toLowerCase().includes(qClient);
        const matchPhone = log.clientPhone ? log.clientPhone.includes(qClient) : false;
        if (!matchName && !matchPhone) return false;
      }

      // 2. Professional responsible
      if (selectedProfessional !== 'todos' && log.professionalId !== selectedProfessional) {
        return false;
      }

      // 3. Creator
      if (selectedCreator !== 'todos') {
        const creator = log.createdBy || (log.action === 'criado' ? log.userName : '');
        if (creator !== selectedCreator) return false;
      }

      // 4. Modifier / Actor
      if (selectedModifier !== 'todos' && log.userName !== selectedModifier) {
        return false;
      }

      // 5. Action type
      if (selectedAction !== 'todos' && log.action !== selectedAction) {
        return false;
      }

      // 6. Status filter (ativos vs cancelados vs excluídos)
      if (selectedStatus === 'ativos') {
        if (log.isAppointmentDeleted || log.action === 'excluido' || log.status === 'cancelado') return false;
      } else if (selectedStatus === 'cancelados') {
        if (log.status !== 'cancelado' && log.action !== 'cancelado') return false;
      } else if (selectedStatus === 'excluidos') {
        if (!log.isAppointmentDeleted && log.action !== 'excluido') return false;
      }

      // 7. Date range filter
      const targetDate = dateFilterType === 'agendamento' 
        ? log.appointmentDate 
        : log.timestamp.split('T')[0];

      if (startDate && targetDate < startDate) return false;
      if (endDate && targetDate > endDate) return false;

      return true;
    });
  }, [
    appointmentAuditLogs,
    clientSearch,
    selectedProfessional,
    selectedCreator,
    selectedModifier,
    selectedAction,
    selectedStatus,
    dateFilterType,
    startDate,
    endDate,
  ]);

  // Statistics counters
  const stats = useMemo(() => {
    const total = appointmentAuditLogs.length;
    const criados = appointmentAuditLogs.filter(l => l.action === 'criado').length;
    const editados = appointmentAuditLogs.filter(l => l.action === 'editado').length;
    const cancelados = appointmentAuditLogs.filter(l => l.action === 'cancelado').length;
    const excluidos = appointmentAuditLogs.filter(l => l.action === 'excluido' || l.isAppointmentDeleted).length;
    return { total, criados, editados, cancelados, excluidos };
  }, [appointmentAuditLogs]);

  if (!isOpen) return null;

  const handleClearFilters = () => {
    setClientSearch('');
    setSelectedProfessional('todos');
    setSelectedCreator('todos');
    setSelectedModifier('todos');
    setSelectedAction('todos');
    setSelectedStatus('todos');
    setStartDate('');
    setEndDate('');
  };

  const handleExportCSV = () => {
    const headers = [
      'Data/Hora da Operacao',
      'Acao',
      'Responsavel',
      'Perfil do Responsavel',
      'Cliente',
      'Telefone',
      'Servico',
      'Profissional',
      'Data do Agendamento',
      'Horario',
      'Valor',
      'Status',
      'Detalhes da Alteracao',
      'Motivo (se houver)'
    ];

    const rows = filteredLogs.map(l => [
      formatDateTimeBR(l.timestamp),
      l.actionLabel,
      l.userName,
      l.userProfileLabel,
      l.clientName,
      l.clientPhone || '',
      l.serviceName,
      l.professionalName,
      formatDateBR(l.appointmentDate),
      `${l.appointmentStartTime} às ${l.appointmentEndTime}`,
      formatBRL(l.price),
      l.status,
      l.details || '',
      l.reason || ''
    ]);

    downloadCSV(`auditoria_agenda_total_beauty_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  const getActionBadge = (action: string, isDeleted?: boolean) => {
    if (isDeleted || action === 'excluido') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
          <Trash2 className="w-3 h-3 text-rose-600" />
          Excluído
        </span>
      );
    }
    if (action === 'cancelado') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-100 text-orange-800 border border-orange-300 flex items-center gap-1">
          <XCircle className="w-3 h-3 text-orange-600" />
          Cancelado
        </span>
      );
    }
    if (action === 'criado') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
          <Calendar className="w-3 h-3 text-emerald-600" />
          Criado
        </span>
      );
    }
    if (action === 'status_alterado') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-blue-600" />
          Status
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
        <Edit3 className="w-3 h-3 text-amber-700" />
        Editado
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in font-sans">
      <div className="bg-tb-white rounded-3xl shadow-premium border border-tb-rose-light/60 w-full max-w-5xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 bg-tb-ivory border-b border-tb-rose-light/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-300 text-amber-900 flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif-brand text-lg sm:text-xl font-bold text-tb-brown-dark">
                  Painel de Auditoria & Rastreabilidade da Agenda
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white shadow-2xs">
                  Administração
                </span>
              </div>
              <p className="text-xs text-tb-brown-soft">
                Registro histórico automático e imutável de quem criou, editou, cancelou ou excluiu horários
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-xl border border-tb-rose-light bg-white hover:bg-tb-beige-light text-tb-brown-dark text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
              title="Exportar registros filtrados para planilha Excel/CSV"
            >
              <Download className="w-3.5 h-3.5 text-tb-rose-primary" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-tb-rose-blush text-tb-gray-neutral hover:text-tb-brown-dark transition-colors"
              title="Fechar painel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top Summary Metrics Cards */}
        <div className="px-5 sm:px-6 py-3 bg-tb-white border-b border-tb-rose-light/30">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div className="p-2.5 rounded-2xl bg-tb-ivory/80 border border-tb-rose-light/40 flex flex-col justify-between">
              <span className="text-[10px] font-semibold text-tb-brown-soft uppercase tracking-tight">Total de Ações</span>
              <span className="text-base font-extrabold text-tb-brown-dark">{stats.total}</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex flex-col justify-between">
              <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-tight">Criados</span>
              <span className="text-base font-extrabold text-emerald-900">{stats.criados}</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-amber-50/80 border border-amber-200 flex flex-col justify-between">
              <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-tight">Alterados</span>
              <span className="text-base font-extrabold text-amber-900">{stats.editados}</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-orange-50/80 border border-orange-200 flex flex-col justify-between">
              <span className="text-[10px] font-semibold text-orange-800 uppercase tracking-tight">Cancelados</span>
              <span className="text-base font-extrabold text-orange-900">{stats.cancelados}</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-rose-50/80 border border-rose-200 flex flex-col justify-between col-span-2 sm:col-span-1">
              <span className="text-[10px] font-semibold text-rose-800 uppercase tracking-tight">Excluídos</span>
              <span className="text-base font-extrabold text-rose-900">{stats.excluidos}</span>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-4 sm:p-5 bg-tb-ivory/50 border-b border-tb-rose-light/30 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Search Client */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-tb-gray-neutral absolute left-3 top-2.5" />
              <input
                type="text"
                value={clientSearch}
                onChange={e => setClientSearch(e.target.value)}
                placeholder="Pesquisar por cliente..."
                className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-tb-rose-light bg-white text-tb-brown-dark font-medium placeholder:text-tb-gray-neutral"
              />
            </div>

            {/* Filter Professional Responsible */}
            <div>
              <select
                value={selectedProfessional}
                onChange={e => setSelectedProfessional(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-tb-rose-light bg-white text-tb-brown-dark font-semibold"
              >
                <option value="todos">Profissional: Todas</option>
                {activeProfessionals.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Filter Creator */}
            <div>
              <select
                value={selectedCreator}
                onChange={e => setSelectedCreator(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-tb-rose-light bg-white text-tb-brown-dark font-semibold"
              >
                <option value="todos">Criado por: Todos</option>
                {creatorsList.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Filter Modifier / Actor */}
            <div>
              <select
                value={selectedModifier}
                onChange={e => setSelectedModifier(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-tb-rose-light bg-white text-tb-brown-dark font-semibold"
              >
                <option value="todos">Alterado por: Todos</option>
                {modifiersList.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Secondary filter row */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              {/* Action type */}
              <select
                value={selectedAction}
                onChange={e => setSelectedAction(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-xl border border-tb-rose-light bg-white text-tb-brown-dark font-semibold"
              >
                <option value="todos">Operação: Todas</option>
                <option value="criado">Somente Criações</option>
                <option value="editado">Somente Alterações</option>
                <option value="status_alterado">Alterações de Status</option>
                <option value="cancelado">Cancelamentos</option>
                <option value="excluido">Exclusões</option>
              </select>

              {/* Status */}
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value as any)}
                className="text-xs px-3 py-1.5 rounded-xl border border-tb-rose-light bg-white text-tb-brown-dark font-semibold"
              >
                <option value="todos">Situação: Todas</option>
                <option value="ativos">Somente Ativos</option>
                <option value="cancelados">Somente Cancelados</option>
                <option value="excluidos">Somente Excluídos</option>
              </select>

              {/* Date Filter Type */}
              <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-xl border border-tb-rose-light">
                <span className="text-[11px] font-semibold text-tb-brown-soft">Período:</span>
                <button
                  type="button"
                  onClick={() => setDateFilterType('agendamento')}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-lg transition-all ${
                    dateFilterType === 'agendamento' ? 'bg-tb-rose-primary text-white' : 'text-tb-brown-soft hover:text-tb-brown-dark'
                  }`}
                >
                  Do Agendamento
                </button>
                <button
                  type="button"
                  onClick={() => setDateFilterType('operacao')}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-lg transition-all ${
                    dateFilterType === 'operacao' ? 'bg-tb-rose-primary text-white' : 'text-tb-brown-soft hover:text-tb-brown-dark'
                  }`}
                >
                  Da Operação
                </button>
              </div>

              {/* Date Inputs */}
              <div className="flex items-center gap-1 text-xs">
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="px-2 py-1 text-xs rounded-xl border border-tb-rose-light bg-white text-tb-brown-dark font-semibold"
                  title="Data inicial"
                />
                <span className="text-tb-gray-neutral">até</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="px-2 py-1 text-xs rounded-xl border border-tb-rose-light bg-white text-tb-brown-dark font-semibold"
                  title="Data final"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-3 py-1.5 text-xs font-semibold text-tb-brown-soft hover:text-tb-brown-dark bg-white hover:bg-tb-beige-light border border-tb-rose-light rounded-xl transition-colors flex items-center gap-1"
                title="Limpar todos os filtros de pesquisa"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Limpar Filtros</span>
              </button>

              <span className="text-xs font-bold text-tb-brown-dark">
                {filteredLogs.length} {filteredLogs.length === 1 ? 'registro' : 'registros'}
              </span>
            </div>
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-16 px-4 bg-tb-ivory/50 rounded-2xl border border-dashed border-tb-rose-light flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 mb-2">
                <Search className="w-5 h-5 opacity-60" />
              </div>
              <p className="text-xs font-bold text-tb-brown-dark">
                Nenhum registro de auditoria encontrado
              </p>
              <p className="text-[11px] text-tb-brown-soft mt-0.5">
                Tente ajustar ou limpar os filtros de pesquisa para visualizar outros registros.
              </p>
              <button
                type="button"
                onClick={handleClearFilters}
                className="mt-3 px-3.5 py-1.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors"
              >
                Limpar todos os filtros
              </button>
            </div>
          ) : (
            filteredLogs.map(log => {
              const isExcluido = log.action === 'excluido' || log.isAppointmentDeleted;
              const isCancelado = log.action === 'cancelado';

              return (
                <div
                  key={log.id}
                  className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                    isExcluido
                      ? 'bg-rose-50/40 border-rose-200 hover:border-rose-400'
                      : isCancelado
                      ? 'bg-orange-50/30 border-orange-200 hover:border-orange-400'
                      : 'bg-white border-tb-rose-light/50 hover:border-amber-300 shadow-2xs hover:shadow-soft'
                  }`}
                >
                  {/* Top Bar: Action badge, timestamp, actor */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-tb-rose-light/20 pb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {getActionBadge(log.action, isExcluido)}
                      <span className="font-extrabold text-xs text-tb-brown-dark">
                        {log.actionLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-tb-brown-soft font-medium">Realizado por:</span>
                      <strong className="text-tb-brown-dark">{log.userName}</strong>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-tb-beige-light text-tb-brown-dark border border-tb-rose-light/60">
                        {log.userProfileLabel}
                      </span>
                      <span className="text-tb-gray-neutral text-[11px] ml-1">
                        • {formatDateTimeBR(log.timestamp)}
                      </span>
                    </div>
                  </div>

                  {/* Body: Appointment details and changes */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    {/* Column 1: Client & Service */}
                    <div className="space-y-1">
                      <div>
                        <span className="font-bold text-tb-brown-dark text-[13px]">{log.clientName}</span>
                        {log.clientPhone && (
                          <span className="text-tb-gray-neutral ml-1.5 text-[11px]">({log.clientPhone})</span>
                        )}
                      </div>
                      <div className="text-tb-brown-soft">
                        Serviço: <strong className="text-tb-brown-dark">{log.serviceName}</strong>
                      </div>
                      <div className="text-tb-brown-soft">
                        Profissional: <strong className="text-tb-brown-dark">{log.professionalName}</strong>
                      </div>
                    </div>

                    {/* Column 2: Date, Time & Price */}
                    <div className="space-y-1">
                      <div className="text-tb-brown-soft">
                        Data agendada: <strong className="text-amber-800">{formatDateBR(log.appointmentDate)}</strong>
                      </div>
                      <div className="text-tb-brown-soft">
                        Horário: <strong className="text-tb-brown-dark">{log.appointmentStartTime} às {log.appointmentEndTime}</strong> ({log.durationMinutes} min)
                      </div>
                      <div className="text-tb-brown-soft">
                        Valor: <strong className="text-tb-brown-dark">{formatBRL(log.price)}</strong>
                      </div>
                    </div>

                    {/* Column 3: Audit details / Reason & Actions */}
                    <div className="space-y-2 flex flex-col justify-between">
                      <div className="space-y-1">
                        {log.createdBy && (
                          <div className="text-[11px] text-tb-gray-neutral">
                            Criado originalmente por: <strong className="text-tb-brown-dark">{log.createdBy}</strong>
                            {log.createdAt && ` em ${formatDateBR(log.createdAt.split('T')[0])}`}
                          </div>
                        )}
                        {log.reason && (
                          <div className="p-2 rounded-xl bg-rose-100/70 border border-rose-200 text-rose-900 text-[11px]">
                            <strong>Motivo/Justificativa: </strong>{log.reason}
                          </div>
                        )}
                        {log.details && !log.reason && (
                          <p className="text-[11px] text-tb-brown-soft italic">
                            {log.details}
                          </p>
                        )}
                      </div>

                      <div className="self-end pt-1">
                        <button
                          type="button"
                          onClick={() => setInspectingAppointmentId(log.appointmentId)}
                          className="px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl transition-all flex items-center gap-1.5"
                          title="Ver linha do tempo completa deste agendamento"
                        >
                          <History className="w-3.5 h-3.5 text-amber-700" />
                          <span>Ver Linha do Tempo</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Changes Diff Table (if granular changes exist) */}
                  {log.changes && log.changes.length > 0 && (
                    <div className="pt-2 border-t border-tb-rose-light/20 space-y-1">
                      <div className="flex flex-wrap gap-1.5">
                        {log.changes.map((ch, idx) => (
                          <div key={idx} className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-50/80 border border-amber-200 flex items-center gap-1.5">
                            <span className="font-bold text-amber-950">{ch.field}:</span>
                            <span className="line-through text-tb-gray-neutral">{ch.oldValue}</span>
                            <ArrowRight className="w-3 h-3 text-amber-600" />
                            <span className="font-bold text-emerald-800">{ch.newValue}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 bg-tb-ivory border-t border-tb-rose-light/40 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-tb-brown-soft">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Auditoria centralizada do Total Beauty. Registros permanentes sincronizados em nuvem.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold bg-tb-brown-dark hover:bg-black text-white rounded-xl shadow-soft transition-all"
          >
            Fechar Painel
          </button>
        </div>
      </div>

      {/* Nested Appointment History Timeline Modal */}
      {inspectingAppointmentId && (
        <AppointmentHistoryModal
          isOpen={true}
          onClose={() => setInspectingAppointmentId(null)}
          appointmentId={inspectingAppointmentId}
        />
      )}
    </div>
  );
};
