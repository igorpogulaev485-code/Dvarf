# Аудит бестиария 2014 (ttg.club / dnd.su → catalog kind=bestiary)

Источник правды: [ttg 5e14 bestiary API](https://5e14.ttg.club/api/v2/bestiary) · зеркало [dnd.su / 5e14 bestiary](https://5e14.dnd.su/bestiary/).  
Контракт обликов / порядок слайсов: [`forms-and-wild-shape.md`](forms-and-wild-shape.md) §7–§8.  
Прод tip (на момент старта дизайна): `cursor/companions-naparniki-b378` · `kind=bestiary` в enum есть, **записей 0**.

## Правила (как у SPELLS / рас)

1. Только **официальные** источники 2014 (ttg `source.group.shortName = Basic`; dnd.su вкладка «Официальные»).
2. **Не сидим:** Homebrew, UA, 3rd-party.
3. Имена RU как на dnd.su/ttg; slug EN стабильный.
4. Волны: JSON → alembic upsert по `slug` → smoke count → строка в этой таблице.
5. Gap-pass: diff ttg ↔ dnd.su ↔ наш `COUNT(*)` до 0 оф. дыр.

## Срез источников (замер 2026-10-15, до сида)

| Источник | Всего | Оф. срез | Заметки |
|----------|-------|----------|---------|
| ttg `/api/v2/bestiary` | ~2554 | ~**2380** Basic | удобный detail JSON |
| dnd.su `piece/bestiary/index-list/` | ~**2875** | оф. вкладка (без /homebrew/) | RU-проверка / gap |
| Наш каталог `kind=bestiary` | 0 | 0 | цель B1+ |

Расхождение ttg↔dnd.su нормально на старте — закрываем allowlist книг и gap-pass (B6).

### Оф. книги на ttg (Basic), топ

| Книга | ≈ записей |
|-------|-----------|
| MM | 451 |
| MPMM | 258 |
| MTF | 139 |
| VGM | 129 |
| WDMM | 105 |
| FTD | 85 |
| SKT | 80 |
| GGR | 79 |
| BAM / BGG | 72 / 72 |
| … | ещё ~45 оф. кодов книг |

Полный список кодов — из API на волне B0/B1; обновлять эту таблицу после каждой волны.

## Статус волн

| Волна | Содержание | В каталоге | Prod verify | Заметки |
|-------|------------|------------|-------------|---------|
| B0 | Schema v1 + fetch-скрипт + этот аудит | — | — | дизайн/инфра |
| B1 | MM | ☐ | ☐ | база для Wild Shape |
| B2 | VGtM + MToF | ☐ | ☐ | |
| B3 | MPMM | ☐ | ☐ | |
| B4 | FTD / BGG / BAM / TCE creatures… | ☐ | ☐ | |
| B5 | Adventures + settings | ☐ | ☐ | |
| B6 | Gap-pass vs dnd.su + ttg | ☐ | ☐ | оф. gap → 0 |

## Чеклист на волну

1. Fetch оф. карточек (ttg detail) в `backend/data/srd/2014/bestiary_<wave>_v1.json`.
2. Diff имён/CR/source с индексом dnd.su; зафиксировать exceptions.
3. Alembic upsert `kind=bestiary`, `rules_edition=2014`.
4. Smoke: count total + by `data->>'source_book'`; звери CR≤1 для WS.
5. Обновить эту таблицу + `PRODUCT_STATUS`.
6. После деплоя — live COUNT на проде.

## Поля schema v1

См. §7.2 в [`forms-and-wild-shape.md`](forms-and-wild-shape.md).  
Обязательные для обликов: `type`, `cr`, `ac`, `hp_average`, `speed`, `actions`/`traits`, `source_book`.
