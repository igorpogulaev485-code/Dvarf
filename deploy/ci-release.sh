#!/usr/bin/env bash
# Доставка дерева на Timeweb из GitHub Actions.
# Не печатает секреты, не удаляет /opt/dvarf целиком, не затирает .env и данные.
# Долгий remote-release идёт на сервере в своей сессии. Здесь только короткие ssh:
# старт, журнал, статус. Код 255 — обрыв ssh; его повторяем. Ненулевой выход
# наружу — ошибка сборки, миграции, health-check или так и не восстановившийся ssh.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

require_var() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Пустой секрет ${name}. Как завести: docs/deploy.md" >&2
    exit 1
  fi
}

require_var DEPLOY_HOST
require_var DEPLOY_USER
require_var DEPLOY_SSH_KEY
require_var DEPLOY_PATH
require_var DEPLOY_KNOWN_HOSTS

if [[ ! "$DEPLOY_HOST" =~ ^[A-Za-z0-9._-]+$ ]]; then
  echo "DEPLOY_HOST: допустимы буквы, цифры, точка, _ и -" >&2
  exit 1
fi
if [[ ! "$DEPLOY_USER" =~ ^[A-Za-z_][A-Za-z0-9_-]*$ ]]; then
  echo "DEPLOY_USER: ожидается имя SSH-пользователя (например root)" >&2
  exit 1
fi

path="${DEPLOY_PATH%/}"
if [[ "$path" == *..* || ! "$path" =~ ^/opt/[A-Za-z0-9_-]+$ ]]; then
  echo "DEPLOY_PATH должен быть каталогом вида /opt/dvarf" >&2
  exit 1
fi

if [[ ! -f "$ROOT/frontend/dist/index.html" ]]; then
  echo "Нет frontend/dist/index.html — в выкладку не попала сборка фронтенда" >&2
  exit 1
fi
if [[ ! -f "$ROOT/deploy/rsync-filter.txt" ]]; then
  echo "Нет deploy/rsync-filter.txt" >&2
  exit 1
fi

tmp="$(mktemp -d)"
LOCAL_LOG=""
cleanup() {
  rm -rf "$tmp"
  if [[ -n "${LOCAL_LOG:-}" ]]; then
    rm -f "$LOCAL_LOG"
  fi
}
trap cleanup EXIT
chmod 700 "$tmp"

printf '%s\n' "$DEPLOY_SSH_KEY" | tr -d '\r' >"$tmp/id"
chmod 600 "$tmp/id"
if ! ssh-keygen -y -f "$tmp/id" >/dev/null; then
  echo "DEPLOY_SSH_KEY не читается как приватный ключ OpenSSH без passphrase" >&2
  exit 1
fi

printf '%s\n' "$DEPLOY_KNOWN_HOSTS" | tr -d '\r' >"$tmp/known_hosts"
chmod 644 "$tmp/known_hosts"
if ! ssh-keygen -F "$DEPLOY_HOST" -f "$tmp/known_hosts" >/dev/null; then
  echo "В DEPLOY_KNOWN_HOSTS нет строки для ${DEPLOY_HOST}." >&2
  echo "Первое поле строки host key должно совпадать с DEPLOY_HOST." >&2
  exit 1
fi

# ConnectTimeout — на рукопожатие. ServerAlive* — чтобы тихий канал
# (долгий docker build без байтов в ssh) не считали мёртвым.
ssh_base=(
  ssh
  -i "$tmp/id"
  -o BatchMode=yes
  -o IdentitiesOnly=yes
  -o StrictHostKeyChecking=yes
  -o "UserKnownHostsFile=${tmp}/known_hosts"
  -o ConnectTimeout=20
  -o ServerAliveInterval=15
  -o ServerAliveCountMax=4
  -o TCPKeepAlive=yes
)

