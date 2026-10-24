#!/bin/bash
# Vigia do mhcuidar • Plantões: se o servidor caiu, sobe de novo.
DIR="$HOME/workspace/mhcuidar-plantoes"
PORT=$(grep -E "^PORT=" "$DIR/.env" 2>/dev/null | cut -d= -f2)
PORT=${PORT:-3003}
if curl -sf --max-time 8 "http://localhost:$PORT/api/health" > /dev/null 2>&1; then
  exit 0
fi
echo "$(date '+%F %T') servidor fora do ar — reiniciando" >> "$DIR/data/watchdog.log"
pkill -f "[m]hcuidar-plantoes/src/server.js" 2>/dev/null
sleep 2
cd "$DIR" && nohup node src/server.js >> "$DIR/data/server.log" 2>&1 &
echo "$(date '+%F %T') servidor reiniciado" >> "$DIR/data/watchdog.log"
