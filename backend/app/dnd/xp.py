"""DMG 2014: CR → XP. Используется при посадке бестиария и раздаче XP после боя."""

from __future__ import annotations

CR_TO_XP: dict[str, int] = {
    "0": 10,
    "1/8": 25,
    "1/4": 50,
    "1/2": 100,
    "1": 200,
    "2": 450,
    "3": 700,
    "4": 1100,
    "5": 1800,
    "6": 2300,
    "7": 2900,
    "8": 3900,
    "9": 5000,
    "10": 5900,
    "11": 7200,
    "12": 8400,
    "13": 10000,
    "14": 11500,
    "15": 13000,
    "16": 15000,
    "17": 18000,
    "18": 20000,
    "19": 22000,
    "20": 25000,
    "21": 33000,
    "22": 41000,
    "23": 50000,
    "24": 62000,
    "25": 75000,
    "26": 90000,
    "27": 105000,
    "28": 120000,
    "29": 135000,
    "30": 155000,
}


def normalize_cr(raw: object) -> str | None:
    if raw is None:
        return None
    text = str(raw).strip().lower().replace("сr", "").replace("cr", "").strip()
    if not text:
        return None
    # "0.25" / "0.5" occasionally
    if text in {"0.125", ".125"}:
        return "1/8"
    if text in {"0.25", ".25"}:
        return "1/4"
    if text in {"0.5", ".5"}:
        return "1/2"
    if text in CR_TO_XP:
        return text
    try:
        as_int = int(float(text))
        key = str(as_int)
        if key in CR_TO_XP:
            return key
    except ValueError:
        pass
    return None


def xp_from_cr(raw: object) -> int | None:
    cr = normalize_cr(raw)
    if cr is None:
        return None
    return CR_TO_XP.get(cr)
