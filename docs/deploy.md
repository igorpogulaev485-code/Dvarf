# Деплой прода (Timeweb)

Прод — ветка `main`. Сайт: https://creed20.tech/  
SSH-хост: `201.34.132.252` (в браузере не открывать: HTTP по IP уходит на creed20).  
Каталог на VPS: `/opt/dvarf`.  
Compose: `docker-compose.prod.yml`.  
Workflow: [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml), имя **Deploy**.

GitHub Pages не используется. Ручной `./deploy/sync-and-up.sh` заморожен: он сразу завершается ошибкой и на сервер не ходит. Раньше он удалял содержимое `/opt/dvarf` (`.env` прятал во временную копию). Этот шаг убран.

Workflow из этого репозитория агенты не запускают. Первый запуск делает Игорь, после секретов и required reviewer.

## Что делает workflow

Триггер только `workflow_dispatch`. На `push` деплоя нет.

1. **verify** (без environment): отказ, если ref не `refs/heads/main`; `npm ci` и `npm run build` во `frontend`; `pytest` в `backend`; ровно одна голова `alembic heads`.
2. **deploy** (environment `production`, ждёт required reviewer, когда правило включено):
   - забирает уже собранный `frontend/dist`;
   - `rsync --delete` на VPS по фильтру [`deploy/rsync-filter.txt`](../deploy/rsync-filter.txt). Не присылает и не удаляет `.env`. Не удаляет `backups/`, `pgdata/`, `postgres-data/`, `uploads/`, `backend/uploads/`, дампы `*.sql` / `*.dump` / `*.sql.gz`. Каталог целиком не стирает;
   - на VPS [`deploy/remote-release.sh`](../deploy/remote-release.sh): сборка образов (`remote-up` с `DVARF_BUILD_ONLY=1`, старые контейнеры ещё отвечают), `alembic upgrade head` отдельным контейнером, затем перезапуск [`deploy/remote-up.sh`](../deploy/remote-up.sh). Порядок тот же. Запускает его [`deploy/remote-release-ctl.sh`](../deploy/remote-release-ctl.sh) в отдельной сессии (`setsid`), с lock-файлом против второй сборки. Job не держит один длинный ssh на всю сборку: он опрашивает статус и журнал короткими вызовами;
   - с раннера `curl https://creed20.tech/health`.

SSH с раннера: `ConnectTimeout=20`, `ServerAliveInterval=15`, `ServerAliveCountMax=4`. `rsync` и эти короткие ssh при коде 255 повторяются до 3 раз. Код 255 здесь — обрыв соединения. Ошибка сборки, миграции или проверки health приходит отдельным кодом и текстом `ci-release: серверные шаги завершились с ошибкой`.

Журнал на VPS: `/var/lib/dvarf/release.log`. Состояние: `/var/lib/dvarf/release.state` (`running`, `success`, `failed`). Эти файлы лежат вне `/opt/dvarf`, rsync их не удаляет.

Тома Docker (`dvarf_pg_data`, `dvarf_uploads`, `dvarf_caddy_data`, `dvarf_caddy_config`) workflow не удаляет: нет `docker compose down -v`.

Миграция идёт до перезапуска API. Пока `remote-up` не поднял новый контейнер, отвечает старый код, уже на новой схеме. Миграции в `main` должны это переживать. Если `alembic upgrade head` падает, перезапуска нет.

Живой `/opt/dvarf/.env` workflow не создаёт и не перезаписывает. Нет файла или он пустой — выкладка останавливается до сборки.

Образы по-прежнему собираются на VPS через `remote-up` (legacy builder, таймаут, отпечатки). Фронт собирается на раннере; в образ nginx кладётся готовый `frontend/dist` (`frontend/Dockerfile`).

## Секреты

Их читает job `deploy` как `secrets.*`. Класть в **environment secrets** окружения `production`, не в общие секреты репозитория: иначе их увидит любой другой workflow.

