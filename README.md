# 🩺 mhcuidar Plantões AI & Telegram Bot
> **Sistema Inteligente de Gestão de Escalas, Plantões e Notificações Médicas**  
> Desenvolvido especialmente para a Dra. e para a clínica **mhcuidar**.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Frlambaia2023-a11y%2Fmhcuidar-plantoes)

---

## 📌 Visão Geral do Projeto

O **mhcuidar Plantões AI** é uma solução médica de alta inteligência e máxima simplicidade operacional. Ele foi construído para eliminar a burocracia das escalas tradicionais, permitindo que a médica simplesmente **fale por áudio ou digite um resumo rápido** do seu plantão. 

O sistema:
1. Extrai automaticamente o hospital/clínica, data, horário, modalidade e duração (**SN, 12h, 24h, 48h, 72h**).
2. Sincroniza diretamente com a **Google Agenda** da conta oficial: `mh.cuidarsaude@gmail.com`.
3. Envia e automatiza avisos com antecedência de **24 horas** e **2 horas** diretamente no seu **Telegram** e WhatsApp.
4. Funciona tanto via **Web App / PWA** (pronto para GitHub Pages `github.io`) quanto via **Bot Dedicado no Telegram** 24/7 que ouve suas notas de voz diretamente no celular!

---

## 🔬 Pesquisa de Mercado: Benchmark de Sistemas de Escala Médica no Brasil

Pesquisamos os principais sistemas utilizados no Brasil (*DoctorID*, *Escala Einstein*, *Minha Escala*, *HealthChess*, *Medbolso*, *Plantão.ai*, *Escalin* e *Meus Plantões*):

| Recurso | Softwares Tradicionais do Mercado | **mhcuidar Plantões AI** 🌟 |
| :--- | :--- | :--- |
| **Entrada por Áudio / Voz (Telegram & Web)** | ❌ Inexistente (exigem preenchimento manual lento de dezenas de campos) | ✅ **Nativo por IA**: Envie uma nota de voz no Telegram ou toque no microfone do site e fale naturalmente. |
| **Interpretação de Resumos Livres** | ❌ Não suportado | ✅ **Multimodal Gemini**: Entende "plantão de 24h no Clériston amanhã às 7h e sábado 12h na clínica". |
| **Plantões Médicos Específicos** | ⚠️ Rígido | ✅ **Nativo**: Suporta **SN** (Sobreaviso), **12h** (Diurno/Noturno), **24h**, **48h** e **72h**. |
| **Integração Google Agenda** | ⚠️ Complexo ou apenas export manual | ✅ **Instantâneo**: Sincroniza com a conta `mh.cuidarsaude@gmail.com` em 1 clique com lembretes automáticos. |
| **Notificações no Telegram** | ❌ Quase nenhum possui | ✅ **Totalmente Integrado**: Bot dedicado com alertas automáticos com 24h e 2h de antecedência. |
| **Alerta Médico de Fadiga / Estafa** | ❌ Não possui | ✅ **Inteligente**: Detecta turnos longos (48h/72h) ou sobrecarga mensal > 60h e emite alertas preventivos de descanso. |
| **Estabilidade e Custo** | 💰 R$ 500 a R$ 2.000/mês | 🚀 **100% Gratuito & Alta Estabilidade**: Roda no GitHub Pages (`github.io`) e Render/Railway. |

---

## 📱 Canais de Uso para a Dra.

### 1. Bot Dedicado no Telegram (`telegram-bot/bot.py`)
O jeito mais rápido e prático no dia a dia:
* **Grave um áudio no Telegram** enquanto dirige ou entre atendimentos: *"Amanhã 24h no Hospital Geral às 7h"*.
* O bot transcreve o áudio com IA Gemini, confirma os horários, gera o botão para salvar na sua Google Agenda e agenda os alertas:
  * ⏰ **24 horas antes**: aviso preventivo para descanso.
  * 🚨 **2 horas antes**: aviso de saída e deslocamento para o hospital.
* **Comandos úteis no Telegram:**
  * `/escala` — Lista todos os próximos plantões agendados.
  * `/proximo` — Mostra o próximo plantão com contagem regressiva em tempo real.
  * `/ajuda` — Dicas e exemplos de agendamento.

