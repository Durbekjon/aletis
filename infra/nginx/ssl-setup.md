# SSL / TLS setup (Let's Encrypt + certbot)

Issue free certificates for all four hostnames and enable auto-renew. Run **after** DNS
A-records point at the VPS and nginx is installed.

## 1. Install certbot

```bash
sudo apt update && sudo apt install -y certbot python3-certbot-nginx
sudo mkdir -p /var/www/certbot
```

## 2. First issuance

The provided `infra/nginx/aletis.conf` references certs that don't exist yet. For the first
run either let the nginx plugin handle it (recommended) or use the webroot challenge.

### Option A — nginx plugin (simplest)

Temporarily ensure plain HTTP `server { listen 80; server_name ...; }` blocks are active
(they are, in `aletis.conf`), then:

```bash
sudo certbot --nginx \
  -d aletis.me -d www.aletis.me \
  -d api.aletis.me \
  -d dev.aletis.me \
  -d dev-api.aletis.me \
  --email saydaliyevdurbek0512@gmail.com --agree-tos --no-eff-email --redirect
```

certbot edits the server blocks to add `ssl_certificate` lines and the HTTP→HTTPS redirect.

### Option B — webroot (keeps our nginx config as-is)

```bash
sudo certbot certonly --webroot -w /var/www/certbot \
  -d aletis.me -d www.aletis.me -d api.aletis.me -d dev.aletis.me -d dev-api.aletis.me \
  --email saydaliyevdurbek0512@gmail.com --agree-tos --no-eff-email
sudo nginx -t && sudo systemctl reload nginx
```

## 3. Auto-renewal

certbot installs a systemd timer. Verify:

```bash
sudo certbot renew --dry-run
systemctl list-timers | grep certbot
```

A renew hook reloads nginx automatically:

```bash
echo -e '#!/bin/sh\nsystemctl reload nginx' | sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

## 4. Verify

```bash
curl -I https://aletis.me
curl -I https://api.aletis.me/health
curl -I https://dev.aletis.me
curl -I https://dev-api.aletis.me/health
```
