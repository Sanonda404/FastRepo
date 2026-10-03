# Contributing to fastRepo

Thanks for your interest in improving fastRepo! This document covers how to propose changes, report issues, and get a pull request merged.

## Before you start

- For small fixes (typos, docs, small bugs), feel free to open a PR directly.
- For anything larger — new features, permission-model changes, breaking changes — **open an issue first** to discuss the approach before writing code. This saves everyone time if the direction needs to change.

## Development setup

```bash
# 1. Fork the repo, then clone your fork
git clone https://github.com/Sanonda404/FastRepo
cd fastrepo

# 2. Add the upstream remote
git remote add upstream https://github.com/Sanonda404/FastRepo
# Install dependencies
cd frontend
npm install
npm build
cd ..
cd backend
poetry install

# Configure environment
cp .env.example .env


# Start the development server
poetry run uvicorn app:app --reload 
```

Add these variables to your `.env` file:

```dotenv
JWT_SECRET_KEY="YOUR_JWT_SECRET_KEY"
JWT_ALGORITHM="HASHING_ALGO"
ACCESS_TOKEN_EXPIRE_MINUTES=30
DATABASE_URL="YOUR_POSTGRES_DATABASE_URL"
RESET_PASSWORD_TOKEN_EXPIRE_MINUTES=5
FRONTEND_URL="http://localhost:5173"
GMAIL_APP_PASSWORD="YOUR_GMAIL_APP_PASSWORD"
GMAIL_USER="YOUR_EMAIL"
```

Then open `http://localhost:8000` and create your first repository.


## Branching model

FastRepo's own repo follows the same branch conventions the product encourages:

| Branch | Purpose |
|---|---|
| `main` | Always deployable. No direct pushes. |
| `develop` | Integration branch for the next release. Branch your feature work from here. |
| `feature/<short-name>` | New features or enhancements |
| `fix/<short-name>` | Bug fixes |
| `release/<version>` | Release stabilization |
| `hotfix/<short-name>` | Urgent fixes to production |

## Making a change

1. Branch from `develop`:
   ```bash
   git checkout develop
   git pull upstream develop
   git checkout -b feature/your-change
   ```
2. Make focused commits with clear messages (imperative mood: "Add folder permission validation", not "Added stuff").
3. Add or update tests for any behavior change.
4. Update documentation (README, docs/, inline comments) if the change affects usage.
5. Make sure the test suite and linter pass locally before opening a PR.

## Commit message format

```
<type>: <short summary>

<optional longer description>
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`.

Example:
```
feat: support wildcard branch patterns in branch rules

Allows branch permission rules like "release/*" and "hotfix/*" to match
any branch under that prefix instead of requiring exact names.
```

## Pull requests

- Open PRs against `develop` (not `main`), unless it's a hotfix.
- Fill out the PR template: what changed, why, and how it was tested.
- Link the related issue if one exists.
- Keep PRs focused — one logical change per PR is easier to review and revert if needed.
- A maintainer will review, request changes if needed, and merge once approved.

## Reporting bugs

Open an issue with:
- What you expected to happen vs. what actually happened
- Steps to reproduce
- Your environment (OS, version, browser if relevant)
- Logs or screenshots if available

## Proposing features

Open an issue describing:
- The problem you're trying to solve (not just the solution)
- Who it affects (e.g. "teams with subteams," "repo owners managing branch rules")
- Any alternatives you considered

## Code of conduct

Be respectful, assume good intent, and keep discussions focused on the work. Disagreements about approach are welcome; personal attacks are not.

## Questions

If something in this guide is unclear, open an issue — improving this document is itself a welcome contribution.
