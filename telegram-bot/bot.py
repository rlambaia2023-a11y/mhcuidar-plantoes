#!/usr/bin/env python3
"""
mhcuidar - Bot de Agendamento Inteligente de Plantões Médicos
Desenvolvido especialmente para a Dra. e clínica mhcuidar.

Recursos:
- Recebe mensagens por ÁUDIO (nota de voz) ou TEXTO no Telegram.
- IA Gemini multimodal para transcrição e interpretação clínica da escala.
- Reconhece: SN (Sobreaviso), 12h Diurno/Noturno, 24h, 48h, 72h e múltiplos plantões.
- Sincronização direta com a Google Agenda (mh.cuidarsaude@gmail.com).
- Disparo automático de alertas com 24 HORAS e 2 HORAS de antecedência.
"""

import os
import io
import json
import logging
import urllib.parse
from datetime import datetime, timedelta, timezone
from pathlib import Path
from dotenv import load_dotenv
import pytz

# Carregar variáveis de ambiente
load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
DOCTOR_EMAIL = os.getenv("DOCTOR_EMAIL", "mh.cuidarsaude@gmail.com")
TIMEZONE_NAME = os.getenv("TIMEZONE", "America/Bahia")
LOCAL_TZ = pytz.timezone(TIMEZONE_NAME)

# Configuração de Logs
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO
)
logger = logging.getLogger("mhcuidarBot")

# Arquivo de Banco de Dados Local Simples
DB_FILE = Path(__file__).parent / "shifts_db.json"

# Importações Telegram
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.constants import ParseMode, ChatAction
from telegram.ext import (
    ApplicationBuilder,
    CommandHandler,
    MessageHandler,
    ContextTypes,
    filters,
)

# Inicialização Google GenAI
gemini_client = None
if GEMINI_API_KEY:
    try:
        from google import genai
        from google.genai import types
        gemini_client = genai.Client(api_key=GEMINI_API_KEY)
        logger.info("Cliente Google Gemini inicializado com sucesso!")
    except Exception as e:
        logger.warning(f"Não foi possível inicializar google-genai: {e}")