### 2. Painel Web Clínico (`mhcuidar-plantoes`)
* Microfone integrado no navegador com transcrição instantânea (`pt-BR`).
* Dashboard de horas do mês, contabilizando turnos de 12h, 24h, 48h, 72h e Sobreaviso (SN).
* Filtros por modalidade, exportação em lote de arquivo `.ics` para iPhone/Android e links diretos para Google Agenda e WhatsApp.

---

## 🚀 Como Executar e Manter 24/7 sem Cair

### Parte A: Publicação do Painel Web no GitHub Pages (`github.io`)
O projeto já conta com o workflow do GitHub Actions em `.github/workflows/deploy.yml`.

1. **Subir o código para o seu repositório no GitHub:**
   ```bash
   cd "C:\Users\FBBR\.gemini\antigravity\scratch\mhcuidar-plantoes"
   git add .
   git commit -m "feat: bot de plantoes mhcuidar com telegram e google calendar"
   git remote add origin https://github.com/SEU_USUARIO/mhcuidar-plantoes.git
   git branch -M main
   git push -u origin main
   ```
2. **Ativar o GitHub Pages no repositório:**
   * No GitHub, acesse **Settings** > **Pages**.
   * Em **Build and deployment**, selecione **Source: GitHub Actions**.
   * Em menos de 2 minutos seu painel estará online e estável em:  
     `https://SEU_USUARIO.github.io/mhcuidar-plantoes/`

---

### Parte B: Hospedar o Bot do Telegram 24 Horas Grátis (Render / Railway / Cloud Run)

Para que o bot do Telegram fique **sempre online ("para nunca ele ficar fora")**, ele pode ser executado gratuitamente no **Render.com** ou **Railway**:

#### Opção Recomendada: Render.com (Background Worker Gratuito)
1. Acesse [render.com](https://render.com) e conecte com seu GitHub.
2. Clique em **New** > **Background Worker** (ou use o blueprint `telegram-bot/render.yaml`).
3. Conecte o repositório `mhcuidar-plantoes`.
4. Defina as seguintes configurações:
   * **Root Directory**: `telegram-bot`
   * **Runtime**: `Python 3`
   * **Build Command**: `pip install -r requirements.txt`
   * **Start Command**: `python bot.py`
5. Adicione as variáveis de ambiente (**Environment Variables**):
   * `TELEGRAM_BOT_TOKEN`: Token obtido no `@BotFather` do Telegram.
   * `GEMINI_API_KEY`: Sua chave de IA do Google AI Studio (gratuita).
   * `DOCTOR_EMAIL`: `mh.cuidarsaude@gmail.com`
   * `TIMEZONE`: `America/Bahia` (ou seu fuso de preferência).
6. Clique em **Create Worker**. Pronto! O bot ficará rodando 24 horas por dia, 7 dias por semana, sem quedas e sem custos.

#### Executar Localmente no Computador:
Se preferir rodar no próprio PC:
```bash
cd telegram-bot
pip install -r requirements.txt
python bot.py
```

---

## ⚙️ Configurações Integradas

| Configuração | Padrão | Finalidade |
| :--- | :--- | :--- |
| **E-mail Google Agenda** | `mh.cuidarsaude@gmail.com` | Todos os botões e links vinculam eventos diretamente a esta conta. |
| **Avisos com 24h** | ✅ Ativo | Lembrete de véspera para organização de repouso e substituições. |
| **Avisos com 2h** | ✅ Ativo | Alerta imediato de deslocamento até o hospital/clínica. |
| **Fuso Horário** | `America/Bahia` | Horários oficiais brasileiros. |
| **WhatsApp Oficial** | `+55 (75) 99181-5612` | Atalho de mensagem formatada para envio pessoal. |

---

## 👩‍⚕️ Exemplos de Áudio / Mensagens Suportadas

* *"Tenho plantão de 24h no Hospital Geral amanhã às 7 da manhã"*
* *"Plantão de 12h noturno no Hospital da Criança sexta-feira às 19h"*
* *"Sobreaviso SN neste sábado na clínica mhcuidar"*
* *"Plantão de 48h no final de semana no Clériston começando sábado às 7h"*
* *"Amanhã 24h no Clériston e terça 12h diurno na clínica"*

---

Desenvolvido com carinho para a excelência médica da **mhcuidar** 🩺💚.
