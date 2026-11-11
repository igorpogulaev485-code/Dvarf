# B2 anti-mirror — отчёт

**Слайс:** `cursor/b2-anti-mirror-6151`  
**Каталоги:** охват **не** резали (расы / спеллы / бестиарий на месте).

---

## Сделано

| # | Что | Как |
| --- | --- | --- |
| 1 | Fetch к ttg/dnd.su | `legacy_fetch_guard.py` + guard в `fetch_*` и `diff_bestiary_sources.py`. Без `DVARF_ALLOW_LEGACY_FETCH=1` → exit 2 |
| 2 | Публичный API | `catalog.to_out` всегда отдаёт `external_ref: null` |
| 3 | Доки SoT | `BESTIARY_AUDIT_2014.md`, `RACES_AUDIT_2014.md`, комментарии bestiary schema/TS |
| 4 | Stance | см. `CATALOG_PUBLIC_STANCE.md` — не клонируем dnd.su/ttg |

## Не в этом слайсе

- Массовый перефраз `long_prose`  
- Чистка `external_ref` из всех JSON на диске (достаточно не светить в API)  
- Google / Telegram OAuth  

## Проверка

```bash
python3 backend/scripts/fetch_bestiary_wave.py --book MM --out /tmp/x.json
# → DISABLED (B2 anti-mirror) … exit 2

# API (после деплоя): любое /catalog/… → "external_ref": null
```
