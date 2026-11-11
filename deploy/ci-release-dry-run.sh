#!/usr/bin/env bash
# Сухой прогон ci-release.sh с фейковыми ssh и rsync. На VPS не ходит.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DRY_ROOT="$(mktemp -d)"
BIN_DIR="${DRY_ROOT}/bin"
KEY_DIR="${DRY_ROOT}/keys"
REMOTE_DIR="/opt/dvarf-ssh-dry"
CREATED_DIST=0
FAILS=0

# Вызывается из trap EXIT; shellcheck иначе считает тело недостижимым.
# shellcheck disable=SC2317
cleanup() {
  local pid
  if [[ -d "$DRY_ROOT/states" ]]; then
    while IFS= read -r pidfile; do
      pid="$(tr -d '[:space:]' <"$pidfile" || true)"
      if [[ "$pid" =~ ^[0-9]+$ ]]; then
        kill -9 -"$pid" 2>/dev/null || kill -9 "$pid" 2>/dev/null || true
      fi
    done < <(find "$DRY_ROOT/states" -name release.pid -type f 2>/dev/null || true)
  fi
  if (( CREATED_DIST == 1 )); then
    rm -f "$ROOT/frontend/dist/index.html"
    rmdir "$ROOT/frontend/dist" 2>/dev/null || true
  fi
  if [[ -d "$REMOTE_DIR" ]]; then
    rm -rf "$REMOTE_DIR" 2>/dev/null || sudo rm -rf "$REMOTE_DIR" || true
  fi
  rm -rf "$DRY_ROOT"
}
trap cleanup EXIT

if [[ ! -f "$ROOT/frontend/dist/index.html" ]]; then
  mkdir -p "$ROOT/frontend/dist"
  printf 'dry-run\n' >"$ROOT/frontend/dist/index.html"
  CREATED_DIST=1
fi

mkdir -p "$BIN_DIR" "$KEY_DIR" "$DRY_ROOT/states"
if [[ ! -d "$REMOTE_DIR" ]]; then
  if ! mkdir -p "$REMOTE_DIR" 2>/dev/null; then
    sudo mkdir -p "$REMOTE_DIR"
    sudo chown "$(id -u):$(id -g)" "$REMOTE_DIR"
  fi
fi
chmod 755 "$REMOTE_DIR"

ssh-keygen -q -t ed25519 -f "$KEY_DIR/id" -N ""
pub="$(ssh-keygen -y -f "$KEY_DIR/id")"
printf '%s %s\n' "dry-host" "$pub" >"$KEY_DIR/known_hosts"

export DEPLOY_HOST="dry-host"
export DEPLOY_USER="root"
export DEPLOY_PATH="/opt/dvarf"
export DEPLOY_SSH_KEY
DEPLOY_SSH_KEY="$(cat "$KEY_DIR/id")"
export DEPLOY_KNOWN_HOSTS
DEPLOY_KNOWN_HOSTS="$(cat "$KEY_DIR/known_hosts")"
export DVARF_RELEASE_WAIT_SECONDS=30
export DVARF_RELEASE_POLL_SECONDS=1
export DVARF_SSH_ATTEMPTS=3
export DVARF_SSH_RETRY_SLEEP=0
export DRY_ROOT REMOTE_DIR ROOT

cat >"$BIN_DIR/ssh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" >>"$DRY_ROOT/ssh-argv"
remote="${*: -1}"

if [[ -f "$DRY_ROOT/ssh-fails" ]]; then
  left="$(tr -d '[:space:]' <"$DRY_ROOT/ssh-fails")"
  if [[ "$left" =~ ^[0-9]+$ && "$left" -gt 0 ]]; then
    printf '%s\n' "$((left - 1))" >"$DRY_ROOT/ssh-fails"
    echo "fake ssh: connection reset" >&2
    exit 255
  fi
fi

