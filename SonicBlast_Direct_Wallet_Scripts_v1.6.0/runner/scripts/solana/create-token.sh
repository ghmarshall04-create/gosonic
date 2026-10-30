#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=../lib/common.sh
source "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/../lib/common.sh"
load_local_env
need spl-token
need solana

CLUSTER="$(require_arg --cluster "$@")"
NAME="$(require_arg --name "$@")"
SYMBOL="$(require_arg --symbol "$@")"
SUPPLY="$(require_arg --supply "$@")"
DECIMALS="$(require_arg --decimals "$@")"
OWNER="$(require_arg --owner "$@")"
METADATA_URI="$(arg_value --metadata-uri "$@" || true)"

[[ "$CLUSTER" == "mainnet-beta" || "$CLUSTER" == "devnet" || "$CLUSTER" == "testnet" || "$CLUSTER" =~ ^https:// ]] || fail "Use mainnet-beta, devnet, testnet, or an HTTPS RPC URL"
[[ ${#NAME} -ge 2 && ${#NAME} -le 64 ]] || fail "Token name must be 2–64 characters"
valid_symbol "$SYMBOL" || fail "Token symbol must use 2–12 uppercase letters/numbers"
valid_integer "$SUPPLY" || fail "Supply must be a whole number greater than zero"
[[ "$DECIMALS" =~ ^([0-9]|1[0-8])$ ]] || fail "Decimals must be between 0 and 18"
[[ "$OWNER" =~ ^[1-9A-HJ-NP-Za-km-z]{32,44}$ ]] || fail "Owner must be a valid Solana address"

TOKEN_PROGRAM_ARGS=()
if [[ -n "$METADATA_URI" ]]; then
  [[ "$METADATA_URI" =~ ^https:// ]] || fail "Metadata URI must use HTTPS"
  TOKEN_PROGRAM_ARGS=(--program-2022)
  OUTPUT="$(spl-token -u "$CLUSTER" "${TOKEN_PROGRAM_ARGS[@]}" create-token --decimals "$DECIMALS" --enable-metadata)"
else
  OUTPUT="$(spl-token -u "$CLUSTER" create-token --decimals "$DECIMALS")"
fi
printf '%s\n' "$OUTPUT"
MINT="$(printf '%s\n' "$OUTPUT" | awk '/Creating token/ {print $3; exit}')"
[[ -n "$MINT" ]] || fail "Could not read the mint address from spl-token output. Save it from the command output and continue manually."

if [[ -n "$METADATA_URI" ]]; then
  spl-token -u "$CLUSTER" "${TOKEN_PROGRAM_ARGS[@]}" initialize-metadata "$MINT" "$NAME" "$SYMBOL" "$METADATA_URI"
fi
spl-token -u "$CLUSTER" "${TOKEN_PROGRAM_ARGS[@]}" create-account "$MINT"
spl-token -u "$CLUSTER" "${TOKEN_PROGRAM_ARGS[@]}" mint "$MINT" "$SUPPLY"
LOCAL_OWNER="$(solana -u "$CLUSTER" address)"
if [[ "$OWNER" != "$LOCAL_OWNER" ]]; then
  spl-token -u "$CLUSTER" "${TOKEN_PROGRAM_ARGS[@]}" transfer "$MINT" ALL "$OWNER" --fund-recipient
fi
spl-token -u "$CLUSTER" "${TOKEN_PROGRAM_ARGS[@]}" authorize "$MINT" mint --disable
printf '\nSolana token minted with fixed supply. Mint address: %s\n' "$MINT"
printf 'Use the mint address with a reviewed DEX-specific liquidity adapter.\n'
