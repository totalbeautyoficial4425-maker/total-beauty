import React, { useState } from 'react';
import { 
  Clock, 
  Play, 
  CheckCircle2, 
  Plus, 
  User, 
  DollarSign, 
  Sparkles, 
  AlertCircle,
  Calendar
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { Attendance } from '../types';
import { formatBRL, formatDateBR } from '../utils/formatters';

interface AtendimentosPageProps {
  onOpenFinishAttendance: (attendance: Attendance) => void;
  onOpenNewAppointment: () => void;
}

export const AtendimentosPage: React.FC<AtendimentosPageProps> = ({
  onOpenFinishAttendance,
  onOpenNewAppointment,
}) => {
  const { attendances, appointments, clients, services, professionals, startAttendance } = useData();

  // New ad-hoc attendance state
  const [isStartingNew, setIsStartingNew] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedProfId, setSelectedProfId] = useState('');
  const [startError, setStartError] = useState<string | null>(null);

  // Appointments ready to be started (agendados ou confirmados para hoje)
  const todayStr = new Date().toISOString().split('T')[0];
  const readyAppointments = appointments.filter(
    a => a.date === todayStr && ['agendado', 'confirmado'].includes(a.status)
  );

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

    const res = startAttendance(undefined, selectedClientId, selectedServiceId, selectedProfId);
    if (!res.success) {
      setStartError(res.error || 'Erro ao iniciar atendimento.');
    } else {
      setIsStartingNew(false);
      setSelectedClientId('');
      setSelectedServiceId('');
      setSelectedProfId('');
    }
  };

  // Group attendances into active (in progress) and finished
  const inProgressAttendances = attendances.filter(a => !a.finishedAt);
  const completedAttendances = attendances.filter(a => !!a.finishedAt);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header Card */}
      <div className="bg-tb-white rounded-3xl p-6 border border-tb-rose-light/50 shadow-soft flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-widest text-tb-rose-primary block mb-1">
            Recepção & Execução
          </span>
          <h2 className="font-serif-brand text-3xl font-bold text-tb-brown-dark">
            Atendimentos em Andamento
          </h2>
          <p className="text-xs text-tb-gray-neutral mt-1">
            Controle a chegada da cliente, início da sessão, tempo decorrido e encerramento com pagamento.
          </p>
        </div>

        <button
          onClick={() => setIsStartingNew(!isStartingNew)}
          className="px-5 py-2.5 rounded-2xl bg-tb-rose-primary hover:bg-[#b57f8c] text-white text-xs sm:text-sm font-semibold shadow-soft hover:shadow-premium transition-all flex items-center justify-center gap-2"
        >
          <Play className="w-4 h-4 fill-current" />
          {isStartingNew ? 'Fechar Início Avulso' : 'Iniciar Atendimento Avulso'}
        </button>
      </div>

      {/* Ad-hoc Attendance Box */}
      {isStartingNew && (
        <form onSubmit={handleStartAdHoc} className="bg-tb-ivory rounded-3xl p-6 border border-tb-rose-light shadow-soft space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="font-serif-brand text-xl font-bold text-tb-brown-dark">
              Iniciar Atendimento Imediato (Sem Agendamento Prévio)
            </h3>
            <span className="text-xs text-tb-gray-neutral">Início agora às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
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
              <select
                value={selectedClientId}
                onChange={e => setSelectedClientId(e.target.value)}
                required
                className="w-full text-xs px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-white"
              >
                <option value="">Selecione a cliente...</option>
                {clients.filter(c => !c.isArchived).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-tb-brown-dark mb-1">Serviço *</label>
              <select
                value={selectedServiceId}
                onChange={e => setSelectedServiceId(e.target.value)}
                required
                className="w-full text-xs px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-white"
              >
                <option value="">Selecione o serviço...</option>
                {services.filter(s => s.isActive).map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({formatBRL(s.price)})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-tb-brown-dark mb-1">Profissional Responsável</label>
              <select
                value={selectedProfId}
                onChange={e => setSelectedProfId(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-white"
              >
                <option value="">Selecione o profissional...</option>
                {professionals.filter(p => p.isActive).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsStartingNew(false)}
              className="px-4 py-2 text-xs text-tb-brown-soft"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm"
            >
              Dar Início ao Atendimento
            </button>
          </div>
        </form>
      )}

      {/* Ready Appointments from Today's Schedule */}
      {readyAppointments.length > 0 && (
        <div className="bg-tb-white rounded-3xl p-6 border border-tb-rose-light/50 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif-brand text-xl font-bold text-tb-brown-dark">
                Clientes Agendadas Prontas para Atendimento
              </h3>
              <p className="text-xs text-tb-gray-neutral">
                Clientes agendadas para hoje que aguardam início do procedimento
              </p>
            </div>
            <span className="text-xs font-semibold text-tb-rose-primary bg-tb-rose-blush px-3 py-1 rounded-full">
              {readyAppointments.length} aguardando
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {readyAppointments.map(apt => (
              <div
                key={apt.id}
                className="p-4 rounded-2xl bg-tb-ivory border border-tb-rose-light/60 flex items-center justify-between gap-3 hover:border-tb-rose-primary/50 transition-all"
              >
                <div>
                  <span className="text-xs font-bold text-tb-brown-dark block">
                    {apt.startTime} — {apt.clientName}
                  </span>
                  <p className="text-[11px] text-tb-rose-primary font-medium mt-0.5">
                    {apt.serviceName}
                  </p>
                  <p className="text-[10px] text-tb-gray-neutral">
                    Com {apt.professionalName} • {formatBRL(apt.price)}
                  </p>
                </div>

                <button
                  onClick={() => handleStartFromAppointment(apt.id)}
                  className="px-3.5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm flex items-center gap-1.5 shrink-0"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Iniciar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Currently In-Progress Attendances */}
      <div className="bg-tb-white rounded-3xl p-6 border border-tb-rose-light/50 shadow-soft space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif-brand text-xl font-bold text-tb-brown-dark">
              Na Cadeira / Em Execução Agora ({inProgressAttendances.length})
            </h3>
            <p className="text-xs text-tb-gray-neutral">
              Finalize quando o serviço for concluído para registrar o pagamento
            </p>
          </div>
        </div>

        {inProgressAttendances.length === 0 ? (
          <div className="p-10 text-center bg-tb-ivory rounded-2xl border border-tb-rose-light/40 text-xs text-tb-gray-neutral">
            Nenhum atendimento em andamento no momento. Inicie um agendamento ou adicione um atendimento avulso.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {inProgressAttendances.map(atd => (
              <div
                key={atd.id}
                className="p-5 rounded-2xl bg-gradient-to-br from-tb-ivory to-tb-white border-2 border-tb-rose-light shadow-soft flex flex-col justify-between space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 animate-pulse">
                      Em Execução
                    </span>
                    <h4 className="font-serif-brand text-2xl font-bold text-tb-brown-dark mt-2">
                      {atd.clientName}
                    </h4>
                    <p className="text-xs font-medium text-tb-rose-primary mt-0.5">
                      {atd.serviceName}
                    </p>
                    <p className="text-[11px] text-tb-gray-neutral mt-1">
                      Profissional: <span className="text-tb-brown-dark font-medium">{atd.professionalName}</span>
                    </p>
                  </div>

                  <div className="p-3 bg-tb-white rounded-2xl border border-tb-rose-light text-center shadow-2xs">
                    <span className="text-[10px] text-tb-gray-neutral block">Início às</span>
                    <span className="text-sm font-bold text-tb-brown-dark">{atd.startedAt}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-tb-rose-light/40 flex items-center justify-between">
                  <span className="text-sm font-bold text-tb-brown-dark">
                    Valor previsto: {formatBRL(atd.netValue)}
                  </span>

                  <button
                    onClick={() => onOpenFinishAttendance(atd)}
                    className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Concluir & Pagar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historical Completed Attendances */}
      <div className="bg-tb-white rounded-3xl border border-tb-rose-light/50 shadow-soft overflow-hidden">
        <div className="p-5 bg-tb-ivory border-b border-tb-rose-light/40">
          <h3 className="font-serif-brand text-xl font-bold text-tb-brown-dark">
            Histórico Recente de Atendimentos Concluídos
          </h3>
          <p className="text-xs text-tb-gray-neutral">
            Sessões finalizadas com registro de pagamento
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-tb-ivory/60 text-tb-brown-soft font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Data / Horário</th>
                <th className="px-6 py-3.5">Cliente</th>
                <th className="px-6 py-3.5">Serviço Realizado</th>
                <th className="px-6 py-3.5">Profissional</th>
                <th className="px-6 py-3.5">Valor Líquido</th>
                <th className="px-6 py-3.5">Pagamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tb-rose-light/20 text-tb-brown-dark">
              {completedAttendances.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-tb-gray-neutral">
                    Nenhum atendimento finalizado registrado ainda.
                  </td>
                </tr>
              ) : (
                completedAttendances.map(atd => (
                  <tr key={atd.id} className="hover:bg-tb-ivory/40">
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      {formatDateBR(atd.date)} ({atd.startedAt} - {atd.finishedAt})
                    </td>
                    <td className="px-6 py-3.5 font-bold">{atd.clientName}</td>
                    <td className="px-6 py-3.5">{atd.serviceName}</td>
                    <td className="px-6 py-3.5">{atd.professionalName}</td>
                    <td className="px-6 py-3.5 font-bold text-emerald-700">{formatBRL(atd.netValue)}</td>
                    <td className="px-6 py-3.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {atd.paymentStatus} ({atd.paymentMethod?.replace('_', ' ').toUpperCase() || 'PIX'})
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
