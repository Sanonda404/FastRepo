# Contributing to fastRepo

Thanks for your interest in improving fastRepo! This document covers how to propose changes, report issues, and get a pull request merged.

## Before you start

- For small fixes (typos, docs, small bugs), feel free to open a PR directly.
- For anything larger — new features, permission-model changes, breaking changes — **open an issue first** to discuss the approach before writing code. This saves everyone time if the direction needs to change.

## Development setup

```bash
# 1. Fork the repo, then clone your fork
git clone https://github.com/<your-username>/fastrepo.git
cd fastrepo

# 2. Add the upstream remote
git remote add upstream https://github.com/<org>/fastrepo.git

# 3. Install dependencies
<package-manager> install

# 4. Copy environment config
cp .env.example .env

# 5. Run migrations and start the dev server
<migration-command>
<run-command>
```

> Replace the placeholder commands above with the project's actual setup steps.

## Branching model

fastRepo's own repo follows the same branch conventions the product encourages:

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
