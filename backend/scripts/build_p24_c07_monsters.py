#!/usr/bin/env python3
"""P24-C07: build creatures_srd.json (SRD Monsters A–Z, without Animals).

Mechanics: SRD 5.2.1 Monsters A–Z (markdown from CC-BY 4.0 SRD).
RU names: docs/edition-2024/sources/creatures.csv (next.dnd.su / ttg).
Animals section → C08 (marked srd_section=animals in CSV; not seeded here).

Short Russian cards only — no long SRD prose. Does not copy 2014 stats.
"""

from __future__ import annotations

import csv
import json
import re
from collections import Counter
from pathlib import Path
from typing import Any

REPO = Path(__file__).resolve().parents[2]
SOURCES = REPO / "docs" / "edition-2024" / "sources"
LIVE = REPO / "backend" / "data" / "srd" / "2024" / "live"
MD_PATH = Path("/tmp/p24-c07/monsters-A-Z.md")
ANIMALS_CORK = Path("/tmp/p24-c07/animals_cork.html")
CSV_PATH = SOURCES / "creatures.csv"
OUT_JSON = LIVE / "creatures_srd.json"
GAPS = SOURCES / "gaps.md"
COUNTS = SOURCES / "counts.json"
LAYER3 = SOURCES / "P24-C07-layer3-review.md"
TRAIT_2014 = Path("/tmp/p24-c07/trait_names_2014.json")
TRAIT_TEXT_2014 = Path("/tmp/p24-c07/trait_texts_2014_short.json")

CANNED_TEXT_RU: dict[str, str] = {
    "amphibious": "Дышит воздухом и водой.",
    "pack tactics": "Есть преимущество к атаке по цели, если в 5 фт от цели есть дееспособный союзник.",
    "magic resistance": "Преимущество к спасброскам от заклинаний и магических эффектов.",
    "legendary resistance": "При провале спасброска может вместо этого преуспеть (ограниченные использования).",
    "spider climb": "Может лазить по трудным поверхностям, включая потолки, без проверки.",
    "sunlight sensitivity": "На прямом солнечном свете — помеха к атакам и проверкам Внимательности зрением.",
    "siege monster": "Двойной урон объектам и строениям.",
    "immutable form": "Иммунитет к эффектам, меняющим форму.",
    "incorporeal movement": "Может проходить сквозь существ и предметы как через трудную местность; урон силовым внутри объекта.",
    "amorphous": "Может протискиваться в узкие щели без сжимания.",
    "regeneration": "В начале хода восстанавливает хиты, если не получил огонь/кислоту (см. карточку).",
    "ice walk": "Движение по льду без проверки; ледяная трудная местность не замедляет.",
    "web walker": "Игнорирует ограничения движения от паутины.",
    "nimble escape": "Бонусным действием может Занять укрытие или Отойти.",
    "cunning action": "Бонусным действием: Рывок, Отойти или Занять укрытие.",
    "illumination": "Излучает яркий/тусклый свет (см. карточку).",
    "fire aura": "В начале хода окружающие существа получают огненный урон.",
    "multiattack": "Несколько атак за действие «Атака» (см. список).",
    "spellcasting": "Накладывает заклинания; список и Сл — в карточке (ссылки на каталог).",
    "shape-shift": "Меняет облик; характеристики обычно те же, кроме скорости.",
    "invisibility": "Становится невидимым (часто через заклинание).",
    "teleport": "Магически перемещается в видимую точку в пределах дистанции.",
    "misty step": "Бонусным: накладывает «Туманный шаг».",
    "protective magic": "Реакцией: «Контрзаклинание» или «Щит» по триггеру.",
    "parry": "Реакцией добавляет бонус к КД против одной рукопашной атаки.",
    "pounce": "После сближения может сбить цель с ног и добавить атаку.",
    "frightful presence": "Существа в зоне проходят спас или получают испуг.",
    "life drain": "Атака/эффект вытягивает хиты; максимум хитов цели может снизиться.",
    "death burst": "При смерти взрывается с уроном по области.",
    "bloodied frenzy": "Пока окровавлен — усиленные атаки или доп. эффект.",
    "divine aid": "Накладывает ограниченный набор божественных заклинаний.",
    "coven magic": "В шабаше получает дополнительные слоты/заклинания.",
}

SRD_MONSTER_COUNT = 235
SRD_ANIMAL_COUNT = 95

SIZE_EN = {
    "Tiny": "tiny",
    "Small": "small",
    "Medium": "medium",
    "Large": "large",
    "Huge": "huge",
    "Gargantuan": "gargantuan",
}
SIZE_RU = {
    "tiny": "крошечный",
    "small": "маленький",
    "medium": "средний",
    "large": "большой",
    "huge": "огромный",
    "gargantuan": "гигантский",
}
TYPE_EN = {
    "Aberration": "aberration",
    "Beast": "beast",
    "Celestial": "celestial",
    "Construct": "construct",
    "Dragon": "dragon",
    "Elemental": "elemental",
    "Fey": "fey",
    "Fiend": "fiend",
    "Giant": "giant",
    "Humanoid": "humanoid",
    "Monstrosity": "monstrosity",
    "Ooze": "ooze",
    "Plant": "plant",
    "Undead": "undead",
}
TYPE_RU = {
    "aberration": "аберрация",
    "beast": "зверь",
    "celestial": "небожитель",
    "construct": "конструкт",
    "dragon": "дракон",
    "elemental": "элементаль",
    "fey": "фея",
    "fiend": "исчадие",
    "giant": "великан",
    "humanoid": "гуманоид",
    "monstrosity": "чудовище",
    "ooze": "слизь",
    "plant": "растение",
    "undead": "нежить",
}
ALIGN_RU = {
    "lawful good": "законно-добрый",
    "neutral good": "нейтрально-добрый",
    "chaotic good": "хаотично-добрый",
    "lawful neutral": "законно-нейтральный",
    "neutral": "нейтральный",
    "chaotic neutral": "хаотично-нейтральный",
    "lawful evil": "законно-злой",
    "neutral evil": "нейтрально-злой",
    "chaotic evil": "хаотично-злой",
    "unaligned": "без мировоззрения",
    "any alignment": "любое мировоззрение",
    "any": "любое",
}
SKILL_RU = {
    "acrobatics": "Акробатика",
    "animal handling": "Уход за животными",
    "arcana": "Магия",
    "athletics": "Атлетика",
    "deception": "Обман",
    "history": "История",
    "insight": "Проницательность",
    "intimidation": "Запугивание",
    "investigation": "Анализ",
    "medicine": "Медицина",
    "nature": "Природа",
    "perception": "Внимательность",
    "performance": "Выступление",
    "persuasion": "Убеждение",
    "religion": "Религия",
    "sleight of hand": "Ловкость рук",
    "stealth": "Скрытность",
    "survival": "Выживание",
}
DAMAGE_RU = {
    "acid": "кислотный",
    "bludgeoning": "дробящий",
    "cold": "холодный",
    "fire": "огненный",
    "force": "силовой",
    "lightning": "электрический",
    "necrotic": "некротический",
    "piercing": "колющий",
    "poison": "ядовитый",
    "psychic": "психический",
    "radiant": "излучающий",
    "slashing": "рубящий",
    "thunder": "звуковой",
}
CONDITION_RU = {
    "blinded": "ослеплённый",
    "charmed": "очарованный",
    "deafened": "оглохший",
    "exhaustion": "истощение",
    "frightened": "испуганный",
    "grappled": "схваченный",
    "incapacitated": "недееспособный",
    "invisible": "невидимый",
    "paralyzed": "парализованный",
    "petrified": "окаменевший",
    "poisoned": "отравленный",
    "prone": "опрокинутый",
    "restrained": "опутанный",
    "stunned": "ошеломлённый",
    "unconscious": "бессознательный",
}
LANG_RU = {
    "common": "Общий",
    "draconic": "Драконий",
    "dwarvish": "Дварфийский",
    "elvish": "Эльфийский",
    "giant": "Великаний",
    "gnomish": "Гномий",
    "goblin": "Гоблинский",
    "halfling": "Полуросличий",
    "infernal": "Инфернальный",
    "orc": "Орочий",
    "abyssal": "Бездны",
    "celestial": "Небесный",
    "deep speech": "Глубинная речь",
    "primordial": "Первичный",
    "sylvan": "Сильван",
    "undercommon": "Подземный общий",
    "telepathy": "телепатия",
    "understands": "понимает",
    "but can't speak": "но не говорит",
    "can't speak": "не говорит",
    "none": "нет",
}

