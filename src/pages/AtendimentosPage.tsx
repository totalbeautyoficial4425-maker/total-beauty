import React, { useState, useMemo } from 'react';
import { 
  Clock, 
  Play, 
  CheckCircle2, 
  Plus, 
  User, 
  DollarSign, 
  Sparkles, 
  AlertCircle, 
  Calendar,
  Scale,
  Receipt,
  Check,
  ChevronRight,
  Filter,
  RotateCcw,
  Trash2,
  Search,
  History,
  CalendarDays
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Attendance, Comanda } from '../types';
import { formatBRL, formatDateBR } from '../utils/formatters';
import { getTodayDate, getYesterdayDate } from '../services/storage';
import { ProductConsumptionModal } from '../components/modals/ProductConsumptionModal';

interface AtendimentosPageProps {
  onOpenFinishAttendance: (attendance: Attendance) => void;
  onOpenNewAppointment: () => void;
}

export const AtendimentosPage: React.FC<AtendimentosPageProps> = ({
  onOpenFinishAttendance,
  onOpenNewAppointment,
}) => {
  const { currentUser } = useAuth();
  const { 
    attendances, 
    appointments, 
    clients, 
    services, 
    professionals, 
    comandas,
    startAttendance,
    revertAttendance,
    removeServiceFromComanda,
    reopenComanda,
    updateAppointmentStatus 
  } = useData();

  const isProfessional = currentUser?.role === 'profissional';
  const myProf = professionals.find(p => 
    p.id === currentUser?.professionalId || 
    p.userId === currentUser?.id || 
    p.name.toLowerCase() === currentUser?.name.toLowerCase()
  );
  const myProfId = myProf?.id;

  // Active professionals only (Thálita is excluded)
  const activeProfessionals = useMemo(() => {
    return professionals.filter(p => p.isActive && p.id !== 'prof_thalita');
  }, [professionals]);

  // Tab filter: 'todas_comandas' | 'meus_atendimentos'
  const [filterMode, setFilterMode] = useState<'todas' | 'meus'>(isProfessional ? 'meus' : 'todas');

  // Ad-hoc attendance state
  const [isStartingNew, setIsStartingNew] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedProfId, setSelectedProfId] = useState(myProfId || '');
  const [startError, setStartError] = useState<string | null>(null);

  // Consumption Modal
  const [attendanceForConsumption, setAttendanceForConsumption] = useState<Attendance | null>(null);

  // Revert attendance state
  const [revertConfirmAttendance, setRevertConfirmAttendance] = useState<Attendance | null>(null);
  const [removeServiceConfirm, setRemoveServiceConfirm] = useState<Attendance | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleConfirmRemoveService = (atd: Attendance) => {
    const res = removeServiceFromComanda(atd.id);
    if (res.success) {
      setFeedbackMessage({
        type: 'success',
        text: `Serviço "${atd.serviceName}" foi removido da comanda com sucesso!`,
      });
      setTimeout(() => setFeedbackMessage(null), 5000);
    } else {
      setFeedbackMessage({
        type: 'error',
        text: res.error || 'Erro ao remover serviço da comanda.',
      });
    }
    setRemoveServiceConfirm(null);
  };

  const handleConfirmRevert = (atd: Attendance) => {
    const res = revertAttendance(atd.id);
    if (res.success) {
      setFeedbackMessage({
        type: 'success',
        text: `Atendimento de "${atd.serviceName}" foi revertido com sucesso! O agendamento retornou para a lista de aguardando início sem alterar a agenda.`,
      });
      setRevertConfirmAttendance(null);
      setTimeout(() => setFeedbackMessage(null), 5000);
    } else {
      setFeedbackMessage({
        type: 'error',
        text: res.error || 'Erro ao reverter atendimento.',
      });
      setTimeout(() => setFeedbackMessage(null), 5000);
    }
  };

  const todayStr = getTodayDate();
  const yesterdayStr = getYesterdayDate();

  // Date filter mode: 'hoje' | 'ontem' | 'custom' | 'historico'
  const [dateFilterMode, setDateFilterMode] = useState<'hoje' | 'ontem' | 'custom' | 'historico'>('hoje');
  const [selectedCustomDate, setSelectedCustomDate] = useState<string>(todayStr);

  // Search by client name, phone or service
  const [searchTerm, setSearchTerm] = useState('');

  // Status filter: 'todas' | 'quitadas' | 'em_atendimento'
  const [statusFilter, setStatusFilter] = useState<'todas' | 'quitadas' | 'em_atendimento'>('todas');

  const activeDate = useMemo(() => {
    if (dateFilterMode === 'hoje') return todayStr;
    if (dateFilterMode === 'ontem') return yesterdayStr;
    if (dateFilterMode === 'custom') return selectedCustomDate;
    return null; // 'historico' = all dates
  }, [dateFilterMode, todayStr, yesterdayStr, selectedCustomDate]);

  // Appointments ready to be started (today)
  const readyAppointments = useMemo(() => {
    return appointments.filter(a => {
      if (a.date !== todayStr) return false;
      if (!['agendado', 'confirmado'].includes(a.status)) return false;
      if (isProfessional && filterMode === 'meus' && myProfId && a.professionalId !== myProfId) {
        return false;
      }
      return true;
    });
  }, [appointments, todayStr, isProfessional, filterMode, myProfId]);

  const handleStartFromAppointment = (aptId: string) => {
    startAttendance(aptId);
  };

  const handleStartAdHoc = (e: React.FormEvent) => {
    e.preventDefault();
    setStartError(null);

    if (!selectedClientId) {
      setStartError('Selecione uma cliente.');
      return;
    }
    if (!selectedServiceId) {
      setStartError('Selecione um serviço.');
      return;
    }

    const profToUse = isProfessional && myProfId ? myProfId : selectedProfId;
    const res = startAttendance(undefined, selectedClientId, selectedServiceId, profToUse);
    if (!res.success) {
      setStartError(res.error || 'Erro ao iniciar atendimento.');
    } else {
      setIsStartingNew(false);
      setSelectedClientId('');
      setSelectedServiceId('');
      setSelectedProfId(myProfId || '');
    }
  };

  // Filter attendances based on role/filter and strictly exclude canceled or deleted appointments from the queue
  const filteredAttendances = useMemo(() => {
    const canceledOrDeletedAptIds = new Set(
      appointments
        .filter(apt => apt.status === 'cancelado' || apt.status === 'nao_compareceu' || !!(apt as any).deletedAt)
        .map(apt => apt.id)
    );

    return attendances.filter(a => {
      // Immediately purge from queue if linked appointment was canceled or deleted
      if (a.appointmentId && canceledOrDeletedAptIds.has(a.appointmentId) && (!a.finishedAt || a.paymentStatus !== 'pago')) {
        return false;
      }
      if (isProfessional && filterMode === 'meus' && myProfId) {
        return a.professionalId === myProfId;
      }
      return true;
    });
  }, [attendances, appointments, isProfessional, filterMode, myProfId]);

  interface ComandaGroup {
    groupKey: string;
    clientId: string;
    client: any;
    date: string;
    attendances: Attendance[];
    comanda?: Comanda;
    subtotal: number;
    netTotal: number;
    paidTotal: number;
    isFullyPaid: boolean;
    hasOpenService: boolean;
  }

  // Group attendances and comandas by Client and Date (Supports Today, Yesterday, Any Specific Date or Full History)
  const displayedComandas = useMemo<ComandaGroup[]>(() => {
    const map = new Map<string, ComandaGroup>();

    // 1. Process filtered attendances
    filteredAttendances.forEach(atd => {
      const atdDate = atd.date || atd.createdAt?.substring(0, 10) || todayStr;

      // Filter by date if activeDate is specified
      if (activeDate && atdDate !== activeDate && !atd.createdAt?.startsWith(activeDate)) {
        return;
      }

      const key = `${atd.clientId}___${atdDate}`;
      if (!map.has(key)) {
        const cli = clients.find(c => c.id === atd.clientId) || {
          id: atd.clientId,
          name: atd.clientName || 'Cliente',
          phone: '',
        };
        map.set(key, {
          groupKey: key,
          clientId: atd.clientId,
          client: cli,
          date: atdDate,
          attendances: [],
          subtotal: 0,
          netTotal: 0,
          paidTotal: 0,
          isFullyPaid: false,
          hasOpenService: false,
        });
      }

      const group = map.get(key)!;
      group.attendances.push(atd);
      group.subtotal += atd.grossValue || atd.netValue || 0;
      group.netTotal += atd.netValue || atd.grossValue || 0;
      if (atd.paymentStatus === 'pago') {
        group.paidTotal += atd.paidAmount || atd.netValue || 0;
      }
      if (!atd.finishedAt) {
        group.hasOpenService = true;
      }
    });

    // 2. Also incorporate past or existing comandas from storage
    comandas.forEach(cmd => {
      const cmdDate = cmd.date || cmd.createdAt?.substring(0, 10) || todayStr;
      if (activeDate && cmdDate !== activeDate && !cmd.createdAt?.startsWith(activeDate)) {
        return;
      }

      const key = `${cmd.clientId}___${cmdDate}`;
      if (!map.has(key)) {
        // In professional mode, check if any attendance was for this professional
        if (isProfessional && filterMode === 'meus') {
          const relatedAtds = attendances.filter(a => 
            cmd.attendanceIds?.includes(a.id) || (a.clientId === cmd.clientId && a.date === cmdDate)
          );
          if (!relatedAtds.some(a => a.professionalId === myProfId)) {
            return;
          }
        }

        const cli = clients.find(c => c.id === cmd.clientId) || {
          id: cmd.clientId,
          name: cmd.clientName || 'Cliente',
          phone: cmd.clientPhone || '',
        };

        map.set(key, {
          groupKey: key,
          clientId: cmd.clientId,
          client: cli,
          date: cmdDate,
          attendances: [],
          comanda: cmd,
          subtotal: cmd.subtotal || cmd.netTotal || 0,
          netTotal: cmd.netTotal || cmd.subtotal || 0,
          paidTotal: cmd.paidTotal || 0,
          isFullyPaid: cmd.status === 'pago',
          hasOpenService: false,
        });
      }

      const group = map.get(key)!;
      group.comanda = cmd;
      if (cmd.netTotal > 0) {
        group.netTotal = cmd.netTotal;
      }
      if (cmd.paidTotal > 0) {
        group.paidTotal = cmd.paidTotal;
      }
    });

    // 3. For each group, link missing attendances and compute quitada/open status accurately
    map.forEach(group => {
      if (group.comanda && group.attendances.length === 0) {
        const cmdAtds = attendances.filter(a => group.comanda!.attendanceIds?.includes(a.id));
        group.attendances = cmdAtds;
      }

      // ACCURATE QUITADA COMPUTATION:
      // A comanda is Quitada if comanda.status === 'pago' OR if all services are paid
      const isCmdPaid = group.comanda && group.comanda.status === 'pago';
      const areAllAtdsPaid = group.attendances.length > 0 && group.attendances.every(a => a.paymentStatus === 'pago');
      group.isFullyPaid = Boolean(isCmdPaid || areAllAtdsPaid);

      if (group.attendances.length > 0) {
        group.hasOpenService = group.attendances.some(a => !a.finishedAt);
      }
    });

    let list = Array.from(map.values());

    // 4. Status filter
    if (statusFilter === 'quitadas') {
      list = list.filter(g => g.isFullyPaid);
    } else if (statusFilter === 'em_atendimento') {
      list = list.filter(g => !g.isFullyPaid);
    }

    // 5. Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      const qDigits = q.replace(/\D/g, '');
      list = list.filter(g => {
        const nameMatch = g.client.name.toLowerCase().includes(q);
        const phoneMatch = qDigits && (g.client.phone || '').replace(/\D/g, '').includes(qDigits);
        const serviceMatch = g.attendances.some(a => a.serviceName.toLowerCase().includes(q));
        const profMatch = g.attendances.some(a => a.professionalName.toLowerCase().includes(q));
        return nameMatch || phoneMatch || serviceMatch || profMatch;
      });
    }

    // 6. Sort: newest date first, then pending first, then by client name
    list.sort((a, b) => {
      if (a.date !== b.date) {
        return b.date.localeCompare(a.date);
      }
      if (a.isFullyPaid !== b.isFullyPaid) {
        return a.isFullyPaid ? 1 : -1;
      }
      return a.client.name.localeCompare(b.client.name);
    });

    return list;
  }, [filteredAttendances, comandas, attendances, clients, activeDate, todayStr, isProfessional, filterMode, myProfId, statusFilter, searchTerm]);

  const todayComandas = displayedComandas;

  // In-progress single services (filtered by activeDate or today)
  const inProgressAttendances = useMemo(() => {
    return filteredAttendances.filter(a => !a.finishedAt && (a.date === (activeDate || todayStr) || a.createdAt?.startsWith(activeDate || todayStr)));
  }, [filteredAttendances, activeDate, todayStr]);

  return (
    <div className="space-y-6 animate-fade-in pb-12 font-sans">
      {/* Header Banner */}
      <div className="bg-tb-white rounded-3xl p-6 sm:p-8 border border-tb-rose-light/50 shadow-soft flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase font-bold tracking-widest text-tb-rose-primary">
              Recepção, Execução & Comandas
            </span>
            {isProfessional && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-tb-rose-blush text-tb-rose-primary border border-tb-rose-light">
                Perfil: {myProf?.name} ({myProf?.specialty})
              </span>
            )}
          </div>
          <h2 className="font-serif-brand text-3xl font-bold text-tb-brown-dark">
            Atendimentos & Comandas do Salão
          </h2>
          <p className="text-xs text-tb-gray-neutral mt-1">
            Inicie atendimentos, registre consumo de produtos e faça o fechamento unificado da comanda da cliente.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Quick toggle for professional */}
          {isProfessional && (
            <div className="flex bg-tb-ivory p-1 rounded-2xl border border-tb-rose-light/70 text-xs">
              <button
                type="button"
                onClick={() => setFilterMode('meus')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  filterMode === 'meus' ? 'bg-tb-rose-primary text-white shadow-xs' : 'text-tb-brown-dark hover:bg-tb-beige-light'
                }`}
              >
                Meus Atendimentos
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('todas')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  filterMode === 'todas' ? 'bg-tb-rose-primary text-white shadow-xs' : 'text-tb-brown-dark hover:bg-tb-beige-light'
                }`}
              >
                Geral do Salão
              </button>
            </div>
          )}

          <button
            onClick={() => setIsStartingNew(!isStartingNew)}
            className="px-5 py-2.5 rounded-2xl bg-tb-rose-primary hover:bg-[#b57f8c] text-white text-xs font-bold shadow-soft hover:shadow-premium transition-all flex items-center justify-center gap-2 shrink-0"
          >
            <Play className="w-4 h-4 fill-current" />
            {isStartingNew ? 'Fechar Início Avulso' : 'Iniciar Atendimento Avulso'}
          </button>
        </div>
      </div>

      {/* Reversion Feedback Notification */}
      {feedbackMessage && (
        <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 animate-fade-in shadow-soft ${
          feedbackMessage.type === 'success'
            ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
            : 'bg-rose-50 border-rose-300 text-rose-950'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-base">{feedbackMessage.type === 'success' ? '✓' : '⚠️'}</span>
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-xs opacity-60 hover:opacity-100 font-bold px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Ad-hoc Attendance Box */}
      {isStartingNew && (
        <form onSubmit={handleStartAdHoc} className="bg-tb-ivory rounded-3xl p-6 border border-tb-rose-light shadow-soft space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="font-serif-brand text-xl font-bold text-tb-brown-dark">
              Iniciar Atendimento Imediato (Sem Agendamento Prévio)
            </h3>
            <span className="text-xs text-tb-gray-neutral">
              Início às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {startError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{startError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-tb-brown-dark mb-1">Cliente *</label>
              <input
                type="text"
                placeholder="Filtrar cliente por nome..."
                value={clientSearch}
                onChange={e => {
                  const val = e.target.value;
                  setClientSearch(val);
                  const q = val.trim().toLowerCase();
                  if (q) {
                    const firstMatch = clients.find(c => !c.isArchived && c.name.toLowerCase().includes(q));
                    if (firstMatch) setSelectedClientId(firstMatch.id);
                  }
                }}
                className="w-full text-xs px-3 py-1.5 rounded-xl border border-tb-rose-light bg-tb-white mb-1"
              />
              <select
                value={selectedClientId}
                onChange={e => setSelectedClientId(e.target.value)}
                required
                className="w-full text-xs px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-white text-tb-brown-dark"
              >
                <option value="">Selecione a cliente...</option>
                {clients.filter(c => !c.isArchived).map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-tb-brown-dark mb-1">Serviço *</label>
              <select
                value={selectedServiceId}
                onChange={e => setSelectedServiceId(e.target.value)}
                required
                className="w-full text-xs px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-white text-tb-brown-dark"
              >
                <option value="">Selecione o serviço...</option>
                {services.filter(s => s.isActive).map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.durationMinutes} min ({formatBRL(s.price)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-tb-brown-dark mb-1">Profissional Responsável *</label>
              <select
                value={isProfessional && myProfId ? myProfId : selectedProfId}
                onChange={e => setSelectedProfId(e.target.value)}
                disabled={isProfessional}
                required
                className="w-full text-xs px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-white text-tb-brown-dark"
              >
                <option value="">Selecione a profissional...</option>
                {activeProfessionals.map(p => (
                  <option key={p.id} value={p.id}>{p.name} — {p.specialty}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsStartingNew(false)}
              className="px-4 py-2 text-xs font-semibold text-tb-brown-soft"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm"
            >
              Dar Início ao Atendimento
            </button>
          </div>
        </form>
      )}

      {/* Ready Appointments from Today's Schedule (With Iniciar Button for Authorized Roles) */}
      {readyAppointments.length > 0 && (
        <div className="bg-tb-white rounded-3xl p-6 border border-tb-rose-light/50 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif-brand text-xl font-bold text-tb-brown-dark">
                Clientes Agendadas Aguardando Início ({readyAppointments.length})
              </h3>
              <p className="text-xs text-tb-gray-neutral">
                Clique em Iniciar para marcar o início da sessão e registrar o horário
              </p>
            </div>
            <span className="text-xs font-bold text-tb-rose-primary bg-tb-rose-blush px-3 py-1 rounded-full">
              Prontas para Atender
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {readyAppointments.map(apt => (
              <div
                key={apt.id}
                className="p-4 rounded-2xl bg-tb-ivory border border-tb-rose-light/60 flex items-center justify-between gap-3 hover:border-tb-rose-primary/50 transition-all shadow-2xs"
              >
                <div>
                  <span className="text-xs font-bold text-tb-brown-dark block">
                    {apt.startTime} — {apt.clientName}
                  </span>
                  <p className="text-[11px] text-tb-rose-primary font-bold mt-0.5">
                    {apt.serviceName}
                  </p>
                  <p className="text-[10px] text-tb-gray-neutral">
                    Com <span className="font-semibold text-tb-brown-dark">{apt.professionalName}</span>
                    {(!isProfessional || apt.professionalId === myProfId) && ` • ${formatBRL(apt.price)}`}
                  </p>
                </div>

                {(!isProfessional || apt.professionalId === myProfId) ? (
                  <button
                    onClick={() => handleStartFromAppointment(apt.id)}
                    className="px-3.5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm flex items-center gap-1.5 shrink-0"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Iniciar
                  </button>
                ) : (
                  <span className="text-[10px] text-tb-gray-neutral italic px-2 py-1 bg-tb-white rounded-lg border border-tb-rose-light/40">
                    Agenda Colega
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION: FILTROS DE DATA & HISTÓRICO DE COMANDAS */}
      <div className="bg-tb-white rounded-3xl p-5 sm:p-6 border border-tb-rose-light/50 shadow-soft space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Quick Date Selector Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-tb-brown-dark flex items-center gap-1.5 mr-1">
              <Calendar className="w-4 h-4 text-tb-rose-primary" />
              Período:
            </span>

            <button
              type="button"
              onClick={() => setDateFilterMode('hoje')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                dateFilterMode === 'hoje'
                  ? 'bg-tb-rose-primary text-white shadow-soft'
                  : 'bg-tb-ivory text-tb-brown-dark hover:bg-tb-rose-blush border border-tb-rose-light/60'
              }`}
            >
              Hoje
            </button>

            <button
              type="button"
              onClick={() => setDateFilterMode('ontem')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                dateFilterMode === 'ontem'
                  ? 'bg-tb-rose-primary text-white shadow-soft'
                  : 'bg-tb-ivory text-tb-brown-dark hover:bg-tb-rose-blush border border-tb-rose-light/60'
              }`}
            >
              Ontem
            </button>

            <button
              type="button"
              onClick={() => setDateFilterMode('historico')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                dateFilterMode === 'historico'
                  ? 'bg-tb-rose-primary text-white shadow-soft'
                  : 'bg-tb-ivory text-tb-brown-dark hover:bg-tb-rose-blush border border-tb-rose-light/60'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Todas as Datas (Histórico)
            </button>

            {/* Custom Date Input */}
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs transition-all ${
              dateFilterMode === 'custom'
                ? 'bg-tb-rose-blush/60 border-tb-rose-primary ring-1 ring-tb-rose-primary/30'
                : 'bg-tb-ivory border-tb-rose-light/60'
            }`}>
              <CalendarDays className="w-3.5 h-3.5 text-tb-rose-primary" />
              <span className="text-[11px] text-tb-brown-soft font-semibold">Outro dia:</span>
              <input
                type="date"
                value={selectedCustomDate}
                onChange={(e) => {
                  setSelectedCustomDate(e.target.value);
                  setDateFilterMode('custom');
                }}
                className="bg-transparent text-xs font-bold text-tb-brown-dark outline-none cursor-pointer"
              />
            </div>
          </div>

          {/* Search Bar & Status Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-tb-gray-neutral" />
              <input
                type="text"
                placeholder="Buscar cliente, tel ou serviço..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs pl-8 pr-7 py-1.5 rounded-xl border border-tb-rose-light bg-tb-ivory/60 text-tb-brown-dark placeholder:text-tb-gray-neutral/60 focus:outline-none focus:border-tb-rose-primary"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-tb-gray-neutral hover:text-tb-brown-dark"
                >
                  ✕
                </button>
              )}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="text-xs px-3 py-1.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark font-semibold focus:outline-none focus:border-tb-rose-primary cursor-pointer"
            >
              <option value="todas">Todos os Status</option>
              <option value="quitadas">✓ Somente Quitadas</option>
              <option value="em_atendimento">⏳ Somente Em Atendimento / Pendentes</option>
            </select>
          </div>
        </div>
      </div>

      {/* SECTION: COMANDAS LIST VIEW */}
      <div className="bg-tb-white rounded-3xl p-6 border border-tb-rose-light/50 shadow-soft space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-serif-brand text-2xl font-bold text-tb-brown-dark">
                {dateFilterMode === 'hoje'
                  ? `Comandas de Hoje (${displayedComandas.length})`
                  : dateFilterMode === 'ontem'
                  ? `Comandas de Ontem (${displayedComandas.length})`
                  : dateFilterMode === 'historico'
                  ? `Histórico de Comandas (${displayedComandas.length})`
                  : `Comandas de ${formatDateBR(selectedCustomDate)} (${displayedComandas.length})`}
              </h3>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                {dateFilterMode === 'hoje'
                  ? `Hoje (${formatDateBR(todayStr)})`
                  : dateFilterMode === 'ontem'
                  ? `Ontem (${formatDateBR(yesterdayStr)})`
                  : dateFilterMode === 'historico'
                  ? 'Todas as Datas'
                  : formatDateBR(selectedCustomDate)}
              </span>
            </div>
            <p className="text-xs text-tb-gray-neutral mt-0.5">
              {dateFilterMode === 'hoje'
                ? 'Reúne os serviços realizados pela cliente hoje para conferência, baixa e fechamento unificado'
                : dateFilterMode === 'ontem'
                ? 'Comandas realizadas ontem para conferência, reabertura, troca de profissional ou reimpressão'
                : dateFilterMode === 'historico'
                ? 'Histórico completo de atendimentos e comandas finalizadas de todas as datas'
                : `Comandas e atendimentos registrados na data selecionada (${formatDateBR(selectedCustomDate)})`}
            </p>
          </div>

          {(searchTerm || statusFilter !== 'todas' || dateFilterMode !== 'hoje') && (
            <button
              type="button"
              onClick={() => {
                setDateFilterMode('hoje');
                setSearchTerm('');
                setStatusFilter('todas');
              }}
              className="text-xs font-semibold text-tb-rose-primary hover:underline self-start sm:self-auto"
            >
              Limpar Filtros e Voltar para Hoje
            </button>
          )}
        </div>

        {displayedComandas.length === 0 ? (
          <div className="p-12 text-center bg-tb-ivory rounded-3xl border border-tb-rose-light/40 space-y-2">
            <p className="text-sm font-semibold text-tb-brown-dark">
              Nenhuma comanda encontrada para este período ou filtro.
            </p>
            <p className="text-xs text-tb-gray-neutral">
              Tente selecionar outro dia, alternar para &ldquo;Ontem&rdquo;, &ldquo;Todas as Datas (Histórico)&rdquo; ou limpar os termos de busca.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setDateFilterMode('historico')}
                className="px-4 py-2 text-xs font-bold bg-tb-rose-primary hover:bg-[#b57f8c] text-white rounded-xl shadow-soft inline-flex items-center gap-1.5 transition-all"
              >
                <History className="w-3.5 h-3.5" />
                Ver Todas as Comandas do Histórico
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {displayedComandas.map(group => {
              const cli = group.client;
              const isToday = group.date === todayStr;
              const isYesterday = group.date === yesterdayStr;
              const dateLabel = isToday ? 'Hoje' : isYesterday ? 'Ontem' : formatDateBR(group.date);

              // Proxy attendance in case this group was loaded directly from a finalized comanda record
              const proxyAttendance: Attendance = group.attendances[0] || {
                id: group.comanda?.id || `atd_${group.clientId}_${group.date}`,
                clientId: group.clientId,
                clientName: group.client.name,
                serviceId: '',
                serviceName: 'Comanda Consolidada',
                professionalId: '',
                professionalName: 'Salão',
                date: group.date,
                startedAt: '08:00',
                finishedAt: 'Concluído',
                grossValue: group.subtotal,
                discountValue: group.comanda?.discountTotal || 0,
                discountType: 'fixed',
                netValue: group.netTotal,
                paymentStatus: group.isFullyPaid ? 'pago' : 'pendente',
                paidAmount: group.paidTotal,
                createdAt: group.comanda?.createdAt || new Date().toISOString(),
                comandaId: group.comanda?.id,
              };

              const displayTotal = group.netTotal || group.subtotal;

              return (
                <div
                  key={group.groupKey}
                  className="p-5 rounded-3xl bg-tb-ivory/80 border-2 border-tb-rose-light/80 shadow-soft flex flex-col justify-between space-y-4"
                >
                  {/* Comanda Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-serif-brand text-xl font-bold text-tb-brown-dark">
                          {cli.name}
                        </span>

                        {/* Date badge */}
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-tb-white text-tb-brown-dark border border-tb-rose-light shadow-2xs">
                          📅 {dateLabel}
                        </span>

                        {/* Paid/Open Badge */}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          group.isFullyPaid 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                            : group.hasOpenService 
                            ? 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse' 
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}>
                          {group.isFullyPaid ? '✓ Quitada' : group.hasOpenService ? 'Em Atendimento' : 'Pendente de Pagamento'}
                        </span>
                      </div>

                      <p className="text-[11px] text-tb-gray-neutral mt-0.5">
                        {group.attendances.length} serviço(s) • {formatDateBR(group.date)} • {cli.phone || 'Sem telefone'}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-tb-gray-neutral uppercase block font-semibold">Total Comanda</span>
                      <span className="text-lg font-bold text-tb-brown-dark">
                        {!isProfessional
                          ? formatBRL(displayTotal)
                          : formatBRL(group.attendances.filter(a => a.professionalId === myProfId).reduce((acc, a) => acc + (a.netValue || a.grossValue || 0), 0))
                        }
                        {isProfessional && group.attendances.some(a => a.professionalId !== myProfId) && (
                          <span className="block text-[9px] text-tb-gray-neutral font-normal">(Sua parte)</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Services List inside this Comanda */}
                  <div className="space-y-2 bg-tb-white p-3 rounded-2xl border border-tb-rose-light/50">
                    {group.attendances.length === 0 ? (
                      <div className="p-3 text-xs text-tb-gray-neutral italic bg-tb-ivory/60 rounded-xl">
                        Comanda registrada de {formatBRL(displayTotal)} em {formatDateBR(group.date)}.
                      </div>
                    ) : (
                      group.attendances.map(atd => {
                        const isMine = isProfessional && atd.professionalId === myProfId;

                        return (
                          <div
                            key={atd.id}
                            className="p-2.5 rounded-xl bg-tb-ivory/60 border border-tb-rose-light/40 flex items-center justify-between gap-3 text-xs"
                          >
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-tb-brown-dark">
                                  {atd.serviceName}
                                </span>
                                {atd.finishedAt ? (
                                  <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-semibold">
                                    Concluído às {atd.finishedAt}
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded font-semibold animate-pulse">
                                    Na Cadeira (Início: {atd.startedAt})
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-tb-gray-neutral mt-0.5">
                                Profissional: <span className="font-semibold text-tb-brown-dark">{atd.professionalName}</span>
                                {(!isProfessional || isMine) && ` • ${formatBRL(atd.netValue || atd.grossValue)}`}
                              </p>
                            </div>

                            {/* Quick Actions for this Service */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Product Consumption Button */}
                              <button
                                type="button"
                                onClick={() => setAttendanceForConsumption(atd)}
                                className="px-2 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-[10px] font-bold flex items-center gap-1 transition-colors"
                                title="Registrar produtos e gramatura gastos neste serviço"
                              >
                                <Scale className="w-3 h-3" />
                                Produtos
                              </button>

                              {/* Voltar para Solicitação / Reverter Início Errôneo */}
                              {(!isProfessional || isMine) && !group.isFullyPaid && (
                                <button
                                  type="button"
                                  onClick={() => setRevertConfirmAttendance(atd)}
                                  className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold flex items-center gap-1 transition-colors"
                                  title="Voltar atendimento para solicitação/agendamento caso tenha sido iniciado por engano"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  Voltar
                                </button>
                              )}

                              {/* Remover Serviço da Comanda */}
                              {(!isProfessional || isMine) && !group.isFullyPaid && (
                                <button
                                  type="button"
                                  onClick={() => setRemoveServiceConfirm(atd)}
                                  className="px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[10px] font-bold flex items-center gap-1 transition-colors"
                                  title="Remover este serviço da comanda"
                                >
                                  <Trash2 className="w-3 h-3 text-red-600" />
                                  Remover
                                </button>
                              )}

                              {/* Individual Finish Button */}
                              {!atd.finishedAt && (!isProfessional || isMine) && (
                                <button
                                  type="button"
                                  onClick={() => onOpenFinishAttendance(atd)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1 transition-colors"
                                  title="Concluir este serviço"
                                >
                                  <Check className="w-3 h-3" />
                                  Finalizar
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Comanda Footer: Reopen & Pay / Receipt Buttons */}
                  <div className="pt-2 border-t border-tb-rose-light/40 flex items-center justify-between gap-2">
                    <span className="text-xs text-tb-brown-soft font-semibold">
                      {group.attendances.length > 1 ? 'Múltiplos serviços' : 'Serviço individual'}
                    </span>

                    <div className="flex items-center gap-2">
                      {group.isFullyPaid && !isProfessional && (
                        <button
                          type="button"
                          onClick={() => {
                            const isConfirmed = window.confirm(
                              `Deseja reabrir a comanda de "${cli.name}" (${dateLabel}) para trocar a profissional ou corrigir valores?\n\nO caixa anterior será estornado para permitir a nova finalização sem duplicidade.`
                            );
                            if (!isConfirmed) return;
                            const res = reopenComanda(group.comanda?.id || group.attendances[0]?.comandaId || cli.id, group.date);
                            if (res.success) {
                              onOpenFinishAttendance(proxyAttendance);
                            }
                          }}
                          className="px-3 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-soft flex items-center gap-1.5 transition-all"
                          title="Reabrir comanda para trocar profissional sem duplicidade"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Reabrir Comanda
                        </button>
                      )}

                      <button
                        onClick={() => onOpenFinishAttendance(proxyAttendance)}
                        className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-soft flex items-center gap-1.5 transition-all"
                      >
                        <Receipt className="w-4 h-4" />
                        {group.isFullyPaid ? 'Ver Comanda / Recibo' : 'Fechar Comanda Unificada'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Product Consumption Modal */}
      <ProductConsumptionModal
        isOpen={!!attendanceForConsumption}
        onClose={() => setAttendanceForConsumption(null)}
        attendance={attendanceForConsumption}
      />

      {/* Revert Attendance Confirmation Modal */}
      {revertConfirmAttendance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tb-brown-dark/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-tb-white rounded-3xl p-6 max-w-md w-full border border-tb-rose-light/50 shadow-premium space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif-brand text-lg font-bold text-tb-brown-dark">
                  Voltar Atendimento para Agendamento
                </h3>
                <p className="text-xs text-tb-gray-neutral">
                  Reverter início errôneo na comanda
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-2 text-xs text-amber-950">
              <p>
                Deseja realmente voltar o atendimento de <strong className="text-tb-brown-dark">{revertConfirmAttendance.clientName}</strong> no serviço <strong className="text-tb-brown-dark">{revertConfirmAttendance.serviceName}</strong>?
              </p>
              <div className="text-[11px] text-amber-900 bg-white/80 p-2.5 rounded-xl border border-amber-200/70 space-y-1">
                <p className="font-bold flex items-center gap-1 text-emerald-800">
                  <span>✓</span> A agenda e a cliente permanecem 100% intactas
                </p>
                <p className="text-tb-brown-soft leading-relaxed">
                  O horário agendado não será excluído nem alterado na agenda. O agendamento voltará imediatamente para a lista de <em>"Clientes Agendadas Aguardando Início"</em>, pronto para ser iniciado no momento correto.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRevertConfirmAttendance(null)}
                className="px-4 py-2 rounded-xl border border-tb-rose-light text-tb-brown-dark hover:bg-tb-ivory text-xs font-bold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleConfirmRevert(revertConfirmAttendance)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-soft transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Sim, Voltar para Solicitação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Service From Comanda Confirmation Modal */}
      {removeServiceConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tb-brown-dark/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-tb-white rounded-3xl p-6 max-w-md w-full border border-tb-rose-light/50 shadow-premium space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif-brand text-lg font-bold text-tb-brown-dark">
                  Remover Serviço da Comanda
                </h3>
                <p className="text-xs text-tb-gray-neutral">
                  Exclusão de item da comanda
                </p>
              </div>
            </div>

            <div className="p-3 bg-red-50/70 border border-red-200 rounded-2xl space-y-2 text-xs text-red-950">
              <p>
                Deseja remover o serviço <strong className="text-tb-brown-dark">{removeServiceConfirm.serviceName}</strong> ({removeServiceConfirm.professionalName}) da comanda de <strong className="text-tb-brown-dark">{removeServiceConfirm.clientName}</strong>?
              </p>
              <div className="text-[11px] text-tb-brown-soft bg-white/90 p-2.5 rounded-xl border border-red-200/70 space-y-1">
                <p className="font-semibold text-emerald-800 flex items-center gap-1">
                  <span>✓</span> O valor de {formatBRL(removeServiceConfirm.netValue || removeServiceConfirm.grossValue)} será deduzido da comanda
                </p>
                {removeServiceConfirm.appointmentId && (
                  <p className="text-tb-brown-soft">
                    O agendamento retornará com segurança ao status <strong>Agendado</strong> na agenda para que não seja perdido.
                  </p>
                )}
                {removeServiceConfirm.packageId && (
                  <p className="text-emerald-700 font-medium">
                    A sessão de crédito de pacote será estornada de volta ao pacote da cliente.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRemoveServiceConfirm(null)}
                className="px-4 py-2 rounded-xl border border-tb-rose-light text-tb-brown-dark hover:bg-tb-ivory text-xs font-bold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleConfirmRemoveService(removeServiceConfirm)}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-soft transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Sim, Remover da Comanda
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