# ==============================================================================
# BANCO DE DADOS LOCAL (JSON)
# ==============================================================================
def load_db() -> list:
    if not DB_FILE.exists():
        return []
    try:
        with open(DB_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Erro ao ler banco de dados: {e}")
        return []

def save_db(data: list):
    try:
        with open(DB_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logger.error(f"Erro ao salvar banco de dados: {e}")


# ==============================================================================
# UTILITÁRIOS DE CALENDÁRIO & GOOGLE AGENDA
# ==============================================================================
def generate_gcal_url(shift: dict) -> str:
    """Gera link direto de 1 clique para salvar no Google Agenda"""
    start_dt = datetime.fromisoformat(shift["start_iso"])
    duration = shift.get("duration_hours", 24)
    end_dt = start_dt + timedelta(hours=duration)

    # Formatar para UTC comprimido: YYYYMMDDTHHMMSSZ
    start_utc = start_dt.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    end_utc = end_dt.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

    title = f"🏥 [mhcuidar] Plantão {shift['shift_type']} - {shift['location']}"
    
    details_lines = [
        "🩺 SISTEMA DE PLANTÕES MHCUIDAR",
        "----------------------------------------",
        f"📍 Local: {shift['location']}",
        f"⏱️ Tipo: {shift['shift_type']} ({duration}h)",
        "🟡 Modalidade: Sobreaviso / Se Necessário (SN)" if shift.get("is_sn") else "",
        f"\n⚠️ {shift['fatigue_alert']}" if shift.get("fatigue_alert") else "",
        f"\n📧 E-mail vinculado: {DOCTOR_EMAIL}",
        "🔔 Alertas configurados: 24h e 2h antes no Telegram.",
        f"\nResumo falado: \"{shift.get('raw_summary', '')}\""
    ]
    details = "\n".join([line for line in details_lines if line])

    params = {
        "action": "TEMPLATE",
        "text": title,
        "dates": f"{start_utc}/{end_utc}",
        "details": details,
        "location": shift["location"],
        "add": DOCTOR_EMAIL
    }
    return f"https://calendar.google.com/calendar/render?{urllib.parse.urlencode(params)}"


# ==============================================================================
# INTELIGÊNCIA ARTIFICIAL COM GEMINI FLASH
# ==============================================================================
AI_SYSTEM_PROMPT = f"""
Você é o Assistente Médico Especialista em Gestão de Plantões e Escalas da clínica mhcuidar.
Seu objetivo é analisar mensagens (de voz ou texto) enviadas pela médica e extrair com precisão absoluta os detalhes dos plantões.

Data e hora de referência atual: {datetime.now(LOCAL_TZ).strftime('%Y-%m-%d %H:%M:%S')} (Fuso: {TIMEZONE_NAME}).

REGRAS DE EXTRAÇÃO:
1. Local: Identifique se é na 'Clínica mhcuidar', 'Hospital Geral Clériston Andrade (HGCA)', 'Hospital Estadual da Criança (HEC)', 'Hospital da Mulher', ou outro hospital/UPA citado. Se não for especificado, assuma 'Clínica mhcuidar'.
2. Tipo e Duração:
   - SN / Sobreaviso / Se Necessário -> is_sn: true, shift_type: 'SN', duration_hours: 24 (ou conforme citado).
   - 12h -> shift_type: '12h Diurno' (início 07h) ou '12h Noturno' (início 19h).
   - 24h -> shift_type: '24h', duration_hours: 24 (início padrão 07h).
   - 48h -> shift_type: '48h', duration_hours: 48.
   - 72h -> shift_type: '72h', duration_hours: 72.
3. Se o plantão for de 48h ou 72h, gere um fatigue_alert amigável alertando sobre descanso prévio e hidratação.
4. Múltiplos plantões: Se a médica disser vários (ex: 'amanhã 24h no Clériston e sábado 12h na clínica'), retorne todos na lista 'shifts'.

RETORNE ESTRITAMENTE UM JSON VÁLIDO no seguinte formato:
{{
  "shifts": [
    {{
      "location": "Nome do Hospital ou Clínica",
      "shift_type": "24h",
      "duration_hours": 24,
      "start_iso": "YYYY-MM-DDTHH:MM:00-03:00",
      "is_sn": false,
      "fatigue_alert": "mensagem de alerta se >=48h ou null",
      "notes": "observações adicionais ou setor"
    }}
  ],
  "reply_text": "Breve confirmação cordial em português para a Dra."
}}
"""

async def parse_with_gemini(text: str = None, audio_bytes: bytes = None) -> dict:
    """Interpreta áudio ou texto usando Gemini Flash"""
    if not gemini_client:
        return fallback_parse(text or "")

    try:
        contents = []
        if audio_bytes:
            contents.append(
                types.Part.from_bytes(data=audio_bytes, mime_type="audio/ogg")
            )
            contents.append("Transcreva este áudio da Dra. e extraia a escala de plantões no formato JSON solicitado.")
        else:
            contents.append(f"Texto da médica: \"{text}\"")

        response = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=AI_SYSTEM_PROMPT,
                response_mime_type="application/json",
                temperature=0.1
            )
        )
        data = json.loads(response.text)
        return data
    except Exception as e:
        logger.error(f"Erro na IA Gemini: {e}")
        return fallback_parse(text or "plantão")


def fallback_parse(text: str) -> dict:
    """Fallback baseado em regras caso a API da IA esteja indisponível"""
    now = datetime.now(LOCAL_TZ)
    lower = text.lower()

    # Duração
    duration = 24
    shift_type = "24h"
    is_sn = "sn" in lower or "sobreaviso" in lower
    if is_sn:
        shift_type = "SN"
    elif "72" in lower:
        duration, shift_type = 72, "72h"
    elif "48" in lower:
        duration, shift_type = 48, "48h"
    elif "12" in lower:
        duration = 12
        shift_type = "12h Noturno" if ("noite" in lower or "noturno" in lower) else "12h Diurno"

    # Data
    target_dt = now + timedelta(days=1)
    if "hoje" in lower:
        target_dt = now
    elif "depois de amanhã" in lower:
        target_dt = now + timedelta(days=2)

    start_hour = 19 if "noturno" in shift_type else 7
    start_dt = target_dt.replace(hour=start_hour, minute=0, second=0, microsecond=0)

    # Local
    location = "Clínica mhcuidar"
    if "clériston" in lower or "cleriston" in lower or "hgca" in lower:
        location = "Hospital Geral Clériston Andrade (HGCA)"
    elif "criança" in lower or "crianca" in lower or "hec" in lower:
        location = "Hospital Estadual da Criança (HEC)"
    elif "mulher" in lower:
        location = "Hospital da Mulher"
    elif "geral" in lower:
        location = "Hospital Geral"
    elif "unimed" in lower:
        location = "Hospital Unimed"

    fatigue_alert = f"⚠️ Plantão de {duration}h exige descanso prévio e hidratação redobrada!" if duration >= 48 else None

    return {
        "shifts": [{
            "location": location,
            "shift_type": shift_type,
            "duration_hours": duration,
            "start_iso": start_dt.isoformat(),
            "is_sn": is_sn,
            "fatigue_alert": fatigue_alert,
            "notes": ""
        }],
        "reply_text": f"Plantão identificado: {shift_type} em {location}."
    }


