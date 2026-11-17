"""Серверный парсер и честный бросок формул DICE-01 / DICE-02b.

Случайность — secrets.randbelow (без смещения). Не использовать random.randint.
"""

from __future__ import annotations

import re
import secrets
from dataclasses import dataclass
from typing import Literal

FORMULA_MAX_LEN = 200
DICE_MAX_COUNT = 100
SIDES_MIN = 2
SIDES_MAX = 1000

AdvantageMode = Literal["none", "advantage", "disadvantage"]


@dataclass(frozen=True)
class DieGroup:
    count: int
    sides: int
    keep_highest: int | None
    keep_lowest: int | None
    sign: int  # +1 / -1


@dataclass(frozen=True)
class ModTerm:
    value: int


Term = DieGroup | ModTerm


@dataclass(frozen=True)
class ParseOk:
    terms: list[Term]
    canonical: str
    total_dice: int
    single_d20_eligible: bool


@dataclass(frozen=True)
class DieFace:
    sides: int
    value: int
    dropped: bool
    nat: Literal["20", "1"] | None = None
    """Optional rider source label (Bless / dragonmark intuition, …)."""
    label: str | None = None

    def as_dict(self) -> dict:
        out: dict = {
            "sides": self.sides,
            "value": self.value,
            "dropped": self.dropped,
        }
        if self.nat is not None:
            out["nat"] = self.nat
        if self.label:
            out["label"] = self.label
        return out


def apply_die_labels(
    dice: list[DieFace],
    labels: list[dict] | None,
) -> list[DieFace]:
    """Attach client-supplied rider labels to matching non-d20 kept faces (order)."""
    if not labels:
        return dice
    pending: list[tuple[int, str]] = []
    for row in labels:
        if not isinstance(row, dict):
            continue
        sides = row.get("sides")
        label = row.get("label")
        if not isinstance(sides, int) or sides < 2:
            continue
        if not isinstance(label, str) or not label.strip():
            continue
        pending.append((sides, label.strip()[:80]))
    if not pending:
        return dice
    out: list[DieFace] = []
    for face in dice:
        if face.dropped or face.sides == 20 or not pending:
            out.append(face)
            continue
        match_i = next(
            (i for i, (sides, _) in enumerate(pending) if sides == face.sides),
            None,
        )
        if match_i is None:
            out.append(face)
            continue
        _, label = pending.pop(match_i)
        out.append(
            DieFace(
                sides=face.sides,
                value=face.value,
                dropped=face.dropped,
                nat=face.nat,
                label=label,
            )
        )
    return out


def roll_ok_with_die_labels(rolled: RollOk, labels: list[dict] | None) -> RollOk:
    """Return a RollOk whose dice (and breakdown) carry rider labels."""
    labeled = apply_die_labels(rolled.dice, labels)
    if labeled is rolled.dice:
        return rolled
    return RollOk(
        expression=rolled.expression,
        advantage_mode=rolled.advantage_mode,
        total=rolled.total,
        dice=labeled,
        modifier_total=rolled.modifier_total,
        breakdown=_breakdown(labeled, rolled.modifier_total, rolled.total)[:500],
    )


@dataclass(frozen=True)
class RollOk:
    expression: str
    advantage_mode: AdvantageMode
    total: int
    dice: list[DieFace]
    modifier_total: int
    breakdown: str


class FormulaError(ValueError):
    """Кривая формула — текст уже по-русски."""


def fair_die(sides: int) -> int:
    """Честная грань 1…sides через secrets.randbelow."""
    n = int(sides)
    if n < SIDES_MIN or n > SIDES_MAX:
        raise FormulaError("Неверное число граней")
    return secrets.randbelow(n) + 1


def _parse_sides(raw: str) -> int:
    t = raw.strip().lower().replace("к", "d").replace("%", "100")
    if not t.isdigit():
        raise FormulaError("Неверное число граней")
    n = int(t)
    if n < SIDES_MIN or n > SIDES_MAX:
        raise FormulaError("Неверное число граней")
    return n


