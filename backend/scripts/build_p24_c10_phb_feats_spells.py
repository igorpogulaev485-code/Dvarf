#!/usr/bin/env python3
"""P24-C10: build PHB 2024 feats + spells beyond SRD (community_ref).

Sources: docs/edition-2024/sources/{feats,spells}.csv (book=PH24, srd=false);
mechanics short cards from next.dnd.su (ttg.club for name cross-check).
Named eponym spells get data.srd_alias → SRD unprefixed slug (no merge).
Does not copy long book prose. source=ph24 → content_layer community_ref.

Equipment / magic_items: PH24 srd=false count is 0 after C03/C06 — no waves.
"""

from __future__ import annotations

import csv
import json
import re
import time
import urllib.request
from collections import defaultdict
from html import unescape
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SOURCES = REPO / "docs" / "edition-2024" / "sources"
LIVE = REPO / "backend" / "data" / "srd" / "2024" / "live"
CACHE = Path("/tmp/p24-c10/cache")

UA = "DvarfCatalogBot/1.0 (+https://creed20.tech; P24-C10 reference scrape)"

# PHB eponym → SRD 5.2.1 unprefixed slug (same map as C05)
SRD_ALIASES: dict[str, str] = {
    "melfs-acid-arrow": "acid-arrow",
    "bigbys-hand": "arcane-hand",
    "mordenkainens-sword": "arcane-sword",
    "nystuls-magic-aura": "arcanists-magic-aura",
    "evards-black-tentacles": "black-tentacles",
    "mordenkainens-faithful-hound": "faithful-hound",
    "tensers-floating-disk": "floating-disk",
    "otilukes-freezing-sphere": "freezing-sphere",
    "tashas-hideous-laughter": "hideous-laughter",
    "drawmijs-instant-summons": "instant-summons",
    "ottos-irresistible-dance": "irresistible-dance",
    "mordenkainens-magnificent-mansion": "magnificent-mansion",
    "mordenkainens-private-sanctum": "private-sanctum",
    "otilukes-resilient-sphere": "resilient-sphere",
    "leomunds-secret-chest": "secret-chest",
    "rarys-telepathic-bond": "telepathic-bond",
    "leomunds-tiny-hut": "tiny-hut",
}

SCHOOL_RU = {
    "abjuration": "ограждение",
    "conjuration": "вызов",
    "divination": "прорицание",
    "enchantment": "очарование",
    "evocation": "воплощение",
    "illusion": "иллюзия",
    "necromancy": "некромантия",
    "transmutation": "преобразование",
    "ограждение": "ограждение",
    "вызов": "вызов",
    "прорицание": "прорицание",
    "очарование": "очарование",
    "воплощение": "воплощение",
    "иллюзия": "иллюзия",
    "некромантия": "некромантия",
    "преобразование": "преобразование",
}
SCHOOL_EN = {
    "ограждение": "abjuration",
    "вызов": "conjuration",
    "прорицание": "divination",
    "очарование": "enchantment",
    "воплощение": "evocation",
    "иллюзия": "illusion",
    "некромантия": "necromancy",
    "преобразование": "transmutation",
}
CLASS_RU_TO_EN = {
    "бард": "bard",
    "жрец": "cleric",
    "друид": "druid",
    "паладин": "paladin",
    "следопыт": "ranger",
    "чародей": "sorcerer",
    "колдун": "warlock",
    "волшебник": "wizard",
    "изобретатель": "artificer",
    "артефактор": "artificer",
}
ABILITY_RU = {
    "сила": "str",
    "силы": "str",
    "ловкость": "dex",
    "ловкости": "dex",
    "телосложение": "con",
    "телосложения": "con",
    "интеллект": "int",
    "интеллекта": "int",
    "мудрость": "wis",
    "мудрости": "wis",
    "харизма": "cha",
    "харизмы": "cha",
}


def _ability_code(word: str | None) -> str | None:
    if not word:
        return None
    w = word.lower().strip()
    if w in ABILITY_RU:
        return ABILITY_RU[w]
    # stem: Харизмы / Харизму / Силу …
    for stem, code in (
        ("сил", "str"),
        ("ловкост", "dex"),
        ("телосложен", "con"),
        ("интеллект", "int"),
        ("мудрост", "wis"),
        ("харизм", "cha"),
    ):
        if w.startswith(stem):
            return code
    return None
