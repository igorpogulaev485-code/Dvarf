#!/usr/bin/env python3
"""P24-C12: build bastions_dmg24.json + bastions.csv from DMG 2024 structure.

Short RU paraphrases only — no book prose. source=dmg24 → community_ref.
name_ru_pending=true on facility/order names (Igor review).
Structural fields (levels, spaces, hirelings, orders) from open catalogs
(5etools XDMG / Roll20 / DDB overview); effect texts are our short wording.
"""

from __future__ import annotations

import csv
import json
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
LIVE = REPO / "backend" / "data" / "srd" / "2024" / "live"
SOURCES = REPO / "docs" / "edition-2024" / "sources"
OUT_JSON = LIVE / "bastions_dmg24.json"
OUT_CSV = SOURCES / "bastions.csv"

SPACE_SQUARES = {"cramped": 4, "roomy": 16, "vast": 36}
SPACE_RU = {"cramped": "тесное", "roomy": "просторное", "vast": "обширное"}

BASIC_COST = {
    "add": {
        "cramped": {"gp": 500, "days": 20},
        "roomy": {"gp": 1000, "days": 45},
        "vast": {"gp": 3000, "days": 125},
    },
    "enlarge": {
        "cramped_to_roomy": {"gp": 500, "days": 25},
        "roomy_to_vast": {"gp": 2000, "days": 80},
    },
}

SPECIAL_TOTAL_BY_LEVEL = {5: 2, 9: 4, 13: 5, 17: 6}

ORDER_META = [
    {
        "slug": "order-craft",
        "name_en": "Craft",
        "name_ru": "Изготовить",
        "summary_ru": "Наёмники мастерят предмет, доступный этому помещению. Пока работа идёт, то же помещение нельзя снова использовать для Изготовить.",
    },
    {
        "slug": "order-empower",
        "name_en": "Empower",
        "name_ru": "Усилить",
        "summary_ru": "Помещение даёт временное усиление владельцу или другому существу (см. карточку помещения).",
    },
    {
        "slug": "order-harvest",
        "name_en": "Harvest",
        "name_ru": "Собрать",
        "summary_ru": "Наёмники собирают ресурс помещения. Пока сбор идёт, то же помещение нельзя снова использовать для Собрать.",
    },
    {
        "slug": "order-maintain",
        "name_en": "Maintain",
        "name_ru": "Содержать",
        "summary_ru": "Приказ всему бастиону: другие приказы в этот ход бастиона нельзя. Мастер бросает по таблице событий бастиона.",
    },
    {
        "slug": "order-recruit",
        "name_en": "Recruit",
        "name_ru": "Нанять",
        "summary_ru": "Наёмники привлекают существ в бастион, в том числе защитников бастиона.",
    },
    {
        "slug": "order-research",
        "name_en": "Research",
        "name_ru": "Исследовать",
        "summary_ru": "Наёмники собирают сведения по теме или заданию помещения.",
    },
    {
        "slug": "order-trade",
        "name_en": "Trade",
        "name_ru": "Торговать",
        "summary_ru": "Наёмники покупают или продают товары и услуги, связанные с помещением.",
    },
]

# Russian facility names — our wording; name_ru_pending=true for Igor.
BASIC = [
    ("bedroom", "Bedroom", "Спальня"),
    ("dining-room", "Dining Room", "Столовая"),
    ("parlor", "Parlor", "Гостиная"),
    ("courtyard", "Courtyard", "Двор"),
    ("kitchen", "Kitchen", "Кухня"),
    ("storage", "Storage", "Кладовая"),
]

