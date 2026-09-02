#!/usr/bin/env bash
# Production HTTP health checks — exits non-zero on failure.
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/deploy-lib.sh
source "${SCRIPT_DIR}/deploy-lib.sh"

# --- Targets -----------------------------------------------------------------
SITE_URL="${SITE_URL:-https://libyanfreelance.ly}"
ADMIN_URL="${ADMIN_URL:-https://admin.libyanfreelance.ly}"
API_LIVENESS_URL="${API_LIVENESS_URL:-https://api.libyanfreelance.ly/api/health}"
API_READY_URL="${API_READY_URL:-https://api.libyanfreelance.ly/api/health/ready}"

CURL_CONNECT_TIMEOUT="${CURL_CONNECT_TIMEOUT:-10}"
CURL_MAX_TIME="${CURL_MAX_TIME:-30}"
CURL_RETRIES="${CURL_RETRIES:-3}"
CURL_RETRY_DELAY="${CURL_RETRY_DELAY:-5}"

FAILURES=0

log_section() {
  echo "[$(deploy_timestamp)] ========== $* =========="
}

check_http() {
  # check_http <label> <url> <accept_codes_regex> [curl_extra_args...]
  local label="$1"
  local url="$2"
  local accept_re="$3"
  shift 3

  local attempt code
  for ((attempt = 1; attempt <= CURL_RETRIES; attempt++)); do
    code="$(
      curl -sS -o /dev/null -w '%{http_code}' \
        --connect-timeout "${CURL_CONNECT_TIMEOUT}" \
        --max-time "${CURL_MAX_TIME}" \
        "$@" \
        "${url}" 2>/dev/null || echo "000"
    )"

    if [[ "${code}" =~ ${accept_re} ]]; then
      echo "[OK] ${label}: HTTP ${code} (${url})"
      return 0
    fi

    echo "[WARN] ${label}: HTTP ${code} (attempt ${attempt}/${CURL_RETRIES})"
    if [[ "${attempt}" -lt "${CURL_RETRIES}" ]]; then
      sleep "${CURL_RETRY_DELAY}"
    fi
  done

  echo "[FAIL] ${label}: expected HTTP matching /${accept_re}/ but got ${code} (${url})" >&2
  FAILURES=$((FAILURES + 1))
  return 1
}

check_api_json() {
  # Uses readiness endpoint (DB connectivity) — not bare "/"
  local label="$1"
  local url="$2"
  local attempt body code status

  for ((attempt = 1; attempt <= CURL_RETRIES; attempt++)); do
    body="$(mktemp)"
    code="$(
      curl -sS -o "${body}" -w '%{http_code}' \
        --connect-timeout "${CURL_CONNECT_TIMEOUT}" \
        --max-time "${CURL_MAX_TIME}" \
        "${url}" 2>/dev/null || echo "000"
    )"

    if [[ "${code}" == "200" ]]; then
      if grep -q '"status"' "${body}" 2>/dev/null; then
        status="$(grep -o '"status"[[:space:]]*:[[:space:]]*"[^"]*"' "${body}" | head -1 | sed 's/.*"\([^"]*\)"$/\1/')"
        if [[ "${status}" == "ready" || "${status}" == "degraded" || "${status}" == "ok" ]]; then
          echo "[OK] ${label}: HTTP 200 status=${status} (${url})"
          rm -f "${body}"
          return 0
        fi
      fi
      echo "[OK] ${label}: HTTP 200 (${url})"
      rm -f "${body}"
      return 0
    fi

    echo "[WARN] ${label}: HTTP ${code} (attempt ${attempt}/${CURL_RETRIES})"
    rm -f "${body}"
    if [[ "${attempt}" -lt "${CURL_RETRIES}" ]]; then
      sleep "${CURL_RETRY_DELAY}"
    fi
  done

  echo "[FAIL] ${label}: API readiness check failed (${url})" >&2
  FAILURES=$((FAILURES + 1))
  return 1
}

main() {
  log_section "Production health checks"

  # Marketplace + admin: 200 or legitimate redirects (login, locale, www)
  check_http "Marketplace" "${SITE_URL}" '^(200|301|302|307|308)$' -L || true
  check_http "Admin" "${ADMIN_URL}" '^(200|301|302|307|308)$' -L || true

  # API liveness (lightweight)
  check_http "API liveness" "${API_LIVENESS_URL}" '^200$' || true

  # API readiness (DB + storage probe) — primary API health gate
  check_api_json "API readiness" "${API_READY_URL}" || true

  log_section "Health check summary"
  if [[ "${FAILURES}" -gt 0 ]]; then
    echo "FAILED: ${FAILURES} check(s) failed." >&2
    exit 1
  fi

  echo "All production health checks passed."
}

main "$@"
