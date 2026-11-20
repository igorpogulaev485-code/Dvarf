#!/usr/bin/env python3
"""P24-C21R: scrub HTML/JS markup leftovers from live 2024 AU/AUD (+ EFA nbsp).

Fixes flattened site tables, subclass comment bleed, magicItem / Распечатать,
Latin prerequisite codes, and rarity dictionary wording for AU necklace.
Does not truncate full texts with «…».
"""

from __future__ import annotations

import json
import re
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
LIVE = REPO / "backend" / "data" / "srd" / "2024" / "live"

ALIGN_TOKENS = (
    "text-left",
    "text-center",
    "text-right",
    "text-start",
    "text-end",
)
ALIGN_SINGLE = frozenset({"left", "center", "right", "start", "end"})

FEATURE_CODE_RU = {
    "spellcasting": "«Использование заклинаний»",
    "pact_magic": "«Магия договора»",
    "fighting_style": "«Боевой стиль»",
}

STOP_MARKERS = (
    "Выберите хотя бы один подкласс",
    "window.commentsAccess",
    "Комментарии",
    "<div",
    "</div",
    "let ALERTS",
    "class__subclass__holder",
    # Class overview flavor that bleeds after the last subclass feature.
    "Воины сияют на многих полях",
    "Волшебники живут и умирают",
    "Жрецы черпают силу",
    "Колдуны заключают",
    "Монахи ищут",
    "Барды сплетают",
    "Друиды чтят",
    "Паладины клянутся",
    "Следопыты чувствуют",
    "Плуты полагаются",
    "Чародеи несут",
    "Варвары черпают",
)


def polish_spaces(text: str) -> str:
    t = text.replace("&nbsp;", " ").replace("\xa0", " ")
    t = re.sub(r"\s+", " ", t).strip()
    t = re.sub(r"\s+([,.;:!?])", r"\1", t)
    return t


def cut_at_markers(text: str) -> str:
    t = text
    for marker in STOP_MARKERS:
        idx = t.find(marker)
        if idx >= 0:
            t = t[:idx]
    # drop trailing broken tags / quotes
    t = re.sub(r"<[^>]*$", "", t)
    t = re.sub(r"""["']\s*$""", "", t)
    return polish_spaces(t)


def strip_page_chrome(text: str) -> str:
    t = text
    # Title [EN] Распечатать Type, rarity ...
    t = re.sub(
        r"^[^\n]{0,120}\[[^\]]+\]\s*Распечатать\s*",
        "",
        t,
        count=1,
    )
    t = re.sub(r"\bРаспечатать\b", "", t)
    t = re.sub(
        r"^(?:Чудесный предмет|Оружие|Доспех|Кольцо|Жезл|Посох|Палочка|Зелье|Свиток)"
        r",\s*редкость\s+(?:варьируется|варируется|различается|обычн\w+|необычн\w+|редк\w+|"
        r"очень редк\w+|легендарн\w+|артефакт)"
        r"(?:\s*\([^)]*\))?\s*",
        "",
        t,
        count=1,
        flags=re.I,
    )
    t = t.replace("magicItem", "")
    t = t.replace("magic item", "")
    return polish_spaces(t)


def _strip_align(s: str) -> str:
    out = s
    for tok in ALIGN_TOKENS:
        out = re.sub(rf"\b{re.escape(tok)}\b", " ", out, flags=re.I)
    parts = []
    for w in out.split():
        if w.lower() in ALIGN_SINGLE:
            continue
        parts.append(w)
    return " ".join(parts)


def _format_pairs(pairs: list[tuple[str, str]], left_label: str, right_label: str) -> str:
    body = "; ".join(f"{a} — {b}" for a, b in pairs)
    return f"{left_label} — {right_label}: {body}"


