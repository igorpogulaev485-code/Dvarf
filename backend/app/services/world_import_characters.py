"""W-API-08: разбор карточки партии (md + LSS txt) → лист 2014.

Свои расы/классы/заклинания/черты в catalog_entries не создаём.
Неизвестные имена остаются текстом с пометкой «отложено до хоумбрю».
PDF парсим по возможности, но источником истины для полей — md+txt.
"""

from __future__ import annotations

import base64
import copy
import re
from dataclasses import dataclass, field
from pathlib import PurePosixPath
from typing import Any

from app.core.exceptions import AppError
from app.services.character_sheet import empty_character_sheet
from app.services.world_vault_parse import VaultFile, VaultParseResult

# Известные имена PHB/базовых книг 2014 (RU) — не каталог, только сверка «своё/чужое».
KNOWN_RACES_2014 = frozenset(
    {
        "человек",
        "дварф",
        "эльф",
        "халфлинг",
        "полурослик",
        "драконорождённый",
        "драконорожденный",
        "гном",
        "полуэльф",
        "полуорк",
        "тифлинг",
    }
)
KNOWN_CLASSES_2014 = frozenset(
    {
        "варвар",
        "бард",
        "жрец",
        "друид",
        "воин",
        "монах",
        "паладин",
        "следопыт",
        "плут",
        "чародей",
        "колдун",
        "волшебник",
    }
)

PARTY_CHARACTER_TYPES = frozenset({"party_character", "pending_character"})

MAX_PDF_BYTES = 5 * 1024 * 1024
PDF_CONTENT_TYPE = "application/pdf"

_MD_ROW = re.compile(
    r"^\|\s*(?P<label>[^|]+?)\s*\|\s*(?P<value>[^|]+?)\s*\|?\s*$",
    re.MULTILINE,
)
_CLASS_SPLIT = re.compile(r"\s*[—–\-]\s*")
_LEVEL_XP = re.compile(r"(?P<level>\d+)\s*(?:\(XP\s*(?P<xp>[\d\s]+)\))?", re.I)
_AC_HP = re.compile(r"(?P<ac>\d+)\s*/\s*(?P<hp>\d+)")


@dataclass
class ParsedPartyCharacter:
    """Нормализованные поля карточки партии для proposal и confirm."""

    import_key: str
    name: str
    race_name: str | None = None
    class_name: str | None = None
    subclass_name: str | None = None
    level: int = 1
    experience: int | None = None
    ac: int | None = None
    hp_max: int | None = None
    hp_current: int | None = None
    background: str | None = None
    alignment: str | None = None
    deity: str | None = None
    notes: str = ""
    sheet_pdf_path: str | None = None
    sheet_txt_path: str | None = None
    abilities: dict[str, int] = field(default_factory=dict)
    deferred_homebrew: list[str] = field(default_factory=list)
    empty_fields: list[str] = field(default_factory=list)
    sheet: dict[str, Any] = field(default_factory=dict)
    pdf_base64: str | None = None
    pdf_filename: str | None = None
    rules_edition: str = "2014"


def _norm_label(label: str) -> str:
    return re.sub(r"\s+", " ", label.strip().lower())


