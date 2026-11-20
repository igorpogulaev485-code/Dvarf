/**
 * P24-01 / M06: client mirror of RULES_EDITION_2024_OPEN.
 * Флаг открыт по решению Игоря 20.11.2026.
 * BE на проде: docker-compose.prod default true (выключить — RULES_EDITION_2024_OPEN=false в .env).
 * config.py default False не трогаем (pydantic читает env из compose).
 */
export const RULES_EDITION_2024_OPEN = true
