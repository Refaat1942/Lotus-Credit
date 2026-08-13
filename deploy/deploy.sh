#!/bin/bash
# Deploy Lotus Credit to Hostinger VPS
# Usage: ./deploy/deploy.sh [server_ip]
# Example: ./deploy/deploy.sh 187.124.15.14

set -e

SERVER_IP="${1:-187.124.15.14}"
REMOTE_USER="root"
APP_DIR="/opt/lotus-credit"

echo "=== Deploying Lotus Credit to $REMOTE_USER@$SERVER_IP ==="

# Install Docker if not present
ssh $REMOTE_USER@$SERVER_IP << 'EOF'
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
fi
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
  apt-get update && apt-get install -y docker-compose-plugin
fi
EOF

# Sync files
echo "Syncing application files..."
ssh $REMOTE_USER@$SERVER_IP "mkdir -p $APP_DIR"
rsync -avz --exclude node_modules --exclude .git --exclude frontend/dist \
  ./ $REMOTE_USER@$SERVER_IP:$APP_DIR/

# Build and start
ssh $REMOTE_USER@$SERVER_IP << EOF
cd $APP_DIR
export ADMIN_PASSWORD=\${ADMIN_PASSWORD:-lotus-admin-2026}
docker compose down 2>/dev/null || true
docker compose build --no-cache
docker compose up -d
docker compose ps
EOF

echo ""
echo "=== Deployment complete ==="
echo "Access at: http://$SERVER_IP:16346"
echo "Admin panel: http://$SERVER_IP:16346/admin"
echo "Default admin password: lotus-admin-2026 (change via ADMIN_PASSWORD env)"
