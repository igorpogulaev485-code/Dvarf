#!/usr/bin/env python3
"""Apply P24-N01 Russian naming decision to 2024 live JSON + docs.

Usage (from repo root or backend):
  python3 backend/scripts/apply_p24_n01_ru_names.py
"""

from __future__ import annotations

import csv
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.dnd.p24_n01_names import (  # noqa: E402
    KIND_TO_2014,
    SOURCES_DIR,
    _CSV_KIND_HINTS,
    decide_name,
    decision_key,
    fix_rarity_ru,
    has_cyrillic,
    iter_live_entries,
    load_2014_name_index,
    norm_en,
    parse_discrepancies,
    rewrite_strings,
    unify_srd_aliases,
)


def _dump_json(path: Path, payload: dict) -> None:
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def _decision_for_discrepancy(slug: str, category: str, decisions_by_key: dict):
    aliases = {
        "species": "race",
        "creatures": "bestiary",
        "animals": "bestiary",
        "magic_items": "item",
        "equipment": "item",
        "items": "item",
        "glossary": "glossary",
    }
    mapped = aliases.get(category, KIND_TO_2014.get(category, category))
    return decisions_by_key.get((mapped, slug)) or decisions_by_key.get((category, slug))


def write_discrepancies(
    discrepancies: dict[str, dict[str, str]],
    decisions_by_key: dict,
) -> None:
    lines = [
        "# Расхождения русских названий (P24-00 → P24-N01)",
        "",
        "Дата сверки: 2026-11-15. Источники: next.dnd.su и new.ttg.club.",
        "",
        f"Всего расхождений: **{len(discrepancies)}**.",
        "",
        "Решение Игоря (P24-N01): «Где есть такое же в 2014 — оставляем как в 2014, "
        "остальное с next.dnd.su». Записи с `name_ru_pending` (бастионы / свой перевод) "
        "не менялись.",
        "",
        "| Категория | id | EN | dnd.su | ttg.club | Предложено | Почему | Итог | Основание |",
        "|---|---|---|---|---|---|---|---|---|",
    ]
    for slug, row in discrepancies.items():
        dec = _decision_for_discrepancy(slug, row["category"], decisions_by_key)
        if dec is not None:
            itog = dec.new_ru
            basis = dec.basis if dec.basis != "unchanged" else "dnd.su"
        else:
            itog = row["dnd_su"]
            basis = "dnd.su"
        proposed = row.get("proposed") or ""
        why = row.get("why") or ""
        lines.append(
            f"| {row['category']} | `{slug}` | {row['name_en']} | {row['dnd_su']} | "
            f"{row['ttg']} | **{proposed}** | {why} | **{itog}** | {basis} |"
        )
    lines.append("")
    (SOURCES_DIR / "discrepancies.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_names_decision(
    decisions: list,
    discrepancies: dict[str, dict[str, str]],
) -> None:
    basis_counts = Counter(d.basis for d in decisions)
    changed = [d for d in decisions if d.old_ru != d.new_ru]
    by_file: Counter[str] = Counter(d.file for d in changed)

    from_2014_diff_sites = []
    for d in decisions:
        if d.basis != "2014":
            continue
        disc = discrepancies.get(d.slug)
        if not disc:
            continue
        if d.new_ru not in {disc["dnd_su"], disc["ttg"]}:
            from_2014_diff_sites.append(d)

    slug_en_mismatch = []
    for d in decisions:
        if d.basis != "2014" or d.match_how != "slug":
            continue
        if d.pair_en and d.name_en and norm_en(d.pair_en) != norm_en(d.name_en):
            slug_en_mismatch.append(d)

    lines = [
        "# P24-N01 — решение по русским названиям 2024",
        "",
        "Правило Игоря: пара в 2014 → имя 2014; иначе next.dnd.su; "
        "`name_ru_pending` не трогаем.",
        "",
        "## Сводка",
        "",
        f"- Записей live 2024 рассмотрено: **{len(decisions)}**",
        f"- Взято из 2014: **{basis_counts.get('2014', 0)}**",
        f"- Взято из dnd.su (расхождения без пары): **{basis_counts.get('dnd.su', 0)}**",
        f"- Pending (не меняли): **{basis_counts.get('pending', 0)}**",
        f"- Без изменения (уже совпадало / вне таблицы): **{basis_counts.get('unchanged', 0)}**",
        f"- Фактически изменено `name_ru`: **{len(changed)}**",
        "",
        "### Изменения по файлам",
        "",
    ]
    if by_file:
        lines.append("| Файл | Изменено имён |")
        lines.append("|---|---:|")
        for name, n in sorted(by_file.items()):
            lines.append(f"| `{name}` | {n} |")
    else:
        lines.append("_Имена не менялись._")
    lines.extend(["", "### 10 примеров «было → стало»", ""])
    for d in changed[:10]:
        lines.append(f"- `{d.slug}` ({d.file}): «{d.old_ru}» → «{d.new_ru}» [{d.basis}]")
    if not changed:
        lines.append("- (нет)")

    lines.extend(
        [
            "",
            "## Имя 2014 отличается от обоих сайтов",
            "",
            f"Всего: **{len(from_2014_diff_sites)}**.",
            "",
        ]
    )
    if from_2014_diff_sites:
        lines.append("| id | kind | EN | 2014 | dnd.su | ttg.club |")
        lines.append("|---|---|---|---|---|---|")
        for d in from_2014_diff_sites:
            disc = discrepancies[d.slug]
            lines.append(
                f"| `{d.slug}` | {d.kind} | {d.name_en} | {d.new_ru} | "
                f"{disc['dnd_su']} | {disc['ttg']} |"
            )
    else:
        lines.append("_Нет._")

    lines.extend(
        [
            "",
            "## Пара по slug, английские названия разные",
            "",
            f"Всего: **{len(slug_en_mismatch)}** (на глаз Игорю).",
            "",
        ]
    )
    if slug_en_mismatch:
        lines.append("| id 2024 | kind | EN 2024 | slug 2014 | EN 2014 | RU | источник |")
        lines.append("|---|---|---|---|---|---|---|")
        for d in slug_en_mismatch:
            lines.append(
                f"| `{d.slug}` | {d.kind} | {d.name_en} | `{d.pair_slug}` | {d.pair_en} | "
                f"{d.new_ru} | {d.pair_src} |"
            )
    else:
        lines.append("_Нет._")

    lines.append("")
    (SOURCES_DIR / "names-decision.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def update_source_csvs_multi(decisions_list: list) -> dict[str, int]:
    by_slug: dict[str, list] = defaultdict(list)
    for dec in decisions_list:
        by_slug[dec.slug].append(dec)

    changed_files: dict[str, int] = {}
    for path in sorted(SOURCES_DIR.glob("*.csv")):
        if path.name.startswith("glossary") or path.name not in _CSV_KIND_HINTS:
            continue
        allowed_kinds = _CSV_KIND_HINTS[path.name]
        with path.open(encoding="utf-8", newline="") as fh:
            reader = csv.DictReader(fh)
            fieldnames = reader.fieldnames
            if not fieldnames or "id" not in fieldnames or "name_ru" not in fieldnames:
                continue
            rows = list(reader)
        n = 0
        for row in rows:
            opts = by_slug.get(row["id"]) or []
            dec = next((d for d in opts if d.kind in allowed_kinds), None)
            if (
                dec
                and not dec.pending
                and dec.new_ru
                and row.get("name_ru") != dec.new_ru
            ):
                row["name_ru"] = dec.new_ru
                n += 1
        if n:
            with path.open("w", encoding="utf-8", newline="") as fh:
                writer = csv.DictWriter(fh, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(rows)
            changed_files[path.name] = n
    return changed_files


def main() -> int:
    by_slug, by_en_kind = load_2014_name_index()
    discrepancies = parse_discrepancies()

    live_rows: list[dict] = []
    file_payloads: dict[Path, dict] = {}
    decisions_list = []
    decisions_by_key: dict = {}

    for path, payload, entry in iter_live_entries():
        file_payloads[path] = payload
        if not entry.get("slug"):
            continue
        if path.name.startswith("spell_"):
            continue
        live_rows.append(entry)
        dec = decide_name(
            entry,
            file_name=path.name,
            discrepancies=discrepancies,
            by_slug=by_slug,
            by_en_kind=by_en_kind,
        )
        decisions_list.append(dec)
        decisions_by_key[decision_key(dec.kind, dec.slug)] = dec

    alias_view = {d.slug: d for d in decisions_list if d.kind in {"spell", "item"}}
    unify_srd_aliases(alias_view, [e for e in live_rows if e.get("kind") in {"spell", "item"}])
    for dec in decisions_list:
        if dec.kind not in {"spell", "item"}:
            continue
        synced = alias_view.get(dec.slug)
        if synced is not None and synced is not dec:
            dec.new_ru = synced.new_ru
            if synced.basis in {"2014", "dnd.su"} and dec.basis == "unchanged":
                dec.basis = synced.basis

    # Only rewrite phrases that uniquely identify one renamed card
    # (same RU shared by several cards is left untouched in surrounding text).
    name_ru_owners: dict[str, set[tuple[str, str]]] = defaultdict(set)
    for dec in decisions_list:
        if dec.old_ru:
            name_ru_owners[dec.old_ru].add((dec.kind, dec.slug))

    old_to_news: dict[str, set[str]] = defaultdict(set)
    for dec in decisions_list:
        if dec.pending or dec.old_ru == dec.new_ru:
            continue
        if not dec.old_ru or not has_cyrillic(dec.old_ru):
            continue
        if len(name_ru_owners.get(dec.old_ru, ())) != 1:
            continue
        old_to_news[dec.old_ru].add(dec.new_ru)
    replacements = [
        (old, next(iter(news)))
        for old, news in old_to_news.items()
        if len(news) == 1
    ]
    replacements.sort(key=lambda p: len(p[0]), reverse=True)

    rarity_fixes = 0
    name_changes_by_file: Counter[str] = Counter()
    text_touch_files: set[str] = set()

    for path, payload in file_payloads.items():
        entries = payload.get("entries") or []
        file_changed = False
        for entry in entries:
            if entry.get("slug"):
                dec = decisions_by_key.get(
                    decision_key(entry.get("kind"), entry.get("slug"))
                )
                if dec and not dec.pending and entry.get("name_ru") != dec.new_ru:
                    entry["name_ru"] = dec.new_ru
                    name_changes_by_file[path.name] += 1
                    file_changed = True
            if fix_rarity_ru(entry):
                rarity_fixes += 1
                file_changed = True

        if replacements:
            new_entries = rewrite_strings(entries, replacements)
            if new_entries != entries:
                payload["entries"] = new_entries
                file_changed = True
                text_touch_files.add(path.name)

        if file_changed:
            _dump_json(path, payload)

    csv_changes = update_source_csvs_multi(decisions_list)
    write_discrepancies(discrepancies, decisions_by_key)
    write_names_decision(decisions_list, discrepancies)

    print("P24-N01 applied")
    print("name changes by file:", dict(name_changes_by_file))
    print("total name changes:", sum(name_changes_by_file.values()))
    print("rarity_ru fixes:", rarity_fixes)
    print("text rewrite files:", sorted(text_touch_files))
    print("csv updates:", csv_changes)
    print("basis:", dict(Counter(d.basis for d in decisions_list)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
