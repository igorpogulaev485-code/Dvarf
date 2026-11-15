/**
 * W-API-13: копирайт справки /help/world-import.
 * Источник фактов — docs/world-import.md, docs/world-import-mcp.md и код лимитов.
 * Не добавлять имена учебного мира Who и реальные токены.
 */

/** Плейсхолдер секрета в примерах — никогда не подставлять живой токен. */
export const TOKEN_PLACEHOLDER = 'wapi_ВАШ_ТОКЕН'

export const HELP_TITLE = 'Импорт мира по API и MCP'

export const HELP_INTRO = {
  title: 'Что это',
  body: [
    'Вы заливаете уже собранный мир (папка markdown, zip, публичная git-ссылка или ИИ через MCP) в черновик сверки Creed20. После проверки подтверждаете — страницы и сущности попадают в ваш сеттинг.',
    'Мир остаётся частным: только внутри лобби и сеттинга этого мастера. Общего каталога, витрины миров и «поделиться миром» нет.',
    'В этой версии импорта доступна только редакция правил 2014. Значение 2024 и любое другое — понятная ошибка, без тихой подмены.',
  ],
}

export const HELP_WHO = {
  title: 'Кому доступно',
  rows: [
    {
      who: 'Мастер (обычный вход)',
      what: 'Залить, сверка, подтвердить, отменить, токен, тумблер «ИИ может подтверждать».',
    },
    {
      who: 'Токен импорта (Bearer wapi_…)',
      what: 'Проверить пакет, залить, git, статус, сверка, подтвердить — только если тумблер включён. Отменить подтверждение токен не умеет.',
    },
    {
      who: 'Игрок за столом',
      what: 'Видит только уже раскрытое мастером. Черновик импорта и сверку не читает.',
    },
  ],
}

export const HELP_WAYS = {
  title: 'Три способа залить мир',
  lead: 'Откройте сеттинг лобби → блок «Залить мир» (удобнее на широком экране мастера).',
  items: [
    {
      title: 'Папка / zip',
      body: 'Markdown с YAML-шапкой как есть. На экране — кнопка «Загрузить zip».',
    },
    {
      title: 'Публичная git-ссылка',
      body: 'HTTPS на github.com или gitlab.com. Без file://, localhost и частных IP.',
    },
    {
      title: 'API или MCP',
      body: 'Тот же черновик и сверка. REST — ниже; MCP — по адресу /mcp/world-import.',
    },
  ],
}

export const HELP_REVIEW = {
  title: 'Сверка: черновик → подтвердить → отменить',
  steps: [
    'Сначала имеет смысл проверить пакет (validate) — в канон ничего не пишется.',
    'Затем залить в черновик (upsert / zip / git). Появится задание «к сверке».',
    'На сверке смотрите статусы: новое, обновление, конфликт, нет в источнике, предложение ИИ. Конфликт решает мастер; отсутствующее сами не удаляем — помечаем и спрашиваем.',
    'Подтвердите выбранные пункты. Тумблер «ИИ может подтверждать» по умолчанию выключен. Кто подтвердил — в журнал.',
    'Подтверждение можно отменить (undo), пока мастер не правил сущности вручную после confirm.',
    'Повторная заливка обновляет по ключу источника, не плодит дубликаты.',
  ],
}

export const HELP_TOKEN = {
  title: 'Токен API',
  bullets: [
    'Где получить: в блоке «Токен API импорта» на экране «Залить мир» — кнопка «Выписать токен».',
    'Секрет вида wapi_… показывается один раз. Потом в списке остаётся только префикс. В базе хранится хеш.',
    'Токен привязан к одному лобби и одному сеттингу.',
    'Как отозвать: кнопка «Отозвать» у токена в том же блоке. После отзыва заливка с этим секретом не пройдёт.',
  ],
  cannot: [
    'включать тумблер «ИИ может подтверждать»;',
    'читать чужие лобби и сеттинги;',
    'менять пароль или ходить в биллинг;',
    'отменять подтверждение (undo) — только мастер в сессии.',
  ],
}

export type RestEndpoint = {
  method: string
  path: string
  note: string
}

/** Пути как в роутере world_imports — без выдуманных эндпоинтов. */
export const HELP_REST_ENDPOINTS: RestEndpoint[] = [
  {
    method: 'POST',
    path: '/settings/{setting_id}/world-imports/validate',
    note: 'Проверка пакета без записи в канон',
  },
  {
    method: 'POST',
    path: '/settings/{setting_id}/world-imports',
    note: 'Залить файлы в черновик (Idempotency-Key)',
  },
  {
    method: 'POST',
    path: '/settings/{setting_id}/world-imports/from-git',
    note: 'Публичная HTTPS git-ссылка → черновик',
  },
  {
    method: 'GET',
    path: '/settings/{setting_id}/world-imports',
    note: 'Список заданий',
  },
  {
    method: 'GET',
    path: '/settings/{setting_id}/world-imports/{job_id}',
    note: 'Статус задания',
  },
  {
    method: 'GET',
    path: '/settings/{setting_id}/world-imports/{job_id}/diff',
    note: 'Сверка с каноном',
  },
  {
    method: 'POST',
    path: '/settings/{setting_id}/world-imports/{job_id}/confirm',
    note: 'Подтвердить (токену нужен включённый тумблер)',
  },
  {
    method: 'GET',
    path: '/settings/{setting_id}/world-import-settings',
    note: 'Настройки импорта (тумблер)',
  },
]