if [[ "$remote" == test\ -f\ * ]]; then
  rel="${remote#test -f ${DEPLOY_PATH}/}"
  if [[ -f "$REMOTE_DIR/$rel" ]]; then
    exit 0
  fi
  exit 1
fi

args=()
if [[ "$remote" == *remote-release-ctl.sh* ]]; then
  rest="${remote##*remote-release-ctl.sh }"
  if [[ "$rest" == "$remote" ]]; then
    rest=""
  fi
  if [[ -n "$rest" ]]; then
    read -r -a args <<<"$rest"
  fi
  if [[ "${args[0]:-}" == "start" && -f "$DRY_ROOT/drop-start" ]]; then
    left="$(tr -d '[:space:]' <"$DRY_ROOT/drop-start")"
    if [[ "$left" =~ ^[0-9]+$ && "$left" -gt 0 ]]; then
      printf '%s\n' "$((left - 1))" >"$DRY_ROOT/drop-start"
      DVARF_REMOTE_DIR="$REMOTE_DIR" DVARF_STATE_DIR="$DRY_STATE" \
        bash "$ROOT/deploy/remote-release-ctl.sh" "${args[@]}"
      echo "fake ssh: dropped after start" >&2
      exit 255
    fi
  fi
  DVARF_REMOTE_DIR="$REMOTE_DIR" DVARF_STATE_DIR="$DRY_STATE" \
    exec bash "$ROOT/deploy/remote-release-ctl.sh" "${args[@]}"
fi

echo "fake ssh: unexpected command: $remote" >&2
exit 1
EOF

cat >"$BIN_DIR/rsync" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
if [[ -f "$DRY_ROOT/rsync-fails" ]]; then
  left="$(tr -d '[:space:]' <"$DRY_ROOT/rsync-fails")"
  if [[ "$left" =~ ^[0-9]+$ && "$left" -gt 0 ]]; then
    printf '%s\n' "$((left - 1))" >"$DRY_ROOT/rsync-fails"
    exit 255
  fi
fi
mkdir -p "$REMOTE_DIR/deploy"
cp "$ROOT/deploy/remote-release-ctl.sh" "$REMOTE_DIR/deploy/remote-release-ctl.sh"
chmod +x "$REMOTE_DIR/deploy/remote-release-ctl.sh"
cp "$DRY_ROOT/mode" "$REMOTE_DIR/mode"
cat >"$REMOTE_DIR/deploy/remote-release.sh" <<'STUB'
#!/usr/bin/env bash
set -euo pipefail
dir="$(cd "$(dirname "$0")/.." && pwd)"
printf 'x\n' >>"$dir/invocations"
mode="$(tr -d '[:space:]' <"$dir/mode")"
case "$mode" in
  ok)
    echo "remote-release: сборка образов, контейнеры пока старые"
    echo "remote-release: alembic upgrade head"
    echo "remote-release: перезапуск"
    echo "remote-up: healthy"
    ;;
  fail)
    echo "remote-release: сборка образов, контейнеры пока старые"
    echo "ERROR: docker compose build failed"
    exit 4
    ;;
  oom)
    echo "remote-release: сборка образов, контейнеры пока старые"
    echo "Killed"
    exit 137
    ;;
  sleep)
    echo "remote-release: сборка образов, контейнеры пока старые"
    sleep "$(tr -d '[:space:]' <"$dir/sleep-for")"
    echo "remote-release: alembic upgrade head"
    echo "remote-release: перезапуск"
    echo "remote-up: healthy"
    ;;
  *)
    echo "stub: unknown mode $mode" >&2
    exit 1
    ;;
esac
STUB
chmod +x "$REMOTE_DIR/deploy/remote-release.sh"
exit 0
EOF
chmod +x "$BIN_DIR/ssh" "$BIN_DIR/rsync"

export PATH="${BIN_DIR}:${PATH}"

pass() {
  printf 'ok  %s\n' "$1"
}