def reformat_flattened_table(segment: str) -> str:
    """Turn «table Header … text-left … rows» into readable RU pairs."""
    raw = segment.strip()
    if raw.lower().startswith("table"):
        raw = raw[5:].strip()
    raw = _strip_align(raw)

    # 1к10 / NdN first column header
    m = re.match(
        r"^(\d+к\d+)\s+(.+?)\s+(\d+)\s+(.+)$",
        raw,
    )
    if m:
        die, header, first_n, rest = m.groups()
        # rest starts mid-row after first number already captured
        pairs: list[tuple[str, str]] = []
        # rebuild full body with first number
        body = f"{first_n} {rest}"
        for mm in re.finditer(r"(\d+)\s+([^0-9]+?)(?=\s+\d+\s+|$)", body):
            pairs.append((mm.group(1), polish_spaces(mm.group(2))))
        if pairs:
            return _format_pairs(pairs, die, header.rstrip(" .…"))

    # «Уровень ячейки Заклинание 1 Щит 2 …»
    m = re.match(r"^Уровень ячейки\s+Заклинание\s+(.+)$", raw, re.I)
    if m:
        body = m.group(1)
        pairs = []
        for mm in re.finditer(r"(\d+)\s+([^0-9]+?)(?=\s+\d+\s+|$)", body):
            pairs.append((mm.group(1), polish_spaces(mm.group(2))))
        if pairs:
            return _format_pairs(pairs, "Уровень ячейки", "заклинание")

    # «Цвет Вид урона Чёрный Кислотой …»
    m = re.match(r"^Цвет\s+Вид урона\s+(.+)$", raw, re.I)
    if m:
        colors = {
            "Чёрный": "Кислотой",
            "Черный": "Кислотой",
            "Синий": "Электричеством",
            "Зелёный": "Ядом",
            "Зеленый": "Ядом",
            "Красный": "Огнём",
            "Белый": "Холодом",
        }
        body = m.group(1)
        pairs = []
        for color, dmg in colors.items():
            if color in body and dmg in body:
                pairs.append((color, dmg))
        if pairs:
            return _format_pairs(pairs, "Цвет", "вид урона")

    # «Заклинание Стоимость в зарядах Name 0 Name 1 …» then maybe prose
    m = re.match(
        r"^(Заклинание|Заклинания кадила)\s+Стоимость в зарядах\s+(.+)$",
        raw,
        re.I,
    )
    if m:
        header_left = m.group(1)
        body = m.group(2)
        pairs = []
        # Name may include parentheticals with digits: «Усыпление (Сл. спасброска 15)»
        for mm in re.finditer(
            r"([А-ЯA-ZЁ](?:[^0-9(]|\([^)]*\))*?)\s+(\d+)"
            r"(?=\s+[А-ЯA-ZЁ]|\s*$)",
            body,
        ):
            name = polish_spaces(mm.group(1))
            if name.startswith(
                ("Когда", "Пока", "Если", "Оглушающий", "Восстановление")
            ):
                break
            name = re.split(
                r"\s+(?=Оглушающий|Восстановление|Когда|Пока|Если)\b",
                name,
            )[0].strip(" .;")
            if not name:
                continue
            pairs.append((name, mm.group(2)))
        if pairs:
            last = pairs[-1]
            needle = f"{last[0]} {last[1]}"
            pos = body.rfind(needle)
            trailing = ""
            if pos >= 0:
                trailing = polish_spaces(body[pos + len(needle) :])
                if trailing.lower().startswith(("text-", "left", "center")):
                    trailing = ""
            table_txt = _format_pairs(pairs, header_left, "стоимость в зарядах")
            if trailing and re.match(r"^[А-ЯЁA-Z]", trailing):
                return f"{table_txt}. {trailing}"
            return table_txt

    # «Область Сл. спасброска Дробящий урон …»
    m = re.match(
        r"^Область\s+Сл\.\s*спасброска\s+Дробящий урон\s+(.+)$",
        raw,
        re.I,
    )
    if m:
        body = m.group(1)
        pairs = []
        for mm in re.finditer(
            r"(Куб со стороной\s+\d+\s*футов)\s+(\d+)\s+(\d+к\d+)",
            body,
            re.I,
        ):
            pairs.append(
                (mm.group(1), f"Сл. {mm.group(2)}, урон {mm.group(3)}")
            )
        if pairs:
            return _format_pairs(pairs, "Область", "сложность и урон")

    # Fallback: drop the word table and align tokens, keep rest
    return polish_spaces(raw)


def replace_tables_in_text(text: str) -> str:
    if "table" not in text.lower():
        return text

    out = text
    guard = 0
    while re.search(r"\btable\b", out, flags=re.I) and guard < 8:
        m = re.search(r"\btable\b", out, flags=re.I)
        assert m is not None
        start = m.start()
        rest = out[start:]
        end_m = re.search(
            r"(?<=\d)\s+(?=(?:Оглушающий|Восстановление|Когда|Пока|Если|Вы |Как ))",
            rest[5:],
        )
        if end_m:
            chunk = rest[: 5 + end_m.start()]
            after = rest[5 + end_m.start() :].lstrip()
            table_txt = reformat_flattened_table(chunk).rstrip(" .;")
            rebuilt = f"{table_txt}. {after}" if after else table_txt
        else:
            rebuilt = reformat_flattened_table(rest)
        out = out[:start] + rebuilt
        guard += 1
    out = _strip_align(out)
    out = re.sub(r"\btable\b", "", out, flags=re.I)
    return polish_spaces(out)


