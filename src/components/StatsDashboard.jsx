import React from 'react';
import { Clock, ShieldAlert, Award, Calendar, Activity, Zap, CheckCircle2 } from 'lucide-react';

export default function StatsDashboard({ shifts }) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Filtrar plantões do mês atual
  const monthShifts = shifts.filter(s => {
    const d = new Date(s.start);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const totalHours = monthShifts.reduce((acc, curr) => acc + (curr.durationHours || 0), 0);
  const count12h = monthShifts.filter(s => s.shiftType.includes('12h')).length;
  const count24h = monthShifts.filter(s => s.shiftType === '24h').length;
  const count48h = monthShifts.filter(s => s.shiftType === '48h').length;
  const count72h = monthShifts.filter(s => s.shiftType === '72h').length;
  const countSN = monthShifts.filter(s => s.shiftType.includes('SN') || s.isSN).length;

  const monthName = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  // Avaliação de sobrecarga
  const isOverworked = totalHours > 60;

  return (
    <div className="stats-dashboard-container">
      <div className="stats-header">
        <div className="stats-title-group">
          <Activity className="text-emerald" size={20} />
          <h3>Resumo de Escala — {monthName.charAt(0).toUpperCase() + monthName.slice(1)}</h3>
        </div>
        <span className="stats-badge-month">{monthShifts.length} plantões agendados</span>
      </div>

      <div className="stats-grid">
        {/* Card Total de Horas */}
        <div className="stat-card stat-highlight">
          <div className="stat-card-top">
            <span className="stat-label">Total de Horas no Mês</span>
            <Clock size={18} className="text-emerald" />
          </div>
          <div className="stat-value-group">
            <span className="stat-number">{totalHours}</span>
            <span className="stat-unit">horas</span>
          </div>
          <span className="stat-hint">
            {totalHours < 40 ? 'Carga leve' : totalHours <= 60 ? 'Carga equilibrada' : 'Carga intensa'}
          </span>
        </div>

        {/* Card Plantões 24h */}
        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-label">Plantões 24 Horas</span>
            <span className="badge-chip badge-24h">24h</span>
          </div>
          <div className="stat-value-group">
            <span className="stat-number">{count24h}</span>
            <span className="stat-unit">turnos ({count24h * 24}h)</span>
          </div>
          <span className="stat-hint">Rotina hospitalar</span>
        </div>

        {/* Card Plantões 12h */}
        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-label">Plantões 12 Horas</span>
            <span className="badge-chip badge-12h">12h</span>
          </div>
          <div className="stat-value-group">
            <span className="stat-number">{count12h}</span>
            <span className="stat-unit">turnos ({count12h * 12}h)</span>
          </div>
          <span className="stat-hint">Diurno / Noturno</span>
        </div>

        {/* Card Sobreaviso SN */}
        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-label">Sobreaviso (SN)</span>
            <span className="badge-chip badge-sn">SN</span>
          </div>
          <div className="stat-value-group">
            <span className="stat-number">{countSN}</span>
            <span className="stat-unit">escalas</span>
          </div>
          <span className="stat-hint">Se Necessário / Clínica</span>
        </div>

        {/* Card Plantões Longos (48h e 72h) */}
        {(count48h > 0 || count72h > 0) && (
          <div className="stat-card stat-alert-card">
            <div className="stat-card-top">
              <span className="stat-label">Plantões Longos</span>
              <ShieldAlert size={18} className="text-amber" />
            </div>
            <div className="stat-value-group">
              <span className="stat-number">{count48h + count72h}</span>
              <span className="stat-unit">
                {count48h > 0 && `${count48h}x 48h `}
                {count72h > 0 && `${count72h}x 72h`}
              </span>
            </div>
            <span className="stat-hint text-amber">Atenção ao descanso pós-plantão</span>
          </div>
        )}
      </div>

      {isOverworked && (
        <div className="workload-advisory">
          <ShieldAlert size={18} />
          <span>
            <strong>Aviso de Saúde Médica mhcuidar:</strong> Você já possui mais de 60 horas de plantão agendadas este mês. Lembre-se de reservar dias de repouso para garantir sua saúde e máxima atenção aos pacientes.
          </span>
        </div>
      )}
    </div>
  );
}