# ==============================================================================
# DISPARO DE ALERTAS COM ANTECEDÊNCIA (24h e 2h)
# ==============================================================================
async def send_reminder_job(context: ContextTypes.DEFAULT_TYPE):
    """Executado pelo JobQueue do Telegram quando o momento do alerta chegar"""
    job_data = context.job.data
    chat_id = job_data["chat_id"]
    shift = job_data["shift"]
    alert_type = job_data["alert_type"]

    start_dt = datetime.fromisoformat(shift["start_iso"])
    data_formatada = start_dt.strftime("%d/%m (%A) às %H:%M")

    if alert_type == "24h":
        header = "⏰ *mhcuidar | Alerta de Plantão (Amanhã!)*"
        sub = "Faltam aproximadamente 24 horas para o início do seu turno."
    else:
        header = "🚨 *mhcuidar | AVISO IMEDIATO (Começa em 2 Horas!)*"
        sub = "Seu plantão começa em breve! Lembre-se de checar o trajeto e equipamentos."

    msg = [
        header,
        f"Olá, Dra.! {sub}",
        "",
        f"🏥 *Local:* {shift['location']}",
        f"⏱️ *Modalidade:* {shift['shift_type']} ({shift.get('duration_hours', 24)}h)",
        f"🗓️ *Horário:* {data_formatada}",
        f"⚠️ {shift['fatigue_alert']}" if shift.get("fatigue_alert") else "",
        "",
        "💙 *mhcuidar* — Cuidando de quem cuida."
    ]
    text = "\n".join([line for line in msg if line])

    gcal_url = generate_gcal_url(shift)
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("📅 Ver na Google Agenda", url=gcal_url)]
    ])

    await context.bot.send_message(
        chat_id=chat_id,
        text=text,
        parse_mode=ParseMode.MARKDOWN,
        reply_markup=keyboard
    )


def schedule_shift_reminders(job_queue, chat_id: int, shift: dict):
    """Agenda os alertas de 24h e 2h no JobQueue do Telegram"""
    if not job_queue:
        return

    start_dt = datetime.fromisoformat(shift["start_iso"])
    now = datetime.now(LOCAL_TZ)

    # Alerta de 24h antes
    time_24h = start_dt - timedelta(hours=24)
    seconds_24h = (time_24h - now).total_seconds()
    if seconds_24h > 0:
        job_queue.run_once(
            send_reminder_job,
            when=seconds_24h,
            data={"chat_id": chat_id, "shift": shift, "alert_type": "24h"},
            name=f"alert_24h_{shift.get('id', start_dt.timestamp())}"
        )
        logger.info(f"Alerta de 24h agendado para daqui a {seconds_24h/3600:.1f}h")

    # Alerta de 2h antes
    time_2h = start_dt - timedelta(hours=2)
    seconds_2h = (time_2h - now).total_seconds()
    if seconds_2h > 0:
        job_queue.run_once(
            send_reminder_job,
            when=seconds_2h,
            data={"chat_id": chat_id, "shift": shift, "alert_type": "2h"},
            name=f"alert_2h_{shift.get('id', start_dt.timestamp())}"
        )
        logger.info(f"Alerta de 2h agendado para daqui a {seconds_2h/3600:.1f}h")


# ==============================================================================
# COMANDOS DO TELEGRAM
# ==============================================================================
async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_name = update.effective_user.first_name or "Dra."
    chat_id = update.effective_chat.id

    msg = [
        f"🩺 *Olá, {user_name}! Bem-vinda ao Assistente de Plantões mhcuidar.*",
        "",
        "Eu automatizo a sua escala médica em hospitais e clínicas:",
        "• Você pode me enviar uma *mensagem de voz (áudio)* ou *digitar um resumo*.",
        "• Eu identifico o hospital, data, horário e duração (SN, 12h, 24h, 48h ou 72h).",
        "• Sincronizo com a sua Google Agenda (`mh.cuidarsaude@gmail.com`).",
        "• Envio lembretes automáticos com *24 horas* e *2 horas* de antecedência aqui no Telegram!",
        "",
        f"🔑 *Seu Chat ID:* `{chat_id}`",
        "_(Pode copiar e colar no painel web da mhcuidar se desejar)_",
        "",
        "💡 *Como usar agora:* Envie um áudio ou mensagem de texto dizendo algo como:",
        "_\"Vou ter plantão de 24h no Clériston amanhã às 7h e sábado 12h diurno na clínica mhcuidar\"_"
    ]
    await update.message.reply_text("\n".join(msg), parse_mode=ParseMode.MARKDOWN)


