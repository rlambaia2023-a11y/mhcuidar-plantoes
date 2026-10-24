import React, { useState } from 'react';
import { X, Save, CheckCircle, AlertCircle, Send, Calendar, MessageSquare, Shield, HelpCircle, ExternalLink } from 'lucide-react';
import { testTelegramConnection } from '../utils/telegramNotification';

export default function SettingsModal({ isOpen, onClose, settings, onSaveSettings, onShowToast }) {
  const [formData, setFormData] = useState({ ...settings });
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState(null);
  const [showTelegramHelp, setShowTelegramHelp] = useState(false);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTestTelegram = async () => {
    setTestingTelegram(true);
    setTelegramStatus(null);
    const result = await testTelegramConnection(formData.telegramBotToken, formData.telegramChatId);
    setTestingTelegram(false);
    setTelegramStatus(result);
    if (result.success && onShowToast) {
      onShowToast('Mensagem enviada com sucesso no seu Telegram!', 'success');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSaveSettings(formData);
    if (onShowToast) onShowToast('Configurações salvas com sucesso!', 'success');
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-container settings-modal-box">
        <div className="modal-header">
          <div className="modal-title-group">
            <Shield className="text-emerald" size={22} />
            <h2>Configurações do Sistema mhcuidar</h2>
          </div>
          <button type="button" className="btn-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body settings-form">
          {/* Seção 1: Google Calendar */}
          <div className="settings-section">
            <div className="section-header">
              <Calendar size={18} className="text-emerald" />
              <h3>Google Agenda (Google Calendar)</h3>
            </div>
            <p className="section-description">
              Plantões serão sincronizados diretamente com esta conta Google.
            </p>
            <div className="form-group">
              <label>E-mail da Agenda Oficial:</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="ex: mh.cuidarsaude@gmail.com"
                required
                className="input-text"
              />
            </div>
          </div>

          {/* Seção 2: Telegram Bot & Notificações */}
          <div className="settings-section">
            <div className="section-header">
              <Send size={18} className="text-emerald" />
              <div className="flex-title-row">
                <h3>Notificações no Telegram</h3>
                <button
                  type="button"
                  className="btn-help-link"
                  onClick={() => setShowTelegramHelp(!showTelegramHelp)}
                >
                  <HelpCircle size={15} />
                  <span>{showTelegramHelp ? 'Ocultar passo a passo' : 'Como configurar?'}</span>
                </button>
              </div>
            </div>

            <p className="section-description">
              Receba os alertas de plantão com 24h e 2h de antecedência diretamente no seu Telegram.
            </p>

            {showTelegramHelp && (
              <div className="telegram-help-card">
                <h4>Como obter seu Bot Token e Chat ID no Telegram (grátis):</h4>
                <ol>
                  <li>No Telegram, busque por <strong>@BotFather</strong> e envie o comando <code>/newbot</code>.</li>
                  <li>Escolha um nome (ex: <em>mhcuidar_plantoes_bot</em>). Copie o <strong>Token</strong> gerado e cole abaixo.</li>
                  <li>Para saber seu Chat ID, envie uma mensagem qualquer para o bot <strong>@userinfobot</strong> ou <strong>@myidbot</strong>. Ele responderá com o seu ID numérico.</li>
                </ol>
              </div>
            )}

            <div className="form-grid-2">
              <div className="form-group">
                <label>Telegram Bot Token:</label>
                <input
                  type="text"
                  value={formData.telegramBotToken || ''}
                  onChange={(e) => handleChange('telegramBotToken', e.target.value)}
                  placeholder="ex: 7123456789:AAH..."
                  className="input-text"
                />
              </div>

              <div className="form-group">
                <label>Seu Telegram Chat ID:</label>
                <input
                  type="text"
                  value={formData.telegramChatId || ''}
                  onChange={(e) => handleChange('telegramChatId', e.target.value)}
                  placeholder="ex: 123456789"
                  className="input-text"
                />
              </div>
            </div>

            <div className="telegram-test-bar">
              <button
                type="button"
                onClick={handleTestTelegram}
                disabled={testingTelegram || !formData.telegramBotToken || !formData.telegramChatId}
                className="btn-test-telegram"
              >
                <Send size={15} />
                <span>{testingTelegram ? 'Enviando teste...' : 'Testar Envio no Telegram'}</span>
              </button>

              {telegramStatus && (
                <div className={`status-result ${telegramStatus.success ? 'success' : 'error'}`}>
                  {telegramStatus.success ? (
                    <>
                      <CheckCircle size={16} />
                      <span>{telegramStatus.message}</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={16} />
                      <span>{telegramStatus.error}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Seção 3: WhatsApp */}
          <div className="settings-section">
            <div className="section-header">
              <MessageSquare size={18} className="text-emerald" />
              <h3>WhatsApp para Lembretes</h3>
            </div>
            <div className="form-group">
              <label>Número com DDD e DDI:</label>
              <input
                type="text"
                value={formData.whatsappNumber}
                onChange={(e) => handleChange('whatsappNumber', e.target.value)}
                placeholder="+5575991815612"
                className="input-text"
              />
            </div>
          </div>

          {/* Seção 4: Regras de Antecedência */}
          <div className="settings-section">
            <h3>⏰ Prazos de Avisos Automáticos</h3>
            <div className="checkbox-list">
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={formData.notify24h}
                  onChange={(e) => handleChange('notify24h', e.target.checked)}
                />
                <span>Avisar com <strong>24 horas de antecedência</strong> (dia anterior)</span>
              </label>

              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={formData.notify2h}
                  onChange={(e) => handleChange('notify2h', e.target.checked)}
                />
                <span>Avisar com <strong>2 horas de antecedência</strong> (alerta imediato para saída)</span>
              </label>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-save">
              <Save size={18} />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