export const HELP_REST = {
  title: 'REST',
  baseLead:
    'Базовый адрес — тот же origin, что у сайта (как у адреса MCP). Пути ниже относительно этого origin.',
  authHeader: `Authorization: Bearer ${TOKEN_PLACEHOLDER}`,
  authHint: 'В заголовке передавайте токен импорта мира, не пароль аккаунта.',
  curlTitle: 'Пример curl',
  idempotencyHint:
    'Повтор POST с тем же ключом Idempotency-Key не создаёт второе задание и не дублирует мир.',
}

/** Лимиты — ровно из кода (world_vault_parse, world_import_git, world_import_characters). */
export const HELP_LIMITS = {
  title: 'Лимиты',
  items: [
    'Zip: не больше 25 МБ.',
    'Суммарный текст пакета: не больше 20 МБ; один текстовый файл — не больше 2 МБ.',
    'Не больше 400 файлов за одну заливку.',
    'Архив git: не больше 100 МБ.',
    'PDF листа персонажа: не больше 5 МБ.',
    'Квота медиа лобби по умолчанию: 200 МБ (общая для комнаты).',
    'Отдельного лимита «частоты запросов в минуту» в коде нет. Параллельный разбор того же сеттинга даёт import_in_progress. Ключ идемпотентности защищает от дублей.',
  ],
}

export const HELP_ERRORS: Array<{ code: string; when: string }> = [
  { code: 'rules_edition_unsupported', when: 'Прислали не 2014' },
  { code: 'quota_exceeded', when: 'Слишком много файлов в пакете' },
  { code: 'file_too_large', when: 'Файл / zip / git-архив больше лимита' },
  { code: 'bad_encoding', when: 'Нечитаемый текст' },
  { code: 'bad_zip', when: 'Битый zip' },
  { code: 'git_url_rejected', when: 'Не HTTPS github/gitlab, localhost, частный IP, file://' },
  { code: 'forbidden_setting', when: 'Токен не для этого лобби/сеттинга' },
  { code: 'import_in_progress', when: 'Уже идёт разбор' },
  { code: 'confirm_ai_disabled', when: 'Токен хочет confirm, а тумблер выключен' },
  { code: 'conflict_needs_review', when: 'Есть конфликт без решения мастера' },
  { code: 'undo_requires_master', when: 'Отмена подтверждения только мастеру' },
  { code: 'undo_unsafe', when: 'После ручной правки откат небезопасен' },
]

export const HELP_MCP = {
  title: 'MCP',
  path: '/mcp/world-import',
  pathLead: 'Адрес MCP на сайте — origin + /mcp/world-import (тот же расчёт, что в блоке «Залить мир»).',
  notInCatalogs:
    'В каталоги ChatGPT и Claude ничего не публикуем — мастер сам вставляет адрес и токен в настройках клиента.',
  connectOrder: [
    'Выпишите токен импорта в блоке «Залить мир» и скопируйте секрет сразу.',
    'В клиенте MCP укажите адрес /mcp/world-import вашего сайта.',
    'Передайте заголовок Authorization: Bearer wapi_… (плейсхолдер ниже).',
    'Сначала validate_world, затем заливка, сверка; confirm — только после явной просьбы или при включённом тумблере.',
  ],
  configTitle: 'Пример конфигурации клиента',
  toolsTitle: 'Инструменты',
  tools: [
    { name: 'validate_world', desc: 'Проверка пакета без записи в канон. Сначала он.' },
    { name: 'upsert_world_files', desc: 'Файлы в черновик сверки (source_kind=mcp).' },
    { name: 'import_world_from_git', desc: 'Публичная HTTPS git-ссылка → черновик.' },
    { name: 'get_import_status', desc: 'Статус задания.' },
    { name: 'get_import_diff', desc: 'Сверка с каноном.' },
    { name: 'confirm_import', desc: 'Запись в канон (нужен включённый тумблер для токена).' },
    { name: 'undo_import_confirm', desc: 'Откат последнего confirm.' },
  ] as const,
}

export const HELP_FREQUENT = {
  title: 'Частые ошибки',
  lead: 'Ответ API однообразный: code, путь (файл/поле), сообщение по-русски, подсказка «как исправить».',
}

export const HELP_PANEL_LINK = 'Как подключить API и MCP →'

export const HELP_BACK = '← Назад'

export const HELP_NEUTRAL_EXAMPLE = {
  location: 'Тихая гавань',
  gitUrl: 'https://github.com/example/world',
}

/** Собрать пример curl с origin страницы и плейсхолдером токена. */
export function buildCurlExample(origin: string, settingId = '{setting_id}'): string {
  const base = origin.replace(/\/$/, '')
  return `curl -sS -X POST "${base}/settings/${settingId}/world-imports/validate" \\
  -H "Authorization: Bearer ${TOKEN_PLACEHOLDER}" \\
  -H "Content-Type: application/json" \\
  -d '{
  "rules_edition": "2014",
  "files": [
    {
      "path": "world/locations/quiet-harbor.md",
      "content": "---\\ntitle: Тихая гавань\\n---\\n\\n# Тихая гавань\\n"
    }
  ]
}'`
}

/** Пример MCP-конфига (адрес + заголовок) — факты из docs/world-import-mcp.md. */
export function buildMcpClientConfig(mcpUrl: string): string {
  return JSON.stringify(
    {
      mcpServers: {
        'creed20-world-import': {
          url: mcpUrl,
          headers: {
            Authorization: `Bearer ${TOKEN_PLACEHOLDER}`,
          },
        },
      },
    },
    null,
    2,
  )
}

export function apiBaseFromWindow(): string {
  if (typeof window === 'undefined') return ''
  return window.location.origin
}

export function mcpUrlFromWindow(): string {
  if (typeof window === 'undefined') return '/mcp/world-import'
  return `${window.location.origin}/mcp/world-import`
}