# slug, name_en, name_ru, level, spaces, hirelings, orders, prereq_ru, summary, order_effects
SPECIAL = [
    (
        "arcane-study",
        "Arcane Study",
        "Чародейский кабинет",
        5,
        ["roomy"],
        [{"exact": 1}],
        ["craft"],
        "Умение пользоваться магической фокусировкой или инструментом как фокусировкой заклинаний",
        "Тихий кабинет для исследований с столами и полками.",
        [
            {
                "order": "craft",
                "summary_ru": "Фокусировка (7 дней, бесплатно); пустая книга (7 дней, 10 зм); с 9 ур. — обычный/необычный предмет из таблиц «Аркана» (время и цена по правилам создания).",
            }
        ],
        "После продолжительного отдыха в бастионе — временный талисман «Опознание» без ячейки и материалов (7 дней или до применения).",
    ),
    (
        "armory",
        "Armory",
        "Оружейная",
        5,
        ["roomy"],
        [{"exact": 1}],
        ["trade"],
        None,
        "Стойки для доспехов, щитов, оружия и боеприпасов.",
        [
            {
                "order": "trade",
                "summary_ru": "Запас снаряжения: 100 зм + 100 зм за каждого защитника (половина при наличии кузницы). Пока запас есть, потери защитников считают к8 вместо к6; после события запас расходуется.",
            }
        ],
        None,
    ),
    (
        "barrack",
        "Barrack",
        "Казарма",
        5,
        ["roomy", "vast"],
        [{"exact": 1}],
        ["recruit"],
        None,
        "Спальни для защитников бастиона; можно иметь несколько казарм.",
        [
            {
                "order": "recruit",
                "summary_ru": "До 4 защитников бесплатно, пока есть места (просторная — 12, обширная — 25).",
            }
        ],
        "Расширение до обширной: 2000 зм.",
    ),
    (
        "garden",
        "Garden",
        "Сад",
        5,
        ["roomy", "vast"],
        [{"exact": 1, "space": "roomy"}, {"exact": 2, "space": "vast"}],
        ["harvest"],
        None,
        "Сад одного типа: декоративный, пищевой, травяной или ядовитый; тип можно сменить за 21 день.",
        [
            {
                "order": "harvest",
                "summary_ru": "Сбор по типу: букеты/духи/свечи; рационы; наборы целителя или зелье лечения; антитоксин или простой яд.",
            }
        ],
        None,
    ),
    (
        "library",
        "Library",
        "Библиотека",
        5,
        ["roomy"],
        [{"exact": 1}],
        ["research"],
        None,
        "Книги, столы и места для чтения.",
        [
            {
                "order": "research",
                "summary_ru": "За 7 дней — до трёх точных фактов по теме (легенда, место, личность, вид существ, известный предмет), которых вы не знали.",
            }
        ],
        None,
    ),
    (
        "sanctuary",
        "Sanctuary",
        "Святилище",
        5,
        ["roomy"],
        [{"exact": 1}],
        ["craft"],
        "Умение пользоваться священным символом или друидической фокусировкой как фокусировкой заклинаний",
        "Место для молитв и священных обрядов.",
        [
            {
                "order": "craft",
                "summary_ru": "Священная фокусировка (7 дней, бесплатно).",
            }
        ],
        "После продолжительного отдыха — временный талисман священного заговора (см. карточку; 7 дней или до применения).",
    ),
    (
        "smithy",
        "Smithy",
        "Кузница",
        5,
        ["roomy"],
        [{"exact": 2}],
        ["craft"],
        None,
        "Горн, наковальня и кузнечный инструмент.",
        [
            {
                "order": "craft",
                "summary_ru": "Изделия инструментом кузнеца; с 9 ур. — обычный/необычный предмет из таблиц «Вооружение».",
            }
        ],
        None,
    ),
    (
        "storehouse",
        "Storehouse",
        "Склад",
        5,
        ["roomy"],
        [{"exact": 1}],
        ["trade"],
        None,
        "Прохладное хранилище для торговых товаров и снаряжения.",
        [
            {
                "order": "trade",
                "summary_ru": "За 7 дней купить немагические товары до лимита (500/2000/5000 зм на 5/9/13 ур.) или продать со наценкой 10/20/50/100% на 5/9/13/17 ур.",
            }
        ],
        None,
    ),
    (
        "workshop",
        "Workshop",
        "Мастерская",
        5,
        ["roomy", "vast"],
        [{"exact": 3, "space": "roomy"}, {"exact": 5, "space": "vast"}],
        ["craft"],
        None,
        "Творческое пространство с выбранными ремесленными инструментами (6 видов; +3 при расширении).",
        [
            {
                "order": "craft",
                "summary_ru": "Снаряжение выбранными инструментами; с 9 ур. — обычный/необычный предмет из таблиц «Приспособления».",
            }
        ],
        "Полный короткий отдых здесь даёт героическое вдохновение (раз за продолжительный отдых). Расширение: 2000 зм.",
    ),
    (
        "gaming-hall",
        "Gaming Hall",
        "Игорный зал",
        9,
        ["vast"],
        [{"exact": 4}],
        ["trade"],
        None,
        "Зал для игр и ставок.",
        [
            {
                "order": "trade",
                "summary_ru": "Азартные игры приносят доход (случайная сумма по правилам зала) за ход бастиона.",
            }
        ],
        None,
    ),
    (
        "greenhouse",
        "Greenhouse",
        "Оранжерея",
        9,
        ["roomy"],
        [{"exact": 1}],
        ["harvest"],
        None,
        "Закрытый климат для редких растений и грибов.",
        [
            {
                "order": "harvest",
                "summary_ru": "Большее зелье лечения из трав (7 дней, бесплатно) или одна доза выбранного яда (7 дней, бесплатно).",
            }
        ],
        "Растение с тремя плодами «малое восстановление» (обновляются на рассвете; сорванные теряют силу через 24 часа).",
    ),
    (
        "laboratory",
        "Laboratory",
        "Лаборатория",
        9,
        ["roomy"],
        [{"exact": 1}],
        ["craft"],
        None,
        "Место для алхимии и смесей.",
        [
            {
                "order": "craft",
                "summary_ru": "Изделия алхимическими припасами; или флакон выбранного яда за половину цены (7 дней).",
            }
        ],
        None,
    ),
    (
        "sacristy",
        "Sacristy",
        "Ризница",
        9,
        ["roomy"],
        [{"exact": 1}],
        ["craft"],
        "Умение пользоваться священным символом или друидической фокусировкой как фокусировкой заклинаний",
        "Хранилище священных принадлежностей.",
        [
            {
                "order": "craft",
                "summary_ru": "Святая вода (7 дней, бесплатно); обычный/необычный предмет из таблиц «Реликвии».",
            }
        ],
        "После продолжительного отдыха можно восстановить одну потраченную ячейку заклинаний 2 ур. или ниже.",
    ),
    (
        "scriptorium",
        "Scriptorium",
        "Скрипторий",
        9,
        ["roomy"],
        [{"exact": 1}],
        ["craft"],
        None,
        "Мастерская переписчиков.",
        [
            {
                "order": "craft",
                "summary_ru": "Копия немагической книги; свиток заклинания жреца/волшебника 3 ур. или ниже; до 50 копий листовки/памфлета.",
            }
        ],
        None,
    ),
    (
        "stable",
        "Stable",
        "Конюшня",
        9,
        ["roomy", "vast"],
        [{"exact": 1}],
        ["trade"],
        None,
        "Содержание ездовых и животных.",
        [
            {
                "order": "trade",
                "summary_ru": "Купить или продать животных по правилам конюшни; обширная вмещает больше.",
            }
        ],
        None,
    ),
    (
        "teleportation-circle",
        "Teleportation Circle",
        "Круг телепортации",
        9,
        ["roomy"],
        [{"exact": 1}],
        ["recruit"],
        None,
        "Постоянный круг телепортации в бастионе.",
        [
            {
                "order": "recruit",
                "summary_ru": "Пригласить заклинателя с другого связанного круга (до 14 дней или пока не сотворит заклинание для владельца); в защите бастиона не участвует.",
            }
        ],
        None,
    ),
    (
        "theater",
        "Theater",
        "Театр",
        9,
        ["vast"],
        [{"exact": 4}],
        ["empower"],
        None,
        "Сцена для концертов и постановок.",
        [
            {
                "order": "empower",
                "summary_ru": "Постановка/концерт: роли автора, режиссёра или исполнителя дают временные усиления участникам (см. карточку).",
            }
        ],
        None,
    ),
    (
        "training-area",
        "Training Area",
        "Тренировочная площадка",
        9,
        ["vast"],
        [{"exact": 4}],
        ["empower"],
        None,
        "Площадка для боевой и физической подготовки.",
        [
            {
                "order": "empower",
                "summary_ru": "Тренировка даёт выбранное временное усиление (скорость, спасброски, оружие и т.п. по карточке).",
            }
        ],
        None,
    ),
    (
        "trophy-room",
        "Trophy Room",
        "Комната трофеев",
        9,
        ["roomy"],
        [{"exact": 1}],
        ["research"],
        None,
        "Витрины с трофеями и редкостями.",
        [
            {
                "order": "research",
                "summary_ru": "Сведения по теме или поиск полезной безделушки-трофея (7 дней).",
            }
        ],
        None,
    ),
    (
        "archive",
        "Archive",
        "Архив",
        13,
        ["roomy", "vast"],
        [{"exact": 1}],
        ["research"],
        None,
        "Хранилище ценных книг и свитков, обычно за библиотекой.",
        [
            {
                "order": "research",
                "summary_ru": "За 7 дней — сведения в духе «легендарного знания» по выбранной теме.",
            }
        ],
        "Одна справочная книга даёт преимущество на проверки Интеллекта выбранной области (магия, история, расследование, природа или религия).",
    ),
    (
        "meditation-chamber",
        "Meditation Chamber",
        "Зал медитации",
        13,
        ["cramped"],
        [{"exact": 1}],
        ["empower"],
        None,
        "Уединённое место для сосредоточения.",
        [
            {
                "order": "empower",
                "summary_ru": "«Внутренний покой»: при следующем событии бастиона бросайте дважды и выберите результат.",
            }
        ],
        "7 дней непрерывной медитации — преимущество на два случайных спасброска на 7 дней.",
    ),
    (
        "menagerie",
        "Menagerie",
        "Зверинец",
        13,
        ["vast"],
        [{"exact": 2}],
        ["recruit"],
        None,
        "Вольеры для существ.",
        [
            {
                "order": "recruit",
                "summary_ru": "Привлечь существо в зверинец; по желанию считать его защитником или оставить по своему блоку статов.",
            }
        ],
        None,
    ),
    (
        "observatory",
        "Observatory",
        "Обсерватория",
        13,
        ["roomy"],
        [{"exact": 1}],
        ["empower"],
        "Умение пользоваться фокусировкой заклинаний",
        "Место для наблюдения за небом и знамениями.",
        [
            {
                "order": "empower",
                "summary_ru": "Тайное открытие — временный талисман или сведения по астрологии/магии (см. карточку).",
            }
        ],
        "После продолжительного отдыха — временный талисман обсерватории.",
    ),
    (
        "pub",
        "Pub",
        "Трактир",
        13,
        ["roomy", "vast"],
        [{"exact": 1, "space": "roomy"}, {"exact": 4, "space": "vast"}],
        ["research"],
        None,
        "Таверна, гостиница или кофейня при бастионе.",
        [
            {
                "order": "research",
                "summary_ru": "Сбор слухов: важные события в радиусе 10 миль и перемещения знакомых существ в радиусе 50 миль (если не скрыты магией).",
            }
        ],
        "«Специаль трактира» — напиток с магическим эффектом на 24 часа; смена раз в 7 дней; обширная даёт два варианта.",
    ),
    (
        "reliquary",
        "Reliquary",
        "Реликварий",
        13,
        ["cramped"],
        [{"exact": 1}],
        ["harvest"],
        "Умение пользоваться священным символом или друидической фокусировкой как фокусировкой заклинаний",
        "Хранилище священных реликвий.",
        [
            {
                "order": "harvest",
                "summary_ru": "Создать талисман (временный магический амулет по карточке) за 7 дней.",
            }
        ],
        "После продолжительного отдыха — временный талисман реликвария.",
    ),
    (
        "demiplane",
        "Demiplane",
        "Демиплан",
        17,
        ["vast"],
        [{"exact": 1}],
        ["empower"],
        "Умение пользоваться магической фокусировкой или инструментом как фокусировкой заклинаний",
        "Дверь в личный демиплан внутри другого помещения бастиона; можно переносить в ход бастиона, если вы на месте.",
        [
            {
                "order": "empower",
                "summary_ru": "«Чародейская стойкость» на 7 дней: продолжительный отдых в демиплане даёт временные хиты = 5×уровень.",
            }
        ],
        "Действием «Магия» создать немагический предмет до 5 футов и до 5 зм из обычных материалов.",
    ),
    (
        "guildhall",
        "Guildhall",
        "Гильдейский зал",
        17,
        ["vast"],
        [{"exact": 1}],
        ["recruit"],
        "Экспертиза в навыке",
        "Зал заседаний вашей гильдии; вы — мастер гильдии выбранного типа.",
        [
            {
                "order": "recruit",
                "summary_ru": "Поручение членам гильдии (задание по типу гильдии, выгода по карточке).",
            }
        ],
        None,
    ),
    (
        "sanctum",
        "Sanctum",
        "Святая обитель",
        17,
        ["roomy"],
        [{"exact": 4}],
        ["empower"],
        "Умение пользоваться священным символом или друидической фокусировкой как фокусировкой заклинаний",
        "Высшее священное убежище.",
        [
            {
                "order": "empower",
                "summary_ru": "Укрепляющие обряды — временная защита/усиление для вас или бастиона (см. карточку).",
            }
        ],
        "Талисман обители; возможность вспомнить/вернуться в обитель по правилам карточки.",
    ),
    (
        "war-room",
        "War Room",
        "Военный кабинет",
        17,
        ["vast"],
        [{"min": 2}],
        ["recruit"],
        "Умение «Боевой стиль» или «Защита без доспехов»",
        "Штаб с картой и верными лейтенантами-ветеранами.",
        [
            {
                "order": "recruit",
                "summary_ru": "Новый лейтенант (до 10) или сбор малого войска лейтенантами (кормление и командование обязательны).",
            }
        ],
        "Каждый лейтенант на месте снижает число костей потерь защитников при атаке на 1.",
    ),
]

