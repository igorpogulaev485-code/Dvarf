# FEATURE_LOCK — функции, которые нельзя терять

Единый реестр **неубиваемых** контуров на проде Timeweb.  
Человек читает таблицы; `deploy/preflight-prod.sh` **парсит** секцию «Machine locks» и падает, если чего-то нет.

Связано: [`PRODUCT_STATUS.md`](../PRODUCT_STATUS.md) (что реально на проде) · [`AGENTS.md`](../AGENTS.md) · [`deploy/prod-tip`](../deploy/prod-tip).

---

## Правила (обязательно)

1. Перед деплоем дерево = потомок tip + зелёный preflight (в т.ч. эта таблица).
2. Новый контур, который уже на проде и нельзя стереть — **добавь строку** в Machine locks в том же PR.
3. Убрать lock можно только если фичу сознательно выкинули с прода (и обновили PRODUCT_STATUS).
4. PRODUCT_STATUS описывает UX; FEATURE_LOCK — **жёсткие маркеры в коде**, чтобы деплой не прошёл без них.

---

## Что зафиксировано (для людей)

### Аккаунт / кабинет
- Регистрация, вход, SMTP-сброс пароля, сессии устройств, аватар, опасная зона удаления

### Лобби
- Список/создание, join по коду, detail

### Лист (база)
- Мультикласс, концентрация, каст/upcast, раса/предыстории, classic 2014

### Play desk — телефон (&lt;960px)
- Boot splash anti-blank
- `CombatStickyHeader`
- Одна активная панель (`play-desk__body--mobile`)
- Плотные ряды `*-card__combat` (атаки / заклинания / снаряжение)

### Play desk — стол (≥960px)
- `PlayDeskHeader` (КД / скор. / XP / HP)
- Hot bar, split (`desk_split`), компакт атак
- Нативные броски `deskRolls` + преим./помеха

---

## Machine locks (preflight)

Не редактируй заголовок секции.  
`kind`: `exists` (файл есть) · `contains` (подстрока в файле; **не** regex).  
В `pattern` **нельзя** символ `|` — ломает таблицу.

| kind | path | pattern | label |
|------|------|---------|-------|
| exists | PRODUCT_STATUS.md | | статус продукта |
| exists | AGENTS.md | | контракт агентов |
| exists | deploy/prod-tip | | объявленный prod tip |
| exists | docs/FEATURE_LOCK.md | | этот реестр |
| exists | backend/app/api/routers/lobbies.py | | лобби API |
| exists | frontend/src/pages/JoinLobbyPage.tsx | | лобби join UI |
| exists | frontend/src/pages/LobbyDetailPage.tsx | | лобби detail UI |
| exists | backend/app/services/mail.py | | SMTP / кабинет |
| exists | frontend/src/features/cabinet/SessionsPanel.tsx | | сессии устройств |
| exists | frontend/src/features/cabinet/AvatarEditor.tsx | | загрузка аватара |
| exists | backend/app/services/avatar.py | | avatar service |
| exists | frontend/src/pages/VerifyEmailPage.tsx | | verify email |
| exists | frontend/src/features/characters/raceEffects.ts | | лист P6 раса |
| exists | frontend/src/features/characters/LevelUpDialog.tsx | | лист P5 мультикласс |
| exists | frontend/src/shared/dnd/casterProgression.ts | | лист P2 слоты |
| exists | frontend/src/shared/dnd/armor.ts | | лист P3 КД |
| exists | frontend/src/features/characters/LanguagesToolsPanel.tsx | | лист P4 |
| exists | frontend/src/shared/dnd/concentration.ts | | лист P1 концентрация |
| exists | frontend/src/features/characters/CastSpellDialog.tsx | | каст / upcast |
| exists | frontend/src/shared/dnd/backgroundGrants.ts | | предыстории: гранты |
| exists | frontend/src/features/characters/BackgroundSetupDialog.tsx | | предыстории: попап |
| exists | backend/data/backgrounds/phb2014_background_catalog_spec.json | | предыстории: каталог |
| exists | frontend/src/pages/ClassicSheetPage.tsx | | classic 2014 |
| exists | frontend/src/features/classicSheet/ClassicPrintSheet.tsx | | classic sheet UI |
| exists | frontend/src/features/classicSheet/ClassicBackgroundPicker.tsx | | classic: предыстории |
| exists | backend/app/api/routers/catalog.py | | справочник API |
| exists | frontend/src/features/characters/CombatStickyHeader.tsx | | mobile sticky header |
| contains | frontend/index.html | id="boot" | mobile anti-blank boot |
| contains | frontend/src/features/characters/MinimalSheetEditor.tsx | play-desk__body--mobile | mobile one-panel body |
| contains | frontend/src/index.css | spell-card__combat | mobile spell density |
| contains | frontend/src/index.css | attack-card__combat | mobile attack density |
| contains | frontend/src/index.css | inventory-card__combat | mobile inventory density |
| exists | frontend/src/features/characters/PlayDeskHeader.tsx | | desktop desk header |
| exists | frontend/src/features/characters/PlayDeskHotBar.tsx | | desktop hot bar |
| exists | frontend/src/features/characters/PlayDeskAttacksCompact.tsx | | desktop attacks compact |
| exists | frontend/src/features/characters/PlayDeskSpellsCompact.tsx | | desktop spells compact |
| exists | frontend/src/features/characters/PlayDeskExploreCompact.tsx | | desktop explore compact |
| exists | frontend/src/features/characters/PlayDeskSocialCompact.tsx | | desktop social compact |
| exists | frontend/src/features/characters/PlayDeskFeaturesCompact.tsx | | desktop features compact |
| exists | frontend/src/features/characters/PlayDeskCompanionsCompact.tsx | | desktop companions compact |
| exists | frontend/src/features/characters/PlayDeskSkillStrip.tsx | | desktop skill strip |
| exists | frontend/src/features/characters/deskRolls.ts | | desktop native rolls |
| contains | frontend/src/features/characters/playDeskUi.ts | desk_split | desktop split ui key |
| contains | frontend/src/features/characters/MinimalSheetEditor.tsx | PlayDeskHotBar | desktop hot bar wired |
| contains | frontend/src/features/characters/MinimalSheetEditor.tsx | CombatStickyHeader | mobile sticky wired |
| contains | frontend/src/features/characters/startingGearAttacks.ts | Any weapon with qty>1 | weapon qty stack not multi-row |
