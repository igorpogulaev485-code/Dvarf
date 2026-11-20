# P24-01 — каркас, флаг и сид редакции 2024

Дата: 2026-11-16. Ветка `cursor/edition-P24-01-framework`. **Не открывает** 2024 игрокам.

## Что сделано

- Флаг `RULES_EDITION_2024_OPEN` (по умолчанию выкл.): `POST /characters` с 2024 → `rules_edition_closed`.
- `PATCH` больше не меняет `rules_edition` (`rules_edition_locked`).
- Скрипт `backend/scripts/purge_rules_edition_2024_characters.py` (dry-run + бэкап; `--execute` только после «да» Игоря). На проде не запускался.
- `lobbies.rules_edition` (2014/2024), задаётся при создании; посадка чужой редакции → `lobby_rules_edition_mismatch`.
- Живой идемпотентный сид-каркас `edition_2024_catalog_seed` (волны пустые; сырой `catalog.json` не активируется).
- Подпись «вид»/«раса» по редакции.

## 2014

Создание, лист, лобби и печать 2014 не ломаются. Кнопка «D&D 2024» по-прежнему скрыта.