# Extra 2024 trait/action names not covered well by 2014 map.
NAME_RU_EXTRA: dict[str, str] = {
    "multiattack": "Мультиатака",
    "spellcasting": "Сотворение заклинаний",
    "legendary resistance": "Легендарное сопротивление",
    "magic resistance": "Сопротивление магии",
    "amphibious": "Земноводный",
    "pack tactics": "Тактика стаи",
    "rend": "Раздирание",
    "bite": "Укус",
    "claw": "Коготь",
    "claws": "Когти",
    "slam": "Удар",
    "tail": "Хвост",
    "sting": "Жало",
    "gore": "Бодание",
    "hooves": "Копыта",
    "beak": "Клюв",
    "tentacle": "Щупальце",
    "pseudopod": "Ложноножка",
    "pounce": "Наскок",
    "fire breath": "Огненное дыхание",
    "cold breath": "Холодное дыхание",
    "lightning breath": "Электрическое дыхание",
    "acid breath": "Кислотное дыхание",
    "poison breath": "Ядовитое дыхание",
    "sleep breath": "Дыхание сна",
    "repulsion breath": "Отталкивающее дыхание",
    "slowing breath": "Замедляющее дыхание",
    "weakening breath": "Ослабляющее дыхание",
    "paralyzing breath": "Парализующее дыхание",
    "blinding breath": "Ослепляющее дыхание",
    "shape-shift": "Смена облика",
    "spider climb": "Паучье лазание",
    "sunlight sensitivity": "Чувствительность к солнечному свету",
    "frightful presence": "Ужасающее присутствие",
    "regeneration": "Регенерация",
    "siege monster": "Осадное чудовище",
    "incorporeal movement": "Бестелесное перемещение",
    "immutable form": "Неизменная форма",
    "amorphous": "Аморфный",
    "illumination": "Свечение",
    "teleport": "Телепортация",
    "invisibility": "Невидимость",
    "death burst": "Взрыв смерти",
    "swallow": "Проглатывание",
    "parry": "Парирование",
    "nimble escape": "Проворный побег",
    "cunning action": "Хитрое действие",
    "misty step": "Туманный шаг",
    "protective magic": "Защитная магия",
    "life drain": "Вытягивание жизни",
    "diabolical restoration": "Дьявольское восстановление",
    "demonic restoration": "Демоническое восстановление",
    "exalted restoration": "Возвышенное восстановление",
    "celestial restoration": "Небесное восстановление",
    "eldritch restoration": "Жуткое восстановление",
    "web walker": "Хождение по паутине",
    "ice walk": "Хождение по льду",
    "fire aura": "Огненная аура",
    "guiding light": "Направляющий свет",
    "leap": "Прыжок",
    "constrict": "Сжимание",
    "hurl flame": "Метнуть пламя",
    "petrifying gaze": "Окаменяющий взгляд",
    "cloud of insects": "Облако насекомых",
    "corrosive form": "Едкая форма",
    "split": "Разделение",
    "cloaked flight": "Скрытный полёт",
    "air form": "Воздушная форма",
    "tunneler": "Тоннельщик",
    "commanding presence": "Повелевающее присутствие",
    "fiery rays": "Огненные лучи",
    "consume memories": "Поглощение воспоминаний",
    "dominate mind": "Подчинение разума",
    "probing telepathy": "Зондирующая телепатия",
    "mucus cloud": "Облако слизи",
    "lash": "Хлёст",
    "psychic drain": "Психическое истощение",
    "scratch": "Царапина",
    "bloodied frenzy": "Ярость окровавленного",
    "coven magic": "Магия шабаша",
    "divine aid": "Божественная помощь",
}

WORD_RU = {
    "magic": "магический",
    "resistance": "сопротивление",
    "breath": "дыхание",
    "weapon": "оружие",
    "attack": "атака",
    "gaze": "взгляд",
    "aura": "аура",
    "form": "форма",
    "flight": "полёт",
    "charge": "натиск",
    "touch": "касание",
    "burst": "взрыв",
    "drain": "вытягивание",
    "strike": "удар",
    "blast": "взрыв",
    "ray": "луч",
    "rays": "лучи",
    "flame": "пламя",
    "fire": "огонь",
    "cold": "холод",
    "poison": "яд",
    "acid": "кислота",
    "lightning": "молния",
    "psychic": "психический",
    "necrotic": "некротический",
    "radiant": "излучающий",
    "shadow": "тень",
    "darkness": "тьма",
    "light": "свет",
    "web": "паутина",
    "wing": "крыло",
    "wings": "крылья",
    "horn": "рог",
    "horns": "рога",
    "fist": "кулак",
    "fists": "кулаки",
    "spear": "копье",
    "sword": "меч",
    "greatsword": "двуручный меч",
    "longsword": "длинный меч",
    "shortsword": "короткий меч",
    "scimitar": "скимитар",
    "dagger": "кинжал",
    "daggers": "кинжалы",
    "mace": "булава",
    "club": "дубинка",
    "javelin": "метательное копье",
    "longbow": "длинный лук",
    "shortbow": "короткий лук",
    "crossbow": "арбалет",
    "heavy crossbow": "тяжёлый арбалет",
    "light crossbow": "лёгкий арбалет",
    "pistol": "пистолет",
    "musket": "мушкет",
    "bow": "лук",
    "hammer": "молот",
    "glaive": "глефа",
    "whip": "кнут",
    "rock": "камень",
    "boulder": "валун",
    "teleport": "телепортация",
    "invisibility": "невидимость",
    "restoration": "восстановление",
    "presence": "присутствие",
    "frightful": "ужасающее",
    "paralyzing": "парализующее",
    "blinding": "ослепляющее",
    "sleep": "сон",
    "weakening": "ослабляющее",
    "slowing": "замедляющее",
    "repulsion": "отталкивание",
    "infernal": "инфернальный",
    "demonic": "демонический",
    "diabolical": "дьявольский",
    "celestial": "небесный",
    "exalted": "возвышенный",
    "eldritch": "жуткий",
    "abyssal": "бездны",
    "hellish": "адский",
    "undead": "нежити",
    "life": "жизнь",
    "death": "смерть",
    "soul": "душа",
    "mind": "разум",
    "memories": "воспоминания",
    "command": "приказ",
    "charm": "очарование",
    "fear": "страх",
    "howl": "вой",
    "roar": "рёв",
    "screech": "визг",
    "spit": "плевок",
    "spittle": "слюна",
    "ink": "чернила",
    "cloud": "облако",
    "swarm": "рой",
    "insects": "насекомые",
    "walk": "хождение",
    "climb": "лазание",
    "swim": "плавание",
    "burrow": "копание",
    "escape": "побег",
    "nimble": "проворный",
    "cunning": "хитрый",
    "action": "действие",
    "aid": "помощь",
    "divine": "божественный",
    "protective": "защитный",
    "coven": "шабаш",
    "shape": "облик",
    "shift": "смена",
    "change": "смена",
    "shapechanger": "перевёртыш",
    "illumination": "свечение",
    "regen": "регенерация",
    "regeneration": "регенерация",
    "siege": "осадный",
    "monster": "чудовище",
    "amorphous": "аморфный",
    "immutable": "неизменный",
    "incorporeal": "бестелесный",
    "movement": "перемещение",
    "tunneler": "тоннельщик",
    "attach": "прикрепление",
    "adhesive": "липкость",
    "absorb": "поглощение",
    "split": "разделение",
    "corrosive": "едкий",
    "barbed": "колючий",
    "hide": "шкура",
    "beard": "борода",
    "antennae": "усики",
    "proboscis": "хоботок",
    "engulf": "поглощение",
    "restrict": "опутывание",
    "reel": "подтягивание",
    "recharge": "перезарядка",
}