quoted_path="$(printf '%q' "$path")"
target="${DEPLOY_USER}@${DEPLOY_HOST}"
wait_seconds="${DVARF_RELEASE_WAIT_SECONDS:-2700}"
poll_seconds="${DVARF_RELEASE_POLL_SECONDS:-5}"
ssh_attempts="${DVARF_SSH_ATTEMPTS:-3}"
ssh_retry_sleep="${DVARF_SSH_RETRY_SLEEP:-5}"
if [[ ! "$wait_seconds" =~ ^[0-9]+$ || ! "$poll_seconds" =~ ^[0-9]+$ ]]; then
  echo "DVARF_RELEASE_WAIT_SECONDS и DVARF_RELEASE_POLL_SECONDS должны быть числами" >&2
  exit 1
fi
if [[ ! "$ssh_attempts" =~ ^[0-9]+$ || "$ssh_attempts" -lt 1 ]]; then
  echo "DVARF_SSH_ATTEMPTS должен быть положительным числом" >&2
  exit 1
fi
if [[ ! "$ssh_retry_sleep" =~ ^[0-9]+$ ]]; then
  echo "DVARF_SSH_RETRY_SLEEP должен быть числом" >&2
  exit 1
fi

SSH_CAPTURE=""
RELEASE_STATE=""
RELEASE_EXIT=""
LOG_OFFSET=0
LOCAL_LOG="$(mktemp)"
DEADLINE=$((SECONDS + wait_seconds))

retry_pause() {
  local attempt="$1"
  local pause="$ssh_retry_sleep"
  if (( attempt >= 2 )); then
    pause=$((ssh_retry_sleep * 3))
  fi
  if (( pause > 0 )); then
    sleep "$pause"
  fi
}

# Печатает stdout в SSH_CAPTURE. Код 255 повторяет. Прочие коды — как есть.
ssh_capture() {
  local attempt=1 code=0
  local out err
  out="$(mktemp)"
  err="$(mktemp)"
  SSH_CAPTURE=""
  while (( attempt <= ssh_attempts )); do
    set +e
    "${ssh_base[@]}" "$@" >"$out" 2>"$err"
    code=$?
    set -e
    if (( code != 255 )); then
      if [[ -s "$err" ]]; then
        cat "$err" >&2
      fi
      SSH_CAPTURE="$(cat "$out")"
      rm -f "$out" "$err"
      # set -e и return с ненулевым кодом завершают весь shell, даже если
      # вызывающий сделал set +e. Сбрасываем -e прямо перед return.
      set +e
      return "$code"
    fi
    echo "ci-release: ssh оборвался (код 255), попытка ${attempt}/${ssh_attempts}" >&2
    if [[ -s "$err" ]]; then
      cat "$err" >&2
    fi
    if (( attempt < ssh_attempts )); then
      retry_pause "$attempt"
    fi
    attempt=$((attempt + 1))
  done
  rm -f "$out" "$err"
  echo "ci-release: ssh не восстановился после ${ssh_attempts} попыток (код 255). Это обрыв соединения, не ошибка сборки, миграции или health-check." >&2
  set +e
  return 255
}

remote_ctl() {
  local sub="$1"
  shift
  local cmd arg
  cmd="$(printf 'DVARF_REMOTE_DIR=%s bash %s/deploy/remote-release-ctl.sh %q' \
    "$quoted_path" "$quoted_path" "$sub")"
  for arg in "$@"; do
    cmd+=" $(printf '%q' "$arg")"
  done
  printf '%s' "$cmd"
}

parse_status() {
  RELEASE_STATE="$(printf '%s\n' "$SSH_CAPTURE" | awk -F= '$1=="STATE"{print $2; exit}')"
  RELEASE_EXIT="$(printf '%s\n' "$SSH_CAPTURE" | awk -F= '$1=="EXIT"{print $2; exit}')"
  RELEASE_STATE="${RELEASE_STATE//$'\r'/}"
  RELEASE_EXIT="${RELEASE_EXIT//$'\r'/}"
  if [[ -z "$RELEASE_STATE" ]]; then
    echo "ci-release: в ответе статуса нет STATE" >&2
    return 1
  fi
}

