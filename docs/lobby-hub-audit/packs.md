# Аудит пачек хаба лобби

## L-01 — Роли лобби

| ID | Ожидалось | Фактически | Где | Пачка | Статус |
|---|---|---|---|---|---|
| L01-1 | Таблица ролей без character_id | `lobby_roles` + модель `LobbyRole`, миграция `l01roles8a4c2` | `backend/app/models/lobby.py`, `alembic/versions/l01roles8a4c2_lobby_roles.py` | L-01 | сделано |
| L01-2 | Хелперы прав в одном месте | `backend/app/services/lobby_roles.py`, подключены в lobby/chat/note | services | L-01 | сделано |
| L01-3 | Вход наблюдателя по коду без персонажа | `JoinLobbyRequest.character_id` optional, UI «Войти без персонажа» | join API + `JoinLobbyPage` | L-01 | сделано |
| L01-4 | UI состава: роли, передача, повести сегодня | `LobbyRolesPanel` на вкладке «Состав» | `frontend/src/features/lobby/LobbyRolesPanel.tsx` | L-01 | сделано |
| L01-5 | «Повести сегодня» на сессию | API lead-today + снятие при close/clear | lobby service | L-01 | сделано |
| L01-6 | Наблюдатель без скрытого и без действий | `can_see_hidden` / `require_can_act_on_board` | roles + chat/note/rolls | L-01 | сделано |
| L01-7 | Передача лобби с подтверждением | `POST /lobbies/{id}/transfer` + UI | API + roles panel | L-01 | сделано |
| L-04 | Кик из лобби | не делали | — | L-04 | перенесено |
| L-03 | Новый код приглашения | сделано в L-03 (эндпоинт + UI) | см. раздел L-03 | L-03 | сделано |
| L-08 | Правила кампании UI | только хелпер `can_edit_campaign_rules` | lobby_roles | L-08 | перенесено |

## L-02 — Хранилище картинок лобби

| ID | Ожидалось | Фактически | Где | Пачка | Статус |
|---|---|---|---|---|---|
| L02-1 | Общий процессор WebP, аватарки на нём | `media.process_image` / `process_lobby_image`; avatar.py тонкий | `backend/app/services/media.py`, `avatar.py` | L-02 | сделано |
| L02-2 | Таблица lobby_media, квота 200 МБ, миграция | `lobby_media` + `l02media7b3e1`, down=`s01droptpl9c2a` | model + alembic | L-02 | сделано |
| L02-3 | API upload/delete/serve, права owner/comaster | POST/DELETE/GET media + usage; StaticFiles без lobbies | routers/lobbies.py, main.py | L-02 | сделано |
| L02-4 | Счётчик на хабе + временная загрузка | Панель «Картинки лобби» во вкладке Настройки | `LobbyMediaQuotaPanel.tsx` | L-02 | сделано |
| L02-5 | Крючки wiki/map/lobby_avatar без вики | `attach_to_wiki_page`, `attach_map_to_location`, `attach_lobby_avatar`, `copy_to_lobby`, `delete_for_attachment` | `LobbyMediaService` | L-02 | сделано |
| L-06 | Загрузка в дневник | сделано в L-06 (kind=journal) | см. раздел L-06 | L-06 | сделано |
| W-02 | Картинки вики | kind=wiki/map, is_primary, copy_to_lobby | — | W-02 | перенесено |

## L-03 — Подсказка, список, приглашения, удаление

| ID | Ожидалось | Фактически | Где | Пачка | Статус |
|---|---|---|---|---|---|
| L03-1 | Подсказка в 3 шага после создания | `LobbySetupHints` + признаки по members/roles/sessions; latch в localStorage | `LobbySetupHints.tsx`, `lobbySetupHints.ts` | L-03 | сделано |
| L03-2 | «Идёт игра» и «За стол» в списке | `has_open_session` / `open_session_id` в LobbySummary; selectinload sessions | schemas + `list_for_user` + `LobbiesPage` | L-03 | сделано |
| L03-3 | Код/ссылка/QR в шапке всем, кто видит лобби | `_to_detail` отдаёт invite всем; шапка хаба | lobby service + `LobbyDetailPage` | L-03 | сделано |
| L03-4 | QR без внешнего сервиса | пакет `qrcode`, компонент `InviteQr` (data URL) | `InviteQr.tsx` | L-03 | сделано |
| L03-5 | «Новый код» у владельца | `POST /lobbies/{id}/invite-code` + `require_can_change_invite_code` + WS lobby_resync | API + roles + hub | L-03 | сделано |
| L03-6 | Удаление с вводом названия + purge медиа | DELETE body `confirm_name`, `purge_lobby_media_dir` | lobby service + media + Dialog | L-03 | сделано |
| L03-7 | Заготовки боёв не трогать | рабочие ссылки не найдены (уже S-01) | — | L-03 | уже было |
| L-04 | Состав / выход | сделано в L-04 | см. раздел L-04 | L-04 | сделано |
| L-05 | Скачать заметки | полный экспорт вставлен в крючки удаления и выхода | LobbyDetailPage / LeaveOrKickDialog | L-05 | сделано |

## L-04 — Состав, один персонаж — одно лобби, выход

