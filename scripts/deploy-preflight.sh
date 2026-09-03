#!/usr/bin/env bash
# Production deployment preflight — read-only checks only.
# Does NOT deploy, migrate, restart containers, or modify Caddy.
#
# Usage:
#   ./scripts/deploy-preflight.sh
#   DEPLOY_DRY_RUN=1 ./scripts/deploy-production.sh   # alias entrypoint
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/deploy-lib.sh
source "${SCRIPT_DIR}/deploy-lib.sh"

PREFLIGHT_LOG="$(deploy_log_file)"
export DEPLOY_LOG="${PREFLIGHT_LOG}"

FAILURES=0
WARNINGS=0
MIN_FREE_MB="${MIN_FREE_MB:-2048}"
CADDY_CONTAINER_PATTERN="${CADDY_CONTAINER_PATTERN:-caddy}"
EXPECTED_COMPOSE_SERVICES=(postgres minio api web)

pass() {
  log "[PASS] $*"
}

warn() {
  log "[WARN] $*"
  WARNINGS=$((WARNINGS + 1))
}

fail() {
  log "[FAIL] $*"
  FAILURES=$((FAILURES + 1))
}

check_command() {
  local cmd="$1"
  if command -v "${cmd}" >/dev/null 2>&1; then
    pass "command available: ${cmd}"
  else
    fail "required command missing: ${cmd}"
  fi
}

check_git_repo() {
  assert_production_repo
  cd "${REPO_ROOT}"
  pass "repository layout looks valid (${REPO_ROOT})"

  if [[ ! -d .git ]]; then
    warn "not a git repository — deploy versioning checks will be limited"
    return 0
  fi

  local branch remote_url dirty
  branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
  remote_url="$(git config --get remote.origin.url 2>/dev/null || echo unknown)"
  pass "git branch: ${branch}"
  pass "git origin: ${remote_url}"

  if ! git remote get-url origin >/dev/null 2>&1; then
    fail "origin remote is not configured"
  fi

  if ! git ls-remote --exit-code origin "${DEPLOY_BRANCH}" >/dev/null 2>&1; then
    fail "origin/${DEPLOY_BRANCH} is not available"
  else
    pass "origin/${DEPLOY_BRANCH} exists on remote"
  fi

  dirty="$(git status --porcelain --untracked-files=no)"
  if [[ -n "${dirty}" ]]; then
    warn "working tree has local modifications to tracked files (deploy uses fast-forward only)"
  else
    pass "working tree clean (tracked files)"
  fi
}

check_env_files() {
  local env_file
  if ! env_file="$(resolve_env_file)"; then
    fail "production env file missing (.env.production or .env)"
    return 1
  fi
  pass "production env file present: ${env_file}"

  local required_vars=(
    POSTGRES_PASSWORD JWT_ACCESS_SECRET JWT_REFRESH_SECRET
    STORAGE_DRIVER
    S3_ENDPOINT S3_BUCKET S3_ACCESS_KEY_ID S3_SECRET_ACCESS_KEY S3_PUBLIC_BASE_URL
  )
  local key val
  for key in "${required_vars[@]}"; do
    val="$(env_file_get "${env_file}" "${key}" || true)"
    if [[ -z "${val}" ]]; then
      fail "env missing variable: ${key}"
      continue
    fi
    if [[ "${val}" == CHANGE_ME* ]]; then
      fail "env variable not configured: ${key}"
    else
      pass "env variable set: ${key}"
    fi
  done

  local driver
  driver="$(env_file_get "${env_file}" STORAGE_DRIVER || true)"
  if [[ "${driver}" != "s3" ]]; then
    fail "STORAGE_DRIVER must be s3 for production (local disk is not permitted)"
  else
    pass "STORAGE_DRIVER=s3 (production object storage required)"
  fi
}

check_docker() {
  check_command docker
  if docker info >/dev/null 2>&1; then
    pass "docker daemon is reachable"
  else
    fail "docker daemon is not reachable"
    return 1
  fi

  if docker compose version >/dev/null 2>&1; then
    pass "docker compose plugin available"
  else
    fail "docker compose plugin missing"
  fi
}

check_compose_config() {
  if compose config --quiet >/dev/null 2>&1; then
    pass "docker compose configuration is valid"
  else
    fail "docker compose configuration is invalid"
    compose config >/dev/null 2>&1 || true
  fi

  local svc
  for svc in "${EXPECTED_COMPOSE_SERVICES[@]}"; do
    if compose config --services 2>/dev/null | grep -qx "${svc}"; then
      pass "compose service defined: ${svc}"
    else
      fail "expected compose service missing: ${svc}"
    fi
  done
}

