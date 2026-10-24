import React, { useState } from 'react';
import { X, CalendarPlus, Clock, MapPin, AlertTriangle } from 'lucide-react';

const COMMON_HOSPITALS = [
  'Clínica mhcuidar',
  'Hospital Geral Clériston Andrade (HGCA)',
  'Hospital Estadual da Criança (HEC)',
  'Hospital da Mulher',
  'Hospital Geral',
  'Hospital Unimed',
  'UPA 24h',
  'SAMU'
];

export default function ManualShiftModal({ isOpen, onClose, onAddShift }) {
  const [location, setLocation] = useState('Clínica mhcuidar');
  const [customLocation, setCustomLocation] = useState('');
  const [shiftType, setShiftType] = useState('24h');
  const [date, setDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [startTime, setStartTime] = useState('07:00');
  const [isSN, setIsSN] = useState(false);
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();

    const finalLocation = location === 'OUTRO' ? (customLocation.trim() || 'Hospital') : location;

    // Calcular duração
    let durationHours = 24;
    if (shiftType === '12h Diurno' || shiftType === '12h Noturno') durationHours = 12;
    else if (shiftType === '48h') durationHours = 48;
    else if (shiftType === '72h') durationHours = 72;
    else if (shiftType === 'SN') durationHours = 24;

    const [h, m] = startTime.split(':').map(Number);
    const startObj = new Date(date + 'T' + startTime + ':00');
    const endObj = new Date(startObj.getTime() + durationHours * 60 * 60 * 1000);

    let fatigueAlert = null;
    if (durationHours >= 48) {
      fatigueAlert = `⚠️ Atenção Médica: Plantão de ${durationHours} horas exige descanso prévio e hidratação.`;
    }

    const newShift = {
      id: 'shift_man_' + Date.now(),
      title: `Plantão ${shiftType} - ${finalLocation}`,
      location: finalLocation,
      shiftType: isSN ? 'SN' : shiftType,
      durationHours,
      start: startObj.toISOString(),
      end: endObj.toISOString(),
      isSN,
      fatigueAlert,
      rawSummary: `Plantão ${shiftType} em ${finalLocation}${notes ? ` - Obs: ${notes}` : ''}`,
      status: 'scheduled',
      reminders: {
        whatsapp: true,
        whatsapp24h: true,
        whatsapp2h: true,
        googleCalendar: true
      },
      createdAt: new Date().toISOString()
    };

    onAddShift([newShift]);
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-container manual-modal-box">
        <div className="modal-header">
          <div className="modal-title-group">
            <CalendarPlus className="text-emerald" size={22} />
            <h2>Novo Agendamento de Plantão</h2>
          </div>
          <button type="button" className="btn-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {/* Hospital / Clínica */}
          <div className="form-group">
            <label>Hospital ou Clínica:</label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="input-select"
            >
              {COMMON_HOSPITALS.map((h, i) => (
                <option key={i} value={h}>{h}</option>
              ))}
              <option value="OUTRO">Outro hospital/clínica (digitar)...</option>
            </select>
          </div>

          {location === 'OUTRO' && (
            <div className="form-group">
              <label>Nome do Hospital/Local:</label>
              <input
                type="text"
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)}
                placeholder="ex: Hospital Santa Izabel"
                required
                className="input-text"
              />
            </div>
          )}

          {/* Duração e Modalidade */}
          <div className="form-grid-2">
            <div className="form-group">
              <label>Duração do Plantão:</label>
              <select
                value={shiftType}
                onChange={(e) => {
                  setShiftType(e.target.value);
                  if (e.target.value === 'SN') setIsSN(true);
                  if (e.target.value === '12h Noturno') setStartTime('19:00');
                  else if (e.target.value === '12h Diurno') setStartTime('07:00');
                }}
                className="input-select"
              >
                <option value="12h Diurno">12 horas (Diurno: 07h às 19h)</option>
                <option value="12h Noturno">12 horas (Noturno: 19h às 07h)</option>
                <option value="24h">24 horas</option>
                <option value="48h">48 horas (Final de semana)</option>
                <option value="72h">72 horas (Feriadão / Emergência)</option>
                <option value="SN">SN (Sobreaviso / Se Necessário)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Regime Sobreaviso (SN):</label>
              <label className="checkbox-sn-label">
                <input
                  type="checkbox"
                  checked={isSN}
                  onChange={(e) => setIsSN(e.target.checked)}
                />
                <span>Plantão de Sobreaviso / SN</span>
              </label>
            </div>
          </div>

          {/* Data e Horário */}
          <div className="form-grid-2">
            <div className="form-group">
              <label>Data de Início:</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="input-text"
              />
            </div>

            <div className="form-group">
              <label>Horário de Início:</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="input-text"
              />
            </div>
          </div>

          {/* Observações */}
          <div className="form-group">
            <label>Observações / Ala / Setor (Opcional):</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ex: UTI Pediátrica, Pronto Atendimento, etc."
              className="input-text"
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-save">
              <CalendarPlus size={18} />
              <span>Agendar Plantão</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
