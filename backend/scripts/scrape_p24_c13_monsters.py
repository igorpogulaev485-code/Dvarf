#!/usr/bin/env python3
"""P24-C13: scrape MM24 wave-1 monster pages from next.dnd.su into /tmp/p24-c13."""

from __future__ import annotations

import csv
import json
import re
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
CSV_PATH = REPO / "docs" / "edition-2024" / "sources" / "creatures.csv"
OUT_DIR = Path("/tmp/p24-c13")
HTML_DIR = OUT_DIR / "html"
SCRAPED = OUT_DIR / "scraped.json"
CUTOFF = "Kuo-toa Archpriest"
UA = "Mozilla/5.0 (compatible; DvarfCatalogBot/1.0; +https://creed20.tech)"


def wave1_rows() -> list[dict[str, str]]:
    with CSV_PATH.open(encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    mm = [
        r
        for r in rows
        if r.get("book") == "MM24" and str(r.get("srd", "")).lower() == "false"
    ]
    return sorted(
        [r for r in mm if r["name_en"] < CUTOFF],
        key=lambda r: r["name_en"],
    )


def fetch(url: str, retries: int = 3) -> str:
    last: Exception | None = None
    for i in range(retries):
        try:
            req = urllib.request.Request(
                url if url.endswith("/") else url + "/",
                headers={"User-Agent": UA, "Accept-Language": "ru,en;q=0.8"},
            )
            with urllib.request.urlopen(req, timeout=45) as resp:
                return resp.read().decode("utf-8", "replace")
        except Exception as exc:  # noqa: BLE001
            last = exc
            time.sleep(1.5 * (i + 1))
    raise RuntimeError(f"fetch failed {url}: {last}")


def _strip_tags(html: str) -> str:
    t = re.sub(r"<br\s*/?>", "\n", html, flags=re.I)
    t = re.sub(r"</(p|div|li|h\d|tr)>", "\n", t, flags=re.I)
    t = re.sub(r"<[^>]+>", " ", t)
    t = (
        t.replace("&thinsp;", "")
        .replace("&nbsp;", " ")
        .replace("&mdash;", "—")
        .replace("&ndash;", "–")
        .replace("&laquo;", "«")
        .replace("&raquo;", "»")
        .replace("&quot;", '"')
        .replace("&#39;", "'")
        .replace("&amp;", "&")
    )
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r"\n+", "\n", t)
    return t.strip()


def _parse_signed(raw: str) -> int:
    t = raw.strip().replace("+", "").replace("−", "-").replace("–", "-").replace("—", "-")
    return int(t)


