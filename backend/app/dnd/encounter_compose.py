"""B8: собрать волну «босс + пачка» под бюджет XP."""

from __future__ import annotations

from dataclasses import dataclass

from app.dnd.encounter_budget import (
    EncounterDifficulty,
    budget_adjusted,
    encounter_xp_cost,
)
from app.dnd.encounter_pool import (
    BestiaryMonsterRef,
    filter_monster_pool,
    pick_top_by_xp,
)
from app.dnd.sheet_signals import PartyAnalysis, PartyMemberSnapshot, analyze_party


@dataclass(frozen=True, slots=True)
class RoleCandidates:
    role: str  # boss | pack
    options: tuple[BestiaryMonsterRef, ...]
    suggested_count: int


@dataclass(frozen=True, slots=True)
class WaveProposal:
    wave_index: int
    budget_xp: int
    boss: RoleCandidates
    pack: RoleCandidates


@dataclass(frozen=True, slots=True)
class EncounterProposal:
    difficulty: EncounterDifficulty
    party_power: float
    budget_total: int
    anti_air_ok: bool
    waves: tuple[WaveProposal, ...]
    notes: tuple[str, ...]


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
) -> EncounterProposal:
    """Предложить N волн: на роль 2–3 кандидата, count пачки под остаток бюджета."""
    analysis = party_analysis or analyze_party(members)
    wave_n = max(1, min(8, int(waves)))
    total = budget_adjusted(analysis.levels, difficulty, analysis.party_power)
    per_wave = max(1, total // wave_n) if wave_n else total

    pool = filter_monster_pool(
        monsters,
        environments=environments,
        theme_ids=theme_ids,
        similar=similar,
        exclude_fly=not analysis.anti_air_ok,
    )
    notes = list(analysis.notes)
    if not pool:
        notes.append("empty_pool")
        empty = RoleCandidates("boss", (), 1)
        empty_pack = RoleCandidates("pack", (), 0)
        return EncounterProposal(
            difficulty=difficulty,
            party_power=analysis.party_power,
            budget_total=total,
            anti_air_ok=analysis.anti_air_ok,
            waves=tuple(
                WaveProposal(i + 1, per_wave, empty, empty_pack) for i in range(wave_n)
            ),
            notes=tuple(notes),
        )

    built: list[WaveProposal] = []
    for i in range(wave_n):
        built.append(
            _compose_wave(
                pool=pool,
                budget_xp=per_wave,
                wave_index=i + 1,
            )
        )
    return EncounterProposal(
        difficulty=difficulty,
        party_power=analysis.party_power,
        budget_total=total,
        anti_air_ok=analysis.anti_air_ok,
        waves=tuple(built),
        notes=tuple(notes),
    )


def _compose_wave(
    *,
    pool: list[BestiaryMonsterRef],
    budget_xp: int,
    wave_index: int,
) -> WaveProposal:
    # босс: ~45% бюджета
    boss_target = max(1, int(round(budget_xp * 0.45)))
    # босс не должен съесть почти всё — верхняя граница 70%
    boss_pool = [m for m in pool if m.xp <= int(budget_xp * 0.7) and m.xp > 0]
    if not boss_pool:
        boss_pool = [m for m in pool if m.xp > 0] or list(pool)
    boss_opts = pick_top_by_xp(boss_pool, target_xp=boss_target, limit=3)
    boss_xp = boss_opts[0].xp if boss_opts else 0
    boss_slugs = {m.slug for m in boss_opts[:1]}
    remain = max(0, budget_xp - boss_xp)

    # пачка: заметно дешевле босса, не тот же slug что выбранный босс
    pack_cap = min(remain, max(25, boss_xp - 1)) if boss_xp else remain
    pack_pool = [
        m
        for m in pool
        if m.slug not in boss_slugs and 0 < m.xp <= pack_cap
    ]
    if not pack_pool:
        pack_pool = [
            m for m in pool if m.slug not in boss_slugs and 0 < m.xp <= remain
        ] or [m for m in pool if 0 < m.xp and m.slug not in boss_slugs]
    # целевой XP одной твари — чтобы count попал в 2..8
    pack_target_each = max(10, remain // 4) if remain else 25
    pack_opts = pick_top_by_xp(pack_pool, target_xp=pack_target_each, limit=3)
    suggested = 0
    if pack_opts and remain > 0:
        suggested = _best_count(pack_opts[0].xp, remain)

    return WaveProposal(
        wave_index=wave_index,
        budget_xp=budget_xp,
        boss=RoleCandidates("boss", tuple(boss_opts), 1),
        pack=RoleCandidates("pack", tuple(pack_opts), suggested),
    )


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