| Секрет | Пример | Что это |
|--------|--------|---------|
| `DEPLOY_HOST` | `201.34.132.252` | SSH-хост. Не URL сайта |
| `DEPLOY_USER` | `root` | Пользователь, у которого публичный ключ уже в `authorized_keys` |
| `DEPLOY_SSH_KEY` | полный PEM | Приватный ключ OpenSSH **без passphrase**, вместе со строками `BEGIN` и `END` |
| `DEPLOY_PATH` | `/opt/dvarf` | Каталог на VPS. Другие пути скрипт отклоняет |
| `DEPLOY_KNOWN_HOSTS` | строка `ssh-keyscan` | Публичный host key. Первое поле = значение `DEPLOY_HOST` |

Workflow не читает секрет Cursor `DVARF_SSH_PRIVATE_KEY`. Если публичная часть того ключа уже на VPS, в `DEPLOY_SSH_KEY` кладётся тот же приватный ключ. Новый ключ на сервер из этого PR не ставится.

## Как завести environment и секреты

Нужны права администратора репозитория. Имена писать точно: workflow сравнивает `environment: production` и имена секретов.

### 1. Environment `production`

1. Репозиторий на GitHub → **Settings** → **Environments**.
2. **New environment**.
3. Имя: `production`. **Configure environment**.

### 2. Required reviewer

На странице environment `production`:

1. **Deployment protection rules** → включить **Required reviewers**.
2. Добавить себя. Сохранить (**Save protection rules**).

Пока правило выключено, job `deploy` стартует сразу после зелёного `verify`, без аппрува. Включи reviewer до первого боевого запуска.

### 3. Только ветка `main`

Там же: **Deployment branches and tags** → **Selected branches and tags** → **Add deployment branch or tag rule** → имя `main`.

Тогда environment `production` нельзя использовать из другой ветки. В самом workflow verify тоже отказывается, если ref не `main`.

### 4. Пять секретов

На странице environment `production` блок **Environment secrets** → **Add environment secret**.

Тот же экран: **Settings** → **Secrets and variables** → **Actions** → вкладка окружения → `production`.

Для каждого секрета имя из таблицы выше, значение одним полем. `DEPLOY_SSH_KEY` и `DEPLOY_KNOWN_HOSTS` вставлять как многострочный текст, не как `\n`.

### 5. Host key со своего компьютера

С машины, которая уже заходит на VPS (агент и CI сервер не трогают):

```bash
ssh-keyscan -t ed25519 201.34.132.252
```

В секрет `DEPLOY_KNOWN_HOSTS` вставить выведенные строки как есть. Сверь отпечаток с уже доверенным ключом:

```bash
ssh-keygen -lf <(ssh-keyscan -t ed25519 201.34.132.252)
```

Если `DEPLOY_HOST` когда-нибудь сменится, host key нужно снять заново: первое поле строки должно совпасть с новым хостом.

### 6. Приватный ключ

`DEPLOY_SSH_KEY` — тот ключ, чья публичная часть уже пускает на VPS. Формат OpenSSH (`BEGIN OPENSSH PRIVATE KEY` … `END OPENSSH PRIVATE KEY`) или PEM `BEGIN RSA PRIVATE KEY`. Без passphrase: job ходит в `BatchMode` и пароль не спросит.

В чат, в PR и в логи ключ не вставлять. GitHub маскирует секрет в логе workflow, если он попал в вывод как есть.

## Как выкатить

1. Убедиться, что нужные коммиты уже в `main` (мерж — обычный merge commit).
2. **Actions** → **Deploy** → **Run workflow**.
3. Branch: **main**. **Run workflow**.
4. Дождаться, пока environment попросит review, и подтвердить.
5. Зелёные `verify` и `deploy`. Шаг «Проверка /health» ходит на https://creed20.tech/health.
6. В `PRODUCT_STATUS.md` пометить слайс на проде только после этого.

Повторный запуск безопасен для `.env` и томов: rsync их не удаляет, `alembic upgrade head` идемпотентен.

## Если выкладка упала

