#!/usr/bin/env bash
# Идемпотентная запись ADMIN_BOOTSTRAP_EMAIL и ADMIN_PANEL_ENABLED в живой .env.
# Значение почты берётся только из окружения ADMIN_BOOTSTRAP_EMAIL — никогда не echo.
# Вызов: ADMIN_BOOTSTRAP_EMAIL=... bash deploy/upsert-admin-bootstrap-env.sh /path/to/.env
# Не создаёт .env, если файла нет. Пустой секрет — тихий пропуск без правок.
set -euo pipefail
# На всякий случай: не трассеровать этот скрипт (почта не должна попасть в лог).
set +x
{ set +o xtrace; } 2>/dev/null || true

ENV_FILE="${1:-}"

if [[ -z "${ADMIN_BOOTSTRAP_EMAIL:-}" ]]; then
  echo "ADMIN_BOOTSTRAP_EMAIL не задан, пропуск"
  exit 0
fi

if [[ -z "$ENV_FILE" ]]; then
  echo "upsert-admin-bootstrap-env: нужен путь к .env" >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "WARN: ${ENV_FILE} отсутствует, пропуск записи ADMIN_BOOTSTRAP_EMAIL / ADMIN_PANEL_ENABLED"
  exit 0
fi

# Почта может содержать + . - _; перевод строк и '=' в значении не допускаем.
email="${ADMIN_BOOTSTRAP_EMAIL}"
if [[ "$email" == *$'\n'* || "$email" == *$'\r'* || "$email" == *'='* ]]; then
  echo "upsert-admin-bootstrap-env: недопустимые символы в ADMIN_BOOTSTRAP_EMAIL, пропуск" >&2
  exit 0
fi

upsert_kv() {
  local key="$1"
  local value="$2"
  local src="$3"
  local dst="$4"
  if grep -qE "^${key}=" "$src"; then
    # Литеральная замена строки KEY=...; value передаём через env awk, не через shell-подстановку в паттерн.
    KEY="$key" VALUE="$value" awk '
      BEGIN { k = ENVIRON["KEY"]; v = ENVIRON["VALUE"]; prefix = k "=" }
      index($0, prefix) == 1 { print prefix v; next }
      { print }
    ' "$src" >"$dst"
  else
    # Дописать в конец, сохранив прочие строки как есть.
    cat "$src" >"$dst"
    if [[ -s "$dst" ]] && [[ "$(tail -c1 "$dst" | wc -l)" -eq 0 ]]; then
      printf '\n' >>"$dst"
    fi
    printf '%s=%s\n' "$key" "$value" >>"$dst"
  fi
}

tmp="$(mktemp "${TMPDIR:-/tmp}/dvarf-env.XXXXXX")"
tmp2="$(mktemp "${TMPDIR:-/tmp}/dvarf-env.XXXXXX")"
cleanup() {
  [[ -n "${tmp:-}" && -e "$tmp" ]] && rm -f -- "$tmp"
  [[ -n "${tmp2:-}" && -e "$tmp2" ]] && rm -f -- "$tmp2"
  return 0
}
trap cleanup EXIT

# Права исходного файла (octal). GNU stat; на macOS тестов CI нет.
mode="$(stat -c '%a' "$ENV_FILE" 2>/dev/null || stat -f '%OLp' "$ENV_FILE")"
uid_gid=""
if owner="$(stat -c '%u:%g' "$ENV_FILE" 2>/dev/null)"; then
  uid_gid="$owner"
fi

cp -p -- "$ENV_FILE" "${ENV_FILE}.bak"

upsert_kv "ADMIN_BOOTSTRAP_EMAIL" "$email" "$ENV_FILE" "$tmp"
upsert_kv "ADMIN_PANEL_ENABLED" "true" "$tmp" "$tmp2"

chmod "$mode" "$tmp2"
if [[ -n "$uid_gid" ]]; then
  chown "$uid_gid" "$tmp2" 2>/dev/null || true
fi

# Атомарная замена на том же FS.
mv -f -- "$tmp2" "$ENV_FILE"
# tmp2 уже перемещён — не удалять в cleanup как отсутствующий.
tmp2=""

echo "admin bootstrap env: ADMIN_BOOTSTRAP_EMAIL и ADMIN_PANEL_ENABLED обновлены"
