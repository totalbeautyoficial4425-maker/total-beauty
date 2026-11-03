import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Package, 
  User, 
  DollarSign, 
  Calendar, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Sparkles, 
  AlertCircle,
  Percent,
  Search,
  ShieldCheck,
  RotateCcw,
  Calculator
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { PaymentMethod, ClientPackage } from '../../types';
import { formatBRL, getTodayDate } from '../../utils/formatters';
import { calculateProportionalPackagePrices } from '../../utils/packageCalculations';

interface PackageSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialClientId?: string;
  initialPackage?: ClientPackage | null;
  onSuccess?: (pkg: ClientPackage) => void;
}

interface ItemForm {
  serviceType: string;
  serviceName: string;
  totalQty: number;
  referencePrice?: number;
}

export const PackageSaleModal: React.FC<PackageSaleModalProps> = ({
  isOpen,
  onClose,
  initialClientId,
  initialPackage,
  onSuccess,
}) => {
  const { clients, services, professionals, sellPackage } = useData();

  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [clientSearch, setClientSearch] = useState<string>('');
  const [selectedProfId, setSelectedProfId] = useState<string>('');

  const [packageName, setPackageName] = useState<string>('Pacote de Unha (4 Manicures + 2 Pedicures)');
  const [totalPrice, setTotalPrice] = useState<number>(205);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [saleDate, setSaleDate] = useState<string>(getTodayDate());
  const [validityDays, setValidityDays] = useState<number>(90);

  // Repasse / Comissão
  const [repassType, setRepassType] = useState<'percentual' | 'fixo'>('percentual');
  const [repassValue, setRepassValue] = useState<number>(40);

  // Items
  const [items, setItems] = useState<ItemForm[]>([
    { serviceType: 'Manicure', serviceName: 'Manicure (Mãos)', totalQty: 4, referencePrice: 30 },
    { serviceType: 'Pedicure', serviceName: 'Pedicure (Pés)', totalQty: 2, referencePrice: 35 },
  ]);

  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setIsSubmitting(false);

      if (initialPackage) {
        // Mode: Renovação de pacote existente
        setSelectedClientId(initialPackage.clientId);
        setClientSearch(initialPackage.clientName);
        setSelectedProfId(initialPackage.professionalId || '');
        setPackageName(initialPackage.name || initialPackage.packageName || 'Pacote de Serviços');
        setTotalPrice(initialPackage.totalPricePaid || 205);
        setPaymentMethod(initialPackage.paymentMethod || 'pix');
        setRepassType(initialPackage.repassType || 'percentual');
        setRepassValue(initialPackage.commissionPercentage ?? initialPackage.repassValue ?? 40);
        setItems(initialPackage.items.map(it => ({
          serviceType: it.serviceType,
          serviceName: it.serviceName,
          totalQty: it.totalQty,
          referencePrice: it.referencePrice,
        })));
        setNotes(`Renovação de pacote anterior (${initialPackage.id.slice(-4).toUpperCase()})`);
      } else if (initialClientId) {
        setSelectedClientId(initialClientId);
        const c = clients.find(cl => cl.id === initialClientId);
        if (c) setClientSearch(c.name);
        applyPreset('unha');
      } else {
        setSelectedClientId('');
        setClientSearch('');
        applyPreset('unha');
      }
    }
  }, [isOpen, initialClientId, initialPackage]);

  const filteredClients = useMemo(() => {
    if (!clientSearch || selectedClientId) return [];
    const term = clientSearch.toLowerCase().trim();
    return clients
      .filter(c => !c.isArchived && (c.name.toLowerCase().includes(term) || (c.phone && c.phone.includes(term))))
      .slice(0, 6);
  }, [clients, clientSearch, selectedClientId]);

  const selectedClient = useMemo(() => {
    return clients.find(c => c.id === selectedClientId);
  }, [clients, selectedClientId]);

  // Proportional distribution calculation in real time
  const proportionalPreview = useMemo(() => {
    return calculateProportionalPackagePrices(totalPrice, items, services);
  }, [totalPrice, items, services]);

  // Commission & Salon Margin in real time
  const calculatedCommission = useMemo(() => {
    if (repassType === 'percentual') {
      return Math.round(((totalPrice * (repassValue || 0)) / 100) * 100) / 100;
    }
    return repassValue || 0;
  }, [totalPrice, repassType, repassValue]);

  const salonMargin = useMemo(() => {
    return Math.max(0, Math.round((totalPrice - calculatedCommission) * 100) / 100);
  }, [totalPrice, calculatedCommission]);

  const totalCreditsCount = useMemo(() => {
    return items.reduce((acc, it) => acc + (Number(it.totalQty) || 0), 0);
  }, [items]);

  const handleProfChange = (profId: string) => {
    setSelectedProfId(profId);
    if (profId) {
      const p = professionals.find(pr => pr.id === profId);
      if (p && p.commissionPercentage !== undefined && p.commissionPercentage > 0) {
        setRepassValue(p.commissionPercentage);
      }
    }
  };

  const applyPreset = (preset: 'unha' | 'cabelo' | 'custom') => {
    if (preset === 'unha') {
      setPackageName('Pacote de Unha (4 Manicures + 2 Pedicures)');
      setTotalPrice(205);
      setRepassType('percentual');
      setRepassValue(40);
      setItems([
        { serviceType: 'Manicure', serviceName: 'Manicure (Mãos)', totalQty: 4, referencePrice: 30 },
        { serviceType: 'Pedicure', serviceName: 'Pedicure (Pés)', totalQty: 2, referencePrice: 35 },
      ]);
    } else if (preset === 'cabelo') {
      setPackageName('Pacote de Cabelo (4 Escovas)');
      setTotalPrice(252);
      setRepassType('percentual');
      setRepassValue(40);
      setItems([
        { serviceType: 'Escova', serviceName: 'Escova', totalQty: 4, referencePrice: 70 },
      ]);
    } else {
      setPackageName('Pacote Personalizado');
      setTotalPrice(200);
      setRepassType('percentual');
      setRepassValue(40);
      setItems([
        { serviceType: 'Serviço', serviceName: 'Serviço Personalizado', totalQty: 4, referencePrice: 50 },
      ]);
    }
  };

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      { serviceType: 'Outro', serviceName: 'Novo Serviço', totalQty: 1, referencePrice: 50 }
    ]);
  };

  const handleRemoveItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateItem = (idx: number, field: keyof ItemForm, value: any) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      return { ...item, [field]: value };
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedClientId) {
      setError('Selecione a cliente para a venda do pacote.');
      return;
    }

    if (totalPrice < 0 || isNaN(totalPrice)) {
      setError('Informe um valor de venda válido.');
      return;
    }

    if (items.length === 0 || totalCreditsCount <= 0) {
      setError('O pacote deve conter pelo menos um serviço com quantidade maior que zero.');
      return;
    }

    // Expiry date calculation
    let expiryDate: string | undefined = undefined;
    if (validityDays > 0) {
      const d = new Date(saleDate + 'T12:00:00');
      d.setDate(d.getDate() + validityDays);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      expiryDate = `${yyyy}-${mm}-${dd}`;
    }

    setIsSubmitting(true);
    try {
      const res = sellPackage({
        packageName,
        clientId: selectedClientId,
        professionalId: selectedProfId || undefined,
        totalPricePaid: totalPrice,
        paymentMethod,
        saleDate,
        expiryDate,
        items: items.map(it => ({
          serviceType: it.serviceType,
          serviceName: it.serviceName,
          totalQty: Number(it.totalQty) || 1,
          referencePrice: it.referencePrice,
        })),
        commissionPercentage: repassType === 'percentual' ? repassValue : undefined,
        repassType,
        repassValue,
        notes,
      });

      if (!res.success) {
        setError(res.error || 'Erro ao registrar a venda do pacote.');
        setIsSubmitting(false);
        return;
      }

      if (res.package && onSuccess) {
        onSuccess(res.package);
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Falha ao processar a venda.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full border border-tb-rose-light/50 shadow-2xl overflow-hidden my-auto animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-tb-brown-dark via-tb-brown-primary to-tb-brown-soft text-white p-5 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-2xl shadow-inner">
              🎁
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold tracking-tight text-white">
                  {initialPackage ? 'Renovação de Pacote de Serviços' : 'Venda de Pacote Pré-Pago'}
                </h3>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                  Crédito em Carteira
                </span>
              </div>
              <p className="text-xs text-tb-rose-light/90">
                Gera créditos automáticos para a cliente, comissão única na venda e abatimento financeiro proporcional.
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

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Preset Selector */}
          <div>
            <label className="text-xs font-bold text-tb-brown-soft uppercase tracking-wider block mb-2">
              Selecione o Modelo de Pacote:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => applyPreset('unha')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  packageName.includes('Unha')
                    ? 'border-tb-rose-primary bg-tb-rose-blush/60 ring-2 ring-tb-rose-primary/20 shadow-2xs'
                    : 'border-tb-rose-light/50 bg-tb-ivory hover:border-tb-rose-light'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-base">💅</span>
                  <span className="text-xs font-black text-tb-rose-primary">R$ 205,00</span>
                </div>
                <p className="text-xs font-bold text-tb-brown-dark leading-snug">Pacote de Unha</p>
                <p className="text-[10px] text-tb-gray-neutral mt-0.5">4 Manicures + 2 Pedicures (6 sessões)</p>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('cabelo')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  packageName.includes('Cabelo')
                    ? 'border-tb-rose-primary bg-tb-rose-blush/60 ring-2 ring-tb-rose-primary/20 shadow-2xs'
                    : 'border-tb-rose-light/50 bg-tb-ivory hover:border-tb-rose-light'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-base">💇‍♀️</span>
                  <span className="text-xs font-black text-tb-rose-primary">R$ 252,00</span>
                </div>
                <p className="text-xs font-bold text-tb-brown-dark leading-snug">Pacote de Cabelo</p>
                <p className="text-[10px] text-tb-gray-neutral mt-0.5">4 Escovas (R$ 63,00 / escova)</p>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('custom')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  !packageName.includes('Unha') && !packageName.includes('Cabelo')
                    ? 'border-tb-rose-primary bg-tb-rose-blush/60 ring-2 ring-tb-rose-primary/20 shadow-2xs'
                    : 'border-tb-rose-light/50 bg-tb-ivory hover:border-tb-rose-light'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-base">⚙️</span>
                  <span className="text-[11px] font-bold text-tb-brown-soft">Personalizado</span>
                </div>
                <p className="text-xs font-bold text-tb-brown-dark leading-snug">Montar do Zero</p>
                <p className="text-[10px] text-tb-gray-neutral mt-0.5">Defina serviços e créditos</p>
              </button>
            </div>
          </div>

          {/* Client Selection */}
          <div className="relative">
            <label className="text-xs font-bold text-tb-brown-soft uppercase tracking-wider block mb-1.5">
              Cliente do Pacote <span className="text-rose-500">*</span>
            </label>
            {selectedClient ? (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-2xs">
                    {selectedClient.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-emerald-950">{selectedClient.name}</p>
                    <p className="text-xs text-emerald-700">{selectedClient.phone || 'Sem telefone'}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClientId('');
                    setClientSearch('');
                  }}
                  className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 transition-colors"
                >
                  Trocar
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-tb-gray-neutral" />
                <input
                  type="text"
                  placeholder="Pesquise a cliente pelo nome ou WhatsApp..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-tb-rose-light/60 bg-tb-ivory text-xs text-tb-brown-dark placeholder-tb-gray-neutral focus:outline-hidden focus:ring-2 focus:ring-tb-rose-primary/40 focus:border-tb-rose-primary"
                />
                {filteredClients.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl border border-tb-rose-light shadow-xl z-20 overflow-hidden divide-y divide-gray-100 max-h-52 overflow-y-auto">
                    {filteredClients.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedClientId(c.id);
                          setClientSearch(c.name);
                        }}
                        className="w-full text-left p-3 hover:bg-tb-rose-blush/40 flex items-center justify-between text-xs transition-colors"
                      >
                        <div className="font-semibold text-tb-brown-dark">{c.name}</div>
                        <div className="text-tb-gray-neutral text-[11px]">{c.phone}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Package Name & Professional */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-tb-brown-soft uppercase tracking-wider block mb-1">
                Nome do Pacote <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={packageName}
                onChange={(e) => setPackageName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-tb-rose-light/60 bg-tb-ivory text-xs text-tb-brown-dark font-semibold focus:outline-hidden focus:ring-2 focus:ring-tb-rose-primary/40 focus:border-tb-rose-primary"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-tb-brown-soft uppercase tracking-wider block mb-1">
                Profissional Responsável (Comissão)
              </label>
              <select
                value={selectedProfId}
                onChange={(e) => handleProfChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-tb-rose-light/60 bg-tb-ivory text-xs text-tb-brown-dark font-medium focus:outline-hidden focus:ring-2 focus:ring-tb-rose-primary/40 focus:border-tb-rose-primary"
              >
                <option value="">Nenhuma / Salão Direto</option>
                {professionals
                  .filter(p => p.isActive !== false)
                  .map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.commissionPercentage ? `(${p.commissionPercentage}% comissão)` : ''}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Services & Credits Configuration */}
          <div className="p-4 rounded-2xl bg-tb-ivory border border-tb-rose-light/50 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-tb-brown-dark uppercase tracking-wider block">
                  Serviços e Quantidade de Créditos
                </span>
                <span className="text-[11px] text-tb-gray-neutral">
                  Total de créditos contratados: <strong className="text-emerald-700">{totalCreditsCount} atendimentos</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-2.5 py-1 rounded-lg bg-white border border-tb-rose-light text-[11px] font-bold text-tb-rose-primary hover:bg-tb-rose-blush flex items-center gap-1 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar Serviço
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-tb-rose-light/40 shadow-2xs">
                  <div className="w-24 sm:w-32 shrink-0">
                    <input
                      type="text"
                      placeholder="Tipo (ex: Manicure)"
                      value={item.serviceType}
                      onChange={(e) => handleUpdateItem(idx, 'serviceType', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs rounded-lg border border-tb-rose-light/60 font-semibold text-tb-brown-dark"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Nome do serviço"
                      value={item.serviceName}
                      onChange={(e) => handleUpdateItem(idx, 'serviceName', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs rounded-lg border border-tb-rose-light/60 text-tb-brown-dark"
                    />
                  </div>
                  <div className="w-20 shrink-0">
                    <div className="relative">
                      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-tb-gray-neutral">Ref:</span>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        title="Preço individual de referência no Total Beauty"
                        value={item.referencePrice || ''}
                        onChange={(e) => handleUpdateItem(idx, 'referencePrice', parseFloat(e.target.value) || 0)}
                        placeholder="Ref R$"
                        className="w-full pl-7 pr-1 py-1.5 text-[11px] text-right rounded-lg border border-tb-rose-light/60 font-semibold text-tb-brown-dark"
                      />
                    </div>
                  </div>
                  <div className="w-14 shrink-0 flex items-center gap-1">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={item.totalQty}
                      onChange={(e) => handleUpdateItem(idx, 'totalQty', parseInt(e.target.value) || 1)}
                      className="w-full px-2 py-1.5 text-xs text-center rounded-lg border border-tb-rose-light/60 font-black text-tb-rose-primary bg-tb-rose-blush/20"
                    />
                  </div>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Proportional Distribution Preview */}
            <div className="mt-3 p-3 bg-white rounded-xl border border-tb-rose-light/60 space-y-2">
              <span className="text-[11px] font-bold text-tb-brown-dark uppercase tracking-wider flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-tb-rose-primary" />
                Distribuição Proporcional do Pacote (Abatimento por Atendimento):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {proportionalPreview.map((pItem, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-tb-ivory border border-tb-rose-light/40 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-tb-brown-dark block">{pItem.serviceName}</span>
                      <span className="text-[10px] text-tb-gray-neutral">
                        {pItem.totalQty}x • Ref. {formatBRL(pItem.referencePrice || 0)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-emerald-700 block">
                        {formatBRL(pItem.unitPackagePrice || 0)} / unid.
                      </span>
                      <span className="text-[10px] text-tb-gray-neutral">
                        Total: {formatBRL(pItem.totalItemValue || 0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-tb-gray-neutral italic">
                * O sistema realiza cálculos com precisão decimal e ajuste de centavos no último crédito, garantindo que o saldo final seja exatamente R$ 0,00 após todos os atendimentos.
              </p>
            </div>
          </div>

          {/* Pricing & Repasse */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-tb-brown-soft uppercase tracking-wider block mb-1">
                Valor Total (R$) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-tb-gray-neutral">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={totalPrice}
                  onChange={(e) => setTotalPrice(parseFloat(e.target.value) || 0)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-tb-rose-light/60 bg-white text-xs font-black text-tb-brown-dark focus:outline-hidden focus:ring-2 focus:ring-tb-rose-primary/40 focus:border-tb-rose-primary"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-tb-brown-soft uppercase tracking-wider block mb-1">
                Forma de Pagamento <span className="text-rose-500">*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 rounded-xl border border-tb-rose-light/60 bg-white text-xs font-bold text-tb-brown-dark focus:outline-hidden focus:ring-2 focus:ring-tb-rose-primary/40 focus:border-tb-rose-primary"
              >
                <option value="pix">PIX</option>
                <option value="cartao_debito">Cartão de Débito</option>
                <option value="cartao_credito">Cartão de Crédito</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="transferencia">Transferência</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-tb-brown-soft uppercase tracking-wider block mb-1">
                Validade (Dias)
              </label>
              <input
                type="number"
                min="0"
                max="365"
                value={validityDays}
                onChange={(e) => setValidityDays(parseInt(e.target.value) || 0)}
                placeholder="Ex: 90"
                className="w-full px-3 py-2 rounded-xl border border-tb-rose-light/60 bg-white text-xs font-semibold text-tb-brown-dark focus:outline-hidden focus:ring-2 focus:ring-tb-rose-primary/40 focus:border-tb-rose-primary"
              />
            </div>
          </div>

          {/* Repasse da Profissional Rule Container */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/70 to-orange-50/40 border border-amber-200/80 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Comissão da Profissional (Regra Obrigatória do Pacote)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-amber-800 block mb-1">Tipo de Cálculo:</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRepassType('percentual')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      repassType === 'percentual'
                        ? 'bg-amber-600 text-white border-amber-700 shadow-2xs'
                        : 'bg-white text-amber-900 border-amber-200'
                    }`}
                  >
                    Percentual (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRepassType('fixo')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      repassType === 'fixo'
                        ? 'bg-amber-600 text-white border-amber-700 shadow-2xs'
                        : 'bg-white text-amber-900 border-amber-200'
                    }`}
                  >
                    Fixo (R$)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-amber-800 block mb-1">
                  {repassType === 'percentual' ? 'Porcentagem de Comissão (%)' : 'Valor Fixo de Comissão (R$)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={repassValue}
                  onChange={(e) => setRepassValue(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded-lg border border-amber-200 bg-white text-xs font-bold text-amber-950"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-white rounded-xl border border-amber-200/60">
                <span className="text-[10px] text-amber-800 block font-semibold">Comissão da Profissional:</span>
                <span className="text-base font-black text-amber-800">
                  {formatBRL(calculatedCommission)}
                </span>
                <span className="text-[10px] text-amber-700 block mt-0.5">Calculada 1x na venda</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-amber-200/60">
                <span className="text-[10px] text-amber-800 block font-semibold">Margem do Salão:</span>
                <span className="text-base font-black text-tb-brown-dark">
                  {formatBRL(salonMargin)}
                </span>
                <span className="text-[10px] text-tb-gray-neutral block mt-0.5">Retenção líquida do pacote</span>
              </div>
            </div>

            <p className="text-[10px] text-amber-800 leading-relaxed">
              🔒 <strong>Regra de Integridade:</strong> A comissão é calculada uma única vez na venda sobre o valor recebido. Os atendimentos posteriores com baixa de crédito <strong>não geram nova comissão e nem novo pagamento</strong> para a profissional.
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-tb-brown-soft uppercase tracking-wider block mb-1">
              Observações (Opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Pagamento antecipado integral, cliente VIP"
              className="w-full px-3 py-2 rounded-xl border border-tb-rose-light/60 bg-tb-ivory text-xs text-tb-brown-dark"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-tb-rose-light/40 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-tb-rose-light text-xs font-bold text-tb-brown-soft hover:bg-tb-ivory transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-xs font-bold shadow-soft hover:shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'Registrando...' : initialPackage ? 'Confirmar Renovação do Pacote' : 'Confirmar Venda do Pacote'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