EVENTS_BRIEF = [
    {"range": "01–50", "name_en": "All Is Well", "name_ru": "Всё спокойно", "summary_ru": "Мелкий бытовой эпизод без механики (подтаблица)."},
    {"range": "51–55", "name_en": "Attack", "name_ru": "Атака", "summary_ru": "Налёт отбит. 6к6: каждая «1» — гибель защитника; без защитников случайное особое помещение повреждено до следующего хода."},
    {"range": "56–58", "name_en": "Criminal Hireling", "name_ru": "Наёмник-преступник", "summary_ru": "Взятка 1к6×100 зм или арест и замена; помещение простаивает до прибытия замены."},
    {"range": "59–63", "name_en": "Extraordinary Opportunity", "name_ru": "Необычный шанс", "summary_ru": "За 500 зм — новый бросок по таблице (без повтора этого события); отказ — без эффекта."},
    {"range": "64–72", "name_en": "Friendly Visitors", "name_ru": "Дружелюбные гости", "summary_ru": "Мирные посетители; польза по подтаблице."},
    {"range": "73–76", "name_en": "Guest", "name_ru": "Гость", "summary_ru": "Знаменитость, беженец с платой, наёмник-защитник или дружелюбное чудовище на время."},
    {"range": "77–79", "name_en": "Lost Hirelings", "name_ru": "Пропавшие наёмники", "summary_ru": "Часть наёмников уходит; помещение ослаблено, пока не наберёте новых."},
    {"range": "80–83", "name_en": "Magical Discovery", "name_ru": "Магическая находка", "summary_ru": "Необычное зелье или свиток без затрат."},
    {"range": "84–91", "name_en": "Refugees", "name_ru": "Беженцы", "summary_ru": "2к4 беженца платят 1к6×100 зм за кров до расселения или атаки."},
    {"range": "92–98", "name_en": "Request for Aid", "name_ru": "Просьба о помощи", "summary_ru": "Отправка защитников: риск потери при низком броске; награда по масштабу."},
    {"range": "99–00", "name_en": "Treasure", "name_ru": "Сокровище", "summary_ru": "Предмет искусства или магический предмет по таблицам сокровищ."},
]