CAT_LABEL = {
    "origin": "Черта происхождения",
    "general": "Общая черта",
    "fighting_style": "Боевой стиль",
    "epic_boon": "Эпический дар",
}

PHB_CASTERS = {
    "bard",
    "cleric",
    "druid",
    "paladin",
    "ranger",
    "sorcerer",
    "warlock",
    "wizard",
}


def _csv_rows(name: str) -> list[dict[str, str]]:
    with (SOURCES / name).open(encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def _ph24_beyond(name: str) -> list[dict[str, str]]:
    return [
        r
        for r in _csv_rows(name)
        if r.get("book") == "PH24" and str(r.get("srd", "")).lower() == "false"
    ]


def _strip_tags(html: str) -> str:
    text = re.sub(r"<br\s*/?>", "\n", html, flags=re.I)
    text = re.sub(r"</p>", "\n", text, flags=re.I)
    text = re.sub(r"</li>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = unescape(text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n+", "\n", text)
    return text.strip()


def _extract_paper(html: str) -> str:
    """Pull the active paper-1 card body as plain text."""
    m = re.search(
        r'class="[^"]*\bpaper-1\b[^"]*\bcard\b[^"]*"[^>]*>(.*?)</div>\s*</div>\s*</div>',
        html,
        re.S | re.I,
    )
    if not m:
        # fallback: feat__description / whole article
        m2 = re.search(
            r'class="[^"]*feat__description[^"]*"[^>]*>(.*?)</div>',
            html,
            re.S | re.I,
        )
        if m2:
            return _strip_tags(m2.group(1))
        return ""
    return _strip_tags(m.group(1))


def fetch(url: str, dest: Path) -> str:
    if dest.is_file() and dest.stat().st_size > 1000:
        return dest.read_text(encoding="utf-8", errors="replace")
    dest.parent.mkdir(parents=True, exist_ok=True)
    # Prefer curl (more reliable TLS handshake in this environment).
    import subprocess

    for attempt in range(4):
        try:
            proc = subprocess.run(
                [
                    "curl",
                    "-sL",
                    "--max-time",
                    "45",
                    "-A",
                    "Mozilla/5.0",
                    "-o",
                    str(dest),
                    "-w",
                    "%{http_code}",
                    "--retry",
                    "2",
                    url,
                ],
                capture_output=True,
                text=True,
                timeout=60,
            )
            code = (proc.stdout or "").strip()
            if code == "200" and dest.is_file() and dest.stat().st_size > 1000:
                time.sleep(0.05)
                return dest.read_text(encoding="utf-8", errors="replace")
        except Exception:
            pass
        time.sleep(1.5 * (attempt + 1))
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = resp.read()
    dest.write_bytes(data)
    return data.decode("utf-8", errors="replace")


def load_discrepancy_pending(category: str) -> set[str]:
    path = SOURCES / "discrepancies.md"
    pending: set[str] = set()
    if not path.is_file():
        return pending
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.startswith(f"| {category} |"):
            continue
        parts = [p.strip() for p in line.split("|")]
        if len(parts) >= 3:
            m = re.search(r"`([^`]+)`", parts[2])
            if m:
                pending.add(m.group(1))
    return pending


# ---------------------------------------------------------------------------
# Feats
# ---------------------------------------------------------------------------


def _clean_feat_text(text: str) -> str:
    """Drop title/EN bracket/print chrome; keep category line + body."""
    t = text.replace("\r", "")
    t = re.sub(r"\[[A-Za-z][A-Za-z0-9'’\- ]*\]", "", t)
    t = re.sub(r"Распечатать", "", t, flags=re.I)
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r"\n+", "\n", t).strip()
    # Drop leading Russian name line if present alone
    lines = [ln.strip() for ln in t.split("\n") if ln.strip()]
    return "\n".join(lines)


def _compress_ru(s: str, limit: int = 140) -> str:
    s = re.sub(r"\s+", " ", s).strip()
    if len(s) > limit:
        return s[: limit - 1].rstrip() + "…"
    return s


