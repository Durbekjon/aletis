# Deployment

Aletis runs as Docker Compose stacks on a single VPS, behind nginx + Let's Encrypt.
Production and development are **separate Compose projects** (`aletis-prod`, `aletis-dev`)
with isolated databases, Redis, Weaviate, volumes, and host ports.

| | Frontend | Backend API | FE port | API port |
|---|---|---|---|---|
| Production (`main`) | aletis.me | api.aletis.me | 3000 | 4000 |
| Development (`development`) | dev.aletis.me | dev-api.aletis.me | 3001 | 4001 |

## CI/CD overview (GitHub Actions)

| Workflow | Trigger | Action |
|---|---|---|
| `ci.yml` | PR / push to `feature/**`, `development`, `main` | Lint + build (+ test) the changed app via path filters |
| `deploy-dev.yml` | push to `development` | SSH to VPS → `git reset --hard origin/development` → `deploy.sh dev` |
| `deploy-prod.yml` | push to `main` | Same with `deploy.sh prod` (gated by the `production` environment) |

### Required GitHub secrets

Repo → Settings → Secrets and variables → Actions:

| Secret | Notes |
|---|---|
| `SSH_HOST` | VPS IP / hostname |
| `SSH_USER` | deploy user |
| `SSH_KEY` | private key whose public half is in the VPS `authorized_keys` |
| `SSH_PORT` | optional (default 22) |
| `DEPLOY_PATH` | optional (default `/opt/aletis`) |

App secrets live in `.env.prod` / `.env.dev` **on the server** (not in GitHub), created from
`infra/env/.env.*.template`. Use GitHub **Environments** (`development`, `production`) to add a
required-reviewer gate on production deploys.

## Manual deploy (on the server)

```bash
cd /opt/aletis
git fetch && git checkout main && git reset --hard origin/main
./infra/scripts/deploy.sh prod        # or: deploy.sh dev
```

`deploy.sh` runs `docker compose ... up -d --build`; the backend container runs
`prisma migrate deploy` automatically on boot (see `backend/Dockerfile`).

## Rollback

```bash
./infra/scripts/rollback.sh prod            # back one commit
./infra/scripts/rollback.sh prod <sha>      # to a specific commit
```

## Release process

1. Merge features into `development` → auto-deploys to dev → QA on `dev.aletis.me`.
2. Open `development → main` PR. CI must be green; production environment approval required.
3. Merge → `deploy-prod.yml` deploys to production.

## First-time bring-up

See [INFRASTRUCTURE.md](INFRASTRUCTURE.md) (provision) and
[../infra/nginx/ssl-setup.md](../infra/nginx/ssl-setup.md) (TLS). Order: provision → DNS →
`.env.prod`/`.env.dev` → `deploy.sh prod` & `deploy.sh dev` → certbot → add GitHub secrets.
