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

## L-08 — Правила кампании

| ID | Ожидалось | Фактически | Где | Пачка | Статус |
|---|---|---|---|---|---|
| L08-1 | JSONB `campaign_rules` + UI раздел | колонка + дефолты/миграция inspiration; панель в настройках | model + `l08rules9f2a1` + CampaignRulesPanel | L-08 | сделано |
| L08-2 | Варианты 2014 + применение | черты/мультикласс/хиты в LevelUp/ASI; флаг/нагрузка на листе | LevelUpDialog, ClassAsiDialog, InventoryPanel | L-08 | сделано |
| L08-3 | 11 домашних + текст + справочник | HOMEBREW_CATALOG FE/BE; зелье toast; остальные — флаг/крючок | campaign_rules.py + campaignRules.ts | L-08 | сделано |
| L08-4 | Скрытность | броски→event_history; КД→enemies_ac_visible; death→hidden_death_saves | CampaignRulesPanel + EnemyCard + seats | L-08 | сделано |
| L08-5 | S-03/S-06 в разделе | inspiration_after_roll перенесён; xp/milestones; без дубля в видимости | VisibilitySettingsPanel − галочка | L-08 | сделано |
| L08-6 | Место под L-16 | строка «появятся позже» | CampaignRulesPanel | L-08 | сделано → заменено в L-16 |
| G-01 | Генератор | только поле в GET лобби/сессии | LobbyDetail / SessionDetail | G-01 | перенесено |
| — | Крит max+dice | не делали, ключ отвергается | lobby.update | L-08 | сделано (отказ) |

## L-16 — Правила старта

| ID | Ожидалось | Фактически | Где | Пачка | Статус |
|---|---|---|---|---|---|
| L16-1 | `campaign_rules.start` + колонка пометки состава | ключ `start` в JSON; `start_rules_ok`/`start_rules_waived`; миграция `l16start7c4e2` down=`l08rules9f2a1` | campaign_rules.py + alembic | L-16 | сделано |
| L16-2 | UI «Правила старта» вместо заглушки | поля уровня/метода/книг/набора/запретов; алиасы книг | CampaignRulesPanel + book_sources | L-16 | сделано |
| L16-3 | «Создать героя для этого лобби» | `?lobbyId=&code=`; InviteMeta + start; автовход после сохранения | CreateCharacterPage + invite meta | L-16 | сделано |
| L16-4 | Вход готовым с предупреждением и пометкой | 409 `start_rules_mismatch`; waive; автопересчёт листа | join + LobbyMemberMiniCard | L-16 | сделано |
| L16-5 | Копия → правка → вход | `action=copy` клонирует без join; пайплайн; затем join | lobby service + Join/Character pages | L-16 | сделано |
| L-08 | Не затирать homebrew/xp_remainder | merge_campaign_rules | lobby.update | L-16 | сделано |
| L-04 | Не вторая кнопка копии | та же copy, новая цепочка | — | L-16 | сделано |

## W-01 — Вики: один сеттинг, доступ и чтение

| ID | Ожидалось | Фактически | Где | Пачка | Статус |
|---|---|---|---|---|---|
| W01-1 | Один активный сеттинг; баннер при нескольких | `is_extra`; POST второго → 400; `settings/primary`; форма «+» только если пусто | lobby service + LobbyDetailPage | W-01 | сделано |
| W01-2 | world_notes → note при хвосте | миграция создаёт «Заметки мира» только если тела нет в страницах; «Мир» не переименовываем | `w01wiki8d3a4` | W-01 | сделано |
| W01-3 | Сессия из сеттинга через attendance | кнопка ведёт на #sessions с выбранным сеттингом | LobbyDetailPage / SettingDetailPage | W-01 | сделано |
| W01-4 | Чтение: оглавление, поиск, маскировка, права | `mask_unrevealed_mentions`; флаги can_edit_wiki/can_see_hidden; SettingWikiReader | setting_mentions + SettingWikiReader | W-01 | сделано |
| W01-5 | revealed_at + «что нового» | колонка; localStorage курсор; список 10 | model + wikiRevealSeen | W-01 | сделано |
| W01-6 | Журнал квестов | список раскрытых quest в reader | SettingWikiReader | W-01 | сделано |
| W01-7 | Вики во боковой панели стола | вкладка «Вики» рядом с заметками/чатом | SessionDetailPage | W-01 | сделано |
| W-02 | Корзина / картинки / create_missing | см. раздел W-02 | — | W-02 | сделано |
| W-04 | Известные легенды | сделано в W-04 | SettingWikiReader + known_legends | W-04 | сделано |