def _hirelings_field(raw: list[dict]) -> dict:
    if not raw:
        return {"default": 0}
    if len(raw) == 1 and "space" not in raw[0]:
        item = raw[0]
        if "exact" in item:
            return {"default": int(item["exact"])}
        if "min" in item:
            return {"default": int(item["min"]), "min": int(item["min"])}
    by_space: dict[str, int] = {}
    default = None
    for item in raw:
        n = int(item.get("exact") or item.get("min") or 0)
        sp = item.get("space")
        if sp:
            by_space[str(sp)] = n
        else:
            default = n
    out: dict = {}
    if default is not None:
        out["default"] = default
    if by_space:
        out["by_space"] = by_space
        if default is None:
            out["default"] = by_space.get("roomy") or next(iter(by_space.values()))
    return out


def _rules_entry() -> dict:
    return {
        "kind": "bastion",
        "slug": "bastion-rules",
        "name_ru": "Правила бастиона",
        "name_en": "Bastion Rules",
        "source": "dmg24",
        "sort_order": 1,
        "external_ref": {"book": "DMG24", "chapter": "Bastions"},
        "data": {
            "schema_version": 1,
            "facility_kind": "rules",
            "name_ru_pending": True,
            "text_ru_pending": False,
            "bastion_turn_days": 7,
            "special_facility_totals_by_level": SPECIAL_TOTAL_BY_LEVEL,
            "space_squares": SPACE_SQUARES,
            "space_ru": SPACE_RU,
            "basic_facility_costs": BASIC_COST,
            "starting_basic": {
                "count": 2,
                "sizes": ["cramped", "roomy"],
                "note_ru": "При получении бастиона на 5 уровне — одно тесное и одно просторное базовое помещение на выбор.",
            },
            "starting_special_at_level_5": 2,
            "summary_ru": (
                "Опциональная подсистема DMG 2024: с 5 уровня персонаж может получить бастион. "
                "Ход бастиона — раз в 7 дней (мастер может замедлить). В ход выдаются приказы особым помещениям "
                "или «Содержать» всему бастиону. Особые помещения дают по уровням 5→2, 9→4, 13→5, 17→6; "
                "при повышении уровня можно заменить одно. Без онлайн-карты и UI — только справочник."
            ),
            "orders_ref": [o["slug"] for o in ORDER_META],
            "events_on_maintain": EVENTS_BRIEF,
            "defenders_note_ru": (
                "Защитники бастиона живут в казармах и гибнут при атаках по броскам потерь. "
                "Доспехи оружейной и лейтенанты военного кабинета снижают потери."
            ),
            "fall_note_ru": (
                "Бастион теряется при отказе, заброшенности (нет приказов число ходов = уровень) "
                "или карте «Разорение» из колоды многих вещей; позже можно основать новый."
            ),
        },
    }