def parse_feat_card(text: str, csv_row: dict[str, str]) -> dict:
    category = (csv_row.get("feat_category") or "general").strip()
    prereq: dict = {}
    prereq_ru = None
    cleaned = _clean_feat_text(text)

    # Header like: Универсальная черта (Требования: 4 уровень, Харизма 13+)
    m = re.search(
        r"\((?:Требования|Requirement)[^:]*:\s*([^)]+)\)",
        cleaned,
        re.I,
    )
    if m:
        prereq_ru = m.group(1).strip()
        raw = prereq_ru.lower()
        lm = re.search(r"(\d+)\s*уров", raw)
        if lm:
            prereq["level"] = int(lm.group(1))
        if "боевой стиль" in raw or "fighting style" in raw:
            prereq["fighting_style_feature"] = True
        if "накладыва" in raw or "spellcasting" in raw:
            prereq["spellcasting_feature"] = True
        abilities = []
        seen_codes: set[str] = set()
        for ru in (
            "сила",
            "ловкость",
            "телосложение",
            "интеллект",
            "мудрость",
            "харизма",
        ):
            am = re.search(rf"{ru}\s*(\d+)\+", raw)
            if am:
                code = ABILITY_RU[ru]
                if code not in seen_codes:
                    abilities.append({"ability": code, "min": int(am.group(1))})
                    seen_codes.add(code)
        if abilities:
            if " или " in raw and len(abilities) >= 2:
                prereq["ability_or"] = abilities
            else:
                prereq["ability"] = abilities[0] if len(abilities) == 1 else abilities

    if category == "fighting_style" and "fighting_style_feature" not in prereq:
        prereq["fighting_style_feature"] = True
        prereq_ru = prereq_ru or "Умение «Боевой стиль»"
    if category == "epic_boon" and "level" not in prereq:
        prereq["level"] = 19
        prereq_ru = prereq_ru or "Уровень 19+"
    if category == "general" and "level" not in prereq:
        if "уровень" not in (prereq_ru or "").lower():
            prereq["level"] = 4
            prereq_ru = ("Уровень 4+; " + prereq_ru) if prereq_ru else "Уровень 4+"

    # ASI bump (genitive forms: Харизмы / Силы / …)
    asi = None
    bump = re.search(
        r"Увеличьте значение ваш(?:ей|его)\s+"
        r"([А-Яа-яЁё]+)"
        r"(?:\s*,\s*([А-Яа-яЁё]+))?"
        r"(?:\s+или\s+([А-Яа-яЁё]+))?"
        r"\s+на\s+1",
        cleaned,
        re.I,
    )
    if bump:
        opts = []
        for g in bump.groups():
            code = _ability_code(g)
            if code and code not in opts:
                opts.append(code)
        if opts:
            asi = {
                "amount": 1,
                "from": opts,
                "cap": 20 if category != "epic_boon" else 30,
            }
    if category == "epic_boon" and asi is None:
        asi = {"amount": 1, "from": "any", "cap": 30}

    repeatable = bool(
        re.search(r"повторн|можно взять снова|repeatable", cleaned, re.I)
    )

    # Body after category chrome
    body = cleaned
    body = re.sub(
        r"^(?:Универсальная черта|Общая черта|Черта Происхождения|"
        r"Черта происхождения|Черта Боевого стиля|Эпический дар|"
        r"Дар\b)[^\n]*\n?",
        "",
        body,
        count=1,
        flags=re.I,
    )
    body = body.strip()

    bullets: list[str] = []
    mben = re.search(
        r"Вы получаете следующие преимущества:\s*(.*)", body, re.S | re.I
    )
    if mben:
        block = mben.group(1).strip()
        # Pattern: "Title .\n Description..."
        chunks = re.split(r"\n(?=[А-ЯЁ][^.\n]{0,40}\.\s*\n)", block)
        for chunk in chunks:
            chunk = chunk.strip()
            if not chunk:
                continue
            # title line ending with "."
            tm = re.match(r"^([^\n]+?)\.\s*\n?(.*)$", chunk, re.S)
            if tm:
                title = tm.group(1).strip().rstrip(".")
                rest = re.sub(r"\s+", " ", tm.group(2)).strip()
                first = re.split(r"(?<=[.!?])\s+", rest)[0] if rest else ""
                if first:
                    bullets.append(_compress_ru(f"{title}: {first}", 150))
                else:
                    bullets.append(_compress_ru(title, 80))
            else:
                bullets.append(_compress_ru(chunk, 150))
            if len(bullets) >= 3:
                break
    else:
        # Single-paragraph feats (Tough, fighting styles, some boons)
        para = re.sub(r"\s+", " ", body).strip()
        # Drop leftover name + category chrome
        name_ru = (csv_row.get("name_ru") or "").strip()
        if name_ru and para.startswith(name_ru):
            para = para[len(name_ru) :].strip()
        para = re.sub(
            r"^(?:Черта Происхождения|Черта происхождения|Черта Боевого стиля|"
            r"Универсальная черта|Эпический дар)"
            r"(?:\s*\([^)]*\))?\s*",
            "",
            para,
            flags=re.I,
        )
        sents = re.split(r"(?<=[.!?])\s+", para)
        for s in sents:
            s = s.strip()
            if not s:
                continue
            bullets.append(_compress_ru(s, 160))
            if len(bullets) >= 2:
                break

    if not bullets:
        bullets = [_compress_ru(body or csv_row.get("name_ru") or "", 160)]

    summary = "; ".join(bullets)
    if len(summary) > 280:
        summary = summary[:277].rstrip() + "…"

    label = CAT_LABEL.get(category, "Черта")
    traits = f"{label} (2024)"
    if prereq_ru:
        traits += f", {prereq_ru}"
    traits += f": {summary}"

    data = {
        "category": category,
        "prerequisites": prereq,
        "repeatable": repeatable,
        "ability_score_increase": asi,
        "summary_ru": summary,
        "traits_text": traits,
    }
    if prereq_ru:
        data["prerequisites_ru"] = prereq_ru
    return data


