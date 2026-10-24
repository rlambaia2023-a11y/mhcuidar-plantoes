import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle2, MapPin } from 'lucide-react';

export default function CalendarView({ shifts }) {
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);

  // Gerar os próximos 14 dias a partir de hoje
  const days = [];
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + (currentWeekOffset * 7));

  for (let i = 0; i < 7; i++) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i);
    d.setHours(0, 0, 0, 0);

    // Encontrar plantões neste dia
    const dayShifts = shifts.filter(s => {
      const sDate = new Date(s.start);
      sDate.setHours(0, 0, 0, 0);
      return sDate.getTime() === d.getTime();
    });

    days.push({
      date: d,
      shifts: dayShifts,
      isToday: new Date().toDateString() === d.toDateString()
    });
  }

  const formatWeekRange = () => {
    const first = days[0].date;
    const last = days[days.length - 1].date;
    return `${first.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} — ${last.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  };

  return (
    <div className="calendar-week-container">
      <div className="calendar-header">
        <div className="cal-title-left">
          <CalendarIcon size={20} className="text-emerald" />
          <h3>Visão Semanal de Plantões</h3>
          <span className="cal-week-range">{formatWeekRange()}</span>
        </div>

        <div className="calendar-nav-buttons">
          <button
            type="button"
            className="btn-nav-cal"
            onClick={() => setCurrentWeekOffset(prev => prev - 1)}
            title="Semana anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className="btn-today-cal"
            onClick={() => setCurrentWeekOffset(0)}
          >
            Hoje
          </button>
          <button
            type="button"
            className="btn-nav-cal"
            onClick={() => setCurrentWeekOffset(prev => prev + 1)}
            title="Próxima semana"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="calendar-days-grid">
        {days.map((item, idx) => {
          const diaSemana = item.date.toLocaleDateString('pt-BR', { weekday: 'short' });
          const diaNumero = item.date.getDate();
          const hasShift = item.shifts.length > 0;

          return (
            <div 
              key={idx} 
              className={`calendar-day-col ${item.isToday ? 'day-today' : ''} ${hasShift ? 'day-has-shift' : 'day-free'}`}
            >
              <div className="day-col-header">
                <span className="day-weekday">{diaSemana.toUpperCase()}</span>
                <span className="day-number">{diaNumero}</span>
              </div>

              <div className="day-col-content">
                {hasShift ? (
                  item.shifts.map((s, sIdx) => (
                    <div key={sIdx} className="calendar-shift-badge" title={`${s.shiftType} - ${s.location}`}>
                      <strong className="badge-type">{s.shiftType}</strong>
                      <span className="badge-loc">
                        {s.location.length > 18 ? s.location.substring(0, 16) + '...' : s.location}
                      </span>
                    </div>
                  ))
                ) : (
                  <span className="day-free-label">Livre</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
