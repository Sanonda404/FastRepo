# Architecture
```
Browser -> apps/web -> services/api -> services/payments -> card provider
                              |
                           Postgres
```
Infra is described in `infra/` and deployed via `infra/deploy.sh`.