def _parse_md_table(body: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for match in _MD_ROW.finditer(body or ""):
        label = _norm_label(match.group("label"))
        value = match.group("value").strip()
        if not label or label in {"", "---"} or set(label) <= {"-", "—", ":"}:
            continue
        if label in {"|", "-"}:
            continue
        out[label] = value
    return out


def _split_class_subclass(raw: str | None) -> tuple[str | None, str | None]:
    if not raw or not raw.strip():
        return None, None
    text = raw.strip()
    parts = _CLASS_SPLIT.split(text, maxsplit=1)
    if len(parts) == 1:
        return parts[0].strip() or None, None
    return parts[0].strip() or None, parts[1].strip() or None


def _parse_level_xp(raw: str | None) -> tuple[int, int | None]:
    if not raw:
        return 1, None
    m = _LEVEL_XP.search(raw)
    if not m:
        return 1, None
    level = int(m.group("level"))
    xp_raw = m.group("xp")
    xp = int(re.sub(r"\s+", "", xp_raw)) if xp_raw else None
    return max(1, level), xp


def _parse_ac_hp(raw: str | None) -> tuple[int | None, int | None]:
    if not raw:
        return None, None
    m = _AC_HP.search(raw)
    if not m:
        return None, None
    return int(m.group("ac")), int(m.group("hp"))


def _mark_homebrew(name: str | None, *, kind: str, known: frozenset[str]) -> str | None:
    """Возвращает текст пометки, если имя неизвестно; иначе None."""
    if not name:
        return None
    # Берём основное имя до скобок: «Зайцегон (харенгон)» → зайцегон
    base = name.split("(")[0].strip().lower()
    if base in known:
        return None
    # Составные: «Друид» из «Друид — Круг…» уже разбит.
    first = base.split()[0] if base else ""
    if first in known:
        return None
    return f"{kind}: {name}"


def parse_lss_abilities(txt: str) -> dict[str, int]:
    """Грубый разбор блоков характеристик из текстового извлечения LSS."""
    labels = {
        "сила": "str",
        "ловкость": "dex",
        "телосложение": "con",
        "интеллект": "int",
        "мудрость": "wis",
        "харизма": "cha",
    }
    lines = [ln.strip() for ln in (txt or "").splitlines()]
    out: dict[str, int] = {}
    i = 0
    while i < len(lines):
        key = labels.get(lines[i].lower())
        if key is None:
            i += 1
            continue
        # Ищем ближайшее целое «значение» в следующих 4 строках.
        for j in range(i + 1, min(i + 5, len(lines))):
            if lines[j].lower() in {"значение", "модификатор"}:
                continue
            m = re.fullmatch(r"\d{1,2}", lines[j])
            if m:
                score = int(m.group(0))
                if 1 <= score <= 30:
                    out[key] = score
                break
        i += 1
    return out


def parse_lss_summary(txt: str) -> dict[str, Any]:
    """Достаёт КД/хиты/скорость из txt, если md неполный."""
    lines = [ln.strip() for ln in (txt or "").splitlines()]
    result: dict[str, Any] = {}
    for i, line in enumerate(lines):
        low = line.lower()
        if low == "класс" and i > 0 and lines[i - 1].isdigit() is False:
            # «Друид» / «КЛАСС» — уже есть из md; пропускаем шум «ЩИТ/КЛАСС ЗАЩИТЫ».
            pass
        if low in {"long story short"} and i + 1 < len(lines):
            # Строка перед LSS часто КД (17).
            prev = lines[i - 1] if i else ""
            if prev.isdigit():
                result.setdefault("ac", int(prev))
        if low == "текущие" and i + 2 < len(lines) and lines[i + 1].lower() == "временные":
            # блок хитов: число выше «ТЕКУЩИЕ», затем МАКСИМУМ
            if i >= 1 and lines[i - 1].isdigit():
                result.setdefault("hp_current", int(lines[i - 1]))
            for j in range(i + 2, min(i + 8, len(lines))):
                if lines[j].lower() == "максимум" and j >= 1 and lines[j - 1].isdigit():
                    result.setdefault("hp_max", int(lines[j - 1]))
                    break
        if low == "скорость" and i + 1 < len(lines) and lines[i + 1].isdigit():
            result["speed"] = int(lines[i + 1])
        if low.startswith("инициатива") and i + 1 < len(lines):
            m = re.search(r"[+\-]?\d+", lines[i + 1])
            if m:
                result["initiative"] = int(m.group(0))
    return result


def build_sheet_from_parsed(parsed: ParsedPartyCharacter) -> dict[str, Any]:
    sheet = empty_character_sheet()
    identity = sheet["identity"]
    identity["subclass_name"] = parsed.subclass_name
    identity["background"] = parsed.background
    identity["alignment"] = parsed.alignment
    if parsed.experience is not None:
        identity["experience"] = parsed.experience

    combat = sheet["combat"]
    combat["ac"] = parsed.ac
    combat["hp_max"] = parsed.hp_max
    combat["hp_current"] = parsed.hp_current if parsed.hp_current is not None else parsed.hp_max

    for abl, score in parsed.abilities.items():
        if abl in sheet["abilities"]:
            sheet["abilities"][abl] = {"score": score}

    notes = sheet["notes"]
    notes["free"] = parsed.notes or ""
    if parsed.deity:
        notes["background"] = f"Божество: {parsed.deity}"

    if parsed.deferred_homebrew:
        feats = sheet["features_text"]["feats"] or ""
        marker = "Отложено до хоумбрю: " + "; ".join(parsed.deferred_homebrew)
        sheet["features_text"]["feats"] = (feats + "\n" + marker).strip()

    return sheet


def _empty_field_list(parsed: ParsedPartyCharacter) -> list[str]:
    empty: list[str] = []
    if not parsed.race_name:
        empty.append("race_name")
    if not parsed.class_name:
        empty.append("class_name")
    if parsed.ac is None:
        empty.append("ac")
    if parsed.hp_max is None:
        empty.append("hp_max")
    if not parsed.abilities:
        empty.append("abilities")
    if not parsed.background:
        empty.append("background")
    return empty


def parse_party_character_card(
    *,
    source_key: str,
    title: str,
    frontmatter: dict[str, Any],
    body: str,
    txt_content: str | None = None,
    pdf_bytes: bytes | None = None,
    pdf_path: str | None = None,
    rules_edition: str = "2014",
) -> ParsedPartyCharacter:
    if rules_edition and str(rules_edition).strip() and str(rules_edition).strip() != "2014":
        raise AppError(
            "в этой версии импорта мира доступна только редакция 2014",
            code="rules_edition_unsupported",
            status_code=400,
            data={
                "field": "rules_edition",
                "path": source_key,
                "hint": "Укажите rules_edition=2014 или опустите поле",
            },
        )

    slug = PurePosixPath(source_key).stem or "character"
    table = _parse_md_table(body)
    race = table.get("раса")
    class_raw = table.get("класс")
    class_name, subclass_name = _split_class_subclass(class_raw)
    level, xp = _parse_level_xp(table.get("уровень"))
    ac, hp = _parse_ac_hp(table.get("кд / hp") or table.get("кд/hp") or table.get("кд / хиты"))
    background = table.get("предыстория")
    alignment = table.get("мировоззрение")
    deity = table.get("божество")
    if deity == "—":
        deity = None

    sheet_ref = frontmatter.get("sheet")
    sheet_pdf_path = str(sheet_ref).strip() if isinstance(sheet_ref, str) and sheet_ref.strip() else pdf_path

    abilities: dict[str, int] = {}
    if txt_content:
        abilities = parse_lss_abilities(txt_content)
        summary = parse_lss_summary(txt_content)
        if ac is None and summary.get("ac") is not None:
            ac = int(summary["ac"])
        if hp is None and summary.get("hp_max") is not None:
            hp = int(summary["hp_max"])

    # Notes: всё после таблицы / ## Заметки
    notes = ""
    if "## Заметки" in body:
        notes = body.split("## Заметки", 1)[1].strip()
    elif body:
        # Убираем заголовок и таблицу.
        lines = []
        in_table = False
        for ln in body.splitlines():
            if ln.strip().startswith("|"):
                in_table = True
                continue
            if in_table and not ln.strip():
                in_table = False
                continue
            if in_table:
                continue
            if ln.strip().startswith("#"):
                continue
            lines.append(ln)
        notes = "\n".join(lines).strip()

    deferred: list[str] = []
    race_mark = _mark_homebrew(race, kind="раса", known=KNOWN_RACES_2014)
    if race_mark:
        deferred.append(race_mark)
    class_mark = _mark_homebrew(class_name, kind="класс", known=KNOWN_CLASSES_2014)
    if class_mark:
        deferred.append(class_mark)

    parsed = ParsedPartyCharacter(
        import_key=slug[:128],
        name=(title or slug)[:120],
        race_name=race,
        class_name=class_name,
        subclass_name=subclass_name,
        level=level,
        experience=xp,
        ac=ac,
        hp_max=hp,
        hp_current=hp,
        background=background,
        alignment=alignment,
        deity=deity,
        notes=notes,
        sheet_pdf_path=sheet_pdf_path,
        sheet_txt_path=None,
        abilities=abilities,
        deferred_homebrew=deferred,
        rules_edition="2014",
    )
    if pdf_bytes:
        if len(pdf_bytes) > MAX_PDF_BYTES:
            raise AppError(
                "PDF листа слишком большой",
                code="file_too_large",
                status_code=400,
                data={
                    "path": sheet_pdf_path or source_key,
                    "hint": f"PDF не больше {MAX_PDF_BYTES} байт",
                },
            )
        if not pdf_bytes.startswith(b"%PDF"):
            # Не валидный PDF — не падаем: поля уже из md+txt.
            parsed.pdf_base64 = None
        else:
            parsed.pdf_base64 = base64.b64encode(pdf_bytes).decode("ascii")
            parsed.pdf_filename = PurePosixPath(sheet_pdf_path or f"{slug}.pdf").name

    parsed.empty_fields = _empty_field_list(parsed)
    parsed.sheet = build_sheet_from_parsed(parsed)
    return parsed


def proposal_from_parsed(parsed: ParsedPartyCharacter) -> dict[str, Any]:
    return {
        "title": parsed.name,
        "slug": parsed.import_key,
        "import_key": parsed.import_key,
        "rules_edition": "2014",
        "race_name": parsed.race_name,
        "class_name": parsed.class_name,
        "subclass_name": parsed.subclass_name,
        "level": parsed.level,
        "experience": parsed.experience,
        "ac": parsed.ac,
        "hp_max": parsed.hp_max,
        "hp_current": parsed.hp_current,
        "background": parsed.background,
        "alignment": parsed.alignment,
        "deity": parsed.deity,
        "notes": parsed.notes,
        "sheet_pdf_path": parsed.sheet_pdf_path,
        "deferred_homebrew": list(parsed.deferred_homebrew),
        "empty_fields": list(parsed.empty_fields),
        "sheet": copy.deepcopy(parsed.sheet),
        "abilities": dict(parsed.abilities),
        "pdf_base64": parsed.pdf_base64,
        "pdf_filename": parsed.pdf_filename,
        "assigned_user_id": None,
        "hint": (
            "Отложено до хоумбрю: " + "; ".join(parsed.deferred_homebrew)
            if parsed.deferred_homebrew
            else "Лист 2014 готов к confirm"
        ),
    }


def _index_vault_files(files: list[VaultFile]) -> dict[str, VaultFile]:
    out: dict[str, VaultFile] = {}
    for vf in files:
        path = (vf.path or "").replace("\\", "/").lstrip("./")
        out[path] = vf
        out[path.lower()] = vf
    return out


def _resolve_companion(
    index: dict[str, VaultFile],
    sheet_ref: str | None,
    *,
    suffix: str,
) -> tuple[str | None, VaultFile | None]:
    if not sheet_ref:
        return None, None
    base = sheet_ref.replace("\\", "/").lstrip("./")
    # sheet: assets/character-sheets/kavil.pdf → .txt рядом
    stem_path = str(PurePosixPath(base).with_suffix(suffix))
    candidates = [stem_path, stem_path.lstrip("/")]
    # Также пробуем только имя файла в assets/
    name = PurePosixPath(stem_path).name
    candidates.append(f"assets/character-sheets/{name}")
    for cand in candidates:
        hit = index.get(cand) or index.get(cand.lower())
        if hit is not None:
            return cand, hit
    return stem_path, None


def enrich_party_characters(result: VaultParseResult, files: list[VaultFile]) -> VaultParseResult:
    """Дополняет party_character proposal полями листа и PDF из пакета."""
    index = _index_vault_files(files)
    for item in result.items:
        if item.item_type not in PARTY_CHARACTER_TYPES:
            continue
        item.item_type = "party_character"
        prop = dict(item.proposal or {})
        fm = prop.get("frontmatter") if isinstance(prop.get("frontmatter"), dict) else {}
        body = str(prop.get("body") or "")
        title = str(prop.get("title") or item.source_slug or "Персонаж")
        sheet_ref = fm.get("sheet") if isinstance(fm.get("sheet"), str) else None

        txt_path, txt_file = _resolve_companion(index, sheet_ref, suffix=".txt")
        pdf_path, pdf_file = _resolve_companion(index, sheet_ref, suffix=".pdf")

        txt_content = None
        if txt_file is not None:
            txt_content = txt_file.content if isinstance(txt_file.content, str) else None
            # content может быть пустым, а binary — нет (редко для txt).
            if not txt_content and getattr(txt_file, "binary", None):
                try:
                    txt_content = txt_file.binary.decode("utf-8")
                except UnicodeDecodeError:
                    txt_content = None

        pdf_bytes = None
        if pdf_file is not None:
            if getattr(pdf_file, "binary", None):
                pdf_bytes = pdf_file.binary
            elif pdf_file.content:
                # base64 в content — маловероятно; пробуем как latin-1 байты заглушки
                raw = pdf_file.content
                if isinstance(raw, str) and raw.startswith("%PDF"):
                    pdf_bytes = raw.encode("latin-1", errors="ignore")

        # Также ищем PDF, переданный рядом без frontmatter.sheet
        if pdf_bytes is None:
            slug = item.source_slug or PurePosixPath(item.source_key).stem
            alt = f"assets/character-sheets/{slug}.pdf"
            alt_f = index.get(alt) or index.get(alt.lower())
            if alt_f is not None and getattr(alt_f, "binary", None):
                pdf_bytes = alt_f.binary
                pdf_path = alt

        parsed = parse_party_character_card(
            source_key=item.source_key,
            title=title,
            frontmatter=fm,
            body=body,
            txt_content=txt_content,
            pdf_bytes=pdf_bytes,
            pdf_path=pdf_path or sheet_ref,
        )
        if txt_path:
            parsed.sheet_txt_path = txt_path
        enriched = proposal_from_parsed(parsed)
        # Сохраняем исходные поля разбора vault.
        enriched["path"] = prop.get("path") or item.source_path
        enriched["frontmatter"] = fm
        enriched["body"] = body
        enriched["canon_status"] = prop.get("canon_status") or fm.get("status")
        enriched["sheet_txt_path"] = parsed.sheet_txt_path
        item.proposal = enriched
    return result


def decode_pdf_from_proposal(prop: dict[str, Any]) -> bytes | None:
    raw = prop.get("pdf_base64")
    if not isinstance(raw, str) or not raw.strip():
        return None
    try:
        data = base64.b64decode(raw, validate=False)
    except Exception:
        return None
    if not data.startswith(b"%PDF"):
        return None
    if len(data) > MAX_PDF_BYTES:
        raise AppError(
            "PDF листа слишком большой",
            code="file_too_large",
            status_code=400,
            data={"hint": f"PDF не больше {MAX_PDF_BYTES} байт"},
        )
    return data