MINUS = "−"
MINUS_CHARS = "−–—"


def slugify(name: str) -> str:
    n = name.lower().replace("'", "").replace("'", "").replace("'", "")
    n = n.replace("'", "")
    n = re.sub(r"[’ʻ`]", "", n)
    n = re.sub(r"[^a-z0-9]+", "-", n).strip("-")
    return n


def parse_signed(raw: str) -> int:
    t = raw.strip().replace("+", "").replace(MINUS, "-")
    for ch in MINUS_CHARS:
        t = t.replace(ch, "-")
    return int(t)


# Markdown/PDF glitches for a few SRD blocks (verified against SRD 5.2.1 PDF).
ABILITY_OVERRIDES: dict[str, tuple[dict[str, int], dict[str, int], dict[str, int]]] = {
    "will-o-wisp": (
        {"str": 1, "dex": 28, "con": 10, "int": 13, "wis": 14, "cha": 11},
        {"str": -5, "dex": 9, "con": 0, "int": 1, "wis": 2, "cha": 0},
        {"str": -5, "dex": 9, "con": 0, "int": 1, "wis": 2, "cha": 0},
    ),
}


def clean_md(text: str) -> str:
    text = text.replace("<br>", "\n").replace("<br/>", "\n").replace("<br />", "\n")
    text = text.replace("&emsp;", " ")
    text = text.replace("&nbsp;", " ")
    text = re.sub(r"</?table>|</?thead>|</?tbody>|</?tr>|</?th>|</?td>", " ", text)
    text = re.sub(r"</?hr/?>", "\n", text)
    text = re.sub(r"</?strong>|</?em>|</?i>|</?b>", "", text)
    text = re.sub(r"_([^_]+)_", r"\1", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def load_spell_slugs() -> set[str]:
    payload = json.loads((LIVE / "spells_srd.json").read_text(encoding="utf-8"))
    return {e["slug"] for e in payload["entries"]}


def load_gear_maps() -> tuple[dict[str, str], dict[str, str]]:
    """EN lower name / slug → catalog slug for C03 weapons/armor/equipment."""
    by_en: dict[str, str] = {}
    by_slug: dict[str, str] = {}
    for fname in ("weapons_srd.json", "armor_srd.json", "equipment_srd.json"):
        payload = json.loads((LIVE / fname).read_text(encoding="utf-8"))
        for e in payload["entries"]:
            slug = e["slug"]
            by_slug[slug] = slug
            en = (e.get("name_en") or "").strip().lower()
            if en:
                by_en[en] = slug
                by_en[en.replace(" armor", "")] = slug
    # Aliases from SRD Gear lines
    aliases = {
        "studded leather armor": "studded-leather-armor",
        "leather armor": "leather-armor",
        "hide armor": "hide-armor",
        "chain shirt": "chain-shirt",
        "scale mail": "scale-mail",
        "breastplate": "breastplate",
        "half plate armor": "half-plate-armor",
        "half plate": "half-plate-armor",
        "ring mail": "ring-mail",
        "chain mail": "chain-mail",
        "splint armor": "splint-armor",
        "plate armor": "plate-armor",
        "shield": "shield",
        "light crossbow": "light-crossbow",
        "heavy crossbow": "heavy-crossbow",
        "hand crossbow": "hand-crossbow",
        "shortsword": "shortsword",
        "longsword": "longsword",
        "greatsword": "greatsword",
        "scimitar": "scimitar",
        "dagger": "dagger",
        "daggers": "dagger",
        "club": "club",
        "mace": "mace",
        "spear": "spear",
        "javelin": "javelin",
        "longbow": "longbow",
        "shortbow": "shortbow",
        "battleaxe": "battleaxe",
        "handaxe": "handaxe",
        "greataxe": "greataxe",
        "warhammer": "warhammer",
        "maul": "maul",
        "pike": "pike",
        "glaive": "glaive",
        "halberd": "halberd",
        "whip": "whip",
        "trident": "trident",
        "morningstar": "morningstar",
        "flail": "flail",
        "rapier": "rapier",
        "pistol": "pistol",
        "musket": "musket",
        "wand": "wand",  # may miss in C03 — leave unresolved if absent
        "holy symbol": "holy-symbol",
        "component pouch": "component-pouch",
        "arrows": "arrows",
        "crossbow bolts": "crossbow-bolts",
    }
    for k, v in aliases.items():
        if v in by_slug or v in {x for x in by_slug}:
            by_en[k] = v
        elif v in by_en.values():
            by_en[k] = v
        else:
            # keep if slug exists in any map values
            if v in by_slug:
                by_en[k] = v
    # Only keep aliases that resolve to known slugs
    known = set(by_slug)
    for fname in ("weapons_srd.json", "armor_srd.json", "equipment_srd.json"):
        payload = json.loads((LIVE / fname).read_text(encoding="utf-8"))
        known.update(e["slug"] for e in payload["entries"])
    by_en = {k: v for k, v in {**by_en, **aliases}.items() if v in known}
    return by_en, {s: s for s in known}


def translate_name(en: str, maps: dict[str, str]) -> tuple[str, bool]:
    base = re.sub(r"\s*\([^)]*\)\s*$", "", en).strip()
    usage = ""
    m = re.search(r"(\([^)]*\))\s*$", en.strip())
    if m:
        usage = m.group(1)
    key = base.lower()
    if key in NAME_RU_EXTRA:
        ru = NAME_RU_EXTRA[key]
    elif key in maps:
        ru = maps[key]
    else:
        # word-wise
        parts = re.split(r"([\s\-]+)", base)
        out: list[str] = []
        pending = False
        for part in parts:
            if re.fullmatch(r"[\s\-]+", part or ""):
                out.append(part)
                continue
            lk = part.lower()
            if lk in WORD_RU:
                out.append(WORD_RU[lk])
            elif lk in NAME_RU_EXTRA:
                out.append(NAME_RU_EXTRA[lk])
            elif lk in maps:
                out.append(maps[lk])
            else:
                pending = True
                out.append(part)
        ru = "".join(out)
        if pending or re.search(r"[A-Za-z]", ru):
            # fallback short label
            ru = "Способность"
            return (f"{ru}{(' ' + usage) if usage else ''}".strip(), True)
    # translate usage note lightly
    if usage:
        u = usage
        u = re.sub(r"\bDay\b", "день", u, flags=re.I)
        u = re.sub(r"\bLair\b", "логове", u, flags=re.I)
        u = re.sub(r"\bor\b", "или", u, flags=re.I)
        u = re.sub(r"\bin\b", "в", u, flags=re.I)
        u = re.sub(r"Recharge\s*([\d\-–−]+)", r"перезарядка \1", u, flags=re.I)
        u = u.replace("/Day", "/день").replace("/day", "/день")
        # e.g. "(3/день, или 4/день в логове)"
        ru = f"{ru} {u}"
    return ru, False


def _strip_latin(text: str) -> str:
    """Remove leftover Latin words; keep dice like 2d6 converted to 2к6."""
    t = re.sub(r"(?:\d+)?d\d+", lambda m: m.group(0).replace("d", "к"), text, flags=re.I)
    t = re.sub(r"[A-Za-z]+", " ", t)
    t = re.sub(r"\s+", " ", t)
    t = re.sub(r"\s+([,.;:!?])", r"\1", t)
    return t.strip(" ,;:.-*")


def paraphrase_text(
    en: str, name_en: str = "", text_map: dict[str, str] | None = None
) -> str:
    base = re.sub(r"\s*\([^)]*\)\s*$", "", name_en).strip().lower()
    if base in CANNED_TEXT_RU:
        return CANNED_TEXT_RU[base]
    if text_map and base in text_map:
        return text_map[base]

    t = clean_md(en)

    m = re.search(
        r"(Melee|Ranged)\s+Attack\s+Roll:\s*([+\-−]?\d+),\s*"
        r"(?:reach|range)\s*([^.\n]+)\.\s*Hit:\s*(.+)",
        t,
        re.I,
    )
    if m:
        kind = "Рукопашная" if m.group(1).lower().startswith("melee") else "Дальнобойная"
        bonus = m.group(2).replace("−", "-")
        reach = m.group(3).strip().replace("ft.", "фт").replace("ft", "фт")
        reach = _strip_latin(reach) or "5 фт"
        hit = summarize_hit(m.group(4))
        reach_l = "досягаемость" if kind == "Рукопашная" else "дистанция"
        return f"{kind} атака {bonus}, {reach_l} {reach}. Попадание: {hit}"

    m = re.search(
        r"(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)"
        r"\s+Saving\s+Throw:\s*DC\s*(\d+),\s*(.+)",
        t,
        re.I,
    )
    if m:
        ab = {
            "strength": "Сила",
            "dexterity": "Ловкость",
            "constitution": "Телосложение",
            "intelligence": "Интеллект",
            "wisdom": "Мудрость",
            "charisma": "Харизма",
        }[m.group(1).lower()]
        return f"Спасбросок {ab} Сл {m.group(2)}. {summarize_save_effect(m.group(3))}"

    if "spellcasting" in base or (
        t.lower().startswith("the ") and "casts one of the following" in t.lower()
    ):
        dc = re.search(r"spell save DC\s*(\d+)", t, re.I)
        atk = re.search(r"([+\-−]?\d+)\s+to hit with spell", t, re.I)
        bits = ["Накладывает заклинания из списка."]
        if dc:
            bits.append(f"Сл {dc.group(1)}.")
        if atk:
            bits.append(f"Атака заклинанием {atk.group(1).replace(chr(8722), '-')}.")
        return " ".join(bits)

    if "multiattack" in base:
        return "Несколько атак за одно действие (см. список действий)."

    return summarize_generic(t)


def summarize_hit(hit: str) -> str:
    t = hit
    for en, ru in sorted(DAMAGE_RU.items(), key=lambda x: -len(x[0])):
        t = re.sub(rf"\b{en}\b", ru, t, flags=re.I)
    t = re.sub(r"\bdamage\b", "урон", t, flags=re.I)
    t = re.sub(r"\bplus\b", "плюс", t, flags=re.I)
    t = re.sub(r"\band\b", "и", t, flags=re.I)
    if re.search(r"Grappled", t, re.I):
        esc = re.search(r"escape DC\s*(\d+)", t, re.I)
        extra = f" (захват, Сл побега {esc.group(1)})" if esc else " (захват)"
        primary = re.split(r"\bIf\b", t, 1)[0]
        primary = _strip_latin(primary)
        return (primary + extra).strip()
    t = _strip_latin(t)
    return t or "урон по справочнику"


def summarize_save_effect(rest: str) -> str:
    t = rest
    for en, ru in sorted(DAMAGE_RU.items(), key=lambda x: -len(x[0])):
        t = re.sub(rf"\b{en}\b", ru, t, flags=re.I)
    for en, ru in sorted(CONDITION_RU.items(), key=lambda x: -len(x[0])):
        t = re.sub(rf"\b{en}\b", ru, t, flags=re.I)
    t = re.sub(r"\bFailure:\b", "Провал:", t, flags=re.I)
    t = re.sub(r"\bSuccess:\b", "Успех:", t, flags=re.I)
    t = re.sub(r"\bFailure or Success:\b", "В любом случае:", t, flags=re.I)
    t = re.sub(r"\bHalf damage\b", "половина урона", t, flags=re.I)
    t = re.sub(r"\bdamage\b", "урон", t, flags=re.I)
    t = re.sub(r"\bft\.?\b", "фт", t, flags=re.I)
    t = _strip_latin(t)
    if len(t) > 280:
        t = t[:277].rstrip() + "…"
    return t or "эффект по справочнику"


def summarize_generic(text: str) -> str:
    """Short mechanical RU without English leftovers."""
    t = text
    dc = re.search(r"DC\s*(\d+)", t, re.I)
    dmg = re.findall(
        r"(\d+\s*\(\d+d\d+(?:\s*[+\-−]\s*\d+)?\)\s+[A-Za-z]+)", t
    )
    recharge = re.search(r"Recharge\s*([\d\-–−]+)", t, re.I)
    bits: list[str] = []
    if recharge:
        bits.append(f"Перезарядка {recharge.group(1)}.")
    if dc:
        bits.append(f"Сл {dc.group(1)}.")
    for chunk in dmg[:3]:
        chunk2 = chunk
        for en, ru in DAMAGE_RU.items():
            chunk2 = re.sub(rf"\b{en}\b", ru, chunk2, flags=re.I)
        chunk2 = _strip_latin(chunk2.replace("damage", "урон"))
        if chunk2:
            bits.append(chunk2 + ".")
    for en, ru in CONDITION_RU.items():
        if re.search(rf"\b{en}\b", t, re.I):
            bits.append(f"состояние: {ru}.")
            break
    if re.search(r"\bAdvantage\b", t, re.I):
        bits.append("даёт преимущество.")
    if re.search(r"\bDisadvantage\b", t, re.I):
        bits.append("даёт помеху.")
    if re.search(r"breathe air and water", t, re.I):
        bits.append("дышит воздухом и водой.")
    if re.search(r"fails a saving throw, it can choose to succeed", t, re.I):
        return "При провале спасброска может вместо этого преуспеть."
    out = " ".join(bits).strip()
    if not out:
        out = "Краткая механика по справочнику 5.2.1."
    if len(out) > 280:
        out = out[:277].rstrip() + "…"
    return out


def translate_mechanics(text: str) -> str:
    """Fallback for short notes (ac notes, speed notes)."""
    return summarize_generic(text)


def parse_speed(raw: str) -> dict[str, Any]:
    out: dict[str, Any] = {}
    notes: list[str] = []
    # "10 ft., Swim 40 ft." / "Fly 90 ft. (hover)"
    for part in re.split(r",\s*", raw):
        part = part.strip()
        if not part:
            continue
        m = re.match(
            r"(?:(Walk|Swim|Fly|Climb|Burrow)\s+)?(\d+)\s*ft\.?(?:\s*\(([^)]+)\))?",
            part,
            re.I,
        )
        if not m:
            # bare number first = walk
            m2 = re.match(r"(\d+)\s*ft\.?(?:\s*\(([^)]+)\))?", part, re.I)
            if m2:
                out["walk"] = int(m2.group(1))
                if m2.group(2):
                    notes.append(m2.group(2))
            continue
        kind = (m.group(1) or "Walk").lower()
        val = int(m.group(2))
        note = m.group(3)
        key = {
            "walk": "walk",
            "swim": "swim",
            "fly": "fly",
            "climb": "climb",
            "burrow": "burrow",
        }[kind]
        out[key] = val
        if note:
            notes.append(note)
            if "hover" in note.lower():
                out["notes"] = "парит" if "notes" not in out else out["notes"]
    if notes and "notes" not in out:
        # translate hover already handled; keep short RU
        ru_notes = []
        for n in notes:
            if "hover" in n.lower():
                ru_notes.append("парит")
            else:
                ru_notes.append(translate_mechanics(n))
        if ru_notes:
            out["notes"] = "; ".join(dict.fromkeys(ru_notes))
    if "walk" not in out and not any(k in out for k in ("fly", "swim", "climb", "burrow")):
        out["walk"] = 0
    return out


def parse_abilities_table(
    block: str, slug: str | None = None
) -> tuple[dict[str, int], dict[str, int], dict[str, int]]:
    if slug and slug in ABILITY_OVERRIDES:
        return ABILITY_OVERRIDES[slug]
    scores: dict[str, int] = {}
    mods: dict[str, int] = {}
    saves: dict[str, int] = {}
    # After tag strip, looks like: STR 21 +5 +5 DEX 9 −1 +3 ...
    flat = clean_md(block)
    for ab in ("STR", "DEX", "CON", "INT", "WIS", "CHA"):
        m = re.search(
            rf"{ab}\s+(\d+)\s+([+\-−]?\d+)\s+([+\-−]?\d+)",
            flat,
        )
        if not m:
            raise ValueError(f"missing ability {ab}")
        key = ab.lower()
        scores[key] = int(m.group(1))
        mods[key] = parse_signed(m.group(2))
        save_raw = m.group(3)
        # PDF sometimes drops the sign on a save that equals |mod| (e.g. Int 6 −2 2).
        if save_raw.isdigit() and mods[key] < 0 and int(save_raw) == abs(mods[key]):
            saves[key] = mods[key]
        else:
            saves[key] = parse_signed(save_raw)
    return scores, mods, saves


def parse_skills(raw: str) -> dict[str, int]:
    out: dict[str, int] = {}
    for part in raw.split(","):
        part = part.strip()
        if not part:
            continue
        m = re.match(r"(.+?)\s+([+\-−]\d+)\s*$", part)
        if not m:
            continue
        name = m.group(1).strip().lower()
        ru = SKILL_RU.get(name, name)
        out[ru] = parse_signed(m.group(2))
    return out


def parse_senses(raw: str) -> dict[str, int]:
    out: dict[str, int] = {}
    m = re.search(r"Passive Perception\s+(\d+)", raw, re.I)
    if m:
        out["passive_perception"] = int(m.group(1))
    for key, en in (
        ("darkvision", "Darkvision"),
        ("blindsight", "Blindsight"),
        ("tremorsense", "Tremorsense"),
        ("truesight", "Truesight"),
    ):
        m = re.search(rf"{en}\s+(\d+)\s*ft\.?", raw, re.I)
        if m:
            out[key] = int(m.group(1))
    return out


def parse_languages(raw: str) -> list[str]:
    parts = re.split(r";|,", raw)
    out: list[str] = []
    for part in parts:
        p = part.strip()
        if not p:
            continue
        low = p.lower()
        if low.startswith("telepathy"):
            m = re.search(r"telepathy\s+(\d+)\s*ft\.?", p, re.I)
            if m:
                out.append(f"телепатия {m.group(1)} фт")
            else:
                out.append("телепатия")
            continue
        # understands X but can't speak
        m = re.match(r"understands?\s+(.+?)\s+but can't speak", p, re.I)
        if m:
            lang = translate_lang_token(m.group(1))
            out.append(f"понимает {lang}, но не говорит")
            continue
        out.append(translate_lang_token(p))
    return out


def translate_lang_token(token: str) -> str:
    t = token.strip()
    low = t.lower()
    if low in LANG_RU:
        return LANG_RU[low]
    # multi-word known
    for en, ru in sorted(LANG_RU.items(), key=lambda x: -len(x[0])):
        if en in low:
            low = low.replace(en, ru)
    if re.search(r"[A-Za-z]", low):
        # last resort: keep as unknown → proposed
        return "особый язык"
    return low


def parse_damage_list(raw: str) -> list[str]:
    # "Fire, Poison; Bludgeoning..." — split on comma/semicolon
    items = re.split(r"[,;]", raw)
    out: list[str] = []
    for item in items:
        it = item.strip()
        if not it:
            continue
        low = it.lower()
        # "Bludgeoning, Piercing, and Slashing from nonmagical attacks"
        if "nonmagical" in low or "from" in low:
            kinds = []
            for en, ru in DAMAGE_RU.items():
                if en in low:
                    kinds.append(ru)
            note = "от немагических атак" if "nonmagical" in low else ""
            if kinds:
                out.append((", ".join(kinds) + (" " + note if note else "")).strip())
            else:
                out.append(translate_mechanics(it))
            continue
        if low in CONDITION_RU:
            out.append(CONDITION_RU[low])
            continue
        if low in DAMAGE_RU:
            out.append(DAMAGE_RU[low])
            continue
        # multi damage words
        found = False
        for en, ru in DAMAGE_RU.items():
            if en == low:
                out.append(ru)
                found = True
                break
        if not found:
            out.append(translate_mechanics(it))
    return out


def parse_cr_line(raw: str) -> dict[str, Any]:
    # Accept "CR 10 (...)" or field-stripped "10 (XP ...; PB +4)"
    # Also "6 (2,300 XP; PB +3)" and "0 (XP 0 or 10; PB +2)".
    text = raw.strip()
    if not text.lower().startswith("cr"):
        text = f"CR {text}"
    # Forms:
    #   CR 10 (XP 5,900, or 7,200 in lair; PB +4)
    #   CR 6 (2,300 XP; PB +3)
    #   CR 0 (XP 0 or 10; PB +2)
    #   CR 5 (XP 1,800; PB +3)
    m = re.search(
        r"CR\s+([0-9]+(?:\/[0-9]+)?)\s*\(\s*"
        r"(?:XP\s+)?([\d,]+)(?:\s+XP)?"
        r"(?:\s*,\s*or\s*([\d,]+)(?:\s+XP)?\s+in\s+lair)?"
        r"(?:\s+or\s+([\d,]+))?"
        r"\s*;\s*PB\s*([+\-−]?\d+)\s*\)",
        text,
        re.I,
    )
    if not m:
        raise ValueError(f"bad CR line: {raw}")
    cr = m.group(1)
    xp = int(m.group(2).replace(",", ""))
    xp_lair = int(m.group(3).replace(",", "")) if m.group(3) else None
    if m.group(4) and xp == 0:
        xp = int(m.group(4).replace(",", ""))
    pb = parse_signed(m.group(5))
    return {"cr": cr, "xp": xp, "xp_lair": xp_lair, "pb": pb}


def extract_spell_refs(text: str, spell_slugs: set[str]) -> list[str]:
    refs: list[str] = []
    # _Spell Name_ or plain Title Case spell-like tokens after casts
    candidates = re.findall(r"_([A-Za-z][A-Za-z'’\- ]{2,40})_", text)
    candidates += re.findall(
        r"casts?\s+([A-Z][A-Za-z'’\-]+(?:\s+[A-Z][A-Za-z'’\-]+){0,4})", text
    )
    for c in candidates:
        c = c.strip()
        if c.lower() in {"the", "one", "following", "spell", "spells"}:
            continue
        # strip level notes
        c = re.sub(r"\s*\(.*?\)\s*$", "", c).strip()
        slug = slugify(c)
        if slug in spell_slugs and slug not in refs:
            refs.append(slug)
    return refs


def extract_gear_refs(raw: str, gear_by_en: dict[str, str]) -> list[str]:
    refs: list[str] = []
    # "Light Crossbow, Shortsword, Studded Leather Armor"
    # "Daggers (3)"
    parts = re.split(r",", raw)
    for part in parts:
        p = part.strip()
        if not p:
            continue
        p = re.sub(r"\s*\(\d+\)\s*$", "", p).strip()
        low = p.lower()
        if low in gear_by_en:
            slug = gear_by_en[low]
            if slug not in refs:
                refs.append(slug)
            continue
        # try without trailing plurals
        if low.endswith("s") and low[:-1] in gear_by_en:
            slug = gear_by_en[low[:-1]]
            if slug not in refs:
                refs.append(slug)
    return refs


def split_feature_blocks(section_body: str) -> list[tuple[str, str]]:
    """Return list of (name, body) from **_Name._** Body..."""
    body = section_body.strip()
    if not body:
        return []
    parts = re.split(r"\*\*_([^*]+)\._\*\s*", body)
    # parts[0] preamble, then name, body, name, body...
    out: list[tuple[str, str]] = []
    preamble = parts[0].strip()
    if preamble and not preamble.startswith("<"):
        # legendary uses line etc.
        pass
    i = 1
    while i + 1 < len(parts):
        name = parts[i].strip()
        text = parts[i + 1]
        # stop at next section header leftovers
        text = re.split(r"\n#### |\n## ", text)[0].strip()
        out.append((name, clean_md(text)))
        i += 2
    return out


def parse_monster_block(
    name_en: str,
    block: str,
    csv_row: dict[str, str],
    trait_map: dict[str, str],
    spell_slugs: set[str],
    gear_by_en: dict[str, str],
    sort_order: int,
    text_map: dict[str, str] | None = None,
) -> dict[str, Any]:
    # Size type line: _Large Aberration, Lawful Evil_
    # Also: _Medium Swarm of Tiny Undead, Neutral Evil_
    m = re.search(
        r"_((?:Tiny|Small|Medium|Large|Huge|Gargantuan)"
        r"(?:\s+or\s+(?:Tiny|Small|Medium|Large|Huge|Gargantuan))?)\s+"
        r"(.+?),\s*([^_]+)_",
        block,
    )
    if not m:
        raise ValueError(f"{name_en}: missing size/type line")
    size_raw = m.group(1)
    size_key = SIZE_EN[size_raw.split()[0]]  # first size if "Small or Medium"
    type_blob = m.group(2).strip()
    align_en = m.group(3).strip()
    subtype = None
    swarm_m = re.match(
        r"Swarm of Tiny\s+([A-Za-z]+)(?:\s*\(([^)]+)\))?", type_blob, re.I
    )
    if swarm_m:
        type_en = swarm_m.group(1)
        subtype = "swarm"
        if swarm_m.group(2):
            subtype = f"swarm, {swarm_m.group(2)}"
    else:
        tm = re.match(r"([A-Za-z]+)(?:\s*\(([^)]+)\))?", type_blob)
        if not tm:
            raise ValueError(f"{name_en}: bad type {type_blob}")
        type_en = tm.group(1)
        subtype = tm.group(2)
    type_key = TYPE_EN.get(type_en, type_en.lower())
    type_ru = csv_row.get("creature_type") or TYPE_RU.get(type_key, type_key)
    if subtype and "swarm" in str(subtype):
        type_ru = f"рой ({TYPE_RU.get(type_key, type_key)})"
    align_ru = ALIGN_RU.get(align_en.lower(), translate_mechanics(align_en))

    def field(label: str) -> str | None:
        mm = re.search(rf"\*\*{label}\*\*\s+(.+?)(?:\s*<br>|\n)", block)
        return clean_md(mm.group(1)) if mm else None

    # AC / Initiative may share a line; some MD blocks omit Initiative (PDF has it).
    ac_line = re.search(
        r"\*\*AC\*\*\s+(\d+)(?:\s*\(([^)]+)\))?(?:\s*\*\*Initiative\*\*\s+([+\-−]?\d+)\s*\((\d+)\))?",
        block,
    )
    if not ac_line:
        raise ValueError(f"{name_en}: missing AC")
    ac = int(ac_line.group(1))
    ac_notes = ac_line.group(2)
    init_mod: int | None = parse_signed(ac_line.group(3)) if ac_line.group(3) else None
    init_score: int | None = int(ac_line.group(4)) if ac_line.group(4) else None

    hp_line = field("HP")
    if not hp_line:
        raise ValueError(f"{name_en}: missing HP")
    hm = re.match(r"(\d+)\s*\(([^)]+)\)", hp_line)
    if not hm:
        raise ValueError(f"{name_en}: bad HP {hp_line}")
    hp_avg = int(hm.group(1))
    hp_formula = hm.group(2).replace(" ", "")

    speed_raw = field("Speed") or "0 ft."
    speed = parse_speed(speed_raw)

    slug = csv_row["id"]
    scores, mods, saves = parse_abilities_table(block, slug=slug)
    if init_mod is None:
        init_mod = mods["dex"]
        init_score = 10 + init_mod

    skills_raw = field("Skills")
    skills = parse_skills(skills_raw) if skills_raw else {}

    vul_raw = field("Vulnerabilities") or field("Vulnerability")
    res_raw = field("Resistances") or field("Resistance")
    imm_raw = field("Immunities") or field("Immunity")
    # Immunities may mix damage + conditions: "Poison; Exhaustion, Frightened"
    vul = parse_damage_list(vul_raw) if vul_raw else []
    res = parse_damage_list(res_raw) if res_raw else []
    dmg_imm: list[str] = []
    cond_imm: list[str] = []
    if imm_raw:
        # split damage vs conditions heuristically
        chunks = re.split(r";", imm_raw)
        if len(chunks) == 1:
            # maybe "Poison, Exhaustion" mixed
            for item in re.split(r",", imm_raw):
                it = item.strip().lower()
                if it in CONDITION_RU:
                    cond_imm.append(CONDITION_RU[it])
                elif it in DAMAGE_RU or "nonmagical" in it or "attacks" in it:
                    dmg_imm.extend(parse_damage_list(item))
                else:
                    # try condition plural / phrase
                    if it in DAMAGE_RU:
                        dmg_imm.append(DAMAGE_RU[it])
                    elif any(c in it for c in CONDITION_RU):
                        cond_imm.append(CONDITION_RU.get(it, translate_mechanics(item)))
                    else:
                        # default damage-ish
                        parsed = parse_damage_list(item)
                        dmg_imm.extend(parsed)
        else:
            dmg_imm = parse_damage_list(chunks[0])
            for item in re.split(r",", chunks[1]):
                it = item.strip().lower()
                if it in CONDITION_RU:
                    cond_imm.append(CONDITION_RU[it])
                elif it:
                    cond_imm.append(translate_mechanics(item))

    senses = parse_senses(field("Senses") or "Passive Perception 10")
    languages = parse_languages(field("Languages") or "None")
    cr_info = parse_cr_line(field("CR") or "")

    gear_raw = field("Gear")
    gear_refs = extract_gear_refs(gear_raw, gear_by_en) if gear_raw else []

    # Sections
    def section(title: str) -> str:
        mm = re.search(
            rf"#### {title}\s*(?:<hr>)?\s*(.+?)(?=\n#### |\n## |\Z)",
            block,
            re.S | re.I,
        )
        return mm.group(1) if mm else ""

    legendary_preamble = ""
    leg_sec = section("Legendary Actions")
    if leg_sec:
        pre = re.split(r"\*\*_", leg_sec, 1)[0]
        legendary_preamble = clean_md(pre)

    def to_blocks(sec_title: str) -> list[dict[str, Any]]:
        items = []
        for en_name, en_body in split_feature_blocks(section(sec_title)):
            ru_name, pending = translate_name(en_name, trait_map)
            if re.search(r"[A-Za-z]", ru_name):
                # leftover Latin in usage note — force RU cleanup
                ru_name = re.sub(r"\bor\b", "или", ru_name, flags=re.I)
                ru_name = re.sub(r"\bin\b", "в", ru_name, flags=re.I)
                ru_name = re.sub(r"\bDay\b", "день", ru_name, flags=re.I)
                ru_name = re.sub(r"\bLair\b", "логове", ru_name, flags=re.I)
                if re.search(r"[A-Za-z]", ru_name):
                    ru_name = _strip_latin(ru_name) or "Способность"
                    pending = True
            if pending and not str(ru_name).startswith("Предложено"):
                ru_name = f"Предложено: {ru_name}"
            # Never reuse 2014 trait bodies — only 2024 SRD paraphrase.
            text_ru = paraphrase_text(en_body, name_en=en_name, text_map=None)
            items.append(
                {
                    "name_ru": ru_name,
                    "name_en": en_name,
                    "text_ru": text_ru,
                    "name_ru_pending": pending,
                }
            )
        return items


    traits = to_blocks("Traits")
    actions = to_blocks("Actions")
    bonus_actions = to_blocks("Bonus Actions")
    reactions = to_blocks("Reactions")
    legendary_actions = to_blocks("Legendary Actions")

    all_text = block
    spell_refs = extract_spell_refs(all_text, spell_slugs)

    legendary_uses = None
    legendary_lair_uses = None
    if legendary_preamble:
        mm = re.search(
            r"Legendary Action Uses:\s*(\d+)(?:\s*\((\d+)\s*in Lair\))?",
            legendary_preamble,
            re.I,
        )
        if mm:
            legendary_uses = int(mm.group(1))
            if mm.group(2):
                legendary_lair_uses = int(mm.group(2))

    name_ru = (csv_row.get("name_ru") or "").strip()
    name_ru_pending = False
    if not name_ru or re.fullmatch(r"[A-Za-z0-9 '\-]+", name_ru or ""):
        name_ru = f"Предложено: {name_en}"
        name_ru_pending = True

    summary_bits = [
        f"{SIZE_RU[size_key]} {type_ru}, ПО {cr_info['cr']}",
        f"КД {ac}, хиты {hp_avg} ({hp_formula.replace(chr(100), chr(1082))})",
        f"инициатива {init_mod:+d} (ср. {init_score}), БМ +{cr_info['pb']}",
    ]
    if gear_refs:
        summary_bits.append("есть снаряжение")
    if spell_refs:
        summary_bits.append("есть заклинания")

    data: dict[str, Any] = {
        "schema_version": 1,
        "size": size_key,
        "size_ru": SIZE_RU[size_key],
        "type": type_key,
        "type_ru": type_ru,
        "subtype": subtype,
        "alignment": align_ru,
        "ac": ac,
        "hp_average": hp_avg,
        "hp_formula": hp_formula.replace("d", "к"),
        "speed": speed,
        "cr": str(cr_info["cr"]),
        "xp": cr_info["xp"],
        "proficiency_bonus": cr_info["pb"],
        "initiative": {"mod": init_mod, "score": init_score},
        "abilities": scores,
        "ability_mods": mods,
        "ability_saves": saves,
        "skills": skills or None,
        "senses": senses,
        "languages": languages,
        "source_book": "SRD 5.2.1",
        "srd_section": "monsters",
        "summary_ru": "; ".join(summary_bits) + ".",
        "name_ru_pending": name_ru_pending,
        "gear_refs": gear_refs,
        "spell_refs": spell_refs,
    }
    if ac_notes:
        data["ac_notes"] = translate_mechanics(ac_notes)
    if cr_info.get("xp_lair") is not None:
        data["xp_lair"] = cr_info["xp_lair"]
    if vul:
        data["damage_vulnerabilities"] = vul
    if res:
        data["damage_resistances"] = res
    if dmg_imm:
        data["damage_immunities"] = dmg_imm
    if cond_imm:
        data["condition_immunities"] = cond_imm
    if traits:
        data["traits"] = traits
    if actions:
        data["actions"] = actions
    if bonus_actions:
        data["bonus_actions"] = bonus_actions
    if reactions:
        data["reactions"] = reactions
    if legendary_actions:
        data["legendary_actions"] = legendary_actions
        data["legendary_actions_uses"] = legendary_uses
        if legendary_lair_uses is not None:
            data["legendary_actions_uses_lair"] = legendary_lair_uses
            data["legendary_actions_note_ru"] = (
                f"{legendary_uses} за раунд"
                + (f" ({legendary_lair_uses} в логове)" if legendary_lair_uses else "")
            )

    # drop None skills
    if data.get("skills") is None:
        data.pop("skills", None)

    return {
        "kind": "bestiary",
        "slug": slug,
        "name_ru": name_ru,
        "name_en": name_en,
        "source": "srd-5.2",
        "sort_order": sort_order,
        "external_ref": {
            "url_dndsu": csv_row.get("url_dndsu") or None,
            "url_ttg": csv_row.get("url_ttg") or None,
            "book": csv_row.get("book") or "SRD5.2.1",
        },
        "data": data,
    }


def load_monster_names_from_md() -> list[str]:
    text = MD_PATH.read_text(encoding="utf-8")
    return re.findall(r"^### (.+)$", text, re.M)


def load_animal_slugs() -> set[str]:
    html = ANIMALS_CORK.read_text(encoding="utf-8")
    return set(re.findall(r"/srd/animals/([a-z0-9\-]+)", html))


def extract_blocks(text: str) -> dict[str, str]:
    names = re.findall(r"^### (.+)$", text, re.M)
    out: dict[str, str] = {}
    for name in names:
        m = re.search(
            rf"^### {re.escape(name)}\n(.+?)(?=^### |\Z)",
            text,
            re.M | re.S,
        )
        if not m:
            raise ValueError(f"block missing: {name}")
        out[name] = m.group(0)
    return out


def update_csv(monster_slugs: set[str], animal_slugs: set[str]) -> dict[str, int]:
    rows = list(csv.DictReader(CSV_PATH.open(encoding="utf-8")))
    fieldnames = list(rows[0].keys())
    if "srd_section" not in fieldnames:
        fieldnames.append("srd_section")
    stats = Counter()
    for row in rows:
        rid = row["id"]
        if rid in monster_slugs:
            row["srd"] = "true"
            row["srd_section"] = "monsters"
            stats["monsters"] += 1
        elif rid in animal_slugs:
            row["srd"] = "true"
            row["srd_section"] = "animals"
            stats["animals"] += 1
        else:
            # keep existing srd flag for non-SRD books; clear section
            if str(row.get("srd", "")).lower() == "true" and rid not in monster_slugs | animal_slugs:
                # should not happen after reconcile
                row["srd"] = "false"
                stats["cleared_false"] += 1
            row["srd_section"] = row.get("srd_section") or ""
            if str(row.get("srd")).lower() != "true":
                row["srd"] = "false"
                row["srd_section"] = ""
                stats["non_srd"] += 1
    with CSV_PATH.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for row in rows:
            w.writerow({k: row.get(k, "") for k in fieldnames})
    return dict(stats)


def update_gaps(monster_count: int, animal_count: int) -> None:
    note = (
        f"- **P24-C07 (2026-11-15):** сверка `creatures.csv` с разделами SRD 5.2.1 "
        f"**Monsters A–Z** ({monster_count}) и **Animals** ({animal_count}). "
        f"Добавлена колонка `srd_section` (`monsters` / `animals`). "
        f"Сид C07 — только Monsters ({monster_count}); Animals → P24-C08. "
        f"Эвристика P24-00 по сумме 330 совпала с оглавлением; типы «Зверь» в Monsters "
        f"(например Axe Beak) остаются в C07, не в C08.\n"
    )
    text = GAPS.read_text(encoding="utf-8")
    if "P24-C07" in text:
        text = re.sub(
            r"- \*\*P24-C07.*?(?=\n- \*\*P24-|\n## |\Z)",
            note.rstrip() + "\n",
            text,
            count=1,
            flags=re.S,
        )
    else:
        # append after P24-C06 block if present
        if "P24-C06" in text:
            text = text.rstrip() + "\n" + note
        else:
            text = text.rstrip() + "\n\n" + note
    GAPS.write_text(text, encoding="utf-8")


def update_counts(monster_count: int) -> None:
    data = json.loads(COUNTS.read_text(encoding="utf-8"))
    notes = data.setdefault("notes", [])
    note = (
        f"P24-C07: srd_section monsters={monster_count}, animals={SRD_ANIMAL_COUNT}; "
        f"сид только Monsters."
    )
    notes = [n for n in notes if not str(n).startswith("P24-C07:")]
    notes.append(note)
    data["notes"] = notes
    data["srd_creatures"] = {
        "monsters": monster_count,
        "animals": SRD_ANIMAL_COUNT,
        "total_srd": monster_count + SRD_ANIMAL_COUNT,
    }
    COUNTS.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_layer3(cards: list[dict[str, Any]]) -> None:
    # sample across CR / types
    by_type: dict[str, list] = {}
    for c in cards:
        by_type.setdefault(c["data"]["type"], []).append(c)
    sample: list[dict[str, Any]] = []
    for t, items in sorted(by_type.items()):
        sample.append(items[0])
        if len(items) > 1:
            sample.append(items[-1])
    # force some known hard ones
    want = {"aboleth", "adult-red-dragon", "mage", "assassin", "goblin-minion", "commoner"}
    have = {c["slug"] for c in sample}
    for c in cards:
        if c["slug"] in want and c["slug"] not in have:
            sample.append(c)
            have.add(c["slug"])
    lines = [
        "# P24-C07 — выборка для слоя 3 (ручная сверка)",
        "",
        "Сверять с SRD 5.2.1 Monsters A–Z и next.dnd.su / new.ttg.club (имена).",
        "Агент-сборщик слой 3 не принимает.",
        "",
        "| slug | name_en | name_ru | CR | тип | источник сверки |",
        "|---|---|---|---|---|---|",
    ]
    for c in sample[:24]:
        lines.append(
            f"| `{c['slug']}` | {c['name_en']} | {c['name_ru']} | {c['data']['cr']} | "
            f"{c['data']['type_ru']} | SRD PDF / next.dnd.su |"
        )
    LAYER3.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    if not MD_PATH.is_file() or MD_PATH.stat().st_size < 1000:
        raise SystemExit(f"Missing SRD markdown at {MD_PATH}")
    if not ANIMALS_CORK.is_file():
        raise SystemExit(f"Missing animals list at {ANIMALS_CORK}")

    text = MD_PATH.read_text(encoding="utf-8")
    blocks = extract_blocks(text)
    monster_names = list(blocks.keys())
    assert len(monster_names) == SRD_MONSTER_COUNT, len(monster_names)
    monster_slugs = {slugify(n) for n in monster_names}
    # will-o'-wisp special
    monster_slugs = set()
    name_by_slug: dict[str, str] = {}
    for n in monster_names:
        s = slugify(n)
        monster_slugs.add(s)
        name_by_slug[s] = n
    animal_slugs = load_animal_slugs()
    assert len(animal_slugs) == SRD_ANIMAL_COUNT, len(animal_slugs)

    csv_rows = {r["id"]: r for r in csv.DictReader(CSV_PATH.open(encoding="utf-8"))}
    missing = sorted(monster_slugs - set(csv_rows))
    if missing:
        raise SystemExit(f"CSV missing monster ids: {missing}")

    trait_map = {}
    if TRAIT_2014.is_file():
        trait_map = {
            k.lower(): v
            for k, v in json.loads(TRAIT_2014.read_text(encoding="utf-8")).items()
        }
    text_map: dict[str, str] = {}
    if TRAIT_TEXT_2014.is_file():
        text_map = {
            k.lower(): v
            for k, v in json.loads(TRAIT_TEXT_2014.read_text(encoding="utf-8")).items()
        }
    spell_slugs = load_spell_slugs()
    gear_by_en, _ = load_gear_maps()

    cards: list[dict[str, Any]] = []
    errors: list[str] = []
    for i, (slug, name_en) in enumerate(sorted(name_by_slug.items(), key=lambda x: x[1].lower())):
        try:
            card = parse_monster_block(
                name_en,
                blocks[name_en],
                csv_rows[slug],
                trait_map,
                spell_slugs,
                gear_by_en,
                sort_order=10 + i * 10,
                text_map=text_map,
            )
            cards.append(card)
        except Exception as exc:  # noqa: BLE001 — collect all parse errors
            errors.append(f"{slug}: {exc}")
    if errors:
        print("PARSE ERRORS", len(errors))
        for e in errors[:30]:
            print(" ", e)
        raise SystemExit(1)

    assert len(cards) == SRD_MONSTER_COUNT

    payload = {
        "meta": {
            "pack": "P24-C07",
            "source": "SRD 5.2.1 Monsters A–Z",
            "count": len(cards),
            "notes": [
                "Без раздела Animals (P24-C08).",
                "Короткие RU-карточки; длинный текст SRD не копируем.",
                "Статы 2014 не подставлялись.",
                "gear_refs → C03, spell_refs → C05 где удалось сопоставить.",
            ],
        },
        "entries": cards,
    }
    OUT_JSON.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    csv_stats = update_csv(monster_slugs, animal_slugs)
    update_gaps(len(cards), len(animal_slugs))
    update_counts(len(cards))
    write_layer3(cards)

    by_cr = Counter(c["data"]["cr"] for c in cards)
    by_type = Counter(c["data"]["type"] for c in cards)
    pending = sum(1 for c in cards if c["data"].get("name_ru_pending"))
    with_gear = sum(1 for c in cards if c["data"].get("gear_refs"))
    with_spells = sum(1 for c in cards if c["data"].get("spell_refs"))
    print(
        json.dumps(
            {
                "seeded": len(cards),
                "csv_stats": csv_stats,
                "by_type": dict(by_type),
                "by_cr_top": by_cr.most_common(15),
                "name_ru_pending": pending,
                "with_gear_refs": with_gear,
                "with_spell_refs": with_spells,
                "out": str(OUT_JSON),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
