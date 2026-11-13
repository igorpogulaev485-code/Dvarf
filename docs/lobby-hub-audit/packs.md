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
| L-06 | Загрузка в дневник | API/хелперы готовы; UI дневника не трогали | — | L-06 | перенесено |
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
| L-04 | Состав / выход | не делали | — | L-04 | перенесено |
| L-05 | Скачать заметки | крючок-комментарий у удаления | LobbyDetailPage | L-05 | перенесено |
