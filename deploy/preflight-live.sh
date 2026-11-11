#!/usr/bin/env bash
# Снят вместе с ручным деплоем.
# Раньше ходил по SSH на VPS и сверял prod tip перед затиранием /opt/dvarf.
# Прод теперь ветка main. Выкладка — GitHub Actions, см. docs/deploy.md.
set -euo pipefail

echo "preflight-live снят: на VPS скрипт не ходит." >&2
echo "Прод = main. Деплой: docs/deploy.md" >&2
exit 1
