# Деплой

Канон: [`docs/deploy.md`](../docs/deploy.md).

Прод — ветка `main`, сайт https://creed20.tech/, каталог на VPS `/opt/dvarf`. Выкладка — GitHub Actions **Deploy** (`workflow_dispatch`, environment `production`).

`./sync-and-up.sh` заморожен и на сервер не ходит. Раньше он удалял содержимое `/opt/dvarf`. Доставка теперь `rsync` с фильтром `rsync-filter.txt`: живой `.env` и каталоги данных не удаляются. Перезапуск на VPS — `remote-up.sh` (его вызывает `remote-release.sh` после миграции). Сборку на сервере отделяет `remote-release-ctl.sh`: обрыв SSH не снимает процесс, повторный старт упирается в lock.

`upsert-admin-bootstrap-env.sh` — идемпотентная запись `ADMIN_BOOTSTRAP_EMAIL` / `ADMIN_PANEL_ENABLED` в живой `.env` (вызывается из `ci-release.sh` после rsync, до перезапуска). Секрет только из env; значение не печатается. Подробности: [`docs/deploy.md`](../docs/deploy.md) → «Первый админ».

`deploy/prod-tip` хранит строку `main`. Отдельной tip-ветки больше нет.