def _format_group(g: DieGroup) -> str:
    core = f"{g.count}d{g.sides}"
    if g.keep_highest is not None:
        return f"{core}kh{g.keep_highest}"
    if g.keep_lowest is not None:
        return f"{core}kl{g.keep_lowest}"
    return core


def _format_canonical(terms: list[Term]) -> str:
    out = ""
    for i, t in enumerate(terms):
        if isinstance(t, ModTerm):
            if t.value == 0 and len(terms) > 1:
                continue
            if i == 0:
                out += str(t.value)
            else:
                out += f"+{t.value}" if t.value >= 0 else str(t.value)
            continue
        body = _format_group(t)
        if i == 0:
            out += f"-{body}" if t.sign < 0 else body
        else:
            out += f"-{body}" if t.sign < 0 else f"+{body}"
    return out or "0"


def _count_dice(terms: list[Term]) -> int:
    return sum(t.count for t in terms if isinstance(t, DieGroup))


def _single_d20_eligible(terms: list[Term]) -> bool:
    d20_faces = 0
    for t in terms:
        if not isinstance(t, DieGroup):
            continue
        if t.sides != 20:
            continue
        if t.sign < 0 or t.keep_highest is not None or t.keep_lowest is not None:
            return False
        d20_faces += t.count
    return d20_faces == 1


def parse_formula(input_str: str) -> ParseOk:
    raw = input_str or ""
    if len(raw) > FORMULA_MAX_LEN:
        raise FormulaError("Слишком длинная запись")
    src = re.sub(r"\s+", "", raw)
    if not src:
        raise FormulaError("Пустая запись")

    terms: list[Term] = []
    i = 0
    expect_term = True
    sign = 1
    dice_re = re.compile(r"^(\d*)[dDкК](\d+|%)(?:(kh|kl)(\d+))?", re.IGNORECASE)

    while i < len(src):
        ch = src[i]
        if expect_term and ch in "+-":
            sign = -1 if ch == "-" else 1
            i += 1
            continue
        if not expect_term:
            if ch in "+-":
                sign = -1 if ch == "-" else 1
                expect_term = True
                i += 1
                continue
            raise FormulaError("Не понял запись")

        m = dice_re.match(src[i:])
        if m:
            count_raw = 1 if m.group(1) in (None, "") else int(m.group(1))
            if count_raw < 1:
                raise FormulaError("Неверное число костей")
            sides = _parse_sides(m.group(2))
            keep_highest: int | None = None
            keep_lowest: int | None = None
            if m.group(3) and m.group(4):
                keep = int(m.group(4))
                if keep < 1:
                    raise FormulaError("Не понял запись")
                if keep > count_raw:
                    raise FormulaError("Нельзя оставить больше костей, чем бросаешь")
                kind = m.group(3).lower()
                if kind == "kh":
                    keep_highest = keep
                else:
                    keep_lowest = keep
            terms.append(
                DieGroup(
                    count=count_raw,
                    sides=sides,
                    keep_highest=keep_highest,
                    keep_lowest=keep_lowest,
                    sign=sign,
                )
            )
            i += len(m.group(0))
            expect_term = False
            sign = 1
            continue

        num_m = re.match(r"^(\d+)", src[i:])
        if num_m:
            value = sign * int(num_m.group(1))
            terms.append(ModTerm(value=value))
            i += len(num_m.group(1))
            expect_term = False
            sign = 1
            continue

        raise FormulaError("Не понял запись")

    if expect_term or not terms:
        raise FormulaError("Не понял запись")

    total_dice = _count_dice(terms)
    if total_dice > DICE_MAX_COUNT:
        raise FormulaError("Слишком много костей")
    if total_dice == 0:
        raise FormulaError("Нужна хотя бы одна кость")

    return ParseOk(
        terms=terms,
        canonical=_format_canonical(terms),
        total_dice=total_dice,
        single_d20_eligible=_single_d20_eligible(terms),
    )


def _nat_tag(sides: int, value: int) -> Literal["20", "1"] | None:
    if sides != 20:
        return None
    if value == 20:
        return "20"
    if value == 1:
        return "1"
    return None


