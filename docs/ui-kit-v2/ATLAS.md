# UI Kit v2 · Atlas (черновик спеки)

**Метафора:** стол с картой похода — прохладно, ясно, быстро читается в бою.  
**Статус:** proposal · не locked · не для кода без ok.

Доска палитры: [`boards/dir-a-atlas.svg`](boards/dir-a-atlas.svg) · характеристики: [`boards/atlas-abilities.svg`](boards/atlas-abilities.svg)

---

## 1. Чем отличается от Листвы

| | Листва (сейчас) | Atlas (предложение) |
|--|-----------------|---------------------|
| Фон | Тёплый пергамент `#fbf7ec` | Прохладный туман `#F3F5F4` |
| Accent | Оливковая листва `#5a6b3d` | Мох `#2F6A4F` (глубже, холоднее) |
| Ощущение | Книга / пергамент | Карта / полевой стол |
| Display | Source Serif 4 | **Fraunces** (мягкий display, не «газета») |
| UI | IBM Plex Sans | **IBM Plex Sans** (оставляем — уже привычен в цифрах) |
| Темы кабинета | 6 = identity характеристик | 6 тем остаются, но soft/accent пересчитываем под Atlas |

---

## 2. Токены цвета

### Нейтрали (тема их не трогает)

| Token | Hex | Роль |
|-------|-----|------|
| `--bg` | `#F3F5F4` | фон приложения |
| `--panel` | `#FBFCFA` | панели desk / forms |
| `--card` | `#FFFFFF` | вложенная поверхность / выбранная карточка |
| `--ink` | `#1A2220` | основной текст |
| `--muted` | `#5A6561` | вторичный текст |
| `--line` | `#D3DAD6` | бордеры, разделители |
| `--chip` | `#E8EEEA` | нейтральный chip |
| `--danger` | `#B42318` | только деструктив |
| `--warn` | `#9A6B2F` | перегруз, внимание |
| `--info` | `#2F5F7A` | подсказки, ссылки-инфо |
| `--success` | `#2F6A4F` | успех (= moss) |

### Accent (тема аккаунта меняет только это)

| Token | Default (Atlas) | Роль |
|-------|-----------------|------|
| `--accent` | `#2F6A4F` | primary button, tabs on, links |
| `--accent-soft` | `#D8EBE2` | soft button, row selected, mode tint |

### 6 тем кабинета (предложение имён)

| id | Имя | Accent | Soft | ≈ характеристика |
|----|-----|--------|------|------------------|
| `str` | Глина | `#A14B38` | `#F3E0D8` | СИЛ |
| `dex` | Папоротник | `#2F6B5C` | `#D8EBE4` | ЛОВ |
| `con` | Песок | `#8A6A2F` | `#F1E6C8` | ТЕЛ |
| `int` | Чернила | `#3A5F8A` | `#DDE6F2` | ИНТ |
| `wis` | **Мох** | `#2F6A4F` | `#D8EBE2` | МДР · **дефолт** |
| `cha` | Вереск | `#7A4A6E` | `#EFE0EA` | ХАР |

### Характеристики (identity, всегда свои)

См. [`boards/atlas-abilities.svg`](boards/atlas-abilities.svg).  
Тема аккаунта **не** перекрашивает rail.

| | Hex |
|--|-----|
| СИЛ | `#A14B38` |
| ЛОВ | `#2F6B5C` |
| ТЕЛ | `#8A6A2F` |
| ИНТ | `#3A5F8A` |
| МДР | `#2F6A4F` |
| ХАР | `#7A4A6E` |

---

## 3. Типографика

| Роль | Шрифт | Почему |
|------|-------|--------|
| Display | **Fraunces** | Живой display для brand/заголовков; не Inter; не «газетный» serif |
| UI | **IBM Plex Sans** | Отличная кириллица и цифры; уже в продукте |
| Numeric | Plex Sans tabular nums | HP, КД, слоты в ровных колонках |

### Шкала

| Token | Size / weight | Где |
|-------|---------------|-----|
| `--text-display-l` | 32 / 700 Fraunces | бренд, lobby hero |
| `--text-display-m` | 22 / 600 Fraunces | titles панелей |
| `--text-ui-l` | 16 / 600 Plex | primary CTA |
| `--text-ui-m` | 14 / 500 Plex | списки |
| `--text-ui-s` | 12 / 500 Plex | meta, chips |
| `--text-num-l` | 28 / 600 Plex | HP |
| `--text-num-m` | 18 / 600 Plex | КД, слоты |

