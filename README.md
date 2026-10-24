# 🩺 mhcuidar Plantões AI
> **Sistema Inteligente de Gestão de Escalas, Plantões e Notificações Médicas**  
> Desenvolvido especialmente para a Dra. e para a clínica **mhcuidar**.

---

## 📌 Visão Geral do Projeto

O **mhcuidar Plantões AI** é uma solução médica de alta inteligência e máxima simplicidade operacional. Ele foi construído para eliminar a burocracia das escalas tradicionais, permitindo que a médica simplesmente **fale por áudio ou digite um resumo rápido** do seu plantão. O sistema extrai automaticamente hospital/clínica, data, horário, modalidade e duração, sincroniza com o **Google Agenda** da conta `mh.cuidarsaude@gmail.com` e dispara alertas com antecedência no **WhatsApp** `+55 (75) 99181-5612`.

---

## 🔬 Benchmarking: Comparativo com Sistemas do Mercado

Ao pesquisar os principais aplicativos de escalas médicas no Brasil (*Escala Einstein*, *Minha Escala*, *HealthChess*, *Medbolso*, *Pega Plantão* e *Meus Plantões*), identificamos os pontos fortes e as principais deficiências para um médico(a) plantonista e gestor(a) de clínica:

| Recurso | Apps Tradicionais do Mercado | **mhcuidar Plantões AI** 🌟 |
| :--- | :--- | :--- |
| **Entrada por Voz (Speech-to-Schedule)** | ❌ Inexistente (exige preencher formulários com dezenas de campos) | ✅ **Totalmente suportada**: Aperte o microfone, fale naturalmente em português e a IA interpreta tudo. |
| **Interpretação de Texto Livre** | ❌ Não suportado | ✅ **Suportado**: Cole mensagens ou escalas recebidas no WhatsApp e o sistema separa os plantões sozinho. |
| **Suporte Nativo a Durações Médicas** | ⚠️ Rígido | ✅ **Nativo**: Suporta **SN** (Sobreaviso), **12h** (Diurno/Noturno), **24h**, **48h** e **72h**. |
| **Integração com Google Agenda** | ⚠️ Complexo ou apenas export manual | ✅ **Instantânea**: 1 clique abre o evento direto configurado para `mh.cuidarsaude@gmail.com`. |
| **Arquivo .ICS para iPhone / Android** | ⚠️ Raro | ✅ **Sim**: Baixa o calendário com alarmes automáticos (24h e 2h antes) para a agenda nativa do celular. |
| **Avisos via WhatsApp Pessoal** | ❌ Apenas notificações push do app | ✅ **Nativo**: Link direto e webhook configurados para `+55 (75) 99181-5612`. |
| **Alerta Médico de Fadiga / Estafa** | ❌ Não possui | ✅ **Inteligente**: Detecta plantões de 48h/72h ou jornadas acumuladas > 60h e emite alertas preventivos de descanso. |
| **Foco de Uso** | RH hospitalar e burocracia de trocas | **Pessoal e Clínico**: Sob medida para a rotina da Dra. entre múltiplos hospitais e a clínica mhcuidar. |

---

## 🚀 Principais Funcionalidades

### 1. Entrada por Voz & Texto Inteligente (IA NLP)
- **Reconhecimento de Fala Nativo**: Microfone com suporte a português brasileiro (`pt-BR`).
- **Compreensão de Linguagem Natural**:
  - *"Plantão de 24h no Hospital Clériston amanhã às 7h"*
  - *"Sobreaviso SN sábado na clínica mhcuidar"*
  - *"Plantão 12h noturno sexta no Hospital Estadual da Criança"*
  - *"Plantão de 48h no fim de semana no Hospital Geral"*
  - *"Plantão 72h no feriado no Clériston"*
- **Multi-plantões em uma só frase**: *"Amanhã 24h no Clériston e domingo 12h diurno na mhcuidar"* gera automaticamente 2 cards independentes!

### 2. Sincronização com Google Agenda (`mh.cuidarsaude@gmail.com`)
- Cada card possui o botão **"Google Agenda"**, que gera uma URL oficial do Google Calendar já com título estilizado (`🏥 [mhcuidar] Plantão 24h - Hospital...`), horários exatos de início e término em UTC, setor, modalidade e dados de contato.
- Botão **".ICS"** para baixar o evento com alarmes de **24 horas antes** e **2 horas antes** que tocam no despertador/calendário do iPhone e Android.

### 3. Alertas e Notificações no WhatsApp (`+55 75 99181-5612`)
- Mensagens padronizadas, humanizadas e elegantes:
  ```text
  🩺 *mhcuidar | Alerta de Plantão (24 Horas Antes)*
  Olá, Dra.! Lembrando da sua escala:

  🏥 *Local:* Hospital Geral Clériston Andrade (HGCA)
  ⏱️ *Tipo:* Plantão de 24h (24 horas)
  🗓️ *Início:* Domingo, 25/10 às 07:00
  🏁 *Término Previsto:* 26/10 às 07:00

  ✅ Sincronizado com: mh.cuidarsaude@gmail.com
  💙 *mhcuidar* - Cuidando de quem cuida.
  ```
