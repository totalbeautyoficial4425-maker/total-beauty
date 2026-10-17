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
  RotateCcw
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Attendance } from '../types';
import { formatBRL, formatDateBR } from '../utils/formatters';
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
    startAttendance,
    revertAttendance,
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
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  const todayStr = new Date().toISOString().split('T')[0];

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

  // Filter attendances based on role/filter
  const filteredAttendances = useMemo(() => {
    return attendances.filter(a => {
      if (isProfessional && filterMode === 'meus' && myProfId) {
        return a.professionalId === myProfId;
      }
      return true;
    });
  }, [attendances, isProfessional, filterMode, myProfId]);

  // Group attendances by Client for Unified Comanda View (Today's Attendances)
  const todayComandas = useMemo(() => {
    const map = new Map<string, { client: any; attendances: Attendance[]; subtotal: number; isAllFinished: boolean }>();

    filteredAttendances.filter(a => a.date === todayStr).forEach(atd => {
      const cli = clients.find(c => c.id === atd.clientId) || { id: atd.clientId, name: atd.clientName, phone: '' };
      const groupKey = atd.clientId;
      if (!map.has(groupKey)) {
        map.set(groupKey, {
          client: cli,
          attendances: [],
          subtotal: 0,
          isAllFinished: true,
        });
      }
      const group = map.get(groupKey)!;
      group.attendances.push(atd);
      group.subtotal += atd.netValue || atd.grossValue || 0;
      if (!atd.finishedAt) {
        group.isAllFinished = false;
      }
    });

    return Array.from(map.values());
  }, [filteredAttendances, clients, todayStr]);

  // In-progress single services
  const inProgressAttendances = useMemo(() => {
    return filteredAttendances.filter(a => !a.finishedAt && a.date === todayStr);
  }, [filteredAttendances, todayStr]);

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

      {/* SECTION: COMANDAS DO DIA (FECHAMENTO UNIFICADO DA COMANDA DA CLIENTE) */}
      <div className="bg-tb-white rounded-3xl p-6 border border-tb-rose-light/50 shadow-soft space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif-brand text-2xl font-bold text-tb-brown-dark">
                Comandas do Dia ({todayComandas.length})
              </h3>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Visão Unificada
              </span>
            </div>
            <p className="text-xs text-tb-gray-neutral mt-0.5">
              Reúne todos os serviços realizados pela cliente hoje para conferência e fechamento unificado
            </p>
          </div>
        </div>

        {todayComandas.length === 0 ? (
          <div className="p-10 text-center bg-tb-ivory rounded-2xl border border-tb-rose-light/40 text-xs text-tb-gray-neutral">
            Nenhuma comanda aberta para o dia de hoje.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {todayComandas.map(group => {
              const cli = group.client;
              const hasOpenService = group.attendances.some(a => !a.finishedAt);
              const isFullyPaid = group.attendances.every(a => a.paymentStatus === 'pago');

              return (
                <div
                  key={cli.id}
                  className="p-5 rounded-3xl bg-tb-ivory/80 border-2 border-tb-rose-light/80 shadow-soft flex flex-col justify-between space-y-4"
                >
                  {/* Comanda Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-serif-brand text-xl font-bold text-tb-brown-dark">
                          {cli.name}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isFullyPaid 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : hasOpenService 
                            ? 'bg-amber-100 text-amber-800 animate-pulse' 
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {isFullyPaid ? '✓ Quitada' : hasOpenService ? 'Em Atendimento' : 'Pendente de Pagamento'}
                        </span>
                      </div>
                      <p className="text-[11px] text-tb-gray-neutral mt-0.5">
                        {group.attendances.length} serviço(s) realizados hoje • {cli.phone || ''}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-tb-gray-neutral uppercase block font-semibold">Total Comanda</span>
                      <span className="text-lg font-bold text-tb-brown-dark">
                        {!isProfessional
                          ? formatBRL(group.subtotal)
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
                    {group.attendances.map(atd => {
                      const isMine = isProfessional && atd.professionalId === myProfId;

                      return (
                        <div
                          key={atd.id}
                          className="p-2.5 rounded-xl bg-tb-ivory/60 border border-tb-rose-light/40 flex items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
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
                            {(!isProfessional || isMine) && (
                              <button
                                type="button"
                                onClick={() => setRevertConfirmAttendance(atd)}
                                className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold flex items-center gap-1 transition-colors"
                                title="Voltar atendimento para solicitação/agendamento caso tenha sido iniciado por engano"
                              >
                                <RotateCcw className="w-3 h-3" />
                                Voltar Atendimento
                              </button>
                            )}

                            {/* Individual Finish Button (Authorized Professional or Admin) */}
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
                    })}
                  </div>

                  {/* Comanda Footer: Unify & Pay Button */}
                  <div className="pt-2 border-t border-tb-rose-light/40 flex items-center justify-between">
                    <span className="text-xs text-tb-brown-soft font-semibold">
                      {group.attendances.length > 1 ? 'Múltiplos profissionais envolvidos' : 'Serviço individual'}
                    </span>

                    <button
                      onClick={() => onOpenFinishAttendance(group.attendances[0])}
                      className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-soft flex items-center gap-1.5 transition-all"
                    >
                      <Receipt className="w-4 h-4" />
                      {isFullyPaid ? 'Ver Comanda / Recibo' : 'Fechar Comanda Unificada'}
                    </button>
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
    </div>
  );
};
