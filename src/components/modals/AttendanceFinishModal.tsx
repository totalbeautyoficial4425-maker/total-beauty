import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, DollarSign, Percent, AlertCircle } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Attendance, PaymentMethod } from '../../types';
import { formatBRL } from '../../utils/formatters';

interface AttendanceFinishModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendance: Attendance | null;
}

export const AttendanceFinishModal: React.FC<AttendanceFinishModalProps> = ({
  isOpen,
  onClose,
  attendance,
}) => {
  const { finishAttendance } = useData();

  const [grossValue, setGrossValue] = useState(0);
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [discountInput, setDiscountInput] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [paymentStatus, setPaymentStatus] = useState<'pago' | 'pendente' | 'parcial'>('pago');
  const [paidAmount, setPaidAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Calculate discount and net values
  const discountValue = discountType === 'percentage' 
    ? (grossValue * discountInput) / 100 
    : discountInput;
  const netValue = Math.max(0, grossValue - discountValue);

  useEffect(() => {
    if (isOpen && attendance) {
      setGrossValue(attendance.grossValue || 0);
      setDiscountType('fixed');
      setDiscountInput(0);
      setPaymentMethod('pix');
      setPaymentStatus('pago');
      setPaidAmount(attendance.grossValue || 0);
      setNotes(attendance.notes || '');
      setError(null);
    }
  }, [isOpen, attendance]);

  // Sync paidAmount when netValue or paymentStatus changes
  useEffect(() => {
    if (paymentStatus === 'pago') {
      setPaidAmount(netValue);
    } else if (paymentStatus === 'pendente') {
      setPaidAmount(0);
    }
  }, [netValue, paymentStatus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendance) return;

    if (paidAmount < 0 || isNaN(paidAmount)) {
      setError('Informe um valor pago válido.');
      return;
    }

    const res = finishAttendance(attendance.id, {
      grossValue,
      discountValue,
      discountType,
      netValue,
      paymentMethod,
      paymentStatus,
      paidAmount,
      notes,
    });

    if (!res.success) {
      setError(res.error || 'Erro ao concluir o atendimento.');
      return;
    }

    onClose();
  };

  if (!isOpen || !attendance) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tb-brown-dark/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-tb-white rounded-2xl shadow-premium border border-tb-rose-light/50 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-tb-ivory border-b border-tb-rose-light/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif-brand text-xl font-bold text-tb-brown-dark">
                Concluir Atendimento
              </h3>
              <p className="text-xs text-tb-gray-neutral">
                {attendance.clientName} • {attendance.serviceName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-tb-gray-neutral hover:text-tb-brown-dark rounded-lg hover:bg-tb-beige-light transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Pricing & Discounts */}
          <div className="p-4 bg-tb-ivory rounded-xl border border-tb-rose-light/50 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-tb-brown-dark">Valor do Serviço:</span>
              <span className="font-bold text-tb-brown-dark text-sm">{formatBRL(grossValue)}</span>
            </div>

            {/* Discount selector */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-tb-rose-light/30">
              <div>
                <label className="block text-[11px] font-medium text-tb-brown-soft mb-1">
                  Desconto Concedido:
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={discountInput}
                    onChange={e => setDiscountInput(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-tb-rose-light bg-tb-white"
                  />
                  <div className="flex rounded-lg border border-tb-rose-light overflow-hidden shrink-0">
                    <button
                      type="button"
                      onClick={() => setDiscountType('fixed')}
                      className={`px-2 py-1 text-[11px] font-semibold ${
                        discountType === 'fixed' ? 'bg-tb-rose-primary text-white' : 'bg-tb-white text-tb-brown-dark'
                      }`}
                    >
                      R$
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType('percentage')}
                      className={`px-2 py-1 text-[11px] font-semibold ${
                        discountType === 'percentage' ? 'bg-tb-rose-primary text-white' : 'bg-tb-white text-tb-brown-dark'
                      }`}
                    >
                      %
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-right flex flex-col justify-end">
                <span className="text-[11px] text-tb-gray-neutral">Valor Líquido Final:</span>
                <span className="text-lg font-bold text-tb-rose-primary">{formatBRL(netValue)}</span>
              </div>
            </div>
          </div>

          {/* Payment Method & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
                Forma de Pagamento
              </label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark"
              >
                <option value="pix">PIX</option>
                <option value="cartao_credito">Cartão de Crédito</option>
                <option value="cartao_debito">Cartão de Débito</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="transferencia">Transferência Bancária</option>
                <option value="outros">Outros</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
                Situação do Pagamento
              </label>
              <select
                value={paymentStatus}
                onChange={e => setPaymentStatus(e.target.value as any)}
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark"
              >
                <option value="pago">Pago Integralmente</option>
                <option value="parcial">Pagamento Parcial (Sinal)</option>
                <option value="pendente">Pendente / Fiado</option>
              </select>
            </div>
          </div>

          {/* Paid Amount */}
          {paymentStatus !== 'pendente' && (
            <div>
              <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
                Valor Recebido Efetivamente (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={paidAmount}
                onChange={e => setPaidAmount(parseFloat(e.target.value) || 0)}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark font-medium"
              />
              {netValue - paidAmount > 0 && (
                <p className="text-[11px] text-amber-600 mt-1 font-medium">
                  Saldo residual pendente: {formatBRL(netValue - paidAmount)}
                </p>
              )}
            </div>
          )}

          {/* Execution Notes */}
          <div>
            <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
              Observações do Atendimento
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Tonalidade de esmalte usada, produtos aplicados, retorno em 20 dias..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark resize-none"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-tb-rose-light/40 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-medium text-tb-brown-soft hover:text-tb-brown-dark rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-soft hover:shadow-premium transition-all flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Finalizar Atendimento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
