#!/usr/bin/env bash
# Запуск deploy/remote-release.sh на VPS в отдельной сессии.
# Короткий ssh только стартует процесс или читает статус. Обрыв SSH
# не шлёт SIGHUP сборке: её держит flock, повторный старт не создаёт вторую.
set -euo pipefail

REMOTE_DIR="${DVARF_REMOTE_DIR:-/opt/dvarf}"
STATE_DIR="${DVARF_STATE_DIR:-/var/lib/dvarf}"
STALE_SECONDS="${DVARF_RELEASE_STALE_SECONDS:-20}"

if [[ "$REMOTE_DIR" == *..* || ! "$REMOTE_DIR" =~ ^/opt/[A-Za-z0-9_-]+$ ]]; then
  echo "DVARF_REMOTE_DIR отклонён: ${REMOTE_DIR}" >&2
  exit 1
fi
if [[ "$STATE_DIR" == *..* || "$STATE_DIR" != /* ]]; then
  echo "DVARF_STATE_DIR отклонён: ${STATE_DIR}" >&2
  exit 1
fi
if [[ ! "$STALE_SECONDS" =~ ^[0-9]+$ ]]; then
  echo "DVARF_RELEASE_STALE_SECONDS отклонён: ${STALE_SECONDS}" >&2
  exit 1
fi

LOCK_FILE="${STATE_DIR}/release.lock"
STATE_FILE="${STATE_DIR}/release.state"
EXIT_FILE="${STATE_DIR}/release.exit"
PID_FILE="${STATE_DIR}/release.pid"
LOG_FILE="${STATE_DIR}/release.log"
SPAWN_LOG="${STATE_DIR}/release.spawn.log"
LOG_CHUNK=100000

ensure_dir() {
  mkdir -p "$STATE_DIR"
}

write_state() {
  local value="$1"
  local tmp
  tmp="${STATE_FILE}.tmp.$$"
  printf '%s\n' "$value" >"$tmp"
  mv "$tmp" "$STATE_FILE"
}

write_exit() {
  local value="$1"
  local tmp
  tmp="${EXIT_FILE}.tmp.$$"
  printf '%s\n' "$value" >"$tmp"
  mv "$tmp" "$EXIT_FILE"
}

pid_alive() {
  local pid="$1"
  [[ "$pid" =~ ^[0-9]+$ ]] || return 1
  kill -0 "$pid" 2>/dev/null
}

mark_vanished() {
  if [[ ! -s "$LOG_FILE" ]] || ! grep -q "процесс выкладки исчез" "$LOG_FILE" 2>/dev/null; then
    echo "remote-release: процесс выкладки исчез без кода выхода (возможен сигнал, часто это нехватка памяти)." >>"$LOG_FILE"
  fi
  if [[ -s "$SPAWN_LOG" ]]; then
    echo "remote-release: журнал запуска:" >>"$LOG_FILE"
    tail -n 20 "$SPAWN_LOG" >>"$LOG_FILE" || true
  fi
  write_exit 1
  write_state failed
}

# fd 9 держит эксклюзивный flock на всё время сборки.
# Дочерний setsid наследует описание файла, поэтому блокировка
# живёт после выхода короткого ssh.
heal_if_stale() {
  local state pid now mtime age
  [[ -f "$STATE_FILE" ]] || return 0
  state="$(tr -d '\r' <"$STATE_FILE" || true)"
  [[ "$state" == "running" ]] || return 0
  pid=""
  if [[ -f "$PID_FILE" ]]; then
    pid="$(tr -d '[:space:]' <"$PID_FILE" || true)"
  fi
  if pid_alive "$pid"; then
    return 0
  fi
  now="$(date +%s)"
  mtime="$(stat -c %Y "$STATE_FILE" 2>/dev/null || echo "$now")"
  age=$((now - mtime))
  if (( age < STALE_SECONDS )); then
    return 0
  fi
  exec 9>>"$LOCK_FILE"
  if ! flock -n 9; then
    return 0
  fi
  state="$(tr -d '\r' <"$STATE_FILE" || true)"
  pid=""
  if [[ -f "$PID_FILE" ]]; then
    pid="$(tr -d '[:space:]' <"$PID_FILE" || true)"
  fi
  if [[ "$state" == "running" ]] && ! pid_alive "$pid"; then
    mark_vanished
  fi
}

cmd_start() {
  ensure_dir
  touch "$LOCK_FILE"
  exec 9>>"$LOCK_FILE"
  if ! flock -n 9; then
    echo "START=already-running"
    exit 0
  fi
  write_state running
  : >"$LOG_FILE"
  rm -f "$EXIT_FILE" "$PID_FILE"
  : >"$SPAWN_LOG"
  # setsid --fork: родитель сразу выходит, ребёнок — новая сессия без SIGHUP от sshd.
  if ! setsid --fork bash "$0" worker </dev/null >>"$SPAWN_LOG" 2>&1; then
    echo "remote-release: не удалось отделить процесс (setsid --fork)." >>"$LOG_FILE"
    write_exit 1
    write_state failed
    echo "START=spawn-failed" >&2
    exit 1
  fi
  echo "START=launched"
}

cmd_worker() {
  local code=0
  trap '' HUP
  # fd 9 открыт родителем и держит flock. Без него повторный ssh смог бы
  # стартовать вторую сборку.
  if [[ ! -e /proc/$$/fd/9 ]]; then
    ensure_dir
    echo "remote-release: блокировка не унаследована, выкладку не продолжаю." >>"$LOG_FILE"
    write_exit 1
    write_state failed
    exit 1
  fi
  ensure_dir
  printf '%s\n' "$$" >"$PID_FILE"
  echo "remote-release: фоновый запуск pid $$" >>"$LOG_FILE"
  if [[ ! -f "$REMOTE_DIR/deploy/remote-release.sh" ]]; then
    echo "ERROR: нет ${REMOTE_DIR}/deploy/remote-release.sh" >>"$LOG_FILE"
    code=1
  else
    set +e
    DVARF_REMOTE_DIR="$REMOTE_DIR" bash "$REMOTE_DIR/deploy/remote-release.sh" >>"$LOG_FILE" 2>&1
    code=$?
    set -e
  fi
  write_exit "$code"
  if (( code == 0 )); then
    write_state success
  else
    write_state failed
  fi
  exit "$code"
}

cmd_status() {
  ensure_dir
  touch "$LOCK_FILE"
  heal_if_stale
  local state="" exit_code="" pid="" alive=0
  if [[ -f "$STATE_FILE" ]]; then
    state="$(tr -d '\r' <"$STATE_FILE" || true)"
  fi
  if [[ -z "$state" ]]; then
    state="idle"
  fi
  if [[ -f "$EXIT_FILE" ]]; then
    exit_code="$(tr -d '[:space:]' <"$EXIT_FILE" || true)"
  fi
  if [[ -f "$PID_FILE" ]]; then
    pid="$(tr -d '[:space:]' <"$PID_FILE" || true)"
  fi
  if pid_alive "$pid"; then
    alive=1
  fi
  printf 'STATE=%s\n' "$state"
  printf 'EXIT=%s\n' "$exit_code"
  printf 'PID=%s\n' "$pid"
  printf 'ALIVE=%s\n' "$alive"
}

cmd_log() {
  local offset="${1:-0}"
  if [[ ! "$offset" =~ ^[0-9]+$ ]]; then
    echo "log: offset отклонён" >&2
    exit 1
  fi
  ensure_dir
  if [[ ! -f "$LOG_FILE" ]]; then
    printf 'RANGE 0 0 0\n'
    return 0
  fi
  local size count end
  size="$(wc -c <"$LOG_FILE" | tr -d '[:space:]')"
  if (( offset > size )); then
    offset=0
  fi
  count=$((size - offset))
  if (( count > LOG_CHUNK )); then
    count=$LOG_CHUNK
  fi
  end=$((offset + count))
  printf 'RANGE %s %s %s\n' "$offset" "$end" "$size"
  if (( count > 0 )); then
    tail -c +$((offset + 1)) "$LOG_FILE" | head -c "$count" || true
  fi
}

usage() {
  echo "usage: remote-release-ctl.sh start|status|log [offset]|worker" >&2
  exit 1
}

main() {
  local cmd="${1:-}"
  if ! command -v flock >/dev/null 2>&1 || ! command -v setsid >/dev/null 2>&1; then
    echo "Нужны flock и setsid из util-linux." >&2
    exit 1
  fi
  if [[ $# -gt 0 ]]; then
    shift
  fi
  case "$cmd" in
    start) cmd_start "$@" ;;
    status) cmd_status "$@" ;;
    log) cmd_log "$@" ;;
    worker) cmd_worker "$@" ;;
    *) usage ;;
  esac
}

main "$@"
