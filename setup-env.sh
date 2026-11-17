#!/usr/bin/env bash
# Creates the env/ folder from env.example/ for running AUDITO locally (macOS/Linux/Git Bash).
set -euo pipefail
[ -d env ] && { echo "env/ already exists - not touching it. Delete it first to regenerate."; exit 0; }
read -r -p "Paste YOUR Anthropic API key (starts with sk-ant-): " KEY
[[ "$KEY" == sk-ant-* ]] || { echo "That does not look like an Anthropic key."; exit 1; }
JWT=$(head -c 48 /dev/urandom | base64 | tr -d '\n')
mkdir env
for f in env.example/*.env.example; do
  out="env/$(basename "${f%.example}")"
  sed -e "s|PASTE_YOUR_ANTHROPIC_KEY_HERE|${KEY}|" -e "s|JWT_SECRET_KEY=CHANGE_ME|JWT_SECRET_KEY=${JWT}|" "$f" > "$out"
done
echo "Done. env/ created. Next:  docker compose up --build -d   then open http://localhost:8000"
