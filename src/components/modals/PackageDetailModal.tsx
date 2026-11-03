import React, { useState } from 'react';
import { 
  X, 
  Package, 
  Calendar, 
  User, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowDownCircle, 
  RotateCcw, 
  Sparkles, 
  ShieldCheck, 
  FileText,
  CreditCard,
  Ban
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { ClientPackage, PaymentMethod } from '../../types';
import { formatBRL, formatDateBR, getTodayDate } from '../../utils/formatters';

interface PackageDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  packageItem: ClientPackage | null;
}

export const PackageDetailModal: React.FC<PackageDetailModalProps> = ({
  isOpen,
  onClose,
  packageItem,
}) => {
  const { 
    professionals, 
    deductPackageCredit, 
    revertPackageCredit, 
    payProfessionalRepass,
    cancelPackage 
  } = useData();

  const [activeSubTab, setActiveSubTab] = useState<'extrato' | 'baixa' | 'estorno' | 'repasse'>('extrato');

  // Manual deduction form state
  const [deductServiceType, setDeductServiceType] = useState<string>('');
  const [deductProfId, setDeductProfId] = useState<string>('');
  const [deductNotes, setDeductNotes] = useState<string>('');

  // Estorno form state
  const [revertServiceType, setRevertServiceType] = useState<string>('');
  const [revertReason, setRevertReason] = useState<string>('');

  // Repasse payout form state
  const [repassPayAmount, setRepassPayAmount] = useState<number>(0);
  const [repassPayMethod, setRepassPayMethod] = useState<PaymentMethod>('pix');
  const [repassPayDate, setRepassPayDate] = useState<string>(getTodayDate());
  const [repassPayNotes, setRepassPayNotes] = useState<string>('');

  // Cancel package state
  const [cancelReason, setCancelReason] = useState<string>('');
  const [showCancelConfirm, setShowCancelConfirm] = useState<boolean>(false);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen || !packageItem) return null;

  const totalCredits = packageItem.items.reduce((acc, i) => acc + (i.totalQty || 0), 0);
  const usedCredits = packageItem.items.reduce((acc, i) => acc + (i.usedQty || 0), 0);
  const remainingCredits = packageItem.items.reduce((acc, i) => acc + (i.remainingQty || 0), 0);
  const isFinished = remainingCredits === 0 || packageItem.status === 'concluido' || packageItem.status === 'esgotado';

  // Professional repass calculations
  const totalRepass = packageItem.repassTotal || 0;
  const paidRepass = packageItem.repassPaidAmount || 0;
  const pendingRepass = Math.max(0, totalRepass - paidRepass);

  const handleManualDeduct = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const srvType = deductServiceType || packageItem.items.find(i => i.remainingQty > 0)?.serviceType;
    if (!srvType) {
      setFeedback({ type: 'error', message: 'Selecione o serviço para a baixa.' });
      return;
    }

    const prof = deductProfId ? professionals.find(p => p.id === deductProfId) : undefined;
    const res = deductPackageCredit(
      packageItem.id,
      srvType,
      undefined,
      prof?.id,
      prof?.name,
      deductNotes || 'Baixa manual autorizada'
    );

    if (res.success) {
      setFeedback({ type: 'success', message: `1 crédito de ${srvType} baixado com sucesso!` });
      setDeductNotes('');
      setActiveSubTab('extrato');
    } else {
      setFeedback({ type: 'error', message: res.error || 'Erro ao realizar a baixa de crédito.' });
    }
  };

  const handleRevert = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!revertReason || revertReason.trim().length === 0) {
      setFeedback({ type: 'error', message: 'É obrigatório informar o motivo do estorno.' });
      return;
    }
    const srvType = revertServiceType || packageItem.items.find(i => i.usedQty > 0)?.serviceType;
    if (!srvType) {
      setFeedback({ type: 'error', message: 'Nenhum crédito disponível para estornar.' });
      return;
    }

    const res = revertPackageCredit(packageItem.id, srvType, revertReason);
    if (res.success) {
      setFeedback({ type: 'success', message: `1 crédito de ${srvType} estornado com sucesso! Saldo restaurado.` });
      setRevertReason('');
      setActiveSubTab('extrato');
    } else {
      setFeedback({ type: 'error', message: res.error || 'Erro ao estornar crédito.' });
    }
  };

  const handlePayRepass = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const amount = repassPayAmount > 0 ? repassPayAmount : pendingRepass;
    if (amount <= 0) {
      setFeedback({ type: 'error', message: 'Informe um valor válido para o repasse.' });
      return;
    }

    const res = payProfessionalRepass(packageItem.id, {
      paidAmount: amount,
      paymentMethod: repassPayMethod,
      paymentDate: repassPayDate,
      notes: repassPayNotes || `Repasse do pacote ${packageItem.name || packageItem.packageName}`,
    });

    if (res.success) {
      setFeedback({ type: 'success', message: `Repasse de ${formatBRL(amount)} registrado com sucesso!` });
      setActiveSubTab('extrato');
    } else {
      setFeedback({ type: 'error', message: res.error || 'Erro ao registrar repasse.' });
    }
  };

  const handleCancelPackage = () => {
    setFeedback(null);
    if (!cancelReason) {
      setFeedback({ type: 'error', message: 'Informe o motivo do cancelamento.' });
      return;
    }
    const res = cancelPackage(packageItem.id, cancelReason);
    if (res.success) {
      setFeedback({ type: 'success', message: 'Pacote cancelado com sucesso.' });
      setShowCancelConfirm(false);
    } else {
      setFeedback({ type: 'error', message: res.error || 'Erro ao cancelar pacote.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div 
        className="bg-white rounded-3xl max-w-3xl w-full border border-tb-rose-light/50 shadow-2xl overflow-hidden my-auto animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-tb-brown-dark via-tb-brown-primary to-tb-brown-soft text-white p-5 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-2xl shadow-inner">
              🎁
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  {packageItem.name || packageItem.packageName || 'Pacote de Serviços'}
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                  packageItem.status === 'ativo' || packageItem.status === 'em_andamento'
                    ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40'
                    : packageItem.status === 'concluido' || packageItem.status === 'esgotado'
                      ? 'bg-blue-500/20 text-blue-200 border border-blue-400/40'
                      : 'bg-rose-500/20 text-rose-200 border border-rose-400/40'
                }`}>
                  {packageItem.status === 'ativo' ? '● Ativo' :
                   packageItem.status === 'em_andamento' ? '● Em Andamento' :
                   packageItem.status === 'concluido' ? '✓ Concluído' :
                   packageItem.status === 'esgotado' ? '✓ Esgotado' :
                   packageItem.status === 'cancelado' ? '✕ Cancelado' : '⏳ Expirado'}
                </span>
              </div>
              <p className="text-xs text-tb-rose-light/90">
                Cliente: <strong className="text-white">{packageItem.clientName}</strong> • Contratado em {formatDateBR(packageItem.purchaseDate)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className={`p-3.5 mx-5 sm:mx-6 mt-4 rounded-xl text-xs flex items-center gap-2.5 ${
            feedback.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}>
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            <span className="font-medium">{feedback.message}</span>
          </div>
        )}

        {/* Financial & Balances Banner */}
        <div className="p-5 sm:p-6 pb-2 grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <div className="p-3 bg-tb-ivory rounded-2xl border border-tb-rose-light/50">
            <span className="text-[10px] font-bold text-tb-brown-soft uppercase block">Total Pago</span>
            <span className="text-sm sm:text-base font-black text-tb-brown-dark">{formatBRL(packageItem.totalPricePaid)}</span>
            <span className="text-[10px] text-tb-gray-neutral block mt-0.5">Entrada no caixa</span>
          </div>

          <div className="p-3 bg-tb-ivory rounded-2xl border border-tb-rose-light/50">
            <span className="text-[10px] font-bold text-tb-brown-soft uppercase block">Valor Consumido</span>
            <span className="text-sm sm:text-base font-black text-rose-700">
              {formatBRL(packageItem.consumedValue || 0)}
            </span>
            <span className="text-[10px] text-tb-gray-neutral block mt-0.5">Em serviços baixados</span>
          </div>

          <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200/70">
            <span className="text-[10px] font-bold text-emerald-800 uppercase block">Saldo Financeiro</span>
            <span className="text-sm sm:text-base font-black text-emerald-700">
              {formatBRL(packageItem.financialBalance !== undefined ? packageItem.financialBalance : Math.max(0, packageItem.totalPricePaid - (packageItem.consumedValue || 0)))}
            </span>
            <span className="text-[10px] text-emerald-600 block mt-0.5">Restante a utilizar</span>
          </div>

          <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200/70">
            <span className="text-[10px] font-bold text-emerald-800 uppercase block">Créditos Restantes</span>
            <span className="text-sm sm:text-base font-black text-emerald-700">{remainingCredits} de {totalCredits}</span>
            <span className="text-[10px] text-emerald-600 block mt-0.5">{usedCredits} utilizado(s)</span>
          </div>

          <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200/70 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-amber-800 uppercase block">Comissão da Profissional</span>
            <span className="text-sm sm:text-base font-black text-amber-900">{formatBRL(totalRepass)}</span>
            <span className="text-[10px] text-amber-700 block mt-0.5">
              {packageItem.repassStatus === 'pago' ? '✓ Quitado' : `Pendente: ${formatBRL(pendingRepass)}`}
            </span>
          </div>
        </div>

        {/* Sub Navigation */}
        <div className="px-5 sm:px-6 pt-2">
          <div className="flex border-b border-tb-rose-light/40 gap-4 text-xs font-bold">
            <button
              onClick={() => setActiveSubTab('extrato')}
              className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
                activeSubTab === 'extrato'
                  ? 'border-tb-rose-primary text-tb-rose-primary'
                  : 'border-transparent text-tb-gray-neutral hover:text-tb-brown-dark'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Extrato & Movimentações
            </button>

            {packageItem.status !== 'cancelado' && (
              <>
                <button
                  onClick={() => setActiveSubTab('baixa')}
                  disabled={remainingCredits === 0}
                  className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 disabled:opacity-40 ${
                    activeSubTab === 'baixa'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-tb-gray-neutral hover:text-tb-brown-dark'
                  }`}
                >
                  <ArrowDownCircle className="w-3.5 h-3.5" /> Baixar Crédito
                </button>

                <button
                  onClick={() => setActiveSubTab('estorno')}
                  disabled={usedCredits === 0}
                  className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 disabled:opacity-40 ${
                    activeSubTab === 'estorno'
                      ? 'border-amber-600 text-amber-700'
                      : 'border-transparent text-tb-gray-neutral hover:text-tb-brown-dark'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Estornar
                </button>

                <button
                  onClick={() => {
                    setActiveSubTab('repasse');
                    setRepassPayAmount(pendingRepass);
                  }}
                  className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
                    activeSubTab === 'repasse'
                      ? 'border-purple-600 text-purple-700'
                      : 'border-transparent text-tb-gray-neutral hover:text-tb-brown-dark'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" /> Quitar Repasse
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-5 sm:p-6 max-h-[55vh] overflow-y-auto space-y-4">
          {/* TAB: EXTRATO */}
          {activeSubTab === 'extrato' && (
            <div className="space-y-4">
              {/* Credit Breakdown by Service */}
              <div>
                <span className="text-xs font-bold text-tb-brown-dark uppercase tracking-wider block mb-2">
                  Saldo de Créditos por Tipo de Serviço:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {packageItem.items.map((it, idx) => (
                    <div key={idx} className="p-3 bg-tb-ivory rounded-2xl border border-tb-rose-light/50 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-tb-brown-dark">{it.serviceName}</span>
                        <span className={`font-black ${it.remainingQty > 0 ? 'text-emerald-700' : 'text-gray-400'}`}>
                          {it.remainingQty} de {it.totalQty} restantes
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${it.totalQty > 0 ? (it.usedQty / it.totalQty) * 100 : 0}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-tb-gray-neutral">
                        <span>Utilizados: {it.usedQty}</span>
                        <span>{it.remainingQty === 0 ? '✓ Esgotado' : `${Math.round(((it.totalQty - it.usedQty) / it.totalQty) * 100)}% disponível`}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Complete Movement History / Audit Log */}
              <div>
                <span className="text-xs font-bold text-tb-brown-dark uppercase tracking-wider block mb-2">
                  Histórico Completo de Movimentações & Auditoria:
                </span>

                {(!packageItem.movements || packageItem.movements.length === 0) && (!packageItem.usageHistory || packageItem.usageHistory.length === 0) ? (
                  <div className="p-6 text-center bg-gray-50 rounded-2xl text-xs text-tb-gray-neutral border border-gray-200">
                    Nenhuma movimentação registrada até o momento.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Combine movements and legacy usage history */}
                    {packageItem.movements && packageItem.movements.length > 0 ? (
                      packageItem.movements.map((mov) => (
                        <div key={mov.id} className="p-3 bg-white rounded-xl border border-tb-rose-light/40 flex items-start justify-between gap-3 shadow-2xs">
                          <div className="flex items-start gap-2.5">
                            <span className="text-base mt-0.5">
                              {mov.type === 'venda' ? '💰' :
                               mov.type === 'baixa' ? '💅' :
                               mov.type === 'estorno' ? '↩️' :
                               mov.type === 'repasse_pago' ? '💳' : '❌'}
                            </span>
                            <div>
                              <p className="text-xs font-bold text-tb-brown-dark">
                                {mov.reason || (
                                  mov.type === 'venda' ? 'Venda de Pacote' :
                                  mov.type === 'baixa' ? `Baixa de crédito: ${mov.serviceName}` :
                                  mov.type === 'estorno' ? `Estorno: ${mov.serviceName}` :
                                  mov.type === 'repasse_pago' ? 'Pagamento de repasse à profissional' : 'Cancelamento'
                                )}
                              </p>
                              <p className="text-[11px] text-tb-gray-neutral mt-0.5">
                                {formatDateBR(mov.date)} • {mov.userName || 'Sistema'} {mov.professionalName ? `• Profissional: ${mov.professionalName}` : ''}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            {mov.quantity !== undefined && (
                              <span className={`text-xs font-black px-2 py-0.5 rounded-lg inline-block ${
                                mov.quantity < 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {mov.quantity > 0 ? `+${mov.quantity}` : mov.quantity} crédito(s)
                              </span>
                            )}
                            {mov.abatedFinancialAmount !== undefined && mov.abatedFinancialAmount !== 0 && (
                              <span className="text-xs font-black text-rose-700 block mt-0.5">
                                Abatimento: -{formatBRL(Math.abs(mov.abatedFinancialAmount))}
                              </span>
                            )}
                            {mov.remainingFinancialBalance !== undefined && (
                              <span className="text-[10px] text-tb-gray-neutral block mt-0.5">
                                Saldo: {formatBRL(mov.remainingFinancialBalance)}
                              </span>
                            )}
                            {mov.financialAmount !== undefined && mov.abatedFinancialAmount === undefined && (
                              <span className="text-xs font-black text-tb-brown-dark block mt-0.5">
                                {formatBRL(mov.financialAmount)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      packageItem.usageHistory.map((u) => (
                        <div key={u.id} className="p-3 bg-white rounded-xl border border-tb-rose-light/40 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-bold text-tb-brown-dark">Baixa: {u.serviceName}</p>
                            <p className="text-[11px] text-tb-gray-neutral">{formatDateBR(u.date)} • {u.professionalName || 'Profissional'}</p>
                          </div>
                          <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 font-bold text-[10px]">
                            -1 crédito
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: BAIXA MANUAL */}
          {activeSubTab === 'baixa' && (
            <form onSubmit={handleManualDeduct} className="space-y-4">
              <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-950 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-700" />
                  Baixa de Crédito por Atendimento Realizado
                </p>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  O crédito é abatido imediatamente do saldo da cliente <strong>sem gerar cobrança adicional ou repasse duplicado</strong>.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-tb-brown-soft uppercase tracking-wider block mb-1">
                  Selecione o Serviço para Baixar:
                </label>
                <select
                  value={deductServiceType}
                  onChange={(e) => setDeductServiceType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-ivory text-xs font-bold text-tb-brown-dark"
                >
                  {packageItem.items.map((it, idx) => (
                    <option key={idx} value={it.serviceType} disabled={it.remainingQty <= 0}>
                      {it.serviceName} ({it.remainingQty} disponível{it.remainingQty !== 1 ? 'is' : ''})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-tb-brown-soft uppercase tracking-wider block mb-1">
                  Profissional que Atendeu:
                </label>
                <select
                  value={deductProfId}
                  onChange={(e) => setDeductProfId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-ivory text-xs font-semibold text-tb-brown-dark"
                >
                  <option value="">{packageItem.professionalName ? `${packageItem.professionalName} (Padrão do Pacote)` : 'Selecione a profissional...'}</option>
                  {professionals.filter(p => p.isActive !== false).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-tb-brown-soft uppercase tracking-wider block mb-1">
                  Observações da Baixa:
                </label>
                <input
                  type="text"
                  placeholder="Ex: Atendimento presencial na manicure..."
                  value={deductNotes}
                  onChange={(e) => setDeductNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-ivory text-xs text-tb-brown-dark"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-soft hover:bg-emerald-700 transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> Confirmar Baixa de 1 Crédito
                </button>
              </div>
            </form>
          )}

          {/* TAB: ESTORNO */}
          {activeSubTab === 'estorno' && (
            <form onSubmit={handleRevert} className="space-y-4">
              <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-950 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-amber-700" />
                  Estorno Autorizado de Crédito
                </p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Restaura o saldo do crédito para a cliente e registra a movimentação de auditoria com justificativa.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-tb-brown-soft uppercase tracking-wider block mb-1">
                  Serviço a Estornar:
                </label>
                <select
                  value={revertServiceType}
                  onChange={(e) => setRevertServiceType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-ivory text-xs font-bold text-tb-brown-dark"
                >
                  {packageItem.items.map((it, idx) => (
                    <option key={idx} value={it.serviceType} disabled={it.usedQty <= 0}>
                      {it.serviceName} ({it.usedQty} já utilizado{it.usedQty !== 1 ? 's' : ''})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-tb-brown-soft uppercase tracking-wider block mb-1">
                  Motivo do Estorno <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  placeholder="Ex: Baixa realizada por engano / Reabertura de comanda"
                  value={revertReason}
                  onChange={(e) => setRevertReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-ivory text-xs text-tb-brown-dark"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-600 text-white font-bold text-xs shadow-soft hover:bg-amber-700 transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" /> Restaurar 1 Crédito no Pacote
                </button>
              </div>
            </form>
          )}

          {/* TAB: REPASSE PROFISSIONAL */}
          {activeSubTab === 'repasse' && (
            <form onSubmit={handlePayRepass} className="space-y-4">
              <div className="p-3.5 bg-purple-50 rounded-2xl border border-purple-200 text-xs text-purple-950 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-purple-700" />
                  Registro de Pagamento de Repasse
                </p>
                <p className="text-[11px] text-purple-800 leading-relaxed">
                  Registra a saída financeira correspondente ao repasse da profissional <strong>sem gerar duplicidade</strong> de comissão.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-tb-brown-soft uppercase tracking-wider block mb-1">
                    Valor a Pagar (R$):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={repassPayAmount}
                    onChange={(e) => setRepassPayAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-tb-rose-light bg-white text-xs font-black text-tb-brown-dark"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-tb-brown-soft uppercase tracking-wider block mb-1">
                    Forma de Pagamento:
                  </label>
                  <select
                    value={repassPayMethod}
                    onChange={(e) => setRepassPayMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 rounded-xl border border-tb-rose-light bg-white text-xs font-bold text-tb-brown-dark"
                  >
                    <option value="pix">PIX</option>
                    <option value="transferencia">Transferência</option>
                    <option value="dinheiro">Dinheiro</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-tb-brown-soft uppercase tracking-wider block mb-1">
                    Data do Repasse:
                  </label>
                  <input
                    type="date"
                    value={repassPayDate}
                    onChange={(e) => setRepassPayDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-tb-rose-light bg-white text-xs font-semibold text-tb-brown-dark"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-tb-brown-soft uppercase tracking-wider block mb-1">
                  Observações:
                </label>
                <input
                  type="text"
                  placeholder="Ex: Repasse referente ao pacote de manicure quitado via PIX..."
                  value={repassPayNotes}
                  onChange={(e) => setRepassPayNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-ivory text-xs text-tb-brown-dark"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-purple-700 text-white font-bold text-xs shadow-soft hover:bg-purple-800 transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> Confirmar Pagamento do Repasse
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-tb-ivory p-4 px-5 sm:px-6 border-t border-tb-rose-light/40 flex items-center justify-between">
          <div>
            {packageItem.status !== 'cancelado' && (
              showCancelConfirm ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Motivo do cancelamento..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="px-2 py-1 text-xs rounded-lg border border-rose-300 bg-white"
                  />
                  <button
                    onClick={handleCancelPackage}
                    className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700"
                  >
                    Confirmar
                  </button>
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                    className="text-xs text-tb-gray-neutral hover:text-tb-brown-dark"
                  >
                    Voltar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1"
                >
                  <Ban className="w-3.5 h-3.5" /> Cancelar Pacote
                </button>
              )
            )}
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white border border-tb-rose-light text-xs font-bold text-tb-brown-dark hover:bg-tb-rose-blush transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
