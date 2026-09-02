#!/usr/bin/env bash
# Roll back production application code to a specific Git commit.
# Does NOT reset PostgreSQL, drop volumes, or roll back schema migrations.
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/deploy-lib.sh
source "${SCRIPT_DIR}/deploy-lib.sh"

TARGET_SHA="${1:-}"
if [[ -z "${TARGET_SHA}" ]]; then
  echo "Usage: $0 <git-commit-sha>" >&2
  echo "Example: $0 abc1234" >&2
  exit 1
fi

DEPLOY_LOG="$(deploy_log_file)"
export DEPLOY_LOG

main() {
  log_section "Libya Freelance — production rollback start"
  log "Log file: ${DEPLOY_LOG}"
  log "Target commit: ${TARGET_SHA}"

  assert_production_repo
  resolve_env_file >/dev/null

  local current
  current="$(git_current_sha)"
  log "Current commit before rollback: ${current}"

  git_checkout_sha "${TARGET_SHA}"

  validate_compose_config
  build_app_images
  # Do not run migrations on rollback — schema may be ahead of older app code.
  # Only redeploy containers with the checked-out code.
  restart_app_services
  wait_for_compose_healthy
  print_compose_status

  log_section "Running production health checks after rollback"
  if ! "${SCRIPT_DIR}/production-healthcheck.sh"; then
    log "ERROR: Health checks failed after rollback to ${TARGET_SHA}."
    exit 1
  fi

  log_section "ROLLBACK SUCCEEDED"
  log "Rolled back from ${current} to ${TARGET_SHA}"
  log "NOTE: Database schema was NOT rolled back. If a failed migration was applied,"
  log "      restore from backup or apply a forward-fix migration manually."
}

main "$@"
