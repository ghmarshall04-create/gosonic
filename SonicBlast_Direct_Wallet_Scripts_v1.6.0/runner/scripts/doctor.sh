#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=lib/common.sh
source "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/lib/common.sh"

printf 'SonicBlast launch workstation check\n'
for command in node forge cast solana spl-token; do
  if command -v "$command" >/dev/null 2>&1; then
    printf '✓ %-10s %s\n' "$command" "$(command -v "$command")"
  else
    printf '• %-10s missing\n' "$command"
  fi
done
if [[ -f "$RUNNER_ROOT/.env" ]]; then
  printf '✓ local runner/.env found\n'
else
  printf '• copy runner/.env.example to runner/.env before a launch\n'
fi
printf '\nThe browser app never needs wallet recovery phrases. Configure a dedicated local signer.\n'