def _order_entry(meta: dict, sort_order: int) -> dict:
    return {
        "kind": "bastion",
        "slug": meta["slug"],
        "name_ru": meta["name_ru"],
        "name_en": meta["name_en"],
        "source": "dmg24",
        "sort_order": sort_order,
        "external_ref": {"book": "DMG24", "chapter": "Bastions", "order": meta["name_en"]},
        "data": {
            "schema_version": 1,
            "facility_kind": "order",
            "order_id": meta["name_en"].lower(),
            "name_ru_pending": True,
            "text_ru_pending": False,
            "summary_ru": meta["summary_ru"],
            "bastion_wide": meta["slug"] == "order-maintain",
        },
    }


def _basic_entry(slug: str, name_en: str, name_ru: str, sort_order: int) -> dict:
    return {
        "kind": "bastion",
        "slug": slug,
        "name_ru": name_ru,
        "name_en": name_en,
        "source": "dmg24",
        "sort_order": sort_order,
        "external_ref": {"book": "DMG24", "chapter": "Bastions", "facility_type": "basic"},
        "data": {
            "schema_version": 1,
            "facility_kind": "basic",
            "level": None,
            "space_options": ["cramped", "roomy", "vast"],
            "space_squares": SPACE_SQUARES,
            "space_ru": SPACE_RU,
            "hirelings": {"default": 0},
            "orders": [],
            "build_costs": BASIC_COST,
            "name_ru_pending": True,
            "text_ru_pending": False,
            "summary_ru": (
                f"Базовое помещение «{name_ru}»: обстановка без игровой механики. "
                "Размер тесное/просторное/обширное (4/16/36 клеток). "
                "Строительство и расширение — по таблице стоимости базовых помещений."
            ),
            "order_effects_ru": [],
        },
    }


