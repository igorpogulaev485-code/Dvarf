"""B8/G-01: party_power — множитель бюджета по сигналам листа + лёгкий вклад homebrew."""

from __future__ import annotations

from dataclasses import dataclass

from app.dnd.encounter_budget import PARTY_POWER_MAX, PARTY_POWER_MIN, clamp_party_power
from app.dnd.encounter_calib import homebrew_party_power_weights, party_power_weights


@dataclass(frozen=True, slots=True)
class PartyPowerSignals:
    """Агрегаты по пати (уже посчитанные из листов)."""

    hp_ratio: float = 1.0
    ac_delta: float = 0.0
    slot_richness: float = 0.0
    resource_ready: float = 0.0
    attunement_avg: float = 0.0
    consumable_ready: float = 0.0
    companion_count: int = 0
    has_concentration_buff: bool = False
    dpr_quantile: float = 0.0
    resistance_proxy: float = 0.0


def compute_party_power(
    signals: PartyPowerSignals,
    *,
    homebrew_keys: list[str] | tuple[str, ...] | None = None,
) -> float:
    """Собрать party_power из сигналов. База 1.0. Homebrew — слабая надстройка."""
    w = party_power_weights()
    power = 1.0

    if signals.hp_ratio > 1.0:
        power += float(w.get("hp_per_20pct", 0.05)) * ((signals.hp_ratio - 1.0) / 0.20)

    if signals.ac_delta > 0:
        power += float(w.get("ac_per_2", 0.04)) * (signals.ac_delta / 2.0)

    power += float(w.get("slot_richness", 0.10)) * _clamp01(signals.slot_richness)
    power += float(w.get("resource_ready", 0.08)) * _clamp01(signals.resource_ready)
    power += float(w.get("attunement_per_slot", 0.04)) * max(
        0.0, min(3.0, signals.attunement_avg)
    )
    power += float(w.get("consumable_ready", 0.06)) * _clamp01(signals.consumable_ready)
    power += float(w.get("companion", 0.05)) * max(0, signals.companion_count)
    if signals.has_concentration_buff:
        power += float(w.get("concentration_buff", 0.03))
    power += float(w.get("dpr_quantile", 0.15)) * _clamp01(signals.dpr_quantile)
    power += float(w.get("resistance_proxy", 0.08)) * _clamp01(signals.resistance_proxy)

    hb = homebrew_party_power_weights()
    for key in homebrew_keys or ():
        power += float(hb.get(key, 0.0))

    return clamp_party_power(power)


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


__all__ = [
    "PARTY_POWER_MIN",
    "PARTY_POWER_MAX",
    "PartyPowerSignals",
    "compute_party_power",
]
