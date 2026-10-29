#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=../lib/common.sh
source "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/../lib/common.sh"
load_local_env

CLUSTER="$(require_arg --cluster "$@")"
MINT="$(require_arg --mint "$@")"
QUOTE="$(require_arg --quote "$@")"
AMOUNT="$(require_arg --amount "$@")"
OWNER="$(require_arg --owner "$@")"
[[ "$MINT" =~ ^[1-9A-HJ-NP-Za-km-z]{32,44}$ ]] || fail "Mint address is invalid"
[[ "$OWNER" =~ ^[1-9A-HJ-NP-Za-km-z]{32,44}$ ]] || fail "Owner address is invalid"
valid_decimal "$AMOUNT" || fail "Amount must be a positive decimal"
[[ "$AMOUNT" != "0" ]] || fail "Amount must be greater than zero"

cat <<PLAN
SonicBlast Solana liquidity handoff
  Cluster: $CLUSTER
  Mint: $MINT
  Quote asset: $QUOTE
  Planned quote amount: $AMOUNT
  Owner: $OWNER

Solana liquidity requires a venue-specific program interface. Configure SONICBLAST_SOLANA_LIQUIDITY_ADAPTER with a reviewed local adapter for the selected DEX before sending a transaction.
PLAN

if [[ -n "${SONICBLAST_SOLANA_LIQUIDITY_ADAPTER:-}" ]]; then
  [[ -x "$SONICBLAST_SOLANA_LIQUIDITY_ADAPTER" ]] || fail "SONICBLAST_SOLANA_LIQUIDITY_ADAPTER is not executable"
  exec "$SONICBLAST_SOLANA_LIQUIDITY_ADAPTER" --cluster "$CLUSTER" --mint "$MINT" --quote "$QUOTE" --amount "$AMOUNT" --owner "$OWNER"
fi