def _special_entry(row: tuple, sort_order: int) -> dict:
    (
        slug,
        name_en,
        name_ru,
        level,
        spaces,
        hire,
        orders,
        prereq,
        summary,
        order_effects,
        extra,
    ) = row
    parts = [summary]
    if extra:
        parts.append(extra)
    return {
        "kind": "bastion",
        "slug": slug,
        "name_ru": name_ru,
        "name_en": name_en,
        "source": "dmg24",
        "sort_order": sort_order,
        "external_ref": {
            "book": "DMG24",
            "chapter": "Bastions",
            "facility_type": "special",
            "level": level,
        },
        "data": {
            "schema_version": 1,
            "facility_kind": "special",
            "level": level,
            "space": spaces[0],
            "space_options": spaces,
            "space_squares": SPACE_SQUARES,
            "space_ru": SPACE_RU,
            "hirelings": _hirelings_field(hire),
            "orders": orders,
            "prerequisite_ru": prereq,
            "name_ru_pending": True,
            "text_ru_pending": False,
            "summary_ru": " ".join(parts),
            "order_effects_ru": order_effects,
            "unique": True,
        },
    }


def build_entries() -> list[dict]:
    entries: list[dict] = []
    entries.append(_rules_entry())
    so = 10
    for meta in ORDER_META:
        entries.append(_order_entry(meta, so))
        so += 10
    so = 100
    for slug, name_en, name_ru in BASIC:
        entries.append(_basic_entry(slug, name_en, name_ru, so))
        so += 10
    so = 200
    for row in SPECIAL:
        entries.append(_special_entry(row, so))
        so += 10
    return entries