fail() {
  printf 'FAIL %s\n' "$1" >&2
  if [[ -n "${DRY_STATE:-}" && -f "$DRY_STATE/ci.out" ]]; then
    printf '----- %s ci.out -----\n' "$1" >&2
    cat "$DRY_STATE/ci.out" >&2
    printf '----- end -----\n' >&2
  fi
  FAILS=$((FAILS + 1))
}

assert_eq() {
  local got="$1" want="$2" name="$3"
  if [[ "$got" == "$want" ]]; then
    pass "$name"
  else
    fail "$name (got ${got}, want ${want})"
  fi
}

new_state() {
  DRY_STATE="$(mktemp -d "$DRY_ROOT/states/state.XXXXXX")"
  export DRY_STATE
  rm -f "$REMOTE_DIR/invocations"
  : >"$DRY_ROOT/ssh-argv"
}

run_ci() {
  local out code
  set +e
  out="$(bash "$ROOT/deploy/ci-release.sh" 2>&1)"
  code=$?
  set -e
  printf '%s\n' "$out" >"$DRY_STATE/ci.out"
  printf '%s\n' "$code" >"$DRY_STATE/ci.code"
}

# Зонд кэша не должен ронять set -e, даже если docker builder du вернул 255.
probe_out="$(
  bash -c '
    set -euo pipefail
    reclaim_mb="$(bash -c "exit 255" | awk "{ print }" || true)"
    printf "probe:%s\n" "${reclaim_mb:-empty}"
  '
)" || {
  fail "cache probe aborted the shell"
  probe_out=""
}
if [[ "$probe_out" == probe:* ]]; then
  pass "cache probe survives docker exit 255"
else
  fail "cache probe output: ${probe_out}"
fi

# 1. Первый выклад: ctl на сервере ещё нет, затем успешный релиз.
rm -rf "$REMOTE_DIR/deploy"
printf 'ok\n' >"$DRY_ROOT/mode"
new_state
run_ci
assert_eq "$(cat "$DRY_STATE/ci.code")" "0" "success exit"
if grep -q '^ci-release: серверные шаги завершились$' "$DRY_STATE/ci.out"; then
  pass "success summary"
else
  fail "success summary missing"
fi
if grep -q "remote-release: alembic upgrade head" "$DRY_STATE/ci.out" \
  && grep -q "remote-release: фоновый запуск" "$DRY_STATE/ci.out"; then
  pass "build log streamed"
else
  fail "build log streamed"
fi
if grep -q "ServerAliveInterval=15" "$DRY_ROOT/ssh-argv" \
  && grep -q "ServerAliveCountMax=4" "$DRY_ROOT/ssh-argv" \
  && grep -q "ConnectTimeout=20" "$DRY_ROOT/ssh-argv"; then
  pass "ssh keepalive options"
else
  fail "ssh keepalive options"
fi
assert_eq "$(wc -l <"$REMOTE_DIR/invocations" | tr -d '[:space:]')" "1" "one release"

# 2. rsync 255 один раз, затем успех.
printf 'ok\n' >"$DRY_ROOT/mode"
printf '1\n' >"$DRY_ROOT/rsync-fails"
new_state
run_ci
rm -f "$DRY_ROOT/rsync-fails"
assert_eq "$(cat "$DRY_STATE/ci.code")" "0" "rsync retry exit"
if grep -q "rsync оборвался (код 255), попытка 1/3" "$DRY_STATE/ci.out"; then
  pass "rsync retry logged"
else
  fail "rsync retry logged"
fi

# 3. ssh 255 один раз, затем успех.
printf 'ok\n' >"$DRY_ROOT/mode"
printf '1\n' >"$DRY_ROOT/ssh-fails"
new_state
run_ci
rm -f "$DRY_ROOT/ssh-fails"
assert_eq "$(cat "$DRY_STATE/ci.code")" "0" "ssh retry exit"
if grep -q "ssh оборвался (код 255), попытка 1/3" "$DRY_STATE/ci.out"; then
  pass "ssh retry logged"
