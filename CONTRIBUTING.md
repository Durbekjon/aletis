# Contributing to Aletis

## Branching model

```
feature/*  ──PR──▶  development  ──PR──▶  main
 fix/*               (integration/QA)      (production)
 chore/*
```

- **`main`** — production. Protected. **Never push directly.** Only updated by PRs from `development`.
- **`development`** — integration branch. Default base for all feature PRs. Auto-deploys to the dev environment.
- **`feature/*`, `fix/*`, `chore/*`** — short-lived branches cut from `development`.

### Day-to-day flow

```bash
git checkout development
git pull
git checkout -b feature/short-description

# ...work, commit...

git push -u origin feature/short-description
# open a PR → base: development
```

After review + green CI, squash/merge into `development`. When `development` is validated, a
maintainer opens a release PR `development → main`.

## Commit messages — Conventional Commits

```
<type>(<scope>): <subject>
```

Types: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `ci`, `perf`, `build`.
Scopes are module names, e.g. `feat(orders):`, `fix(auth):`, `ci:`, `chore(infra):`.

## Before opening a PR

| App | Commands |
|---|---|
| Backend | `cd backend && yarn install && yarn prisma:generate && yarn build` |
| Frontend | `cd frontend && pnpm install && pnpm build` |

CI runs the same checks; PRs cannot merge until they pass.

## Branch protection (configured on the repo)

- `main`: PRs only, require CI to pass, ≥1 approving review, no force-push, linear history.
- `development`: PRs only, require CI to pass.

## Code style

- TypeScript everywhere; Prettier formatting (`.prettierrc`).
- 2-space indent, LF line endings, final newline (see `.editorconfig`).
- Never commit secrets. Use `.env` (git-ignored); update `.env.example` when adding variables.