def parse_page(html: str, meta: dict[str, str]) -> dict:
    """Parse next.dnd.su bestiary article into structured card fields."""
    body_m = re.search(
        r'class="card__body new-article"[^>]*>([\s\S]*?)(?:<div class="card__footer"|$)',
        html,
        re.I,
    )
    body = body_m.group(1) if body_m else html

    params_m = re.search(
        r"<ul class='params card__article-body params-bestiary'>([\s\S]*?)</ul>",
        body,
    )
    params = params_m.group(1) if params_m else ""

    size_type = ""
    m = re.search(r"class='size-type-alignment'>([\s\S]*?)</li>", params)
    if m:
        size_type = _strip_tags(m.group(1))

    ac = None
    m = re.search(
        r'class="subsection-ac">\s*<strong>Класс Защиты</strong>\s*(\d+)',
        params,
    )
    if m:
        ac = int(m.group(1))

    init_mod = None
    init_score = None
    m = re.search(
        r'class="subsection-initiative">\s*<strong>Инициатива</strong>\s*([+\-−–—]?\d+)\s*'
        r"\(<span class='value'>(\d+)</span>\)",
        params,
    )
    if m:
        init_mod = _parse_signed(m.group(1))
        init_score = int(m.group(2))

    hp_avg = None
    hp_formula = None
    m = re.search(
        r"<strong>Хиты</strong>\s*<span data-type='middle'>(\d+)</span>\s*"
        r"\(<span data-type='throw'>(\d+)</span>к<span data-type='dice'>(\d+)</span>"
        r"\s*(?:<span data-type='action'>([+\-−–—])</span>\s*"
        r"<span data-type='bonus'>(\d+)</span>)?\)",
        params,
    )
    if m:
        hp_avg = int(m.group(1))
        dice_n, dice_s = m.group(2), m.group(3)
        if m.group(4) and m.group(5):
            sign = "+" if m.group(4) in "+＋" else "-"
            hp_formula = f"{dice_n}к{dice_s}{sign}{m.group(5)}"
        else:
            hp_formula = f"{dice_n}к{dice_s}"

    speed: dict[str, int] = {}
    m = re.search(r"<strong>Скорость</strong>([\s\S]*?)</li>", params)
    if m:
        sp_text = _strip_tags(m.group(1))
        # walk first number without label
        walk = re.match(r"^\s*(\d+)\s*фут", sp_text)
        if walk:
            speed["walk"] = int(walk.group(1))
        for label, key in (
            ("Полёта", "fly"),
            ("Полета", "fly"),
            ("Плавания", "swim"),
            ("Лазания", "climb"),
            ("Копания", "burrow"),
        ):
            mm = re.search(rf"{label}\s+(\d+)\s*фут", sp_text, re.I)
            if mm:
                speed[key] = int(mm.group(1))

    abilities: dict[str, int] = {}
    ability_mods: dict[str, int] = {}
    ability_saves: dict[str, int] = {}
    ab_map = {
        "СИЛ": "str",
        "ЛОВ": "dex",
        "ТЕЛ": "con",
        "ИНТ": "int",
        "МДР": "wis",
        "ХАР": "cha",
    }
    for ru, en in ab_map.items():
        mm = re.search(
            rf"class='title'>{ru}</div>\s*<div class='value'>(\d+)</div>\s*"
            rf"<div class='mod'>([+\-−–—]?\d+)</div>\s*"
            rf"<div class='save'>([+\-−–—]?\d+)</div>",
            params,
        )
        if mm:
            abilities[en] = int(mm.group(1))
            ability_mods[en] = _parse_signed(mm.group(2))
            ability_saves[en] = _parse_signed(mm.group(3))

    skills: dict[str, int] = {}
    m = re.search(r"<strong>Навыки</strong>([\s\S]*?)</li>", params)
    if m:
        for name, val in re.findall(
            r"([А-Яа-яЁёA-Za-z \-]+?)\s*([+\-−–—]\d+)", _strip_tags(m.group(1))
        ):
            skills[name.strip()] = _parse_signed(val)

    vulns: list[str] = []
    resists: list[str] = []
    immunes: list[str] = []
    cond_immunes: list[str] = []
    for label, bucket in (
        ("Уязвимость к урону", vulns),
        ("Сопротивление урону", resists),
        ("Иммунитет к урону", immunes),
        ("Иммунитет к состоянию", cond_immunes),
        ("Иммунитет к состояниям", cond_immunes),
    ):
        mm = re.search(rf"<strong>{label}</strong>([\s\S]*?)</li>", params)
        if mm:
            text = _strip_tags(mm.group(1))
            parts = [p.strip(" .;") for p in re.split(r"[,;]", text) if p.strip(" .;")]
            bucket.extend(parts)

    senses: dict = {}
    m = re.search(r"<strong>Чувства</strong>([\s\S]*?)</li>", params)
    if m:
        st = _strip_tags(m.group(1))
        pm = re.search(r"пассивное\s+Восприятие\s+(\d+)", st, re.I)
        if pm:
            senses["passive_perception"] = int(pm.group(1))
        for label, key in (
            ("тёмное зрение", "darkvision"),
            ("темное зрение", "darkvision"),
            ("слепозрение", "blindsight"),
            ("истинное зрение", "truesight"),
            ("чувство вибрации", "tremorsense"),
        ):
            mm = re.search(rf"{label}\s+(\d+)\s*фт", st, re.I)
            if mm:
                senses[key] = int(mm.group(1))

    languages: list[str] = []
    m = re.search(r"<strong>Языки</strong>([\s\S]*?)</li>", params)
    if m:
        lt = _strip_tags(m.group(1))
        languages = [p.strip() for p in re.split(r",", lt) if p.strip()]

    cr = None
    xp = None
    pb = None
    m = re.search(r"<strong>Опасность</strong>([\s\S]*?)</li>", params)
    if m:
        ct = _strip_tags(m.group(1)).replace(" ", "")
        # 4 (1100опыта;БВ+2) or 1/2 (100опыта;БВ+2)
        cm = re.match(
            r"([0-9]+(?:/[0-9]+)?)\(([0-9]+)опыта;БВ([+\-−–—]?\d+)\)",
            ct.replace("\u2009", "").replace("\xa0", ""),
        )
        if not cm:
            # looser
            cm = re.search(
                r"([0-9]+(?:/[0-9]+)?)\s*\(\s*([0-9]+)\s*опыт",
                _strip_tags(m.group(1)),
            )
            pb_m = re.search(r"БВ\s*([+\-−–—]?\d+)", _strip_tags(m.group(1)))
            if cm:
                cr = cm.group(1)
                xp = int(cm.group(2).replace("\u2009", "").replace(" ", ""))
            if pb_m:
                pb = _parse_signed(pb_m.group(1))
        else:
            cr = cm.group(1)
            xp = int(cm.group(2))
            pb = _parse_signed(cm.group(3))

    # Feature sections on next.dnd.su: Особенности / Действия / …
    sections: dict[str, list[dict]] = {
        "traits": [],
        "actions": [],
        "bonus_actions": [],
        "reactions": [],
        "legendary_actions": [],
    }
    section_map = {
        "особенности": "traits",
        "черты": "traits",
        "действия": "actions",
        "бонусные действия": "bonus_actions",
        "реакции": "reactions",
        "легендарные действия": "legendary_actions",
    }
    section_chunks = re.findall(
        r"<(?:li|div)[^>]*class=[\"']article-body__monster__section[^\"']*[\"'][^>]*>\s*"
        r"<h3 class='article-body__monster__section-title'>([^<]+)</h3>\s*"
        r"<div class=\"article-body__monster__section-body\">([\s\S]*?)</div>\s*"
        r"(?:</(?:li|div)>)?",
        body,
    )
    legendary_note = None
    legendary_uses = None
    legendary_uses_lair = None
    for title_raw, chunk in section_chunks:
        title = _strip_tags(title_raw).strip().lower()
        key = None
        for ru, k in section_map.items():
            if title.startswith(ru):
                key = k
                break
        if not key:
            continue
        if key == "legendary_actions":
            desc = re.search(
                r"article-body__monster__section-legendary-desc[^>]*>([\s\S]*?)</p>",
                chunk,
            )
            if desc:
                dt = _strip_tags(desc.group(1))
                lm = re.search(
                    r"(\d+)\s*использован\w*(?:\s*Легендарных действий)?\s*"
                    r"\(или\s*(\d+)\s*использован",
                    dt,
                    re.I,
                )
                if lm:
                    legendary_uses = int(lm.group(1))
                    legendary_uses_lair = int(lm.group(2))
                    legendary_note = (
                        f"{legendary_uses} за раунд ({legendary_uses_lair} в логове)"
                    )
                else:
                    lm2 = re.search(r"(\d+)\s*использован", dt, re.I)
                    if lm2:
                        legendary_uses = int(lm2.group(1))
                        legendary_note = f"{legendary_uses} за раунд"
        # feature + attack paragraphs
        blocks = re.findall(
            r"<p class=\"article-body__(?:feature|monster-attack)[^\"]*\"[^>]*>"
            r"([\s\S]*?)</p>",
            chunk,
        )
        for block in blocks:
            name_m = re.search(
                r"<(?:span)[^>]*class='article-body__(?:feature-name|monster-attack__name)'"
                r"[^>]*(?:title=\"([^\"]*)\")?[^>]*>([^<]+)</span>",
                block,
            )
            if not name_m:
                continue
            name_en = (name_m.group(1) or "").strip() or None
            name_ru = _strip_tags(name_m.group(2)).rstrip(".").strip()
            # text after the name span
            after = block[name_m.end() :]
            text = _strip_tags(after).lstrip(". ").strip()
            if not name_ru:
                continue
            if name_ru.lower() == (meta.get("name_ru") or "").lower():
                continue
            entry = {"name_ru": name_ru, "text_ru": text}
            if name_en:
                entry["name_en"] = name_en
            sections[key].append(entry)

    # Spell refs from /spells/<id>-<slug> links and data-name
    spell_slugs: list[str] = []
    spell_names: list[str] = []
    for href, data_name in re.findall(
        r'href="/spells/\d+-([a-z0-9\-]+)"[^>]*(?:data-name="([^"]*)")?',
        body,
        re.I,
    ):
        spell_slugs.append(href.lower())
        if data_name:
            # "Волшебная рука [Mage Hand]"
            ru = data_name.split("[", 1)[0].strip()
            if ru:
                spell_names.append(ru)
    # dedupe preserve order
    seen: set[str] = set()
    spell_slugs_u: list[str] = []
    for s in spell_slugs:
        if s not in seen:
            seen.add(s)
            spell_slugs_u.append(s)
    spell_slugs = spell_slugs_u
    seen_n: set[str] = set()
    spell_names_u: list[str] = []
    for n in spell_names:
        if n not in seen_n:
            seen_n.add(n)
            spell_names_u.append(n)
    spell_names = spell_names_u

    incomplete = not (
        ac is not None
        and hp_avg is not None
        and hp_formula
        and cr
        and pb is not None
        and init_mod is not None
        and init_score is not None
        and len(abilities) == 6
        and len(ability_mods) == 6
        and len(ability_saves) == 6
        and senses.get("passive_perception") is not None
    )

    return {
        "id": meta["id"],
        "name_en": meta["name_en"],
        "name_ru": meta["name_ru"],
        "url_dndsu": meta.get("url_dndsu") or "",
        "url_ttg": meta.get("url_ttg") or "",
        "creature_type_csv": meta.get("creature_type") or "",
        "size_type_alignment": size_type,
        "ac": ac,
        "initiative": {"mod": init_mod, "score": init_score},
        "hp_average": hp_avg,
        "hp_formula": hp_formula,
        "speed": speed,
        "abilities": abilities,
        "ability_mods": ability_mods,
        "ability_saves": ability_saves,
        "skills": skills,
        "damage_vulnerabilities": vulns,
        "damage_resistances": resists,
        "damage_immunities": immunes,
        "condition_immunities": cond_immunes,
        "senses": senses,
        "languages": languages,
        "cr": cr,
        "xp": xp,
        "proficiency_bonus": pb,
        "traits": sections["traits"],
        "actions": sections["actions"],
        "bonus_actions": sections["bonus_actions"],
        "reactions": sections["reactions"],
        "legendary_actions": sections["legendary_actions"],
        "legendary_actions_note_ru": legendary_note,
        "legendary_actions_uses": legendary_uses,
        "legendary_actions_uses_lair": legendary_uses_lair,
        "spell_slugs": spell_slugs,
        "spell_names_ru": spell_names,
        "incomplete": incomplete,
    }


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    HTML_DIR.mkdir(parents=True, exist_ok=True)
    rows = wave1_rows()
    print(f"wave1 count={len(rows)}")
    scraped: dict[str, dict] = {}
    errors: list[str] = []

    def one(row: dict[str, str]) -> tuple[str, dict | None, str | None]:
        slug = row["id"]
        url = (row.get("url_dndsu") or "").strip()
        if not url:
            return slug, None, "no url_dndsu"
        cache = HTML_DIR / f"{slug}.html"
        try:
            if cache.is_file() and cache.stat().st_size > 1000:
                html = cache.read_text(encoding="utf-8")
            else:
                html = fetch(url)
                cache.write_text(html, encoding="utf-8")
            parsed = parse_page(html, row)
            return slug, parsed, None
        except Exception as exc:  # noqa: BLE001
            return slug, None, str(exc)

    with ThreadPoolExecutor(max_workers=6) as pool:
        futs = [pool.submit(one, r) for r in rows]
        for fut in as_completed(futs):
            slug, parsed, err = fut.result()
            if err or parsed is None:
                errors.append(f"{slug}: {err}")
                print("ERR", slug, err)
            else:
                scraped[slug] = parsed
                flag = "INCOMPLETE" if parsed.get("incomplete") else "ok"
                print(flag, slug, "CR", parsed.get("cr"), "AC", parsed.get("ac"))

    SCRAPED.write_text(
        json.dumps({"entries": scraped, "errors": errors}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    incomplete = [s for s, e in scraped.items() if e.get("incomplete")]
    print(
        f"done scraped={len(scraped)} errors={len(errors)} incomplete={len(incomplete)}"
    )
    if incomplete:
        print("incomplete:", ", ".join(incomplete))


if __name__ == "__main__":
    main()