Fallback: `Fraunces, Source Serif 4, Georgia, serif`.

---

## 4. Форма, сетка, elevation

| Token | Значение |
|-------|----------|
| `--radius-sm` | 8px · chips, inputs |
| `--radius-md` | 12px · panels, cards |
| `--radius-lg` | 16px · sheets / pads |
| `--radius-pill` | 999px · **не использовать** для CTA (избегаем «AI pills») |
| `--space-1…6` | 4 / 8 / 12 / 16 / 24 / 32 |
| `--tap-min` | 44px |
| `--elev-0` | none |
| `--elev-1` | `0 1px 2px rgba(26,34,32,.06)` · sticky |
| `--elev-2` | `0 8px 24px rgba(26,34,32,.10)` · sheets |
| `--focus-ring` | 2px `--accent` offset 2px |

Фон приложения: лёгкий градиент туман → чуть холоднее вниз (не фото, не неон).

---

## 5. Атомы и состояния

Обязательные состояния: **default · hover · active/on · disabled · loading · danger · empty · focus**.

| Атом | Заметки Atlas |
|------|----------------|
| Button primary | fill accent, text white; radius-md; не pill |
| Button soft | fill accent-soft, text accent |
| Button ghost | transparent, ink |
| Button danger | outline/ solid danger |
| FilterChip | active = solid accent |
| Field / Input | bg card, line border; error = danger border + text under |
| Toast | panel + elev-2; success/warn/danger left stripe |
| Badge | soft fill |
| Tabs / ModeTab | active = accent underline или soft fill (один паттерн на весь продукт) |
| IconButton | 44×44 hit area |

---

## 6. Паттерны (организмы)

| Паттерн | Правило Atlas |
|---------|----------------|
| Panel | `--panel`, title Fraunces display-m в accent |
| DeskHeader | vitals cluster; HP = самый крупный numeric |
| ModeTab | режим = сцена; без второго select «Панель» |
| CatalogCard | interaction only; selected = accent border 2px + soft wash |
| GlanceRow | список → expand детали |
| LobbyHero | код ≥ 28px tabular + QR рядом |
| Empty | muted + soft CTA |
| StickyToolbar | elev-1, на full-панелях |
| Print/classic | единственное «бланковое» место; abilities всё равно identity |

---

## 7. Motion

| Имя | ms | Где |
|-----|-----|-----|
| `mode-crossfade` | 180 | смена режима |
| `hp-pulse` | 220 | урон/хил |
| `sheet-rise` | 220 | mobile pads |
| `chip-pop` | 120 | filter on |
| `summary-morph` | 220 | create summary |

`prefers-reduced-motion`: только opacity fade.

---

## 8. Do / Don’t

**Do**
- Холодные нейтрали + один моховый accent.
- Крупные числа в бою.
- Карточки только для выбора.
- Сначала доска паттерна → ok → код.

**Don’t**
- Возвращать тёплый пергамент «по привычке».
- Purple glow / glassmorphism / тёмный неон по умолчанию.
- Pill-кнопки everywhere.
- Красить danger или ability theme-акцентом.
- Внедрять Atlas в прод до ok и волны P0 restyle.

---

## 9. Миграция с Листвы (когда скажешь «берём»)

1. Зафиксировать Atlas в `docs/ui-kit/` (замена README + новые boards).  
2. Обновить skill `dvarf-ui-kit` и `AGENTS.md` § UI Kit.  
3. Волна A: только CSS tokens + chrome (Листва → Atlas), логика та же.  
4. Проверка на Мхе + одной не-зелёной теме (Чернила).  
5. Волна B: theme picker уже на новых soft/accent.  
6. Не деплоить тонкой веткой без tip.

Оценка трудоёмкости: это **restyle-волна**, не новый продукт. Идёт рука об руку с P0 из [`../redesign/REDESIGN_PLAN.md`](../redesign/REDESIGN_PLAN.md).

---

## 10. Что решить тебе сейчас

Ответь одной фразой, например:

- «Берём Atlas»  
- «Берём Forge»  
- «Хочу Atlas, но accent как у Forge»  
- «Оставляем Листву, новый кит не нужен»

После ответа — соберём Figma-страницу foundations + 3 ключевых экрана в выбранной палитре.
