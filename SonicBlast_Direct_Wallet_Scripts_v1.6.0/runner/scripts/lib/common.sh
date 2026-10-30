#!/usr/bin/env bash
set -euo pipefail

COMMON_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
RUNNER_ROOT="$(cd -- "$COMMON_DIR/../.." && pwd)"
PROJECT_ROOT="$(cd -- "$RUNNER_ROOT/.." && pwd)"

fail() { printf 'SonicBlast runner: %s\n' "$*" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"; }
load_local_env() {
  if [[ -f "$RUNNER_ROOT/.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "$RUNNER_ROOT/.env"
    set +a
  fi
}
arg_value() {
  local key="$1"; shift
  local previous=""
  for item in "$@"; do
    if [[ "$previous" == "$key" ]]; then printf '%s' "$item"; return 0; fi
    previous="$item"
  done
  return 1
}
require_arg() { local value; value="$(arg_value "$1" "${@:2}")" || fail "Missing $1"; printf '%s' "$value"; }
require_env() { [[ -n "${!1:-}" ]] || fail "Set $1 in runner/.env"; printf '%s' "${!1}"; }
valid_evm_address() { [[ "$1" =~ ^0x[a-fA-F0-9]{40}$ ]]; }
valid_integer() { [[ "$1" =~ ^[1-9][0-9]*$ ]]; }
valid_decimal() { [[ "$1" =~ ^([0-9]+)(\.[0-9]{1,18})?$ ]]; }
valid_symbol() { [[ "$1" =~ ^[A-Z0-9]{2,12}$ ]]; }
valid_chain() { node "$RUNNER_ROOT/bin/network.mjs" "$1" label >/dev/null 2>&1; }
chain_field() { node "$RUNNER_ROOT/bin/network.mjs" "$1" "$2" || fail "Unsupported chain: $1"; }

assert_evm_chain() {
  local chain="$1" rpc_url="$2" expected actual
  need cast
  expected="$(chain_field "$chain" chainId)"
  actual="$(cast chain-id --rpc-url "$rpc_url")"
  [[ "$actual" == "$expected" ]] || fail "RPC chain ID $actual does not match $chain (expected $expected)"
}
assert_contract_code() {
  local address="$1" rpc_url="$2" code
  code="$(cast code "$address" --rpc-url "$rpc_url")"
  [[ "$code" != "0x" && -n "$code" ]] || fail "No contract code found at $address on the configured RPC"
}