def prerequisites_ru_from_data(data: dict) -> str | None:
    bits: list[str] = []
    pr = data.get("prerequisites") or {}
    if pr.get("level"):
        bits.append(f"{pr['level']} уровень")
    feats = pr.get("class_features") or []
    labels = []
    for f in feats:
        key = str(f).lower()
        labels.append(FEATURE_CODE_RU.get(key, key))
    if labels:
        if set(str(x).lower() for x in feats) >= {"spellcasting", "pact_magic"}:
            bits.append(
                "умение «Использование заклинаний» или «Магия договора»"
            )
        elif "fighting_style" in {str(x).lower() for x in feats}:
            bits.append("умение «Боевой стиль»")
        else:
            bits.append("умение: " + ", ".join(labels))
    elif pr.get("fighting_style_feature") or data.get("category") == "fighting_style":
        # only add if not already
        if not any("Боевой стиль" in b for b in bits):
            bits.append("умение «Боевой стиль»")
    return "; ".join(bits) if bits else None


def spell_list_note(spell_list: list) -> str:
    if not spell_list:
        return (
            "Отдельного расширенного списка заклинаний у этого подкласса нет; "
            "заклинания (если есть) описаны в умениях."
        )
    parts: list[str] = []
    for bucket in spell_list:
        if not isinstance(bucket, dict):
            continue
        level = bucket.get("level")
        spells = bucket.get("spells") or []
        if level is None or not spells:
            continue
        parts.append(f"{level} ур. — {', '.join(str(s) for s in spells)}")
    if not parts:
        # flat list of slug strings
        flat = [str(s) for s in spell_list if isinstance(s, str)]
        if flat:
            return (
                "Всегда подготовленные заклинания подкласса: "
                + ", ".join(flat)
                + "."
            )
        return "Всегда подготовленные заклинания подкласса по таблице уровней."
    return "Всегда подготовленные заклинания подкласса: " + "; ".join(parts) + "."


def clean_string(value: str, *, kind: str | None = None) -> str:
    t = value
    t = t.replace("&nbsp;", " ").replace("\xa0", " ")
    if kind in {"subclass", "feat", "item", None}:
        t = cut_at_markers(t)
        t = strip_page_chrome(t)
        t = replace_tables_in_text(t)
    t = polish_spaces(t)
    return t


def repair_entry(entry: dict) -> None:
    kind = entry.get("kind")
    data = entry.get("data") or {}

    def walk_fix(obj):
        if isinstance(obj, dict):
            for k, v in list(obj.items()):
                if isinstance(v, str):
                    obj[k] = clean_string(v, kind=kind)
                else:
                    walk_fix(v)
        elif isinstance(obj, list):
            for i, v in enumerate(obj):
                if isinstance(v, str):
                    obj[i] = clean_string(v, kind=kind)
                else:
                    walk_fix(v)

    walk_fix(data)

    if kind == "feat":
        # rebuild prerequisites_ru from structured codes
        pr_ru = prerequisites_ru_from_data(data)
        if pr_ru:
            data["prerequisites_ru"] = pr_ru
        # also fix Latin leftovers if any slipped into traits
        if data.get("traits_text"):
            data["traits_text"] = re.sub(
                r"умение:\s*spellcasting,\s*pact_magic",
                "умение «Использование заклинаний» или «Магия договора»",
                data["traits_text"],
                flags=re.I,
            )
            data["traits_text"] = re.sub(
                r"умение:\s*fighting_style",
                "умение «Боевой стиль»",
                data["traits_text"],
                flags=re.I,
            )

    if kind == "subclass":
        data["spell_list_note_ru"] = spell_list_note(data.get("spell_list") or [])
        # ensure feature summaries cut
        for bucket in data.get("features") or []:
            for feat in bucket.get("features") or []:
                if feat.get("summary_ru"):
                    feat["summary_ru"] = cut_at_markers(feat["summary_ru"])

    if kind == "item":
        if data.get("text_ru"):
            data["text_ru"] = strip_page_chrome(replace_tables_in_text(data["text_ru"]))
            data["text_ru"] = data["text_ru"].replace("magicItem", "")
            data["text_ru"] = polish_spaces(data["text_ru"])
        if data.get("summary_ru"):
            data["summary_ru"] = strip_page_chrome(
                replace_tables_in_text(data["summary_ru"])
            )
        rr = (data.get("rarity_ru") or "").lower()
        if "различ" in rr or "варир" in rr:
            data["rarity"] = "varies"
            data["rarity_ru"] = "редкость варьируется"


def repair_file(path: Path) -> int:
    payload = json.loads(path.read_text(encoding="utf-8"))
    entries = payload.get("entries") or []
    for e in entries:
        repair_entry(e)
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    return len(entries)


def main() -> None:
    targets = [
        "subclasses_au.json",
        "feats_au.json",
        "magic_items_au.json",
        "magic_items_aud.json",
        "feats_efa.json",
    ]
    for name in targets:
        path = LIVE / name
        n = repair_file(path)
        print(f"repaired {name} entries={n}")


if __name__ == "__main__":
    main()
