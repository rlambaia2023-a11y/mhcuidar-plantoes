import React, { useState, useEffect } from 'react';
import { Clock, MapPin, AlertTriangle, Calendar, MessageSquare, Sparkles, Send, Check } from 'lucide-react';
import { generateGoogleCalendarUrl } from '../utils/calendarIntegration';
import { generateWhatsAppLink } from '../utils/whatsappNotification';
import { sendTelegramNotification, generateTelegramShareUrl } from '../utils/telegramNotification';

export default function NextShiftBanner({ nextShift, settings, onShowToast }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, isPast: false });
  const [telegramSending, setTelegramSending] = useState(false);
  const [telegramSent, setTelegramSent] = useState(false);

  useEffect(() => {
    if (!nextShift) return;

    function calculateTime() {
      const now = new Date().getTime();
      const shiftStart = new Date(nextShift.start).getTime();
      const diff = shiftStart - now;

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isPast: true });
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds, isPast: false });
    }

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [nextShift]);

  if (!nextShift) {
    return (
      <div className="next-shift-banner empty-state">
        <div className="banner-content">
          <div className="banner-icon-box">
            <Sparkles size={24} className="text-emerald" />
          </div>
          <div>
            <h3 className="banner-title">Nenhum plantão agendado para os próximos dias</h3>
            <p className="banner-desc">Fale ou digite abaixo para agendar sua escala em segundos.</p>
          </div>
        </div>
      </div>
    );
  }

  const startDate = new Date(nextShift.start);
  const endDate = new Date(nextShift.end);

  const startFormatted = startDate.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit'
  }) + ' às ' + startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const endFormatted = endDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const calendarUrl = generateGoogleCalendarUrl(nextShift);
  const whatsappUrl = generateWhatsAppLink(nextShift, settings?.whatsappNumber || '5575991815612', '24h');

  const getBadgeClass = (type) => {
    if (type.includes('SN')) return 'badge-sn';
    if (type.includes('72h')) return 'badge-72h';
    if (type.includes('48h')) return 'badge-48h';
    if (type.includes('24h')) return 'badge-24h';
    return 'badge-12h';
  };

  const handleTelegramAlert = async () => {
    if (settings?.telegramBotToken && settings?.telegramChatId) {
      setTelegramSending(true);
      const res = await sendTelegramNotification(nextShift, settings, '24h');
      setTelegramSending(false);
      if (res.success) {
        setTelegramSent(true);
        if (onShowToast) onShowToast('Alerta de plantão enviado para o Telegram!', 'success');
        setTimeout(() => setTelegramSent(false), 3000);
      } else {
        if (onShowToast) onShowToast(res.error || 'Erro ao enviar para o Telegram', 'error');
        window.open(generateTelegramShareUrl(nextShift), '_blank');
      }
    } else {
      window.open(generateTelegramShareUrl(nextShift), '_blank');
      if (onShowToast) onShowToast('Abrindo Telegram para compartilhar...', 'info');
    }
  };

  return (
    <section className="next-shift-banner active-shift">
      <div className="banner-top-tag">
        <Clock size={15} />
        <span>PRÓXIMO PLANTÃO</span>
        <span className={`shift-tag-pill ${getBadgeClass(nextShift.shiftType)}`}>
          {nextShift.shiftType}
        </span>
      </div>

      <div className="banner-main-grid">
        <div className="shift-info-block">
          <h2 className="shift-hospital-title">
            <MapPin className="pin-icon" size={24} />
            {nextShift.location}
          </h2>

          <div className="shift-times-row">
            <div className="time-item">
              <span className="time-label">Início</span>
              <strong className="time-val">{startFormatted}</strong>
            </div>
            <div className="time-separator">→</div>
            <div className="time-item">
              <span className="time-label">Término Previsto</span>
              <strong className="time-val">{endFormatted} ({nextShift.durationHours}h)</strong>
            </div>
          </div>

          {nextShift.fatigueAlert && (
            <div className="fatigue-banner">
              <AlertTriangle size={18} />
              <span>{nextShift.fatigueAlert}</span>
            </div>
          )}
        </div>

        {/* Contador Regressivo */}
        <div className="countdown-card">
          <span className="countdown-label">
            {timeLeft.isPast ? 'Plantão em andamento agora' : 'Inicia em:'}
          </span>
          {!timeLeft.isPast ? (
            <div className="countdown-timer">
              <div className="countdown-unit">
                <span className="countdown-number">{String(timeLeft.hours).padStart(2, '0')}</span>
                <span className="countdown-caption">Horas</span>
              </div>
              <span className="colon">:</span>
              <div className="countdown-unit">
                <span className="countdown-number">{String(timeLeft.minutes).padStart(2, '0')}</span>
                <span className="countdown-caption">Min</span>
              </div>
              <span className="colon">:</span>
              <div className="countdown-unit">
                <span className="countdown-number">{String(timeLeft.seconds).padStart(2, '0')}</span>
                <span className="countdown-caption">Seg</span>
              </div>
            </div>
          ) : (
            <div className="ongoing-tag">
              <span className="pulse-dot"></span>
              <span>Em Atendimento</span>
            </div>
          )}

          {/* Botões Rápidos */}
          <div className="countdown-actions">
            <button
              type="button"
              onClick={handleTelegramAlert}
              disabled={telegramSending}
              className="btn-quick-tg"
              title="Disparar alerta no Telegram da Dra."
            >
              {telegramSent ? <Check size={16} /> : <Send size={16} />}
              <span>{telegramSent ? 'Enviado!' : 'Alerta Telegram'}</span>
            </button>

            <a 
              href={calendarUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn-quick-cal"
              title="Abrir no Google Agenda da Dra. (mh.cuidarsaude@gmail.com)"
            >
              <Calendar size={16} />
              <span>Google Agenda</span>
            </a>

            <a 
              href={whatsappUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn-quick-wa"
              title="Enviar lembrete para WhatsApp"
            >
              <MessageSquare size={16} />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
