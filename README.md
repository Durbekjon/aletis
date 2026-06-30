# Aletis

AI-powered Telegram sales-bot SaaS for Uzbek / CIS businesses. Aletis lets a business
connect a Telegram bot that answers customers, recommends products (AI + vector search),
takes orders, and gives the owner a dashboard for products, conversations, orders,
analytics and billing.

This is the **monorepo** for the platform.

```
aletis/
├── backend/        NestJS 11 API (Prisma/Postgres, Redis/BullMQ, Telegram, Gemini, Weaviate)
├── frontend/       Next.js 14 dashboard (App Router, Tailwind, React Query, i18n)
├── infra/          Docker Compose, nginx, deploy scripts, env templates
├── docs/           Deployment, infrastructure, git workflow, dependency graph
└── .github/        CI/CD workflows
```

## Tech stack

| | |
|---|---|
| **Backend** | NestJS 11, Prisma 6 + PostgreSQL 16, Redis 7 + BullMQ, Passport (JWT + Google OAuth), Telegram Bot API, Google Gemini, Weaviate vector DB |
| **Frontend** | Next.js 14 (App Router), React 18, Tailwind v4, Radix UI, TanStack Query, i18next (en/ru/uz) |
| **Infra** | Docker, docker-compose, nginx reverse proxy, Let's Encrypt, GitHub Actions |

## Quick start (local)

```bash
# Backend
cd backend
cp .env.example .env            # fill in secrets
yarn install
yarn prisma:generate
yarn prisma:migrate
yarn dev                        # http://localhost:4000  (API at /api, docs at /api/docs)

# Frontend
cd frontend
cp .env.example .env            # NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api
pnpm install
pnpm dev                        # http://localhost:3000
```

Or bring the whole stack up with Docker:

```bash
docker compose -f docker-compose.dev.yml up -d --build
```

## Environments

| | Frontend | Backend API |
|---|---|---|
| **Production** | https://aletis.me | https://api.aletis.me |
| **Development** | https://dev.aletis.me | https://dev-api.aletis.me |

## Contributing & workflow

All work flows `feature/* → development → main`. **Never push directly to `main`.**
See [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/GIT_WORKFLOW.md](docs/GIT_WORKFLOW.md).

## Documentation

- [docs/GIT_WORKFLOW.md](docs/GIT_WORKFLOW.md) — branching, commits, PRs
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — CI/CD and release process
- [docs/INFRASTRUCTURE.md](docs/INFRASTRUCTURE.md) — server, DNS, nginx, SSL