check_postgres_container() {
  local pg_id pg_status
  pg_id="$(compose ps -q postgres 2>/dev/null || true)"
  if [[ -z "${pg_id}" ]]; then
    warn "postgres container is not running (first deploy may be required)"
    return 0
  fi

  pg_status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "${pg_id}" 2>/dev/null || echo unknown)"
  if [[ "${pg_status}" == "healthy" || "${pg_status}" == "running" ]]; then
    pass "postgres container status: ${pg_status}"
  else
    fail "postgres container status: ${pg_status}"
  fi

  if docker volume ls --format '{{.Name}}' | grep -q 'prod_pg_data'; then
    pass "postgres data volume present (prod_pg_data)"
  else
    warn "postgres data volume prod_pg_data not found (may use a different compose project name)"
  fi
}

check_caddy_independence() {
  local caddy_id caddy_status
  caddy_id="$(docker ps -q --filter "name=${CADDY_CONTAINER_PATTERN}" | head -1 || true)"
  if [[ -z "${caddy_id}" ]]; then
    warn "no running container matched CADDY_CONTAINER_PATTERN=${CADDY_CONTAINER_PATTERN}"
    return 0
  fi

  caddy_status="$(docker inspect -f '{{.State.Status}}' "${caddy_id}" 2>/dev/null || echo unknown)"
  pass "production Caddy container detected (status=${caddy_status}) — preflight will not restart/modify it"

  if [[ -f "${REPO_ROOT}/Caddyfile" ]]; then
    warn "Caddyfile exists inside app repo — keep live Caddy config outside deployment path"
  else
    pass "no Caddyfile tracked in application repository root"
  fi
}

check_disk_space() {
  local avail_kb avail_mb target
  target="${REPO_ROOT}"
  if [[ ! -d "${target}" ]]; then
    fail "cannot check disk space — repo path missing"
    return 1
  fi

  avail_kb="$(df -Pk "${target}" | awk 'NR==2 {print $4}')"
  avail_mb=$((avail_kb / 1024))
  if [[ "${avail_mb}" -ge "${MIN_FREE_MB}" ]]; then
    pass "disk space OK: ${avail_mb}MB free (min ${MIN_FREE_MB}MB)"
  else
    fail "insufficient disk space: ${avail_mb}MB free (need >= ${MIN_FREE_MB}MB)"
  fi
}

check_http_endpoints() {
  if [[ "${SKIP_HTTP_CHECKS:-false}" == "true" ]]; then
    warn "SKIP_HTTP_CHECKS=true — skipping public HTTP checks"
    return 0
  fi

  if ! command -v curl >/dev/null 2>&1; then
    warn "curl not available — skipping HTTP endpoint checks"
    return 0
  fi

  if "${SCRIPT_DIR}/production-healthcheck.sh"; then
    pass "public production health endpoints responded successfully"
  else
    fail "public production health endpoint checks failed"
  fi
}

check_deploy_script_safety() {
  local script
  for script in deploy-production.sh rollback-production.sh; do
    if [[ -x "${SCRIPT_DIR}/${script}" || -f "${SCRIPT_DIR}/${script}" ]]; then
      pass "deployment script present: ${script}"
    else
      fail "deployment script missing: ${script}"
    fi

    if grep -q 'down -v' "${SCRIPT_DIR}/${script}" 2>/dev/null; then
      fail "${script} contains forbidden 'docker compose down -v'"
    else
      pass "${script} does not use volume-destructive compose commands"
    fi

    if grep -qiE 'migrate reset|db push.*force-reset' "${SCRIPT_DIR}/${script}" 2>/dev/null; then
      fail "${script} references destructive Prisma commands"
    else
      pass "${script} avoids destructive Prisma commands"
    fi
  done
}

main() {
  log_section "Production deployment preflight (read-only)"
  log "Log file: ${PREFLIGHT_LOG}"
  log "Deploy branch target: ${DEPLOY_BRANCH}"
  log "This run performs NO deployment and NO database migration."

  check_git_repo || true
  check_env_files || true
  check_docker || true
  check_compose_config || true
  check_postgres_container || true
  check_caddy_independence || true
  check_disk_space || true
  check_deploy_script_safety || true
  check_http_endpoints || true

  log_section "Preflight summary"
  log "Failures: ${FAILURES} | Warnings: ${WARNINGS}"

  if [[ "${FAILURES}" -gt 0 ]]; then
    log "PREFLIGHT FAILED"
    exit 1
  fi

  log "PREFLIGHT PASSED"
}

main "$@"