def build_feats(pending: set[str]) -> dict:
    rows = _ph24_beyond("feats.csv")
    assert len(rows) == 58, len(rows)
    entries = []
    for i, row in enumerate(rows):
        slug = row["id"]
        url = row.get("url_dndsu") or ""
        html = ""
        if url:
            html = fetch(url, CACHE / "feats" / f"{slug}.html")
        text = _extract_paper(html) if html else ""
        if not text:
            # Minimal fallback from category alone
            text = f"{row['name_ru']} [{row['name_en']}]"
        data = parse_feat_card(text, row)
        if slug in pending:
            data["name_ru_pending"] = True
        ext = {"book": "PH24"}
        if row.get("url_dndsu"):
            ext["url_dndsu"] = row["url_dndsu"]
        if row.get("url_ttg"):
            ext["url_ttg"] = row["url_ttg"]
        cat = data["category"]
        sort_base = {
            "origin": 50,
            "general": 200,
            "fighting_style": 400,
            "epic_boon": 600,
        }.get(cat, 300)
        entries.append(
            {
                "kind": "feat",
                "slug": slug,
                "name_ru": row["name_ru"],
                "name_en": row["name_en"],
                "source": "ph24",
                "sort_order": sort_base + i,
                "external_ref": ext,
                "data": data,
            }
        )
    entries.sort(key=lambda e: (e["data"]["category"], e["slug"]))
    for i, e in enumerate(entries):
        e["sort_order"] = (
            {
                "origin": 50,
                "general": 200,
                "fighting_style": 400,
                "epic_boon": 600,
            }.get(e["data"]["category"], 300)
            + i
        )
    return {
        "meta": {
            "pack": "P24-C10",
            "rules_edition": "2024",
            "source": "ph24",
            "notes_ru": (
                "58 черт PHB 2024 сверх SRD (community_ref). Короткие карточки "
                "своими словами по next.dnd.su; RU из feats.csv. Полный текст книги не копируем."
            ),
            "feat_count": len(entries),
        },
        "entries": entries,
    }


# ---------------------------------------------------------------------------
# Spells
# ---------------------------------------------------------------------------


def _parse_casting(raw: str) -> dict:
    raw_l = (raw or "").lower().strip()
    if "бонус" in raw_l:
        return {"unit": "bonus", "amount": 1}
    if "реакц" in raw_l:
        out: dict = {"unit": "reaction", "amount": 1}
        # condition after colon / dash
        m = re.search(r"реакци[^.]*[,:—\-]\s*(.+)", raw, re.I)
        if m:
            out["condition"] = m.group(1).strip()
        return out
    if "минут" in raw_l:
        am = re.search(r"(\d+)", raw_l)
        return {"unit": "minute", "amount": int(am.group(1)) if am else 1}
    if "час" in raw_l:
        am = re.search(r"(\d+)", raw_l)
        return {"unit": "hour", "amount": int(am.group(1)) if am else 1}
    return {"unit": "action", "amount": 1}


