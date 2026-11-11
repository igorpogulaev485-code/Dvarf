#!/usr/bin/env bash
# Ручной деплой заморожен.
#
# Раньше скрипт делал find /opt/dvarf … rm -rf (кроме хрупкой копии .env в /tmp)
# и мог потерять живой .env и любые файлы данных в каталоге. Этого шага больше нет.
# Скрипт не подключается к VPS.
set -euo pipefail

echo "Ручной деплой заморожен." >&2
echo "Прод выкатывается из main workflow Deploy: workflow_dispatch, environment production." >&2
echo "Каталог /opt/dvarf этот скрипт больше не удаляет." >&2
echo "Инструкция: docs/deploy.md" >&2
exit 1