drain_log() {
  local guard=0 line end size body code
  while (( guard < 40 )); do
    guard=$((guard + 1))
    if [[ ! "$LOG_OFFSET" =~ ^[0-9]+$ ]]; then
      LOG_OFFSET=0
    fi
    set +e
    ssh_capture "$target" "$(remote_ctl log "$LOG_OFFSET")"
    code=$?
    set -e
    if (( code != 0 )); then
      set +e
      return "$code"
    fi
    line="$(printf '%s\n' "$SSH_CAPTURE" | awk '/^RANGE [0-9]+ [0-9]+ [0-9]+$/ {print; exit}')"
    if [[ ! "$line" =~ ^RANGE\ ([0-9]+)\ ([0-9]+)\ ([0-9]+)$ ]]; then
      echo "ci-release: неожиданный ответ журнала" >&2
      set +e
      return 1
    fi
    end="${BASH_REMATCH[2]}"
    size="${BASH_REMATCH[3]}"
    body="$(printf '%s\n' "$SSH_CAPTURE" | awk 'seen {print} /^RANGE [0-9]+ [0-9]+ [0-9]+$/ {seen=1}')"
    if [[ -n "$body" ]]; then
      printf '%s\n' "$body" | tee -a "$LOCAL_LOG"
    fi
    LOG_OFFSET="$end"
    if (( end >= size )); then
      return 0
    fi
  done
}

maybe_memory_hint() {
  local hit=0
  if [[ -s "$LOCAL_LOG" ]] && grep -Eiq 'нехватка памяти|cannot allocate memory|out of memory|oom-kill|ENOMEM' "$LOCAL_LOG"; then
    hit=1
  fi
  if [[ -s "$LOCAL_LOG" ]] && grep -Eq '(^|[^[:alnum:]])Killed([^[:alnum:]]|$)' "$LOCAL_LOG"; then
    hit=1
  fi
  if [[ "${RELEASE_EXIT:-}" == "137" ]]; then
    hit=1
  fi
  if (( hit == 1 )); then
    echo "ci-release: похоже на нехватку памяти на VPS во время сборки. Workflow память и swap не меняет. На сервере вручную: free -h; если Swap 0 — добавить swap (например 2 ГБ). Большой кэш сборки снимается отдельно: docker builder prune -f. Тома Postgres и .env эта команда не удаляет."
  fi
}

finish_failure() {
  local code="${RELEASE_EXIT:-1}"
  if [[ ! "$code" =~ ^[0-9]+$ || "$code" == "0" ]]; then
    code=1
  fi
  echo "ci-release: серверные шаги завершились с ошибкой (код ${code})."
  if [[ ! -s "$LOCAL_LOG" ]] || ! grep -q "remote-release: перезапуск" "$LOCAL_LOG"; then
    echo "ci-release: шаг перезапуска не начался, старые контейнеры продолжают работать."
  fi
  maybe_memory_hint
  exit "$code"
}

past_deadline() {
  if (( SECONDS >= DEADLINE )); then
    echo "ci-release: за отведённое время сервер не закончил. Процесс на VPS не останавливаю. Повторный Deploy дождётся этой выкладки и не начнёт вторую сборку, пока она идёт." >&2
    exit 1
  fi
}

wait_until_not_running() {
  local announced=0
  while true; do
    past_deadline
    if ! ssh_capture "$target" "$(remote_ctl status)"; then
      echo "ci-release: не удалось прочитать статус перед rsync." >&2
      exit 1
    fi
    parse_status
    if [[ "$RELEASE_STATE" != "running" ]]; then
      return 0
    fi
    if (( announced == 0 )); then
      echo "ci-release: на сервере уже идёт выкладка, жду её перед rsync. Вторую сборку параллельно не запускаю."
      announced=1
    fi
    drain_log
    sleep "$poll_seconds"
  done
}

