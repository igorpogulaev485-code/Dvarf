"""G-01: собрать волны под стиль (толпа/босс/смешанный), профиль и летунов."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from app.dnd.encounter_budget import (
    EncounterDifficulty,
    budget_adjusted,
    encounter_xp_cost,
)
from app.dnd.encounter_calib import (
    candidates_per_role,
    composition_spec,
    fly_budget_bonus,
    wave_profile_spec,
)
from app.dnd.encounter_pool import (
    BestiaryMonsterRef,
    filter_monster_pool,
    pick_top_by_xp,
)
from app.dnd.sheet_signals import PartyAnalysis, PartyMemberSnapshot, analyze_party

Composition = Literal["horde", "boss", "mixed"]
WaveProfile = Literal["even", "escalation"]
FlyersMode = Literal["auto", "allow", "want", "none"]
EnemyCasters = Literal["none", "any", "several"]


@dataclass(frozen=True, slots=True)
class RoleCandidates:
    role: str  # boss | pack
    options: tuple[BestiaryMonsterRef, ...]
    suggested_count: int


@dataclass(frozen=True, slots=True)
class WaveProposal:
    wave_index: int
    budget_xp: int
    boss: RoleCandidates | None
    pack: RoleCandidates | None


@dataclass(frozen=True, slots=True)
class EncounterProposal:
    difficulty: EncounterDifficulty
    party_power: float
    budget_total: int
    anti_air_ok: bool
    waves: tuple[WaveProposal, ...]
    notes: tuple[str, ...]
    composition: Composition = "mixed"
    wave_profile: WaveProfile = "even"
    flyers: FlyersMode = "auto"
    enemy_casters: EnemyCasters = "any"
    flyers_warning: bool = False
    ranged_band: str = "low"


def compose_encounter(
    *,
    members: list[PartyMemberSnapshot],
    monsters: list[BestiaryMonsterRef],
    difficulty: EncounterDifficulty,
    environments: list[str] | None = None,
    theme_ids: list[str] | None = None,
    similar: bool = False,
    waves: int = 1,
    party_analysis: PartyAnalysis | None = None,
    composition: Composition = "mixed",
    wave_profile: WaveProfile = "even",
    flyers: FlyersMode = "auto",
    enemy_casters: EnemyCasters = "any",
    homebrew_keys: list[str] | tuple[str, ...] | None = None,
) -> EncounterProposal:
    """Предложить N волн: на роль 2–3 кандидата под выбранный стиль."""
    analysis = party_analysis or analyze_party(members, homebrew_keys=homebrew_keys)
    wave_n = max(1, min(8, int(waves)))
    style = composition if composition in {"horde", "boss", "mixed"} else "mixed"
    profile: WaveProfile = (
        "even" if wave_n <= 1 or wave_profile != "escalation" else "escalation"
    )
    fly_mode: FlyersMode = flyers if flyers in {"auto", "allow", "want", "none"} else "auto"
    casters: EnemyCasters = (
        enemy_casters if enemy_casters in {"none", "any", "several"} else "any"
    )

    total = budget_adjusted(analysis.levels, difficulty, analysis.party_power)
    wave_budgets = _allocate_wave_budgets(total, wave_n, profile)

    exclude_fly, flyers_warning, fly_notes = _resolve_fly_filter(
        fly_mode, analysis.anti_air_ok
    )
    exclude_casters = casters == "none"
    prefer_casters = casters == "several"

    pool = filter_monster_pool(
        monsters,
        environments=environments,
        theme_ids=theme_ids,
        similar=similar,
        exclude_fly=exclude_fly,
        exclude_casters=exclude_casters,
        prefer_casters=prefer_casters,
    )
    notes = list(analysis.notes)
    notes.extend(fly_notes)
    if prefer_casters and not any(m.caster for m in pool):
        notes.append("no_casters_in_pool")

    if not pool:
        notes.append("empty_pool")
        empty_waves = tuple(
            WaveProposal(
                i + 1,
                wave_budgets[i],
                RoleCandidates("boss", (), 1) if style != "horde" else None,
                RoleCandidates("pack", (), 0) if style != "boss" else None,
            )
            for i in range(wave_n)
        )
        return EncounterProposal(
            difficulty=difficulty,
            party_power=analysis.party_power,
            budget_total=total,
            anti_air_ok=analysis.anti_air_ok,
            waves=empty_waves,
            notes=tuple(notes),
            composition=style,  # type: ignore[arg-type]
            wave_profile=profile,
            flyers=fly_mode,
            enemy_casters=casters,
            flyers_warning=flyers_warning,
            ranged_band=analysis.ranged_band,
        )

    # Надбавка за полёт: ≈+1 ступень при слабом дальнем (params §3), слабее при сильном.
    fly_mult = 1.0
    if not exclude_fly and (flyers_warning or fly_mode in {"allow", "want"}):
        fly_mult = fly_budget_bonus(weak_ranged=not analysis.anti_air_ok)
        if fly_mult > 1.0 and flyers_warning:
            notes.append("fly_budget_bonus_applied")

    cand_limit = candidates_per_role()
    built: list[WaveProposal] = []
    for i, budget_xp in enumerate(wave_budgets):
        built.append(
            _compose_wave(
                pool=pool,
                budget_xp=budget_xp,
                wave_index=i + 1,
                style=style,
                prefer_casters=prefer_casters,
                fly_mult=fly_mult,
                cand_limit=cand_limit,
            )
        )
    return EncounterProposal(
        difficulty=difficulty,
        party_power=analysis.party_power,
        budget_total=sum(wave_budgets),
        anti_air_ok=analysis.anti_air_ok,
        waves=tuple(built),
        notes=tuple(notes),
        composition=style,  # type: ignore[arg-type]
        wave_profile=profile,
        flyers=fly_mode,
        enemy_casters=casters,
        flyers_warning=flyers_warning,
        ranged_band=analysis.ranged_band,
    )


def _resolve_fly_filter(
    flyers: FlyersMode, anti_air_ok: bool
) -> tuple[bool, bool, list[str]]:
    """exclude_fly, warning, notes."""
    if flyers == "none":
        return True, False, ["flyers_none"]
    if flyers == "auto":
        if anti_air_ok:
            return False, False, []
        return True, False, ["flyers_auto_suppressed"]
    if flyers == "allow":
        if anti_air_ok:
            return False, False, []
        return False, True, ["flyers_weak_ranged_warning"]
    # want
    if anti_air_ok:
        return False, False, ["flyers_wanted"]
    return False, True, ["flyers_wanted", "flyers_weak_ranged_warning"]


def _allocate_wave_budgets(
    total: int, wave_n: int, profile: WaveProfile
) -> list[int]:
    if wave_n <= 1:
        return [max(1, total)]
    if profile != "escalation":
        base = max(1, total // wave_n)
        budgets = [base] * wave_n
        budgets[-1] += max(0, total - base * wave_n)
        return budgets

    spec = wave_profile_spec("escalation")
    # лёгкая → средняя → босс (0.5…1.5 относительно средней доли)
    start = float(spec.get("weight_start") or 0.5)
    end = float(spec.get("weight_end") or 1.5)
    exhaust = float(spec.get("exhaustion_penalty_last") or 0.25)
    if wave_n == 1:
        weights = [1.0]
    else:
        weights = [
            start + (end - start) * (i / (wave_n - 1)) for i in range(wave_n)
        ]
        # истощение: последнюю волну нельзя считать как для свежей партии
        weights[-1] *= max(0.4, 1.0 - exhaust)
    wsum = sum(weights) or 1.0
    raw = [total * (w / wsum) for w in weights]
    budgets = [max(1, int(round(x))) for x in raw]
    drift = total - sum(budgets)
    budgets[-1] = max(1, budgets[-1] + drift)
    return budgets


def _compose_wave(
    *,
    pool: list[BestiaryMonsterRef],
    budget_xp: int,
    wave_index: int,
    style: str,
    prefer_casters: bool,
    fly_mult: float = 1.0,
    cand_limit: int = 3,
) -> WaveProposal:
    spec = composition_spec(style)
    require_boss = bool(spec.get("require_boss", style != "horde"))
    require_pack = bool(spec.get("require_pack", style != "boss"))
    boss_share = float(spec.get("boss_share") or 0.0)
    boss_cap = float(spec.get("boss_cap") or 0.7)

    boss: RoleCandidates | None = None
    pack: RoleCandidates | None = None
    remain = budget_xp
    used_slugs: set[str] = set()

    if require_boss:
        boss_target = max(1, int(round(budget_xp * boss_share))) if boss_share > 0 else max(1, budget_xp)
        cap_xp = int(budget_xp * boss_cap) if boss_cap > 0 else budget_xp
        boss_pool = [
            m
            for m in pool
            if _effective_xp(m, fly_mult) <= max(1, cap_xp) and m.xp > 0
        ]
        if not boss_pool:
            boss_pool = [m for m in pool if m.xp > 0] or list(pool)
        boss_opts = pick_top_by_xp(
            boss_pool,
            target_xp=boss_target,
            limit=cand_limit,
            prefer_casters=prefer_casters,
        )
        boss_xp = _effective_xp(boss_opts[0], fly_mult) if boss_opts else 0
        used_slugs = {m.slug for m in boss_opts[:1]}
        remain = max(0, budget_xp - boss_xp)
        boss = RoleCandidates("boss", tuple(boss_opts), 1 if boss_opts else 0)

    if require_pack:
        pack_cap = remain
        if boss and boss.options:
            pack_cap = min(remain, max(25, _effective_xp(boss.options[0], fly_mult) - 1))
        pack_pool = [
            m
            for m in pool
            if m.slug not in used_slugs and 0 < _effective_xp(m, fly_mult) <= max(1, pack_cap)
        ]
        if not pack_pool:
            pack_pool = [
                m
                for m in pool
                if m.slug not in used_slugs and 0 < m.xp <= max(1, remain)
            ] or [m for m in pool if m.xp > 0 and m.slug not in used_slugs]
        pack_target_each = max(10, remain // (8 if style == "horde" else 4)) if remain else 25
        pack_opts = pick_top_by_xp(
            pack_pool,
            target_xp=pack_target_each,
            limit=cand_limit,
            prefer_casters=prefer_casters,
        )
        suggested = 0
        if pack_opts and remain > 0:
            suggested = _best_count(_effective_xp(pack_opts[0], fly_mult), remain)
            if style == "horde":
                suggested = max(suggested, 4 if remain >= pack_opts[0].xp * 3 else suggested)
        pack = RoleCandidates("pack", tuple(pack_opts), suggested)

    return WaveProposal(
        wave_index=wave_index,
        budget_xp=budget_xp,
        boss=boss,
        pack=pack,
    )


def _effective_xp(monster: BestiaryMonsterRef, fly_mult: float) -> int:
    xp = max(0, int(monster.xp))
    if monster.fly and fly_mult > 1.0:
        return int(round(xp * fly_mult))
    return xp


def _best_count(xp_each: int, remain: int) -> int:
    """Подобрать count 1..12 так, чтобы encounter_xp_cost ≈ remain."""
    if xp_each <= 0 or remain <= 0:
        return 0
    best_n = 1
    best_err = abs(encounter_xp_cost(xp_each, 1) - remain)
    for n in range(1, 13):
        cost = encounter_xp_cost(xp_each, n)
        err = abs(cost - remain)
        if err < best_err or (err == best_err and n > best_n):
            best_err = err
            best_n = n
        if cost > remain * 1.25 and n >= 2:
            break
    return best_n
