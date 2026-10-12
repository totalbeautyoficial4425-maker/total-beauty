import React, { useState } from 'react';
import { 
  X, 
  User, 
  Calendar, 
  Clock, 
  DollarSign, 
  FileText, 
  MessageCircle, 
  Plus, 
  Edit, 
  Archive, 
  Phone, 
  Mail, 
  MapPin, 
  HeartHandshake,
  CheckCircle2,
  CalendarCheck,
  Cake
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Client } from '../../types';
import { formatBRL, formatDateBR, maskPhoneBR, isClientBirthdayToday } from '../../utils/formatters';

interface ClientDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  onEditClient: (client: Client) => void;
  onOpenWhatsApp: (clientName: string, clientPhone: string, appointment?: any, templateKey?: any) => void;
  onNewAppointmentForClient: (clientId: string) => void;
}

export const ClientDetailModal: React.FC<ClientDetailModalProps> = ({
  isOpen,
  onClose,
  client,
  onEditClient,
  onOpenWhatsApp,
  onNewAppointmentForClient,
}) => {
  const { appointments, attendances, payments, archiveClient } = useData();
  const [activeTab, setActiveTab] = useState<'dados' | 'atendimentos' | 'agenda' | 'financeiro' | 'observacoes'>('dados');

  if (!isOpen || !client) return null;

  // Filter client related records
  const clientAppointments = appointments.filter(a => a.clientId === client.id);
  const clientAttendances = attendances.filter(a => a.clientId === client.id);
  const clientPayments = payments.filter(p => p.clientId === client.id);

  const totalSpentCalculated = clientPayments
    .filter(p => p.status === 'pago')
    .reduce((sum, p) => sum + p.paidAmount, 0);

  const handleToggleArchive = () => {
    const confirmMsg = client.isArchived
      ? `Deseja reativar o cadastro de ${client.name}?`
      : `Deseja arquivar o cadastro de ${client.name}? O histórico financeiro e atendimentos serão mantidos com total segurança.`;
    
    if (window.confirm(confirmMsg)) {
      archiveClient(client.id, !client.isArchived);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tb-brown-dark/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-tb-white rounded-2xl shadow-premium border border-tb-rose-light/50 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header with Client Identity & Quick Actions */}
        <div className="px-6 py-5 bg-tb-ivory border-b border-tb-rose-light/40 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-tb-rose-blush border border-tb-rose-light flex items-center justify-center text-tb-rose-primary font-bold text-lg font-serif-brand shadow-sm">
              {client.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif-brand text-2xl font-bold text-tb-brown-dark">
                  {client.name}
                </h3>
                {client.isArchived && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-gray-200 text-gray-700 rounded-full">
                    Arquivada
                  </span>
                )}
              </div>
              <p className="text-xs text-tb-gray-neutral mt-0.5">
                Cliente desde {formatDateBR(client.createdAt)} • Última visita: {formatDateBR(client.lastVisit)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* WhatsApp Action / Birthday Action */}
            {isClientBirthdayToday(client.birthDate) ? (
              <button
                onClick={() => onOpenWhatsApp(client.name, client.phone, { isBirthday: true }, 'aniversario')}
                className="px-3 py-2 text-xs font-bold bg-pink-500 hover:bg-pink-600 text-white rounded-xl flex items-center gap-1.5 shadow-sm transition-all animate-pulse"
                title="Parabenizar no WhatsApp Hoje"
              >
                <Cake className="w-4 h-4" />
                <span>Parabenizar Hoje!</span>
              </button>
            ) : (
              <button
                onClick={() => onOpenWhatsApp(client.name, client.phone)}
                className="p-2 sm:px-3 sm:py-2 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl flex items-center gap-1.5 transition-colors"
                title="Conversar no WhatsApp"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>
            )}

            {/* New Appointment Action */}
            <button
              onClick={() => {
                onClose();
                onNewAppointmentForClient(client.id);
              }}
              className="px-3 py-2 text-xs font-semibold bg-tb-rose-primary text-white hover:bg-[#b57f8c] rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
            >
              <CalendarCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Agendar</span>
            </button>

            {/* Edit Action */}
            <button
              onClick={() => {
                onClose();
                onEditClient(client);
              }}
              className="p-2 text-tb-brown-soft hover:text-tb-brown-dark rounded-xl hover:bg-tb-beige-light transition-colors"
              title="Editar Dados"
            >
              <Edit className="w-4 h-4" />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-tb-gray-neutral hover:text-tb-brown-dark rounded-xl hover:bg-tb-beige-light transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-tb-rose-light/40 px-6 bg-tb-ivory/50 overflow-x-auto">
          {[
            { id: 'dados', label: '1. Dados Pessoais', icon: User },
            { id: 'atendimentos', label: `2. Atendimentos (${clientAttendances.length})`, icon: Clock },
            { id: 'agenda', label: `3. Agenda (${clientAppointments.length})`, icon: Calendar },
            { id: 'financeiro', label: `4. Financeiro (${formatBRL(totalSpentCalculated)})`, icon: DollarSign },
            { id: 'observacoes', label: '5. Preferências', icon: FileText },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
                  isActive
                    ? 'border-tb-rose-primary text-tb-brown-dark text-tb-rose-primary'
                    : 'border-transparent text-tb-gray-neutral hover:text-tb-brown-dark'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-tb-rose-primary' : 'text-tb-gray-neutral'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: Dados Pessoais */}
          {activeTab === 'dados' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-tb-ivory border border-tb-rose-light/40 space-y-2">
                  <span className="text-xs font-bold text-tb-brown-soft uppercase tracking-wider block">
                    Contato
                  </span>
                  <div className="space-y-1.5 text-xs">
                    <p className="flex items-center gap-2 text-tb-brown-dark">
                      <Phone className="w-3.5 h-3.5 text-tb-rose-primary" />
                      <span className="font-semibold">Telefone Principal:</span> {maskPhoneBR(client.phone)}
                    </p>
                    {client.whatsapp && (
                      <p className="flex items-center gap-2 text-tb-brown-dark">
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-semibold">WhatsApp:</span> {maskPhoneBR(client.whatsapp)}
                      </p>
                    )}
                    <p className="flex items-center gap-2 text-tb-brown-dark">
                      <Mail className="w-3.5 h-3.5 text-tb-rose-primary" />
                      <span className="font-semibold">E-mail:</span> {client.email || 'Não informado'}
                    </p>
                    <p className="flex items-center gap-2 text-tb-brown-dark flex-wrap">
                      <Calendar className="w-3.5 h-3.5 text-tb-rose-primary" />
                      <span className="font-semibold">Nascimento:</span> {formatDateBR(client.birthDate)}
                      {isClientBirthdayToday(client.birthDate) && (
                        <span className="text-[10px] bg-pink-100 text-pink-700 font-bold px-2 py-0.5 rounded-full border border-pink-200">
                          🎂 Aniversariante Hoje!
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-tb-ivory border border-tb-rose-light/40 space-y-2">
                  <span className="text-xs font-bold text-tb-brown-soft uppercase tracking-wider block">
                    Endereço
                  </span>
                  <div className="space-y-1 text-xs text-tb-brown-dark">
                    <p className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-tb-rose-primary shrink-0 mt-0.5" />
                      <span>
                        {client.address?.street
                          ? `${client.address.street}, ${client.address.number || 'S/N'} - ${client.address.neighborhood || ''}, ${client.address.city || ''} - ${client.address.state || ''}`
                          : 'Endereço não cadastrado'}
                      </span>
                    </p>
                    {client.address?.zip && (
                      <p className="text-tb-gray-neutral pl-5.5">CEP: {client.address.zip}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Summary KPIs */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 bg-tb-rose-blush/40 rounded-xl border border-tb-rose-light/40 text-center">
                  <span className="text-[11px] text-tb-brown-soft block font-medium">Total de Visitas</span>
                  <span className="text-lg font-bold text-tb-brown-dark">{client.totalVisits || clientAttendances.length}</span>
                </div>
                <div className="p-3.5 bg-tb-rose-blush/40 rounded-xl border border-tb-rose-light/40 text-center">
                  <span className="text-[11px] text-tb-brown-soft block font-medium">Total Investido</span>
                  <span className="text-lg font-bold text-tb-rose-primary">{formatBRL(totalSpentCalculated)}</span>
                </div>
                <div className="p-3.5 bg-tb-rose-blush/40 rounded-xl border border-tb-rose-light/40 text-center">
                  <span className="text-[11px] text-tb-brown-soft block font-medium">Última Presença</span>
                  <span className="text-lg font-bold text-tb-brown-dark">{formatDateBR(client.lastVisit)}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Atendimentos */}
          {activeTab === 'atendimentos' && (
            <div className="space-y-3 animate-fade-in">
              {clientAttendances.length === 0 ? (
                <div className="p-8 text-center bg-tb-ivory rounded-2xl border border-tb-rose-light/40 text-xs text-tb-gray-neutral">
                  Nenhum atendimento finalizado registrado até o momento.
                </div>
              ) : (
                <div className="space-y-2">
                  {clientAttendances.map(atd => (
                    <div key={atd.id} className="p-3.5 bg-tb-ivory rounded-xl border border-tb-rose-light/40 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-tb-brown-dark">{atd.serviceName}</p>
                        <p className="text-tb-gray-neutral mt-0.5">
                          {formatDateBR(atd.date)} às {atd.startedAt} • Profissional: {atd.professionalName}
                        </p>
                        {atd.notes && <p className="text-[11px] text-tb-brown-soft italic mt-1">"{atd.notes}"</p>}
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-tb-rose-primary block">{formatBRL(atd.netValue)}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          {atd.paymentStatus}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Agenda */}
          {activeTab === 'agenda' && (
            <div className="space-y-3 animate-fade-in">
              {clientAppointments.length === 0 ? (
                <div className="p-8 text-center bg-tb-ivory rounded-2xl border border-tb-rose-light/40 text-xs text-tb-gray-neutral">
                  Nenhum agendamento ativo ou histórico para esta cliente.
                </div>
              ) : (
                <div className="space-y-2">
                  {clientAppointments.map(apt => (
                    <div key={apt.id} className="p-3.5 bg-tb-ivory rounded-xl border border-tb-rose-light/40 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-tb-brown-dark">{apt.serviceName}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            apt.status === 'confirmado' ? 'bg-emerald-100 text-emerald-800' :
                            apt.status === 'em_atendimento' ? 'bg-amber-100 text-amber-800' :
                            apt.status === 'concluido' ? 'bg-purple-100 text-purple-800' :
                            apt.status === 'cancelado' ? 'bg-rose-100 text-rose-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {apt.status}
                          </span>
                        </div>
                        <p className="text-tb-gray-neutral mt-0.5">
                          {formatDateBR(apt.date)} ({apt.startTime} - {apt.endTime}) • com {apt.professionalName}
                        </p>
                      </div>
                      <span className="font-bold text-tb-brown-dark">{formatBRL(apt.price)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Histórico Financeiro */}
          {activeTab === 'financeiro' && (
            <div className="space-y-3 animate-fade-in">
              {clientPayments.length === 0 ? (
                <div className="p-8 text-center bg-tb-ivory rounded-2xl border border-tb-rose-light/40 text-xs text-tb-gray-neutral">
                  Nenhum registro de pagamento financeiro registrado.
                </div>
              ) : (
                <div className="space-y-2">
                  {clientPayments.map(pay => (
                    <div key={pay.id} className="p-3.5 bg-tb-ivory rounded-xl border border-tb-rose-light/40 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-tb-brown-dark">{pay.description}</p>
                        <p className="text-tb-gray-neutral mt-0.5">
                          {formatDateBR(pay.date)} • Forma: {pay.paymentMethod.replace('_', ' ').toUpperCase()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-emerald-700 block">{formatBRL(pay.paidAmount)}</span>
                        {pay.pendingAmount > 0 && (
                          <span className="text-[10px] text-amber-600 block">Pendente: {formatBRL(pay.pendingAmount)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: Observações e Preferências */}
          {activeTab === 'observacoes' && (
            <div className="p-4 bg-tb-ivory rounded-xl border border-tb-rose-light/40 space-y-3 text-xs animate-fade-in">
              <span className="font-bold text-tb-brown-soft uppercase tracking-wider block">
                Ficha de Cuidados & Notas Internas
              </span>
              <p className="text-tb-brown-dark leading-relaxed whitespace-pre-wrap">
                {client.notes || 'Nenhuma observação interna cadastrada para esta cliente.'}
              </p>
              <div className="pt-3 border-t border-tb-rose-light/30 flex items-center gap-2 text-tb-gray-neutral">
                <HeartHandshake className="w-4 h-4 text-tb-rose-primary" />
                <span>
                  Consentimento de contato via WhatsApp: {client.communicationConsent ? 'Autorizado' : 'Não autorizado'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-tb-ivory border-t border-tb-rose-light/40 flex items-center justify-between">
          <button
            type="button"
            onClick={handleToggleArchive}
            className="text-xs text-tb-gray-neutral hover:text-rose-700 flex items-center gap-1.5 transition-colors"
          >
            <Archive className="w-3.5 h-3.5" />
            {client.isArchived ? 'Reativar Cliente' : 'Arquivar Cadastro'}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold bg-tb-beige-light hover:bg-tb-beige-champagne text-tb-brown-dark rounded-xl transition-colors"
          >
            Fechar Ficha
          </button>
        </div>
      </div>
    </div>
  );
};
