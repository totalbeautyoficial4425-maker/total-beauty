import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose?: () => void;
  isForcedFirstLogin?: boolean;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  isForcedFirstLogin = false,
}) => {
  const { changePassword } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('A confirmação de senha não confere com a nova senha digitada.');
      return;
    }

    const res = changePassword(newPassword);
    if (!res.success) {
      setError(res.error || 'Erro ao alterar a senha.');
    } else {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        if (onClose) onClose();
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tb-brown-dark/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-tb-white rounded-2xl shadow-premium border border-tb-rose-light w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 bg-tb-ivory border-b border-tb-rose-light/40 text-center">
          <div className="w-12 h-12 rounded-full bg-tb-rose-blush text-tb-rose-primary mx-auto flex items-center justify-center mb-2 shadow-inner">
            <KeyRound className="w-6 h-6" />
          </div>
          <h3 className="font-serif-brand text-2xl font-bold text-tb-brown-dark">
            {isForcedFirstLogin ? 'Definir Senha Definitiva' : 'Alterar Senha de Acesso'}
          </h3>
          <p className="text-xs text-tb-gray-neutral mt-1">
            {isForcedFirstLogin
              ? 'Por segurança, no primeiro acesso é obrigatório cadastrar uma nova senha pessoal antes de acessar os dados do salão.'
              : 'Atualize suas credenciais de segurança do sistema TOTAL BEAUTY.'}
          </p>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">Senha alterada com sucesso! Redirecionando...</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
              Nova Senha
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 dígitos"
                required
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark focus:outline-none focus:ring-2 focus:ring-tb-rose-primary/30 focus:border-tb-rose-primary pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-tb-gray-neutral hover:text-tb-brown-dark"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
              Confirmar Nova Senha
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Digite a mesma senha novamente"
              required
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark focus:outline-none focus:ring-2 focus:ring-tb-rose-primary/30 focus:border-tb-rose-primary"
            />
          </div>

          <div className="p-3 bg-tb-beige-light/70 rounded-xl border border-tb-beige-champagne/60 text-[11px] text-tb-brown-soft flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-tb-rose-primary shrink-0 mt-0.5" />
            <span>
              A nova senha será armazenada com criptografia de hash seguro e substituirá o acesso padrão 'admin123'.
            </span>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            {!isForcedFirstLogin && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-tb-brown-soft hover:text-tb-brown-dark rounded-xl"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={success}
              className="w-full py-2.5 text-xs font-semibold bg-tb-rose-primary hover:bg-[#b57f8c] text-tb-white rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50"
            >
              Salvar e Entrar no Sistema
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
