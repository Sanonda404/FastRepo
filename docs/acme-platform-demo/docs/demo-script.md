# Demo script
1. **Folder wall:** Fiona edits `services/payments/charge.py` -> blocked. Ben edits it -> allowed.
2. **Folder visibility:** log in as Dana. She sees `design/` (write) and `docs/`; other folders hidden or read-only.
3. **Branch wall:** Ben pushes to `main` -> rejected. He opens a PR, Maya approves, it merges.
4. **Subteam inheritance:** add a new member to Payments; they inherit Backend read access on `services/api`.
5. **Viewer limits:** Vic can browse and clone but has no push or PR buttons.
6. **Member without team:** remove Ben from Payments -> his access disappears.
7. **Role escalation:** promote Fiona to Maintainer -> she can merge on `apps/web`, still blocked on payments.
