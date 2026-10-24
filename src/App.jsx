import React, { useState, useEffect, useMemo } from 'react';
import Navbar from './components/Navbar';
import NextShiftBanner from './components/NextShiftBanner';
import VoiceTextInput from './components/VoiceTextInput';
import ShiftCard from './components/ShiftCard';
import StatsDashboard from './components/StatsDashboard';
import SettingsModal from './components/SettingsModal';
import ManualShiftModal from './components/ManualShiftModal';
import { loadShiftsFromStorage, saveShiftsToStorage, loadSettingsFromStorage, saveSettingsToStorage } from './utils/storage';
import { sendTelegramNotification } from './utils/telegramNotification';
import { Calendar, Filter, Search, Stethoscope, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import './App.css';

export default function App() {
  const [shifts, setShifts] = useState(() => loadShiftsFromStorage());
  const [settings, setSettings] = useState(() => loadSettingsFromStorage());
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [toast, setToast] = useState(null);

  // Salvar sempre que shifts mudar
  useEffect(() => {
    saveShiftsToStorage(shifts);
  }, [shifts]);

  // Salvar sempre que settings mudar
  useEffect(() => {
    saveSettingsToStorage(settings);
  }, [settings]);

  // Mostrar toast temporário
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Adicionar novos plantões
  const handleAddShifts = async (newShifts) => {
    setShifts(prev => {
      const updated = [...newShifts, ...prev];
      // Ordenar cronologicamente
      return updated.sort((a, b) => new Date(a.start) - new Date(b.start));
    });

    showToast(`${newShifts.length} plantão(ões) agendado(s) com sucesso!`, 'success');

    // Se Telegram estiver configurado, envia confirmação automática
    if (settings.telegramBotToken && settings.telegramChatId) {
      for (const shift of newShifts) {
        await sendTelegramNotification(shift, settings, 'manual');
      }
    }
  };

  // Excluir plantão
  const handleDeleteShift = (id) => {
    if (window.confirm('Deseja realmente remover este plantão da escala?')) {
      setShifts(prev => prev.filter(s => s.id !== id));
      showToast('Plantão removido da escala.', 'info');
    }
  };

  // Próximo plantão imediato
  const nextShift = useMemo(() => {
    const now = new Date();
    const upcoming = shifts
      .filter(s => new Date(s.end) >= now)
      .sort((a, b) => new Date(a.start) - new Date(b.start));
    return upcoming.length > 0 ? upcoming[0] : null;
  }, [shifts]);

  // Filtragem e busca de plantões
  const filteredShifts = useMemo(() => {
    const now = new Date();
    return shifts.filter(s => {
      // Filtro de busca textual
      const matchesSearch = 
        s.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.shiftType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.rawSummary && s.rawSummary.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      // Filtros de categoria
      if (activeFilter === 'upcoming') {
        return new Date(s.end) >= now;
      }
      if (activeFilter === 'past') {
        return new Date(s.end) < now;
      }
      if (activeFilter === '12h') {
        return s.shiftType.includes('12h');
      }
      if (activeFilter === '24h') {
        return s.shiftType === '24h';
      }
      if (activeFilter === 'long') {
        return s.shiftType === '48h' || s.shiftType === '72h';
      }
      if (activeFilter === 'sn') {
        return s.isSN || s.shiftType.includes('SN');
      }

      return true; // 'all'
    });
  }, [shifts, activeFilter, searchQuery]);

  return (
    <div className="app-layout">
      {/* Toast Notification */}
      {toast && (
        <div className={`toast-banner ${toast.type}`}>
          {toast.type === 'success' && <CheckCircle2 size={18} />}
          {toast.type === 'error' && <AlertCircle size={18} />}
          {toast.type === 'info' && <Info size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Navbar Superior */}
      <Navbar
        settings={settings}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenManualModal={() => setIsManualModalOpen(true)}
      />

      <main className="main-content">
        {/* Banner do Próximo Plantão com Contagem Regressiva */}
        <NextShiftBanner
          nextShift={nextShift}
          settings={settings}
          onShowToast={showToast}
        />

        {/* Módulo Central: Entrada por Voz ou Texto com IA */}
        <VoiceTextInput
          onAddShifts={handleAddShifts}
          settings={settings}
        />

        {/* Dashboard de Estatísticas e Controle de Carga Horária */}
        <StatsDashboard shifts={shifts} />

        {/* Lista de Plantões com Filtros */}
        <section className="shifts-list-section">
          <div className="list-controls-header">
            <div className="controls-title-group">
              <Calendar size={22} className="text-emerald" />
              <h2>Minha Escala de Plantões</h2>
              <span className="count-badge">{filteredShifts.length}</span>
            </div>

            {/* Barra de Busca e Filtros */}
            <div className="search-and-filters">
              <div className="search-input-wrapper">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Buscar hospital, clínica..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="filter-chips">
                <button
                  type="button"
                  className={`chip ${activeFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('all')}
                >
                  Todos ({shifts.length})
                </button>

                <button
                  type="button"
                  className={`chip ${activeFilter === 'upcoming' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('upcoming')}
                >
                  Próximos
                </button>

                <button
                  type="button"
                  className={`chip ${activeFilter === '12h' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('12h')}
                >
                  12h
                </button>

                <button
                  type="button"
                  className={`chip ${activeFilter === '24h' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('24h')}
                >
                  24h
                </button>

                <button
                  type="button"
                  className={`chip ${activeFilter === 'long' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('long')}
                >
                  48h / 72h
                </button>

                <button
                  type="button"
                  className={`chip ${activeFilter === 'sn' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('sn')}
                >
                  Sobreaviso (SN)
                </button>
              </div>
            </div>
          </div>

          {/* Grid de Cards de Plantão */}
          {filteredShifts.length > 0 ? (
            <div className="shifts-grid">
              {filteredShifts.map((shift) => (
                <ShiftCard
                  key={shift.id}
                  shift={shift}
                  settings={settings}
                  onDeleteShift={handleDeleteShift}
                  onShowToast={showToast}
                />
              ))}
            </div>
          ) : (
            <div className="empty-shifts-state">
              <p>Nenhum plantão encontrado para este filtro.</p>
              <button
                type="button"
                className="btn-clear-filter"
                onClick={() => { setActiveFilter('all'); setSearchQuery(''); }}
              >
                Limpar filtros
              </button>
            </div>
          )}
        </section>
      </main>

      {/* Modal de Configurações */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={setSettings}
        onShowToast={showToast}
      />

      {/* Modal de Agendamento Manual */}
      <ManualShiftModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onAddShift={handleAddShifts}
      />

      {/* Rodapé Institucional mhcuidar */}
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <Stethoscope size={18} className="text-emerald" />
            <span><strong>mhcuidar</strong> — Sistema de Gestão de Escalas Médicas</span>
          </div>
          <p className="footer-sync-notice">
            Sincronizado automaticamente com Google Agenda: <code>{settings.email}</code>
          </p>
          <div className="footer-badges">
            <span className="badge-tech">IA Multimodal</span>
            <span className="badge-tech">Telegram Bot API</span>
            <span className="badge-tech">Google Calendar</span>
            <span className="badge-tech">Plantões 12h, 24h, 48h, 72h & SN</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