| ID | Ожидалось | Фактически | Где | Пачка | Статус |
|---|---|---|---|---|---|
| L04-1 | Вход показывает имя лобби | `GET /lobbies/invite/{code}` + UI на Join и диалоге листа | routers + JoinLobbyPage + CharacterDetailPage | L-04 | сделано |
| L04-2 | Один персонаж — одно лобби; перевод/блок сессии | unique `character_id`, join action transfer, 409 + data | migration + lobby service | L-04 | сделано |
| L04-3 | Копия персонажа с суффиксом | `action=copy`, deepcopy sheet, имя « (копия)» | lobby service | L-04 | сделано |
| L04-4 | Живой состав/сессии на хабе | `lobby_resync` на join/remove/session create/close/combat end; seat_character_ids | hub + LobbyDetailPage | L-04 | сделано |
| L04-5 | Покинуть лобби + заметки | кнопка, диалог Скачать/Удалить, блок при сессии | LeaveOrKickDialog | L-04 | сделано |
| L04-6 | Кик владельца с подтверждением и судьбой в бою | require_owner; release/retain + retained_after_kick | remove_member + session_seats | L-04 | сделано |
| L04-7 | Возврат по коду тянет заметки | заметки не удаляются сами; ключ author+lobby | note repo + join | L-04 | сделано |
| L-05 | Полный экспорт/редактор заметок | сделано в L-05 | см. раздел L-05 | L-05 | сделано |
| S-05 | Стороны в бою | крючок side_hook / retained_after_kick | session_seats + combat entry | S-05 | перенесено |
| L-16 | Копия под правила старта | не расширяли | — | L-16 | перенесено |

## L-05 — Заметки лобби

| ID | Ожидалось | Фактически | Где | Пачка | Статус |
|---|---|---|---|---|---|
| L05-1 | Личные скрыты; «Показать мастеру» | `shared_with_master` + `can_manage_journal` в list_visible | note repo/service + LobbyNotesPanel | L-05 | сделано |
| L05-2 | Привязка к игроку author+lobby | character_required снят; ключ L-04 сохранён | note service | L-05 | сделано |
| L05-3 | Общая доска: правки всем, удаление автор/мастер, конфликт | can_act_on_board / can_manage_journal / updated_at → 409 | note service | L-05 | сделано |
| L05-4 | Закрепление, поиск, задачи, [[вики]] | pinned, client search, noteBody, SettingMentionBody | panel + CSS | L-05 | сделано |
| L05-5 | Экспорт в панель / Покинуть / удаление лобби | `GET …/notes/export`, крючки L-03/L-04 | API + LeaveOrKick + LobbyDetail | L-05 | сделано |
| L05-6 | Крючок «В дневник» | неактивная кнопка / onSendToJournal | LobbyNotesPanel | L-05 | сделано |
| L-06 | Дневник | сделано в L-06 | см. раздел L-06 | L-06 | сделано |

## L-06 — Дневник кампании

| ID | Ожидалось | Фактически | Где | Пачка | Статус |
|---|---|---|---|---|---|
| L06-1 | Живое обновление + точка «новое» | WS `journal_changed` (без тела черновиков); last-seen в localStorage; `last_journal_published_at` | hub + LobbyJournalPanel + LobbyHubTabs + journalSeen | L-06 | сделано |
| L06-2 | Черновики → «Опубликовать» / обратно | `is_draft`; игроку в GET не отдаём | model + lobby service + JournalEntryCard | L-06 | сделано |
| L06-3 | Скрытые куски `{{скрыто}}…{{/скрыто}}` | mask/reveal; заглушка «скрыто» игроку | journal_markup + update reveal_hidden | L-06 | сделано |
| L06-4 | Оглавление, поиск, сессия в главу | chapters в JournalPageOut; q; `_ensure_session_chapter` | list_journal + close/quest | L-06 | сделано |
| L06-5 | Картинки файлом L-02 kind=journal | media_id + upload; delete_for_attachment; счётчик в композере | JournalComposer + media | L-06 | сделано |
| L06-6 | Перенос с доски одной кнопкой | крючок L-05 `onSendToJournal` + диалог; дефолт черновик | LobbyDetailPage + create source_note_id | L-06 | сделано |
| — | Пагинация 20 | PAGE_SIZE=20 на фронте | LobbyJournalPanel | L-06 | сделано |
| W-02 | Картинки вики | не трогали | — | W-02 | перенесено |
| — | Спойлеры в свободном тексте ссылок вики | не разбирали — мастер отвечает за текст | — | — | нужно решение владельца (оставить как есть) |

## L-07 — Чаты, шёпот, письма, бейджи

| ID | Ожидалось | Фактически | Где | Пачка | Статус |
|---|---|---|---|---|---|
| L07-1 | Шёпот: пара, факт мастеру без текста | `whisper_threads`/`whisper_messages`; API list/open/messages; facts; WS `whisper_changed`/`whisper_fact` без тела | chat models/service + LobbyChatsPanel | L-07 | сделано |
| L07-2 | Письмо ≠ шёпот; сомастер как мастер | разделы «Письмо мастеру» / «Шёпот»; письма через `can_manage_journal` | chat service + panel | L-07 | сделано |
| L07-3 | Бейджи хаба (каналы+письма+шёпоты) | `chat_read_cursors` + `GET …/chats/badge`; точка/счётчик на вкладке Чаты | API + LobbyHubTabs + LobbyDetailPage | L-07 | сделано |
| L07-4 | Права L-01; isOwner = journal | сужен проп панели; наблюдатель/lead без писем/факта | LobbyDetailPage + SessionDetailPage | L-07 | сделано |
| S-01 | Раскладка стола | не трогали панель сайдбара, только `isOwner` | — | S-01 | уже было |
| L-06 | Дневник | не трогали | — | L-06 | уже было |
