# acme-platform

Demo monorepo for **fastRepo**: one private repository, many teams, real folder- and branch-level access control.

## Roles
| User  | Role       | Team                 |
|-------|------------|----------------------|
| Olivia | Owner     | whole repo           |
| Adam  | Admin      | Engineering          |
| Maya  | Maintainer | Backend              |
| Sam   | Maintainer | Frontend             |
| Ben   | Member     | Backend > Payments   |
| Fiona | Member     | Frontend             |
| Dana  | Member     | Design               |
| Vic   | Viewer     | none (external auditor) |

## Teams
```
Engineering
├── Backend
│   └── Payments
├── Frontend
└── DevOps
Design
Security
```

## Folder permissions
| Folder              | Engineering | Backend | Payments | Frontend | DevOps | Design | Security |
|---------------------|:-----------:|:-------:|:--------:|:--------:|:------:|:------:|:--------:|
| apps/web            | R | R | - | **W** | R | R | R |
| services/api        | R | **W** | W | R | R | - | R |
| services/payments   | - | R | **W** | - | - | - | R |
| infra               | - | - | - | - | **W** | - | R |
| design              | - | - | - | R | - | **W** | - |
| security            | - | - | - | - | - | - | **W** |
| docs                | W | W | W | W | W | W | W |

## Branch rules
| Branch        | Direct push        | Merge PRs                     |
|---------------|--------------------|-------------------------------|
| main          | nobody             | Maintainers, 1 approval       |
| develop       | Members and up     | Maintainers                   |
| release/*     | Maintainers only   | Admin                         |
| hotfix/*      | Maintainers + Payments | Admin                     |
| infra/prod    | DevOps only        | DevOps maintainer + Admin     |

See `permissions.yml` for the machine-readable version and `docs/demo-script.md` for the walkthrough.