def _parse_components(raw: str) -> dict:
    raw = raw or ""
    comps: dict = {
        "v": bool(re.search(r"\bВ\b|V", raw)),
        "s": bool(re.search(r"\bС\b|S", raw)),
    }
    mm = re.search(r"М\s*\(([^)]+)\)|M\s*\(([^)]+)\)", raw, re.I)
    if mm:
        comps["m"] = (mm.group(1) or mm.group(2) or "").strip()
    elif re.search(r"\bМ\b|\bM\b", raw):
        comps["m"] = True
    return comps


def _parse_duration(raw: str) -> tuple[str, bool]:
    raw = (raw or "").strip()
    conc = bool(re.search(r"концентрац|concentration", raw, re.I))
    # strip concentration marker for display
    disp = re.sub(r"\s*\(?\s*[Кк]онцентрация\.?\s*\)?", "", raw).strip()
    disp = disp or raw
    if not disp:
        disp = "мгновенно"
    return disp, conc


def parse_spell_card(text: str, csv_row: dict[str, str]) -> dict:
    level = int(csv_row.get("level") or 0)
    school_csv = (csv_row.get("school") or "").strip().lower()
    school = school_csv if school_csv in SCHOOL_RU else SCHOOL_EN.get(school_csv, school_csv)
    school_ru = SCHOOL_RU.get(school, school)

    text = re.sub(r"\[[A-Za-z][A-Za-z0-9'’\- ]*\]", "", text)
    text = re.sub(r"Распечатать", "", text, flags=re.I)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n+", "\n", text).strip()

    # Prefer parsed header fields from page
    ct_m = re.search(r"Время сотворения\s*:\s*([^\n]+)", text)
    rng_m = re.search(r"Дистанция\s*:\s*([^\n?]+)", text)
    comp_m = re.search(r"Компоненты\s*:\s*([^\n]+)", text)
    dur_m = re.search(r"Длительность\s*:\s*([^\n]+)", text)
    cls_m = re.search(r"Классы\s*:\s*([^\n]+)", text)

    casting = _parse_casting(ct_m.group(1) if ct_m else "действие")
    range_ru = (rng_m.group(1).strip() if rng_m else "—")
    range_ru = range_ru.replace("?", "").strip()
    comps = _parse_components(comp_m.group(1) if comp_m else "В, С")
    duration, concentration = _parse_duration(dur_m.group(1) if dur_m else "мгновенно")
    ritual = bool(re.search(r"\bритуал\b", text, re.I))

    classes: list[str] = []
    if cls_m:
        for part in re.split(r"[,;/]| и ", cls_m.group(1)):
            p = part.strip().lower()
            if not p:
                continue
            en = CLASS_RU_TO_EN.get(p)
            if en:
                classes.append(en)
    if not classes:
        classes = [
            c.strip()
            for c in (csv_row.get("classes") or "").split("|")
            if c.strip()
        ]
    classes = sorted(set(classes))

    # Body after meta → short paraphrase
    body = text
    if cls_m:
        body = text[cls_m.end() :].strip()
    body = re.sub(r"Используя ячейку заклинания большего уровня\..*", "", body, flags=re.S)
    body = re.sub(r"\s+", " ", body).strip()
    # First 1–2 sentences, compress
    sents = re.split(r"(?<=[.!?])\s+", body)
    keep = []
    for s in sents:
        s = s.strip()
        if not s or s.lower().startswith("распечатать"):
            continue
        if len(s) > 160:
            s = s[:157].rstrip() + "…"
        keep.append(s)
        if len(keep) >= 2:
            break
    summary = " ".join(keep) if keep else (
        f"{'Заговор' if level == 0 else f'{level} круг'} ({school_ru})."
    )
    if len(summary) > 280:
        summary = summary[:277].rstrip() + "…"

    # Attack / save / damage hints
    attack_or_save = None
    if re.search(r"бросок атаки|атак[ауи] заклинани", body, re.I):
        attack_or_save = "атака"
    for ru, code in [
        ("Силы", "СИЛ"),
        ("Ловкости", "ЛОВ"),
        ("Телосложения", "ТЕЛ"),
        ("Интеллекта", "ИНТ"),
        ("Мудрости", "МДР"),
        ("Харизмы", "ХАР"),
    ]:
        if re.search(rf"спасбросок {ru}|проверк\w+ {ru}", body, re.I):
            attack_or_save = code
            break

    damage = None
    dm = re.search(
        r"(\d+d\d+(?:\s*\+\s*\d+)?)\s*(урона\s+)?(кислот|холод|огн|электричеств|некротическ|"
        r"психическ|излучен|яд|звуков|силово|дробящ|колющ|рубящ)",
        body,
        re.I,
    )
    if dm:
        dtype_map = {
            "кислот": "кислота",
            "холод": "холод",
            "огн": "огонь",
            "электричеств": "электричество",
            "некротическ": "некротический",
            "психическ": "психический",
            "излучен": "излучение",
            "яд": "яд",
            "звуков": "звук",
            "силово": "силовой",
            "дробящ": "дробящий",
            "колющ": "колющий",
            "рубящ": "рубящий",
        }
        key = dm.group(3).lower()
        dtype = next((v for k, v in dtype_map.items() if key.startswith(k[:4])), key)
        damage = f"{dm.group(1)} {dtype}"

    data = {
        "schema_version": 1,
        "level": level,
        "school": school,
        "school_ru": school_ru,
        "casting_time": casting,
        "magic_action": casting.get("unit") == "action",
        "range": range_ru,
        "components": comps,
        "duration": duration,
        "concentration": concentration,
        "ritual": ritual,
        "classes": classes,
        "attack_or_save": attack_or_save,
        "damage": damage,
        "summary_ru": summary,
        "description": summary,
        "source_book": "PHB 2024",
    }

    # Higher-level note if present in source text
    hl = re.search(
        r"Используя ячейку заклинания большего уровня\.\s*([^\n]+)",
        text,
    )
    if hl:
        note = hl.group(1).strip()
        if len(note) > 180:
            note = note[:177].rstrip() + "…"
        data["higher_levels"] = note

    return data


