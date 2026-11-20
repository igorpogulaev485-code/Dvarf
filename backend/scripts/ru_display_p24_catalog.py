#!/usr/bin/env python3
"""Translate English display strings in 2024 live catalog waves to Russian.

Skips machine keys: name_en, id, slug, enums, spell_list slugs, URLs.
Rewrites spells_srd via rebuild helpers + patches C01–C04 JSON in place.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
LIVE = REPO / "backend" / "data" / "srd" / "2024" / "live"

CLASS_RU = {
    "bard": "бард",
    "cleric": "жрец",
    "druid": "друид",
    "paladin": "паладин",
    "ranger": "следопыт",
    "sorcerer": "чародей",
    "warlock": "колдун",
    "wizard": "волшебник",
}

DAMAGE_EN_RU = {
    "slashing": "рубящий",
    "piercing": "колющий",
    "bludgeoning": "дробящий",
    "fire": "огонь",
    "cold": "холод",
    "lightning": "электричество",
    "acid": "кислота",
    "poison": "яд",
    "necrotic": "некротический",
    "radiant": "излучение",
    "force": "силовой",
    "psychic": "психический",
    "thunder": "звук",
}

ARMOR_KIND_RU = {
    "light": "лёгкий",
    "medium": "средний",
    "heavy": "тяжёлый",
    "shield": "щит",
}

# Full / phrase replacements for material components (short paraphrases).
MAT_EXACT: dict[str, str] = {}

MAT_PHRASES = [
    (r"\bwhich the spell consumes\b", "расходуется"),
    (r"\bworth\b", "стоимостью"),
    (r"\b([\d,+]+)\+?\s*GP\b", r"\1+ зм"),
    (r"\bGP\b", "зм"),
    (r"\bCopper Pieces?\b", "мм"),
    (r"\bSilver Pieces?\b", "см"),
    (r"\bGold Pieces?\b", "зм"),
    (r"\ba Holy Symbol\b", "священный символ"),
    (r"\bHoly Symbol\b", "священный символ"),
    (r"\bHoly Water\b", "святая вода"),
    (r"\bComponent Pouch\b", "мешочек компонентов"),
    (r"\bfor each of the spell's targets\b", "за каждую цель заклинания"),
    (r"\bfor each corpse\b", "за каждый труп"),
    (r"\beach\b", "каждый"),
    (r"\band a Tiny replica\b", "и крошечная копия"),
    (r"\bconstructed from rare materials\b", "из редких материалов"),
    (r"\bmade from the same materials\b", "из тех же материалов"),
    (r"\bthat is large enough to hold the creature being cloned\b", "достаточно большой для клонируемого существа"),
    (r"\ba sealable vessel\b", "герметичный сосуд"),
    (r"\ba gem-encrusted bowl\b", "чаша, украшенная самоцветами"),
    (r"\ba gem-encrusted statuette of yourself\b", "статуэтка вас самих в самоцветах"),
    (r"\ba statuette of the target\b", "статуэтка цели"),
    (r"\ba statuette of yourself\b", "статуэтка вас самих"),
    (r"\ba miniature door\b", "миниатюрная дверь"),
    (r"\ba miniature sword\b", "миниатюрный меч"),
    (r"\ba forked, metal rod\b", "раздвоенный металлический жезл"),
    (r"\band attuned to a plane of existence\b", "настроенный на план бытия"),
    (r"\ba focus\b", "фокус"),
    (r"\bsuch as a crystal ball, mirror, or water-filled font\b", "например хрустальный шар, зеркало или чаша с водой"),
    (r"\beither a jeweled horn for hearing or a glass eye for seeing\b", "либо украшенный рог (слух), либо стеклянный глаз (зрение)"),
    (r"\ba set of divination tools—such as cards or runes—\b", "набор для гадания (карты, руны и т.п.) "),
    (r"\bspecially marked sticks, bones, cards, or other divinatory tokens\b", "особые жетоны для гадания (палочки, кости, карты)"),
    (r"\bone jacinth\b", "гиацинт"),
    (r"\bone silver bar\b", "серебряный слиток"),
    (r"\ball of which the spell consumes\b", "всё расходуется"),
    (r"\ban object with the image of a dragon engraved on it\b", "предмет с вырезанным изображением дракона"),
    (r"\ba pair of platinum rings\b", "пара платиновых колец"),
    (r"\bwhich you and the target must wear for the duration\b", "которые вы и цель носите всё время действия"),
    (r"\ba pinch of diamond dust\b", "щепотка алмазной пыли"),
    (r"\bdiamond dust\b", "алмазная пыль"),
    (r"\bpowdered diamond\b", "порошок алмаза"),
    (r"\bpowdered ruby\b", "порошок рубина"),
    (r"\bruby dust\b", "рубиновая пыль"),
    (r"\bjade dust\b", "нефритовая пыль"),
    (r"\bgem dust\b", "пыль самоцветов"),
    (r"\bmushroom powder\b", "порошок грибов"),
    (r"\bsalt and powdered silver\b", "соль и порошок серебра"),
    (r"\bgold dust\b", "золотая пыль"),
    (r"\bincense\b", "благовония"),
    (r"\bburning incense\b", "горящие благовония"),
    (r"\brare oils\b", "редкие масла"),
    (r"\brare inks\b", "редкие чернила"),
    (r"\bink\b", "чернила"),
    (r"\ba diamond\b", "алмаз"),
    (r"\bdiamonds\b", "алмазы"),
    (r"\ba black pearl\b", "чёрная жемчужина"),
    (r"\bthe powder of a crushed black pearl\b", "порошок растолчённой чёрной жемчужины"),
    (r"\bblack onyx stone\b", "камень чёрного оникса"),
    (r"\ba sapphire\b", "сапфир"),
    (r"\ba pearl\b", "жемчужина"),
    (r"\ba jewel\b", "драгоценность"),
    (r"\ba gem, crystal, or reliquary\b", "самоцвет, кристалл или реликварий"),
    (r"\ba reliquary\b", "реликварий"),
    (r"\ba jade circlet\b", "нефритовый обруч"),
    (r"\ba silver rod\b", "серебряный жезл"),
    (r"\ba flask of\b", "фляга"),
    (r"\bfour ivory strips\b", "четыре пластины из слоновой кости"),
    (r"\ba chest, 3 feet by 2 feet by 2 feet\b", "сундук 3×2×2 фута"),
    (r"\ba Tiny replica of the chest\b", "крошечная копия сундука"),
    (r"\ban agate\b", "агат"),
    (r"\ba ball of bat guano and sulfur\b", "шарик гуано летучей мыши и серы"),
    (r"\ba ball of wax\b", "шарик воска"),
    (r"\ba bell and silver wire\b", "колокольчик и серебряная проволока"),
    (r"\ba bit of bat fur\b", "клочок меха летучей мыши"),
    (r"\ba bit of fleece\b", "клочок шерсти"),
    (r"\ba bit of fur and a crystal rod\b", "клочок меха и кристаллический жезл"),
    (r"\ba bit of gauze\b", "клочок марли"),
    (r"\ba bit of phosphorus or a firefly\b", "кусочек фосфора или светлячок"),
    (r"\ba bit of phosphorus\b", "кусочек фосфора"),
    (r"\ba bit of pork rind or butter\b", "кусочек свиной кожицы или масло"),
    (r"\ba bit of spiderweb\b", "клочок паутины"),
    (r"\ba bit of string and of wood\b", "нитка и щепка"),
    (r"\ba candle\b", "свеча"),
    (r"\ba caterpillar cocoon\b", "кокон гусеницы"),
    (r"\ba chip of mica\b", "осколок слюды"),
    (r"\ba cockatrice feather\b", "перо василиска"),
    (r"\ba copper wire\b", "медная проволока"),
    (r"\ba crystal bead\b", "кристаллическая бусина"),
    (r"\ba cube of granite\b", "кубик гранита"),
    (r"\ba dried carrot\b", "сушёная морковь"),
    (r"\ba drop of alcohol\b", "капля спирта"),
    (r"\ba drop of bile\b", "капля желчи"),
    (r"\ba drop of bitumen and a spider\b", "капля битума и паук"),
    (r"\ba drop of blood, a piece of flesh, and a pinch of bone dust\b", "капля крови, кусок плоти и щепотка костной пыли"),
    (r"\ba drop of blood\b", "капля крови"),
    (r"\ba drop of honey\b", "капля мёда"),
    (r"\ba drop of mercury, a dollop of gum arabic, and a wisp of smoke\b", "капля ртути, капля гуммиарабика и струйка дыма"),
    (r"\ba drop of mercury\b", "капля ртути"),
    (r"\ba drop of molasses\b", "капля патоки"),
    (r"\ba drop of water or a piece of ice\b", "капля воды или кусочек льда"),
    (r"\ba feather\b", "перо"),
    (r"\ba firefly\b", "светлячок"),
    (r"\ba handful of clay\b", "горсть глины"),
    (r"\ba handful of oak bark\b", "горсть коры дуба"),
    (r"\ba heart of a hen\b", "куриное сердце"),
    (r"\ba iron blade\b", "железное лезвие"),
    (r"\ba jewel-encrusted dagger\b", "кинжал в самоцветах"),
    (r"\ba leaf of sumac\b", "лист сумаха"),
    (r"\ba lodestone\b", "магнит"),
    (r"\ba lock of hair\b", "прядь волос"),
    (r"\ba morsel of food\b", "кусочек пищи"),
    (r"\ba pinch of dust\b", "щепотка пыли"),
    (r"\ba pinch of powdered iron\b", "щепотка железного порошка"),
    (r"\ba pinch of salt\b", "щепотка соли"),
    (r"\ba powdered iron\b", "железный порошок"),
    (r"\ba red dragon's scale\b", "чешуя красного дракона"),
    (r"\ba reed or a blade of grass\b", "тростинка или травинка"),
    (r"\ba short piece of iron\b", "короткий железный пруток"),
    (r"\ba small clay model of a ziggurat\b", "маленькая глиняная модель зиккурата"),
    (r"\ba small crystal sphere\b", "маленькая хрустальная сфера"),
    (r"\ba small diamond\b", "маленький алмаз"),
    (r"\ba small piece of phosphorus\b", "небольшой кусок фосфора"),
    (r"\ba small straight piece of iron\b", "небольшой прямой железный пруток"),
    (r"\ba snake's tongue and a bit of honeycomb or a drop of sweet oil\b", "язык змеи и кусочек сот или капля сладкого масла"),
    (r"\ba sprinkling of holy water\b", "кропление святой водой"),
    (r"\ba strip of white cloth\b", "полоска белой ткани"),
    (r"\ba talisman of a goddess of magic\b", "талисман богини магии"),
    (r"\ba thimble\b", "напёрсток"),
    (r"\ba tiny ball of bat guano and sulfur\b", "крошечный шарик гуано и серы"),
    (r"\ba tiny fan and a feather\b", "крошечный веер и перо"),
    (r"\ba tiny silver whistle\b", "крошечный серебряный свисток"),
    (r"\ba tongs\b", "щипцы"),
    (r"\ba tuft of fur\b", "пучок меха"),
    (r"\ba white feather or the heart of a hen\b", "белое перо или куриное сердце"),
    (r"\ban eyelid of a newt\b", "веко тритона"),
    (r"\ban opaque gem\b", "непрозрачный самоцвет"),
    (r"\ban ounce of blood\b", "унция крови"),
    (r"\bsumac leaf\b", "лист сумаха"),
    (r"\bsulfur\b", "сера"),
    (r"\bammonia\b", "аммиак"),
    (r"\btalc\b", "тальк"),
    (r"\bpowdered corn extract\b", "порошок кукурузного экстракта"),
    (r"\bsesame seeds\b", "семена кунжута"),
    (r"\ba marble\b", "стеклянный шарик"),
    (r"\ba citrus fruit\b", "цитрус"),
    (r"\ba piece of cured leather\b", "кусок выделанной кожи"),
    (r"\ba piece of string\b", "кусок бечёвки"),
    (r"\ba clear crystal\b", "прозрачный кристалл"),
    (r"\ba yellow striped gem\b", "жёлтый полосатый самоцвет"),
    (r"\ba powdered rhubarb leaf\b", "порошок листа ревеня"),
    (r"\band an adder's stomach\b", "и желудок гадюки"),
    (r"\ba mistletoe sprig\b", "веточка омелы"),
    (r"\ba shamrock leaf\b", "лист клевера"),
    (r"\ba yew leaf\b", "лист тиса"),
    (r"\ba lead-based ink\b", "чернила на свинцовой основе"),
    (r"\ba writing instrument\b", "писчий инструмент"),
    (r"\ba small clay ziggurat\b", "маленький глиняный зиккурат"),
    (r"\ba grasshopper's hind leg\b", "задняя нога кузнечика"),
    (r"\ba cricket\b", "сверчок"),
    (r"\ba sweet oil\b", "сладкое масло"),
    (r"\ba honeycomb\b", "медовые соты"),
    (r"\ba snake tongue\b", "змеиный язык"),
    (r"\ba clay pot of grave dirt\b", "глиняный горшок с могильной землёй"),
    (r"\ba clay pot filled with brackish water\b", "глиняный горшок с солоноватой водой"),
    (r"\ba clay pot of brackish water\b", "глиняный горшок с солоноватой водой"),
    (r"\ba pickled octopus tentacle\b", "маринованное щупальце осьминога"),
    (r"\ba moonseed leaf\b", "лист луносемянника"),
    (r"\ba glowing stick of incense\b", "тлеющая палочка благовоний"),
    (r"\ba crystal vial filled with phosphorescent material\b", "хрустальный сосуд с фосфоресцирующим веществом"),
    (r"\ba brass brazier\b", "латунная жаровня"),
    (r"\ba crystal or glass cone\b", "конус из кристалла или стекла"),
    (r"\ba silver spoon\b", "серебряная ложка"),
    (r"\ba tiny silver mirror\b", "крошечное серебряное зеркальце"),
    (r"\ba tiny silver bell\b", "крошечный серебряный колокольчик"),
    (r"\ba small leather or wooden loop\b", "маленькая петля из кожи или дерева"),
    (r"\ba soft metal rod\b", "мягкий металлический пруток"),
    (r"\ba handful of clay, crystal, glass, or mineral\b", "горсть глины, кристалла, стекла или минерала"),
    (r"\ba burning incense and a herb pouch\b", "горящие благовония и мешочек трав"),
    (r"\ba powdered herb\b", "травяной порошок"),
    (r"\ba piece of ivory\b", "кусок слоновой кости"),
    (r"\ba glass eye\b", "стеклянный глаз"),
    (r"\ba jeweled horn\b", "украшенный рог"),
    (r"\ba gem or crystal\b", "самоцвет или кристалл"),
    (r"\ba iron or silver bar\b", "железный или серебряный пруток"),
    (r"\ba tiny tart\b", "крошечный пирожок"),
    (r"\ba feather from a bird\b", "перо птицы"),
    (r"\ba strip of white cloth\b", "полоска белой ткани"),
    (r"\ba clay model of a ziggurat\b", "глиняная модель зиккурата"),
    (r"\ba bit of\b", "кусочек"),
    (r"\ba drop of\b", "капля"),
    (r"\ba pinch of\b", "щепотка"),
    (r"\ba handful of\b", "горсть"),
    (r"\ba piece of\b", "кусок"),
    (r"\ba small\b", "небольшой"),
    (r"\ba tiny\b", "крошечный"),
    (r"\ban?\b", ""),
    (r"\band\b", "и"),
    (r"\bor\b", "или"),
    (r"\bof\b", ""),
    (r"\bfeet\b", "фт"),
    (r"\bfoot\b", "фт"),
    (r"\bTiny\b", "крошечный"),
    (r"\bLarge\b", "большой"),
    (r",+", ","),
    (r"\s+", " "),
]

CONDITIONS = {
    "which you take when you see a creature within 60 feet of yourself casting a spell with Verbal, Somatic, or Material components": (
        "когда в 60 фт видите существо, накладывающее заклинание с вербальным, соматическим или материальным компонентом"
    ),
    "which you take when you or a creature you can see within 60 feet of you falls": (
        "когда вы или видимое существо в 60 фт падаете"
    ),
    "which you take in response to taking damage from a creature that you can see within 60 feet of yourself": (
        "когда получаете урон от видимого существа в 60 фт"
    ),
    "which you take when you are hit by an attack roll or targeted by the Magic Missile spell": (
        "когда по вам попадают атакой или вас выбирают целью «Волшебной стрелы»"
    ),
}

DISPLAY_LEAVES = {
    "summary_ru",
    "description",
    "traits_text",
    "utilize_ru",
    "spell_list_note_ru",
    "repeatable_note_ru",
    "higher_levels",
    "duration",
    "range",
    "don_time",
    "doff_time",
    "m",
    "condition",
    "name_ru",
    "damage",
    "attack_or_save",
}


def translate_material(text: str) -> str:
    if not text or not isinstance(text, str):
        return text
    if text in MAT_EXACT:
        return MAT_EXACT[text]
    out = text
    for pat, repl in MAT_PHRASES:
        out = re.sub(pat, repl, out, flags=re.I)
    out = re.sub(r"\s+", " ", out).strip(" ,;")
    # If still mostly English, wrap with short RU prefix from leftovers cleanup
    if re.search(r"[A-Za-z]{3,}", out):
        # aggressive leftover lexicon
        lex = {
            "powdered": "порошок",
            "powder": "порошок",
            "dust": "пыль",
            "crystal": "кристалл",
            "glass": "стекло",
            "iron": "железо",
            "silver": "серебро",
            "gold": "золото",
            "diamond": "алмаз",
            "ruby": "рубин",
            "jade": "нефрит",
            "gem": "самоцвет",
            "pearl": "жемчуг",
            "stone": "камень",
            "rod": "жезл",
            "bar": "слиток",
            "wire": "проволока",
            "cloth": "ткань",
            "blood": "кровь",
            "water": "вода",
            "fire": "огонь",
            "fur": "мех",
            "feather": "перо",
            "leaf": "лист",
            "bark": "кора",
            "clay": "глина",
            "wax": "воск",
            "oil": "масло",
            "salt": "соль",
            "sulfur": "сера",
            "phosphorus": "фосфор",
            "mercury": "ртуть",
            "honey": "мёд",
            "butter": "масло",
            "spider": "паук",
            "spiderweb": "паутина",
            "bat": "летучая мышь",
            "guano": "гуано",
            "rhubarb": "ревень",
            "stomach": "желудок",
            "adder": "гадюка",
            "hen": "курица",
            "heart": "сердце",
            "bone": "кость",
            "flesh": "плоть",
            "piece": "кусок",
            "drop": "капля",
            "bit": "кусочек",
            "pinch": "щепотка",
            "handful": "горсть",
            "small": "небольшой",
            "tiny": "крошечный",
            "large": "большой",
            "worth": "стоимостью",
            "consumes": "расходуется",
            "spell": "заклинание",
            "which": "которое",
            "the": "",
            "a": "",
            "an": "",
            "of": "",
            "and": "и",
            "or": "или",
            "from": "из",
            "with": "с",
            "for": "для",
            "each": "каждый",
            "target": "цель",
            "creature": "существо",
            "yourself": "вас",
            "duration": "длительности",
        }
        words = re.findall(r"[A-Za-z']+|\d[\d,+]*|\+|зм|фт|×|,|\(|\)|/|\s+", out)
        built = []
        for w in words:
            if re.fullmatch(r"[A-Za-z']+", w):
                built.append(lex.get(w.lower(), w))
            else:
                built.append(w)
        out = "".join(built)
        out = re.sub(r"\s+", " ", out).strip(" ,;")
    return out


def translate_condition(text: str) -> str:
    if text in CONDITIONS:
        return CONDITIONS[text]
    # fallback shorten
    t = text
    t = re.sub(r"^which you take\s+", "", t, flags=re.I)
    t = t.replace("within 60 feet of yourself", "в 60 фт от вас")
    t = t.replace("within 60 feet of you", "в 60 фт")
    t = t.replace("Magic Missile", "«Волшебная стрела»")
    t = t.replace("Verbal, Somatic, or Material components", "В/С/М компонентами")
    t = t.replace("attack roll", "атакой")
    t = t.replace("casting a spell", "накладывающее заклинание")
    t = t.replace("taking damage", "получаете урон")
    t = t.replace("creature that you can see", "видимое существо")
    t = t.replace("a creature you can see", "видимое существо")
    t = t.replace("when you see a creature", "когда видите существо")
    t = t.replace("when you or a creature", "когда вы или существо")
    t = t.replace("falls", "падаете")
    t = t.replace("when you are hit by", "когда вас поражает")
    t = t.replace("or targeted by the", "или целью")
    t = t.replace("spell", "заклинания")
    t = t.replace("in response to", "в ответ на")
    t = t.replace("from a", "от")
    if re.search(r"[A-Za-z]{3,}", t):
        t = "триггер реакции (см. правила заклинания)"
    return t.strip()


def scrub_display_text(s: str) -> str:
    """Generic RU cleanup for display prose across packs."""
    if not isinstance(s, str) or not s:
        return s
    out = s
    reps = [
        (r"\bSRD\b", "СРД"),
        (r"\bASI\b", "увеличение характеристик"),
        (r"\bD20 Test\b", "проверку к20"),
        (r"\bPower Word Heal\b", "«Слово силы: исцеление»"),
        (r"\bPower Word Kill\b", "«Слово силы: смерть»"),
        (r"\bBlessed Strikes\b", "«Благословенные удары»"),
        (r"\bElemental Fury\b", "«Стихийная ярость»"),
        (r"\bFind Familiar\b", "«Поиск фамильяра»"),
        (r"\bFind Steed\b", "«Обретение скакуна»"),
        (r"\bDivine Smite\b", "«Божественная кара»"),
        (r"\bHunter's Mark\b", "«Метка охотника»"),
        (r"\bContact Other Plane\b", "«Контакт с иным планом»"),
        (r"\bLand's Aid\b", "«Помощь земли»"),
        (r"\bBlessed Warrior\b", "«Благословенный воин»"),
        (r"\bMagic Missile\b", "«Волшебная стрела»"),
        (r"\bProtector\b", "Защитник"),
        (r"\bThaumaturge\b", "Чудотворец"),
        (r"\bMagician\b", "Маг"),
        (r"\bWarden\b", "Страж"),
        (r"\bBlade/Chain/Tome\b", "клинок/цепь/том"),
        (r"\bBlade\b", "клинок"),
        (r"\bChain\b", "цепь"),
        (r"\bTome\b", "том"),
        (r"\bSlow\b", "«Замедление»"),
        (r"\bTest\b", "проверку"),
        (r"каталог C02", "каталог черт"),
        (r"\bC02\b", "черт"),
        (r"\bC03\b", "снаряжения"),
        (r"\bC05\b", "заклинаний"),
        (r"slug карточек kind=spell, edition=2024", "идентификаторы карточек заклинаний редакции 2024"),
        (r"kind=spell, edition=2024", "карточки заклинаний редакции 2024"),
        (r"\bslashing\b", "рубящий"),
        (r"\bpiercing\b", "колющий"),
        (r"\bbludgeoning\b", "дробящий"),
        (r"Доспех \(light\)", "Доспех (лёгкий)"),
        (r"Доспех \(medium\)", "Доспех (средний)"),
        (r"Доспех \(heavy\)", "Доспех (тяжёлый)"),
        (r"Доспех \(shield\)", "Щит"),
        (r"\b(\d+)\s*minutes?\b", r"\1 мин"),
        (r"\b(\d+)\s*hours?\b", r"\1 ч"),
        (r"\b1 minute\b", "1 мин"),
        (r"\b5 minutes\b", "5 мин"),
        (r"\b10 minutes\b", "10 мин"),
        (r"\buntil dispelled or triggered\b", "пока не развеяно или не сработает"),
        (r"пока не развеяно or triggered", "пока не развеяно или не сработает"),
        (r"\bspecial\b", "особо"),
        (r"\bSpecial\b", "особо"),
        (r"\b1 mile\b", "1 миля"),
        (r"\b500 miles\b", "500 миль"),
        (r"\bSight\b", "в пределах зрения"),
        (r"\bUnlimited\b", "без ограничений"),
        (r"\bSelf\b", "на себя"),
        (r"\bTouch\b", "касание"),
        # class slugs left in summaries
        (r"\bbard\b", "бард"),
        (r"\bcleric\b", "жрец"),
        (r"\bdruid\b", "друид"),
        (r"\bpaladin\b", "паладин"),
        (r"\branger\b", "следопыт"),
        (r"\bsorcerer\b", "чародей"),
        (r"\bwarlock\b", "колдун"),
        (r"\bwizard\b", "волшебник"),
        (r"снаряжение СРД 2024", "обыденное снаряжение редакции 2024"),
        (r"\(2024, СРД\)", "(2024)"),
        (r"Подкласс (\w+) СРД:", r"Подкласс \1:"),
        (r" в СРД 5\.2\.1", " в справочнике 5.2.1"),
        (r"по СРД 5\.2\.1", "по справочнику 5.2.1"),
        (r"Список заклинаний СРД 5\.2\.1; элементы — идентификаторы карточек заклинаний редакции 2024\.",
         "Список заклинаний справочника 5.2.1; элементы — идентификаторы карточек заклинаний редакции 2024."),
        (r"Класс без списка заклинаний в СРД 5\.2\.1\.",
         "Класс без списка заклинаний в справочнике 5.2.1."),
        (r"У подкласса нет отдельного списка заклинаний в СРД 5\.2\.1\.",
         "У подкласса нет отдельного списка заклинаний в справочнике 5.2.1."),
        (r"Всегда подготовленные / круговые заклинания подкласса по справочнику 5\.2\.1\.",
         "Всегда подготовленные или круговые заклинания подкласса по справочнику 5.2.1."),
    ]
    for pat, repl in reps:
        out = re.sub(pat, repl, out)
    return out


def patch_obj(obj):
    if isinstance(obj, dict):
        for k, v in list(obj.items()):
            if k == "name_en":
                continue
            if k == "m" and isinstance(v, str) and ("components" in str(type(obj)) or True):
                # Only translate material strings that look English
                if re.search(r"[A-Za-z]{3,}", v):
                    obj[k] = scrub_display_text(translate_material(v))
                else:
                    obj[k] = scrub_display_text(v)
            elif k == "condition" and isinstance(v, str):
                obj[k] = scrub_display_text(translate_condition(v))
            elif k in DISPLAY_LEAVES and isinstance(v, str):
                obj[k] = scrub_display_text(v)
            else:
                patch_obj(v)
    elif isinstance(obj, list):
        for item in obj:
            patch_obj(item)


def rebuild_spell_summaries(entry: dict) -> None:
    data = entry.get("data") or {}
    classes = data.get("classes") or []
    classes_ru = "/".join(CLASS_RU.get(c, c) for c in classes)
    school_ru = data.get("school_ru") or data.get("school") or ""
    level = data.get("level")
    if level == 0:
        head = f"Заговор ({school_ru})"
    else:
        head = f"{level} круг, {school_ru}"
    bits = [head]
    ct = data.get("casting_time") or {}
    unit = ct.get("unit") if isinstance(ct, dict) else None
    if unit == "action":
        bits.append("действие «Магия»")
    elif unit == "bonus":
        bits.append("бонусное")
    elif unit == "reaction":
        bits.append("реакция")
    elif unit == "minute":
        bits.append("минуты")
    elif unit == "hour":
        bits.append("часы")
    if data.get("ritual"):
        bits.append("ритуал")
    if data.get("concentration"):
        bits.append("конц.")
    if data.get("damage"):
        bits.append(str(data["damage"]))
    if data.get("attack_or_save"):
        aos = data["attack_or_save"]
        if aos == "атака":
            bits.append("атака заклинанием")
        else:
            bits.append(f"спас {aos}")
    if classes_ru:
        bits.append(classes_ru)
    summary = scrub_display_text("; ".join(bits) + ".")
    data["summary_ru"] = summary
    data["description"] = summary
    if data.get("higher_levels"):
        data["higher_levels"] = scrub_display_text(data["higher_levels"])
    if isinstance(data.get("duration"), str):
        data["duration"] = scrub_display_text(data["duration"])
    if isinstance(data.get("range"), str):
        data["range"] = scrub_display_text(data["range"])
    comps = data.get("components")
    if isinstance(comps, dict) and isinstance(comps.get("m"), str):
        comps["m"] = scrub_display_text(translate_material(comps["m"]))
    if isinstance(ct, dict) and isinstance(ct.get("condition"), str):
        ct["condition"] = scrub_display_text(translate_condition(ct["condition"]))


def patch_file(path: Path) -> int:
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data.get("entries") if isinstance(data, dict) else data
    if path.name == "weapon_mastery_srd.json" and isinstance(data, dict):
        entries = data.get("entries") or data.get("properties") or []
        if not entries and isinstance(data.get("masteries"), list):
            entries = data["masteries"]
    changed = 0
    if isinstance(entries, list):
        before = json.dumps(entries, ensure_ascii=False)
        for e in entries:
            if path.name == "spells_srd.json" and isinstance(e, dict):
                rebuild_spell_summaries(e)
            patch_obj(e)
        after = json.dumps(entries, ensure_ascii=False)
        changed = 0 if before == after else 1
    if isinstance(data, dict) and "entries" in data:
        data["entries"] = entries
        if path.name == "spells_srd.json":
            notes = (data.get("meta") or {}).get("notes_ru")
            if notes:
                data["meta"]["notes_ru"] = scrub_display_text(notes)
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    elif path.name == "weapon_mastery_srd.json":
        # keep original structure
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return changed


def main() -> None:
    # Preload exact material map from current file for quality
    spells_path = LIVE / "spells_srd.json"
    spells = json.loads(spells_path.read_text(encoding="utf-8"))
    for e in spells["entries"]:
        m = (e.get("data") or {}).get("components", {}).get("m")
        if isinstance(m, str) and m not in MAT_EXACT:
            MAT_EXACT[m] = translate_material(m)

    files = [
        "spells_srd.json",
        "species_srd.json",
        "backgrounds_srd.json",
        "feats_srd.json",
        "weapons_srd.json",
        "armor_srd.json",
        "equipment_srd.json",
        "classes_srd.json",
        "subclasses_srd.json",
        "weapon_mastery_srd.json",
    ]
    for name in files:
        path = LIVE / name
        if path.is_file():
            patch_file(path)
            print("patched", name)


if __name__ == "__main__":
    main()
