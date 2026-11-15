"""W-API-03: стабильные алиасы и предложенные связи черновика.

Алиас — только другое имя того же персонажа (прозвище, написание,
имя с титулом-приставкой). Должность (мэр, король, староста…) — НЕ алиас:
это ребро «занимает должность» НПС → локация/фракция.

Переиспользует setting_mentions ([[]] / @) и подписи LINK_PRESETS где уместно.
Пресеты SettingPageLink не умеют поля должности/преемства — они в строке
черновика. В канон SettingPageLink / setting_pages не пишет.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import PurePosixPath
from typing import Any, Iterable
from urllib.parse import unquote, urlparse

from app.dnd.setting_link_presets import LINK_PRESETS
from app.dnd.setting_mentions import extract_mention_titles, normalize_mention_title
from app.services.world_vault_parse import normalize_vault_path, slug_from_path

# Markdown-ссылки на файлы: [подпись](../lore/x.md)
_MD_LINK_RE = re.compile(r"\[([^\]]*)\]\(([^)]+)\)")
# Голые жирные имена — кандидаты, не канон
_BOLD_RE = re.compile(r"\*\*([^*]{1,200})\*\*")

_PRESET_LABELS = frozenset(p["label"] for p in LINK_PRESETS)

# Поля YAML → подпись из пресетов (где уместно)
_FM_FIELD_TO_LABEL: dict[str, str] = {
    "location": "живёт в",
    "faction": "член",
}

# Подпись должности в черновике (в LINK_PRESETS канона нет доп. полей — храним здесь)
OFFICE_LINK_LABEL = "занимает должность"
OFFICE_NEEDS_MASTER_HINT = "должность, нужен выбор мастера"

# Приставки к имени (остаются в составном алиасе «Капитан Тандил»,
# но сами по себе должностью/алиасом не становятся).
_NAME_PREFIXES = frozenset(
    {
        "капитан",
        "майор",
        "сер",
        "леди",
        "лорд",
        "маэстро",
        "мэтр",
        "отец",
        "мать",
        "брат",
        "сестра",
    }
)

# Общие слова-должности — НИКОГДА не алиасы персонажа.
_OFFICE_WORDS = frozenset(
    {
        "мэр",
        "мэром",
        "мэра",
        "мэрии",
        "король",
        "королева",
        "короля",
        "королевы",
        "староста",
        "регент",
        "регента",
        "правитель",
        "правителя",
        "губернатор",
        "капитан стражи",
        "командир",
        "комендант",
        "распорядитель",
        "глашатай",
    }
)

_ARROW_SPLIT_RE = re.compile(r"\s*(?:→|->)\s*")
_ALT_NAME_SPLIT_RE = re.compile(r"\s*(?:/|\||—|–)\s*")


@dataclass(frozen=True)
class DraftLinkProposal:
    from_source_key: str
    to_source_key: str | None
    to_alias: str | None
    kind: str  # semantic | mention — как SettingPageLink; office тоже semantic+label
    label: str
    confidence: str  # explicit | suggested
    office_title: str | None = None
    office_holder_status: str | None = None  # current | former
    succession_order: int | None = None
    tenure_from: str | None = None
    tenure_to: str | None = None
    hint: str | None = None


@dataclass
class AliasBundle:
    """Алиасы-имена одного пункта (+ вытащенная должность из «Имя → должность»)."""

    aliases: list[str] = field(default_factory=list)
    office_from_title: str | None = None

    @property
    def norms(self) -> list[tuple[str, str]]:
        out: list[tuple[str, str]] = []
        seen: set[str] = set()
        for alias in self.aliases:
            display = normalize_alias_display(alias)
            if not display or is_office_phrase(display):
                continue
            norm = normalize_alias_key(display)
            if not norm or norm in seen or is_office_phrase(norm):
                continue
            seen.add(norm)
            out.append((display, norm))
        return out


def normalize_alias_display(raw: str) -> str:
    """Схлопнуть пробелы/подчёркивания, срезать кавычки и хвостовую пунктуацию."""
    text = normalize_mention_title(raw or "")
    text = text.strip("«»\"'„“”‚‘’()[]")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def normalize_alias_key(raw: str) -> str:
    """Ключ сопоставления: регистр и пробелы не плодят второго «Тандила»."""
    return normalize_alias_display(raw).casefold()


def is_office_phrase(raw: str) -> bool:
    """Общее слово-должность (мэр, король, староста…) — не имя персонажа."""
    text = normalize_alias_display(raw)
    if not text:
        return False
    folded = text.casefold()
    if folded in _OFFICE_WORDS:
        return True
    # «мэр военного времени», «капитан городской стражи»
    for word in _OFFICE_WORDS:
        if folded == word or folded.startswith(word + " ") or folded.endswith(" " + word):
            return True
    if "мэр" in folded.split() or folded.startswith("мэр "):
        return True
    if folded.startswith("капитан стражи") or "капитан городской стражи" in folded:
        return True
    return False


def unnamed_office_holder_key(*, seat_key: str, office_title: str, order: int) -> str:
    """Стабильный ключ безымянного держателя — ни с кем не сливается."""
    office_norm = normalize_alias_key(office_title).replace(" ", "-") or "office"
    seat = (seat_key or "seat").replace("/", "__")
    return f"__unnamed__/office/{office_norm}/{seat}/{order}"


def _name_variants_from_phrase(phrase: str) -> list[str]:
    """«Капитан Тандил» → [«Капитан Тандил», «Тандил»]; чистое «мэр» → []."""
    text = normalize_alias_display(phrase)
    if not text or is_office_phrase(text):
        return []
    out = [text]
    tokens = text.split()
    if len(tokens) >= 2 and tokens[0].casefold() in _NAME_PREFIXES:
        rest = " ".join(tokens[1:])
        if rest and not is_office_phrase(rest):
            out.append(rest)
    return out


def split_title_name_and_office(title: str) -> tuple[list[str], str | None]:
    """Разделить заголовок на имена-алиасы и должность.

    «Капитан Тандил → мэр» → имена [Капитан Тандил, Тандил], должность «мэр».
    «Константин III / Элессар I» → два имени, без должности.
    """
    text = (title or "").strip()
    if not text:
        return [], None

    office: str | None = None
    name_part = text
    arrow_parts = _ARROW_SPLIT_RE.split(text, maxsplit=1)
    if len(arrow_parts) == 2:
        name_part = arrow_parts[0].strip()
        right = normalize_alias_display(arrow_parts[1])
        if right and is_office_phrase(right):
            office = right
        elif right and not is_office_phrase(right):
            # Стрелка к другому имени — редкий случай; оба как имена.
            names = _name_variants_from_phrase(name_part)
            names.extend(_name_variants_from_phrase(right))
            return names, None

    names: list[str] = []
    # Альтернативные написания через /
    alt_parts = _ALT_NAME_SPLIT_RE.split(name_part) if name_part else []
    if len(alt_parts) > 1:
        for part in alt_parts:
            names.extend(_name_variants_from_phrase(part))
    else:
        names.extend(_name_variants_from_phrase(name_part))
    return names, office


def collect_aliases_for_item(
    *,
    title: str,
    slug: str | None,
    body: str,
    frontmatter: dict[str, Any] | None = None,
) -> AliasBundle:
    """Алиасы-имена из заголовка, H1, ярлыка и явных YAML; должности отсекаются."""
    aliases: list[str] = []
    names, office = split_title_name_and_office(title)
    aliases.extend(names)

    if slug:
        slug_as_name = slug.replace("-", " ")
        if not is_office_phrase(slug_as_name):
            aliases.append(slug_as_name)
            aliases.append(slug)

    fm = frontmatter or {}
    for key in ("aliases", "aka", "also_known_as", "names"):
        raw = fm.get(key)
        values: list[str] = []
        if isinstance(raw, str) and raw.strip():
            values = [raw]
        elif isinstance(raw, list):
            values = [item for item in raw if isinstance(item, str) and item.strip()]
        for item in values:
            n, _o = split_title_name_and_office(item)
            aliases.extend(n)

    for line in (body or "").splitlines():
        stripped = line.strip()
        if stripped.startswith("#") and not stripped.startswith("##"):
            heading = stripped.lstrip("#").strip()
            if heading:
                n, _o = split_title_name_and_office(heading)
                aliases.extend(n)
            break

    return AliasBundle(aliases=aliases, office_from_title=office)


def resolve_md_href(from_path: str, href: str) -> str | None:
    """Резолв относительной markdown-ссылки в путь хранилища; внешние URL — None."""
    raw = (href or "").strip()
    if not raw:
        return None
    if raw.startswith("#") or "://" in raw or raw.startswith("mailto:"):
        return None
    parsed = urlparse(raw)
    path_part = unquote(parsed.path or "")
    if not path_part:
        return None
    if not path_part.lower().endswith((".md", ".markdown")):
        return None
    base_dir = PurePosixPath(from_path).parent
    joined = (base_dir / path_part).as_posix()
    parts: list[str] = []
    for part in PurePosixPath(joined).parts:
        if part in ("", "."):
            continue
        if part == "..":
            if parts:
                parts.pop()
            continue
        parts.append(part)
    try:
        return normalize_vault_path("/".join(parts))
    except Exception:
        return None


def extract_md_file_links(from_path: str, body: str) -> list[tuple[str, str]]:
    """[(подпись или stem, нормализованный путь целевого .md), …]."""
    out: list[tuple[str, str]] = []
    seen: set[str] = set()
    for match in _MD_LINK_RE.finditer(body or ""):
        label = (match.group(1) or "").strip()
        href = match.group(2) or ""
        target = resolve_md_href(from_path, href)
        if target is None or target in seen:
            continue
        seen.add(target)
        display = label or slug_from_path(target)
        out.append((display, target))
    return out


def extract_bold_candidates(body: str) -> list[str]:
    """Уникальные жирные фрагменты в порядке появления."""
    seen: set[str] = set()
    out: list[str] = []
    for match in _BOLD_RE.finditer(body or ""):
        display = normalize_alias_display(match.group(1))
        if not display:
            continue
        key = normalize_alias_key(display)
        if key in seen:
            continue
        seen.add(key)
        out.append(display)
    return out


def preset_label_or_empty(label: str) -> str:
    text = (label or "").strip()
    return text if text in _PRESET_LABELS else ""


_UNNAMED_HOLDER_LABELS = frozenset(
    {
        "unnamed",
        "безымянный",
        "безымянная",
        "неизвестно",
        "(безымянный)",
        "(безымянная)",
    }
)


def _resolve_holder_key(
    raw: dict[str, Any] | str | None,
    *,
    seat_source_key: str,
    office_title: str,
    order: int,
    path_index: dict[str, str],
    alias_index: dict[str, str],
) -> str:
    """Имя/путь/slug держателя → source_key; пусто/unnamed → __unnamed__/…"""

    def _unnamed() -> str:
        return unnamed_office_holder_key(
            seat_key=seat_source_key, office_title=office_title, order=order
        )

    def _from_text(text: str) -> str:
        cleaned = text.strip()
        if not cleaned or cleaned.casefold() in _UNNAMED_HOLDER_LABELS:
            return _unnamed()
        if cleaned in path_index:
            return path_index[cleaned]
        if "/" in cleaned:
            try:
                norm_path = normalize_vault_path(cleaned)
            except Exception:
                norm_path = ""
            if norm_path and norm_path in path_index:
                return path_index[norm_path]
        by_alias = alias_index.get(normalize_alias_key(cleaned))
        if by_alias:
            return by_alias
        # Не резолвилось — отдельный безымянный слот, без слияния с чужими ключами
        return _unnamed()

    if raw is None:
        return _unnamed()
    if isinstance(raw, str):
        return _from_text(raw)
    if not isinstance(raw, dict):
        return _unnamed()
    if raw.get("unnamed") is True:
        return _unnamed()
    for key in ("holder_source_key", "holder", "path", "name", "slug"):
        val = raw.get(key)
        if isinstance(val, str) and val.strip():
            return _from_text(val)
        if val is None and key == "name" and raw.get("unnamed") is not False:
            # name: null при остальных пустых → безымянный
            continue
    # Пустая запись держателя
    return _unnamed()


def _normalize_holder_status(raw: Any, *, default: str = "former") -> str:
    if not isinstance(raw, str) or not raw.strip():
        return default
    text = raw.strip().casefold()
    if text in {"current", "текущий", "текущая", "сейчас"}:
        return "current"
    if text in {"former", "бывший", "бывшая", "ранее", "прошлый", "прошлая"}:
        return "former"
    return default


def build_office_succession(
    *,
    office_title: str,
    seat_source_key: str,
    holders: list[dict[str, Any]],
    path_index: dict[str, str] | None = None,
    alias_index: dict[str, str] | None = None,
) -> list[DraftLinkProposal]:
    """Цепочка держателей одной должности на одном месте (локация/фракция).

    holders: записи с name/holder/path/slug/unnamed, status, order, tenure_from/to.
    Безымянный получает стабильный __unnamed__/… ключ.
    """
    title = normalize_alias_display(office_title)
    if not title or not seat_source_key:
        return []
    paths = path_index or {}
    aliases = alias_index or {}
    proposals: list[DraftLinkProposal] = []
    for raw in holders:
        if not isinstance(raw, dict):
            raw = {"name": raw}
        order = int(raw.get("order", len(proposals)))
        holder_key = _resolve_holder_key(
            raw,
            seat_source_key=seat_source_key,
            office_title=title,
            order=order,
            path_index=paths,
            alias_index=aliases,
        )
        status = _normalize_holder_status(raw.get("status"), default="former")
        proposals.append(
            DraftLinkProposal(
                from_source_key=holder_key,
                to_source_key=seat_source_key,
                to_alias=None,
                kind="semantic",
                label=OFFICE_LINK_LABEL,
                confidence="explicit",
                office_title=title[:120],
                office_holder_status=status,
                succession_order=order,
                tenure_from=(
                    str(raw["tenure_from"])[:200] if raw.get("tenure_from") else None
                ),
                tenure_to=(str(raw["tenure_to"])[:200] if raw.get("tenure_to") else None),
                hint=None,
            )
        )
    return proposals


def office_proposals_from_seat_frontmatter(
    *,
    seat_source_key: str,
    frontmatter: dict[str, Any] | None,
    path_index: dict[str, str],
    alias_index: dict[str, str],
) -> list[DraftLinkProposal]:
    """Список `offices:` на карточке места (локация/фракция) → цепочки держателей."""
    fm = frontmatter or {}
    raw_offices = fm.get("offices")
    if not isinstance(raw_offices, list) or not raw_offices:
        return []
    out: list[DraftLinkProposal] = []
    for entry in raw_offices:
        if not isinstance(entry, dict):
            continue
        title = entry.get("title") or entry.get("office") or entry.get("name")
        if not isinstance(title, str) or not title.strip():
            continue
        holders = entry.get("holders") or entry.get("succession") or []
        if not isinstance(holders, list):
            continue
        # Нормализуем записи holders
        normalized: list[dict[str, Any]] = []
        for i, h in enumerate(holders):
            if isinstance(h, dict):
                row = dict(h)
                if "order" not in row:
                    row["order"] = i
                normalized.append(row)
            elif h is None:
                normalized.append({"unnamed": True, "order": i, "status": "former"})
            elif isinstance(h, str):
                normalized.append({"name": h, "order": i, "status": "former"})
        out.extend(
            build_office_succession(
                office_title=title.strip(),
                seat_source_key=seat_source_key,
                holders=normalized,
                path_index=path_index,
                alias_index=alias_index,
            )
        )
    return out


_OFFICE_SECTION_RE = re.compile(
    r"(?im)^##\s+(Должности|Offices)\s*$"
)
_OFFICE_SUBHEAD_RE = re.compile(r"(?m)^###\s+(.+?)\s*$")
_OFFICE_HOLDER_LINE_RE = re.compile(
    r"(?m)^\s*(?:[-*]|\d+[.)])\s+(.*?)\s*$"
)


def office_proposals_from_seat_body(
    *,
    seat_source_key: str,
    body: str,
    path_index: dict[str, str],
    alias_index: dict[str, str],
) -> list[DraftLinkProposal]:
    """Текстовый блок «## Должности» / «## Offices» с подзаголовками должностей.

    Пример::

        ## Должности
        ### мэр Лунного моста
        1. безымянный — бывший
        2. [[Маэстро Келебрим]] — бывший; по: гибель Маэстро
        3. [[Тандил]] — текущий; с: после гибели Маэстро
    """
    if not body:
        return []
    section_match = _OFFICE_SECTION_RE.search(body)
    if not section_match:
        return []
    rest = body[section_match.end() :]
    # Обрезать до следующего ## того же уровня
    next_h2 = re.search(r"(?m)^##\s+", rest)
    if next_h2:
        rest = rest[: next_h2.start()]

    out: list[DraftLinkProposal] = []
    parts = _OFFICE_SUBHEAD_RE.split(rest)
    # parts: [preamble, title1, block1, title2, block2, ...]
    i = 1
    while i + 1 < len(parts):
        office_title = normalize_alias_display(parts[i])
        block = parts[i + 1]
        i += 2
        if not office_title:
            continue
        holders: list[dict[str, Any]] = []
        for line_match in _OFFICE_HOLDER_LINE_RE.finditer(block):
            line = line_match.group(1).strip()
            if not line:
                continue
            # [[Name]] или голое имя; хвост после — / ;
            mention = re.search(r"\[\[([^\]]+)\]\]", line)
            name_part = mention.group(1) if mention else line.split("—")[0].split(";")[0].split(",")[0]
            name_part = normalize_alias_display(name_part)
            status = "former"
            folded = line.casefold()
            if "текущ" in folded or "сейчас" in folded or "current" in folded:
                status = "current"
            elif "бывш" in folded or "former" in folded or "ранее" in folded:
                status = "former"
            tenure_from = None
            tenure_to = None
            from_m = re.search(r"(?:с|from)\s*:\s*([^;—]+)", line, flags=re.I)
            to_m = re.search(r"(?:по|to|до)\s*:\s*([^;—]+)", line, flags=re.I)
            if from_m:
                tenure_from = from_m.group(1).strip()
            if to_m:
                tenure_to = to_m.group(1).strip()
            unnamed = name_part.casefold() in {
                "безымянный",
                "безымянная",
                "unnamed",
                "(безымянный)",
            } or not name_part
            holders.append(
                {
                    "unnamed": unnamed,
                    "name": None if unnamed else name_part,
                    "status": status,
                    "order": len(holders),
                    "tenure_from": tenure_from,
                    "tenure_to": tenure_to,
                }
            )
        if holders:
            out.extend(
                build_office_succession(
                    office_title=office_title,
                    seat_source_key=seat_source_key,
                    holders=holders,
                    path_index=path_index,
                    alias_index=alias_index,
                )
            )
    return out


def office_proposals_from_item(
    *,
    source_key: str,
    title: str,
    body: str,
    frontmatter: dict[str, Any] | None,
    alias_bundle: AliasBundle,
    path_index: dict[str, str],
    alias_index: dict[str, str],
) -> list[DraftLinkProposal]:
    """Должность на карточке НПС (office / «Имя → мэр») → ребро на место."""
    fm = frontmatter or {}
    office = alias_bundle.office_from_title
    raw_office = fm.get("office") or fm.get("position") or fm.get("role_title")
    if isinstance(raw_office, str) and raw_office.strip():
        office = normalize_alias_display(raw_office)

    if not office or not is_office_phrase(office):
        # Жирный фрагмент-должность в теле («мэром военного времени»)
        for bold in extract_bold_candidates(body):
            if is_office_phrase(bold):
                office = bold
                break
    if not office:
        return []

    seat_key: str | None = None
    for field_name in ("location", "faction", "seat"):
        raw = fm.get(field_name)
        if not isinstance(raw, str) or not raw.strip():
            continue
        first = _ALT_NAME_SPLIT_RE.split(raw.strip(), maxsplit=1)[0]
        seat_key = alias_index.get(normalize_alias_key(first))
        if seat_key:
            break
    if seat_key is None:
        return []

    status = "current"
    fm_status = fm.get("office_status") or fm.get("position_status")
    if isinstance(fm_status, str) and fm_status.strip():
        status = _normalize_holder_status(fm_status, default="current")

    order_raw = fm.get("succession_order")
    try:
        order = int(order_raw) if order_raw is not None else 0
    except (TypeError, ValueError):
        order = 0

    return [
        DraftLinkProposal(
            from_source_key=source_key,
            to_source_key=seat_key,
            to_alias=None,
            kind="semantic",
            label=OFFICE_LINK_LABEL,
            confidence="explicit",
            office_title=office[:120],
            office_holder_status=status,
            succession_order=order,
            tenure_from=(
                str(fm["tenure_from"])[:200] if isinstance(fm.get("tenure_from"), str) else None
            ),
            tenure_to=(
                str(fm["tenure_to"])[:200] if isinstance(fm.get("tenure_to"), str) else None
            ),
            hint=None,
        )
    ]


def build_link_proposals_for_item(
    *,
    source_key: str,
    path: str,
    body: str,
    frontmatter: dict[str, Any] | None,
    path_index: dict[str, str],
    alias_index: dict[str, str],
    self_norms: set[str],
    alias_bundle: AliasBundle | None = None,
) -> list[DraftLinkProposal]:
    """Собрать предложенные рёбра: md, [[]]/@, пресеты, должности; «мэр»≠человек."""
    proposals: list[DraftLinkProposal] = []
    seen_edges: set[tuple] = set()

    def _add(prop: DraftLinkProposal) -> None:
        if prop.to_source_key is None and prop.office_title is None:
            return
        if prop.to_source_key == source_key and prop.from_source_key == source_key:
            return
        edge = (
            prop.from_source_key,
            prop.to_source_key,
            prop.kind,
            prop.label,
            prop.confidence,
            prop.office_title,
            prop.succession_order,
        )
        if edge in seen_edges:
            return
        seen_edges.add(edge)
        proposals.append(prop)

    # 1) Явные markdown-ссылки на .md
    for display, target_path in extract_md_file_links(path, body):
        to_key = path_index.get(target_path)
        if to_key is None:
            continue
        _add(
            DraftLinkProposal(
                from_source_key=source_key,
                to_source_key=to_key,
                to_alias=display or None,
                kind="semantic",
                label="",
                confidence="explicit",
            )
        )

    # 2) [[Title]] / @Имя — только имена, не должности
    for title in extract_mention_titles(body):
        if is_office_phrase(title):
            continue
        norm = normalize_alias_key(title)
        if not norm or norm in self_norms:
            continue
        to_key = alias_index.get(norm)
        if to_key is None:
            continue
        _add(
            DraftLinkProposal(
                from_source_key=source_key,
                to_source_key=to_key,
                to_alias=title,
                kind="mention",
                label="",
                confidence="explicit",
            )
        )

    # 3) YAML location/faction → «живёт в» / «член»
    fm = frontmatter or {}
    for field_name, preset in _FM_FIELD_TO_LABEL.items():
        raw = fm.get(field_name)
        if not isinstance(raw, str) or not raw.strip():
            continue
        first = _ALT_NAME_SPLIT_RE.split(raw.strip(), maxsplit=1)[0]
        for variant in [first, *(_ALT_NAME_SPLIT_RE.split(raw.strip())[1:] or [])]:
            if is_office_phrase(variant):
                continue
            norm = normalize_alias_key(variant)
            if not norm or norm in self_norms:
                continue
            to_key = alias_index.get(norm)
            if to_key is None:
                continue
            _add(
                DraftLinkProposal(
                    from_source_key=source_key,
                    to_source_key=to_key,
                    to_alias=normalize_alias_display(variant),
                    kind="semantic",
                    label=preset_label_or_empty(preset),
                    confidence="explicit",
                )
            )

    # 4) Жирные имена — suggested; должности НЕ линкуются к человеку
    seat_guess: str | None = None
    loc = fm.get("location")
    if isinstance(loc, str) and loc.strip():
        first = _ALT_NAME_SPLIT_RE.split(loc.strip(), maxsplit=1)[0]
        seat_guess = alias_index.get(normalize_alias_key(first))

    for bold in extract_bold_candidates(body):
        if is_office_phrase(bold):
            # «мэр» никогда не связывается с человеком автоматически.
            # Максимум — suggested «должность, нужен выбор мастера», если локация ясна.
            if seat_guess:
                _add(
                    DraftLinkProposal(
                        from_source_key=source_key,
                        to_source_key=seat_guess,
                        to_alias=None,
                        kind="semantic",
                        label=OFFICE_LINK_LABEL,
                        confidence="suggested",
                        office_title=bold[:120],
                        office_holder_status=None,
                        succession_order=None,
                        hint=OFFICE_NEEDS_MASTER_HINT,
                    )
                )
            continue
        norm = normalize_alias_key(bold)
        if not norm or norm in self_norms:
            continue
        to_key = alias_index.get(norm)
        if to_key is None:
            continue
        _add(
            DraftLinkProposal(
                from_source_key=source_key,
                to_source_key=to_key,
                to_alias=bold,
                kind="mention",
                label="",
                confidence="suggested",
            )
        )

    # 5) Явная должность держателя (из заголовка/YAML)
    if alias_bundle is not None:
        for prop in office_proposals_from_item(
            source_key=source_key,
            title=str((frontmatter or {}).get("title") or ""),
            body=body,
            frontmatter=frontmatter,
            alias_bundle=alias_bundle,
            path_index=path_index,
            alias_index=alias_index,
        ):
            _add(prop)

    return proposals


def build_alias_and_link_graph(
    items: Iterable[Any],
) -> tuple[dict[str, AliasBundle], list[DraftLinkProposal]]:
    """По списку ParsedVaultItem — алиасы-имена и рёбра (в т.ч. должности из шапки/текста)."""
    item_list = list(items)
    alias_by_key: dict[str, AliasBundle] = {}
    path_index: dict[str, str] = {}
    alias_index: dict[str, str] = {}
    self_norms_by_key: dict[str, set[str]] = {}

    for it in item_list:
        proposal = getattr(it, "proposal", None) or {}
        path = proposal.get("path") or getattr(it, "source_path", "") or it.source_key
        slug = proposal.get("slug") or getattr(it, "source_slug", None)
        title = proposal.get("title") or slug or it.source_key
        body = proposal.get("body") or ""
        frontmatter = proposal.get("frontmatter") or {}
        bundle = collect_aliases_for_item(
            title=str(title),
            slug=str(slug) if slug else None,
            body=str(body),
            frontmatter=frontmatter if isinstance(frontmatter, dict) else {},
        )
        alias_by_key[it.source_key] = bundle
        path_index[str(path)] = it.source_key
        norms = {norm for _display, norm in bundle.norms}
        self_norms_by_key[it.source_key] = norms
        for _display, norm in bundle.norms:
            alias_index.setdefault(norm, it.source_key)

    links: list[DraftLinkProposal] = []
    seen_office: set[tuple] = set()

    def _extend(props: list[DraftLinkProposal]) -> None:
        for prop in props:
            edge = (
                prop.from_source_key,
                prop.to_source_key,
                prop.label,
                prop.office_title,
                prop.succession_order,
                prop.confidence,
            )
            if edge in seen_office:
                continue
            seen_office.add(edge)
            links.append(prop)

    for it in item_list:
        proposal = getattr(it, "proposal", None) or {}
        path = proposal.get("path") or getattr(it, "source_path", "") or it.source_key
        body = proposal.get("body") or ""
        frontmatter = proposal.get("frontmatter") or {}
        fm = frontmatter if isinstance(frontmatter, dict) else {}
        _extend(
            build_link_proposals_for_item(
                source_key=it.source_key,
                path=str(path),
                body=str(body),
                frontmatter=fm,
                path_index=path_index,
                alias_index=alias_index,
                self_norms=self_norms_by_key.get(it.source_key, set()),
                alias_bundle=alias_by_key[it.source_key],
            )
        )
        # Цепочки должностей с карточки места (любой мир, без спецслучаев)
        _extend(
            office_proposals_from_seat_frontmatter(
                seat_source_key=it.source_key,
                frontmatter=fm,
                path_index=path_index,
                alias_index=alias_index,
            )
        )
        _extend(
            office_proposals_from_seat_body(
                seat_source_key=it.source_key,
                body=str(body),
                path_index=path_index,
                alias_index=alias_index,
            )
        )
    return alias_by_key, links