- Пустой секрет или битый ключ — шаг «Доставка» падает до rsync или на SSH. Стек на VPS не перезапускается.
- `pytest` или две головы Alembic — job `deploy` не начинается.
- Миграция упала — API не перезапускался, отвечает предыдущий контейнер. Схему, которую миграция успела записать, смотреть отдельно: откат сам workflow не делает.
- Сборка упала до строки `remote-release: перезапуск` — старые контейнеры продолжают работать. В логе Actions будет: `шаг перезапуска не начался, старые контейнеры продолжают работать.`
- `/health` снаружи красный, а `remote-up` внутри уже написал `healthy` — смотреть Caddy и DNS, не перезаливать дерево руками.
- В журнале есть признаки нехватки памяти — workflow пишет, что swap он не включает. Память на VPS из Actions не меняется.

## Если SSH оборвался

Так уже было на деплоях 9, 12 и 14: примерно через секунду после `remote-release: сборка образов` job получал код 255, а повтор того же коммита проходил. Соединение в этот момент уже было открыто (rsync и строка про alembic успевали пройти). Похоже на гибель процесса во время `docker builder du` по большому кэшу сборки (на успешном повторе в логе было `pruning build cache (~2869MB reclaimable)`), а не на таймаут простоя и не на лимит сессий sshd. Обрыв ssh больше не убивает сборку: она в своей сессии, job читает журнал заново.

Что сделать, по одному шагу:

1. Откройте упавший Deploy и прочитайте шаг «Доставка, миграции, перезапуск».
2. Если там «сборка на сервере уже идёт» или «жду её» — запустите Deploy ещё раз и дождитесь конца. Второй запуск не начнёт параллельную сборку.
3. Если написано, что шаг перезапуска не начался — сайт остался на старых контейнерах. Запустите Deploy ещё раз.
4. Если есть абзац про нехватку памяти — со своего компьютера зайдите на VPS и выполните `free -h`.
5. Если в выводе `Swap: 0` — добавьте swap вручную (workflow этого не делает), например файл 2 ГБ:

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

6. Если `free -h` показывает мало свободной памяти, а в `/var/lib/dvarf/release.log` сборка обрывается на кэше Docker — можно снять кэш: `docker builder prune -f`. Команда не удаляет `.env` и тома Postgres.

## VPN и сеть

Сайт с зарубежных дата-центров открывается. С телефона через Sota Connect (сервер Швеция, выход `217.217.228.172`) и главная, и `/health` дают `ERR_CONNECTION_TIMED_OUT`. Через тот же VPN `timeweb.cloud` открывается. Значит, VPN не режет российские сайты целиком: проблема у адреса `201.34.132.252` или у самой машины.

Панель Timeweb проверена: защита от DDoS выключена, групп правил Firewall нет, IPv6 нет, единственный адрес `201.34.132.252`. На машине 4 ГБ RAM, занято около 0,8 ГБ — этот таймаут не из-за памяти.

Что ещё может быть:

1. Запрет на машине: iptables, nft, ufw, fail2ban, цепочка `DOCKER-USER`, гео-правило. В том числе бан адреса `217.217.228.172` или подсети `217.217.228.0/24`.
2. SYN до сервера не доходит — тогда это путь именно к этому IP, не ко всем сайтам в РФ. Файрвол машины такой пакет всё равно показал бы в tcpdump.
3. SYN доходит, запрета нет — MTU туннеля: ответ не возвращается.

WebSocket лобби — отдельная поломка: без заголовков Upgrade nginx отдавал 404.

Что делает выкладка, не меняя схему «сборка в фоне + lock + короткие ssh»:

