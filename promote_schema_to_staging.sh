#!/usr/bin/env bash
set -Eeuo pipefail

#######################################
# Required env vars (set before run):
#   PROD_DB_URL
#   STAGING_DB_URL
# Optional:
#   APP_SCHEMAS="public"
#   RLS_FILE="supabase/rls-policies.sql"
#######################################

: "${PROD_DB_URL:?Missing PROD_DB_URL}"
: "${STAGING_DB_URL:?Missing STAGING_DB_URL}"

APP_SCHEMAS="${APP_SCHEMAS:-public}"
RLS_FILE="${RLS_FILE:-supabase/rls-policies.sql}"

TS="$(date +%Y%m%d_%H%M%S)"
WORKDIR=".db_promotion/${TS}"
mkdir -p "${WORKDIR}"

SCHEMA_DUMP="${WORKDIR}/schema.sql"
STAGING_PRE_BACKUP="${WORKDIR}/staging_pre_schema.sql"
LOG_FILE="${WORKDIR}/promotion.log"

echo "==> Starting promotion @ ${TS}" | tee -a "${LOG_FILE}"
echo "==> App schemas: ${APP_SCHEMAS}" | tee -a "${LOG_FILE}"

# Convert "public,app,foo" -> repeated --schema args
SCHEMA_ARGS=()
IFS=',' read -ra SCHEMA_LIST <<< "${APP_SCHEMAS}"
for s in "${SCHEMA_LIST[@]}"; do
  s_trimmed="$(echo "$s" | xargs)"
  [[ -n "${s_trimmed}" ]] && SCHEMA_ARGS+=(--schema "${s_trimmed}")
done

if [[ ${#SCHEMA_ARGS[@]} -eq 0 ]]; then
  echo "No valid schemas provided in APP_SCHEMAS." | tee -a "${LOG_FILE}"
  exit 1
fi

echo "==> 1) Backup current staging schema (rollback asset)" | tee -a "${LOG_FILE}"
supabase db dump \
  --db-url "${STAGING_DB_URL}" \
  "${SCHEMA_ARGS[@]}" \
  --schema-only \
  -f "${STAGING_PRE_BACKUP}" | tee -a "${LOG_FILE}"

echo "==> 2) Dump production schema-only" | tee -a "${LOG_FILE}"
supabase db dump \
  --db-url "${PROD_DB_URL}" \
  "${SCHEMA_ARGS[@]}" \
  --schema-only \
  -f "${SCHEMA_DUMP}" | tee -a "${LOG_FILE}"

echo "==> 3) Apply schema dump to staging" | tee -a "${LOG_FILE}"
psql "${STAGING_DB_URL}" -v ON_ERROR_STOP=1 -f "${SCHEMA_DUMP}" | tee -a "${LOG_FILE}"

if [[ -f "${RLS_FILE}" ]]; then
  echo "==> 4) Apply RLS policies file: ${RLS_FILE}" | tee -a "${LOG_FILE}"
  psql "${STAGING_DB_URL}" -v ON_ERROR_STOP=1 -f "${RLS_FILE}" | tee -a "${LOG_FILE}"
else
  echo "==> 4) Skipping RLS apply (file not found: ${RLS_FILE})" | tee -a "${LOG_FILE}"
fi

echo "==> 5) Quick validation" | tee -a "${LOG_FILE}"
psql "${STAGING_DB_URL}" -v ON_ERROR_STOP=1 -c "\dt public.*" | tee -a "${LOG_FILE}"
psql "${STAGING_DB_URL}" -v ON_ERROR_STOP=1 -c "\dRp+" | tee -a "${LOG_FILE}"

echo "==> Done."
echo "Artifacts:"
echo "  - ${SCHEMA_DUMP}"
echo "  - ${STAGING_PRE_BACKUP} (rollback source)"
echo "  - ${LOG_FILE}"
