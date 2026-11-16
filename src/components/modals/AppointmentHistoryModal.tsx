import React from 'react';
import { 
  X, 
  History, 
  Calendar, 
  Clock, 
  User, 
  UserCheck, 
  Edit3, 
  Trash2, 
  XCircle, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { Appointment, AppointmentHistoryEvent } from '../../types';
import { useData } from '../../context/DataContext';
import { formatDateBR, formatDateTimeBR, formatBRL } from '../../utils/formatters';

interface AppointmentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment?: Appointment | null;
  appointmentId?: string;
}

export const AppointmentHistoryModal: React.FC<AppointmentHistoryModalProps> = ({
  isOpen,
  onClose,
  appointment,
  appointmentId,
}) => {
  const { appointments, getAppointmentHistory, appointmentAuditLogs } = useData();

  if (!isOpen) return null;

  // Resolve target appointment: either direct prop or found in appointments/logs
  const targetId = appointment?.id || appointmentId || '';
  const currentAppointment = appointment || appointments.find(a => a.id === targetId);
  const auditLogs = appointmentAuditLogs.filter(l => l.appointmentId === targetId);
  const latestLog = auditLogs[0]; // newest log

  // Timeline events sorted from newest to oldest for display, or oldest to newest
  const historyEvents = getAppointmentHistory(targetId);

  // Client and service info fallback from audit log if appointment was deleted
  const clientName = currentAppointment?.clientName || latestLog?.clientName || 'Cliente';
  const clientPhone = currentAppointment?.clientPhone || latestLog?.clientPhone || '';
  const serviceName = currentAppointment?.serviceName || latestLog?.serviceName || 'Serviço';
  const professionalName = currentAppointment?.professionalName || latestLog?.professionalName || 'Profissional';
  const appointmentDate = currentAppointment?.date || latestLog?.appointmentDate || '';
  const appointmentTime = currentAppointment?.startTime || latestLog?.appointmentStartTime || '';
  const appointmentPrice = currentAppointment?.price ?? latestLog?.price ?? 0;
  const isDeleted = !!currentAppointment?.deletedAt || latestLog?.isAppointmentDeleted || latestLog?.action === 'excluido';

  const getActionIcon = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('criado') || act.includes('novo')) {
      return <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-700 flex items-center justify-center shrink-0"><Calendar className="w-4 h-4" /></div>;
    }
    if (act.includes('exclu')) {
      return <div className="w-8 h-8 rounded-full bg-rose-100 border border-rose-300 text-rose-700 flex items-center justify-center shrink-0"><Trash2 className="w-4 h-4" /></div>;
    }
    if (act.includes('cancel')) {
      return <div className="w-8 h-8 rounded-full bg-orange-100 border border-orange-300 text-orange-700 flex items-center justify-center shrink-0"><XCircle className="w-4 h-4" /></div>;
    }
    if (act.includes('horário') || act.includes('horario') || act.includes('data')) {
      return <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center shrink-0"><Clock className="w-4 h-4" /></div>;
    }
    if (act.includes('profissional')) {
      return <div className="w-8 h-8 rounded-full bg-purple-100 border border-purple-300 text-purple-700 flex items-center justify-center shrink-0"><UserCheck className="w-4 h-4" /></div>;
    }
    if (act.includes('conclu')) {
      return <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-300 text-blue-700 flex items-center justify-center shrink-0"><CheckCircle2 className="w-4 h-4" /></div>;
    }
    return <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center shrink-0"><Edit3 className="w-4 h-4" /></div>;
  };

  const getRoleBadge = (role?: string, profileLabel?: string) => {
    const label = profileLabel || (role === 'admin' ? 'Administradora' : role === 'profissional' ? 'Profissional' : role === 'gerente' ? 'Gerente' : 'Usuário');
    const isAdm = role === 'admin' || label.toLowerCase().includes('admin');
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-tight ${
        isAdm 
          ? 'bg-rose-100 text-rose-800 border border-rose-200' 
          : 'bg-tb-beige-light text-tb-brown-dark border border-tb-rose-light/50'
      }`}>
        {label}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in font-sans">
      <div className="bg-tb-white rounded-3xl shadow-premium border border-tb-rose-light/60 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 bg-tb-ivory border-b border-tb-rose-light/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-300 text-amber-900 flex items-center justify-center shadow-xs">
              <History className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif-brand text-lg font-bold text-tb-brown-dark">
                  Histórico de Alterações e Rastreabilidade
                </h3>
                {isDeleted && (
                  <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white font-extrabold text-[10px] uppercase">
                    Excluído
                  </span>
                )}
              </div>
              <p className="text-xs text-tb-brown-soft">
                Auditoria completa de criação, edições, alterações de horário e responsáveis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-tb-rose-blush text-tb-gray-neutral hover:text-tb-brown-dark transition-colors"
            title="Fechar histórico"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Appointment Snapshot Banner */}
        <div className="p-4 bg-tb-white border-b border-tb-rose-light/30">
          <div className="p-3.5 bg-tb-ivory/80 rounded-2xl border border-tb-rose-light/40 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-tb-brown-dark">{clientName}</span>
                {clientPhone && <span className="text-tb-gray-neutral text-[11px]">({clientPhone})</span>}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-tb-brown-soft">
                <span className="font-semibold text-tb-brown-dark">{serviceName}</span>
                <span>•</span>
                <span>Profissional: <strong className="text-tb-brown-dark">{professionalName}</strong></span>
              </div>
            </div>

            <div className="text-right space-y-1">
              <div className="font-bold text-amber-800">
                {formatDateBR(appointmentDate)} às {appointmentTime}
              </div>
              <div className="font-extrabold text-tb-brown-dark text-[13px]">
                {formatBRL(appointmentPrice)}
              </div>
            </div>
          </div>
        </div>

        {/* Timeline Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {historyEvents.length === 0 ? (
            <div className="text-center py-12 px-4 bg-tb-ivory/50 rounded-2xl border border-dashed border-tb-rose-light flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 mb-2">
                <History className="w-5 h-5 opacity-60" />
              </div>
              <p className="text-xs font-bold text-tb-brown-dark">
                Nenhum evento registrado ainda
              </p>
              <p className="text-[11px] text-tb-brown-soft mt-0.5">
                Todas as futuras alterações e movimentações serão registradas automaticamente aqui.
              </p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-tb-rose-light">
              {historyEvents.map((event, idx) => {
                const isCreation = event.action.toLowerCase().includes('criado');
                const isDeletion = event.action.toLowerCase().includes('exclu');
                const isCancel = event.action.toLowerCase().includes('cancel');

                return (
                  <div key={event.id || `${event.date}_${idx}`} className="relative group">
                    {/* Circle Node */}
                    <div className="absolute -left-6 top-0 -translate-x-1/2">
                      {getActionIcon(event.action)}
                    </div>

                    {/* Event Content Card */}
                    <div className="bg-white rounded-2xl p-4 border border-tb-rose-light/50 shadow-2xs hover:shadow-soft transition-all space-y-2.5 ml-2">
                      {/* Top Row: Action Label + Timestamp */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-tb-rose-light/20 pb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-extrabold ${
                            isDeletion 
                              ? 'text-rose-700' 
                              : isCancel 
                              ? 'text-orange-700' 
                              : isCreation 
                              ? 'text-emerald-700' 
                              : 'text-tb-brown-dark'
                          }`}>
                            {event.action}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-tb-gray-neutral">
                          {formatDateTimeBR(event.date)}
                        </span>
                      </div>

                      {/* Actor Information */}
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-tb-brown-soft font-medium">Realizado por:</span>
                        <strong className="text-tb-brown-dark">{event.user}</strong>
                        {getRoleBadge(event.userRole, event.userProfileLabel)}
                      </div>

                      {/* Description / Summary */}
                      {event.details && (
                        <p className="text-xs text-tb-brown-dark bg-tb-ivory/60 p-2.5 rounded-xl border border-tb-rose-light/30">
                          {event.details}
                        </p>
                      )}

                      {/* Granular Changes Diff (if any) */}
                      {event.changes && event.changes.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[11px] font-bold text-tb-brown-soft block">
                            Campos alterados nesta operação:
                          </span>
                          <div className="space-y-1">
                            {event.changes.map((ch, cIdx) => (
                              <div 
                                key={cIdx} 
                                className="text-xs p-2 rounded-xl bg-amber-50/70 border border-amber-200/70 flex flex-wrap items-center gap-2"
                              >
                                <span className="font-bold text-amber-950 min-w-20">
                                  {ch.field}:
                                </span>
                                <span className="line-through text-tb-gray-neutral bg-white/80 px-2 py-0.5 rounded-md border border-tb-rose-light/40">
                                  {ch.oldValue || '(vazio)'}
                                </span>
                                <ArrowRight className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span className="font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-md border border-emerald-300 shadow-2xs">
                                  {ch.newValue || '(vazio)'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 bg-tb-ivory border-t border-tb-rose-light/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] text-tb-brown-soft">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Auditoria imutável. Registrada automaticamente em nuvem e protegida contra exclusão.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold bg-tb-brown-dark hover:bg-black text-white rounded-xl shadow-soft transition-all"
          >
            Fechar Histórico
          </button>
        </div>
      </div>
    </div>
  );
};
