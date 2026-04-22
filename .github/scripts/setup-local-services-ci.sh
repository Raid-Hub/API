#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VERSIONS_FILE="${ROOT_DIR}/.github/ci/versions.env"
SERVICES_DIR="${ROOT_DIR}/RaidHub-Services"

if [[ ! -f "${VERSIONS_FILE}" ]]; then
    echo "Missing versions file at ${VERSIONS_FILE}"
    exit 1
fi

set -a
source "${VERSIONS_FILE}"
set +a

if [[ -z "${RAIDHUB_SERVICES_REPO:-}" || -z "${RAIDHUB_SERVICES_COMMIT:-}" ]]; then
    echo "RAIDHUB_SERVICES_REPO and RAIDHUB_SERVICES_COMMIT must be set in ${VERSIONS_FILE}"
    exit 1
fi

if [[ ! "${RAIDHUB_SERVICES_COMMIT}" =~ ^[0-9a-f]{40}$ ]]; then
    echo "RAIDHUB_SERVICES_COMMIT must be a full 40-character commit hash"
    exit 1
fi

echo "Checking out ${RAIDHUB_SERVICES_REPO}@${RAIDHUB_SERVICES_COMMIT}"
rm -rf "${SERVICES_DIR}"
git init "${SERVICES_DIR}"
git -C "${SERVICES_DIR}" remote add origin "https://github.com/${RAIDHUB_SERVICES_REPO}.git"
git -C "${SERVICES_DIR}" fetch --depth=1 origin "${RAIDHUB_SERVICES_COMMIT}"
git -C "${SERVICES_DIR}" checkout --detach FETCH_HEAD

cp "${SERVICES_DIR}/example.env" "${SERVICES_DIR}/.env"

cat <<'EOF' >> "${SERVICES_DIR}/.env"
POSTGRES_DB=raidhub
POSTGRES_USER=dev
POSTGRES_PASSWORD=password
RABBITMQ_USER=dev
RABBITMQ_PASSWORD=password
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=
EOF

docker compose -f "${SERVICES_DIR}/docker-compose.yml" --env-file "${SERVICES_DIR}/.env" up -d postgres rabbitmq clickhouse prometheus

wait_for() {
    local name="$1"
    local cmd="$2"
    local attempts="${3:-60}"
    local sleep_seconds="${4:-2}"

    for _ in $(seq 1 "${attempts}"); do
        if eval "${cmd}" >/dev/null 2>&1; then
            echo "${name} is ready"
            return 0
        fi
        sleep "${sleep_seconds}"
    done

    echo "${name} did not become ready in time"
    return 1
}

echo "Waiting for PostgreSQL..."
wait_for "PostgreSQL" "docker compose -f \"${SERVICES_DIR}/docker-compose.yml\" --env-file \"${SERVICES_DIR}/.env\" exec -T postgres pg_isready -U dev -d raidhub"

echo "Waiting for ClickHouse..."
wait_for "ClickHouse" "curl -fsS \"http://localhost:8123/ping\" | grep -q '^Ok\\.$'"

echo "Waiting for RabbitMQ API..."
wait_for "RabbitMQ API" "curl -fsS -u \"dev:password\" \"http://localhost:15672/api/overview\""

(
    cd "${SERVICES_DIR}"
    make migrate
    make seed
)

if [[ -n "${GITHUB_ENV:-}" ]]; then
    echo "RAIDHUB_SERVICES_DIR=${SERVICES_DIR}" >> "${GITHUB_ENV}"
fi