1. `deploy/remote-release.sh` перед перезапуском вызывает `deploy/apply-vpn-mtu.sh` (через `sudo -n`, если процесс не root). Нет прав или скрипт упал — в журнал пишется `WARN`, код выкладки остаётся кодом перезапуска.
2. Скрипт на хосте включает `net.ipv4.tcp_mtu_probing=1`. В mangle **PREROUTING** (до DNAT Docker) входящий SYN на порты 80 и 443 получает MSS 1360. В mangle **FORWARD** SYN клампится до MTU маршрута. Старые правила OUTPUT/POSTROUTING с `--sport 80/443` снимаются. Повторный запуск правила не копирует. Политику FORWARD DROP у Docker скрипт не трогает и за запрет сайта не считает.
3. У контейнера `edge` в `docker-compose.prod.yml` свои sysctl: `net.ipv4.tcp_mtu_probing=1` и `net.ipv4.tcp_base_mss=1024`. Sysctl хоста на TLS внутри контейнера не действует: у Caddy свой network namespace.
4. HTTP/3 выключен. В `deploy/Caddyfile` глобально `servers { protocols h1 h2 }`, порт `443/udp` у edge не публикуется. Caddy сам проксирует WebSocket, отдельной директивы нет.
5. В конце `remote-release.sh` вызывается `deploy/diagnose-network.sh`. Он только читает сеть и всегда завершается нулём. Вывод попадает в `/var/lib/dvarf/release.log` и в лог Actions. В конце журнала блок «вердикт».

### Как читать diagnose-network

В журнале есть блок «Поиск 217.217.228.0/24». Туда попадают iptables, nft, ufw, ipset, fail2ban и цепочка `DOCKER-USER`. Строка с `DROP`, `REJECT` или `Banned IP` и этим адресом — бан на машине. «Совпадений нет» — подсеть в правилах не прописана. Рядом отдельно: есть ли DROP в `DOCKER-USER` и есть ли гео-правила. Политику Docker `FORWARD DROP` вердикт не считает запретом сайта.

- **«Запрета 443 и подсети не видно»** и пустой tcpdump — SYN до сервера не дошёл. Это не бан ufw и не «все сайты РФ»: `timeweb.cloud` через тот же VPN открывается.
- **«Есть запрет»** и tcpdump показывает SYN — пакет дошёл, его режет правило из вердикта.
- **Запрета нет** и tcpdump показывает SYN — пакет дошёл, файрвол его не бросил. Дальше MTU (кламп MSS в этой выкладке).

Счётчик `pkts` у mangle PREROUTING (dport 80,443) растёт, только если SYN дошёл до машины. Там же `ip link`, sysctl внутри `dvarf-edge` (`tcp_mtu_probing = 1`) и заголовки GET `https://creed20.tech/health`. Секретов в выводе нет.

### Одна команда на сервере

Агент на сервер не заходит. Панель Timeweb второй раз не открывать.

Пока с телефона через Sota открываете https://creed20.tech/health , на сервере выполните одну команду. Она только читает пакеты:

```bash
tcpdump -n -i any 'tcp port 443 and host 217.217.228.172 and (tcp[tcpflags] & tcp-syn != 0)'
```

Остановить: Ctrl+C. Если написано `permission denied`, та же команда с `sudo` в начале — по-прежнему ничего не меняет.

Пустой вывод — SYN с `217.217.228.172` до сервера не дошёл. Строка, где этот адрес слева, а `201.34.132.252` справа, и флаг `[S]` — SYN дошёл. Пришлите эти строки или слово «пусто» вместе с блоком «вердикт» из лога Deploy.

### Как вернуть HTTP/3

1. В `deploy/Caddyfile` в глобальном блоке заменить `protocols h1 h2` на `protocols h1 h2 h3`.
2. В `docker-compose.prod.yml` у сервиса `edge` снова добавить порт `"443:443/udp"`.
3. Влить в `main` и выкатить обычным workflow Deploy. Проверка: `curl -sI https://creed20.tech/` снова содержит `alt-svc` с `h3`.

Пока h3 выключен, у `https://creed20.tech/` заголовка `alt-svc: h3` быть не должно.

## Чего здесь нет

- Первичная настройка пустого VPS, выпуск `.env`, DNS, сертификат. На сервере это уже есть; workflow рассчитывает на живой `.env` и тома.
- Деплой не из `main`.
- GitHub Pages.