async def escala_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    shifts = load_db()
    now = datetime.now(LOCAL_TZ)
    
    # Filtrar próximos
    upcoming = [s for s in shifts if datetime.fromisoformat(s["start_iso"]) >= (now - timedelta(hours=24))]
    upcoming.sort(key=lambda s: s["start_iso"])

    if not upcoming:
        await update.message.reply_text(
            "📋 *Nenhum plantão agendado para os próximos dias.*\nEnvie um áudio ou texto para cadastrar!",
            parse_mode=ParseMode.MARKDOWN
        )
        return

    lines = ["📋 *Sua Escala de Plantões Médicos — mhcuidar*", ""]
    for i, s in enumerate(upcoming, 1):
        dt = datetime.fromisoformat(s["start_iso"])
        dt_str = dt.strftime("%d/%m (%a) às %H:%M")
        sn_tag = " [SN - Sobreaviso]" if s.get("is_sn") else ""
        lines.append(f"*{i}.* 🏥 *{s['location']}*")
        lines.append(f"   ⏱️ {s['shift_type']} ({s.get('duration_hours')}h){sn_tag} | 🗓️ {dt_str}")
        lines.append("")

    lines.append(f"✅ Sincronizados com: `{DOCTOR_EMAIL}`")
    await update.message.reply_text("\n".join(lines), parse_mode=ParseMode.MARKDOWN)


async def proximo_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    shifts = load_db()
    now = datetime.now(LOCAL_TZ)

    upcoming = [s for s in shifts if datetime.fromisoformat(s["start_iso"]) >= now]
    upcoming.sort(key=lambda s: s["start_iso"])

    if not upcoming:
        await update.message.reply_text("Nenhum plantão futuro encontrado na sua escala.")
        return

    s = upcoming[0]
    start_dt = datetime.fromisoformat(s["start_iso"])
    diff = start_dt - now
    hours_left = int(diff.total_seconds() // 3600)
    minutes_left = int((diff.total_seconds() % 3600) // 60)

    gcal_url = generate_gcal_url(s)
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("📅 Abrir na Google Agenda", url=gcal_url)]
    ])

    msg = [
        "🩺 *Próximo Plantão Imediato — mhcuidar*",
        "",
        f"🏥 *Local:* {s['location']}",
        f"⏱️ *Modalidade:* {s['shift_type']} ({s.get('duration_hours')}h)",
        f"🗓️ *Data:* {start_dt.strftime('%d/%m/%Y (%A)')} às {start_dt.strftime('%H:%M')}",
        f"⏳ *Começa em:* {hours_left}h e {minutes_left}min",
        f"\n⚠️ {s['fatigue_alert']}" if s.get("fatigue_alert") else ""
    ]
    await update.message.reply_text(
        "\n".join([line for line in msg if line]),
        parse_mode=ParseMode.MARKDOWN,
        reply_markup=keyboard
    )


async def ajuda_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    msg = [
        "📖 *Comandos e Exemplos de Uso — mhcuidar Plantões*",
        "",
        "🗣️ *Como falar ou digitar:*",
        "• _\"Plantão 24h amanhã às 7h no Clériston\"_",
        "• _\"Sobreaviso SN sábado na clínica mhcuidar\"_",
        "• _\"Plantão 12h noturno sexta no Hospital da Criança\"_",
        "• _\"Plantão 48h no final de semana no Hospital Geral\"_",
        "• _\"Plantão 72h no Clériston começando sexta às 19h\"_",
        "",
        "🤖 *Comandos disponíveis:*",
        "/escala — Lista todos os seus plantões futuros",
        "/proximo — Mostra o próximo plantão com contagem regressiva",
        "/start — Informações do bot e seu Chat ID",
        "/ajuda — Exibe esta mensagem de ajuda"
    ]
    await update.message.reply_text("\n".join(msg), parse_mode=ParseMode.MARKDOWN)


