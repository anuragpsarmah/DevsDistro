#!/usr/bin/env bash
# Run from your local machine:
#   bash infra/scripts/pull_logs.sh
#   bash infra/scripts/pull_logs.sh backend-api backend-worker
#   bash infra/scripts/pull_logs.sh --output-root ../frontend worker
set -euo pipefail

REMOTE="anurag@161.97.91.246"
KEY="${HOME}/.ssh/contabo-server"
OUTPUT_ROOT="${PWD}"
SINCE_DOCKER="48h"
SINCE_JOURNAL="48 hours ago"
MARKER_TOKEN="devsdistro-$(date +%s)-$$"

ALL_TARGETS=("backend-api" "backend-worker" "cities" "nginx")
declare -A TARGET_FILES=(
  ["backend-api"]="backend-api.log"
  ["backend-worker"]="backend-worker.log"
  ["cities"]="cities.log"
  ["nginx"]="nginx.log"
)

selected_targets=()

add_target() {
  local target="$1"
  local existing
  for existing in "${selected_targets[@]:-}"; do
    if [[ "${existing}" == "${target}" ]]; then
      return
    fi
  done
  selected_targets+=("${target}")
}

resolve_targets() {
  if [[ $# -eq 0 ]]; then
    set -- "all"
  fi

  local item normalized target
  for item in "$@"; do
    normalized="${item,,}"
    case "${normalized}" in
      all)
        for target in "${ALL_TARGETS[@]}"; do
          add_target "${target}"
        done
        ;;
      api|backend|backend-api)
        add_target "backend-api"
        ;;
      worker|backend-worker)
        add_target "backend-worker"
        ;;
      cities)
        add_target "cities"
        ;;
      nginx)
        add_target "nginx"
        ;;
      *)
        echo "Unknown log target '${item}'. Valid values: all, api, backend, backend-api, worker, backend-worker, cities, nginx" >&2
        exit 1
        ;;
    esac
  done
}

target_args=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --output-root|-o)
      if [[ $# -lt 2 ]]; then
        echo "Missing value for $1" >&2
        exit 1
      fi
      OUTPUT_ROOT="$2"
      shift 2
      ;;
    *)
      target_args+=("$1")
      shift
      ;;
  esac
done

OUT="${OUTPUT_ROOT}/logs/devsdistro-logs-$(date +%Y%m%d-%H%M%S)"

resolve_targets "${target_args[@]}"

echo "==> Pulling logs: ${selected_targets[*]}"

stream_file="$(mktemp)"
ssh_error_file="$(mktemp)"
cleanup() {
  rm -f "${stream_file}"
  rm -f "${ssh_error_file}"
}
trap cleanup EXIT

remote_script="$(cat <<'REMOTE_SCRIPT'
set -uo pipefail

since_docker="$1"
since_journal="$2"
marker_token="$3"
shift 3

emit_start() {
  printf '__DEVS_DISTRO_LOG_START__:%s:%s\n' "$marker_token" "$1"
}

emit_end() {
  printf '__DEVS_DISTRO_LOG_END__:%s:%s\n' "$marker_token" "$1"
}

pull_backend_api() {
  docker logs --since="$since_docker" backend-blue 2>&1 ||
    docker logs --since="$since_docker" backend-green 2>&1 ||
    printf 'WARNING: Could not pull API logs\n'
}

pull_backend_worker() {
  docker logs --since="$since_docker" backend-worker 2>&1 ||
    printf 'WARNING: Could not pull worker logs\n'
}

pull_cities() {
  docker logs --since="$since_docker" cities 2>&1 ||
    printf 'WARNING: Could not pull cities logs\n'
}

pull_nginx() {
  journalctl -u nginx --since="$since_journal" --no-pager 2>/dev/null
  tail -n +1 /var/log/nginx/access.log /var/log/nginx/error.log 2>/dev/null ||
    true
}

for target in "$@"; do
  case "$target" in
    backend-api)
      emit_start "backend-api.log"
      pull_backend_api
      emit_end "backend-api.log"
      ;;
    backend-worker)
      emit_start "backend-worker.log"
      pull_backend_worker
      emit_end "backend-worker.log"
      ;;
    cities)
      emit_start "cities.log"
      pull_cities
      emit_end "cities.log"
      ;;
    nginx)
      emit_start "nginx.log"
      pull_nginx
      emit_end "nginx.log"
      ;;
  esac
done
REMOTE_SCRIPT
)"

remote_script_b64="$(printf '%s' "${remote_script}" | base64 | tr -d '\n')"
remote_command="printf %s $(printf "%q" "${remote_script_b64}") | base64 -d | bash -s --"
for arg in "${SINCE_DOCKER}" "${SINCE_JOURNAL}" "${MARKER_TOKEN}" "${selected_targets[@]}"; do
  remote_command+=" $(printf "%q" "${arg}")"
done

if ssh -T -i "${KEY}" "${REMOTE}" "${remote_command}" >"${stream_file}"; then
  :
else
  ssh_status=$?
  ssh -o BatchMode=yes -T -i "${KEY}" "${REMOTE}" "${remote_command}" 1>/dev/null 2>"${ssh_error_file}" || true
  ssh_error_message="$(<"${ssh_error_file}")"
  ssh_error_message="${ssh_error_message%"${ssh_error_message##*[!$'\r\n']}"}"
  echo "ERROR: Failed to pull logs via SSH (exit ${ssh_status})." >&2
  if [[ -n "${ssh_error_message}" ]]; then
    printf '%s\n' "${ssh_error_message}" >&2
  fi
  if [[ "${ssh_error_message}" == *"Permission denied"* || "${ssh_status}" -eq 255 ]]; then
    printf '%s\n' 'Hint: SSH key auth failed and the interactive password login did not complete. If you want a prompt, run the script directly in the terminal and enter the server password when ssh asks.' >&2
  fi
  echo "==> Log pull failed. No log folder was created." >&2
  exit 1
fi

mkdir -p "${OUT}"
OUT="$(cd "${OUT}" && pwd)"

start_prefix="__DEVS_DISTRO_LOG_START__:${MARKER_TOKEN}:"
end_prefix="__DEVS_DISTRO_LOG_END__:${MARKER_TOKEN}:"
current_file=""

while IFS= read -r line || [[ -n "${line}" ]]; do
  if [[ "${line}" == "${start_prefix}"* ]]; then
    current_file="${line#${start_prefix}}"
    : >"${OUT}/${current_file}"
    continue
  fi

  if [[ "${line}" == "${end_prefix}"* ]]; then
    current_file=""
    continue
  fi

  if [[ -n "${current_file}" ]]; then
    printf '%s\n' "${line}" >>"${OUT}/${current_file}"
  fi
done <"${stream_file}"

for target in "${selected_targets[@]}"; do
  file_name="${TARGET_FILES[${target}]}"
  if [[ ! -f "${OUT}/${file_name}" ]]; then
    : >"${OUT}/${file_name}"
    echo "WARNING: No output was returned for ${file_name}" >&2
  fi
done

echo "==> Done. Logs saved to ${OUT}/"
ls -lh "${OUT}/"
