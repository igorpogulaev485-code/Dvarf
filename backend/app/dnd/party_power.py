"""B8: черновик party_power — множитель бюджета по сигналам листа.

Веса из docs/B8_ENCOUNTER_GENERATOR.md §C2.
Полный парсер листа подключится отдельно; здесь — чистая формула по уже
извлечённым метрикам (чтобы калибровать eval без UI).
"""

from __future__ import annotations

from dataclasses import dataclass

from app.dnd.encounter_budget import PARTY_POWER_MAX, PARTY_POWER_MIN, clamp_party_power


@dataclass(frozen=True, slots=True)
class PartyPowerSignals:
    """Агрегаты по пати (уже посчитанные из листов)."""

    # доля: фактический Σ HP_max / ожидаемый по уровню (1.0 = норма)
    hp_ratio: float = 1.0
    # средний КД минус норма уровня (например +2)
    ac_delta: float = 0.0
    # 0..1 «богатство» слотов (нормализованное)
    slot_richness: float = 0.0
    # 0..1 остаток боевых ресурсов
    resource_ready: float = 0.0
    # среднее число заполненных аттюн-слотов на PC (0..3)
    attunement_avg: float = 0.0
    # 0..1 эвристика расходников
    consumable_ready: float = 0.0
    # число боевых напарников
    companion_count: int = 0
    # есть ли Conc-баф на ≥1 PC
    has_concentration_buff: bool = False
    # 0..1 квантиль DPR proxy
    dpr_quantile: float = 0.0


def compute_party_power(signals: PartyPowerSignals) -> float:
    """Собрать party_power из сигналов. База 1.0."""
    power = 1.0

    # HP: +0.05 за каждые +20% выше нормы
    if signals.hp_ratio > 1.0:
        power += 0.05 * ((signals.hp_ratio - 1.0) / 0.20)

    # КД: +0.04 за +2 к норме
    if signals.ac_delta > 0:
        power += 0.04 * (signals.ac_delta / 2.0)

    power += 0.10 * _clamp01(signals.slot_richness)
    power += 0.08 * _clamp01(signals.resource_ready)
    power += 0.04 * max(0.0, min(3.0, signals.attunement_avg))
    power += 0.06 * _clamp01(signals.consumable_ready)
    power += 0.05 * max(0, signals.companion_count)
    if signals.has_concentration_buff:
        power += 0.03
    power += 0.15 * _clamp01(signals.dpr_quantile)

    return clamp_party_power(power)


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


__all__ = [
    "PARTY_POWER_MIN",
    "PARTY_POWER_MAX",
    "PartyPowerSignals",
    "compute_party_power",
]
