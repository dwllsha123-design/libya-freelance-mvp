#!/usr/bin/env bash
# Safe production deployment for Libya Freelance.
# - Never deletes Docker volumes or resets PostgreSQL
# - Never overwrites .env / .env.production
# - Never restarts Caddy (external reverse proxy)
# - Uses prisma migrate deploy only (no reset / db push)
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/deploy-lib.sh
source "${SCRIPT_DIR}/deploy-lib.sh"

DEPLOY_LOG="$(deploy_log_file)"
export DEPLOY_LOG

PREVIOUS_COMMIT=""
NEW_COMMIT=""
DEPLOY_RESULT="failure"

cleanup_on_error() {
  local exit_code=$?
  if [[ "${exit_code}" -ne 0 ]]; then
    log_section "DEPLOYMENT FAILED (exit ${exit_code})"
    log "Previous commit: ${PREVIOUS_COMMIT:-unknown}"
    log "Attempted commit: ${NEW_COMMIT:-unknown}"
    print_compose_status || true

    if [[ "${ENABLE_AUTO_ROLLBACK:-false}" == "true" && -n "${PREVIOUS_COMMIT}" ]]; then
      log "ENABLE_AUTO_ROLLBACK=true — invoking rollback to ${PREVIOUS_COMMIT}"
      if "${SCRIPT_DIR}/rollback-production.sh" "${PREVIOUS_COMMIT}"; then
        log "Automatic rollback completed."
      else
        log "ERROR: Automatic rollback failed. Manual intervention required."
      fi
    else
      log "Manual rollback: ${SCRIPT_DIR}/rollback-production.sh ${PREVIOUS_COMMIT:-<sha>}"
    fi
  fi
}
trap cleanup_on_error ERR

main() {
  log_section "Libya Freelance — production deployment start"
  log "Log file: ${DEPLOY_LOG}"
  log "Repository: ${REPO_ROOT}"
  log "Compose file: ${COMPOSE_FILE}"
  log "Deploy branch: ${DEPLOY_BRANCH}"

  assert_production_repo

  local env_file
  env_file="$(resolve_env_file)"
  log "Using env file: ${env_file} (existing file preserved — never overwritten by this script)"

  if [[ "${DEPLOY_DRY_RUN:-0}" == "1" || "${DEPLOY_PREFLIGHT:-0}" == "1" ]]; then
    log "DEPLOY_DRY_RUN/DEPLOY_PREFLIGHT enabled — running preflight only (no deployment)."
    "${SCRIPT_DIR}/deploy-preflight.sh"
    exit 0
  fi

  log_section "Pre-deploy storage gate (must pass before rebuild/restart)"
  require_production_storage_env "${env_file}"

  cd "${REPO_ROOT}"
  PREVIOUS_COMMIT="$(git_current_sha)"
  log "Previous commit: ${PREVIOUS_COMMIT}"

  git_fetch_deploy_branch
  git_fast_forward_to_origin
  NEW_COMMIT="$(git_current_sha)"
  log "New commit: ${NEW_COMMIT}"

  if [[ "${PREVIOUS_COMMIT}" == "${NEW_COMMIT}" ]]; then
    log "No new commits on origin/${DEPLOY_BRANCH}; rebuilding/restarting application services."
  fi

  validate_compose_config

  # Re-check after git fast-forward in case env expectations changed; still before build.
  require_production_storage_env "${env_file}"

  build_app_images
  run_migrations
  restart_app_services
  wait_for_compose_healthy
  print_compose_status

  log_section "Running production health checks"
  if ! "${SCRIPT_DIR}/production-healthcheck.sh"; then
    log "ERROR: Health checks failed."
    exit 1
  fi

  DEPLOY_RESULT="success"
  log_section "DEPLOYMENT SUCCEEDED"
  log "Deployed commit: ${NEW_COMMIT}"
  log "Previous commit: ${PREVIOUS_COMMIT}"
  log "Build: OK | Migrations: OK | Containers: restarted (api, web) | Health: OK"
}

main "$@"
