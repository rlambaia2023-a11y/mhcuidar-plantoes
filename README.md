# 🩺 mhcuidar • Plantões

Sistema pessoal de agendamento de plantões médicos. Você **fala ou digita um resumo** em linguagem natural — *"Plantão 24h amanhã às 7h no Hospital São Luiz"* — e o sistema entende, agenda, sincroniza com sua **Google Agenda** e te **avisa no WhatsApp** com antecedência.

## ✨ Recursos

- **Entrada por voz ou texto** em português: o sistema entende tipos de plantão (**12h, 24h, 48h, 72h, SN/sobreaviso**), datas (*hoje, amanhã, dia 25, 25/10, segunda, próxima sexta, "segunda, quarta e sexta"*), horas (*às 7h, 19h, 7 da noite, meio-dia*) e o local (*no Hospital X, na clínica*).
- **Confirmação inteligente**: antes de salvar, mostra um cartão com tudo que entendeu (com nível de confiança) — você ajusta com um toque se precisar.
- **Google Agenda**: cada plantão vira um evento na agenda da conta `mh.cuidarsaude@gmail.com`, com lembretes próprios.
- **Lembretes no WhatsApp**: avisos automáticos 24h e 2h antes (configurável), mais resumo diário opcional de manhã.
- **Múltiplos plantões de uma vez**: *"plantão 12h segunda, quarta e sexta no Hospital X"* cria os três.
- **100% seu**: banco de dados local (SQLite), sem mensalidade, sem depender de terceiros para os dados.

## 🚀 Instalação (no seu computador)

