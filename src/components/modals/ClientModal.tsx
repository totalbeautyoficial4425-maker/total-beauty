import React, { useState, useEffect } from 'react';
import { X, User, Phone, Mail, MapPin, Calendar, HeartHandshake, AlertCircle } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Client } from '../../types';
import { maskPhoneBR } from '../../utils/formatters';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientToEdit?: Client | null;
}

export const ClientModal: React.FC<ClientModalProps> = ({
  isOpen,
  onClose,
  clientToEdit,
}) => {
  const { addClient, updateClient, checkDuplicateClient } = useData();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState('');
  
  // Address
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('SP');
  const [zip, setZip] = useState('');

  const [notes, setNotes] = useState('');
  const [communicationConsent, setCommunicationConsent] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (clientToEdit) {
        setName(clientToEdit.name);
        setPhone(maskPhoneBR(clientToEdit.phone));
        setWhatsapp(clientToEdit.whatsapp ? maskPhoneBR(clientToEdit.whatsapp) : '');
        setEmail(clientToEdit.email || '');
        setBirthDate(clientToEdit.birthDate || '');
        setStreet(clientToEdit.address?.street || '');
        setNumber(clientToEdit.address?.number || '');
        setNeighborhood(clientToEdit.address?.neighborhood || '');
        setCity(clientToEdit.address?.city || '');
        setState(clientToEdit.address?.state || 'SP');
        setZip(clientToEdit.address?.zip || '');
        setNotes(clientToEdit.notes || '');
        setCommunicationConsent(clientToEdit.communicationConsent ?? true);
      } else {
        setName('');
        setPhone('');
        setWhatsapp('');
        setEmail('');
        setBirthDate('');
        setStreet('');
        setNumber('');
        setNeighborhood('');
        setCity('São Paulo');
        setState('SP');
        setZip('');
        setNotes('');
        setCommunicationConsent(true);
      }
      setError(null);
    }
  }, [isOpen, clientToEdit]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(maskPhoneBR(e.target.value));
  };

  const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWhatsapp(maskPhoneBR(e.target.value));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('O nome completo da cliente é obrigatório.');
      return;
    }
    if (!phone.trim()) {
      setError('O telefone com DDD é obrigatório.');
      return;
    }

    // Check duplicate
    const dup = checkDuplicateClient(phone, email, clientToEdit?.id);
    if (dup.isDuplicate) {
      setError(`Aviso de duplicidade: Já existe uma cliente cadastrada com este ${dup.field} (${dup.clientName}).`);
      return;
    }

    const address = {
      street: street.trim(),
      number: number.trim(),
      neighborhood: neighborhood.trim(),
      city: city.trim(),
      state: state.trim(),
      zip: zip.trim(),
    };

    if (clientToEdit) {
      const res = updateClient(clientToEdit.id, {
        name: name.trim(),
        phone: phone.trim(),
        whatsapp: whatsapp.trim() || phone.trim(),
        email: email.trim(),
        birthDate,
        address,
        notes: notes.trim(),
        communicationConsent,
      });

      if (!res.success) {
        setError(res.error || 'Erro ao atualizar dados da cliente.');
        return;
      }
    } else {
      const res = addClient({
        name: name.trim(),
        phone: phone.trim(),
        whatsapp: whatsapp.trim() || phone.trim(),
        email: email.trim(),
        birthDate,
        address,
        notes: notes.trim(),
        communicationConsent,
      });

      if (!res.success) {
        setError(res.error || 'Erro ao cadastrar cliente.');
        return;
      }
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tb-brown-dark/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-tb-white rounded-2xl shadow-premium border border-tb-rose-light/50 w-full max-w-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-tb-ivory border-b border-tb-rose-light/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-tb-rose-blush text-tb-rose-primary flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif-brand text-xl font-bold text-tb-brown-dark">
                {clientToEdit ? 'Editar Cadastro da Cliente' : 'Nova Cliente Total Beauty'}
              </h3>
              <p className="text-xs text-tb-gray-neutral">
                {clientToEdit ? 'Atualize as informações cadastrais e preferências' : 'Preencha os dados essenciais para atendimento'}
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

          {/* Section: Dados Pessoais */}
          <div>
            <h4 className="text-xs font-bold text-tb-brown-soft uppercase tracking-wider mb-2.5">
              1. Dados Pessoais Obrigatórios
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Gabriela Medeiros Silva"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark focus:ring-2 focus:ring-tb-rose-primary/30 focus:border-tb-rose-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
                  Telefone Celular (com DDD) *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="(11) 98765-4321"
                  value={phone}
                  onChange={handlePhoneChange}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark focus:ring-2 focus:ring-tb-rose-primary/30 focus:border-tb-rose-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
                  WhatsApp (se diferente)
                </label>
                <input
                  type="tel"
                  placeholder="Opcional se for o mesmo"
                  value={whatsapp}
                  onChange={handleWhatsappChange}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark focus:ring-2 focus:ring-tb-rose-primary/30 focus:border-tb-rose-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  placeholder="cliente@exemplo.com.br"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark focus:ring-2 focus:ring-tb-rose-primary/30 focus:border-tb-rose-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
                  Data de Nascimento
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={e => setBirthDate(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark focus:ring-2 focus:ring-tb-rose-primary/30 focus:border-tb-rose-primary"
                />
              </div>
            </div>
          </div>

          {/* Section: Endereço (Opcional) */}
          <div className="pt-2 border-t border-tb-rose-light/30">
            <h4 className="text-xs font-bold text-tb-brown-soft uppercase tracking-wider mb-2.5">
              2. Endereço (Opcional)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs text-tb-brown-dark mb-1">Rua / Logradouro</label>
                <input
                  type="text"
                  placeholder="Ex: Rua Bela Cintra"
                  value={street}
                  onChange={e => setStreet(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-ivory"
                />
              </div>

              <div>
                <label className="block text-xs text-tb-brown-dark mb-1">Número</label>
                <input
                  type="text"
                  placeholder="120"
                  value={number}
                  onChange={e => setNumber(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-ivory"
                />
              </div>

              <div>
                <label className="block text-xs text-tb-brown-dark mb-1">Bairro</label>
                <input
                  type="text"
                  placeholder="Consolação"
                  value={neighborhood}
                  onChange={e => setNeighborhood(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-ivory"
                />
              </div>

              <div>
                <label className="block text-xs text-tb-brown-dark mb-1">Cidade</label>
                <input
                  type="text"
                  placeholder="São Paulo"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-ivory"
                />
              </div>

              <div>
                <label className="block text-xs text-tb-brown-dark mb-1">CEP</label>
                <input
                  type="text"
                  placeholder="01415-000"
                  value={zip}
                  onChange={e => setZip(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-ivory"
                />
              </div>
            </div>
          </div>

          {/* Section: Observações & Consentimento */}
          <div className="pt-2 border-t border-tb-rose-light/30 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
                Observações de Preferências & Cuidados
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Alergia a algum produto, preferências de bebidas, tons favoritos de esmalte..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark resize-none"
              />
            </div>

            <label className="flex items-start gap-2.5 text-xs text-tb-brown-soft cursor-pointer">
              <input
                type="checkbox"
                checked={communicationConsent}
                onChange={e => setCommunicationConsent(e.target.checked)}
                className="rounded mt-0.5 text-tb-rose-primary focus:ring-tb-rose-primary"
              />
              <span>
                Cliente autoriza o recebimento de mensagens de confirmação de agendamento e lembretes via WhatsApp (Conformidade LGPD).
              </span>
            </label>
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
              className="px-6 py-2.5 text-xs sm:text-sm font-semibold bg-tb-rose-primary hover:bg-[#b57f8c] text-white rounded-xl shadow-soft hover:shadow-premium transition-all"
            >
              {clientToEdit ? 'Salvar Alterações' : 'Cadastrar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
