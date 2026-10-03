#!/usr/bin/env bash
# Builds realistic commit history with different authors and the demo branches.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf .git && git init -q -b main

c() { # c "Name" "email" "message" paths...
  local name="$1" email="$2" msg="$3"; shift 3
  git add "$@"
  GIT_AUTHOR_NAME="$name" GIT_AUTHOR_EMAIL="$email" \
  GIT_COMMITTER_NAME="$name" GIT_COMMITTER_EMAIL="$email" \
  git commit -q -m "$msg"
}

c "Olivia" "olivia@acme.example" "Initial commit: README and permissions" README.md permissions.yml
c "Adam"   "adam@acme.example"   "docs: add architecture and contributing guides" docs
c "Maya"   "maya@acme.example"   "api: scaffold orders service" services/api
c "Ben"    "ben@acme.example"    "payments: add charge and refund" services/payments
c "Sam"    "sam@acme.example"    "web: storefront and checkout" apps/web
c "Dana"   "dana@acme.example"   "design: add tokens and guidelines" design
c "Adam"   "adam@acme.example"   "infra: terraform, compose, deploy script" infra
c "Adam"   "adam@acme.example"   "security: policy and audit checklist" security
c "Olivia" "olivia@acme.example" "scripts and demo walkthrough" scripts docs/demo-script.md

for b in develop release/1.0 hotfix/payment-timeout infra/prod; do git branch "$b"; done

git checkout -q -b feature/apple-pay develop
echo "# TODO: Apple Pay support" >> services/payments/README.md
c "Ben" "ben@acme.example" "payments: start Apple Pay notes" services/payments/README.md
git checkout -q main
echo "Done. Branches:"; git branch
