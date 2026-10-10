import React, { useState, useEffect } from 'react';
import { X, DollarSign, AlertCircle } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Expense, ExpenseCategory, PaymentMethod } from '../../types';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenseToEdit?: Expense | null;
}

const EXPENSE_CATEGORIES: { id: ExpenseCategory; label: string }[] = [
  { id: 'aluguel', label: 'Aluguel & Condomínio' },
  { id: 'produtos', label: 'Produtos & Cosméticos' },
  { id: 'materiais', label: 'Materiais Descartáveis' },
  { id: 'contas', label: 'Contas (Água/Luz/Internet)' },
  { id: 'marketing', label: 'Marketing & Publicidade' },
  { id: 'comissoes', label: 'Comissões de Profissionais' },
  { id: 'manutencao', label: 'Manutenção & Equipamentos' },
  { id: 'outros', label: 'Outras Despesas' },
];

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  expenseToEdit,
}) => {
  const { addExpense, updateExpense } = useData();

  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('produtos');
  const [amount, setAmount] = useState(0);
  const [competenceDate, setCompetenceDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [status, setStatus] = useState<'pago' | 'pendente' | 'atrasado'>('pago');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const todayStr = new Date().toISOString().split('T')[0];
      if (expenseToEdit) {
        setDescription(expenseToEdit.description);
        setCategory(expenseToEdit.category);
        setAmount(expenseToEdit.amount);
        setCompetenceDate(expenseToEdit.competenceDate);
        setDueDate(expenseToEdit.dueDate);
        setPaymentDate(expenseToEdit.paymentDate || '');
        setStatus(expenseToEdit.status);
        setPaymentMethod(expenseToEdit.paymentMethod || 'pix');
        setNotes(expenseToEdit.notes || '');
      } else {
        setDescription('');
        setCategory('produtos');
        setAmount(150);
        setCompetenceDate(todayStr);
        setDueDate(todayStr);
        setPaymentDate(todayStr);
        setStatus('pago');
        setPaymentMethod('pix');
        setNotes('');
      }
      setError(null);
    }
  }, [isOpen, expenseToEdit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!description.trim()) {
      setError('A descrição da despesa é obrigatória.');
      return;
    }
    if (amount <= 0 || isNaN(amount)) {
      setError('Informe um valor válido maior que zero.');
      return;
    }

    if (expenseToEdit) {
      const res = updateExpense(expenseToEdit.id, {
        description: description.trim(),
        category,
        amount,
        competenceDate,
        dueDate,
        paymentDate: status === 'pago' ? paymentDate : undefined,
        status,
        paymentMethod,
        notes: notes.trim(),
      });
      if (!res.success) {
        setError(res.error || 'Erro ao atualizar despesa.');
        return;
      }
    } else {
      const res = addExpense({
        description: description.trim(),
        category,
        amount,
        competenceDate,
        dueDate,
        paymentDate: status === 'pago' ? paymentDate : undefined,
        status,
        paymentMethod,
        notes: notes.trim(),
      });
      if (!res.success) {
        setError(res.error || 'Erro ao cadastrar despesa.');
        return;
      }
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tb-brown-dark/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-tb-white rounded-2xl shadow-premium border border-tb-rose-light/50 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-tb-ivory border-b border-tb-rose-light/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif-brand text-xl font-bold text-tb-brown-dark">
                {expenseToEdit ? 'Editar Despesa' : 'Nova Despesa'}
              </h3>
              <p className="text-xs text-tb-gray-neutral">
                Registre os custos e saídas do salão Total Beauty
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

          <div>
            <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
              Descrição da Despesa *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Compra de Esmaltes Risqué e Lixas Descartáveis"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark focus:ring-2 focus:ring-tb-rose-primary/30 focus:border-tb-rose-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
                Categoria *
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as ExpenseCategory)}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark"
              >
                {EXPENSE_CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
                Valor (R$) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs text-tb-gray-neutral">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={amount}
                  onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs sm:text-sm pl-9 pr-3.5 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark font-medium"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
                Competência
              </label>
              <input
                type="date"
                value={competenceDate}
                onChange={e => setCompetenceDate(e.target.value)}
                required
                className="w-full text-xs px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-ivory"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
                Vencimento
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                required
                className="w-full text-xs px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-ivory"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
                Situação
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-ivory"
              >
                <option value="pago">Paga</option>
                <option value="pendente">Pendente</option>
                <option value="atrasado">Atrasada</option>
              </select>
            </div>
          </div>

          {status === 'pago' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
                  Data do Pagamento
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={e => setPaymentDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-ivory"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
                  Forma de Saída
                </label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-ivory"
                >
                  <option value="pix">PIX</option>
                  <option value="transferencia">Transferência</option>
                  <option value="cartao_credito">Cartão de Crédito</option>
                  <option value="cartao_debito">Cartão de Débito</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="outros">Outros</option>
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
              Observações / Fornecedor
            </label>
            <input
              type="text"
              placeholder="Ex: Nota fiscal 4821 - Fornecedor Bella Distribuidora"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory"
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
              className="px-6 py-2.5 text-xs sm:text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-soft hover:shadow-premium transition-all"
            >
              {expenseToEdit ? 'Atualizar Despesa' : 'Salvar Despesa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
