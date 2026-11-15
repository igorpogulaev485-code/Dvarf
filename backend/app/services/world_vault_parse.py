"""W-API-02: детерминированный разбор markdown-хранилища (как Who).

Тип карточки — из папки; YAML-шапка как есть. Связи имён — W-API-03.
В канон вики / setting_pages здесь не пишем.
"""

from __future__ import annotations

import io
import zipfile
from dataclasses import dataclass, field
from pathlib import PurePosixPath
from typing import Any

import yaml

from app.core.exceptions import AppError

# Ориентир из задания: ~20 МБ текста / ~400 файлов / разумный потолок архива.
MAX_ZIP_BYTES = 25 * 1024 * 1024
MAX_TEXT_TOTAL_BYTES = 20 * 1024 * 1024
MAX_SINGLE_FILE_BYTES = 2 * 1024 * 1024
MAX_FILE_COUNT = 400

SKIP_BASENAMES = frozenset(
    {
        "readme.md",
        "canon.md",
        "sources.md",
    }
)

PLAYER_BOOKS_GROUP_KEY = "world/player-books"
PLAYER_BOOKS_GROUP_TITLE = "Книги для игроков"


@dataclass(frozen=True)
class VaultFile:
    path: str
    content: str = ""
    # W-API-08: PDF и прочий бинарь (не участвует в текстовой квоте md).
    binary: bytes | None = None


@dataclass
class ParsedVaultItem:
    item_type: str
    source_key: str
    source_path: str
    source_slug: str | None
    proposal: dict[str, Any] = field(default_factory=dict)


@dataclass
class VaultParseResult:
    items: list[ParsedVaultItem]
    skipped: list[dict[str, str]] = field(default_factory=list)


def normalize_vault_path(raw: str) -> str:
    """Нормализует относительный путь хранилища; отвергает обход корня."""
    text = (raw or "").replace("\\", "/").strip()
    if not text:
        raise AppError(
            "Пустой путь файла в хранилище",
            code="vault_path_empty",
            status_code=400,
            data={"field": "path", "hint": "Укажите относительный путь вроде world/locations/x.md"},
        )
    while text.startswith("./"):
        text = text[2:]
    path = PurePosixPath(text)
    if path.is_absolute() or ".." in path.parts:
        raise AppError(
            "Недопустимый путь в архиве или списке файлов",
            code="vault_path_rejected",
            status_code=400,
            data={"path": raw, "hint": "Путь должен быть относительным, без .."},
        )
    return path.as_posix().lstrip("/")


def slug_from_path(path: str) -> str:
    stem = PurePosixPath(path).stem
    return stem.strip() or PurePosixPath(path).name


def split_frontmatter(text: str) -> tuple[dict[str, Any], str]:
    """Читает YAML-шапку как есть; без шапки — пустой dict и весь текст."""
    if not text.startswith("---"):
        return {}, text
    lines = text.splitlines(keepends=True)
    if not lines or lines[0].strip() != "---":
        return {}, text
    end = None
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            end = i
            break
    if end is None:
        return {}, text
    raw_yaml = "".join(lines[1:end])
    body = "".join(lines[end + 1 :])
    if not raw_yaml.strip():
        return {}, body
    try:
        loaded = yaml.safe_load(raw_yaml)
    except yaml.YAMLError as exc:
        raise AppError(
            "Не удалось разобрать YAML-шапку файла",
            code="bad_frontmatter",
            status_code=400,
            data={
                "hint": "Проверьте синтаксис YAML между --- ... ---",
                "detail": str(exc),
            },
        ) from exc
    if loaded is None:
        return {}, body
    if not isinstance(loaded, dict):
        raise AppError(
            "YAML-шапка должна быть словарём ключ–значение",
            code="bad_frontmatter",
            status_code=400,
            data={"hint": "Оформите шапку как title: … / status: …"},
        )
    return loaded, body


def _is_skipped_meta_file(path: str) -> bool:
    name = PurePosixPath(path).name.lower()
    if name in SKIP_BASENAMES:
        return True
    return False


def _is_raw_chat_import(path: str) -> bool:
    p = path.lower()
    if not p.startswith("drafts/imports/"):
        return False
    return p.endswith(".json")


def _is_template_path(path: str) -> bool:
    return path.lower().startswith("templates/")