def write_csv(entries: list[dict]) -> None:
    facilities = [
        e
        for e in entries
        if e["data"].get("facility_kind") in {"basic", "special"}
    ]
    fieldnames = [
        "id",
        "name_en",
        "name_ru",
        "book",
        "category",
        "facility_kind",
        "level",
        "url_dndsu",
        "url_ttg",
        "srd",
    ]
    with OUT_CSV.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for e in facilities:
            kind = e["data"]["facility_kind"]
            level = e["data"].get("level")
            w.writerow(
                {
                    "id": e["slug"],
                    "name_en": e["name_en"],
                    "name_ru": e["name_ru"],
                    "book": "DMG24",
                    "category": "bastions",
                    "facility_kind": kind,
                    "level": "" if level is None else str(level),
                    "url_dndsu": "",
                    "url_ttg": "",
                    "srd": "false",
                }
            )


def write_glossary_terms() -> None:
    """Append bastion glossary terms + facility rows into glossary_ru.csv."""
    path = SOURCES / "glossary_ru.csv"
    rows = list(csv.DictReader(path.open(encoding="utf-8")))
    fieldnames = list(rows[0].keys()) if rows else ["id", "category", "name_en", "name_ru", "book"]

    # Drop previous bastion category / term rows we own.
    keep = [
        r
        for r in rows
        if r.get("category") != "bastions"
        and not (r.get("category") == "glossary" and r.get("id", "").startswith("bastion-term-"))
    ]

    terms = [
        ("bastion-term-bastion", "Bastion", "Бастион"),
        ("bastion-term-bastion-turn", "Bastion Turn", "Ход бастиона"),
        ("bastion-term-special-facility", "Special Facility", "Особое помещение"),
        ("bastion-term-basic-facility", "Basic Facility", "Базовое помещение"),
        ("bastion-term-order", "Order", "Приказ"),
        ("bastion-term-hireling", "Hireling", "Наёмный работник"),
        ("bastion-term-defender", "Defender", "Защитник"),
        ("bastion-term-cramped", "Cramped", "Тесное"),
        ("bastion-term-roomy", "Roomy", "Просторное"),
        ("bastion-term-vast", "Vast", "Обширное"),
    ]
    for tid, en, ru in terms:
        keep.append(
            {
                "id": tid,
                "category": "glossary",
                "name_en": en,
                "name_ru": ru,
                "book": "DMG24",
            }
        )

    for slug, name_en, name_ru in BASIC:
        keep.append(
            {
                "id": slug,
                "category": "bastions",
                "name_en": name_en,
                "name_ru": name_ru,
                "book": "DMG24",
            }
        )
    for row in SPECIAL:
        slug, name_en, name_ru = row[0], row[1], row[2]
        keep.append(
            {
                "id": slug,
                "category": "bastions",
                "name_en": name_en,
                "name_ru": name_ru,
                "book": "DMG24",
            }
        )

    with path.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        w.writeheader()
        for r in keep:
            w.writerow({k: r.get(k, "") for k in fieldnames})


