<div align="center">

## ⚡ FastRepo

**Git hosting with real organizational structure.**
Teams, subteams, folder-level permissions, and branch-level permissions — built in, not bolted on.

</div>

---

## 📖 Overview

**FastRepo** is a Git hosting platform for teams that have outgrown flat, repo-level permissions. It looks and feels like the Git host you already know — push, pull, pull requests, issues — but underneath it has a permission model built for real organizations: nested **teams and subteams**, **folder-level access control**, and **branch-level access control**, all composable in a single repository.

Most Git platforms give you one lever: who can see/write to an entire repo. fastRepo gives you a full permission *surface* — team, folder, and branch — so one repository can safely hold code for ten teams instead of being split into ten repos just to keep people out of each other's way.

## 🚀 Why FastRepo

Teams typically solve "I don't want the frontend team touching our payments code" in one of a few ways:

- **Split into more repos.** Keeps people out, but fragments history, duplicates CI/CD setup, and makes cross-cutting refactors painful.
- **One repo, rely on code owners / review rules.** Controls *who approves*, not *who can read or write* — anyone with repo access can usually still see and often push to every folder.
- **One repo, trust and process.** Works until it doesn't.

fastRepo takes a different approach: **permissions live at the folder and branch level, inside a single repository**, scoped to teams and subteams. A monorepo can host Frontend, Backend, Payments, and DevOps code side by side, with each team only seeing and touching what they're supposed to.

## ✨ Features

### 🧩 Nested teams & subteams
Model your actual org chart, not a flat list of collaborators. Subteams inherit their parent team's access and layer on their own — e.g. a `payments` subteam under `backend` automatically gets Backend's access, plus write access to the sensitive paths only Payments should touch.

### 📁 Folder-level permissions
Grant `read`, `write`, or no access **per folder, per team** — in the same repository. Contributors only see what their team can access; everything else is hidden or read-only. No more splitting a codebase into a dozen repos just to keep secrets out of the wrong hands.

### 🌿 Branch-level permissions
Control who can push directly, who can merge, and how many approvals are required — **per branch or branch pattern** (`release/*`, `hotfix/*`, etc.), independent of folder permissions. Protect `main` from direct pushes while letting a specific subteam push straight to a `hotfix/*` branch in an emergency.

### 👥 Purpose-built roles
| Role | Can do |
|---|---|
| **Owner** | Full control of the repository, including team and permission management |
| **Admin** | Manage teams, permissions, and settings; merge branches, can't delete repo |
| **Maintainer** | Default write access, Can manage repository content and issues but cannot manage collaborators, teams, or delete the repository |
| **Member** | Contribute within their team's folder/branch access — *only exists attached to a team* |
| **Viewer** | Read-only access to **private** repositories — ideal for auditors, clients, or stakeholders |

Permissions are the intersection of a user's **role** and their **team membership** — so access is never just "on or off," it's precise.

### 🔐 Private-repo viewers
Give outside stakeholders (auditors, clients, contractors) safe, read-only visibility into a private repo without handing them write access or folder visibility they don't need.

## 🆚 fastRepo vs. a typical Git remote server

| Capability | Typical Git remote server | fastRepo |
|---|:---:|:---:|
| Repo-level read/write | ✅ | ✅ |
| Nested teams with inherited permissions | ⚠️ limited | ✅ |
| Folder-level read/write control | ❌ | ✅ |
| Branch-level push/merge rules per team | ⚠️ review rules only | ✅ |
| Read-only "viewer" role for private repos | ❌ | ✅ |
| Roles scoped to team membership | ❌ | ✅ |

> Feature availability on other platforms changes over time — always double-check the current feature set of whatever you're comparing against before quoting this table externally.

## 🔑 Roles & Permissions

Access in fastRepo is computed from three inputs:

```
effective access = role × team membership × (folder rule ∩ branch rule)
```

- **Role** sets the ceiling (what a user could ever do — e.g. only Maintainers+ can merge protected branches).
- **Team membership** determines *which* folders and branches a user's role applies to.
- **Subteams inherit** their parent team's folder/branch rules, then add their own on top.

This means the same repository can have one team that only sees `docs/` and `design/`, another with write access to most of the codebase except one sensitive service, and a third with push rights on a single deployment branch — all without leaving the repo.

📎 See [`docs/acme-platform-demo`](#) for a full worked example: a sample company repo with 8 users, 6 teams/subteams, a folder permission matrix, and a branch permission matrix you can clone and explore.

## 🏁 Getting Started

```bash
# Clone the project
git clone https://github.com/Sanonda404/FastRepo.git
cd fastrepo

# Install dependencies
cd frontend
npm install
npm run build
cd ..
cd backend
poetry install

# Configure environment variables
cp .env.example .env


# Start the development server
poetry run serve dev

# Or Production server
poetry run serve prod
```

Then open `http://localhost:8000` and create your first repository.

### Creating your first team-based repo

1. Create a repository and set it to **private** or **public**.
2. Create a **team**, then nest a **subteam** under it if needed.
3. Add members to teams, and assign each a **role**.
4. Define **folder permissions** per team under repo settings.
5. Define **branch rules** (push/merge/approvals) per branch pattern.
6. Invite a **viewer** if you need read-only stakeholders on a private repo.

## 🏗 Architecture

```
Client (web/CLI) ──> API ──> Permission engine ──> Git storage
                              │
                              └── Team/role/folder/branch rule resolver
```

- **API:** `FastAPI`
- **Database:** `Postgres`
- **Git storage layer:** `dulwich`
- **Auth:** `JWT Token`


## 🤝 Contributing

Contributions are welcome. Please open an issue to discuss significant changes before submitting a pull request.

1. Fork the repo and create your branch from `develop`
2. Make your changes with clear, focused commits
3. Open a pull request describing the change and why it's needed

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for details.

---

<div align="center">
Built for teams who need more than one lock on the front door.
</div>
