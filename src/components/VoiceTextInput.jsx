import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, Sparkles, Check, AlertCircle, RefreshCw, Wand2, CalendarCheck, Clock, MapPin } from 'lucide-react';
import { parseShiftInput } from '../utils/aiParser';
import { generateGoogleCalendarUrl } from '../utils/calendarIntegration';
import { generateWhatsAppLink } from '../utils/whatsappNotification';

const EXAMPLE_PHRASES = [
  "Plantão 24h amanhã às 7h no Clériston",
  "Sobreaviso SN sábado na clínica mhcuidar",
  "Plantão 12h noturno sexta no Hospital da Criança",
  "Plantão 48h final de semana no Hospital Geral",
  "Plantão 72h no Clériston começando sábado"
];

export default function VoiceTextInput({ onAddShifts, settings }) {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [recognitionError, setRecognitionError] = useState(null);
  const [previewShifts, setPreviewShifts] = useState(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Inicializar Web Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        }
      }
      if (finalTranscript) {
        setInputText(prev => (prev ? prev + ' ' : '') + finalTranscript.trim());
      }
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      setIsRecording(false);
      if (event.error === 'not-allowed') {
        setRecognitionError('Permissão de microfone negada no navegador. Você pode digitar no campo de texto.');
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleRecording = () => {
    if (!isSupported) {
      alert('Seu navegador não suporta reconhecimento de voz direto. Você pode digitar ou colar o resumo do plantão!');
      return;
    }

    setRecognitionError(null);

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error('Falha ao iniciar reconhecimento de voz:', err);
      }
    }
  };

  const handleProcessInput = (textToProcess = inputText) => {
    if (!textToProcess.trim()) return;

    const detected = parseShiftInput(textToProcess);
    if (detected.length === 0) {
      alert('Não foi possível identificar data e plantão no texto. Tente informar algo como: "Plantão 24h amanhã às 7h no Clériston".');
      return;
    }

    setPreviewShifts(detected);
  };

  const handleConfirmAdd = () => {
    if (!previewShifts || previewShifts.length === 0) return;

    onAddShifts(previewShifts);
    setPreviewShifts(null);
    setInputText('');
  };

  const handleUseExample = (example) => {
    setInputText(example);
    handleProcessInput(example);
  };

  return (
    <div className="voice-input-card">
      <div className="voice-input-header">
        <div className="title-with-badge">
          <Wand2 className="text-emerald" size={22} />
          <h2 className="voice-title">Fale ou Digite seu Plantão</h2>
          <span className="ia-pill">
            <Sparkles size={13} />
            IA Parser Ativo
          </span>
        </div>
        <span className="voice-instruction">
          A IA entende plantões de <strong>SN</strong>, <strong>12h</strong>, <strong>24h</strong>, <strong>48h</strong> ou <strong>72h</strong>
        </span>
      </div>

      {recognitionError && (
        <div className="recognition-warning">
          <AlertCircle size={16} />
          <span>{recognitionError}</span>
        </div>
      )}

      {/* Caixa de Entrada com Botão de Microfone */}
      <div className={`input-field-wrapper ${isRecording ? 'recording-active' : ''}`}>
        <textarea
          rows={3}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            isRecording 
              ? "Ouvindo... pode falar seu plantão (ex: 'Plantão de 24 horas amanhã no Clériston às 7 da manhã')..." 
              : "Fale ou digite: 'Plantão 24h amanhã às 7h no Clériston e sábado sobreaviso SN na mhcuidar'..."
          }
          className="voice-textarea"
        />

        <div className="input-actions-bar">
          <div className="left-recording-controls">
            <button
              type="button"
              onClick={toggleRecording}
              className={`btn-mic ${isRecording ? 'recording' : ''}`}
              title={isRecording ? "Clique para parar de gravar" : "Clique e fale seu plantão"}
            >
              {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
              <span>{isRecording ? "Gravando áudio..." : "Falar Plantão"}</span>
            </button>

            {isRecording && (
              <div className="sound-wave-anim">
                <span className="bar"></span>
                <span className="bar"></span>
                <span className="bar"></span>
                <span className="bar"></span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleProcessInput()}
            disabled={!inputText.trim()}
            className="btn-process-ai"
          >
            <Sparkles size={18} />
            <span>Interpretar com IA</span>
          </button>
        </div>
      </div>

      {/* Sugestões de Fala Rápida */}
      <div className="examples-section">
        <span className="examples-label">Sugestões rápidas:</span>
        <div className="examples-list">
          {EXAMPLE_PHRASES.map((phrase, idx) => (
            <button
              key={idx}
              type="button"
              className="btn-example-chip"
              onClick={() => handleUseExample(phrase)}
            >
              "{phrase}"
            </button>
          ))}
        </div>
      </div>

      {/* Card de Pré-visualização da IA */}
      {previewShifts && previewShifts.length > 0 && (
        <div className="preview-confirmation-modal">
          <div className="preview-header">
            <div className="preview-title-box">
              <Sparkles size={20} className="text-emerald" />
              <h3>A IA identificou {previewShifts.length} {previewShifts.length > 1 ? 'plantões' : 'plantão'}:</h3>
            </div>
            <span className="preview-sub">Confira os detalhes antes de agendar</span>
          </div>

          <div className="preview-cards-list">
            {previewShifts.map((shift, i) => {
              const startD = new Date(shift.start);
              const endD = new Date(shift.end);

              return (
                <div key={i} className="preview-item-card">
                  <div className="preview-item-header">
                    <span className="preview-badge">{shift.shiftType}</span>
                    <strong className="preview-hospital">
                      <MapPin size={16} />
                      {shift.location}
                    </strong>
                  </div>

                  <div className="preview-item-body">
                    <div className="preview-time-row">
                      <Clock size={15} />
                      <span>
                        {startD.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })} às {startD.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} até {endD.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ({shift.durationHours}h)
                      </span>
                    </div>

                    {shift.fatigueAlert && (
                      <div className="preview-fatigue-alert">
                        {shift.fatigueAlert}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="preview-actions">
            <button
              type="button"
              className="btn-cancel-preview"
              onClick={() => setPreviewShifts(null)}
            >
              Cancelar / Corrigir
            </button>

            <button
              type="button"
              className="btn-confirm-preview"
              onClick={handleConfirmAdd}
            >
              <CalendarCheck size={18} />
              <span>Confirmar e Adicionar à Escala</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
