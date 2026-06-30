# Infrastructure

Single VPS hosting both environments as isolated Docker Compose stacks, fronted by nginx
with Let's Encrypt TLS.

```
                         Internet
                            │
                  ┌─────────┴──────────┐
                  │   nginx (host)     │   :80 → :443 redirect, TLS termination
                  └───┬───────┬────────┘
        aletis.me ────┘       └──── api.aletis.me
        dev.aletis.me ─┐      ┌─ dev-api.aletis.me
                       ▼      ▼
        ┌──────────────────────────────────────────────┐
        │  Docker (one host)                            │
        │  ┌───────── aletis-prod ─────────┐            │
        │  │ frontend:3000  backend:4000   │            │
        │  │ postgres  redis  weaviate     │ (volumes)  │
        │  └───────────────────────────────┘            │
        │  ┌───────── aletis-dev ──────────┐            │
        │  │ frontend:3001  backend:4001   │            │
        │  │ postgres  redis  weaviate     │ (volumes)  │
        │  └───────────────────────────────┘            │
        └──────────────────────────────────────────────┘
```

Backend & frontend host ports bind to `127.0.0.1` only; nginx is the sole public entrypoint.

## Server requirements

- Ubuntu 22.04 / 24.04, ≥ 2 vCPU / 4 GB RAM (Weaviate + 2 Postgres + 2 Redis + 4 app containers).
- Open ports: 22 (SSH), 80, 443.
- Docker Engine + compose plugin, nginx, certbot (installed by `provision.sh`).

## DNS

Create **A-records** pointing all four hostnames at the VPS public IP:

| Host | Type | Value |
|------|------|-------|
| `aletis.me` | A | `<VPS_IP>` |
| `www.aletis.me` | A | `<VPS_IP>` |
| `api.aletis.me` | A | `<VPS_IP>` |
| `dev.aletis.me` | A | `<VPS_IP>` |
| `dev-api.aletis.me` | A | `<VPS_IP>` |

Wait for propagation (`dig +short aletis.me`) before issuing certificates.

## Bring-up checklist (once SSH is available)

1. `ssh user@<VPS_IP>` and run as root:
   `curl -fsSL https://raw.githubusercontent.com/Durbekjon/aletis/main/infra/scripts/provision.sh | bash`
   (or clone first, then `sudo ./infra/scripts/provision.sh`).
2. `cd /opt/aletis`
   `cp infra/env/.env.prod.template .env.prod && cp infra/env/.env.dev.template .env.dev`
   → fill in secrets (DB passwords, JWT, ENCRYPTION_KEY, bot tokens, Gemini, Google OAuth).
3. Point DNS A-records at the host (above).
4. `./infra/scripts/deploy.sh prod && ./infra/scripts/deploy.sh dev`
5. Issue TLS — see [../infra/nginx/ssl-setup.md](../infra/nginx/ssl-setup.md).
6. Add GitHub Actions secrets (`SSH_HOST`, `SSH_USER`, `SSH_KEY`, …) — see [DEPLOYMENT.md](DEPLOYMENT.md).
7. Verify: `curl -I https://api.aletis.me/health` and load `https://aletis.me`.

## Services per environment

| Service | Image | Persisted volume (prod / dev) |
|---|---|---|
| postgres | postgres:16-alpine | `postgres_data` / `postgres_data_dev` |
| redis | redis:7-alpine | `redis_data` / `redis_data_dev` |
| weaviate | weaviate:1.27.0 | `weaviate_data` / `weaviate_data_dev` |
| backend | built from `backend/` | uploads: `uploads_data` / `uploads_data_dev` |
| frontend | built from `frontend/` | — |

## Secrets management

- App secrets: `.env.prod` / `.env.dev` on the server only (git-ignored). Templates in `infra/env/`.
- Deploy secrets: GitHub Actions secrets.
- Rotate `JWT_SECRET`, `ENCRYPTION_KEY`, DB passwords, and bot tokens per environment; never reuse prod tokens in dev.

## Backups (recommended)

```bash
# nightly Postgres dump (prod)
docker exec aletis-prod-postgres-1 pg_dump -U aletis aletis_prod | gzip > /backups/aletis_prod_$(date +%F).sql.gz
```
Add to cron; ship to object storage. Weaviate data persists in its volume; snapshot the
volume or use Weaviate's backup module if vectors must survive a host loss.
