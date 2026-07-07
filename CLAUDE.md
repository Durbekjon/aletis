# CLAUDE.md — Aletis project guide for Claude Code

> ✅ **Safe to commit — no secrets in this file.** The repo is **public**
> (`github.com/Durbekjon/aletis`); keep it that way — never paste credentials here.
> **VPS host, root password & the SSH helper live in `.claude/vps.md`** (git-ignored, local only).

This file orients a fresh Claude Code session: what Aletis is, how to work on it
locally, how the git/CI flow works, and how to reach & operate the production VPS.

---

## 1. What Aletis is

AI-powered **Telegram sales-bot SaaS** for Uzbek / CIS businesses. A merchant connects
their Telegram bot; the AI answers customers, does semantic + image product search,
takes orders, and the merchant manages everything from a web dashboard. Extra retention
loops: **replenishment** (predict consumable run-out → proactive reorder reminders),
**win-back** (re-engage dormant customers), and **support** (AI escalates human-handoff
tickets). UI is in **Uzbek** (also ru/en via i18n).

---

## 2. Repo layout (monorepo)

```
aletis/
├── backend/     NestJS 11 API  (Prisma/Postgres, Redis/BullMQ, Telegram, Gemini, Weaviate, ImageKit)
├── frontend/    Next.js 14 dashboard (App Router, Tailwind v4, Radix, TanStack Query, i18n)
├── infra/       docker-compose helpers, nginx conf, deploy scripts, env templates
├── docs/        DEPLOYMENT / INFRASTRUCTURE / GIT_WORKFLOW
└── .github/     CI/CD workflows
```

### Tech / conventions
- **Backend**: package manager **yarn**. Global prefix `api` + URI versioning, default `v1`
  → all routes are `/api/v1/...`. `nest build` emits to **`dist/src/main.js`** (no `rootDir`),
  so prod entrypoint is `node dist/src/main` (NOT `dist/main`).
- **Frontend**: package manager **pnpm** (lockfile v9 → pin `pnpm@9.15.4`). Axios base =
  `NEXT_PUBLIC_API_BASE_URL` (set to `https://api.aletis.me/api`); the client appends `/v1/...`.
- **Products** use a **dynamic schema** (`product_schemas` + `schema_fields` + `field_values`),
  not fixed columns.
- **File storage = ImageKit** (not local disk). Env: `IMAGEKIT_*`.
- **Vector search = Weaviate** with the **multi2vec-clip** module (needs the `multi2vec-clip`
  inference container running; weaviate must be healthy before backend starts).

---

## 3. Local development

```bash
# Backend
cd backend
cp .env.example .env         # fill secrets
yarn install
yarn prisma:generate
yarn build                   # nest build  → dist/src/main.js
yarn dev                     # watch mode, http://localhost:4000  (docs: /docs)

# Frontend
cd frontend
corepack enable && corepack prepare pnpm@9.15.4 --activate
pnpm install
pnpm build                   # next build (output: standalone)
pnpm dev                     # http://localhost:3000
```

Prisma: **always create a migration for schema changes** — never rely on `db push` for prod
(see gotchas). `yarn prisma:migrate` (dev) / `prisma migrate deploy` (prod, auto on boot).

---

## 4. Git workflow & branch strategy

```
feature/*  →  development  →  main   (main = production, auto-deploys)
```
- **Never leave `development` behind `main`.** After merging to main, fast-forward development.
- Commit style: Conventional Commits (`feat(scope): …`, `fix(...)`, `chore(...)`).
- Author identity to use: `Durbek Saydaliyev <saydaliyevdurbek0512@gmail.com>`.
- Remote: `origin = https://github.com/Durbekjon/aletis.git` (**public**). Repo owner is
  the **`Durbekjon`** account; the authenticated `gh`/push account is **`durbek-saydaliyev`**
  which has **push but NOT admin** → cannot set repo secrets / branch protection via API
  (must be done from the owner account or GitHub UI).
- Only `main`, `development` should live long-term; delete merged feature branches.

---

## 5. CI/CD (GitHub Actions)

| Workflow | Trigger | Effect |
|---|---|---|
| `ci.yml` | PR/push (feature/dev/main) | lint + build (path-filtered), `ci-success` gate |
| `deploy-prod.yml` | push to **main** | SSH to VPS → `git reset --hard origin/main` → `deploy.sh prod` |
| `deploy-dev.yml` | push to **development** | same into `/opt/aletis-dev` (⚠️ dev stack not set up yet → this run fails) |

**Pushing to `main` auto-deploys prod.** The build runs `prisma migrate deploy` on container
start, so any new migration applies automatically. A push with only metadata changes (no tree
change) is a cached no-op deploy.

GitHub secrets (set on the repo): `SSH_HOST`, `SSH_USER`, `SSH_KEY` (deploy private key),
optional `SSH_PORT`, `DEPLOY_PATH`, `DEPLOY_PATH_DEV`.

---

## 6. Production infrastructure

- **VPS**: Ubuntu 24.04, 6 vCPU / 11 GB RAM. Docker + nginx + certbot + ufw.
- **App root on server**: `/opt/aletis` (a git clone on `main`).
- **Compose project**: `aletis-prod` (`docker-compose.prod.yml`). Containers:
  `aletis-prod-{postgres,redis,weaviate,multi2vec-clip,backend,frontend}-1`.
- **Ports** (bound to 127.0.0.1): frontend `3000`, backend `4000`. nginx proxies domains.
- **Env file**: `/opt/aletis/.env.prod` (chmod 600). A symlink `/opt/aletis/.env → .env.prod`
  exists so plain `docker compose` interpolates `${POSTGRES_*}` correctly. **Always deploy via
  `./infra/scripts/deploy.sh prod`** (it passes `--env-file`).
