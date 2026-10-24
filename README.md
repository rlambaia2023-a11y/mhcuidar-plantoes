# 🩺 mhcuidar • Plantões AI

> **Sistema Inteligente de Escalas e Plantões Médicos para a Dra. e Equipe da clínica mhcuidar**  
> Fale ou digite seu plantão em linguagem natural — o sistema agenda, calcula as horas, sincroniza com sua **Google Agenda** e te avisa no **WhatsApp** com antecedência.

---

## ✨ Principais Funcionalidades

- **🎙️ Entrada por Voz ou Texto (IA NLP)**:
  - Fale naturalmente pelo microfone em português ou digite/cole a escala recebida.
  - Entende todas as modalidades médicas: **SN (Sobreaviso / Se Necessário)**, **12h Diurno**, **12h Noturno**, **24h**, **48h** e **72h**.
  - Entende datas relativas (*"hoje"*, *"amanhã"*, *"próxima sexta"*, *"dia 25/10"*) e múltiplos plantões em uma única frase (*"plantão 12h segunda, quarta e sexta no Hospital X"* cria os três).
  - Reconhece hospitais da região e clínicas: *Clínica mhcuidar*, *Hospital Geral Clériston Andrade (HGCA)*, *Hospital Estadual da Criança (HEC)*, *Hospital da Mulher*, *Hospital Geral*, *Hospital Unimed*, *UPA 24h*, *SAMU*.

- **⏰ Contagem Regressiva em Tempo Real**:
  - Banner dinâmico no topo informando exatamente quantas horas, minutos e segundos faltam para o início do seu próximo plantão.

- **📊 Dashboard de Horas no Mês**:
  - Total de horas acumuladas no mês com quebra detalhada: 24h, 12h, 48h/72h e Sobreaviso (SN).
  - **Alerta de Fadiga Médica**: Se a jornada ultrapassar 60h no mês ou envolver turnos contínuos de 48h/72h, emite recomendações de saúde e repouso.

- **📅 Sincronização Dupla com Google Agenda (`mh.cuidarsaude@gmail.com`)**:
  - **Opção A (Instantânea de 1 Clique)**: Botão direto em cada plantão que abre o evento pré-formatado na sua conta Google sem precisar de nenhuma configuração técnica!
  - **Opção B (Arquivo .ICS)**: Baixa o calendário com alarmes de **24h e 2h antes** para o seu iPhone ou Android.
  - **Opção C (OAuth2 Oficial)**: Sincronização automática em segundo plano via Google Calendar API.

- **📲 Alertas e Robô de WhatsApp (`+55 75 99181-5612`)**:
  - **Agente Próprio (Baileys)**: Conecta o seu próprio número de WhatsApp como "Aparelho Conectado" — sem intermediários pagos.
  - **Você agenda pelo WhatsApp**: Mande uma mensagem para você mesma (ex: *"Plantão 24h amanhã às 7h no Clériston"*) → o bot entende, mostra o resumo e quando você responde **SIM**, ele agenda tudo sozinho!
  - **Lembretes Automáticos**: Avisos enviados com antecedência de **24 horas** e **2 horas** antes do plantão, além de resumo diário matinal às 07:00.
  - **Botão Direto no Painel**: Toque em "📲 WhatsApp" em qualquer card para abrir a mensagem de lembrete pronta no WhatsApp Web ou App.

- **🔒 100% Privado e Seguro**:
  - Banco de dados local em SQLite (`data/plantoes.db`). Seus dados médicos ficam sob seu controle, sem mensalidades.

---

## 🚀 Como Iniciar no seu Computador (Uso Local)

### Pré-requisitos
- Node.js (versão 20 ou 22+) instalado.

### 1. Iniciar com 1 Clique (Windows)
Basta dar **dois cliques no arquivo `iniciar.bat`** na pasta do projeto!  
Ele instalará as dependências e abrirá o sistema automaticamente no seu navegador em:
👉 **`http://localhost:3003`**

*(Ou pelo terminal:)*
```bash
npm install
npm start
```

---

## 📱 Como Conectar seu WhatsApp (Pareamento)

Para que os lembretes automáticos funcionem pelo agente próprio:

1. Abra o sistema em `http://localhost:3003`.
2. No card **🤖 Agente WhatsApp Próprio (mhcuidar)**:
   - **Opção 1 (Código de Pareamento - Sem Câmera)**: Digite seu número (`5575991815612`) e clique em **Gerar Código**. No seu celular, vá em *WhatsApp → Aparelhos conectados → Conectar com número de telefone* e digite o código de 8 dígitos.
   - **Opção 2 (QR Code)**: Escaneie o QR Code exibido na tela com a câmera do WhatsApp.
3. Pronto! O status mudará para `🟢 Conectado`.

---

## 🔗 Como Conectar a Google Agenda (mh.cuidarsaude@gmail.com)

- **Modo Rápido**: Você não precisa configurar nada no Google Cloud. Basta clicar no botão **"📅 Agenda"** ao lado de qualquer plantão na lista para adicioná-lo diretamente à sua conta `mh.cuidarsaude@gmail.com`.
- **Modo Automático (OAuth2)**:
  1. No [Google Cloud Console](https://console.cloud.google.com), ative a **Google Calendar API**.
  2. Crie uma credencial OAuth2 (Tipo: *Aplicativo da Web*) e adicione a URL:  
     `http://localhost:3003/api/google/callback`
  3. Preencha `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no arquivo `.env`.
  4. Clique em **"Conectar Google Agenda"** no rodapé do sistema.

---

## 🌐 Publicar Online 24/7 (Railway / Servidor Nuvem)

Para que o robô de WhatsApp e os lembretes funcionem mesmo com seu computador desligado:

1. Suba este repositório para o seu GitHub.
2. Acesse [railway.app](https://railway.app) e clique em **New Project → Deploy from GitHub**.
3. Selecione o repositório `mhcuidar-plantoes`.
4. Em **Variables**, adicione as variáveis do `.env` (`WHATSAPP_NUMBER=5575991815612`, etc.).
5. O Railway manterá o servidor ligado 24/7 de graça ou por centavos, enviando seus lembretes rigorosamente no horário!

---

## 🗂️ Estrutura do Projeto

```
mhcuidar-plantoes/
├── public/
│   ├── index.html       # Interface médica moderna responsiva (PWA-ready)
│   ├── app.js           # Lógica frontend (voz, timer, estatísticas, WhatsApp, .ICS)
│   └── style.css        # Identidade visual clínica verde esmeralda mhcuidar
├── src/
│   ├── server.js        # Servidor Express + API REST
│   ├── agente.js        # Agente próprio WhatsApp via Baileys (protocolo Web)
│   ├── bot.js           # Bot de conversa interativo no WhatsApp
│   ├── parser.js        # Motor NLP que interpreta voz e texto em português
│   ├── db.js            # Banco de dados local SQLite (node:sqlite nativo)
│   ├── scheduler.js     # Agendador cron de lembretes (24h e 2h antes)
│   ├── googleCalendar.js# Sincronizador OAuth2 da Google Agenda
│   ├── whatsapp.js      # Disparador WhatsApp multi-provedores
│   └── config.js        # Gerenciador de configurações locais
├── data/                # Banco de dados e sessões (protegido pelo .gitignore)
├── iniciar.bat          # Inicializador rápido para Windows
└── .env.example         # Modelo de variáveis de ambiente
```

---

Desenvolvido especialmente para o dia a dia e para a equipe da **mhcuidar** 🩺💚
