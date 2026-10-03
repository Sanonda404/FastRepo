#!/usr/bin/env bash
set -euo pipefail
echo "Deploying acme-platform to ${1:-staging}..."
terraform -chdir=infra apply -auto-approve
echo "Done."
