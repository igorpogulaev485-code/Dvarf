"""B8: фильтр пула бестиария — environment ∩ themes ∩ anti-fly."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable, Sequence

from app.dnd.encounter_themes import expand_theme_ids, monster_matches_themes
from app.dnd.xp import xp_from_cr


@dataclass(frozen=True, slots=True)
class BestiaryMonsterRef:
    """Минимальный снимок записи бестиария для генератора."""

    slug: str
    name_ru: str
    cr: str
    xp: int
    type_en: str
    subtype: str | None
    environments: tuple[str, ...]
    fly: bool
    hp_average: int | None = None
    ac: int | None = None


def monster_from_catalog_entry(entry: dict[str, Any]) -> BestiaryMonsterRef | None:
    """Собрать ref из JSON бестиария / catalog data."""
    if not isinstance(entry, dict):
        return None
    data = entry.get("data") if isinstance(entry.get("data"), dict) else entry
    if not isinstance(data, dict):
        return None
    slug = str(entry.get("slug") or data.get("slug") or "").strip()
    name = str(entry.get("name_ru") or data.get("name_ru") or "").strip()
    if not slug or not name:
        return None
    cr = str(data.get("cr") or "").strip()
    xp = xp_from_cr(cr) or 0
    type_en = str(data.get("type") or "").strip().lower()
    subtype_raw = data.get("subtype")
    subtype = str(subtype_raw).strip() if subtype_raw else None
    envs_raw = data.get("environment") or []
    envs: list[str] = []
    if isinstance(envs_raw, list):
        envs = [str(x).strip() for x in envs_raw if str(x).strip()]
    elif isinstance(envs_raw, str) and envs_raw.strip():
        envs = [envs_raw.strip()]
    speed = data.get("speed") if isinstance(data.get("speed"), dict) else {}
    fly = bool(isinstance(speed, dict) and speed.get("fly"))
    hp = data.get("hp_average")
    ac = data.get("ac")
    return BestiaryMonsterRef(
        slug=slug,
        name_ru=name,
        cr=cr,
        xp=int(xp),
        type_en=type_en,
        subtype=subtype,
        environments=tuple(envs),
        fly=fly,
        hp_average=int(hp) if isinstance(hp, int) else None,
        ac=int(ac) if isinstance(ac, int) else None,
    )


def filter_monster_pool(
    monsters: Sequence[BestiaryMonsterRef],
    *,
    environments: Sequence[str] | None = None,
    theme_ids: Sequence[str] | None = None,
    similar: bool = False,
    exclude_fly: bool = False,
    min_xp: int = 0,
    max_xp: int | None = None,
) -> list[BestiaryMonsterRef]:
    """Отфильтровать кандидатов под жест мастера."""
    env_set = {e.strip() for e in (environments or []) if e and e.strip() and e != "любая"}
    themes = expand_theme_ids(theme_ids or (), similar=similar) if theme_ids else set()

    out: list[BestiaryMonsterRef] = []
    for m in monsters:
        if exclude_fly and m.fly:
            continue
        if env_set and m.environments and not (env_set & set(m.environments)):
            continue
        # если у монстра нет environment — пропускаем только когда фильтр локации задан
        if env_set and not m.environments:
            continue
        if themes and not monster_matches_themes(
            type_en=m.type_en,
            subtype=m.subtype,
            theme_ids=themes,
        ):
            continue
        if m.xp < min_xp:
            continue
        if max_xp is not None and m.xp > max_xp:
            continue
        out.append(m)
    return out


def pick_top_by_xp(
    monsters: Iterable[BestiaryMonsterRef],
    *,
    target_xp: int,
    limit: int = 3,
) -> list[BestiaryMonsterRef]:
    """2–3 кандидата ближе всего к target_xp (для роли босса)."""
    scored = sorted(
        monsters,
        key=lambda m: (abs(m.xp - target_xp), -m.xp, m.name_ru),
    )
    # уникальные slug
    seen: set[str] = set()
    picks: list[BestiaryMonsterRef] = []
    for m in scored:
        if m.slug in seen:
            continue
        seen.add(m.slug)
        picks.append(m)
        if len(picks) >= limit:
            break
    return picks