## W-02 — Вики: картинки, история, корзина, перенос и совместная правка

| ID | Ожидалось | Фактически | Где | Пачка | Статус |
|---|---|---|---|---|---|
| W02-1 | Картинки L-02 wiki/map, главная/карта, квота | media на SettingPageOut; upload kind=wiki/map; квота освобождается при окончательном удалении (не при soft-delete) | WikiPageMediaPanel + media.py + wiki.py | W-02 | сделано |
| W02-2 | История 20 + вернуть | setting_page_versions; restore пишет новую версию | wiki.py + WikiPageHistoryPanel | W-02 | сделано |
| W02-3 | Корзина 30д страниц/сеттингов; is_extra → trash | deleted_at; purge при обращении; сессии остаются | migration w02wiki0a2e0f + wiki trash API | W-02 | сделано |
| W02-4 | Черновик = нераскрытое | без нового статуса | — | W-02 | уже было |
| W02-5 | @без совпадения: Создать/Похожие | create_missing игнор; resolve + UI assist | WikiMentionAssist + resolve endpoint | W-02 | сделано |
| W02-6 | Копия из лобби с can_edit_wiki | хелпер wiki_copy_access (легко сменить) | wiki_copy_access.py + copy endpoint | W-02 | сделано / нужно решение владельца (правило доступа) |
| W02-7 | Сейчас правит + конфликт 409 | lobby WS wiki_editing; expected_updated_at | wiki_presence + SettingDetailPage | W-02 | сделано |
| W-03/W-04 | Бой / артефакты | см. W-03 / W-04 | — | W-03/W-04 | сделано |

## W-04 — Артефакты и сеты (L-11)

| ID | Ожидалось | Фактически | Где | Пачка | Статус |
|---|---|---|---|---|---|
| W04-1 | Несколько свойств разных kind | список abilities уже был; тест двух способностей (КД+призыв) | SettingArtifactsPanel + artifact_apply | W-04 | уже было / проверено |
| W04-2 | Сеты 2/3/4+, части уникальны, права can_edit_wiki | `setting_artifact_sets` + members; API рядом с artifacts | model + lobby service/router + SettingArtifactSetsPanel | W-04 | сделано |
| W04-3 | Бонусы сета складываются на листе | `recompute_set_bonuses` / `syncArtifactSetBonuses` в том же effects | artifact_apply.py + artifactGear.ts | W-04 | сделано |
| W04-4 | item_lore ↔ артефакт, известные легенды | `setting_pages.artifact_id`; `known_legends` без сырых abilities | SettingPage + SettingWikiReader | W-04 | сделано |
| W04-5 | Лут S-06 не ломать | `artifact_id` в сундуке + пересчёт сета после выдачи | award_loot / _apply_loot_bucket | W-04 | сделано |
| — | Миграция | `w04sets8a1b2c` down=`w03cmbt7b4e2a` | alembic | W-04 | сделано |

## W-03 — Вики: страница «Бой» и «Бой → из вики»

| ID | Ожидалось | Фактически | Где | Пачка | Статус |
|---|---|---|---|---|---|
| W03-1 | Тип `combat`, fields JSON, скрыт от игроков, оценка DMG | PAGE_KINDS+схемы; шаблон upsert по page_kind; `_setting_detail`/`_apply_revealed`; `CombatPageEditor` | wiki_combat.py + lobby + SettingDetailPage | W-03 | сделано |
| W03-2 | Заготовка лута → сундук S-06 | `fields.loot`; при end + `wiki_combat_page_id` предзаполнение; не `fill_loot_chest` | lobby patch_combat end | W-03 | сделано |
| W03-3 | «Бои этой локации» | `GET …/wiki-combats`; UI на столе | list_session_wiki_combats + SessionDetailPage | W-03 | сделано |
| W03-4 | «Бой → из вики» | `POST …/combat/from-wiki`; отказ если бой уже идёт (`combat_already_active`) | combat_from_wiki | W-03 | сделано |
| W03-5 | Крючок G-01 «в вики» | `save_to_wiki`+`parent_page_id`+`wiki_picks`; право `can_edit_wiki`; `wiki_save_available=true` | generate_encounter + EncounterGenerateDialog | W-03 | сделано |
| — | Миграция шаблона | `w03cmbt7b4e2a` down=`w02wiki0a2e0f`; id uuid4 в рантайме | alembic | W-03 | сделано |