- **Domains / SSL** (Let's Encrypt, auto-renew):
  - `https://aletis.me` + `www` → frontend (prod)
  - `https://api.aletis.me` → backend (prod, routes under `/api/v1`)
  - `https://dev.aletis.me`, `https://dev-api.aletis.me` → dev (certs issued; **stack not deployed**)
- **DB**: postgres user `aletis`, db `aletis_db`. Redis internal. Weaviate + CLIP internal.

---

## 7. Connecting to the VPS

**Host, user, root password and a ready-to-use non-interactive `expect` wrapper are in
`.claude/vps.md`** (git-ignored — never commit credentials to this public repo).

Summary: Ubuntu VPS reachable via `ssh root@<VPS_IP>` (password auth). This environment has
`expect` (not `sshpass`) for non-interactive SSH. For large remote scripts: base64-encode
locally → decode on the server → run (`echo <b64> | base64 -d > /root/x.sh && bash /root/x.sh`).

> Security note: root+password auth is insecure. Recommended follow-up: add an SSH key,
> disable `PasswordAuthentication` and root password login.

---

## 8. Deploying & operating prod

```bash
# Normal deploy = just push to main (CI does it). Manual on server:
cd /opt/aletis && git fetch origin -q && git reset --hard origin/main && ./infra/scripts/deploy.sh prod

# Status / logs
docker compose -p aletis-prod -f /opt/aletis/docker-compose.prod.yml ps
docker logs aletis-prod-backend-1 --tail 50

# Health checks (note: /health is NOT wired — use /docs or a real route)
curl -I https://aletis.me/            # frontend
curl -s -o /dev/null -w '%{http_code}' https://api.aletis.me/docs   # backend up
```

### Production database (raw SQL)
```bash
# interactive psql
docker exec -it aletis-prod-postgres-1 psql -U aletis -d aletis_db
# one-liner
docker exec -i aletis-prod-postgres-1 psql -U aletis -d aletis_db -c "SELECT count(*) FROM orders;"
# run a file
docker exec -i aletis-prod-postgres-1 psql -U aletis -d aletis_db -v ON_ERROR_STOP=1 < /root/some.sql
```
Demo/seed data for the test account (`email@example.com`, **org #4 "UPG.uz"**, bot #3) lives in
`/root/seed_org4.sql` + `/root/seed_recent.sql` (idempotent; markers: customers
`telegramId LIKE '990000%'`, orders `notes='[seed-demo]'`, activity_logs `meta->>'seed'='true'`).
After DB changes, flush dashboard cache (keep BullMQ keys):
```bash
docker exec aletis-prod-redis-1 sh -c 'redis-cli --scan --pattern "*" | grep -viE "bull|queue" | grep -iE "dashboard|analytic|summary|activity|org" | xargs -r redis-cli del'
```

---

## 9. Gotchas & lessons (read before deploying)

1. **Migration drift is the #1 prod breaker.** The schema was repeatedly edited with `db push`
   (no migration files) → prod `migrate deploy` didn't create the columns/tables → runtime
   `column ... does not exist`. **Rule:** for every `schema.prisma` change, generate a real
   migration. Offline check (no DB needed):
   ```bash
   cd backend
   git show HEAD:backend/prisma/schema.prisma > /tmp/head.prisma
   node_modules/.bin/prisma migrate diff --from-schema-datamodel /tmp/head.prisma \
     --to-schema-datamodel prisma/schema.prisma --script   # empty = no drift
   ```
   Put the SQL in `prisma/migrations/<UTCtimestamp>_name/migration.sql`.
2. **Backend entrypoint** = `node dist/src/main` (nest emits under `dist/src/`). Dockerfile CMD
   and `start:prod` must use it.
3. **Frontend build** needs `pnpm@9.15.4` pinned (corepack's latest pnpm breaks on Node 20;
   `pnpm-workspace.yaml` must declare `packages: ['.']`).
4. **Weaviate/CLIP startup race**: backend disables embeddings permanently if Weaviate isn't
   ready at boot. Compose is healthcheck-gated: `multi2vec-clip` (healthy) → `weaviate` (healthy)
   → `backend`. Don't remove those healthchecks.
5. **Env interpolation**: `docker compose` needs `--env-file .env.prod` (deploy.sh does this);
   the `.env → .env.prod` symlink covers ad-hoc commands. Plain `docker compose up` without it
   blanks `${POSTGRES_*}`.
6. **nginx** on Ubuntu 24.04 is 1.24 → use `listen 443 ssl http2;` (NOT the `http2 on;` directive).
7. `email@example.com` account owns **org #4** (UPG.uz). Its dashboard "today" cards read live
   from orders/messages, so seed **today-dated** rows to make them non-zero.

---

## 10. Current status / open items

- ✅ Prod live over HTTPS, CI/CD auto-deploy working, SSL auto-renew, demo data seeded.
- ✅ Google OAuth redirect URI (`https://api.aletis.me/api/v1/auth/google/redirect`) registered.
- ⏳ **Dev stack** (`dev.aletis.me`) not deployed — needs `/opt/aletis-dev` clone + `.env.dev`
  + a separate Telegram bot token. `deploy-dev.yml` will fail until then.
- ⏳ **Branch protection** on `main` not set (needs the `Durbekjon` owner account).
- ⏳ **SSH hardening** (key-only, disable root password) recommended.