else
  fail "ssh retry logged"
fi

# 4. start успел отделиться, но ssh вернул 255. Повтор не стартует вторую сборку.
printf 'sleep\n' >"$DRY_ROOT/mode"
printf '2\n' >"$REMOTE_DIR/sleep-for"
printf '1\n' >"$DRY_ROOT/drop-start"
new_state
run_ci
rm -f "$DRY_ROOT/drop-start"
assert_eq "$(cat "$DRY_STATE/ci.code")" "0" "dropped start still finishes"
assert_eq "$(wc -l <"$REMOTE_DIR/invocations" | tr -d '[:space:]')" "1" "dropped start is one release"
if grep -q "уже идёт" "$DRY_STATE/ci.out"; then
  pass "second start attaches"
else
  fail "second start attaches"
fi

# 5. Ошибка сборки до перезапуска.
printf 'fail\n' >"$DRY_ROOT/mode"
new_state
run_ci
assert_eq "$(cat "$DRY_STATE/ci.code")" "4" "build failure exit"
if grep -q "серверные шаги завершились с ошибкой (код 4)" "$DRY_STATE/ci.out" \
  && grep -q "шаг перезапуска не начался, старые контейнеры продолжают работать" "$DRY_STATE/ci.out"; then
  pass "build failure keeps old containers"
else
  fail "build failure keeps old containers"
fi
if grep -q "нехватку памяти" "$DRY_STATE/ci.out" || grep -q "нехватка памяти" "$DRY_STATE/ci.out"; then
  fail "build failure should not suggest swap"
else
  pass "build failure has no swap hint"
fi

# 6. Похоже на OOM.
printf 'oom\n' >"$DRY_ROOT/mode"
new_state
run_ci
assert_eq "$(cat "$DRY_STATE/ci.code")" "137" "oom exit"
if grep -q "похоже на нехватку памяти" "$DRY_STATE/ci.out" \
  && grep -q "swap" "$DRY_STATE/ci.out"; then
  pass "oom hint"
else
  fail "oom hint"
fi

# 7. rsync так и не восстановился — это не ошибка сборки.
printf 'ok\n' >"$DRY_ROOT/mode"
printf '3\n' >"$DRY_ROOT/rsync-fails"
new_state
run_ci
rm -f "$DRY_ROOT/rsync-fails"
assert_eq "$(cat "$DRY_STATE/ci.code")" "1" "rsync give-up exit"
if grep -q "не ошибка сборки" "$DRY_STATE/ci.out"; then
  pass "rsync give-up explains ssh"
else
  fail "rsync give-up explains ssh"
fi
if grep -q '^ci-release: серверные шаги завершились$' "$DRY_STATE/ci.out"; then
  fail "rsync give-up must not look successful"
else
  pass "rsync give-up is not a green release"
fi

# 8. Lock: второй start не запускает второй remote-release.
# Прямой вызов ctl не делает rsync, поэтому режим копируем на «сервер» сами.
printf 'sleep\n' >"$DRY_ROOT/mode"
cp "$DRY_ROOT/mode" "$REMOTE_DIR/mode"
printf '2\n' >"$REMOTE_DIR/sleep-for"
new_state
rm -f "$REMOTE_DIR/invocations"
DVARF_REMOTE_DIR="$REMOTE_DIR" DVARF_STATE_DIR="$DRY_STATE" \
  bash "$ROOT/deploy/remote-release-ctl.sh" start >"$DRY_STATE/start1"
DVARF_REMOTE_DIR="$REMOTE_DIR" DVARF_STATE_DIR="$DRY_STATE" \
  bash "$ROOT/deploy/remote-release-ctl.sh" start >"$DRY_STATE/start2"
if grep -q '^START=launched$' "$DRY_STATE/start1" \
  && grep -q '^START=already-running$' "$DRY_STATE/start2"; then
  pass "lock blocks a second start"
