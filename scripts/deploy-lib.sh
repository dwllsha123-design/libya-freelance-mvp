#!/usr/bin/env bash
# Shared helpers for production deploy / rollback scripts.
# shellcheck disable=SC2034

set -Eeuo pipefail

# --- Paths & compose ---------------------------------------------------------
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.production.yml}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
APP_SERVICES="${APP_SERVICES:-api web}"

# --- Logging -----------------------------------------------------------------
DEPLOY_LOG_DIR="${DEPLOY_LOG_DIR:-${REPO_ROOT}/deploy-logs}"
mkdir -p "${DEPLOY_LOG_DIR}"

deploy_timestamp() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

deploy_log_file() {
  echo "${DEPLOY_LOG_DIR}/deploy-$(date -u +"%Y%m%d-%H%M%S").log"
}

log() {
  # Usage: log "message"
  echo "[$(deploy_timestamp)] $*" | tee -a "${DEPLOY_LOG:-/dev/null}"
}

log_section() {
  log "========== $* =========="
}

# --- Env file (never overwrite) -----------------------------------------------
resolve_env_file() {
  if [[ -n "${ENV_FILE:-}" && -f "${REPO_ROOT}/${ENV_FILE}" ]]; then
    echo "${REPO_ROOT}/${ENV_FILE}"
    return 0
  fi
  if [[ -f "${REPO_ROOT}/.env.production" ]]; then
    echo "${REPO_ROOT}/.env.production"
    return 0
  fi
  if [[ -f "${REPO_ROOT}/.env" ]]; then
    echo "${REPO_ROOT}/.env"
    return 0
  fi
  echo "ERROR: No production env file found (.env.production or .env)." >&2
  echo "Create one from .env.production.example on the server (never commit secrets)." >&2
  return 1
}

compose() {
  local env_file
  env_file="$(resolve_env_file)"
  docker compose -f "${REPO_ROOT}/${COMPOSE_FILE}" --env-file "${env_file}" "$@"
}

# --- Repository guard --------------------------------------------------------
assert_production_repo() {
  local expected_name="${PRODUCTION_REPO_NAME:-libya-freelance-mvp}"
  cd "${REPO_ROOT}"
  if [[ ! -f "${COMPOSE_FILE}" ]]; then
    echo "ERROR: ${COMPOSE_FILE} not found in ${REPO_ROOT}" >&2
    exit 1
  fi
  if [[ ! -d backend || ! -d frontend ]]; then
    echo "ERROR: backend/ or frontend/ missing — not the Libya Freelance repo." >&2
    exit 1
  fi
  if [[ -d .git ]]; then
    local remote_url
    remote_url="$(git config --get remote.origin.url 2>/dev/null || true)"
    if [[ -n "${remote_url}" && "${remote_url}" != *"${expected_name}"* ]]; then
      log "WARN: origin URL (${remote_url}) does not contain '${expected_name}'"
    fi
  fi
}

# --- Git helpers -------------------------------------------------------------
git_current_sha() {
  cd "${REPO_ROOT}"
  git rev-parse HEAD
}

git_fetch_deploy_branch() {
  cd "${REPO_ROOT}"
  log "Fetching origin/${DEPLOY_BRANCH}..."
  git fetch origin "${DEPLOY_BRANCH}"
}

git_fast_forward_to_origin() {
  cd "${REPO_ROOT}"
  local target="origin/${DEPLOY_BRANCH}"
  if ! git rev-parse --verify "${target}" >/dev/null 2>&1; then
    echo "ERROR: ${target} not found. Ensure branch '${DEPLOY_BRANCH}' exists on origin." >&2
    exit 1
  fi
  if git merge-base --is-ancestor HEAD "${target}" 2>/dev/null; then
    git merge --ff-only "${target}"
  elif [[ "$(git rev-parse HEAD)" == "$(git rev-parse "${target}")" ]]; then
    log "Already at ${target}"
  else
    echo "ERROR: Cannot fast-forward to ${target}. Resolve manually before deploying." >&2
    exit 1
  fi
}

git_checkout_sha() {
  local sha="$1"
  cd "${REPO_ROOT}"
  log "Resetting ${DEPLOY_BRANCH} to commit ${sha}..."
  git fetch origin --tags
  if git show-ref --verify --quiet "refs/heads/${DEPLOY_BRANCH}"; then
    git checkout "${DEPLOY_BRANCH}"
  else
    git checkout -b "${DEPLOY_BRANCH}"
  fi
  git reset --hard "${sha}"
}

# --- Docker helpers ----------------------------------------------------------
validate_compose_config() {
  log "Validating Docker Compose configuration..."
  compose config --quiet
}

build_app_images() {
  log "Building application images (api, web)..."
  compose build api web
}

run_migrations() {
  log "Running Prisma migrate deploy (production-safe)..."
  compose --profile tools run --rm --no-deps migrate \
    sh -c 'node node_modules/prisma/build/index.js migrate deploy \
      && node node_modules/prisma/build/index.js migrate status'

  if [[ "${RUN_REFERENCE_SEED:-false}" == "true" ]]; then
    log "RUN_REFERENCE_SEED=true — running idempotent reference seed..."
    compose --profile tools run --rm --no-deps migrate \
      sh -c 'npm run prisma:seed'
  else
    log "Skipping reference seed (set RUN_REFERENCE_SEED=true to enable idempotent seed)."
  fi
}

restart_app_services() {
  log "Recreating application containers only (${APP_SERVICES})..."
  # --no-deps: do not restart postgres, minio, or Caddy (external)
  compose up -d --no-deps --force-recreate ${APP_SERVICES}
}

wait_for_compose_healthy() {
  local attempts="${HEALTH_WAIT_ATTEMPTS:-30}"
  local sleep_s="${HEALTH_WAIT_SLEEP:-5}"
  log "Waiting up to $((attempts * sleep_s))s for application containers..."
  for ((i = 1; i <= attempts; i++)); do
    if compose ps --status running 2>/dev/null | grep -qE 'api|web'; then
      local api_state web_state
      api_state="$(compose ps api --format '{{.State}}' 2>/dev/null || echo unknown)"
      web_state="$(compose ps web --format '{{.State}}' 2>/dev/null || echo unknown)"
      log "Container state: api=${api_state} web=${web_state} (attempt ${i}/${attempts})"
      if [[ "${api_state}" == "running" && "${web_state}" == "running" ]]; then
        return 0
      fi
    fi
    sleep "${sleep_s}"
  done
  log "WARN: Timed out waiting for containers; continuing to HTTP health checks."
  return 0
}

print_compose_status() {
  log "Docker Compose service status:"
  compose ps 2>&1 | tee -a "${DEPLOY_LOG:-/dev/null}" || true
}
