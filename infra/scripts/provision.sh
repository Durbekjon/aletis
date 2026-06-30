#!/usr/bin/env bash
# One-time VPS provisioning. Run as root (or with sudo) on a fresh Ubuntu 22.04/24.04 host.
# Installs Docker, nginx, certbot, a firewall, and clones the repo to /opt/aletis.
# Run AFTER SSH access is available. Idempotent where practical.
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/opt/aletis}"
REPO_URL="${REPO_URL:-https://github.com/Durbekjon/aletis.git}"

echo "==> apt update + base packages"
apt-get update -y
apt-get install -y ca-certificates curl git ufw nginx

echo "==> Install Docker Engine + compose plugin"
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
systemctl enable --now docker

echo "==> Firewall (allow SSH + HTTP + HTTPS)"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> Clone repo to $DEPLOY_PATH"
if [ ! -d "$DEPLOY_PATH/.git" ]; then
  git clone "$REPO_URL" "$DEPLOY_PATH"
fi
cd "$DEPLOY_PATH"

echo "==> nginx config"
cp infra/nginx/aletis.conf /etc/nginx/conf.d/aletis.conf
mkdir -p /var/www/certbot
nginx -t && systemctl reload nginx || echo "nginx -t failed (expected before certs exist) — see infra/nginx/ssl-setup.md"

echo ""
echo "==> NEXT STEPS (manual):"
echo "  1. Create env files:   cp infra/env/.env.prod.template .env.prod  (and .env.dev)  → fill secrets"
echo "  2. Point DNS A-records at this host (see docs/INFRASTRUCTURE.md)"
echo "  3. Issue SSL:           see infra/nginx/ssl-setup.md"
echo "  4. First deploy:        ./infra/scripts/deploy.sh prod  &&  ./infra/scripts/deploy.sh dev"
echo "  5. Add an SSH deploy key to GitHub secrets so Actions can deploy."
