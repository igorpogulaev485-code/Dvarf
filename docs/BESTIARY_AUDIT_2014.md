# Аудит бестиария 2014 (ttg.club / dnd.su → catalog kind=bestiary)

Источник правды: [ttg 5e14 bestiary API](https://5e14.ttg.club/api/v2/bestiary) · зеркало [dnd.su / 5e14 bestiary](https://5e14.dnd.su/bestiary/).  
Контракт обликов / порядок слайсов: [`forms-and-wild-shape.md`](forms-and-wild-shape.md) §7–§8.  
Прод tip (на момент старта дизайна): `cursor/companions-naparniki-b378` · `kind=bestiary` в enum есть, **записей 0**.

## Правила (как у SPELLS / рас)

1. Только **официальные** источники 2014 (ttg `source.group.shortName = Basic`; dnd.su вкладка «Официальные»).
2. **Не сидим:** Homebrew, UA, 3rd-party.
3. Имена RU: предпочтительно как на dnd.su/ttg (если имена разъехались — зафиксировать в таблице; не ломать slug).
4. Волны: JSON → alembic upsert по `slug` → smoke count → строка в этой таблице.
5. Gap-pass: diff ttg ↔ dnd.su ↔ наш `COUNT(*)` до 0 оф. дыр.
6. **Конфликт статов:** если ttg и dnd.su расходятся по HP/AC/абилкам/действиям — **в каталог пишем ttg** (LOCK Игоря, 2026-10-15). dnd.su остаётся для покрытия индекса и RU-проверки. Конфликты логируем ниже — пока не ясно, разовая это история или системная.

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

## Известные конфликты статов (ttg wins)

| Slug | RU | Поле | ttg | dnd.su | Статус |
|------|----|------|-----|--------|--------|
| `wildfire_spirit` | Дух дикого огня | `hp` base | **10** + 5×ур. друида | **5** + 5×ур. друида | conflict→ttg · TCE · Круг дикого огня · замер 2026-10-15 |

Ссылки: [ttg](https://5e14.ttg.club/bestiary/wildfire_spirit) · [dnd.su](https://5e14.dnd.su/bestiary/4235-wildfire-spirit/)  
Прочие поля у этой карточки (AC 13, абилки 10/14/14/13/15/11, Семя пламени / Огненная телепортация) совпадают.

На B0/B6: авто-diff `hp_average` / `ac` / `abilities` / `cr` по пересечению индексов; новые строки добавлять сюда.

## Статус волн

| Волна | Содержание | В каталоге | Prod verify | Заметки |
|-------|------------|------------|-------------|---------|
| B0 | Schema v1 + fetch/diff + smoke + fixture | — | нет | ✅ `cursor/bestiary-schema-fetch-ab5e` |
| B1 | MM upsert | **451** в JSON + alembic `c5d6e7f8a9b0` | нет (до «Залей») | ✅ 90 beasts; 70 CR≤1; hyphen-URL fix |
| B2 | VGtM + MToF | **268** в JSON + alembic `d6e7f8a9b0c1` | нет (до «Залей») | ✅ VGM 129 + MTF 139; 0 overlap c MM |
| B3 | MPMM | **258** в JSON + alembic `e7f8a9b0c1d2` | нет (до «Залей») | ✅ = ttg Basic MPMM; 0 overlap c MM/VGM/MTF |
| B4 | FTD / BGG / BAM / TCE creatures… | ☐ | ☐ | |
| B5 | Adventures + settings | ☐ | ☐ | |
| B6 | Gap-pass vs dnd.su + ttg | ☐ | ☐ | оф. gap → 0 |

### B0 — что лежит в репо

| Артефакт | Путь |
|----------|------|
| Schema (BE) | `backend/app/schemas/bestiary_catalog.py` |
| Types (FE) | `frontend/src/shared/dnd/bestiaryCatalog.ts` |
| Normalize | `backend/scripts/bestiary_normalize.py` |
| Fetch | `backend/scripts/fetch_bestiary_wave.py` |
| Diff | `backend/scripts/diff_bestiary_sources.py` |
| Smoke | `backend/scripts/smoke_bestiary_schema.py` |
| Fixture | `backend/data/srd/2014/bestiary_fixture_v1.json` (5 карточек, Wildfire HP=10) |

```bash
# fixture + smoke
python3 backend/scripts/fetch_bestiary_wave.py --slugs wolf,brown_bear,hawk,wildfire_spirit,air_elemental --out bestiary_fixture_v1.json
python3 backend/scripts/smoke_bestiary_schema.py

# coverage gap (сеть)
python3 backend/scripts/diff_bestiary_sources.py

# волна MM (сеть; ещё не сидим в БД — это B1)
python3 backend/scripts/fetch_bestiary_wave.py --book MM --out bestiary_mm_v1.json
```

### B1 — MM

| Артефакт | Путь |
|----------|------|
| Data | `backend/data/srd/2014/bestiary_mm_v1.json` (**451**) |
| Migrate | `backend/alembic/versions/c5d6e7f8a9b0_upsert_bestiary_mm_2014.py` |

```bash
python3 backend/scripts/fetch_bestiary_wave.py --book MM --out bestiary_mm_v1.json
# после деплоя / локально: alembic upgrade head
```

### B2 — VGtM + MToF

| Артефакт | Путь |
|----------|------|
| Data | `backend/data/srd/2014/bestiary_vgm_mtf_v1.json` (**268** = VGM 129 + MTF 139) |
| Migrate | `backend/alembic/versions/d6e7f8a9b0c1_upsert_bestiary_vgm_mtf_2014.py` |
| Fetch | `--book VGM,MTF` (multi-book) |

```bash
python3 backend/scripts/fetch_bestiary_wave.py --book VGM,MTF --out bestiary_vgm_mtf_v1.json
# overlap vs MM: 0 slugs (замер 2026-10-15)
# после деплоя / локально: alembic upgrade head
```

Типы (срез): humanoid 77 · fiend 50 · monstrosity 28 · aberration 19 · undead 16 · fey/beast/giant по 14 · …

Замечание fetch: path slug с **дефисами** (`will-o-wisp`) нельзя нормализовать в `_` до GET — ttg отдаёт 500. Catalog slug после fetch = underscores.

### B3 — MPMM

| Артефакт | Путь |
|----------|------|
| Data | `backend/data/srd/2014/bestiary_mpmm_v1.json` (**258**) |
| Migrate | `backend/alembic/versions/e7f8a9b0c1d2_upsert_bestiary_mpmm_2014.py` |
| Fetch | `--book MPMM` |

```bash
python3 backend/scripts/fetch_bestiary_wave.py --book MPMM --out bestiary_mpmm_v1.json
# overlap vs MM / VGM+MTF: 0 (ttg даёт _mpmm суффиксы на репринтах)
# после деплоя / локально: alembic upgrade head
```

Типы (срез): humanoid 53 · fiend 50 · monstrosity 37 · aberration 20 · undead/fey по 16 · …

### Coverage замер (B0 diff, 2026-10-15)

| | Count |
|--|------:|
| ttg Basic | 2380 |
| dnd.su index | 2875 |
| both (slug) | 1980 |
| only ttg | 400 |
| only dnd.su | 862 |

Slug-only matching неполный (суффиксы `_mpmm`, разные транслиты) — дожимаем на B6.

## Чеклист на волну

1. Fetch оф. карточек (ttg detail) в `backend/data/srd/2014/bestiary_<wave>_v1.json`.
2. Diff имён/CR/source с индексом dnd.su; зафиксировать exceptions.
3. Alembic upsert `kind=bestiary`, `rules_edition=2014`.
4. Smoke: count total + by `data->>'source_book'`; звери CR≤1 для WS.
5. Diff ключевых полей vs dnd.su на пересечении; conflicts → ttg + строка в таблице конфликтов.
6. Обновить эту таблицу + `PRODUCT_STATUS`.
7. После деплоя — live COUNT на проде.

## Поля schema v1

См. §7.2 в [`forms-and-wild-shape.md`](forms-and-wild-shape.md).  
Обязательные для обликов: `type`, `cr`, `ac`, `hp_average`, `speed`, `actions`/`traits`, `source_book`.