## L-20 — Раздача эффектов и синхрон инфузий

| ID | Ожидалось | Фактически | Где | Пачка | Статус |
|---|---|---|---|---|---|
| L20-1 | Один путь записи эффекта | `share_effect` → `CharacterService.apply_effects` → `append_effect`; sync-инфузий отдельно | lobby.py + character.py | L-20 | сделано |
| L20-2 | Только от своего персонажа | убран обход `can_edit_wiki`; ApplyEffectDialog — только own seats | lobby.py + ApplyEffectDialog | L-20 | сделано |
| L20-3 | Партия = текущее лобби/сессия | `useLobbyParty`: preferred / open_session / character.lobby_id, без found[0] | useLobbyParty.ts | L-20 | сделано |
| L20-4 | Догон инфузий при входе | снимок `sheet.infusion_ally_share` + catchup в join | sheet_effects.py + lobby join | L-20 | сделано |
| L20-5 | Концентрация / ауры | clear-concentration не трогали; ауры по-прежнему вручную | character.py | L-20 | уже было |
| Доп. W-03 | Живой поиск монстров в вики «Бой» | CatalogCombobox commitOnSelect как AddCombatantDialog | CombatPageEditor | L-20 | сделано |
| Доп. T-02 | Точное прицеливание + Хитрое действие | turnEconomy steadyAim / cunning dash·disengage·hide | turnEconomy.ts + полоска | L-20 | сделано |
| — | Миграция | нет | — | L-20 | уже было |

## G-01 — Генератор боя в продукт

| ID | Ожидалось | Фактически | Где | Пачка | Статус |
|---|---|---|---|---|---|
| G01-1 | Справочник коэффициентов | v2 по `generator_params.md`: пороги DMG, клип 0,85–2,2, полёт ×1,5/×1,15, эскалация 0,5→1,5 −25% истощение, доли стилей | `encounter_calib.json`, `encounter_calib.py` | G-01 | сделано |
| G01-2 | API composition/wave_profile/flyers/casters + сводка | расширен `EncounterGenerateRequest`/`Result` + `party`; `save_to_wiki` подключён в W-03 | schemas + `LobbyService.generate_encounter` | G-01 | сделано (вики → W-03) |
| G01-3 | Стили толпа/босс/смешанный, эскалация, летуны | `compose_encounter` читает калибровку; предупреждение при слабом дальнем | `encounter_compose.py`, `encounter_pool.py` | G-01 | сделано |
| G01-4 | Диалог на живом столе в «Сюжет», на стол S-02, вики | «В вики» включено при `can_edit_wiki` | SessionDetailPage + dialog | G-01 / W-03 | сделано |
| G01-5 | Оценка на странице «Бой» | DMG через `budget_base` + `encounter_xp_cost` (без party_power) | wiki_combat.estimate_combat_dmg | W-03 | сделано |
| — | Лут генератора | не вызываем `fill_loot_chest` | тест G-01 | G-01 | сделано (отказ) |

## L-21 — Отметки хода мастером, награды офлайн, неожиданность

| ID | Ожидалось | Фактически | Где | Пачка | Статус |
|---|---|---|---|---|---|
| L21-1 | Чипы у любого героя; мастер/сомастер отмечает через seat combat; лента; игрок не снимает отметки мастера | `turn_economy` в `patch_seat_combat` + `gm_locks`; чипы на всех карточках в бою | lobby.py, SessionTableCard, TurnEconomyChips | L-21 | сделано |
| L21-2 | Награды доезжают до листа офлайн | seated-only по решению 10:22; UX «Кто пришёл» + «Выдать» | RewardsDialog, MasterGrantDialog, AwardXpDialog | L-21 | сделано (решение: только за столом) |
| L21-3 | Неожиданность PHB 2014 в начале боя; Бдительный; враги пропускают 1-й ход | `surprised` на entry; диалог старта; skip enemy; lock на листе | StartCombatDialog, session_combat, session_turn_economy | L-21 | сделано |
| — | Миграция | нет (JSON листа / session.combat) | — | L-21 | уже было |
| — | Решения 10:22 | (1) снимает только мастер; (2) награды только сидящим; (3) surprise только в начале боя; (4) после CL-01 | decisions | L-21 | сделано |
