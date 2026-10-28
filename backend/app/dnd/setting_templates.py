"""C5: системные шаблоны страниц сеттинга (seed + runtime defaults)."""

from __future__ import annotations

from typing import Any
from uuid import UUID

PAGE_KINDS = (
    "location",
    "npc",
    "faction",
    "quest",
    "item_lore",
    "note",
)

PAGE_KIND_LABELS_RU: dict[str, str] = {
    "location": "Локация",
    "npc": "НПС",
    "faction": "Фракция",
    "quest": "Квест",
    "item_lore": "Предмет",
    "note": "Заметка",
}

QUEST_STATUSES = ("planned", "active", "done", "failed")

# Стабильные UUID системных шаблонов — одна миграция / ресид.
SYSTEM_TEMPLATE_IDS: dict[str, UUID] = {
    "location": UUID("a1000000-0000-4000-8000-000000000001"),
    "npc": UUID("a1000000-0000-4000-8000-000000000002"),
    "faction": UUID("a1000000-0000-4000-8000-000000000003"),
    "quest": UUID("a1000000-0000-4000-8000-000000000004"),
    "item_lore": UUID("a1000000-0000-4000-8000-000000000005"),
    "note": UUID("a1000000-0000-4000-8000-000000000006"),
}


def _field(
    key: str,
    label: str,
    type_: str = "text",
    *,
    gm_only: bool = False,
    options: list[str] | None = None,
) -> dict[str, Any]:
    row: dict[str, Any] = {"key": key, "label": label, "type": type_, "gm_only": gm_only}
    if options is not None:
        row["options"] = options
    return row


SYSTEM_TEMPLATES: list[dict[str, Any]] = [
    {
        "id": SYSTEM_TEMPLATE_IDS["location"],
        "page_kind": "location",
        "name": "Локация",
        "body_seed": "",
        "schema": [
            _field("region", "Регион"),
            _field("atmosphere", "Атмосфера", "long"),
            _field("dangers", "Опасности", "long"),
            _field("gm_notes", "Заметки мастера", "long", gm_only=True),
        ],
    },
    {
        "id": SYSTEM_TEMPLATE_IDS["npc"],
        "page_kind": "npc",
        "name": "НПС",
        "body_seed": "",
        "schema": [
            _field("role", "Роль"),
            _field(
                "disposition",
                "Отношение",
                "select",
                options=["дружелюбный", "нейтральный", "враждебный", "неизвестно"],
            ),
            _field("hooks", "Зацепки", "long"),
            _field("secrets", "Секреты", "long", gm_only=True),
        ],
    },
    {
        "id": SYSTEM_TEMPLATE_IDS["faction"],
        "page_kind": "faction",
        "name": "Фракция",
        "body_seed": "",
        "schema": [
            _field("goals", "Цели", "long"),
            _field("resources", "Ресурсы", "long"),
            _field("attitude_to_party", "Отношение к пати", "long"),
            _field("gm_notes", "Заметки мастера", "long", gm_only=True),
        ],
    },
    {
        "id": SYSTEM_TEMPLATE_IDS["quest"],
        "page_kind": "quest",
        "name": "Квест",
        "body_seed": "",
        "schema": [
            _field("reward", "Награда", "long"),
            _field("stakeholders", "Участники", "long"),
            _field("gm_notes", "Заметки мастера", "long", gm_only=True),
        ],
    },
    {
        "id": SYSTEM_TEMPLATE_IDS["item_lore"],
        "page_kind": "item_lore",
        "name": "Предмет (лор)",
        "body_seed": "",
        "schema": [
            _field("origin", "Происхождение", "long"),
            _field("powers", "Свойства", "long"),
            _field("gm_notes", "Заметки мастера", "long", gm_only=True),
        ],
    },
    {
        "id": SYSTEM_TEMPLATE_IDS["note"],
        "page_kind": "note",
        "name": "Заметка",
        "body_seed": "",
        "schema": [],
    },
]


def empty_fields_for_schema(schema: list[Any] | None) -> dict[str, str]:
    out: dict[str, str] = {}
    for item in schema or []:
        if isinstance(item, dict) and item.get("key"):
            out[str(item["key"])] = ""
    return out


def default_quest_status(page_kind: str) -> str | None:
    return "planned" if page_kind == "quest" else None