# ==============================================================================
# PROCESSADOR DE MENSAGENS (VOZ E TEXTO)
# ==============================================================================
async def process_shift_message(update: Update, context: ContextTypes.DEFAULT_TYPE, is_voice: bool = False):
    chat_id = update.effective_chat.id
    await context.bot.send_chat_action(chat_id=chat_id, action=ChatAction.TYPING)

    audio_bytes = None
    text_content = None

    if is_voice:
        voice = update.message.voice
        voice_file = await context.bot.get_file(voice.file_id)
        audio_buffer = io.BytesIO()
        await voice_file.download_to_memory(audio_buffer)
        audio_bytes = audio_buffer.getvalue()
    else:
        text_content = update.message.text

    # Processar com IA
    result = await parse_with_gemini(text=text_content, audio_bytes=audio_bytes)
    shifts = result.get("shifts", [])

    if not shifts:
        await update.message.reply_text(
            "Desculpe, Dra., não consegui identificar os dados do plantão. Poderia falar ou digitar novamente especificando o dia, hospital e horário?",
            parse_mode=ParseMode.MARKDOWN
        )
        return

    # Salvar e Agendar Notificações
    current_db = load_db()
    for s in shifts:
        s["id"] = f"shift_{int(datetime.now().timestamp())}_{len(current_db)}"
        s["raw_summary"] = text_content or "Mensagem de voz gravada"
        s["created_at"] = datetime.now().isoformat()
        current_db.append(s)

        # Agendar lembretes no Telegram (24h e 2h)
        schedule_shift_reminders(context.job_queue, chat_id, s)

    save_db(current_db)

    # Responder à médica com os detalhes confirmados
    for s in shifts:
        dt = datetime.fromisoformat(s["start_iso"])
        dt_str = dt.strftime("%d/%m/%Y (%A) às %H:%M")
        dur = s.get("duration_hours", 24)
        gcal_url = generate_gcal_url(s)

        inline_keyboard = InlineKeyboardMarkup([
            [InlineKeyboardButton("📅 Adicionar à Google Agenda", url=gcal_url)],
            [InlineKeyboardButton("📋 Ver Toda Minha Escala", callback_data="show_escala")]
        ])

        reply_lines = [
            "✅ *Plantão Agendado com Sucesso!*",
            f"🏥 *Local:* {s['location']}",
            f"⏱️ *Modalidade:* {s['shift_type']} ({dur} horas)",
            "🟡 *Regime:* Sobreaviso / Se Necessário (SN)" if s.get("is_sn") else "",
            f"🗓️ *Início:* {dt_str}",
            f"\n{s['fatigue_alert']}" if s.get("fatigue_alert") else "",
            "",
            "🔔 *Alertas ativados:* Você receberá avisos automáticos aqui no Telegram com *24h* e *2h* de antecedência.",
            f"📧 Vinculado ao e-mail: `{DOCTOR_EMAIL}`"
        ]
        
        await update.message.reply_text(
            "\n".join([line for line in reply_lines if line]),
            parse_mode=ParseMode.MARKDOWN,
            reply_markup=inline_keyboard
        )


async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await process_shift_message(update, context, is_voice=False)


async def handle_voice(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await process_shift_message(update, context, is_voice=True)


# ==============================================================================
# MAIN
# ==============================================================================
def main():
    if not TELEGRAM_BOT_TOKEN or TELEGRAM_BOT_TOKEN == "seu_token_do_telegram_aqui":
        print("=" * 70)
        print("ATENÇÃO: TELEGRAM_BOT_TOKEN não foi configurado!")
        print("Edite o arquivo .env com o token do seu bot obtido no @BotFather.")
        print("=" * 70)
        return

    logger.info("Iniciando Bot de Plantões mhcuidar...")
    app = ApplicationBuilder().token(TELEGRAM_BOT_TOKEN).build()

    # Handlers de Comandos
    app.add_handler(CommandHandler("start", start_command))
    app.add_handler(CommandHandler("escala", escala_command))
    app.add_handler(CommandHandler("proximo", proximo_command))
    app.add_handler(CommandHandler("ajuda", ajuda_command))

    # Handlers de Voz e Texto
    app.add_handler(MessageHandler(filters.VOICE, handle_voice))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))

    logger.info("Bot mhcuidar ativo e aguardando mensagens no Telegram!")
    app.run_polling()


if __name__ == "__main__":
    main()