retry_rsync() {
  local attempt=1 code=0
  local rsh
  rsh="$(printf '%q ' "${ssh_base[@]}")"
  while (( attempt <= ssh_attempts )); do
    echo "rsync → ${DEPLOY_USER}@${DEPLOY_HOST}:${path}/"
    set +e
    rsync -az --delete \
      --filter "merge ${ROOT}/deploy/rsync-filter.txt" \
      -e "$rsh" \
      "${ROOT}/" "${DEPLOY_USER}@${DEPLOY_HOST}:${path}/"
    code=$?
    set -e
    if (( code == 0 )); then
      return 0
    fi
    if (( code != 255 )); then
      echo "ci-release: rsync завершился с кодом ${code}." >&2
      exit "$code"
    fi
    echo "ci-release: rsync оборвался (код 255), попытка ${attempt}/${ssh_attempts}" >&2
    if (( attempt < ssh_attempts )); then
      retry_pause "$attempt"
    fi
    attempt=$((attempt + 1))
  done
  echo "ci-release: rsync не восстановился после ${ssh_attempts} попыток (код 255). Это обрыв соединения, не ошибка сборки. Каталог на сервере мог обновиться частично; .env и тома скрипт не удаляет. Повторите Deploy." >&2
  exit 1
}

launch_and_wait() {
  local start_line
  echo "сборка, alembic, затем перезапуск (на сервере в фоне, этот job ждёт журнал)"
  if ! ssh_capture "$target" "$(remote_ctl start)"; then
    echo "ci-release: не удалось запустить выкладку на сервере." >&2
    if [[ -n "$SSH_CAPTURE" ]]; then
      printf '%s\n' "$SSH_CAPTURE" >&2
    fi
    exit 1
  fi
  start_line="$(printf '%s\n' "$SSH_CAPTURE" | awk '/^START=/{print; exit}')"
  case "$start_line" in
    START=launched)
      echo "ci-release: сборка запущена на сервере в фоне."
      ;;
    START=already-running)
      echo "ci-release: сборка на сервере уже идёт, подключаюсь к ней и вторую не стартую."
      ;;
    *)
      echo "ci-release: сервер не подтвердил запуск (${start_line:-пустой ответ})." >&2
      exit 1
      ;;
  esac
  : >"$LOCAL_LOG"
  LOG_OFFSET=0
  while true; do
    past_deadline
    if ! ssh_capture "$target" "$(remote_ctl status)"; then
      echo "ci-release: связь со сервером пропала, итог выкладки неизвестен. Повторите Deploy: если процесс ещё жив, job дождётся его и не начнёт вторую сборку." >&2
      exit 1
    fi
    parse_status
    drain_log || true
    case "$RELEASE_STATE" in
      success)
        echo "ci-release: серверные шаги завершились"
        return 0
        ;;
      failed)
        finish_failure
        ;;
      running)
        ;;
      idle)
        echo "ci-release: после запуска на сервере нет активной выкладки." >&2
        exit 1
        ;;
      *)
        echo "ci-release: неизвестное состояние ${RELEASE_STATE}." >&2
        exit 1
        ;;
    esac
    sleep "$poll_seconds"
  done
}

echo "проверка, не идёт ли уже выкладка"
set +e
ssh_capture "$target" "test -f ${quoted_path}/deploy/remote-release-ctl.sh"
probe=$?
set -e
if (( probe == 255 )); then
  echo "ci-release: нет устойчивого SSH до rsync. Повторите Deploy. Если сборка на сервере уже шла, новый запуск дождётся её." >&2
  exit 1
fi
if (( probe == 0 )); then
  wait_until_not_running
  : >"$LOCAL_LOG"
  LOG_OFFSET=0
fi

retry_rsync
launch_and_wait
