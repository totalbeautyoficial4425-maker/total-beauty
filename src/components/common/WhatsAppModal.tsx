import React, { useState, useEffect } from 'react';
import { MessageCircle, X, Send, Copy, Check, AlertCircle } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { normalizePhoneForWhatsApp, createWhatsAppLink, formatDateBR } from '../../utils/formatters';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  clientPhone: string;
  defaultTemplateKey?: 'confirmacao' | 'lembrete' | 'agradecimento' | 'retorno' | 'inativa' | 'aniversario';
  appointmentData?: {
    date: string;
    time: string;
    service: string;
    professional: string;
    price?: number;
  };
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  clientName,
  clientPhone,
  defaultTemplateKey = 'confirmacao',
  appointmentData,
}) => {
  const { settings } = useData();
  const [templateKey, setTemplateKey] = useState<string>(defaultTemplateKey);
  const [message, setMessage] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const { isValid, normalized, link } = normalizePhoneForWhatsApp(clientPhone);

  // Generate message based on template and client/appointment info
  const generateMessage = (key: string): string => {
    const rawTemplate = settings.whatsappTemplates[key as keyof typeof settings.whatsappTemplates] || '';
    let processed = rawTemplate
      .replace(/\[NOME\]/g, clientName || 'Cliente')
      .replace(/\[DATA\]/g, appointmentData?.date ? formatDateBR(appointmentData.date) : 'em breve')
      .replace(/\[HORÁRIO\]/g, appointmentData?.time || 'seu horário')
      .replace(/\[SERVIÇO\]/g, appointmentData?.service || 'seu atendimento')
      .replace(/\[PROFISSIONAL\]/g, appointmentData?.professional || 'nossa equipe');
    return processed;
  };

  useEffect(() => {
    if (isOpen) {
      setTemplateKey(defaultTemplateKey);
      setMessage(generateMessage(defaultTemplateKey));
    }
  }, [isOpen, defaultTemplateKey, clientName, clientPhone, appointmentData]);

  const handleTemplateChange = (key: string) => {
    setTemplateKey(key);
    setMessage(generateMessage(key));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    const finalLink = createWhatsAppLink(clientPhone, message);
    if (finalLink) {
      window.open(finalLink, '_blank', 'noopener,noreferrer');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tb-brown-dark/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-tb-white rounded-2xl shadow-premium border border-tb-rose-light/50 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-tb-ivory border-b border-tb-rose-light/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif-brand text-xl font-semibold text-tb-brown-dark">
                Conversa no WhatsApp
              </h3>
              <p className="text-xs text-tb-gray-neutral">
                {clientName} • {clientPhone || 'Sem telefone'}
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

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Phone validation notice */}
          {!isValid && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Telefone incompleto ou inválido</p>
                <p className="text-amber-700 mt-0.5">
                  O telefone ({clientPhone || 'não informado'}) precisa conter DDD válido para iniciar conversa no WhatsApp.
                </p>
              </div>
            </div>
          )}

          {/* Template pills */}
          <div>
            <label className="block text-xs font-medium text-tb-brown-soft mb-2">
              Selecione o Modelo de Mensagem:
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'confirmacao', label: 'Confirmação' },
                { key: 'lembrete', label: 'Lembrete' },
                { key: 'agradecimento', label: 'Agradecimento' },
                { key: 'retorno', label: 'Retorno' },
                { key: 'inativa', label: 'Cliente Inativa' },
                { key: 'aniversario', label: '🎂 Aniversário' },
              ].map(tpl => (
                <button
                  key={tpl.key}
                  type="button"
                  onClick={() => handleTemplateChange(tpl.key)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                    templateKey === tpl.key
                      ? 'bg-tb-rose-primary text-tb-white shadow-sm'
                      : 'bg-tb-beige-light text-tb-brown-soft hover:bg-tb-rose-blush'
                  }`}
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Message textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-tb-brown-soft">
                Mensagem a Enviar (você pode editar livremente):
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs flex items-center gap-1 text-tb-rose-primary hover:text-tb-brown-dark transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado!' : 'Copiar texto'}
              </button>
            </div>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={5}
              className="w-full text-sm p-3.5 rounded-xl border border-tb-rose-light/70 focus:outline-none focus:ring-2 focus:ring-tb-rose-primary/30 focus:border-tb-rose-primary bg-tb-ivory text-tb-brown-dark resize-none"
              placeholder="Digite a mensagem..."
            />
          </div>

          <div className="text-xs text-tb-gray-neutral bg-tb-ivory p-3 rounded-xl border border-tb-rose-light/40">
            <span className="font-medium text-tb-brown-soft">Ação segura: </span>
            O link abrirá a conversa oficial no seu WhatsApp Web ou aplicativo oficial sem enviar nada automaticamente. Você confere e aperta enviar lá.
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-tb-ivory border-t border-tb-rose-light/40 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-tb-brown-soft hover:text-tb-brown-dark rounded-xl hover:bg-tb-beige-light transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleOpenWhatsApp}
            disabled={!isValid || !message.trim()}
            className="px-5 py-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            Iniciar no WhatsApp ({normalized ? `+${normalized}` : 'inválido'})
          </button>
        </div>
      </div>
    </div>
  );
};
