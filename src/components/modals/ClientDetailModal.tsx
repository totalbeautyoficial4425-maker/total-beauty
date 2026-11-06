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
  Cake,
  Sparkles,
  ArrowRight,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Client, ClientPackage } from '../../types';
import { formatBRL, formatDateBR, maskPhoneBR, isClientBirthdayToday } from '../../utils/formatters';
import { PackageSaleModal } from './PackageSaleModal';
import { PackageDetailModal } from './PackageDetailModal';

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
  const { appointments, attendances, payments, clientPackages, archiveClient, deleteClient } = useData();
  const [activeTab, setActiveTab] = useState<'dados' | 'pacotes' | 'atendimentos' | 'agenda' | 'financeiro' | 'observacoes'>('dados');
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [selectedPkgForDetail, setSelectedPkgForDetail] = useState<ClientPackage | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!isOpen || !client) return null;

  // Filter client related records
  const clientAppointments = appointments.filter(a => a.clientId === client.id);
  const clientAttendances = attendances.filter(a => a.clientId === client.id);
  const clientPayments = payments.filter(p => p.clientId === client.id);
  const clientPackagesList = (clientPackages || []).filter(p => p.clientId === client.id);

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
            { id: 'pacotes', label: `2. Pacotes & Créditos (${clientPackagesList.length})`, icon: Sparkles },
            { id: 'atendimentos', label: `3. Atendimentos (${clientAttendances.length})`, icon: Clock },
            { id: 'agenda', label: `4. Agenda (${clientAppointments.length})`, icon: Calendar },
            { id: 'financeiro', label: `5. Financeiro (${formatBRL(totalSpentCalculated)})`, icon: DollarSign },
            { id: 'observacoes', label: '6. Preferências', icon: FileText },
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

          {/* TAB: Pacotes & Créditos */}
          {activeTab === 'pacotes' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-tb-brown-dark uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-tb-rose-primary" />
                    Controle e Acompanhamento de Pacotes da Cliente
                  </span>
                  <span className="text-[11px] text-tb-gray-neutral">
                    Sessões restantes, extrato e histórico de utilização
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSaleModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-2xs hover:bg-emerald-700 transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Vender Novo Pacote
                </button>
              </div>

              {clientPackagesList.length === 0 ? (
                <div className="p-8 text-center bg-tb-ivory rounded-2xl border border-tb-rose-light/40 space-y-3">
                  <span className="text-2xl block">🎁</span>
                  <p className="text-xs font-bold text-tb-brown-dark">
                    Nenhum pacote contratado no momento.
                  </p>
                  <p className="text-[11px] text-tb-gray-neutral max-w-sm mx-auto">
                    Ao contratar o <strong>Pacote de Unha</strong> (4 manicures + 2 pedicures por R$ 205,00) ou o <strong>Pacote de Cabelo</strong> (4 escovas com 10% OFF), o crédito aparecerá automaticamente aqui com acompanhamento das sessões.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsSaleModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-2xs hover:bg-emerald-700 transition-colors inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Vender Pacote para Esta Cliente
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {clientPackagesList.map(pkg => {
                    const totalSessions = pkg.items.reduce((acc, i) => acc + i.totalQty, 0);
                    const remainingSessions = pkg.items.reduce((acc, i) => acc + i.remainingQty, 0);

                    return (
                      <div 
                        key={pkg.id} 
                        className={`p-4 rounded-2xl border transition-all ${
                          pkg.status === 'ativo' 
                            ? 'bg-gradient-to-br from-emerald-50/50 via-tb-white to-teal-50/30 border-emerald-300 shadow-soft' 
                            : 'bg-gray-50 border-gray-200 opacity-80'
                        }`}
                      >
                        {/* Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-tb-rose-light/40 pb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-base shrink-0 shadow-2xs">
                              🎁
                            </div>
                            <div>
                              <h4 className="font-bold text-sm text-tb-brown-dark">
                                {pkg.packageName}
                              </h4>
                              <p className="text-[11px] text-tb-gray-neutral">
                                Contratado em {formatDateBR(pkg.purchaseDate)} • Validade: {formatDateBR(pkg.expiryDate)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-tb-brown-dark bg-white px-2.5 py-1 rounded-lg border border-tb-rose-light">
                              {formatBRL(pkg.totalPricePaid)}
                            </span>
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                              pkg.status === 'ativo' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                              pkg.status === 'esgotado' ? 'bg-gray-200 text-gray-700 border border-gray-300' :
                              'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}>
                              {pkg.status === 'ativo' ? '● Pacote Ativo' : pkg.status === 'esgotado' ? '✓ Esgotado' : '⏳ Expirado'}
                            </span>
                          </div>
                        </div>

                        {/* Items Balance and Progress */}
                        <div className="py-3 space-y-2.5">
                          <span className="text-[11px] font-bold text-tb-brown-soft uppercase tracking-wider block">
                            Saldo de Sessões Restantes:
                          </span>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {pkg.items.map((item, idx) => {
                              const itemPct = item.totalQty > 0 ? (item.usedQty / item.totalQty) * 100 : 0;
                              return (
                                <div key={idx} className="bg-white p-3 rounded-xl border border-tb-rose-light/50 shadow-2xs space-y-1.5">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-tb-brown-dark">{item.serviceName}</span>
                                    <span className={`font-extrabold ${item.remainingQty > 0 ? 'text-emerald-700' : 'text-gray-400'}`}>
                                      {item.remainingQty} de {item.totalQty} restante(s)
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full transition-all duration-500 ${item.remainingQty === 0 ? 'bg-gray-300' : 'bg-emerald-500'}`}
                                      style={{ width: `${itemPct}%` }}
                                      title={`${item.usedQty} utilizadas`}
                                    />
                                  </div>
                                  <div className="flex items-center justify-between text-[10px] text-tb-gray-neutral">
                                    <span>{item.usedQty} utilizada(s)</span>
                                    <span>{item.remainingQty === 0 ? 'Concluído' : `${item.remainingQty} disponível`}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Usage History Log */}
                        {pkg.usageHistory && pkg.usageHistory.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-tb-rose-light/40 space-y-1.5">
                            <span className="text-[10px] font-bold text-tb-brown-soft uppercase tracking-wider block">
                              Histórico de Utilização deste Pacote ({pkg.usageHistory.length} sessões realizadas):
                            </span>
                            <div className="space-y-1">
                              {pkg.usageHistory.map(log => (
                                <div key={log.id} className="text-[11px] bg-white/90 p-2 rounded-lg border border-tb-rose-light/40 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span className="font-semibold text-tb-brown-dark">{log.serviceName}</span>
                                    {log.professionalName && (
                                      <span className="text-tb-gray-neutral">• com {log.professionalName}</span>
                                    )}
                                  </div>
                                  <div className="text-right text-tb-gray-neutral text-[10px]">
                                    {formatDateBR(log.date)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Action: Ver Extrato Completo */}
                        <div className="mt-3 pt-2.5 border-t border-tb-rose-light/40 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => setSelectedPkgForDetail(pkg)}
                            className="px-3 py-1.5 rounded-xl bg-white hover:bg-tb-rose-blush border border-tb-rose-light text-tb-rose-primary text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            Ver Extrato & Movimentações
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Atendimentos */}
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
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleToggleArchive}
              className="text-xs text-tb-gray-neutral hover:text-tb-brown-dark flex items-center gap-1.5 transition-colors"
            >
              <Archive className="w-3.5 h-3.5" />
              {client.isArchived ? 'Reativar Cliente' : 'Arquivar Cadastro'}
            </button>

            <span className="text-tb-rose-light">|</span>

            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1.5 transition-colors font-medium hover:underline"
              title="Excluir cadastro permanentemente"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Excluir Cliente
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold bg-tb-beige-light hover:bg-tb-beige-champagne text-tb-brown-dark rounded-xl transition-colors"
          >
            Fechar Ficha
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Client Deletion */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-tb-brown-dark/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-tb-white rounded-3xl shadow-premium border border-tb-rose-light/50 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif-brand text-xl font-bold text-tb-brown-dark">
                  Excluir Cliente?
                </h3>
                <p className="text-xs text-tb-gray-neutral">Esta ação não pode ser desfeita</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-tb-ivory border border-tb-rose-light/40 space-y-2 text-xs text-tb-brown-dark">
              <div className="flex justify-between">
                <span className="text-tb-gray-neutral">Nome:</span>
                <span className="font-bold text-tb-brown-dark">{client.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-tb-gray-neutral">Telefone:</span>
                <span className="font-medium text-tb-brown-dark">{maskPhoneBR(client.phone) || 'Sem telefone'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-tb-gray-neutral">Total de Visitas:</span>
                <span className="font-semibold text-tb-brown-dark">{client.totalVisits}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-tb-gray-neutral">Total Gasto:</span>
                <span className="font-bold text-tb-rose-primary">{formatBRL(client.totalSpent)}</span>
              </div>
            </div>

            {(clientAppointments.length > 0 || clientAttendances.length > 0) && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <p>
                  Atenção: Esta cliente possui <strong>{clientAppointments.length} agendamento(s)</strong> e <strong>{clientAttendances.length} atendimento(s)</strong> vinculados no histórico.
                </p>
              </div>
            )}

            <p className="text-xs text-tb-gray-neutral">
              Tem certeza que deseja excluir definitivamente o cadastro de <strong>{client.name}</strong>?
            </p>

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-tb-brown-soft hover:bg-tb-beige-light rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteClient(client.id);
                  setShowDeleteConfirm(false);
                  onClose();
                }}
                className="px-5 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-soft transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Sim, Excluir Cliente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sale Modal */}
      <PackageSaleModal
        isOpen={isSaleModalOpen}
        onClose={() => setIsSaleModalOpen(false)}
        initialClientId={client.id}
      />

      {/* Detail / Statement Modal */}
      <PackageDetailModal
        isOpen={!!selectedPkgForDetail}
        onClose={() => setSelectedPkgForDetail(null)}
        packageItem={selectedPkgForDetail}
      />
    </div>
  );
};
