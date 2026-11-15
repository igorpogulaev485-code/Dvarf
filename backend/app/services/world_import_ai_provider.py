"""W-API-06: интерфейс провайдера извлечения из прозы.

В тестах и без ключа — детерминированные эвристики (stub).
Платный вызов — только если явно настроены WORLD_IMPORT_AI_API_KEY
и WORLD_IMPORT_AI_BASE_URL; ошибки провайдера не валят импорт.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Protocol
from urllib.parse import quote

import httpx

from app.core.config import settings
from app.services.world_vault_parse import ParsedVaultItem

# --- slug ---

_TRANSLIT = {
    "а": "a",
    "б": "b",
    "в": "v",
    "г": "g",
    "д": "d",
    "е": "e",
    "ё": "e",
    "ж": "zh",
    "з": "z",
    "и": "i",
    "й": "y",
    "к": "k",
    "л": "l",
    "м": "m",
    "н": "n",
    "о": "o",
    "п": "p",
    "р": "r",
    "с": "s",
    "т": "t",
    "у": "u",
    "ф": "f",
    "х": "h",
    "ц": "ts",
    "ч": "ch",
    "ш": "sh",
    "щ": "sch",
    "ъ": "",
    "ы": "y",
    "ь": "",
    "э": "e",
    "ю": "yu",
    "я": "ya",
}


def slugify_ru(text: str) -> str:
    raw = (text or "").strip().lower().replace("ё", "е")
    out: list[str] = []
    for ch in raw:
        if ch in _TRANSLIT:
            out.append(_TRANSLIT[ch])
        elif ch.isascii() and (ch.isalnum() or ch in "-_"):
            out.append(ch)
        elif ch in {" ", "_", "/", "\\", ".", ",", ":", ";", "—", "–", "«", "»", '"', "'"}:
            out.append("-")
    slug = re.sub(r"-+", "-", "".join(out)).strip("-")
    return (slug or "item")[:96]


ABILITY_MAP = {
    "сил": "str",
    "лов": "dex",
    "тел": "con",
    "инт": "int",
    "мдр": "wis",
    "хар": "cha",
}

_TABLE_ROW_RE = re.compile(r"^\|(.+)\|$")
_QUEST_HEAD_RE = re.compile(
    r"^###\s*\*?\*?(?:\d+\.\s*)?Квест:\s*[«\"]?(.+?)[»\"]?\*?\*?\s*$",
    re.IGNORECASE | re.MULTILINE,
)
_STAT_NAME_RE = re.compile(
    r"^###\s*[^\w]*\s*\*\*(.+?)\*\*\s*(?:—|-)\s*(.+)$",
    re.MULTILINE,
)
_AC_HP_RE = re.compile(
    r"\*\*КД\*\*\s*(\d+).*?\*\*ХП\*\*\s*(\d+)(?:\s*\(([^)]+)\))?",
    re.IGNORECASE | re.DOTALL,
)
_SPEED_RE = re.compile(r"\*\*Скорость\*\*\s*(\d+)", re.IGNORECASE)
_CR_PAREN_RE = re.compile(r"\(\s*CR\s*(\d+(?:/\d+)?)\s*\)", re.IGNORECASE)
_CR_BARE_RE = re.compile(r"\bCR\s*(\d+(?:/\d+)?)\b", re.IGNORECASE)
_XP_RE = re.compile(r"(\d[\d\s]*)\s*XP", re.IGNORECASE)
_ABILITY_LINE_RE = re.compile(
    r"\*\*(СИЛ|ЛОВ|ТЕЛ|ИНТ|МДР|ХАР)\*\*\s*(\d+)\s*\(([+-]?\d+)\)",
    re.IGNORECASE,
)


@dataclass
class ExtractIssue:
    code: str
    path: str = ""
    message: str = ""
    hint: str = ""


@dataclass
class ExtractResult:
    """Дополнительные пункты черновика + статус провайдера."""

    items: list[ParsedVaultItem] = field(default_factory=list)
    mode: str = "none"  # stub | heuristic | provider | unconfigured
    message: str = ""
    errors: list[ExtractIssue] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


class WorldImportAiProvider(Protocol):
    def extract(self, items: list[ParsedVaultItem], *, rules_edition: str) -> ExtractResult:
        ...


def _ai_proposal_base(
    *,
    title: str,
    parent_path: str,
    import_key: str,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    prop: dict[str, Any] = {
        "title": title,
        "import_key": import_key,
        "slug": import_key,
        "path": parent_path,
        "ai_extracted": True,
        "origin": "ai_extract",
        "rules_edition": "2014",
        "hint": "Предложение из прозы — в канон только после confirm мастера",
    }
    if extra:
        prop.update(extra)
    return prop


def _parse_md_table(body: str) -> list[dict[str, str]]:
    """Простая markdown-таблица: первая строка — заголовки, далее строки данных."""
    rows: list[list[str]] = []
    for line in body.splitlines():
        stripped = line.strip()
        if not _TABLE_ROW_RE.match(stripped):
            if rows:
                break
            continue
        cells = [c.strip() for c in stripped.strip("|").split("|")]
        # Пропуск разделителя |---|
        if cells and all(re.fullmatch(r":?-{3,}:?", c.replace(" ", "")) for c in cells if c):
            continue
        rows.append(cells)
    if len(rows) < 2:
        return []
    headers = [re.sub(r"\*+", "", h).strip().lower() for h in rows[0]]
    out: list[dict[str, str]] = []
    for raw in rows[1:]:
        if len(raw) < len(headers):
            raw = raw + [""] * (len(headers) - len(raw))
        entry = {
            headers[i]: re.sub(r"\*+", "", raw[i]).strip()
            for i in range(len(headers))
        }
        out.append(entry)
    return out


def _extract_kardian_artifacts(item: ParsedVaultItem) -> list[ParsedVaultItem]:
    body = str((item.proposal or {}).get("body") or "")
    if "артефакт" not in (item.proposal or {}).get("title", "").lower() and "кардиан" not in body.lower():
        # Эвристика по таблице «Название / Где сейчас»
        if "название" not in body.lower() or "где сейчас" not in body.lower():
            return []

    # Берём первую таблицу после «Шесть предметов» или первую с колонкой «название»
    section = body
    marker = body.lower().find("шесть предметов")
    if marker >= 0:
        section = body[marker:]
    table = _parse_md_table(section)
    if not table:
        table = _parse_md_table(body)
    name_key = None
    where_key = None
    for key in (table[0].keys() if table else []):
        if "название" in key:
            name_key = key
        if "где" in key:
            where_key = key
    if not name_key:
        return []

    parent = item.source_path or item.source_key
    extracted: list[ParsedVaultItem] = []
    member_keys: list[str] = []
    for row in table:
        title = (row.get(name_key) or "").strip()
        if not title or title.isdigit() or title == "#":
            continue
        # Пропуск строк вроде «У партии»
        if title.lower().startswith("у партии"):
            continue
        import_key = slugify_ru(title)
        member_keys.append(import_key)
        where = (row.get(where_key) or "").strip() if where_key else ""
        desc = f"Где сейчас: {where}" if where else ""
        source_key = f"{parent}#artifact:{import_key}"
        extracted.append(
            ParsedVaultItem(
                item_type="setting_item",
                source_key=source_key,
                source_path=source_key,
                source_slug=import_key,
                proposal=_ai_proposal_base(
                    title=title,
                    parent_path=parent,
                    import_key=import_key,
                    extra={
                        "item_kind": "magic",
                        "description": desc,
                        "body": desc,
                        "parent_source_key": item.source_key,
                    },
                ),
            )
        )

    if len(extracted) >= 2:
        set_key = "artefakty-padeniya"
        set_source = f"{parent}#artifact_set:{set_key}"
        # Пороги из таблицы «Цена ношения», если есть
        thresholds: list[dict[str, Any]] = []
        wear = body.lower().find("цена ношения")
        if wear >= 0:
            wear_table = _parse_md_table(body[wear:])
            for row in wear_table:
                qty = None
                effect = ""
                for k, v in row.items():
                    if "кол" in k or k.strip() in {"#", "n"}:
                        try:
                            qty = int(re.sub(r"\D", "", v) or "0") or None
                        except ValueError:
                            qty = None
                    if "эффект" in k:
                        effect = v
                if qty and effect:
                    thresholds.append({"count": qty, "label": effect[:200]})
        extracted.append(
            ParsedVaultItem(
                item_type="artifact_set",
                source_key=set_source,
                source_path=set_source,
                source_slug=set_key,
                proposal=_ai_proposal_base(
                    title="Артефакты Падения",
                    parent_path=parent,
                    import_key=set_key,
                    extra={
                        "member_import_keys": member_keys,
                        "description": "Шесть артефактов Кардиана (Артефакты Падения)",
                        "thresholds": thresholds,
                        "parent_source_key": item.source_key,
                    },
                ),
            )
        )
    return extracted


def _parse_ability_block(chunk: str) -> dict[str, int]:
    abilities: dict[str, int] = {}
    for m in _ABILITY_LINE_RE.finditer(chunk):
        key = ABILITY_MAP.get(m.group(1).lower())
        if key:
            try:
                abilities[key] = int(m.group(2))
            except ValueError:
                continue
    return abilities


def _extract_statblocks(item: ParsedVaultItem) -> list[ParsedVaultItem]:
    if item.item_type not in {"combat", "note", "location"}:
        return []
    body = str((item.proposal or {}).get("body") or "")
    if "**КД**" not in body and "**ХП**" not in body:
        return []

    parent = item.source_path or item.source_key
    # Режем по ### заголовкам существ
    parts = re.split(r"(?=^###\s)", body, flags=re.MULTILINE)
    out: list[ParsedVaultItem] = []
    for part in parts:
        name_m = re.search(
            r"^###\s*[^\n]*?\*\*([^*]+)\*\*\s*(?:—|-)?\s*([^\n]*)",
            part,
            re.MULTILINE,
        )
        if not name_m:
            continue
        name = name_m.group(1).strip()
        if not name or len(name) < 2:
            continue
        ac_m = _AC_HP_RE.search(part)
        if not ac_m:
            continue
        ac = int(ac_m.group(1))
        hp = int(ac_m.group(2))
        hp_formula = (ac_m.group(3) or "").strip() or None
        speed_m = _SPEED_RE.search(part)
        walk = int(speed_m.group(1)) if speed_m else None
        cr_m = _CR_PAREN_RE.search(part) or _CR_BARE_RE.search(part)
        cr = cr_m.group(1) if cr_m else None
        xp_m = _XP_RE.search(part)
        xp = None
        if xp_m:
            try:
                xp = int(re.sub(r"\s", "", xp_m.group(1)))
            except ValueError:
                xp = None
        abilities = _parse_ability_block(part)
        data: dict[str, Any] = {
            "schema_version": 1,
            "size": "medium",
            "type": "humanoid",
            "type_ru": "гуманоид",
            "ac": ac,
            "hp_average": hp,
            "abilities": abilities,
        }
        if hp_formula:
            data["hp_formula"] = hp_formula
        if walk is not None:
            data["speed"] = {"walk": walk}
        if cr:
            data["cr"] = str(cr)
        if xp is not None:
            data["xp"] = xp
        # Действия — грубо из строк с ***
        actions = []
        for am in re.finditer(r"\*\*\*([^*]+)\*\*\*\.?\s*([^\n]*)", part):
            actions.append({"name_ru": am.group(1).strip(), "text_ru": am.group(2).strip()})
        if actions:
            data["actions"] = actions

        # Ленивый импорт: setting_creatures тянет world_import → цикл.
        from app.services.setting_creatures import validate_creature_statblock

        result = validate_creature_statblock(data, rules_edition="2014")
        incomplete = result.incomplete or not result.valid
        notes = list(result.incompleteness_notes or [])
        if not result.valid:
            notes.extend(e.message for e in result.errors)
            # Неполный/частичный разбор — всё равно предложение, с флагом
            normalized = result.normalized_data or data
        else:
            normalized = result.normalized_data

        import_key = slugify_ru(name)
        source_key = f"{parent}#creature:{import_key}"
        out.append(
            ParsedVaultItem(
                item_type="setting_creature",
                source_key=source_key,
                source_path=source_key,
                source_slug=import_key,
                proposal=_ai_proposal_base(
                    title=name,
                    parent_path=parent,
                    import_key=import_key,
                    extra={
                        "data": normalized,
                        "incomplete": incomplete,
                        "incompleteness_notes": notes,
                        "parent_source_key": item.source_key,
                        "source": "extracted",
                    },
                ),
            )
        )
    return out


def _extract_quests(item: ParsedVaultItem) -> list[ParsedVaultItem]:
    body = str((item.proposal or {}).get("body") or "")
    title = str((item.proposal or {}).get("title") or "")
    path = (item.source_path or item.source_key or "").lower()
    if "квест" not in body.lower() and "квест" not in title.lower() and "quest" not in path:
        return []
    if "###" not in body:
        return []

    parent = item.source_path or item.source_key
    out: list[ParsedVaultItem] = []
    # Разбиваем по ### заголовкам квестов
    for m in re.finditer(
        r"^###\s*\*?\*?(?:\d+\.\s*)?Квест:\s*[«\"]?(.+?)[»\"]?\*?\*?\s*$",
        body,
        re.IGNORECASE | re.MULTILINE,
    ):
        qtitle = m.group(1).strip()
        if not qtitle:
            continue
        start = m.end()
        nxt = re.search(r"^###\s", body[start:], re.MULTILINE)
        chunk = body[start : start + nxt.start()] if nxt else body[start:]
        import_key = slugify_ru(qtitle)
        source_key = f"{parent}#quest:{import_key}"
        out.append(
            ParsedVaultItem(
                item_type="quest",
                source_key=source_key,
                source_path=source_key,
                source_slug=import_key,
                proposal=_ai_proposal_base(
                    title=qtitle,
                    parent_path=parent,
                    import_key=import_key,
                    extra={
                        "body": chunk.strip()[:8000],
                        "parent_source_key": item.source_key,
                    },
                ),
            )
        )
    return out


def _office_suggestion_items(item: ParsedVaultItem) -> list[ParsedVaultItem]:
    """Должности из прозы — только подсказка мастеру, без привязки к человеку."""
    body = str((item.proposal or {}).get("body") or "")
    # Не плодим шум: только явные формулировки «мэр … — Имя» без авто-ребра.
    if not re.search(r"\bмэр\b", body, re.IGNORECASE):
        return []
    # Если уже есть YAML offices у локации — deterministic W-API-03 справится.
    fm = (item.proposal or {}).get("frontmatter") or {}
    if isinstance(fm, dict) and fm.get("offices"):
        return []
    parent = item.source_path or item.source_key
    # Одна мета-подсказка на файл, не связываем с NPC.
    source_key = f"{parent}#office_hint:mer"
    return [
        ParsedVaultItem(
            item_type="ai_suggestion",
            source_key=source_key,
            source_path=source_key,
            source_slug="office-hint-mer",
            proposal=_ai_proposal_base(
                title="Возможная должность: мэр",
                parent_path=parent,
                import_key="office-hint-mer",
                extra={
                    "suggestion_kind": "office",
                    "office_title": "мэр",
                    "hint": (
                        "В тексте есть слово «мэр». Не привязываем к человеку автоматически — "
                        "выберите держателя и локацию вручную (занимает должность)."
                    ),
                    "parent_source_key": item.source_key,
                },
            ),
        )
    ]


def run_heuristic_extract(
    items: list[ParsedVaultItem],
    *,
    rules_edition: str = "2014",
    mode: str = "heuristic",
    message: str = "",
) -> ExtractResult:
    """Безопасные детерминированные эвристики: таблицы, статблоки, квесты."""
    del rules_edition  # только 2014 на этом этапе; уже проверено снаружи
    extra: list[ParsedVaultItem] = []
    warnings: list[str] = []
    seen: set[str] = set()

    for item in items:
        # Не нарезаем уже извлечённые пункты.
        if (item.proposal or {}).get("ai_extracted"):
            continue
        for produced in (
            _extract_kardian_artifacts(item)
            + _extract_statblocks(item)
            + _extract_quests(item)
            + _office_suggestion_items(item)
        ):
            if produced.source_key in seen:
                continue
            seen.add(produced.source_key)
            extra.append(produced)

    if not message:
        if mode == "unconfigured":
            message = (
                "Ключ провайдера ИИ не настроен — применены только безопасные эвристики"
            )
        elif mode == "stub":
            message = "Извлечение: детерминированный stub"
        else:
            message = "Извлечение: детерминированные эвристики"

    if not extra:
        warnings.append("Эвристики не нашли дополнительных сущностей в прозе")

    return ExtractResult(
        items=extra,
        mode=mode,
        message=message,
        warnings=warnings,
    )


class StubWorldImportAiProvider:
    """Детерминированный stub для тестов."""

    def extract(self, items: list[ParsedVaultItem], *, rules_edition: str) -> ExtractResult:
        return run_heuristic_extract(
            items, rules_edition=rules_edition, mode="stub", message="Извлечение: stub"
        )


class HeuristicWorldImportAiProvider:
    def __init__(self, *, mode: str = "heuristic", message: str = "") -> None:
        self.mode = mode
        self.message = message

    def extract(self, items: list[ParsedVaultItem], *, rules_edition: str) -> ExtractResult:
        return run_heuristic_extract(
            items,
            rules_edition=rules_edition,
            mode=self.mode,
            message=self.message,
        )


class RemoteWorldImportAiProvider:
    """Тонкий HTTP-клиент. Без ключа/URL не создаётся. Ошибки → ExtractIssue."""

    def __init__(self, *, api_key: str, base_url: str, timeout_s: float = 20.0) -> None:
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout_s = timeout_s

    def extract(self, items: list[ParsedVaultItem], *, rules_edition: str) -> ExtractResult:
        # Сначала безопасные эвристики — канон ими не пишется.
        base = run_heuristic_extract(
            items,
            rules_edition=rules_edition,
            mode="provider",
            message="Провайдер настроен; эвристики применены, ответ модели — дополнение",
        )
        payload = {
            "rules_edition": rules_edition,
            "items": [
                {
                    "item_type": it.item_type,
                    "source_key": it.source_key,
                    "title": (it.proposal or {}).get("title"),
                    "body": ((it.proposal or {}).get("body") or "")[:12000],
                }
                for it in items
                if not (it.proposal or {}).get("ai_extracted")
            ],
        }
        try:
            with httpx.Client(timeout=self.timeout_s) as client:
                resp = client.post(
                    f"{self.base_url}/v1/world-import/extract",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
            if resp.status_code >= 400:
                base.errors.append(
                    ExtractIssue(
                        code="ai_provider_error",
                        path=quote(self.base_url, safe=":/"),
                        message="Провайдер ИИ вернул ошибку",
                        hint="Проверьте ключ и URL; канон не изменён, эвристики сохранены",
                    )
                )
                base.message = "Провайдер недоступен — оставлены только эвристики"
                return base
            # Ответ провайдера намеренно игнорируем в этой пачке, если формат неизвестен:
            # безопасные предложения уже в base.items. Расширение — следующие пачки.
            data = resp.json() if resp.content else {}
            if isinstance(data, dict) and data.get("items"):
                base.warnings.append(
                    "Провайдер ответил; внешние пункты пока не сливаются — только эвристики"
                )
        except httpx.HTTPError as exc:
            base.errors.append(
                ExtractIssue(
                    code="ai_provider_error",
                    path="",
                    message=f"Сбой вызова провайдера ИИ: {exc.__class__.__name__}",
                    hint="Повторите позже или отключите WORLD_IMPORT_AI_BASE_URL; канон цел",
                )
            )
            base.message = "Провайдер недоступен — оставлены только эвристики"
        return base


_provider_override: WorldImportAiProvider | None = None


def set_world_import_ai_provider(provider: WorldImportAiProvider | None) -> None:
    """Подмена в тестах (stub). Передайте None, чтобы сбросить."""
    global _provider_override
    _provider_override = provider


def get_world_import_ai_provider() -> WorldImportAiProvider:
    if _provider_override is not None:
        return _provider_override
    name = (settings.world_import_ai_provider or "auto").strip().lower()
    if name == "stub":
        return StubWorldImportAiProvider()
    key = (settings.world_import_ai_api_key or "").strip()
    base = (settings.world_import_ai_base_url or "").strip()
    if name == "remote" or (key and base):
        if not key or not base:
            return HeuristicWorldImportAiProvider(
                mode="unconfigured",
                message="Провайдер выбран, но ключ/URL не заданы — только эвристики",
            )
        return RemoteWorldImportAiProvider(api_key=key, base_url=base)
    if not key:
        return HeuristicWorldImportAiProvider(
            mode="unconfigured",
            message="Ключ провайдера ИИ не настроен — применены только безопасные эвристики",
        )
    # Ключ есть, URL нет — не звоним в платный API наугад.
    return HeuristicWorldImportAiProvider(
        mode="heuristic",
        message="Ключ есть, URL провайдера нет — только безопасные эвристики",
    )