def classify_vault_path(path: str) -> str | None:
    """Тип черновика из папки. None — файл не создаёт карточку мира."""
    lower = path.lower()
    if _is_template_path(lower):
        return None
    if _is_raw_chat_import(lower):
        return None
    if _is_skipped_meta_file(lower):
        return None
    if not lower.endswith(".md"):
        return None

    parts = PurePosixPath(lower).parts
    if len(parts) < 2:
        return None

    if parts[0] == "world":
        if len(parts) >= 3 and parts[1] == "locations":
            return "location"
        if len(parts) >= 3 and parts[1] == "npcs":
            return "npc"
        if len(parts) >= 3 and parts[1] == "factions":
            return "faction"
        if len(parts) >= 3 and parts[1] in {"lore", "history"}:
            return "note"
        if len(parts) >= 3 and parts[1] == "player-books":
            if parts[2] == "chapters" and len(parts) >= 4:
                return "book_chapter"
            # Корневые md книг (не README) — тоже глава/том в группе книг.
            return "book_chapter"
        return None

    if parts[0] == "campaign":
        if len(parts) >= 3 and parts[1] == "sessions":
            return "session_journal"
        if len(parts) >= 3 and parts[1] in {"plot", "prep"}:
            return "note"
        if len(parts) >= 4 and parts[1] == "party" and parts[2] == "characters":
            return "party_character"
        return None

    if parts[0] == "drafts":
        # Сырые JSON чатов уже отсечены; markdown-черновики → заметки.
        if lower.startswith("drafts/imports/") and lower.endswith(".md"):
            return "note"
        return "note"

    if parts[0] == "rules" and len(parts) >= 3 and parts[1] == "encounters":
        return "combat"

    return None


def _title_from(frontmatter: dict[str, Any], slug: str, body: str) -> str:
    title = frontmatter.get("title")
    if isinstance(title, str) and title.strip():
        return title.strip()
    for line in body.splitlines():
        stripped = line.strip()
        if stripped.startswith("#"):
            return stripped.lstrip("#").strip() or slug
    return slug


def parse_vault_files(files: list[VaultFile]) -> VaultParseResult:
    """Разбирает набор файлов хранилища в пункты черновика (без записи в БД)."""
    items: list[ParsedVaultItem] = []
    skipped: list[dict[str, str]] = []
    seen_keys: set[str] = set()
    book_chapters: list[dict[str, str]] = []

    if len(files) > MAX_FILE_COUNT:
        raise AppError(
            "Слишком много файлов в пакете",
            code="quota_exceeded",
            status_code=400,
            data={
                "hint": f"Не больше {MAX_FILE_COUNT} файлов за одну заливку",
                "file_count": len(files),
                "limit": MAX_FILE_COUNT,
            },
        )

    total_bytes = 0
    for vf in files:
        path = normalize_vault_path(vf.path)
        raw = vf.content if isinstance(vf.content, str) else str(vf.content)
        encoded = raw.encode("utf-8")
        if len(encoded) > MAX_SINGLE_FILE_BYTES:
            raise AppError(
                "Файл слишком большой для разбора",
                code="file_too_large",
                status_code=400,
                data={
                    "path": path,
                    "hint": f"Один текстовый файл — не больше {MAX_SINGLE_FILE_BYTES} байт",
                },
            )
        total_bytes += len(encoded)
        if total_bytes > MAX_TEXT_TOTAL_BYTES:
            raise AppError(
                "Слишком много текста в хранилище",
                code="file_too_large",
                status_code=400,
                data={
                    "hint": f"Суммарный объём текста — не больше {MAX_TEXT_TOTAL_BYTES} байт",
                },
            )

        item_type = classify_vault_path(path)
        if item_type is None:
            reason = "meta_or_unsupported"
            if _is_raw_chat_import(path):
                reason = "raw_chat_json"
            elif _is_template_path(path):
                reason = "template"
            elif _is_skipped_meta_file(path):
                reason = "toc_or_readme"
            skipped.append({"path": path, "reason": reason})
            continue

        frontmatter, body = split_frontmatter(raw)
        slug = slug_from_path(path)
        source_key = path
        if source_key in seen_keys:
            # Повтор того же пути в одной пачке — обновляем последний разбор.
            items = [it for it in items if it.source_key != source_key]
            book_chapters = [c for c in book_chapters if c.get("source_key") != source_key]
        seen_keys.add(source_key)

        title = _title_from(frontmatter, slug, body)
        proposal: dict[str, Any] = {
            "title": title,
            "path": path,
            "slug": slug,
            "frontmatter": frontmatter,
            "body": body,
            "canon_status": frontmatter.get("status"),
        }
        if item_type == "party_character":
            proposal["parse_status"] = "party_character"
            proposal["hint"] = "Лист партии: поля заполнятся из md + txt (W-API-08)"
        if item_type == "book_chapter":
            proposal["book_group_key"] = PLAYER_BOOKS_GROUP_KEY
            book_chapters.append(
                {
                    "source_key": source_key,
                    "title": title,
                    "slug": slug,
                    "path": path,
                }
            )

        items.append(
            ParsedVaultItem(
                item_type=item_type,
                source_key=source_key,
                source_path=path,
                source_slug=slug,
                proposal=proposal,
            )
        )

    if book_chapters:
        group_key = PLAYER_BOOKS_GROUP_KEY
        items = [it for it in items if it.source_key != group_key]
        items.insert(
            0,
            ParsedVaultItem(
                item_type="book",
                source_key=group_key,
                source_path=group_key,
                source_slug="player-books",
                proposal={
                    "title": PLAYER_BOOKS_GROUP_TITLE,
                    "path": group_key,
                    "slug": "player-books",
                    "frontmatter": {},
                    "body": "",
                    "canon_status": None,
                    "chapters": book_chapters,
                    "kind": "player_books_toc",
                },
            ),
        )

    return VaultParseResult(items=items, skipped=skipped)


