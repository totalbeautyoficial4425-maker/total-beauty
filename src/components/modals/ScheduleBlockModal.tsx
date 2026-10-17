import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Lock, 
  Clock, 
  Calendar, 
  User, 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle,
  FileText
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { addMinutesToTime, formatDateBR, isTimeOverlapping } from '../../utils/formatters';

interface ScheduleBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string;
  initialTime?: string;
  initialProfessionalId?: string;
}

const COMMON_REASONS = [
  'Almoço',
  'Consulta Médica / Exames',
  'Compromisso Pessoal',
  'Curso / Treinamento',
  'Folga Parcial / Saída',
  'Serviço Externo / Evento',
  'Reunião de Equipe',
];

const TIME_OPTIONS = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
  '19:00', '19:30', '20:00', '20:30'
];

export const ScheduleBlockModal: React.FC<ScheduleBlockModalProps> = ({
  isOpen,
  onClose,
  initialDate,
  initialTime,
  initialProfessionalId,
}) => {
  const { currentUser } = useAuth();
  const { professionals, appointments, addScheduleBlock } = useData();

  const isProfessional = currentUser?.role === 'profissional';
  const myProf = professionals.find(p => 
    p.id === currentUser?.professionalId || 
    p.userId === currentUser?.id || 
    p.name.toLowerCase() === currentUser?.name.toLowerCase()
  );

  const activeProfessionals = useMemo(() => {
    return professionals.filter(p => p.isActive && p.id !== 'prof_thalita');
  }, [professionals]);

  const [professionalId, setProfessionalId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('12:00');
  const [endTime, setEndTime] = useState('13:00');
  const [reason, setReason] = useState('Almoço');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().split('T')[0];
      setDate(initialDate || today);
      setStartTime(initialTime || '12:00');
      setEndTime(initialTime ? addMinutesToTime(initialTime, 60) : '13:00');
      
      if (initialProfessionalId) {
        setProfessionalId(initialProfessionalId);
      } else if (isProfessional && myProf) {
        setProfessionalId(myProf.id);
      } else if (activeProfessionals.length > 0) {
        setProfessionalId(activeProfessionals[0].id);
      }

      setReason('Almoço');
      setNotes('');
      setFormError(null);
    }
  }, [isOpen, initialDate, initialTime, initialProfessionalId, isProfessional, myProf, activeProfessionals]);

  // Check if there are active client appointments in this interval
  const conflictingAppointments = useMemo(() => {
    if (!date || !startTime || !endTime || !professionalId) return [];
    return appointments.filter(apt => 
      apt.date === date &&
      apt.professionalId === professionalId &&
      !['cancelado', 'nao_compareceu'].includes(apt.status) &&
      isTimeOverlapping(startTime, endTime, apt.startTime, apt.endTime)
    );
  }, [appointments, date, startTime, endTime, professionalId]);

  if (!isOpen) return null;

  const handleApplyDuration = (minutes: number) => {
    if (startTime) {
      setEndTime(addMinutesToTime(startTime, minutes));
    }
  };

  const handleApplyFullPeriod = (period: 'tarde' | 'dia') => {
    if (period === 'tarde') {
      setStartTime('13:00');
      setEndTime('18:00');
    } else {
      setStartTime('08:00');
      setEndTime('19:00');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!professionalId) {
      setFormError('Por favor, selecione a profissional.');
      return;
    }
    if (!date) {
      setFormError('Por favor, selecione a data do bloqueio.');
      return;
    }
    if (!startTime || !endTime) {
      setFormError('Informe os horários de início e término.');
      return;
    }
    if (!reason.trim()) {
      setFormError('A justificativa do bloqueio é obrigatória.');
      return;
    }

    const res = addScheduleBlock({
      professionalId,
      date,
      startTime,
      endTime,
      reason: reason.trim(),
      notes: notes.trim() || undefined,
    });

    if (!res.success) {
      setFormError(res.error || 'Erro ao realizar o bloqueio.');
      return;
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-tb-brown-dark/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-tb-white rounded-3xl shadow-premium border border-amber-300 w-full max-w-xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-soft">
              <Lock className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-serif-brand text-lg sm:text-xl font-bold text-tb-brown-dark flex items-center gap-2">
                Bloquear Horário na Agenda
              </h3>
              <p className="text-xs text-tb-brown-soft">
                Indisponibilize um intervalo de horários com justificativa obrigatória
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-tb-gray-neutral hover:text-tb-brown-dark rounded-xl hover:bg-white/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* Professional and Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-tb-brown-dark mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-tb-rose-primary" />
                Profissional <span className="text-rose-600">*</span>
              </label>
              <select
                value={professionalId}
                onChange={e => setProfessionalId(e.target.value)}
                disabled={isProfessional && myProf !== undefined}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none disabled:opacity-80"
              >
                {activeProfessionals.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.specialty || 'Profissional'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-tb-brown-dark mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-tb-rose-primary" />
                Data do Bloqueio <span className="text-rose-600">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Time Range */}
          <div>
            <label className="block text-xs font-bold text-tb-brown-dark mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-tb-rose-primary" />
              Intervalo de Horários <span className="text-rose-600">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-tb-brown-soft font-semibold block mb-0.5">Início:</span>
                <select
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark font-bold"
                >
                  {TIME_OPTIONS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-[11px] text-tb-brown-soft font-semibold block mb-0.5">Término:</span>
                <select
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark font-bold"
                >
                  {TIME_OPTIONS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Duration Buttons */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <button
                type="button"
                onClick={() => handleApplyDuration(30)}
                className="text-[10px] px-2.5 py-1 rounded-lg bg-tb-ivory hover:bg-amber-100 text-tb-brown-soft hover:text-amber-900 border border-tb-rose-light/50 transition-colors font-semibold"
              >
                + 30 min
              </button>
              <button
                type="button"
                onClick={() => handleApplyDuration(60)}
                className="text-[10px] px-2.5 py-1 rounded-lg bg-tb-ivory hover:bg-amber-100 text-tb-brown-soft hover:text-amber-900 border border-tb-rose-light/50 transition-colors font-semibold"
              >
                + 1 hora
              </button>
              <button
                type="button"
                onClick={() => handleApplyDuration(90)}
                className="text-[10px] px-2.5 py-1 rounded-lg bg-tb-ivory hover:bg-amber-100 text-tb-brown-soft hover:text-amber-900 border border-tb-rose-light/50 transition-colors font-semibold"
              >
                + 1h30
              </button>
              <button
                type="button"
                onClick={() => handleApplyDuration(120)}
                className="text-[10px] px-2.5 py-1 rounded-lg bg-tb-ivory hover:bg-amber-100 text-tb-brown-soft hover:text-amber-900 border border-tb-rose-light/50 transition-colors font-semibold"
              >
                + 2 horas
              </button>
              <button
                type="button"
                onClick={() => handleApplyFullPeriod('tarde')}
                className="text-[10px] px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors font-bold"
              >
                Tarde toda (13h-18h)
              </button>
              <button
                type="button"
                onClick={() => handleApplyFullPeriod('dia')}
                className="text-[10px] px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors font-bold"
              >
                Dia todo (08h-19h)
              </button>
            </div>
          </div>

          {/* Justification (Mandatory) */}
          <div>
            <label className="block text-xs font-bold text-tb-brown-dark mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-tb-rose-primary" />
                Justificativa do Bloqueio <span className="text-rose-600">*</span>
              </span>
              <span className="text-[11px] text-tb-brown-soft font-normal">
                (Obrigatória para registro)
              </span>
            </label>

            <textarea
              rows={2}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Descreva o motivo do bloqueio (ex: Almoço, Consulta médica, Treinamento...)"
              className="w-full text-xs p-3 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none resize-none"
              required
            />

            {/* Quick Reason Presets */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {COMMON_REASONS.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all font-medium ${
                    reason === r
                      ? 'bg-amber-500 text-white border-amber-600 shadow-2xs font-bold'
                      : 'bg-tb-ivory text-tb-brown-soft hover:bg-amber-50 hover:text-amber-900 border-tb-rose-light/60'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-semibold text-tb-brown-soft mb-1">
              Observações adicionais (opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ex: Retorno previsto às 13:30, telefone de emergência..."
              className="w-full text-xs px-3.5 py-2 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark"
            />
          </div>

          {/* Conflict Alert if there are client appointments in that interval */}
          {conflictingAppointments.length > 0 && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-900 space-y-1.5 animate-fade-in">
              <div className="flex items-center gap-2 font-bold text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Atenção: Existem agendamentos de clientes neste horário!</span>
              </div>
              <p className="text-[11px] text-amber-800/90 pl-6">
                A profissional já possui {conflictingAppointments.length} atendimento(s) marcado(s) entre {startTime} e {endTime}:
              </p>
              <ul className="list-disc pl-10 text-[11px] text-amber-900 space-y-0.5">
                {conflictingAppointments.map(apt => (
                  <li key={apt.id}>
                    <span className="font-bold">{apt.startTime} - {apt.endTime}</span>: {apt.clientName} ({apt.serviceName})
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-amber-700 font-semibold pl-6 pt-1">
                Ao confirmar, o bloqueio será salvo, mas lembre-se de avisar ou reagendar os atendimentos das clientes envolvidas.
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-tb-rose-light/30">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-tb-brown-soft hover:text-tb-brown-dark rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-soft hover:shadow-premium transition-all flex items-center gap-1.5"
            >
              <Lock className="w-4 h-4 stroke-[2.5]" />
              Confirmar Bloqueio
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
