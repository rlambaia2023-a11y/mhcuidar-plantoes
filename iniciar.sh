#!/bin/bash
cd "$(dirname "$0")"
[ -d node_modules ] || npm install
[ -f .env ] || cp .env.example .env
echo "mhcuidar • Plantões: http://localhost:3003"
npm start