def _roll_group(group: DieGroup, rng) -> tuple[list[DieFace], list[DieFace], int]:
    faces: list[DieFace] = []
    for _ in range(group.count):
        value = rng(group.sides)
        faces.append(
            DieFace(
                sides=group.sides,
                value=value,
                dropped=False,
                nat=_nat_tag(group.sides, value),
            )
        )

    keep_mask = [True] * len(faces)
    if group.keep_highest is not None:
        indexed = sorted(
            enumerate(faces),
            key=lambda pair: (-pair[1].value, pair[0]),
        )
        keep = {idx for idx, _ in indexed[: group.keep_highest]}
        keep_mask = [i in keep for i in range(len(faces))]
    elif group.keep_lowest is not None:
        indexed = sorted(
            enumerate(faces),
            key=lambda pair: (pair[1].value, pair[0]),
        )
        keep = {idx for idx, _ in indexed[: group.keep_lowest]}
        keep_mask = [i in keep for i in range(len(faces))]

    kept: list[DieFace] = []
    dropped: list[DieFace] = []
    total = 0
    for idx, face in enumerate(faces):
        if keep_mask[idx]:
            kept.append(face)
            total += face.value
        else:
            dropped.append(
                DieFace(
                    sides=face.sides,
                    value=face.value,
                    dropped=True,
                    nat=face.nat,
                )
            )
    return kept, dropped, total


def _breakdown(dice: list[DieFace], modifier_total: int, total: int) -> str:
    parts: list[str] = []
    for face in dice:
        mark = "↓" if face.dropped else ""
        bit = f"d{face.sides}:{face.value}{mark}"
        if face.label:
            bit = f"{bit} ({face.label})"
        parts.append(bit)
    if modifier_total:
        parts.append(f"{modifier_total:+d}")
    return f"{' '.join(parts)} = {total}" if parts else str(total)


def roll_expression(
    expression: str,
    advantage_mode: AdvantageMode = "none",
    *,
    rng=None,
) -> RollOk:
    parsed = parse_formula(expression)
    roll_rng = rng or fair_die
    mode: AdvantageMode = advantage_mode if advantage_mode in (
        "none",
        "advantage",
        "disadvantage",
    ) else "none"

    if mode != "none" and not parsed.single_d20_eligible:
        raise FormulaError("Нужна одна кость d20")

    dice: list[DieFace] = []
    total = 0
    modifier_total = 0
    d20_done = False

    for term in parsed.terms:
        if isinstance(term, ModTerm):
            modifier_total += term.value
            total += term.value
            continue

        if (
            mode != "none"
            and term.sides == 20
            and term.count == 1
            and not d20_done
            and term.keep_highest is None
            and term.keep_lowest is None
            and term.sign > 0
        ):
            d20_done = True
            a = roll_rng(20)
            b = roll_rng(20)
            keep = max(a, b) if mode == "advantage" else min(a, b)
            drop = min(a, b) if mode == "advantage" else max(a, b)
            dice.append(
                DieFace(sides=20, value=keep, dropped=False, nat=_nat_tag(20, keep))
            )
            dice.append(
                DieFace(sides=20, value=drop, dropped=True, nat=_nat_tag(20, drop))
            )
            total += term.sign * keep
            continue

        kept, dropped, group_sum = _roll_group(term, roll_rng)
        dice.extend(kept)
        dice.extend(dropped)
        total += term.sign * group_sum

    return RollOk(
        expression=parsed.canonical,
        advantage_mode=mode,
        total=total,
        dice=dice,
        modifier_total=modifier_total,
        breakdown=_breakdown(dice, modifier_total, total),
    )


def normalize_advantage(raw: str | None, *, advantage: bool = False) -> AdvantageMode:
    if raw:
        key = str(raw).strip().lower()
        if key in ("advantage", "adv", "преимущество"):
            return "advantage"
        if key in ("disadvantage", "disadv", "помеха"):
            return "disadvantage"
        if key in ("none", "normal", "норм", ""):
            return "none"
    if advantage:
        return "advantage"
    return "none"
