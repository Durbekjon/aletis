# Git Workflow

## Branches

```
feature/*  ──PR──▶  development  ──PR──▶  main
 fix/*               (integration/QA)      (production)
 chore/*
```

| Branch | Purpose | Deploys to | Direct push |
|--------|---------|-----------|-------------|
| `main` | Production releases | `aletis.me` / `api.aletis.me` | ❌ never (PR from `development` only) |
| `development` | Integration / QA | `dev.aletis.me` / `dev-api.aletis.me` | ❌ (PR only) |
| `feature/*`, `fix/*`, `chore/*` | Active work | — | ✅ (your own branch) |

## The rule

**No code is ever pushed directly to `main`.** Promotion path is always
`feature → development → main`. A change reaches production only after it has been validated
on `development`.

## Workflow

```bash
# 1. Start from development
git checkout development && git pull

# 2. Cut a branch
git checkout -b feature/orders-export

# 3. Commit using Conventional Commits
git commit -m "feat(orders): add CSV export endpoint"

# 4. Push & open PR into development
git push -u origin feature/orders-export
gh pr create --base development --fill

# 5. After review + green CI → squash-merge into development (auto-deploys to dev)

# 6. Release: open development → main PR
gh pr create --base main --head development --title "release: <date>"
# After approval + green CI → merge → auto-deploys to production
```

## Conventional Commits

```
<type>(<scope>): <subject>
```

`feat | fix | chore | refactor | docs | test | ci | perf | build`
Scope = module (`auth`, `orders`, `bots`, `infra`, …).

## Branch protection (enforced on the remote)

- **`main`**: require PR, require status checks (CI), ≥1 review, no force-push, linear history.
- **`development`**: require PR, require status checks (CI).

Configure once with:

```bash
# main
gh api -X PUT repos/Durbekjon/aletis/branches/main/protection \
  -H "Accept: application/vnd.github+json" \
  -f "required_status_checks[strict]=true" \
  -f "required_status_checks[contexts][]=ci-success" \
  -F "enforce_admins=true" \
  -F "required_pull_request_reviews[required_approving_review_count]=1" \
  -F "restrictions=null" \
  -F "allow_force_pushes=false" \
  -F "required_linear_history=true"

# development (lighter — CI required, PR required)
gh api -X PUT repos/Durbekjon/aletis/branches/development/protection \
  -H "Accept: application/vnd.github+json" \
  -f "required_status_checks[strict]=true" \
  -f "required_status_checks[contexts][]=ci-success" \
  -F "enforce_admins=false" \
  -F "required_pull_request_reviews[required_approving_review_count]=0" \
  -F "restrictions=null"
```
