#!/bin/bash
# Vigia do mhcuidar • Plantões: se o servidor caiu, sobe de novo.
# Uma falha isolada do teste de saúde não derruba um servidor saudável:
# só reinicia depois de 3 tentativas. O processo antigo é encerrado pelo
# pid gravado pelo próprio servidor (ou pela porta, se não houver pid),
# e o motivo fica registrado no log para diagnóstico futuro.
DIR="$HOME/workspace/mhcuidar-plantoes"
PORT=$(grep -E "^PORT=" "$DIR/.env" 2>/dev/null | cut -d= -f2)
PORT=${PORT:-3003}
LOG="$DIR/data/watchdog.log"
PID_FILE="$DIR/data/server.pid"

saude_ok() { curl -sf --max-time 8 "http://localhost:$PORT/api/health" > /dev/null 2>&1; }

if saude_ok; then exit 0; fi
sleep 5
if saude_ok; then exit 0; fi
sleep 10
if saude_ok; then exit 0; fi

ANTIGO=""
if [ -f "$PID_FILE" ]; then ANTIGO=$(cat "$PID_FILE" 2>/dev/null | tr -dc '0-9'); fi
if [ -n "$ANTIGO" ] && kill -0 "$ANTIGO" 2>/dev/null; then
  echo "$(date '+%F %T') servidor fora do ar — reiniciando (processo $ANTIGO vivo, sem resposta)" >> "$LOG"
  kill "$ANTIGO" 2>/dev/null; sleep 2; kill -9 "$ANTIGO" 2>/dev/null
else
  OCUPA=$(ss -ltnp "sport = :$PORT" 2>/dev/null | sed -n 's/.*pid=\([0-9]*\).*/\1/p' | head -1)
  if [ -n "$OCUPA" ]; then
    echo "$(date '+%F %T') servidor fora do ar — reiniciando (processo $OCUPA ocupando a porta, sem resposta)" >> "$LOG"
    kill "$OCUPA" 2>/dev/null; sleep 2; kill -9 "$OCUPA" 2>/dev/null
  else
    echo "$(date '+%F %T') servidor fora do ar — reiniciando (nenhum processo vivo)" >> "$LOG"
  fi
fi
cd "$DIR" && nohup node src/server.js >> "$DIR/data/server.log" 2>&1 &
echo "$(date '+%F %T') servidor reiniciado" >> "$LOG"
