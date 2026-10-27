import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  CheckCircle2, 
  DollarSign, 
  Percent, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Receipt, 
  CreditCard, 
  User, 
  Sparkles, 
  Scale,
  Lock,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Attendance, PaymentMethod } from '../../types';
import { formatBRL } from '../../utils/formatters';
import { getTodayDate } from '../../services/storage';
import { ProductConsumptionModal } from './ProductConsumptionModal';

interface AttendanceFinishModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendance: Attendance | null;
  clientId?: string;
  date?: string;
}

interface ServiceItemState {
  attendanceId: string;
  serviceName: string;
  professionalId?: string;
  professionalName: string;
  grossValue: number;
  discountType: 'fixed' | 'percentage';
  discountInput: number;
  netValue: number;
  commissionPercentage: number;
  commissionAmount: number;
  isSelected: boolean;
  attendanceObj: Attendance;
  packageId?: string;
  isPackageCovered?: boolean;
}

interface PaymentRow {
  id: string;
  method: PaymentMethod;
  amount: number;
  notes?: string;
}

export const AttendanceFinishModal: React.FC<AttendanceFinishModalProps> = ({
  isOpen,
  onClose,
  attendance,
  clientId: initialClientId,
  date: initialDate,
}) => {
  const { 
    attendances, 
    clients, 
    services, 
    professionals, 
    comandas,
    finishUnifiedComanda,
    finishAttendance,
    revertAttendance,
    removeServiceFromComanda,
    reopenComanda,
    updateAttendanceProfessional,
    clientPackages,
    getClientActivePackages 
  } = useData();
  const { currentUser } = useAuth();
  const isProfessional = currentUser?.role === 'profissional';

  const [isReopened, setIsReopened] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Selected client & date
  const targetClientId = attendance?.clientId || initialClientId || '';
  const targetDate = attendance?.date || initialDate || getTodayDate();

  const client = clients.find(c => c.id === targetClientId);

  // Existing comanda in storage
  const existingComanda = useMemo(() => {
    return comandas.find(c => c.clientId === targetClientId && c.date === targetDate);
  }, [comandas, targetClientId, targetDate]);

  // Active packages with remaining sessions for this client
  const clientActivePackages = useMemo(() => {
    if (!targetClientId) return [];
    return getClientActivePackages(targetClientId);
  }, [getClientActivePackages, targetClientId, clientPackages]);

  // All attendances for this client on this date
  const relatedAttendances = useMemo(() => {
    if (!targetClientId) return attendance ? [attendance] : [];
    const list = attendances.filter(a => a.clientId === targetClientId && a.date === targetDate);
    if (attendance && !list.some(a => a.id === attendance.id)) {
      list.push(attendance);
    }
    return list;
  }, [attendances, targetClientId, targetDate, attendance]);

  // Guard: Check if comanda is already closed and fully paid (disabled if user explicitly reopens for correction)
  const isAlreadyFullyPaid = useMemo(() => {
    if (isReopened) return false;
    if (existingComanda && existingComanda.status === 'pago') return true;
    return relatedAttendances.length > 0 && relatedAttendances.every(a => !!a.finishedAt && a.paymentStatus === 'pago');
  }, [existingComanda, relatedAttendances, isReopened]);

  // Helper to find if an active package can cover this service
  const findApplicablePackage = (serviceName: string, serviceId: string) => {
    const srv = services.find(s => s.id === serviceId);
    const srvNameLower = (srv?.name || serviceName).toLowerCase();
    const srvCatLower = (srv?.category || '').toLowerCase();

    for (const pkg of clientActivePackages) {
      const match = pkg.items.find(it => {
        if (it.remainingQty <= 0) return false;
        const itTypeLower = it.serviceType.toLowerCase();
        const itNameLower = it.serviceName.toLowerCase();
        
        // Match manicure
        if (itTypeLower === 'manicure' && (srvNameLower.includes('manicure') || srvNameLower.includes('unha') || srvCatLower === 'unhas')) {
          return true;
        }
        // Match pedicure
        if (itTypeLower === 'pedicure' && srvNameLower.includes('pedicure')) {
          return true;
        }
        // Match escova
        if (itTypeLower === 'escova' && (srvNameLower.includes('escova') || srvCatLower === 'cabelo')) {
          return true;
        }
        // Direct string match
        if (srvNameLower.includes(itTypeLower) || srvNameLower.includes(itNameLower)) {
          return true;
        }
        return false;
      });

      if (match) {
        return {
          package: pkg,
          matchedItem: match,
        };
      }
    }
    return null;
  };

  // Form State for all services in this comanda
  const [serviceItems, setServiceItems] = useState<ServiceItemState[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [comandaNotes, setComandaNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal to register product consumption directly
  const [activeAttendanceForConsumption, setActiveAttendanceForConsumption] = useState<Attendance | null>(null);

  // Initialize service items when modal opens
  useEffect(() => {
    if (isOpen && relatedAttendances.length > 0) {
      const items: ServiceItemState[] = relatedAttendances.map(atd => {
        const srv = services.find(s => s.id === atd.serviceId);
        const commPercent = srv?.commissionPercentage ?? atd.commissionPercentage ?? 50;
        const gross = atd.grossValue || srv?.price || 0;
        const discVal = atd.discountValue || 0;
        const discType = atd.discountType || 'fixed';
        const isCovered = atd.isPackageCovered || false;
        const net = isCovered ? 0 : Math.max(0, gross - discVal);

        return {
          attendanceId: atd.id,
          serviceName: atd.serviceName,
          professionalName: atd.professionalName,
          grossValue: gross,
          discountType: discType,
          discountInput: atd.discountType === 'percentage' && gross > 0 ? (discVal / gross) * 100 : discVal,
          netValue: net,
          commissionPercentage: commPercent,
          commissionAmount: ((isCovered ? gross : net) * commPercent) / 100,
          isSelected: true,
          attendanceObj: atd,
          packageId: atd.packageId,
          isPackageCovered: isCovered,
        };
      });

      setServiceItems(items);

      // If comanda already has registered payments, display them; otherwise initialize single payment
      if (existingComanda && existingComanda.payments && existingComanda.payments.length > 0) {
        setPayments(existingComanda.payments.map((p, idx) => ({
          id: p.id || `p_${idx}`,
          method: p.paymentMethod,
          amount: p.amount,
          notes: p.notes || '',
        })));
        if (existingComanda.notes) {
          setComandaNotes(existingComanda.notes);
        }
      } else {
        const initialTotal = items.reduce((acc, i) => acc + i.netValue, 0);
        setPayments([
          {
            id: 'p_1',
            method: 'pix',
            amount: initialTotal,
            notes: '',
          }
        ]);
        setComandaNotes('');
      }

      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, relatedAttendances, services, existingComanda]);

  // Handle service gross value change (Autonomia da profissional)
  const handleServiceGrossChange = (attendanceId: string, newGross: number) => {
    setServiceItems(prev => {
      const next = prev.map(item => {
        if (item.attendanceId !== attendanceId) return item;
        const validGross = Math.max(0, newGross);
        const calculatedDiscount = item.discountType === 'percentage' 
          ? (validGross * item.discountInput) / 100 
          : Math.min(item.discountInput, validGross);
        const net = item.isPackageCovered ? 0 : Math.max(0, validGross - calculatedDiscount);
        return {
          ...item,
          grossValue: validGross,
          netValue: net,
          commissionAmount: ((item.isPackageCovered ? validGross : net) * item.commissionPercentage) / 100,
        };
      });
      // Synchronize payment with new discounted total immediately
      const newNetTotal = Math.max(0, next.filter(i => i.isSelected).reduce((acc, i) => acc + i.netValue, 0));
      setPayments(curr => {
        if (curr.length <= 1) {
          return [{ ...(curr[0] || { id: 'p_1', method: 'pix', notes: '' }), amount: newNetTotal }];
        }
        const otherTotal = curr.slice(0, -1).reduce((acc, p) => acc + (p.amount || 0), 0);
        const last = curr[curr.length - 1];
        return [...curr.slice(0, -1), { ...last, amount: Math.max(0, newNetTotal - otherTotal) }];
      });
      return next;
    });
  };

  // Handle service discount change
  const handleServiceDiscountChange = (attendanceId: string, discInput: number, discType: 'fixed' | 'percentage') => {
    setServiceItems(prev => {
      const next = prev.map(item => {
        if (item.attendanceId !== attendanceId) return item;
        const calculatedDiscount = discType === 'percentage' 
          ? (item.grossValue * discInput) / 100 
          : discInput;
        const net = item.isPackageCovered ? 0 : Math.max(0, item.grossValue - calculatedDiscount);
        return {
          ...item,
          discountInput: discInput,
          discountType: discType,
          netValue: net,
          commissionAmount: ((item.isPackageCovered ? item.grossValue : net) * item.commissionPercentage) / 100,
        };
      });
      // Synchronize payment with new discounted total immediately
      const newNetTotal = Math.max(0, next.filter(i => i.isSelected).reduce((acc, i) => acc + i.netValue, 0));
      setPayments(curr => {
        if (curr.length <= 1) {
          return [{ ...(curr[0] || { id: 'p_1', method: 'pix', notes: '' }), amount: newNetTotal }];
        }
        const otherTotal = curr.slice(0, -1).reduce((acc, p) => acc + (p.amount || 0), 0);
        const last = curr[curr.length - 1];
        return [...curr.slice(0, -1), { ...last, amount: Math.max(0, newNetTotal - otherTotal) }];
      });
      return next;
    });
  };

  // Toggle package credit for a service
  const handleTogglePackageCredit = (attendanceId: string, packageId: string, useCredit: boolean) => {
    setServiceItems(prev => prev.map(item => {
      if (item.attendanceId !== attendanceId) return item;
      if (useCredit) {
        return {
          ...item,
          isPackageCovered: true,
          packageId,
          netValue: 0,
          commissionAmount: (item.grossValue * item.commissionPercentage) / 100,
        };
      } else {
        const calculatedDiscount = item.discountType === 'percentage' 
          ? (item.grossValue * item.discountInput) / 100 
          : Math.min(item.discountInput, item.grossValue);
        const net = Math.max(0, item.grossValue - calculatedDiscount);
        return {
          ...item,
          isPackageCovered: false,
          packageId: undefined,
          netValue: net,
          commissionAmount: (net * item.commissionPercentage) / 100,
        };
      }
    }));
  };

  // Toggle service selection
  // Reset reopened state when modal opens or closes
  useEffect(() => {
    if (!isOpen) {
      setIsReopened(false);
      setSuccessMessage(null);
      setError(null);
    }
  }, [isOpen]);

  const handleToggleSelectService = (attendanceId: string) => {
    setServiceItems(prev => prev.map(item => 
      item.attendanceId === attendanceId ? { ...item, isSelected: !item.isSelected } : item
    ));
  };

  // Change professional for an individual service item inside the comanda
  const handleProfessionalChange = (attendanceId: string, newProfId: string) => {
    const newProf = professionals.find(p => p.id === newProfId);
    if (!newProf) return;

    // 1. Update in DataContext
    updateAttendanceProfessional(attendanceId, newProfId);

    // 2. Update local service items state
    setServiceItems(prev => prev.map(item => {
      if (item.attendanceId === attendanceId) {
        const srv = services.find(s => s.id === item.attendanceObj.serviceId);
        const commPercent = srv?.commissionPercentage ?? item.commissionPercentage ?? 50;
        const calcCommAmount = (item.grossValue * commPercent) / 100;
        return {
          ...item,
          professionalId: newProf.id,
          professionalName: newProf.name,
          commissionPercentage: commPercent,
          commissionAmount: calcCommAmount,
          attendanceObj: {
            ...item.attendanceObj,
            professionalId: newProf.id,
            professionalName: newProf.name,
            commissionPercentage: commPercent,
            commissionAmount: calcCommAmount,
          }
        };
      }
      return item;
    }));
  };

  // Reopen comanda for corrections with zero financial duplication
  const handleReopenComanda = () => {
    const isConfirmed = window.confirm(
      'Deseja reabrir esta comanda para trocar a profissional ou corrigir valores?\n\n' +
      '• Os pagamentos e repasses anteriores serão estornados do caixa temporariamente.\n' +
      '• Você poderá trocar a profissional e salvar novamente.\n' +
      '• O sistema garante ZERO duplicidade: a comanda salva apenas uma vez com os dados corretos.'
    );
    if (!isConfirmed) return;

    setError(null);
    const targetCmdId = existingComanda?.id || attendance?.comandaId || attendance?.id || targetClientId;
    const res = reopenComanda(targetCmdId, targetDate);
    if (!res.success) {
      setError(res.error || 'Erro ao reabrir comanda.');
      return;
    }

    setIsReopened(true);
    setSuccessMessage('Comanda reaberta com sucesso! Agora você pode trocar a profissional no menu de serviços ou ajustar valores e concluir novamente sem duplicidades.');
  };

  // Revert attendance back to scheduled/awaiting start
  const handleRevertItem = (attendanceId: string, serviceName: string) => {
    const isConfirmed = window.confirm(
      `Deseja realmente voltar o serviço "${serviceName}" para a solicitação de agendamento?\n\nEle sairá desta comanda e retornará para a lista de aguardando atendimento. O horário e agendamento permanecerão intactos na agenda.`
    );
    if (!isConfirmed) return;

    const res = revertAttendance(attendanceId);
    if (!res.success) {
      setError(res.error || 'Erro ao reverter atendimento.');
      return;
    }

    if (serviceItems.length <= 1) {
      onClose();
    } else {
      setServiceItems(prev => prev.filter(item => item.attendanceId !== attendanceId));
    }
  };

  // Remove service from comanda completely
  const handleRemoveServiceItem = (attendanceId: string, serviceName: string) => {
    const isConfirmed = window.confirm(
      `Deseja realmente remover o serviço "${serviceName}" desta comanda?\n\nO valor será deduzido da comanda. Se veio de um agendamento, ele voltará para o status Agendado na agenda sem perdas.`
    );
    if (!isConfirmed) return;

    const res = removeServiceFromComanda(attendanceId);
    if (!res.success) {
      setError(res.error || 'Erro ao remover serviço da comanda.');
      return;
    }

    if (serviceItems.length <= 1) {
      onClose();
    } else {
      setServiceItems(prev => prev.filter(item => item.attendanceId !== attendanceId));
    }
  };

  // Totals calculations
  const selectedServices = serviceItems.filter(i => i.isSelected);
  const subtotal = selectedServices.reduce((acc, i) => acc + i.grossValue, 0);
  const discountTotal = selectedServices.reduce((acc, i) => {
    if (i.isPackageCovered) return acc;
    const disc = i.discountType === 'percentage' ? (i.grossValue * i.discountInput) / 100 : i.discountInput;
    return acc + disc;
  }, 0);
  const netTotal = Math.max(0, selectedServices.reduce((acc, i) => acc + i.netValue, 0));

  // Auto-sync single payment to netTotal
  useEffect(() => {
    if (payments.length === 1) {
      setPayments(prev => [{ ...prev[0], amount: netTotal }]);
    }
  }, [netTotal, payments.length]);

  const totalPaid = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const pendingBalance = Math.max(0, netTotal - totalPaid);

  const paymentStatus: 'pago' | 'parcial' | 'pendente' = 
    pendingBalance <= 0.01 ? 'pago' : totalPaid > 0 ? 'parcial' : 'pendente';

  // Group commissions by professional for instant daily payout preview
  const professionalCommissionsSummary = useMemo(() => {
    const map = new Map<string, {
      profName: string;
      grossTotal: number;
      netTotal: number;
      commissionTotal: number;
      servicesCount: number;
    }>();

    selectedServices.forEach(item => {
      const profId = item.attendanceObj.professionalId || item.professionalName;
      const existing = map.get(profId) || {
        profName: item.professionalName,
        grossTotal: 0,
        netTotal: 0,
        commissionTotal: 0,
        servicesCount: 0,
      };

      const paidRatio = netTotal > 0 ? (totalPaid / netTotal) : 1;
      const atdPaid = paymentStatus === 'pago' ? item.netValue : Math.min(item.netValue, item.netValue * paidRatio);
      // If covered by package, commission is calculated based on gross value
      const atdComm = item.isPackageCovered
        ? (item.grossValue * item.commissionPercentage) / 100
        : (atdPaid * item.commissionPercentage) / 100;

      existing.grossTotal += item.grossValue;
      existing.netTotal += item.isPackageCovered ? item.grossValue : item.netValue;
      existing.commissionTotal += atdComm;
      existing.servicesCount += 1;

      map.set(profId, existing);
    });

    return Array.from(map.values());
  }, [selectedServices, netTotal, totalPaid, paymentStatus]);

  // Payment methods list handlers
  const handleAddPaymentRow = () => {
    const remaining = Math.max(0, netTotal - totalPaid);
    setPayments(prev => [
      ...prev,
      {
        id: `p_${Date.now()}`,
        method: 'cartao_credito',
        amount: remaining,
        notes: '',
      }
    ]);
  };

  const handleUpdatePayment = (id: string, field: 'method' | 'amount' | 'notes', val: any) => {
    setPayments(prev => prev.map(p => {
      if (p.id !== id) return p;
      return { ...p, [field]: val };
    }));
  };

  const handleRemovePaymentRow = (id: string) => {
    if (payments.length === 1) return; // Keep at least one
    setPayments(prev => prev.filter(p => p.id !== id));
  };

  const handleSettleRemaining = () => {
    if (payments.length > 0) {
      const otherTotal = payments.slice(0, -1).reduce((acc, p) => acc + (p.amount || 0), 0);
      const needed = Math.max(0, netTotal - otherTotal);
      setPayments(prev => {
        const copy = [...prev];
        copy[copy.length - 1].amount = needed;
        return copy;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isSubmitting) return;

    if (isAlreadyFullyPaid) {
      setError('Esta comanda já foi finalizada e quitada anteriormente. Não é permitido salvar novamente para evitar duplicidade financeira.');
      return;
    }

    if (selectedServices.length === 0) {
      setError('Selecione pelo menos um serviço para fechar na comanda.');
      return;
    }

    if (totalPaid < 0 || isNaN(totalPaid)) {
      setError('Informe valores de pagamento válidos.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Call unified finish
      const res = finishUnifiedComanda({
        clientId: targetClientId,
        date: targetDate,
        attendancesUpdates: selectedServices.map(s => {
          const discVal = s.isPackageCovered
            ? 0
            : s.discountType === 'percentage' 
              ? (s.grossValue * s.discountInput) / 100 
              : s.discountInput;
          return {
            attendanceId: s.attendanceId,
            grossValue: s.grossValue,
            discountValue: discVal,
            discountType: s.discountType,
            netValue: s.netValue,
            packageId: s.packageId,
            isPackageCovered: s.isPackageCovered,
          };
        }),
        payments: payments.filter(p => p.amount > 0).map(p => ({
          paymentMethod: p.method,
          amount: p.amount,
          notes: p.notes,
        })),
        notes: comandaNotes,
      });

      if (!res.success) {
        setError(res.error || 'Erro ao finalizar a comanda.');
        setIsSubmitting(false);
        return;
      }

      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erro ao processar fechamento da comanda.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-tb-brown-dark/50 backdrop-blur-sm animate-fade-in">
        <div className="bg-tb-white rounded-3xl shadow-premium border border-tb-rose-light/50 w-full max-w-2xl overflow-hidden flex flex-col max-h-[95vh]">
          {/* Header */}
          <div className="px-6 py-4 bg-tb-ivory border-b border-tb-rose-light/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-tb-rose-blush text-tb-rose-primary flex items-center justify-center shadow-xs">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif-brand text-xl font-bold text-tb-brown-dark">
                    Fechamento Unificado da Comanda
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {relatedAttendances.length} Serviço(s)
                  </span>
                </div>
                <p className="text-xs text-tb-gray-neutral">
                  Cliente: <span className="font-bold text-tb-brown-dark">{client?.name || attendance?.clientName}</span> • Data: {targetDate}
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
          <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
            {isAlreadyFullyPaid && (
              <div className="p-3.5 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-xs text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Comanda Finalizada & Quitada (Visualização / Recibo)</p>
                    <p className="text-[11px] text-emerald-800">
                      O pagamento já foi registrado no caixa. Precisa corrigir a profissional ou os valores? Reabra a comanda abaixo sem risco de duplicidade.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={handleReopenComanda}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
                    title="Reabrir comanda para trocar profissional ou valores sem duplicar"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reabrir / Corrigir
                  </button>
                  <span className="px-3 py-1 bg-emerald-600 text-white font-bold text-xs rounded-full shrink-0">
                    ✓ PAGO
                  </span>
                </div>
              </div>
            )}
            {successMessage && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 flex items-start gap-2 shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Active packages banner for this client */}
            {clientActivePackages.length > 0 && (
              <div className="p-3 bg-gradient-to-r from-emerald-50 via-teal-50/60 to-emerald-50/40 border border-emerald-300/80 rounded-2xl flex items-start gap-3 shadow-2xs">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 font-bold text-sm shadow-xs">
                  🎁
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-950">
                      Pacotes & Créditos Ativos da Cliente ({client?.name})
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                      {clientActivePackages.length} Pacote(s)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {clientActivePackages.map(pkg => (
                      <div key={pkg.id} className="text-[11px] px-2.5 py-1 bg-white border border-emerald-300 rounded-xl text-emerald-900 flex items-center gap-1.5 shadow-2xs">
                        <span className="font-bold">{pkg.packageName}:</span>
                        <span className="font-semibold text-emerald-700">
                          {pkg.items.map(i => `${i.remainingQty}/${i.totalQty} ${i.serviceName}`).join(' • ')}
                        </span>
                        <span className="text-[10px] text-emerald-600">(até {pkg.expiryDate})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Section 1: Services included in this comanda */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-tb-brown-dark uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-tb-rose-primary" />
                  1. Serviços Realizados Pela Cliente Hoje
                </h4>
                <span className="text-[11px] text-tb-gray-neutral">
                  Valores editáveis pela profissional e conferência de comissão
                </span>
              </div>

              <div className="space-y-2.5">
                {serviceItems.map(item => {
                  const applicable = findApplicablePackage(item.serviceName, item.attendanceObj.serviceId);
                  
                  return (
                    <div
                      key={item.attendanceId}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        item.isPackageCovered
                          ? 'bg-emerald-50/50 border-emerald-300 shadow-2xs'
                          : item.isSelected 
                            ? 'bg-tb-ivory border-tb-rose-light/80 shadow-2xs' 
                            : 'bg-gray-50 border-gray-200 opacity-60'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <input
                            type="checkbox"
                            checked={item.isSelected}
                            onChange={() => handleToggleSelectService(item.attendanceId)}
                            className="mt-1 rounded text-tb-rose-primary focus:ring-tb-rose-primary"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-tb-brown-dark block">
                                {item.serviceName}
                              </span>
                              {item.isPackageCovered && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-600 text-white shadow-2xs">
                                  🎁 Coberto por Pacote
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[11px] text-tb-brown-soft font-medium">Profissional:</span>
                              {!isAlreadyFullyPaid ? (
                                <select
                                  value={item.professionalId || item.attendanceObj.professionalId}
                                  onChange={e => handleProfessionalChange(item.attendanceId, e.target.value)}
                                  className="text-xs font-bold text-tb-brown-dark bg-tb-white border border-tb-rose-light/90 rounded-lg px-2 py-0.5 shadow-2xs focus:ring-1 focus:ring-tb-rose-primary"
                                  title="Selecione a profissional correta para este serviço"
                                >
                                  {professionals.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                  ))}
                                </select>
                              ) : (
                                <span className="font-semibold text-tb-brown-dark">{item.professionalName}</span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                                Repasse: {item.commissionPercentage}% ({formatBRL(item.commissionAmount)})
                              </span>
                              <button
                                type="button"
                                onClick={() => setActiveAttendanceForConsumption(item.attendanceObj)}
                                className="text-[10px] text-amber-800 hover:text-amber-900 font-bold bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors"
                              >
                                <Scale className="w-3 h-3" />
                                Produtos / Gramatura
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRevertItem(item.attendanceId, item.serviceName)}
                                className="text-[10px] text-rose-700 hover:text-rose-800 font-semibold bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors"
                                title="Voltar serviço para solicitação/agendamento caso tenha sido iniciado por engano"
                              >
                                <RotateCcw className="w-3 h-3" />
                                Voltar p/ Agendamento
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveServiceItem(item.attendanceId, item.serviceName)}
                                className="text-[10px] text-red-700 hover:text-red-800 font-bold bg-red-50 hover:bg-red-100 border border-red-200 px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors"
                                title="Remover este serviço da comanda"
                              >
                                <Trash2 className="w-3 h-3 text-red-600" />
                                Remover da Comanda
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Pricing autonomy and individual discount */}
                        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-tb-rose-light/40">
                          {/* Autonomia de Preço: profissional pode alterar o valor bruto diretamente */}
                          <div className="text-right">
                            <span className="text-[10px] text-tb-gray-neutral block font-medium" title="Autonomia: profissional pode alterar para preço diferencial">
                              Valor Bruto (R$)
                            </span>
                            <div className="flex items-center gap-1 justify-end">
                              <input
                                type="number"
                                step="1.00"
                                min="0"
                                value={item.grossValue}
                                onChange={e => handleServiceGrossChange(item.attendanceId, parseFloat(e.target.value) || 0)}
                                className="w-20 text-xs px-2 py-1 rounded-lg border border-tb-rose-light bg-tb-white text-right font-bold text-tb-brown-dark shadow-2xs focus:ring-1 focus:ring-tb-rose-primary focus:border-tb-rose-primary"
                                title="Autonomia da profissional: altere o valor do serviço se esta cliente possuir preço diferenciado"
                              />
                            </div>
                          </div>

                          {/* Discount */}
                          {!item.isPackageCovered && (
                            <div>
                              <span className="text-[10px] text-tb-gray-neutral block text-right font-medium">Desconto</span>
                              <div className="flex items-center gap-1 justify-end mt-0.5">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={item.discountInput}
                                  onChange={e => handleServiceDiscountChange(item.attendanceId, parseFloat(e.target.value) || 0, item.discountType)}
                                  className="w-16 text-xs px-2 py-1 rounded-lg border border-tb-rose-light bg-tb-white text-right font-medium text-rose-700 shadow-2xs focus:ring-1 focus:ring-tb-rose-primary"
                                  placeholder="0,00"
                                />
                                <div className="flex rounded-md border border-tb-rose-light overflow-hidden shrink-0 text-[10px]">
                                  <button
                                    type="button"
                                    onClick={() => handleServiceDiscountChange(item.attendanceId, item.discountInput, 'fixed')}
                                    className={`px-1.5 py-1 font-semibold ${item.discountType === 'fixed' ? 'bg-tb-rose-primary text-white' : 'bg-tb-white text-tb-brown-dark hover:bg-tb-ivory'}`}
                                  >
                                    R$
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleServiceDiscountChange(item.attendanceId, item.discountInput, 'percentage')}
                                    className={`px-1.5 py-1 font-semibold ${item.discountType === 'percentage' ? 'bg-tb-rose-primary text-white' : 'bg-tb-white text-tb-brown-dark hover:bg-tb-ivory'}`}
                                  >
                                    %
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Net Value */}
                          <div className="text-right min-w-[70px]">
                            <span className="text-[10px] text-tb-gray-neutral block">A Cobrar</span>
                            <span className={`text-xs font-bold ${item.isPackageCovered ? 'text-emerald-700' : 'text-tb-rose-primary'}`}>
                              {item.isPackageCovered ? 'R$ 0,00' : formatBRL(item.netValue)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Package credit banner for this service row */}
                      {applicable && (
                        <div className="mt-2.5 pt-2.5 border-t border-tb-rose-light/40 flex flex-wrap items-center justify-between gap-2 bg-white/80 p-2.5 rounded-xl border border-emerald-200 shadow-2xs">
                          <div className="flex items-center gap-2">
                            <span className="text-base">🎁</span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-emerald-950">
                                  {applicable.package.packageName}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.2 bg-emerald-100 text-emerald-800 rounded-md border border-emerald-300">
                                  {applicable.matchedItem.remainingQty} {applicable.matchedItem.serviceName}(s) restante(s)
                                </span>
                              </div>
                              <p className="text-[10px] text-emerald-700">
                                Cliente possui sessões disponíveis. Ao usar, a cliente paga R$ 0,00 e o repasse da profissional é preservado.
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleTogglePackageCredit(item.attendanceId, applicable.package.id, !item.isPackageCovered)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 ${
                              item.isPackageCovered
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                : 'bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-50'
                            }`}
                          >
                            {item.isPackageCovered ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Usando Crédito (Cliente R$ 0,00)
                              </>
                            ) : (
                              <>
                                <span>Usar 1 Crédito do Pacote</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Summary Box */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-tb-rose-blush/60 via-tb-ivory to-tb-beige-light/40 border border-tb-rose-light/70 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[11px] text-tb-brown-soft block">Subtotal dos Serviços: {formatBRL(subtotal)}</span>
                <span className="text-[11px] text-rose-600 block">Descontos Concedidos: -{formatBRL(discountTotal)}</span>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-semibold text-tb-brown-soft block uppercase tracking-wider">
                  Total a Cobrar da Cliente
                </span>
                <span className="text-2xl font-bold text-tb-brown-dark">
                  {formatBRL(netTotal)}
                </span>
              </div>
            </div>

            {/* Section 2: Multiple Payment Methods & Partial Payment */}
            <div className="space-y-3 pt-2 border-t border-tb-rose-light/40">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-tb-brown-dark uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-tb-rose-primary" />
                    2. Recebimento & Formas de Pagamento
                  </h4>
                  <p className="text-[11px] text-tb-gray-neutral">
                    Combine múltiplas formas (ex: Dinheiro + Pix + Cartão) ou registre pagamento parcial
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPayments([{ id: 'p_1', method: 'pix', amount: netTotal, notes: '' }]);
                    }}
                    className="px-2.5 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl flex items-center gap-1 transition-all shadow-2xs"
                    title="Preenche o painel de pagamento com o valor líquido total com desconto"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Valor Total c/ Desconto: {formatBRL(netTotal)}
                  </button>
                  <button
                    type="button"
                    onClick={handleAddPaymentRow}
                    className="px-3 py-1.5 text-xs font-semibold bg-tb-ivory hover:bg-tb-beige-light text-tb-brown-dark border border-tb-rose-light rounded-xl flex items-center gap-1.5 transition-all shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5 text-tb-rose-primary" />
                    Outra Forma
                  </button>
                </div>
              </div>

              {/* Payments Rows */}
              <div className="space-y-2">
                {payments.map((p, idx) => (
                  <div key={p.id} className="p-3 bg-tb-ivory rounded-xl border border-tb-rose-light/50 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-tb-brown-soft w-6">
                      #{idx + 1}
                    </span>

                    {/* Method */}
                    <div className="flex-1 min-w-[130px]">
                      <select
                        value={p.method}
                        onChange={e => handleUpdatePayment(p.id, 'method', e.target.value as PaymentMethod)}
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-tb-rose-light bg-tb-white text-tb-brown-dark font-medium"
                      >
                        <option value="pix">PIX</option>
                        <option value="cartao_credito">Cartão de Crédito</option>
                        <option value="cartao_debito">Cartão de Débito</option>
                        <option value="dinheiro">Dinheiro</option>
                        <option value="transferencia">Transferência Bancária</option>
                        <option value="outros">Outros</option>
                      </select>
                    </div>

                    {/* Amount */}
                    <div className="w-28 relative">
                      <span className="absolute left-2.5 top-1.5 text-xs text-tb-gray-neutral">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={p.amount}
                        onChange={e => handleUpdatePayment(p.id, 'amount', parseFloat(e.target.value) || 0)}
                        className="w-full text-xs pl-8 pr-2 py-1.5 rounded-lg border border-tb-rose-light bg-tb-white text-right font-bold text-tb-brown-dark"
                      />
                    </div>

                    {/* Notes */}
                    <div className="flex-1 min-w-[120px]">
                      <input
                        type="text"
                        placeholder="Obs (ex: 2x no cartão, sinal...)"
                        value={p.notes || ''}
                        onChange={e => handleUpdatePayment(p.id, 'notes', e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-tb-rose-light bg-tb-white text-tb-brown-dark"
                      />
                    </div>

                    {/* Remove button */}
                    {payments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePaymentRow(p.id)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Remover linha"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Status and pending display */}
              <div className="p-3.5 bg-tb-white rounded-xl border border-tb-rose-light/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-tb-brown-dark">Total Pago Agora:</span>
                    <span className="font-bold text-emerald-700">{formatBRL(totalPaid)}</span>
                  </div>
                  {pendingBalance > 0.01 && (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-amber-800">Saldo Pendente:</span>
                      <span className="font-bold text-amber-800">{formatBRL(pendingBalance)}</span>
                      <button
                        type="button"
                        onClick={handleSettleRemaining}
                        className="text-[10px] text-tb-rose-primary underline font-medium hover:text-tb-brown-dark"
                      >
                        Quitar total
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    paymentStatus === 'pago' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                    paymentStatus === 'parcial' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                    'bg-rose-100 text-rose-800 border border-rose-200'
                  }`}>
                    Situação: {paymentStatus === 'pago' ? '✓ Quitado Integralmente' : paymentStatus === 'parcial' ? '⚠ Parcialmente Pago' : '⏳ Pendente / Fiado'}
                  </span>
                </div>
              </div>
            </div>

            {/* General Comanda Notes */}
            <div>
              <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
                Observações Gerais da Comanda
              </label>
              <textarea
                rows={2}
                value={comandaNotes}
                onChange={e => setComandaNotes(e.target.value)}
                placeholder="Ex: Cliente elogiou o atendimento, retornará no próximo mês..."
                className="w-full text-xs p-3 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark resize-none"
              />
            </div>

            {/* Live Professional Commissions Calculation Preview */}
            <div className="p-4 bg-emerald-50/80 rounded-2xl border-2 border-emerald-300 space-y-2.5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <DollarSign className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-950">
                      Cálculo de Repasse às Profissionais (Pagamento Diário)
                    </h4>
                    <p className="text-[10px] text-emerald-800">
                      Liberado na mesma hora no painel assim que fechar a comanda
                    </p>
                  </div>
                </div>

                <span className="text-xs font-extrabold text-emerald-800 bg-white px-2.5 py-1 rounded-lg border border-emerald-300 shadow-2xs">
                  Total Repasse: {formatBRL(professionalCommissionsSummary.reduce((acc, p) => acc + p.commissionTotal, 0))}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {professionalCommissionsSummary.map((prof, idx) => (
                  <div key={idx} className="bg-white p-2.5 rounded-xl border border-emerald-200 shadow-2xs flex items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-tb-brown-dark block">{prof.profName}</span>
                      <span className="text-[10px] text-tb-gray-neutral block">
                        Bruto: {formatBRL(prof.grossTotal)} • Base: {formatBRL(prof.netTotal)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-extrabold text-emerald-700 block">
                        +{formatBRL(prof.commissionTotal)}
                      </span>
                      <span className="text-[9px] font-bold text-emerald-600 uppercase">
                        A Pagar Hoje
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="pt-3 border-t border-tb-rose-light/40 flex items-center justify-end gap-3">
              {isAlreadyFullyPaid ? (
                <>
                  <button
                    type="button"
                    onClick={handleReopenComanda}
                    className="px-4 py-2.5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-soft hover:shadow-premium transition-all flex items-center gap-2"
                    title="Reabrir esta comanda para trocar a profissional ou corrigir valores sem duplicar o caixa"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reabrir / Corrigir Profissional
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2.5 text-xs font-semibold bg-tb-ivory hover:bg-tb-beige-light text-tb-brown-dark border border-tb-rose-light rounded-xl shadow-xs transition-all flex items-center gap-2"
                  >
                    <Receipt className="w-4 h-4 text-tb-rose-primary" />
                    Imprimir Recibo
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2.5 text-xs font-semibold bg-tb-rose-primary hover:bg-[#b57f8c] text-white rounded-xl shadow-soft transition-all"
                  >
                    Fechar Visualização
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="px-4 py-2.5 text-xs font-medium text-tb-brown-soft hover:text-tb-brown-dark rounded-xl disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-soft hover:shadow-premium transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Salvando Fechamento...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Concluir Fechamento da Comanda
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Product Consumption Modal if opened */}
      <ProductConsumptionModal
        isOpen={!!activeAttendanceForConsumption}
        onClose={() => setActiveAttendanceForConsumption(null)}
        attendance={activeAttendanceForConsumption}
      />
    </>
  );
};
