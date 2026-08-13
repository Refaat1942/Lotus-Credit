#!/bin/bash
# Quick deploy on Hostinger VPS port 16346
set -e

APP_DIR="/opt/lotus-credit"
PORT=16346

echo "=== Lotus Credit deploy on port $PORT ==="

if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker && systemctl start docker
fi

mkdir -p "$APP_DIR"
cd "$APP_DIR"

if [ ! -d ".git" ]; then
  git clone https://github.com/Refaat1942/Lotus-Credit.git .
else
  git pull origin master
fi

export ADMIN_PASSWORD="${ADMIN_PASSWORD:-lotus-admin-2026}"
docker compose down 2>/dev/null || true
docker compose build
docker compose up -d

echo ""
echo "=== Running ==="
docker compose ps
echo ""
echo "App:   http://$(hostname -I | awk '{print $1}'):$PORT"
echo "Admin: http://$(hostname -I | awk '{print $1}'):$PORT/admin"