def build_spells_from_alias(csv_row: dict, srd_entry: dict, pending: set[str]) -> dict:
    """Clone SRD mechanics onto named PHB card; link via srd_alias."""
    alias = SRD_ALIASES[csv_row["id"]]
    data = json.loads(json.dumps(srd_entry["data"]))  # deep copy
    data["srd_alias"] = alias
    data["source_book"] = "PHB 2024"
    # Keep named RU from CSV; classes from CSV (may add artificer etc.)
    classes = [
        c.strip()
        for c in (csv_row.get("classes") or "").split("|")
        if c.strip()
    ]
    if classes:
        data["classes"] = sorted(set(classes))
    if csv_row["id"] in pending or alias in pending:
        data["name_ru_pending"] = True
    # Named PHB form of the unprefixed SRD card (link via srd_alias).
    base_sum = data.get("summary_ru") or ""
    data["summary_ru"] = (
        f"Именная книжная версия («{csv_row['name_ru']}»); "
        f"механика как у безымянной карточки «{srd_entry['name_ru']}». "
        + base_sum
    )
    if len(data["summary_ru"]) > 320:
        data["summary_ru"] = data["summary_ru"][:317].rstrip() + "…"
    data["description"] = data["summary_ru"]
    ext = {"book": "PH24"}
    if csv_row.get("url_dndsu"):
        ext["url_dndsu"] = csv_row["url_dndsu"]
    if csv_row.get("url_ttg"):
        ext["url_ttg"] = csv_row["url_ttg"]
    return {
        "kind": "spell",
        "slug": csv_row["id"],
        "name_ru": csv_row["name_ru"],
        "name_en": csv_row["name_en"],
        "source": "ph24",
        "sort_order": 0,
        "external_ref": ext,
        "data": data,
    }


def build_spells(pending: set[str]) -> dict:
    rows = _ph24_beyond("spells.csv")
    assert len(rows) == 69, len(rows)
    srd_by_slug = {
        e["slug"]: e
        for e in json.loads((LIVE / "spells_srd.json").read_text(encoding="utf-8"))[
            "entries"
        ]
    }
    entries = []
    for row in rows:
        slug = row["id"]
        if slug in SRD_ALIASES:
            alias = SRD_ALIASES[slug]
            assert alias in srd_by_slug, alias
            entries.append(build_spells_from_alias(row, srd_by_slug[alias], pending))
            continue
        url = row.get("url_dndsu") or ""
        html = fetch(url, CACHE / "spells" / f"{slug}.html") if url else ""
        text = _extract_paper(html) if html else ""
        data = parse_spell_card(text or row["name_ru"], row)
        if slug in pending:
            data["name_ru_pending"] = True
        ext = {"book": "PH24"}
        if row.get("url_dndsu"):
            ext["url_dndsu"] = row["url_dndsu"]
        if row.get("url_ttg"):
            ext["url_ttg"] = row["url_ttg"]
        entries.append(
            {
                "kind": "spell",
                "slug": slug,
                "name_ru": row["name_ru"],
                "name_en": row["name_en"],
                "source": "ph24",
                "sort_order": 0,
                "external_ref": ext,
                "data": data,
            }
        )
    entries.sort(key=lambda e: (e["data"]["level"], e["slug"]))
    for i, e in enumerate(entries):
        e["sort_order"] = e["data"]["level"] * 1000 + i
    return {
        "meta": {
            "pack": "P24-C10",
            "rules_edition": "2024",
            "source": "ph24",
            "notes_ru": (
                "69 заклинаний PHB 2024 сверх SRD (community_ref). Именные версии "
                "связаны с SRD-карточками через data.srd_alias. Короткие карточки "
                "по next.dnd.su; RU из spells.csv. Полный текст книги не копируем."
            ),
            "spell_count": len(entries),
            "named_with_srd_alias": len(SRD_ALIASES),
        },
        "entries": entries,
    }


