import React, { useState } from 'react';
import { Calendar, MessageSquare, Download, Trash2, MapPin, Clock, AlertTriangle, Send, Check } from 'lucide-react';
import { generateGoogleCalendarUrl, downloadIcsFile } from '../utils/calendarIntegration';
import { generateWhatsAppLink } from '../utils/whatsappNotification';
import { sendTelegramNotification, generateTelegramShareUrl } from '../utils/telegramNotification';

export default function ShiftCard({ shift, settings, onDeleteShift, onShowToast }) {
  const [telegramSending, setTelegramSending] = useState(false);
  const [telegramSent, setTelegramSent] = useState(false);

  const startDate = new Date(shift.start);
  const endDate = new Date(shift.end);

  const formatOpts = {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit'
  };

  const startDay = startDate.toLocaleDateString('pt-BR', formatOpts);
  const startTime = startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const endDay = endDate.toLocaleDateString('pt-BR', formatOpts);
  const endTime = endDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const isToday = new Date().toDateString() === startDate.toDateString();
  const isPast = new Date() > endDate;

  const calendarUrl = generateGoogleCalendarUrl(shift);
  const whatsappUrl = generateWhatsAppLink(shift, settings?.whatsappNumber || '5575991815612', 'manual');

  const getBadgeClass = (type) => {
    if (type.includes('SN')) return 'badge-sn';
    if (type.includes('72h')) return 'badge-72h';
    if (type.includes('48h')) return 'badge-48h';
    if (type.includes('24h')) return 'badge-24h';
    return 'badge-12h';
  };

  const handleTelegramClick = async () => {
    if (settings?.telegramBotToken && settings?.telegramChatId) {
      setTelegramSending(true);
      const res = await sendTelegramNotification(shift, settings, 'manual');
      setTelegramSending(false);
      if (res.success) {
        setTelegramSent(true);
        if (onShowToast) onShowToast('Aviso enviado para o Telegram com sucesso!', 'success');
        setTimeout(() => setTelegramSent(false), 3000);
      } else {
        if (onShowToast) onShowToast(res.error || 'Erro ao enviar para o Telegram', 'error');
        // Fallback: abre no Telegram Web
        window.open(generateTelegramShareUrl(shift), '_blank');
      }
    } else {
      // Abre compartilhamento no Telegram Web
      window.open(generateTelegramShareUrl(shift), '_blank');
      if (onShowToast) onShowToast('Abrindo Telegram para compartilhar...', 'info');
    }
  };

  return (
    <div className={`shift-item-card ${isPast ? 'shift-past' : ''} ${isToday ? 'shift-today' : ''}`}>
      <div className="shift-card-header">
        <div className="shift-header-left">
          <span className={`shift-tag-pill ${getBadgeClass(shift.shiftType)}`}>
            {shift.shiftType}
          </span>
          {shift.isSN && <span className="sn-indicator">Sobreaviso</span>}
          {isToday && <span className="today-indicator">É Hoje!</span>}
        </div>

        <button
          type="button"
          onClick={() => onDeleteShift(shift.id)}
          className="btn-delete-shift"
          title="Excluir plantão"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="shift-card-body">
        <h3 className="shift-card-location">
          <MapPin size={18} className="text-emerald" />
          <span>{shift.location}</span>
        </h3>

        <div className="shift-time-details">
          <div className="time-row">
            <Clock size={15} />
            <span className="time-text">
              <strong>{startDay} às {startTime}</strong>
              <span className="time-arrow"> → </span>
              {endDay === startDay ? '' : `${endDay} às `}{endTime}
              <span className="duration-pill">({shift.durationHours}h)</span>
            </span>
          </div>
        </div>

        {shift.fatigueAlert && (
          <div className="card-fatigue-alert">
            <AlertTriangle size={15} />
            <span>{shift.fatigueAlert}</span>
          </div>
        )}

        {shift.rawSummary && (
          <p className="card-raw-summary">"{shift.rawSummary}"</p>
        )}
      </div>

      <div className="shift-card-footer">
        <div className="shift-sync-info">
          <span className="sync-tag" title="Sincronizável com Google Agenda">
            📧 mh.cuidarsaude@gmail.com
          </span>
        </div>

        <div className="shift-card-actions">
          {/* Botão Telegram */}
          <button
            type="button"
            onClick={handleTelegramClick}
            disabled={telegramSending}
            className="btn-action-tg"
            title="Enviar aviso para o Telegram da Dra."
          >
            {telegramSent ? <Check size={15} /> : <Send size={15} />}
            <span>{telegramSent ? 'Enviado!' : 'Telegram'}</span>
          </button>

          {/* Botão Google Agenda */}
          <a
            href={calendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-action-cal"
            title="Salvar no Google Agenda da Dra. (mh.cuidarsaude@gmail.com)"
          >
            <Calendar size={15} />
            <span>Google Agenda</span>
          </a>

          {/* Botão WhatsApp */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-action-wa"
            title="Enviar mensagem para WhatsApp"
          >
            <MessageSquare size={15} />
            <span>WhatsApp</span>
          </a>

          {/* Botão Baixar .ics para o celular */}
          <button
            type="button"
            onClick={() => downloadIcsFile(shift)}
            className="btn-action-ics"
            title="Baixar arquivo de calendário (.ics) para iPhone ou Android"
          >
            <Download size={15} />
            <span>.ICS</span>
          </button>
        </div>
      </div>
    </div>
  );
}
