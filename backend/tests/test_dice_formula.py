"""DICE-02b: парсер формулы и честный генератор на сервере."""

from __future__ import annotations

import ast
import math
from collections import Counter
from pathlib import Path

import pytest

from app.services import dice_formula as df


ROOT = Path(__file__).resolve().parents[1]


def test_parse_basic_cases() -> None:
    assert df.parse_formula("2d6+3").canonical == "2d6+3"
    assert df.parse_formula("1d20-1").canonical == "1d20-1"
    assert df.parse_formula("3к8").canonical == "3d8"
    parsed = df.parse_formula("4d6kh3")
    assert parsed.canonical == "4d6kh3"
    assert parsed.total_dice == 4
    parsed_kl = df.parse_formula("2d20kl1")
    assert parsed_kl.canonical == "2d20kl1"
    assert df.parse_formula(" 2 d 6 + 3 ").canonical == "2d6+3"


def test_parse_errors_and_limits() -> None:
    with pytest.raises(df.FormulaError, match="Пустая"):
        df.parse_formula("")
    with pytest.raises(df.FormulaError, match="Не понял"):
        df.parse_formula("foo")
    with pytest.raises(df.FormulaError, match="длинная"):
        df.parse_formula("1d6+" + "1+" * 120)
    with pytest.raises(df.FormulaError, match="много костей"):
        df.parse_formula("101d6")
    with pytest.raises(df.FormulaError, match="граней"):
        df.parse_formula("1d1")
    with pytest.raises(df.FormulaError, match="граней"):
        df.parse_formula("1d1001")
    with pytest.raises(df.FormulaError, match="оставить больше"):
        df.parse_formula("2d6kh3")


def test_roll_kh_kl_and_advantage() -> None:
    seq = iter([6, 1, 3, 5, 2, 4, 20, 1])

    def rng(_sides: int) -> int:
        return next(seq)

    rolled = df.roll_expression("4d6kh3", rng=rng)
    assert len([d for d in rolled.dice if not d.dropped]) == 3
    assert len([d for d in rolled.dice if d.dropped]) == 1
    assert rolled.total == 6 + 3 + 5  # dropped 1

    seq2 = iter([18, 7])
    adv = df.roll_expression("1d20+2", "advantage", rng=lambda _s: next(seq2))
    assert adv.total == 18 + 2
    assert sum(1 for d in adv.dice if d.dropped) == 1


def test_fair_die_range_and_no_bias() -> None:
    for _ in range(200):
        v = df.fair_die(20)
        assert 1 <= v <= 20
    counts = Counter(df.fair_die(6) for _ in range(6000))
    expected = 6000 / 6
    chi2 = sum((counts[i] - expected) ** 2 / expected for i in range(1, 7))
    # df=5, critical ~11.07 at 5%; keep generous for flakes
    assert chi2 < 25, f"chi2={chi2}, counts={dict(counts)}"


def test_module_does_not_use_random_randint() -> None:
    src = (ROOT / "app/services/dice_formula.py").read_text(encoding="utf-8")
    tree = ast.parse(src)
    for node in ast.walk(tree):
        if isinstance(node, ast.Attribute) and node.attr == "randint":
            pytest.fail("random.randint must not appear in dice_formula")
        if isinstance(node, ast.Name) and node.id == "random":
            pytest.fail("random module must not be used in dice_formula")
    assert "secrets.randbelow" in src
    assert math.isfinite(df.fair_die(2))