def patch_class_spell_lists(spell_entries: list[dict]) -> None:
    """Append PHB-beyond spell slugs to C04 class spell_list (casters only)."""
    path = LIVE / "classes_srd.json"
    payload = json.loads(path.read_text(encoding="utf-8"))
    # level index for sort
    level_of = {e["slug"]: int(e["data"]["level"]) for e in spell_entries}
    # also keep existing SRD levels
    srd = json.loads((LIVE / "spells_srd.json").read_text(encoding="utf-8"))["entries"]
    for e in srd:
        level_of[e["slug"]] = int(e["data"]["level"])

    extra_by_class: dict[str, list[str]] = defaultdict(list)
    for e in spell_entries:
        for c in e["data"].get("classes") or []:
            if c in PHB_CASTERS:
                extra_by_class[c].append(e["slug"])

    for entry in payload["entries"]:
        slug = entry["slug"]
        data = entry["data"]
        if slug not in PHB_CASTERS:
            continue
        existing = list(data.get("spell_list") or [])
        merged = sorted(
            set(existing) | set(extra_by_class.get(slug, [])),
            key=lambda s: (level_of.get(s, 99), s),
        )
        data["spell_list"] = merged
        data["spell_list_note_ru"] = (
            "Список заклинаний справочника 5.2.1 плюс книга игрока 2024 сверх "
            "справочника; элементы — идентификаторы карточек заклинаний редакции 2024."
        )
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def assert_equipment_magic_empty() -> None:
    eq = _ph24_beyond("equipment.csv")
    mi = [
        r
        for r in _csv_rows("magic_items.csv")
        if r.get("book") == "PH24" and str(r.get("srd", "")).lower() == "false"
    ]
    assert eq == [], f"unexpected PH24 equipment beyond SRD: {[r['id'] for r in eq]}"
    assert mi == [], f"unexpected PH24 magic beyond SRD: {[r['id'] for r in mi]}"


def main() -> None:
    assert_equipment_magic_empty()
    feat_pending = load_discrepancy_pending("feats")
    spell_pending = load_discrepancy_pending("spells")

    feats = build_feats(feat_pending)
    spells = build_spells(spell_pending)

    feat_path = LIVE / "feats_ph24.json"
    spell_path = LIVE / "spells_ph24.json"
    feat_path.write_text(
        json.dumps(feats, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    spell_path.write_text(
        json.dumps(spells, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    patch_class_spell_lists(spells["entries"])

    # Sanity
    assert len(feats["entries"]) == 58
    assert len(spells["entries"]) == 69
    origin_needed = {
        "crafter",
        "musician",
        "tough",
        "healer",
        "lucky",
        "tavern-brawler",
    }
    feat_slugs = {e["slug"] for e in feats["entries"]}
    assert origin_needed <= feat_slugs, origin_needed - feat_slugs
    aliased = [
        e for e in spells["entries"] if e["data"].get("srd_alias")
    ]
    assert len(aliased) == len(SRD_ALIASES)
    for e in aliased:
        assert e["data"]["srd_alias"] == SRD_ALIASES[e["slug"]]

    print(f"wrote {feat_path} feats={len(feats['entries'])}")
    print(f"wrote {spell_path} spells={len(spells['entries'])} aliased={len(aliased)}")
    print("patched classes_srd.json spell_list")


if __name__ == "__main__":
    main()
