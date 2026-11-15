"""W-API-03: стабильные алиасы и предложенные связи черновика.

Переиспользует setting_mentions ([[]] / @) и подписи LINK_PRESETS.
В канон SettingPageLink / setting_pages не пишет.
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


@dataclass(frozen=True)
class DraftLinkProposal:
    from_source_key: str
    to_source_key: str | None
    to_alias: str | None
    kind: str  # semantic | mention — как SettingPageLink
    label: str
    confidence: str  # explicit | suggested


@dataclass
class AliasBundle:
    """Алиасы одного пункта: display + нормализованный ключ."""

    aliases: list[str] = field(default_factory=list)

    @property
    def norms(self) -> list[tuple[str, str]]:
        out: list[tuple[str, str]] = []
        seen: set[str] = set()
        for alias in self.aliases:
            display = normalize_alias_display(alias)
            norm = normalize_alias_key(display)
            if not norm or norm in seen:
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


def _split_title_variants(title: str) -> list[str]:
    """Разбить «Капитан Тандил → мэр» / «Константин III / Элессар I» на варианты."""
    text = (title or "").strip()
    if not text:
        return []
    parts = re.split(r"\s*(?:→|->|/|\||—|–)\s*", text)
    out: list[str] = [text]
    for part in parts:
        part = part.strip()
        if part:
            out.append(part)
        # «Капитан Тандил» → ещё «Тандил»
        tokens = part.split()
        if len(tokens) >= 2 and tokens[0].casefold() in {
            "капитан",
            "майор",
            "король",
            "королева",
            "мэтр",
            "маэстро",
            "сер",
            "леди",
            "лорд",
        }:
            out.append(" ".join(tokens[1:]))
    return out


def collect_aliases_for_item(
    *,
    title: str,
    slug: str | None,
    body: str,
    frontmatter: dict[str, Any] | None = None,
) -> AliasBundle:
    """Алиасы из заголовка, H1, ярлыка файла и явных подписей YAML."""
    aliases: list[str] = []
    aliases.extend(_split_title_variants(title))
    if slug:
        aliases.append(slug.replace("-", " "))
        aliases.append(slug)

    fm = frontmatter or {}
    for key in ("aliases", "aka", "also_known_as", "names"):
        raw = fm.get(key)
        if isinstance(raw, str) and raw.strip():
            aliases.extend(_split_title_variants(raw))
        elif isinstance(raw, list):
            for item in raw:
                if isinstance(item, str) and item.strip():
                    aliases.extend(_split_title_variants(item))

    for line in (body or "").splitlines():
        stripped = line.strip()
        if stripped.startswith("#") and not stripped.startswith("##"):
            heading = stripped.lstrip("#").strip()
            if heading:
                aliases.extend(_split_title_variants(heading))
            break

    return AliasBundle(aliases=aliases)


def resolve_md_href(from_path: str, href: str) -> str | None:
    """Резолв относительной markdown-ссылки в путь хранилища; внешние URL — None."""
    raw = (href or "").strip()
    if not raw:
        return None
    # якорь / mailto / http — не файл мира
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
    # Нормализуем . и .. вручную через PurePosixPath — но normalize_vault_path
    # отвергает «..». Схлопываем относительно корня хранилища.
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
    """Уникальные жирные имена в порядке появления."""
    seen: set[str] = set()
    out: list[str] = []
    for match in _BOLD_RE.finditer(body or ""):
        display = normalize_alias_display(match.group(1))
        if not display:
            continue
        # Слишком длинные куски («ритуальный кинжал Кардиана») всё равно
        # кандидаты — резолв решит, есть ли ключ.
        key = normalize_alias_key(display)
        if key in seen:
            continue
        seen.add(key)
        out.append(display)
    return out


def preset_label_or_empty(label: str) -> str:
    text = (label or "").strip()
    return text if text in _PRESET_LABELS else ""


def build_link_proposals_for_item(
    *,
    source_key: str,
    path: str,
    body: str,
    frontmatter: dict[str, Any] | None,
    path_index: dict[str, str],
    alias_index: dict[str, str],
    self_norms: set[str],
) -> list[DraftLinkProposal]:
    """Собрать предложенные рёбра из md-ссылок, [[]]/@ и жирных имён."""
    proposals: list[DraftLinkProposal] = []
    seen_edges: set[tuple[str, str, str, str, str]] = set()

    def _add(
        *,
        to_key: str | None,
        to_alias: str | None,
        kind: str,
        label: str,
        confidence: str,
    ) -> None:
        if to_key is None:
            return
        if to_key == source_key:
            return
        edge = (source_key, to_key, kind, label, confidence)
        if edge in seen_edges:
            return
        seen_edges.add(edge)
        proposals.append(
            DraftLinkProposal(
                from_source_key=source_key,
                to_source_key=to_key,
                to_alias=to_alias,
                kind=kind,
                label=label,
                confidence=confidence,
            )
        )

    # 1) Явные markdown-ссылки на .md → semantic (подпись из пресетов, если совпала)
    for display, target_path in extract_md_file_links(path, body):
        to_key = path_index.get(target_path)
        if to_key is None:
            # Цель может быть ещё не в пакете — пропускаем (не канон вики).
            continue
        _add(
            to_key=to_key,
            to_alias=display or None,
            kind="semantic",
            label="",
            confidence="explicit",
        )

    # 2) [[Title]] / @Имя — через extract_mention_titles
    for title in extract_mention_titles(body):
        norm = normalize_alias_key(title)
        if not norm or norm in self_norms:
            continue
        to_key = alias_index.get(norm)
        if to_key is None:
            continue
        _add(
            to_key=to_key,
            to_alias=title,
            kind="mention",
            label="",
            confidence="explicit",
        )

    # 3) Поля YAML location/faction → пресеты «живёт в» / «член»
    fm = frontmatter or {}
    for field_name, preset in _FM_FIELD_TO_LABEL.items():
        raw = fm.get(field_name)
        if not isinstance(raw, str) or not raw.strip():
            continue
        # «Лунный Мост / Поющие Стоки» — пробуем целый и части
        for variant in _split_title_variants(raw):
            norm = normalize_alias_key(variant)
            if not norm or norm in self_norms:
                continue
            to_key = alias_index.get(norm)
            if to_key is None:
                continue
            _add(
                to_key=to_key,
                to_alias=normalize_alias_display(variant),
                kind="semantic",
                label=preset_label_or_empty(preset),
                confidence="explicit",
            )

    # 4) Голые жирные имена — suggested, только если резолвятся в пакет
    for bold in extract_bold_candidates(body):
        norm = normalize_alias_key(bold)
        if not norm or norm in self_norms:
            continue
        to_key = alias_index.get(norm)
        if to_key is None:
            continue
        _add(
            to_key=to_key,
            to_alias=bold,
            kind="mention",
            label="",
            confidence="suggested",
        )

    return proposals


def build_alias_and_link_graph(
    items: Iterable[Any],
) -> tuple[dict[str, AliasBundle], list[DraftLinkProposal]]:
    """По списку ParsedVaultItem / объектов с proposal — алиасы и рёбра.

    items: объекты с .source_key, .source_path, .source_slug, .proposal
    """
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
        for display, norm in bundle.norms:
            # Первый занявший алиас побеждает — без второго «Тандила».
            alias_index.setdefault(norm, it.source_key)
            # slug как ярлык тоже
            _ = display

    links: list[DraftLinkProposal] = []
    for it in item_list:
        proposal = getattr(it, "proposal", None) or {}
        path = proposal.get("path") or getattr(it, "source_path", "") or it.source_key
        body = proposal.get("body") or ""
        frontmatter = proposal.get("frontmatter") or {}
        links.extend(
            build_link_proposals_for_item(
                source_key=it.source_key,
                path=str(path),
                body=str(body),
                frontmatter=frontmatter if isinstance(frontmatter, dict) else {},
                path_index=path_index,
                alias_index=alias_index,
                self_norms=self_norms_by_key.get(it.source_key, set()),
            )
        )
    return alias_by_key, links
