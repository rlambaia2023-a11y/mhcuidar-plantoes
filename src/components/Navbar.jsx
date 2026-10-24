import React from 'react';
import { Calendar, MessageSquare, Settings, Plus, Stethoscope, CheckCircle2, Send } from 'lucide-react';

export default function Navbar({ settings, onOpenSettings, onOpenManualModal }) {
  const isTelegramConfigured = Boolean(settings?.telegramBotToken && settings?.telegramChatId);

  return (
    <header className="navbar-container">
      <div className="navbar-inner">
        {/* Branding mhcuidar */}
        <div className="navbar-brand">
          <div className="brand-icon-wrapper">
            <Stethoscope className="brand-icon" />
          </div>
          <div>
            <div className="brand-title-row">
              <span className="brand-name">mh</span>
              <span className="brand-highlight">cuidar</span>
              <span className="brand-badge">Plantões AI</span>
            </div>
            <p className="brand-subtitle">Gestão Inteligente de Escalas e Plantões Médicos</p>
          </div>
        </div>

        {/* Status de Conexões Ativas */}
        <div className="navbar-status-badges">
          <div className="status-pill status-google" title="Sincronizado com Google Agenda">
            <Calendar size={15} />
            <span className="pill-text">{settings.email}</span>
            <CheckCircle2 size={13} className="text-emerald" />
          </div>

          <div 
            className={`status-pill ${isTelegramConfigured ? 'status-telegram-active' : 'status-telegram-pending'}`} 
            onClick={onOpenSettings}
            title={isTelegramConfigured ? 'Telegram Bot Conectado' : 'Clique para configurar seu Telegram'}
            style={{ cursor: 'pointer' }}
          >
            <Send size={14} />
            <span className="pill-text">{isTelegramConfigured ? 'Telegram Ativo' : 'Conectar Telegram'}</span>
            <CheckCircle2 size={13} className={isTelegramConfigured ? 'text-emerald' : 'text-muted'} />
          </div>

          <div className="status-pill status-whatsapp" title="Alertas automáticos via WhatsApp">
            <MessageSquare size={15} />
            <span className="pill-text">{settings.whatsappNumber}</span>
            <CheckCircle2 size={13} className="text-emerald" />
          </div>
        </div>

        {/* Ações */}
        <div className="navbar-actions">
          <button 
            type="button"
            className="btn-primary-action"
            onClick={onOpenManualModal}
            title="Adicionar plantão com formulário detalhado"
          >
            <Plus size={18} />
            <span>Novo Plantão</span>
          </button>

          <button 
            type="button"
            className="btn-icon-action"
            onClick={onOpenSettings}
            title="Configurações do Sistema"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}