Pré-requisito: [Node.js 22 ou maior](https://nodejs.org) instalado.

```bat
cd mhcuidar-plantoes
npm install
copy .env.example .env
```

No Windows, inicie com dois cliques em **`iniciar.bat`** (ou `npm start` no terminal). Abra http://localhost:3003.

> Deixe o computador ligado para os lembretes funcionarem. Para 24/7 de verdade, veja **Publicar na nuvem** abaixo.

## 🔗 Conectar a Google Agenda (mh.cuidarsaude@gmail.com)

Feito uma única vez (~10 min):

1. Acesse https://console.cloud.google.com e crie um projeto (ex.: `mhcuidar-plantoes`).
2. Em **APIs e serviços → Biblioteca**, ative a **Google Calendar API**.
3. Em **APIs e serviços → Tela de consentimento OAuth**: tipo **Externo**, preencha nome/e-mail, adicione seu e-mail (`mh.cuidarsaude@gmail.com`) em **Usuários de teste**, salve.
4. Em **Credenciais → Criar credencial → ID do cliente OAuth**: tipo **Aplicativo da Web**; em **URIs de redirecionamento autorizados** adicione:
   `http://localhost:3003/api/google/callback`
5. Copie o **ID do cliente** e o **Segredo do cliente** para o `.env` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`).
6. Reinicie o sistema e clique em **🔗 Conectar Google Agenda** nas Configurações. Autorize com a conta `mh.cuidarsaude@gmail.com` e pronto — os plantões passam a aparecer na sua agenda automaticamente.

## 📲 Lembretes no WhatsApp

### Opção A — CallMeBot (grátis, recomendado)

1. Salve o número **+34 644 71 27 40** nos contatos e mande no WhatsApp: `I allow callmebot to send me messages`
2. Você recebe uma **apikey**. Coloque-a nas Configurações do sistema (campo *Chave CallMeBot*) junto com seu número (`5511999998888`).
3. Clique em **Testar WhatsApp**. Recebeu? Está funcionando.

## 📚 Por que um sistema próprio?

Pesquisa de mercado (out/2026) mostrou que **nenhum sistema popular combina** entrada em linguagem natural/voz + visão multi-hospitais + lembretes automáticos no WhatsApp para o médico autônomo:

- **Internacionais** (Amion, QGenda, ShiftAdmin): feitos para grupos e hospitais grandes, caros, sem WhatsApp.
- **Marketplaces** (Medely, ShiftKey, Revoluna): ofertam vagas, não gerenciam sua agenda pessoal.
- **Brasileiros de consultório** (iClinic, Doctoralia): lembretes WhatsApp são para *pacientes*, não para seus plantões.
- **Escalin** (o mais próximo: R$ 39,90/mês, assistente por WhatsApp em linguagem natural) não anuncia lembretes automáticos de plantão.

Este sistema preenche exatamente essa lacuna — e é seu, sem mensalidade.

### Opção B — Twilio

Crie conta em https://www.twilio.com/try-twilio, ative o WhatsApp Sandbox, preencha `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` no `.env` e escolha provedor `twilio` nas Configurações.

### Opção C — API oficial do WhatsApp (Meta)

Para volume maior ou número comercial: via um BSP (provedor oficial), mensagens utilitárias custam cerca de **R$ 0,035 cada** no Brasil (tabela Meta) — ~120 lembretes/mês sairiam por volta de R$ 4,20/mês. Exige implementação dedicada; fale comigo se quiser evoluir para essa opção.

## ⏰ Como funcionam os lembretes

- A cada 5 minutos o sistema verifica os plantões futuros.
- Nas janelas configuradas (padrão: **1440 min = 24h antes** e **120 min = 2h antes**), ele manda no seu WhatsApp:
  > ⏰ *Lembrete de plantão — mhcuidar*
  > 🩺 Plantão 24h
  > 📅 sex 24/10 às 07:00 (daqui a 24h)
  > 📍 Hospital São Luiz
  > ⏳ Término previsto: sáb 25/10 às 07:00
- **Resumo diário** (opcional): configure um horário (ex.: `07:00`) e receba toda manhã a lista dos plantões do dia.
- Cada aviso é enviado **uma única vez** (controle anti-duplicidade no banco).

## 💬 Exemplos do que você pode falar/digitar

- *"Plantão 24h amanhã às 7h no Hospital São Luiz"*
- *"Sobreaviso dia 25 no Hospital Albert Einstein"*
- *"SN amanhã na clínica"*
- *"Plantão 12h hoje às 19h na UPA Vila Maria"*
- *"Plantão 48h dia 12/11 às 8h no Hospital das Clínicas"*
- *"Plantão segunda, quarta e sexta às 7h no Hospital X"*
- *"Plantão de 72 horas dia 5 de novembro no Hospital Sírio"*

Se faltar alguma informação (hora, duração, local), o sistema assume um padrão sensato, **avisa o que assumiu** e deixa você corrigir no cartão de confirmação antes de salvar.

## ☁️ Publicar na nuvem (Railway — 24/7)

Para os lembretes funcionarem mesmo com o computador desligado:

1. Suba este projeto para o GitHub.
2. Em https://railway.app → **New Project → Deploy from GitHub**, selecione o repositório.
3. Em **Variables**, cadastre as mesmas chaves do `.env` (nunca commite o `.env`!).
   - Ajuste `GOOGLE_REDIRECT_URI` para `https://SEU-APP.up.railway.app/api/google/callback` e adicione essa URI nas credenciais do Google Cloud.
4. Pronto: o Railway mantém o sistema ligado e os lembretes chegam no seu WhatsApp de qualquer lugar.

## 🗂️ Estrutura

```
mhcuidar-plantoes/
├── src/
│   ├── server.js         # API + páginas
│   ├── parser.js         # interpreta o português falado/digitado
│   ├── db.js             # SQLite (node:sqlite, sem compilação)
│   ├── config.js         # .env + configurações da interface
│   ├── scheduler.js      # lembretes automáticos (a cada 5 min)
│   ├── whatsapp.js       # CallMeBot / Twilio / console
│   └── googleCalendar.js # OAuth2 + eventos na agenda
├── public/               # interface (voz via Web Speech API)
├── data/                 # banco + token (não vai para o git)
├── .env.example
└── iniciar.bat / iniciar.sh
```

## 🔒 Privacidade

Seus plantões ficam no banco local (`data/plantoes.db`). O token do Google fica em `data/token.json`. Nada disso é enviado ao GitHub (`.gitignore` protege). As únicas saídas são: eventos criados **na sua própria** Google Agenda e mensagens de lembrete **para o seu próprio** WhatsApp.