def main() -> None:
    entries = build_entries()
    basic_n = sum(1 for e in entries if e["data"].get("facility_kind") == "basic")
    special_n = sum(1 for e in entries if e["data"].get("facility_kind") == "special")
    order_n = sum(1 for e in entries if e["data"].get("facility_kind") == "order")
    payload = {
        "meta": {
            "pack": "P24-C12",
            "source": "DMG 2024 Bastions (community_ref, own short RU)",
            "count": len(entries),
            "basic_facilities": basic_n,
            "special_facilities": special_n,
            "orders": order_n,
            "notes": [
                "kind=bastion; source=dmg24 → community_ref.",
                "Свой краткий перевод; name_ru_pending=true у помещений и приказов.",
                "Структура (уровни, размеры, наёмники, приказы) по открытым обзорам DMG 2024 / 5etools XDMG.",
                "Без онлайн-карты и UI. SRD 5.2.1 бастионов не содержит.",
            ],
        },
        "entries": entries,
    }
    OUT_JSON.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    write_csv(entries)
    write_glossary_terms()
    print(
        f"wrote {OUT_JSON.relative_to(REPO)} entries={len(entries)} "
        f"basic={basic_n} special={special_n} orders={order_n}"
    )
    print(f"wrote {OUT_CSV.relative_to(REPO)}")


if __name__ == "__main__":
    main()