else
  fail "lock blocks a second start"
fi
for _ in 1 2 3 4 5 6 7 8; do
  state="$(DVARF_REMOTE_DIR="$REMOTE_DIR" DVARF_STATE_DIR="$DRY_STATE" \
    bash "$ROOT/deploy/remote-release-ctl.sh" status | awk -F= '$1=="STATE"{print $2}')"
  [[ "$state" == "success" ]] && break
  sleep 1
done
assert_eq "$state" "success" "locked release finishes"
assert_eq "$(wc -l <"$REMOTE_DIR/invocations" | tr -d '[:space:]')" "1" "lock means one invocation"

# 9. Процесс убит — статус failed, в журнале намёк на память.
printf 'sleep\n' >"$DRY_ROOT/mode"
cp "$DRY_ROOT/mode" "$REMOTE_DIR/mode"
printf '30\n' >"$REMOTE_DIR/sleep-for"
new_state
DVARF_REMOTE_DIR="$REMOTE_DIR" DVARF_STATE_DIR="$DRY_STATE" \
  bash "$ROOT/deploy/remote-release-ctl.sh" start >/dev/null
pid=""
for _ in 1 2 3 4 5; do
  if [[ -f "$DRY_STATE/release.pid" ]]; then
    pid="$(tr -d '[:space:]' <"$DRY_STATE/release.pid")"
    [[ "$pid" =~ ^[0-9]+$ ]] && break
  fi
  sleep 0.2
done
if [[ "$pid" =~ ^[0-9]+$ ]]; then
  kill -9 -"$pid" 2>/dev/null || kill -9 "$pid" 2>/dev/null || true
  pass "killed worker"
else
  fail "killed worker (no pid)"
fi
killed_state="$(DVARF_RELEASE_STALE_SECONDS=0 DVARF_REMOTE_DIR="$REMOTE_DIR" DVARF_STATE_DIR="$DRY_STATE" \
  bash "$ROOT/deploy/remote-release-ctl.sh" status | awk -F= '$1=="STATE"{print $2}')"
assert_eq "$killed_state" "failed" "vanished worker is failed"
if grep -q "нехватка памяти" "$DRY_STATE/release.log"; then
  pass "vanished worker notes memory"
else
  fail "vanished worker notes memory"
fi

# 10. SIGHUP родительской сессии не обрывает фоновую выкладку.
printf 'sleep\n' >"$DRY_ROOT/mode"
cp "$DRY_ROOT/mode" "$REMOTE_DIR/mode"
printf '2\n' >"$REMOTE_DIR/sleep-for"
new_state
rm -f "$REMOTE_DIR/invocations"
# Переменные раскрывает дочерний bash из окружения (они export).
# shellcheck disable=SC2016
setsid bash -c '
  DVARF_REMOTE_DIR="$REMOTE_DIR" DVARF_STATE_DIR="$DRY_STATE" \
    bash "$ROOT/deploy/remote-release-ctl.sh" start
  sleep 5
' >/dev/null 2>&1 &
parent=$!
disown "$parent" 2>/dev/null || true
sleep 0.4
kill -HUP -"$parent" 2>/dev/null || kill -HUP "$parent" 2>/dev/null || true
hup_state=""
for _ in 1 2 3 4 5 6 7 8; do
  hup_state="$(DVARF_REMOTE_DIR="$REMOTE_DIR" DVARF_STATE_DIR="$DRY_STATE" \
    bash "$ROOT/deploy/remote-release-ctl.sh" status | awk -F= '$1=="STATE"{print $2}')"
  [[ "$hup_state" == "success" ]] && break
  sleep 1
done
assert_eq "$hup_state" "success" "worker survives SIGHUP"

if (( FAILS == 0 )); then
  printf 'dry-run: all checks passed\n'
  exit 0
fi
printf 'dry-run: %s failed\n' "$FAILS" >&2
exit 1
