# Скрипт удаления старых персонажей 2024 (P24-01)

**Удаление на проде — только после явного подтверждения Игоря.**

В пачке P24-01 скрипт только подготовлен. На проде удаление **не** запускалось.
Миграция Alembic `p2401lobbyed01` персонажей **не** удаляет.

```bash
# Сухой прогон (по умолчанию): число, id, бэкап JSON — без удаления
cd backend
PYTHONPATH=. python scripts/purge_rules_edition_2024_characters.py

# Настоящее soft-delete — только после «да» Игоря
PYTHONPATH=. python scripts/purge_rules_edition_2024_characters.py --execute
```

Бэкап пишется до удаления (и при dry-run тоже) в `backups/purge_rules_edition_2024_*.json`.