def decode_text_bytes(data: bytes, *, path: str) -> str:
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise AppError(
            "Файл не в кодировке UTF-8",
            code="bad_encoding",
            status_code=400,
            data={
                "path": path,
                "hint": "Сохраните markdown в UTF-8",
                "detail": str(exc),
            },
        ) from exc


# PDF в zip — отдельный потолок (W-API-08); тяжёлые Who PDF в git не кладём.
MAX_ZIP_PDF_BYTES = 5 * 1024 * 1024


def extract_zip_to_files(data: bytes) -> list[VaultFile]:
    """Распаковывает zip в список текстовых файлов хранилища (+ PDF листов)."""
    if len(data) > MAX_ZIP_BYTES:
        raise AppError(
            "Архив слишком большой",
            code="file_too_large",
            status_code=400,
            data={
                "hint": f"Zip не больше {MAX_ZIP_BYTES} байт",
            },
        )
    try:
        zf = zipfile.ZipFile(io.BytesIO(data))
    except zipfile.BadZipFile as exc:
        raise AppError(
            "Не удалось открыть zip-архив",
            code="bad_zip",
            status_code=400,
            data={"hint": "Проверьте, что это корректный zip с markdown-хранилищем"},
        ) from exc

    files: list[VaultFile] = []
    with zf:
        for info in zf.infolist():
            if info.is_dir():
                continue
            name = info.filename
            # Пропускаем служебные записи zip / macOS.
            base = PurePosixPath(name).name
            if base.startswith(".") or name.startswith("__MACOSX/"):
                continue
            path = normalize_vault_path(name)
            lower = path.lower()
            raw = zf.read(info)
            if lower.endswith(".pdf"):
                if info.file_size > MAX_ZIP_PDF_BYTES or len(raw) > MAX_ZIP_PDF_BYTES:
                    raise AppError(
                        "PDF в архиве слишком большой",
                        code="file_too_large",
                        status_code=400,
                        data={"path": path, "hint": f"PDF не больше {MAX_ZIP_PDF_BYTES} байт"},
                    )
                files.append(VaultFile(path=path, content="", binary=raw))
                continue
            if info.file_size > MAX_SINGLE_FILE_BYTES:
                raise AppError(
                    "Файл в архиве слишком большой",
                    code="file_too_large",
                    status_code=400,
                    data={"path": path},
                )
            # Бинарные не-текст (кроме .md/.json/.txt/.html) пропускаем молча.
            if not lower.endswith((".md", ".json", ".txt", ".html", ".yml", ".yaml")):
                continue
            text = decode_text_bytes(raw, path=path)
            files.append(VaultFile(path=path, content=text))
    return files


def load_vault_dir(root: str | PurePosixPath) -> list[VaultFile]:
    """Утилита для тестов: читает дерево каталога как хранилище (+ PDF)."""
    from pathlib import Path

    root_path = Path(root)
    files: list[VaultFile] = []
    for path in sorted(root_path.rglob("*")):
        if not path.is_file():
            continue
        rel = path.relative_to(root_path).as_posix()
        lower = rel.lower()
        data = path.read_bytes()
        if lower.endswith(".pdf"):
            files.append(
                VaultFile(path=normalize_vault_path(rel), content="", binary=data)
            )
            continue
        if not lower.endswith((".md", ".json", ".txt", ".html", ".yml", ".yaml")):
            continue
        text = decode_text_bytes(data, path=rel)
        files.append(VaultFile(path=normalize_vault_path(rel), content=text))
    return files