- Botão rápido de WhatsApp que já abre a conversa no celular ou WhatsApp Web com a mensagem pronta.
- Servidor em segundo plano (`server/server.js`) pronto para automação via Webhooks (Evolution API, Z-API, Baileys ou Twilio).

### 4. Gestão Clínica & Dashboard de Horas
- **Contagem Regressiva do Próximo Plantão**: Mostra exatamente quantas horas e minutos faltam para o início do próximo turno.
- **Resumo de Horas do Mês**: Contabiliza total de horas e divide entre 12h, 24h, 48h, 72h e Sobreaviso (SN).
- **Visão Semanal em Grade**: Permite verificar de relance os dias livres e os dias com escala médica.

---

## 🛠️ Como Executar o Sistema Localmente

### Pré-requisitos
- Node.js (versão 18+) instalado.

### 1. Clonar ou Acessar a Pasta do Projeto
```bash
cd "C:\Users\FBBR\.gemini\antigravity\scratch\mhcuidar-plantoes"
```

### 2. Instalar as Dependências (se ainda não instalou)
```bash
npm install
```

### 3. Iniciar o Aplicativo Web
```bash
npm run dev
```
O Vite iniciará o servidor local em: `http://localhost:5173`.  
Abra esse endereço no seu navegador (Chrome, Edge ou Safari) para usar!

### 4. (Opcional) Iniciar o Servidor de Automação de WhatsApp em Segundo Plano
Para rodar a rotina cron que monitora os plantões e dispara os alertas automaticamente:
```bash
npm run server
```
O servidor rodará na porta `3001`.

---

## 🌐 Publicação no GitHub e Deploy na Web (.io / Vercel)

### Passo 1: Inicializar o Repositório Git Local
```bash
git init
git add .
git commit -m "feat: lancamento inicial do mhcuidar plantoes ai"
```

### Passo 2: Criar o Repositório no GitHub
1. Acesse [github.com/new](https://github.com/new).
2. Crie um repositório chamado `mhcuidar-plantoes`.
3. Conecte e envie o código:
```bash
git remote add origin https://github.com/SEU_USUARIO/mhcuidar-plantoes.git
git branch -M main
git push -u origin main
```

### Passo 3: Publicar Online Gratuitamente
- **Opção A (Vercel - Recomendado para .io / .app)**:
  1. Acesse [vercel.com](https://vercel.com) e conecte sua conta GitHub.
  2. Clique em **Add New Project** e selecione o repositório `mhcuidar-plantoes`.
  3. O Vercel detectará automaticamente o Vite e publicará em segundos em uma URL pública (ex: `https://mhcuidar-plantoes.vercel.app`).
  4. Você pode adicionar um domínio personalizado próprio da clínica (ex: `plantoes.mhcuidar.com.br` ou `mhcuidar.io`).

- **Opção B (GitHub Pages)**:
  1. Instale o pacote `gh-pages`: `npm i -D gh-pages`
  2. No `vite.config.js`, configure `base: '/mhcuidar-plantoes/'`.
  3. Execute `npm run build` e publique na branch `gh-pages`.

---

## 📋 Configurações Rápidas do Sistema

| Parâmetro | Valor Configurado | Onde Alterar |
| :--- | :--- | :--- |
| **E-mail Google Agenda** | `mh.cuidarsaude@gmail.com` | Ícone ⚙️ (Configurações) no topo |
| **WhatsApp para Alertas** | `+5575991815612` | Ícone ⚙️ (Configurações) no topo |
| **Antecedência 1** | 24 horas antes do plantão | Ícone ⚙️ (Configurações) no topo |
| **Antecedência 2** | 2 horas antes do plantão | Ícone ⚙️ (Configurações) no topo |
| **Hospitais Padrão** | Clériston Andrade, HEC, Hospital da Mulher, UPA, Clínica mhcuidar | No botão "+ Novo Plantão" ou na fala da IA |

---

## 👩‍⚕️ Dicas de Uso para o Dia a Dia da Dra.

1. **Quando receber uma escala no WhatsApp**:
   - Copie o texto da mensagem e cole diretamente no campo de texto da tela inicial.
   - Clique em **"Interpretar com IA"**. A IA extrairá os dias e horários automaticamente.
2. **Quando estiver no carro ou saindo do plantão**:
   - Abra o app no celular, toque no microfone e fale: *"Plantão de 24 horas sábado às 7h no Clériston"*.
   - Toque em **Confirmar**.
3. **Para garantir o alarme no celular**:
   - Clique no botão **Google Agenda** ou **.ICS** para ter o alarme registrado diretamente na sua agenda padrão.
4. **Para enviar o lembrete para si mesma no WhatsApp**:
   - Basta tocar no botão verde **WhatsApp** em qualquer plantão. A mensagem formatada abrirá pronta para envio com um único toque!

---

Desenvolvido com carinho para a equipe médica da **mhcuidar** 🩺💚.
