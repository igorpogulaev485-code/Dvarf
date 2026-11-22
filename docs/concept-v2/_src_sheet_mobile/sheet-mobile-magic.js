
  /* ===== Шаг 3: магия и концентрация ===== */
  const MAGIC_LOADOUTS = {
  "kaedrin": {
    "caster": "cleric",
    "hasFocus": true,
    "hasPouch": true,
    "shieldCharges": 2,
    "shieldChargesMax": 3,
    "book": [],
    "spells": [
      {
        "id": "sacred-flame",
        "name": "Священное пламя",
        "level": 0,
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": false,
        "school": "воплощение",
        "range": "60 футов",
        "duration": "Мгновенная",
        "components": "В, С",
        "kind": "damage",
        "attack": false,
        "save": "Ловкость",
        "dmgType": "излучение",
        "prepared": true,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "Цель в пределах дистанции должна преуспеть в спасброске Ловкости, иначе получает урон излучением. Укрытие не помогает."
      },
      {
        "id": "bless",
        "name": "Благословение",
        "level": 1,
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": true,
        "school": "очарование",
        "range": "30 футов",
        "duration": "1 минута",
        "components": "В, С, М",
        "kind": "buff",
        "effect": "к20 +1к4 к атаке и спасам",
        "prepared": true,
        "always": true,
        "grant": true,
        "grantLabel": "Домен Жизни",
        "onSheet": true,
        "text": "До трёх существ получают прибавку 1к4 к броскам атаки и спасброскам, пока держится концентрация."
      },
      {
        "id": "cure-wounds",
        "name": "Лечение ран",
        "level": 1,
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": false,
        "school": "восстановление",
        "range": "Касание",
        "duration": "Мгновенная",
        "components": "В, С",
        "kind": "heal",
        "prepared": true,
        "always": true,
        "grant": true,
        "grantLabel": "Домен Жизни",
        "onSheet": true,
        "text": "Касанием восстанавливаешь хиты. У домена Жизни лечение усилено ученичеством жизни."
      },
      {
        "id": "detect-magic",
        "name": "Обнаружение магии",
        "level": 1,
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": true,
        "concentration": true,
        "school": "прорицание",
        "range": "На себя",
        "duration": "10 минут",
        "components": "В, С",
        "kind": "utility",
        "prepared": false,
        "always": false,
        "grant": false,
        "ritualFromBook": true,
        "onSheet": true,
        "text": "Чувствуешь присутствие магии в пределах 30 футов. Как ритуал — без ячейки, время каста +10 минут."
      },
      {
        "id": "sanctuary",
        "name": "Укрытие",
        "level": 1,
        "time": "bonus",
        "timeLabel": "1 бонусное действие",
        "ritual": false,
        "concentration": false,
        "school": "ограждение",
        "range": "30 футов",
        "duration": "1 минута",
        "components": "В, С, М",
        "kind": "buff",
        "effect": "атакующий должен пройти спас Мудрости",
        "prepared": true,
        "always": true,
        "grant": true,
        "grantLabel": "Умение: Убежище верных",
        "grantCast": {
          "max": 1,
          "used": 0,
          "reset": "long",
          "label": "Умение: Убежище верных",
          "kind": "Умение",
          "sourceName": "Убежище верных"
        },
        "onSheet": true,
        "text": "Существо защищено: атакующий должен преуспеть в спасброске Мудрости, иначе выбирает другую цель. Не концентрация. Умение «Убежище верных» даёт один каст без ячейки за длинный отдых."
      },
      {
        "id": "shield-of-faith",
        "name": "Щит веры",
        "level": 1,
        "time": "bonus",
        "timeLabel": "1 бонусное действие",
        "ritual": false,
        "concentration": true,
        "school": "ограждение",
        "range": "60 футов",
        "duration": "10 минут",
        "components": "В, С, М",
        "kind": "buff",
        "effect": "КД +2",
        "prepared": true,
        "always": false,
        "grant": true,
        "grantLabel": "Наложение щита",
        "charges": true,
        "itemCast": {
          "itemName": "Наложение щита",
          "charges": 1,
          "resourceId": "item-shield-faith",
          "castLevel": 1
        },
        "onSheet": true,
        "text": "Цель получает +2 к КД, пока держится концентрация. Заряды предмета «Наложение щита» позволяют каст без ячейки; слот тоже можно потратить."
      },
      {
        "id": "spiritual-weapon",
        "name": "Духовное оружие",
        "level": 2,
        "time": "bonus",
        "timeLabel": "1 бонусное действие",
        "ritual": false,
        "concentration": false,
        "school": "воплощение",
        "range": "60 футов",
        "duration": "1 минута",
        "components": "В, С",
        "kind": "damage",
        "attack": true,
        "dmgType": "силовой",
        "prepared": true,
        "always": true,
        "grant": true,
        "grantLabel": "Домен Жизни",
        "onSheet": true,
        "text": "Создаёшь призванное оружие и сразу совершаешь рукопашную атаку заклинанием. Последующие атаки — бонусным действием."
      },
      {
        "id": "lesser-restoration",
        "name": "Малое восстановление",
        "level": 2,
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": false,
        "school": "восстановление",
        "range": "Касание",
        "duration": "Мгновенная",
        "components": "В, С",
        "kind": "utility",
        "prepared": true,
        "always": true,
        "grant": true,
        "grantLabel": "Домен Жизни",
        "onSheet": true,
        "text": "Касанием снимаешь одну болезнь или состояние: ослепление, глухоту, паралич или отравление."
      },
      {
        "id": "prayer-of-healing",
        "name": "Молитва лечения",
        "level": 2,
        "time": "minute",
        "timeLabel": "10 минут",
        "ritual": false,
        "concentration": false,
        "school": "восстановление",
        "range": "30 футов",
        "duration": "Мгновенная",
        "components": "В",
        "kind": "heal",
        "prepared": true,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "До шести существ восстанавливают хиты. Время каста 10 минут — не подходит для хода в бою."
      },
      {
        "id": "guiding-bolt",
        "name": "Направленный снаряд",
        "level": 1,
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": false,
        "school": "воплощение",
        "range": "120 футов",
        "duration": "1 раунд",
        "components": "В, С",
        "kind": "damage",
        "attack": true,
        "dmgType": "излучение",
        "prepared": false,
        "always": false,
        "grant": false,
        "onSheet": false,
        "text": "Дальнобойная атака заклинанием наносит урон излучением; следующая атака по этой цели — с преимуществом."
      },
      {
        "id": "healing-word",
        "name": "Лечащее слово",
        "level": 1,
        "time": "bonus",
        "timeLabel": "1 бонусное действие",
        "ritual": false,
        "concentration": false,
        "school": "восстановление",
        "range": "60 футов",
        "duration": "Мгновенная",
        "components": "В",
        "kind": "heal",
        "prepared": false,
        "always": false,
        "grant": false,
        "onSheet": false,
        "text": "Существо в пределах дистанции восстанавливает хиты. Бонусное действие."
      },
      {
        "id": "command",
        "name": "Наказ",
        "level": 1,
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": false,
        "school": "очарование",
        "range": "60 футов",
        "duration": "1 раунд",
        "components": "В",
        "kind": "utility",
        "save": "Мудрость",
        "prepared": false,
        "always": false,
        "grant": false,
        "onSheet": false,
        "text": "Цель должна преуспеть в спасброске Мудрости, иначе выполняет одно слово-приказ на своём следующем ходу."
      },
      {
        "id": "hold-person",
        "name": "Удержание личности",
        "level": 2,
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": true,
        "school": "очарование",
        "range": "60 футов",
        "duration": "1 минута",
        "components": "В, С, М",
        "kind": "utility",
        "save": "Мудрость",
        "prepared": false,
        "always": false,
        "grant": false,
        "onSheet": false,
        "text": "Гуманоид, проваливший спас Мудрости, становится парализованным, пока держится концентрация."
      },
      {
        "id": "aid",
        "name": "Подмога",
        "level": 2,
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": false,
        "school": "восстановление",
        "range": "30 футов",
        "duration": "8 часов",
        "components": "В, С, М",
        "kind": "heal",
        "prepared": false,
        "always": false,
        "grant": false,
        "onSheet": false,
        "text": "До трёх существ повышают текущие и максимальные хиты на 5, плюс ещё 5 за каждый круг выше второго."
      },
      {
        "id": "spirit-guardians",
        "name": "Духовные стражи",
        "level": 3,
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": true,
        "school": "вызов",
        "range": "На себя (15 футов)",
        "duration": "10 минут",
        "components": "В, С, М",
        "kind": "damage",
        "save": "Мудрость",
        "dmgType": "излучение",
        "prepared": false,
        "always": false,
        "grant": false,
        "onSheet": false,
        "text": "Духи вокруг тебя: враги в области делают спас Мудрости и получают урон излучением или некротикой."
      },
      {
        "id": "dispel-magic",
        "name": "Рассеивание магии",
        "level": 3,
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": false,
        "school": "ограждение",
        "range": "120 футов",
        "duration": "Мгновенная",
        "components": "В, С",
        "kind": "utility",
        "prepared": false,
        "always": false,
        "grant": false,
        "onSheet": false,
        "text": "Оканчиваешь заклинание 3 круга или ниже на цели. Для более высокого круга — проверка характеристики."
      },
      {
        "id": "feat-spell:magic-initiate:cure-wounds",
        "name": "Лечение ран",
        "level": 1,
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": false,
        "school": "восстановление",
        "range": "Касание",
        "duration": "Мгновенная",
        "components": "В, С",
        "kind": "heal",
        "prepared": true,
        "always": true,
        "grant": true,
        "grantLabel": "Черта: Магическое посвящение",
        "onSheet": false,
        "text": "Каст черты «Магическое посвящение»: один раз за длинный отдых без ячейки, либо ячейкой.",
        "sourceKind": "feat",
        "grantCast": {
          "max": 1,
          "used": 0,
          "reset": "long",
          "label": "Черта: Магическое посвящение",
          "kind": "Черта",
          "sourceName": "Магическое посвящение"
        }
      },
      {
        "id": "gear-spell:solar-relic:cure-wounds",
        "name": "Лечение ран",
        "level": 1,
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": false,
        "school": "восстановление",
        "range": "Касание",
        "duration": "Мгновенная",
        "components": "В, С",
        "kind": "heal",
        "prepared": true,
        "always": true,
        "grant": true,
        "grantLabel": "Реликвия Солнечного щита",
        "onSheet": false,
        "text": "Грант предмета или артефакта с эффектом grant_spell (пул uses): один каст без ячейки за длинный отдых.",
        "sourceKind": "feature",
        "grantCast": {
          "max": 1,
          "used": 0,
          "reset": "long",
          "label": "Реликвия Солнечного щита"
        }
      }
    ]
  },
  "ilis": {
    "caster": "wizard",
    "hasFocus": true,
    "hasPouch": true,
    "shieldCharges": 0,
    "shieldChargesMax": 0,
    "book": [
      {
        "id": "mage-armor",
        "name": "Доспехи мага",
        "level": 1,
        "inBook": true,
        "ritual": false,
        "concentration": false,
        "prepared": true,
        "time": "action",
        "timeLabel": "1 действие"
      },
      {
        "id": "magic-missile",
        "name": "Волшебная стрела",
        "level": 1,
        "inBook": true,
        "ritual": false,
        "concentration": false,
        "prepared": true,
        "time": "action",
        "timeLabel": "1 действие"
      },
      {
        "id": "shield",
        "name": "Щит",
        "level": 1,
        "inBook": true,
        "ritual": false,
        "concentration": false,
        "prepared": true,
        "time": "reaction",
        "timeLabel": "1 реакция"
      },
      {
        "id": "detect-magic",
        "name": "Обнаружение магии",
        "level": 1,
        "inBook": true,
        "ritual": true,
        "concentration": true,
        "prepared": false,
        "time": "action",
        "timeLabel": "1 действие"
      },
      {
        "id": "identify",
        "name": "Опознавание",
        "level": 1,
        "inBook": true,
        "ritual": true,
        "concentration": false,
        "prepared": false,
        "time": "action",
        "timeLabel": "1 минута"
      },
      {
        "id": "alarm",
        "name": "Сигнал тревоги",
        "level": 1,
        "inBook": true,
        "ritual": true,
        "concentration": false,
        "prepared": false,
        "time": "action",
        "timeLabel": "1 минута"
      },
      {
        "id": "find-familiar",
        "name": "Поиск фамильяра",
        "level": 1,
        "inBook": true,
        "ritual": true,
        "concentration": false,
        "prepared": false,
        "time": "action",
        "timeLabel": "1 час"
      },
      {
        "id": "invisibility",
        "name": "Невидимость",
        "level": 2,
        "inBook": true,
        "ritual": false,
        "concentration": true,
        "prepared": true,
        "time": "action",
        "timeLabel": "1 действие"
      },
      {
        "id": "misty-step",
        "name": "Туманный шаг",
        "level": 2,
        "inBook": true,
        "ritual": false,
        "concentration": false,
        "prepared": true,
        "time": "bonus",
        "timeLabel": "1 бонусное действие"
      },
      {
        "id": "scorching-ray",
        "name": "Палящий луч",
        "level": 2,
        "inBook": true,
        "ritual": false,
        "concentration": false,
        "prepared": true,
        "time": "action",
        "timeLabel": "1 действие"
      },
      {
        "id": "mirror-image",
        "name": "Отражения",
        "level": 2,
        "inBook": true,
        "ritual": false,
        "concentration": false,
        "prepared": false,
        "time": "action",
        "timeLabel": "1 действие"
      },
      {
        "id": "levitate",
        "name": "Левитация",
        "level": 2,
        "inBook": true,
        "ritual": false,
        "concentration": true,
        "prepared": false,
        "time": "action",
        "timeLabel": "1 действие"
      },
      {
        "id": "enlarge-reduce",
        "name": "Увеличение",
        "level": 2,
        "inBook": true,
        "ritual": false,
        "concentration": true,
        "prepared": false,
        "time": "action",
        "timeLabel": "1 действие"
      },
      {
        "id": "counterspell",
        "name": "Контрзаклинание",
        "level": 3,
        "inBook": true,
        "ritual": false,
        "concentration": false,
        "prepared": true,
        "time": "reaction",
        "timeLabel": "1 реакция"
      },
      {
        "id": "fireball",
        "name": "Огненный шар",
        "level": 3,
        "inBook": true,
        "ritual": false,
        "concentration": false,
        "prepared": true,
        "time": "action",
        "timeLabel": "1 действие"
      },
      {
        "id": "fly",
        "name": "Полёт",
        "level": 3,
        "inBook": true,
        "ritual": false,
        "concentration": true,
        "prepared": true,
        "time": "action",
        "timeLabel": "1 действие"
      },
      {
        "id": "haste",
        "name": "Ускорение",
        "level": 3,
        "inBook": true,
        "ritual": false,
        "concentration": true,
        "prepared": true,
        "time": "action",
        "timeLabel": "1 действие"
      },
      {
        "id": "dispel-magic",
        "name": "Рассеивание магии",
        "level": 3,
        "inBook": true,
        "ritual": false,
        "concentration": false,
        "prepared": false,
        "time": "action",
        "timeLabel": "1 действие"
      },
      {
        "id": "tiny-hut",
        "name": "Леомундова хижина",
        "level": 3,
        "inBook": true,
        "ritual": true,
        "concentration": false,
        "prepared": false,
        "time": "action",
        "timeLabel": "1 минута"
      },
      {
        "id": "polymorph",
        "name": "Превращение",
        "level": 4,
        "inBook": true,
        "ritual": false,
        "concentration": true,
        "prepared": true,
        "time": "action",
        "timeLabel": "1 действие"
      },
      {
        "id": "greater-invisibility",
        "name": "Высшая невидимость",
        "level": 4,
        "inBook": true,
        "ritual": false,
        "concentration": true,
        "prepared": true,
        "time": "action",
        "timeLabel": "1 действие"
      },
      {
        "id": "dimension-door",
        "name": "Переносящая дверь",
        "level": 4,
        "inBook": true,
        "ritual": false,
        "concentration": false,
        "prepared": true,
        "time": "action",
        "timeLabel": "1 действие"
      },
      {
        "id": "telekinesis",
        "name": "Телекинез",
        "level": 5,
        "inBook": true,
        "ritual": false,
        "concentration": true,
        "prepared": true,
        "time": "action",
        "timeLabel": "1 действие"
      },
      {
        "id": "wall-of-force",
        "name": "Силовая стена",
        "level": 5,
        "inBook": true,
        "ritual": false,
        "concentration": true,
        "prepared": false,
        "time": "action",
        "timeLabel": "1 действие"
      }
    ],
    "spells": [
      {
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": false,
        "school": "воплощение",
        "range": "120 футов",
        "duration": "Мгновенная",
        "components": "В, С",
        "kind": "damage",
        "prepared": true,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "Дальнобойная атака заклинанием наносит урон огнём. Воспламеняет незащищённые предметы.",
        "id": "fire-bolt",
        "name": "Огненный снаряд",
        "level": 0,
        "attack": true,
        "dmgType": "огонь",
        "cantripDie": 10
      },
      {
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": false,
        "school": "вызов",
        "range": "30 футов",
        "duration": "1 минута",
        "components": "В, С",
        "kind": "utility",
        "prepared": true,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "Создаёшь призрачную руку, которая может нести до 10 фунтов и взаимодействовать с предметами.",
        "id": "mage-hand",
        "name": "Волшебная рука",
        "level": 0
      },
      {
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": false,
        "school": "преобразование",
        "range": "10 футов",
        "duration": "До 1 часа",
        "components": "В, С",
        "kind": "utility",
        "prepared": true,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "Небольшой магический трюк: искра, метка, запах, чистота, тепло — без боевого урона.",
        "id": "prestidigitation",
        "name": "Фокусы",
        "level": 0
      },
      {
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": false,
        "school": "иллюзия",
        "range": "30 футов",
        "duration": "1 минута",
        "components": "С, М",
        "kind": "utility",
        "prepared": true,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "Создаёшь звук или неподвижный образ в пределах куба с ребром 5 футов.",
        "id": "minor-illusion",
        "name": "Малая иллюзия",
        "level": 0
      },
      {
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": false,
        "school": "воплощение",
        "range": "60 футов",
        "duration": "Мгновенная",
        "components": "В, С",
        "kind": "damage",
        "prepared": true,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "Дальнобойная атака заклинанием наносит урон холодом, и скорость цели снижается на 10 футов до начала твоего следующего хода.",
        "id": "ray-of-frost",
        "name": "Луч холода",
        "level": 0,
        "attack": true,
        "dmgType": "холод",
        "cantripDie": 8,
        "effect": ""
      },
      {
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": false,
        "school": "воплощение",
        "range": "Касание",
        "duration": "1 час",
        "components": "В, М",
        "kind": "utility",
        "prepared": true,
        "always": true,
        "grant": true,
        "onSheet": true,
        "text": "Предмет, которого ты касаешься, светит ярким светом в радиусе 20 футов и тусклым ещё на 20.",
        "id": "light",
        "name": "Свет",
        "level": 0,
        "grantLabel": "Раса: Высший эльф"
      },
      {
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": false,
        "school": "ограждение",
        "range": "Касание",
        "duration": "8 часов",
        "components": "В, С, М",
        "kind": "buff",
        "prepared": true,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "Пока цель без доспеха, её КД равен 13 + модификатор Ловкости.",
        "id": "mage-armor",
        "name": "Доспехи мага",
        "level": 1,
        "effect": "КД 13 + Ловк."
      },
      {
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": false,
        "school": "воплощение",
        "range": "120 футов",
        "duration": "Мгновенная",
        "components": "В, С",
        "kind": "damage",
        "prepared": true,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "Три дротика силового урона автоматически попадают в выбранные цели в пределах дистанции.",
        "id": "magic-missile",
        "name": "Волшебная стрела",
        "level": 1,
        "dmgType": "силовой",
        "effect": "3×1к4+1 силовой"
      },
      {
        "time": "reaction",
        "timeLabel": "1 реакция",
        "ritual": false,
        "concentration": false,
        "school": "ограждение",
        "range": "На себя",
        "duration": "1 раунд",
        "components": "В, С",
        "kind": "buff",
        "prepared": true,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "Реакция, когда тебя атакуют: КД +5 до начала твоего следующего хода, в том числе против вызвавшей атаки. Также ты не получаешь урон от «Волшебной стрелы».",
        "id": "shield",
        "name": "Щит",
        "level": 1,
        "effect": "КД +5"
      },
      {
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": true,
        "concentration": true,
        "school": "прорицание",
        "range": "На себя",
        "duration": "10 минут",
        "components": "В, С",
        "kind": "utility",
        "prepared": false,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "Чувствуешь присутствие магии в пределах 30 футов. Как ритуал — без ячейки, время каста +10 минут.",
        "id": "detect-magic",
        "name": "Обнаружение магии",
        "level": 1
      },
      {
        "time": "action",
        "timeLabel": "1 минута",
        "ritual": true,
        "concentration": false,
        "school": "прорицание",
        "range": "Касание",
        "duration": "Мгновенная",
        "components": "В, С, М",
        "kind": "utility",
        "prepared": false,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "Узнаёшь свойства одного магического предмета или заклинания на существе или предмете. Как ритуал — без ячейки.",
        "id": "identify",
        "name": "Опознавание",
        "level": 1
      },
      {
        "time": "action",
        "timeLabel": "1 минута",
        "ritual": true,
        "concentration": false,
        "school": "ограждение",
        "range": "30 футов",
        "duration": "8 часов",
        "components": "В, С, М",
        "kind": "utility",
        "prepared": false,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "Охраняешь область: при входе незваного существа раздаётся сигнал, слышимый или мысленный. Как ритуал — без ячейки.",
        "id": "alarm",
        "name": "Сигнал тревоги",
        "level": 1
      },
      {
        "time": "action",
        "timeLabel": "1 час",
        "ritual": true,
        "concentration": false,
        "school": "вызов",
        "range": "10 футов",
        "duration": "Мгновенная",
        "components": "В, С, М",
        "kind": "utility",
        "prepared": false,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "Призываешь фамильяра. Как ритуал — без ячейки, время каста +10 минут.",
        "id": "find-familiar",
        "name": "Поиск фамильяра",
        "level": 1
      },
      {
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": true,
        "school": "иллюзия",
        "range": "Касание",
        "duration": "1 час",
        "components": "В, С, М",
        "kind": "buff",
        "prepared": true,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "Цель становится невидимой, пока держится концентрация или пока она не атакует и не наложит заклинание.",
        "id": "invisibility",
        "name": "Невидимость",
        "level": 2
      },
      {
        "time": "bonus",
        "timeLabel": "1 бонусное действие",
        "ritual": false,
        "concentration": false,
        "school": "вызов",
        "range": "На себя",
        "duration": "Мгновенная",
        "components": "В, С",
        "kind": "utility",
        "prepared": true,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "Бонусным действием телепортируешься в видимое свободное пространство в пределах 30 футов.",
        "id": "misty-step",
        "name": "Туманный шаг",
        "level": 2
      },
      {
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": false,
        "school": "воплощение",
        "range": "120 футов",
        "duration": "Мгновенная",
        "components": "В, С",
        "kind": "damage",
        "prepared": true,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "Три луча огня: по каждому — дальнобойная атака заклинанием на 2к6 урона огнём.",
        "id": "scorching-ray",
        "name": "Палящий луч",
        "level": 2,
        "attack": true,
        "dmgType": "огонь",
        "effect": "3 луча, 2к6 огонь"
      },
      {
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": false,
        "school": "иллюзия",
        "range": "На себя",
        "duration": "1 минута",
        "components": "В, С",
        "kind": "buff",
        "prepared": false,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "Три иллюзорных двойника сбивают атаки с тебя, пока не будут уничтожены.",
        "id": "mirror-image",
        "name": "Отражения",
        "level": 2
      },
      {
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": true,
        "school": "преобразование",
        "range": "60 футов",
        "duration": "10 минут",
        "components": "В, С, М",
        "kind": "utility",
        "prepared": false,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "Одно существо или предмет поднимается вертикально до 20 футов и остаётся в воздухе, пока держится концентрация.",
        "id": "levitate",
        "name": "Левитация",
        "level": 2
      },
      {
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": true,
        "school": "преобразование",
        "range": "30 футов",
        "duration": "1 минута",
        "components": "В, С, М",
        "kind": "buff",
        "prepared": false,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "Увеличиваешь или уменьшаешь существо или предмет, пока держится концентрация.",
        "id": "enlarge-reduce",
        "name": "Увеличение",
        "level": 2
      },
      {
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": false,
        "school": "преобразование",
        "range": "60 футов",
        "duration": "Мгновенная",
        "components": "В",
        "kind": "utility",
        "prepared": false,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "Открываешь запертый или магически закрытый объект; раздаётся громкий стук.",
        "id": "knock",
        "name": "Открывание",
        "level": 2
      },
      {
        "time": "reaction",
        "timeLabel": "1 реакция",
        "ritual": false,
        "concentration": false,
        "school": "ограждение",
        "range": "60 футов",
        "duration": "Мгновенная",
        "components": "В, С",
        "kind": "utility",
        "prepared": true,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "Реакция: прерываешь заклинание 3 круга или ниже. Для более высокого круга — проверка характеристики.",
        "id": "counterspell",
        "name": "Контрзаклинание",
        "level": 3
      },
      {
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": false,
        "school": "воплощение",
        "range": "150 футов",
        "duration": "Мгновенная",
        "components": "В, С, М",
        "kind": "damage",
        "prepared": true,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "Вспышка в радиусе 20 футов: существа делают спас Ловкости и получают урон огнём.",
        "id": "fireball",
        "name": "Огненный шар",
        "level": 3,
        "save": "Ловкость",
        "dmgType": "огонь",
        "effect": "8к6 огонь"
      },
      {
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": true,
        "school": "преобразование",
        "range": "Касание",
        "duration": "10 минут",
        "components": "В, С, М",
        "kind": "buff",
        "prepared": true,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "Цель получает скорость полёта 60 футов, пока держится концентрация.",
        "id": "fly",
        "name": "Полёт",
        "level": 3,
        "effect": "скорость полёта 60 фт"
      },
      {
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": true,
        "school": "преобразование",
        "range": "30 футов",
        "duration": "1 минута",
        "components": "В, С, М",
        "kind": "buff",
        "prepared": true,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "Цель удваивает скорость, КД +2, преимущество на спас Ловкости и одно дополнительное действие с ограничениями.",
        "id": "haste",
        "name": "Ускорение",
        "level": 3
      },
      {
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": false,
        "school": "ограждение",
        "range": "120 футов",
        "duration": "Мгновенная",
        "components": "В, С",
        "kind": "utility",
        "prepared": false,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "Оканчиваешь заклинание 3 круга или ниже на цели. Для более высокого круга — проверка характеристики.",
        "id": "dispel-magic",
        "name": "Рассеивание магии",
        "level": 3
      },
      {
        "time": "action",
        "timeLabel": "1 минута",
        "ritual": true,
        "concentration": false,
        "school": "воплощение",
        "range": "На себя (10-футовый купол)",
        "duration": "8 часов",
        "components": "В, С, М",
        "kind": "utility",
        "prepared": false,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "Неподвижный купол на 8 часов. Как ритуал — без ячейки.",
        "id": "tiny-hut",
        "name": "Леомундова хижина",
        "level": 3
      },
      {
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": true,
        "school": "преобразование",
        "range": "60 футов",
        "duration": "1 час",
        "components": "В, С, М",
        "kind": "utility",
        "prepared": true,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "Превращаешь существо в зверя с показателем опасности не выше его уровня, пока держится концентрация.",
        "id": "polymorph",
        "name": "Превращение",
        "level": 4,
        "save": "Мудрость"
      },
      {
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": true,
        "school": "иллюзия",
        "range": "Касание",
        "duration": "1 минута",
        "components": "В, С",
        "kind": "buff",
        "prepared": true,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "Цель становится невидимой до конца длительности, даже если атакует или накладывает заклинания.",
        "id": "greater-invisibility",
        "name": "Высшая невидимость",
        "level": 4
      },
      {
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": false,
        "school": "вызов",
        "range": "500 футов",
        "duration": "Мгновенная",
        "components": "В",
        "kind": "utility",
        "prepared": true,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "Телепортируешь себя и, по желанию, одно согласное существо в пределах 5 футов в точку в пределах дистанции.",
        "id": "dimension-door",
        "name": "Переносящая дверь",
        "level": 4
      },
      {
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": true,
        "school": "ограждение",
        "range": "Касание",
        "duration": "1 час",
        "components": "В, С, М",
        "kind": "buff",
        "prepared": false,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "Цель получает сопротивление дробящему, колющему и рубящему урону немагического оружия.",
        "id": "stoneskin",
        "name": "Каменная кожа",
        "level": 4
      },
      {
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": true,
        "school": "преобразование",
        "range": "60 футов",
        "duration": "10 минут",
        "components": "В, С",
        "kind": "utility",
        "prepared": true,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "Каждым ходом пытаешься двигать существо или предмет силой мысли, пока держится концентрация.",
        "id": "telekinesis",
        "name": "Телекинез",
        "level": 5
      },
      {
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": true,
        "school": "воплощение",
        "range": "120 футов",
        "duration": "10 минут",
        "components": "В, С, М",
        "kind": "utility",
        "prepared": false,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "Невидимая стена или полусфера из силы: почти ничего не проходит сквозь неё, пока держится концентрация.",
        "id": "wall-of-force",
        "name": "Силовая стена",
        "level": 5
      }
    ]
  },
  "sira": {
    "caster": "sorcerer",
    "hasFocus": true,
    "hasPouch": false,
    "shieldCharges": 0,
    "shieldChargesMax": 0,
    "book": [],
    "spells": [
      {
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": false,
        "school": "воплощение",
        "range": "120 футов",
        "duration": "Мгновенная",
        "components": "В, С",
        "kind": "damage",
        "prepared": true,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "Дальнобойная атака заклинанием наносит урон огнём.",
        "id": "fire-bolt",
        "name": "Огненный снаряд",
        "level": 0,
        "attack": true,
        "dmgType": "огонь",
        "cantripDie": 10
      },
      {
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": false,
        "school": "преобразование",
        "range": "10 футов",
        "duration": "Мгновенная",
        "components": "В, С",
        "kind": "utility",
        "prepared": true,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "Небольшой магический трюк.",
        "id": "prestidigitation",
        "name": "Фокусы",
        "level": 0
      },
      {
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": false,
        "school": "воплощение",
        "range": "Касание",
        "duration": "1 час",
        "components": "В, С",
        "kind": "utility",
        "prepared": true,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "Предмет светит ярким светом в радиусе 20 футов.",
        "id": "light",
        "name": "Свет",
        "level": 0
      },
      {
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": true,
        "school": "очарование",
        "range": "На себя",
        "duration": "1 минута",
        "components": "В, С",
        "kind": "utility",
        "prepared": true,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "Преимущество на проверки Харизмы против одного существа, которое не враждебно.",
        "id": "friends",
        "name": "Дружба",
        "level": 0
      },
      {
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": false,
        "school": "вызов",
        "range": "30 футов",
        "duration": "Мгновенная",
        "components": "В, С",
        "kind": "utility",
        "prepared": true,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "Призываешь спектральную руку, которая может манипулировать предметами.",
        "id": "mage-hand",
        "name": "Волшебная рука",
        "level": 0
      },
      {
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": false,
        "school": "воплощение",
        "range": "120 футов",
        "duration": "Мгновенная",
        "components": "В, С",
        "kind": "damage",
        "prepared": true,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "Три дротика силового урона автоматически попадают.",
        "id": "magic-missile",
        "name": "Волшебная стрела",
        "level": 1,
        "dmgType": "силовой",
        "effect": "3×1к4+1 силовой"
      },
      {
        "time": "reaction",
        "timeLabel": "1 реакция",
        "ritual": false,
        "concentration": false,
        "school": "ограждение",
        "range": "На себя",
        "duration": "1 раунд",
        "components": "В, С",
        "kind": "buff",
        "prepared": true,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "Реакция: КД +5 до начала твоего следующего хода.",
        "id": "shield",
        "name": "Щит",
        "level": 1,
        "effect": "КД +5"
      },
      {
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": false,
        "school": "воплощение",
        "range": "90 футов",
        "duration": "Мгновенная",
        "components": "В, С",
        "kind": "damage",
        "prepared": true,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "Дальнобойная атака заклинанием, тип урона выбираешь при касте.",
        "id": "chromatic-orb",
        "name": "Цветной шарик",
        "level": 1,
        "attack": true
      },
      {
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": false,
        "school": "воплощение",
        "range": "120 футов",
        "duration": "Мгновенная",
        "components": "В, С",
        "kind": "damage",
        "prepared": true,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "Три луча огня: по каждому — дальнобойная атака заклинанием.",
        "id": "scorching-ray",
        "name": "Палящий луч",
        "level": 2,
        "attack": true,
        "dmgType": "огонь",
        "effect": "3 луча, 2к6 огонь"
      },
      {
        "time": "bonus",
        "timeLabel": "1 бонусное действие",
        "ritual": false,
        "concentration": false,
        "school": "вызов",
        "range": "На себя",
        "duration": "Мгновенная",
        "components": "В, С",
        "kind": "utility",
        "prepared": true,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "Телепортируешься в видимое свободное пространство в пределах 30 футов.",
        "id": "misty-step",
        "name": "Туманный шаг",
        "level": 2
      },
      {
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": false,
        "school": "иллюзия",
        "range": "На себя",
        "duration": "1 минута",
        "components": "В, С",
        "kind": "buff",
        "prepared": true,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "Создаёшь три иллюзорных двойника, которые отводят атаки.",
        "id": "mirror-image",
        "name": "Зеркальный образ",
        "level": 2
      }
    ]
  },
  "aren": {
    "caster": "paladin",
    "hasFocus": true,
    "hasPouch": false,
    "shieldCharges": 0,
    "shieldChargesMax": 0,
    "book": [],
    "spells": [
      {
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": true,
        "school": "ограждение",
        "range": "Касание",
        "duration": "10 минут",
        "components": "В, С, М",
        "kind": "buff",
        "prepared": true,
        "always": true,
        "grant": true,
        "onSheet": true,
        "text": "Цель защищена от аберраций, исчадий, небожителей, фей, нежити и элементалей, пока держится концентрация.",
        "id": "protection-from-evil",
        "name": "Защита от зла и добра",
        "level": 1,
        "grantLabel": "Клятва Преданности"
      },
      {
        "time": "bonus",
        "timeLabel": "1 бонусное действие",
        "ritual": false,
        "concentration": false,
        "school": "ограждение",
        "range": "30 футов",
        "duration": "1 минута",
        "components": "В, С, М",
        "kind": "buff",
        "prepared": true,
        "always": true,
        "grant": true,
        "onSheet": true,
        "text": "Существо защищено: атакующий должен преуспеть в спасброске Мудрости, иначе выбирает другую цель. Не концентрация. Дано клятвой Преданности.",
        "id": "sanctuary",
        "name": "Укрытие",
        "level": 1,
        "effect": "атакующий должен пройти спас Мудрости",
        "grantLabel": "Клятва Преданности"
      },
      {
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": false,
        "school": "восстановление",
        "range": "Касание",
        "duration": "Мгновенная",
        "components": "В, С",
        "kind": "utility",
        "prepared": true,
        "always": true,
        "grant": true,
        "onSheet": true,
        "text": "Касанием снимаешь одну болезнь или состояние: ослепление, глухоту, паралич или отравление.",
        "id": "lesser-restoration",
        "name": "Малое восстановление",
        "level": 2,
        "grantLabel": "Клятва Преданности"
      },
      {
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": false,
        "school": "очарование",
        "range": "60 футов",
        "duration": "10 минут",
        "components": "В, С",
        "kind": "utility",
        "prepared": true,
        "always": true,
        "grant": true,
        "onSheet": true,
        "text": "В сфере радиусом 15 футов существа, провалившие спас Харизмы, не могут лгать.",
        "id": "zone-of-truth",
        "name": "Зона истины",
        "level": 2,
        "save": "Харизма",
        "grantLabel": "Клятва Преданности"
      },
      {
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": true,
        "school": "очарование",
        "range": "30 футов",
        "duration": "1 минута",
        "components": "В, С, М",
        "kind": "buff",
        "prepared": true,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "До трёх существ получают прибавку 1к4 к броскам атаки и спасброскам, пока держится концентрация.",
        "id": "bless",
        "name": "Благословение",
        "level": 1,
        "effect": "к20 +1к4 к атаке и спасам"
      },
      {
        "time": "action",
        "timeLabel": "1 действие",
        "ritual": false,
        "concentration": false,
        "school": "восстановление",
        "range": "Касание",
        "duration": "Мгновенная",
        "components": "В, С",
        "kind": "heal",
        "prepared": true,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "Касанием восстанавливаешь хиты цели.",
        "id": "cure-wounds",
        "name": "Лечение ран",
        "level": 1
      },
      {
        "time": "bonus",
        "timeLabel": "1 бонусное действие",
        "ritual": false,
        "concentration": true,
        "school": "воплощение",
        "range": "На себя",
        "duration": "1 минута",
        "components": "В, С",
        "kind": "damage",
        "prepared": true,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "Пока держится концентрация, твои атаки оружием наносят дополнительно 1к4 урона излучением.",
        "id": "divine-favor",
        "name": "Божественное благоволение",
        "level": 1,
        "effect": "+1к4 излучение к удару оружием"
      },
      {
        "time": "bonus",
        "timeLabel": "1 бонусное действие",
        "ritual": false,
        "concentration": true,
        "school": "воплощение",
        "range": "На себя",
        "duration": "1 минута",
        "components": "В",
        "kind": "damage",
        "prepared": true,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "Следующее попадание оружием наносит дополнительно 2к6 излучением и делает цель видимой, если она была невидимой.",
        "id": "branding-smite",
        "name": "Клеймящий удар",
        "level": 2,
        "dmgType": "излучение",
        "effect": "+2к6 излучение к следующему удару"
      },
      {
        "time": "bonus",
        "timeLabel": "1 бонусное действие",
        "ritual": false,
        "concentration": true,
        "school": "преобразование",
        "range": "Касание",
        "duration": "1 час",
        "components": "В, С",
        "kind": "buff",
        "prepared": true,
        "always": false,
        "grant": false,
        "onSheet": true,
        "text": "Одно немагическое оружие становится магическим и получает бонус +1 к атаке и урону, пока держится концентрация.",
        "id": "magic-weapon",
        "name": "Магическое оружие",
        "level": 2,
        "effect": "оружие +1"
      }
    ]
  }
};

  const CASTER_NAME_OF = { cleric: "Жрец", druid: "Друид", paladin: "Паладин", wizard: "Волшебник", warlock: "Колдун", bard: "Бард", sorcerer: "Чародей", ranger: "Следопыт", artificer: "Изобретатель" };
  const CASTER_ABIL_RU = { wis: "МУД", int: "ИНТ", cha: "ХАР" };
  const CASTER_ABIL_TITLE = { wis: "Мудрость", int: "Интеллект", cha: "Харизма" };
  const SPELL_ABIL_OF = { cleric: "wis", druid: "wis", paladin: "cha", wizard: "int", warlock: "cha", bard: "cha", sorcerer: "cha", ranger: "wis", artificer: "int" };
  const KNOWN_CAPS = {
    bard: [4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 15, 16, 18, 19, 19, 20, 22, 22, 22],
    sorcerer: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 13, 13, 14, 14, 15, 15, 15, 15],
    warlock: [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15],
    ranger: [0, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11]
  };

  MAGIC_LOADOUTS.brana = {
    caster: "druid",
    hasFocus: true,
    hasPouch: true,
    shieldCharges: 0,
    shieldChargesMax: 0,
    book: [],
    spells: [
      { id: "produce-flame", name: "Сотворение пламени", level: 0, time: "action", timeLabel: "1 действие", ritual: false, concentration: false, school: "вызов", range: "30 футов", duration: "10 минут", components: "В, С", kind: "damage", attack: true, dmgType: "огонь", cantripDie: 8, prepared: true, always: false, grant: false, onSheet: true, text: "Пламя в руке светит и может быть брошено дальнобойной атакой заклинанием на урон огнём." },
      { id: "druidcraft", name: "Друидизм", level: 0, time: "action", timeLabel: "1 действие", ritual: false, concentration: false, school: "преобразование", range: "30 футов", duration: "Мгновенная", components: "В, С", kind: "utility", prepared: true, always: false, grant: false, onSheet: true, text: "Малый природный трюк: предсказать погоду, распустить бутон, вспыхнуть огонёк, создать запах." },
      { id: "thorn-whip", name: "Терновый кнут", level: 0, time: "action", timeLabel: "1 действие", ritual: false, concentration: false, school: "преобразование", range: "30 футов", duration: "Мгновенная", components: "В, С, М", kind: "damage", attack: true, dmgType: "колющий", cantripDie: 6, prepared: true, always: false, grant: false, onSheet: true, text: "Рукопашная атака заклинанием на дистанции: урон колющим и подтягиваешь существо на 10 футов." },
      { id: "goodberry", name: "Ягоды", level: 1, time: "action", timeLabel: "1 действие", ritual: false, concentration: false, school: "преобразование", range: "Касание", duration: "Мгновенная", components: "В, С, М", kind: "heal", effect: "10 ягод, по 1 хиту", prepared: true, always: false, grant: false, onSheet: true, text: "Создаёшь десять ягод: каждая восстанавливает 1 хит и даёт пропитание на день." },
      { id: "entangle", name: "Опутывание", level: 1, time: "action", timeLabel: "1 действие", ritual: false, concentration: true, school: "вызов", range: "90 футов", duration: "1 минута", components: "В, С", kind: "utility", save: "Сила", prepared: true, always: false, grant: false, onSheet: true, text: "В квадрате 20 футов прорастают растения: существа делают спас Силы или становятся опутанными." },
      { id: "faerie-fire", name: "Волшебный огонёк", level: 1, time: "action", timeLabel: "1 действие", ritual: false, concentration: true, school: "воплощение", range: "60 футов", duration: "1 минута", components: "В", kind: "utility", save: "Ловкость", prepared: true, always: false, grant: false, onSheet: true, text: "Объекты и существа в кубе 20 футов очерчены светом: атаки по ним с преимуществом, пока те не скроются." },
      { id: "healing-word", name: "Лечащее слово", level: 1, time: "bonus", timeLabel: "1 бонусное действие", ritual: false, concentration: false, school: "восстановление", range: "60 футов", duration: "Мгновенная", components: "В", kind: "heal", prepared: true, always: false, grant: false, onSheet: true, text: "Существо в пределах дистанции восстанавливает хиты. Бонусное действие." },
      { id: "moonbeam", name: "Луч луны", level: 2, time: "action", timeLabel: "1 действие", ritual: false, concentration: true, school: "воплощение", range: "120 футов", duration: "1 минута", components: "В, С, М", kind: "damage", save: "Телосложение", dmgType: "излучение", effect: "2к10 излучение", prepared: true, always: false, grant: false, onSheet: true, text: "Цилиндр серебряного света: существа в нём делают спас Телосложения от урона излучением. Перемещается бонусным действием." },
      { id: "spike-growth", name: "Шипы", level: 2, time: "action", timeLabel: "1 действие", ritual: false, concentration: true, school: "преобразование", range: "150 футов", duration: "10 минут", components: "В, С, М", kind: "damage", dmgType: "колющий", effect: "2к4 колющий за 5 фт", prepared: true, always: false, grant: false, onSheet: true, text: "Земля в радиусе 20 футов становится труднопроходимой и ранит шипами тех, кто по ней идёт." },
      { id: "pass-without-trace", name: "Без следа", level: 2, time: "action", timeLabel: "1 действие", ritual: false, concentration: true, school: "ограждение", range: "На себя", duration: "1 час", components: "В, С, М", kind: "buff", effect: "+10 к Скрытности", prepared: true, always: false, grant: false, onSheet: true, text: "Ты и спутники в 30 футах получаете +10 к проверкам Скрытности и не оставляют следов, пока держится концентрация." },
      { id: "enhance-ability", name: "Усиление характеристики", level: 2, time: "action", timeLabel: "1 действие", ritual: false, concentration: true, school: "преобразование", range: "Касание", duration: "1 час", components: "В, С, М", kind: "buff", prepared: false, always: false, grant: false, onSheet: false, text: "Цель получает преимущество на проверки одной характеристики, пока держится концентрация." },
      { id: "conjure-animals", name: "Призыв животных", level: 3, time: "action", timeLabel: "1 действие", ritual: false, concentration: true, school: "вызов", range: "60 футов", duration: "1 час", components: "В, С", kind: "utility", prepared: true, always: false, grant: false, onSheet: true, text: "Призываешь духов в облике зверей, которые помогают тебе, пока держится концентрация." },
      { id: "call-lightning", name: "Призыв молнии", level: 3, time: "action", timeLabel: "1 действие", ritual: false, concentration: true, school: "вызов", range: "120 футов", duration: "10 минут", components: "В, С", kind: "damage", save: "Ловкость", dmgType: "электричество", effect: "3к10 электричество", prepared: true, always: false, grant: false, onSheet: true, text: "Грозовая туча: при наложении и затем бонусным действием бьёшь молнией в точку под тучей." },
      { id: "freedom-of-movement", name: "Свобода перемещения", level: 4, time: "action", timeLabel: "1 действие", ritual: false, concentration: false, school: "ограждение", range: "Касание", duration: "1 час", components: "В, С, М", kind: "buff", prepared: true, always: false, grant: false, onSheet: true, text: "Цель не замедляют труднопроходимая местность и магические ограничения скорости, её трудно схватить или опутать." }
    ]
  };

  const CASTER_SLUGS = ["cleric", "druid", "paladin", "wizard", "bard", "sorcerer", "warlock", "ranger", "artificer"];
  const PREPARE_SLUGS = ["cleric", "druid", "paladin", "wizard", "artificer"];
  const SCHOOL_ICON = {
    "воплощение": "sch-evocation",
    "восстановление": "sch-evocation",
    "очарование": "sch-enchantment",
    "прорицание": "sch-divination",
    "ограждение": "sch-abjuration",
    "вызов": "sch-conjuration",
    "иллюзия": "sch-illusion",
    "некромантия": "sch-necromancy",
    "преобразование": "sch-transmutation"
  };

  function resetMagicUi() {
    state.combatPane = "attacks";
    state.spellFilter = "all";
    state.circleFilter = "";
    state.spellQuery = "";
    state.spellOrder = {};
    state.circlesCollapsed = false;
    state.collapsedCircles = {};
    state.expandedSpell = "";
    state.prepareTab = "prepared";
    state.customSpellDraft = { name: "", level: 1, ritual: false, concentration: false, text: "" };
    state.settingsAdvanced = false;
    state.concPending = null;
    state.castSpellId = "";
    state.castPath = "slot";
    state.castSlot = 0;
    state.grimoireCaster = "";
    state.bookLost = false;
  }

  function applyMagicLoadout(id) {
    const load = MAGIC_LOADOUTS[id];
    if (!load) {
      sheet.hasFocus = false;
      sheet.hasPouch = false;
      sheet.bookLost = false;
      sheet.shieldCharges = 0;
      sheet.shieldChargesMax = 0;
      sheet.pactSlots = { cur: 0, max: 0, level: 1 };
      sheet.grimoireCaster = "";
      sheet.customSpells = [];
      sheet.ritualBookExtra = [];
      sheet.spellLib = {};
      sheet.wizardBook = [];
      return;
    }
    sheet.hasFocus = !!load.hasFocus;
    sheet.hasPouch = !!load.hasPouch;
    sheet.bookLost = false;
    sheet.shieldCharges = load.shieldCharges || 0;
    sheet.shieldChargesMax = load.shieldChargesMax || 0;
    sheet.pactSlots = sheet.pactSlots || { cur: 0, max: 0, level: 1 };
    sheet.grimoireCaster = load.caster || "";
    sheet.customSpells = [];
    sheet.ritualBookExtra = [];
    const map = {};
    (load.spells || []).forEach(function (s) { map[s.id] = clone(s); });
    sheet.spellLib = map;
    sheet.wizardBook = (load.book || []).map(function (s) { return clone(s); });
  }

  function sheetMainClass() {
    return (sheet.classes && sheet.classes[0]) || { id: "cleric", name: "Жрец", subclass: "", level: sheet.level || 1 };
  }

  function casterKeysNow() {
    const keys = (sheet.classes || []).map((c) => String(c.id || "").toLowerCase()).filter((id) => CASTER_SLUGS.indexOf(id) >= 0);
    if (keys.length) return keys;
    if (sheet.caster) return [sheetMainClass().id || "cleric"];
    return [];
  }

  function isPreparingClass(key) {
    return PREPARE_SLUGS.indexOf(key) >= 0;
  }

  function hasWizardCaster() {
    return casterKeysNow().indexOf("wizard") >= 0;
  }

  function hasWarlockCaster() {
    return casterKeysNow().indexOf("warlock") >= 0;
  }

  function sheetHasMagicSources() {
    if (CASTER_SLUGS.indexOf(String(sheetMainClass().id || "").toLowerCase()) >= 0) return true;
    if (sheet.pactSlots && sheet.pactSlots.max > 0) return true;
    const slots = sheet.slots || {};
    if (Object.keys(slots).some((lv) => slots[lv] && slots[lv].max > 0)) return true;
    if (allAccessibleSpells().some((s) => s && s.onSheet !== false)) return true;
    return false;
  }

  function showMagicUi() {
    return isCaster() && sheetHasMagicSources();
  }

  function allAccessibleSpells() {
    const lib = sheet.spellLib || {};
    return Object.keys(lib).map((id) => lib[id]).concat(sheet.customSpells || [], sheet.ritualBookExtra || []);
  }

  function spellById(id) {
    return allAccessibleSpells().find((s) => s.id === id) || null;
  }

  function isGrantSibling(sp) {
    if (!sp || !sp.id) return false;
    const id = String(sp.id);
    return id.indexOf("feat-spell:") === 0 || id.indexOf("gear-spell:") === 0;
  }

  function isWizardBookRitual(sp) {
    if (!sp || !sp.ritual || (sp.level || 0) <= 0) return false;
    if (sp.prepared) return false;
    if (!hasWizardCaster()) return false;
    if (sheet.bookLost) return false;
    if (sp.ritualFromBook) return true;
    return (sheet.wizardBook || []).some((w) => w.ritual && w.name === sp.name && !w.prepared);
  }

  function visibleOnPanel(sp) {
    if (!sp) return false;
    if (isGrantSibling(sp)) return false;
    if (sp.level <= 0) return true;
    if (isWizardBookRitual(sp)) return true;
    if (sp.prepared || sp.always || sp.grant) return true;
    return false;
  }

  function countsTowardLimit(sp) {
    return !!(sp && sp.level > 0 && sp.prepared && !sp.always && !sp.grant);
  }

  function classLevelOf(key) {
    const row = (sheet.classes || []).find((c) => String(c.id || "").toLowerCase() === key);
    return (row && row.level) || sheet.level || 1;
  }

  function preparedCapFor(key) {
    const slug = key || String(sheetMainClass().id || "cleric").toLowerCase();
    const lvl = classLevelOf(slug);
    const abil = SPELL_ABIL_OF[slug] || "wis";
    const mod = ability(abil);
    if (slug === "paladin" || slug === "ranger") return Math.max(1, mod + Math.floor(lvl / 2));
    return Math.max(1, mod + lvl);
  }

  function preparedUsedFor(key) {
    return allAccessibleSpells().filter((s) => s.onSheet !== false && countsTowardLimit(s) && spellClassOf(s) === key).length;
  }

  function alwaysPreparedCountFor(key) {
    return allAccessibleSpells().filter((s) => s.onSheet !== false && s.level > 0 && s.always && (s.prepared || s.grant) && spellClassOf(s) === key).length;
  }

  function spellClassOf(sp) {
    if (sp && sp.casterClass) return sp.casterClass;
    const keys = casterKeysNow();
    return keys[0] || String(sheetMainClass().id || "").toLowerCase();
  }

  function knownUsedFor(key) {
    return allAccessibleSpells().filter((s) => s.onSheet !== false && (s.level || 0) > 0 && !isGrantSibling(s) && visibleOnPanel(s) && spellClassOf(s) === key).length;
  }

  function casterQuotaText(key) {
    if (key === "wizard") {
      const used = preparedUsedFor(key);
      const cap = preparedCapFor(key);
      return "подг. " + used + "/" + cap + ", в книге " + ((sheet.wizardBook || []).length);
    }
    if (key === "warlock") {
      const p = sheet.pactSlots || { cur: 0, max: 0, level: 1 };
      if (p.max) return "договор " + (p.cur || 0) + "/" + p.max;
    }
    if (KNOWN_CAPS[key]) {
      const lvl = Math.max(1, Math.min(20, classLevelOf(key)));
      const cap = KNOWN_CAPS[key][lvl - 1];
      const used = knownUsedFor(key);
      return cap != null ? ("известные " + used + "/" + cap) : ("известные " + used);
    }
    const used = preparedUsedFor(key);
    const cap = preparedCapFor(key);
    const always = alwaysPreparedCountFor(key);
    if (always) return "подг. " + used + "/" + cap + " · всегда " + always;
    return "подг. " + used + "/" + cap;
  }

  function liveSpellStats(key) {
    const abil = SPELL_ABIL_OF[key] || "int";
    const mod = ability(abil);
    const p = pb();
    const atk = p + mod;
    return { key: key, abil: abil, mod: mod, pb: p, dc: 8 + p + mod, atk: atk, atkLabel: (atk >= 0 ? "+" : "") + atk };
  }

  function liveCasterProfile(key) {
    const live = liveSpellStats(key);
    const name = CASTER_NAME_OF[key] || key;
    return {
      name: name,
      abil: CASTER_ABIL_RU[live.abil] || live.abil.toUpperCase(),
      cls: live.abil || "wis",
      dc: live.dc,
      atk: live.atkLabel,
      quota: casterQuotaText(key),
      title: name + " · " + (CASTER_ABIL_TITLE[live.abil] || "")
    };
  }

  function isLifeClericNow() {
    const mc = sheetMainClass();
    return String(mc.id || "").toLowerCase() === "cleric" && /Жизнь/i.test(mc.subclass || "");
  }

  function cantripDiceCount() {
    const lv = sheet.level || 1;
    return lv >= 17 ? 4 : lv >= 11 ? 3 : lv >= 5 ? 2 : 1;
  }

  function discipleBonus(slot) { return 2 + Number(slot || 1); }

  function casterSpellMod(key) {
    const k = key || casterKeysNow()[0] || String(sheetMainClass().id || "cleric").toLowerCase();
    return ability(SPELL_ABIL_OF[k] || "wis");
  }

  function spellDamagePreview(sp, slot) {
    if (!sp) return "";
    const lv = Math.max(sp.level || 0, Number(slot) || sp.level || 0);
    const mod = casterSpellMod();
    const disc = isLifeClericNow() ? discipleBonus(lv) : 0;
    if (sp.cantripDie) return cantripDiceCount() + "к" + sp.cantripDie + (sp.dmgType ? (" " + sp.dmgType) : "");
    if (sp.id === "sacred-flame") return cantripDiceCount() + "к8 излучение";
    if (sp.id === "cure-wounds") return lv + "к8+" + (mod + disc) + " хитов";
    if (sp.id === "prayer-of-healing") return lv + "к8+" + (mod + disc) + " хитов (до 6 существ)";
    if (sp.id === "healing-word") return lv + "к4+" + (mod + disc) + " хитов";
    if (sp.id === "spiritual-weapon") {
      const dice = 1 + Math.floor((lv - 2) / 2);
      return dice + "к8+" + mod + " силовой";
    }
    if (sp.id === "guiding-bolt") return (3 + lv) + "к6 излучение";
    if (sp.id === "spirit-guardians") return lv + "к8 излучение";
    if (sp.id === "aid") return "макс. и текущие хиты +" + (5 + 5 * (lv - 2));
    if (sp.effect) return sp.effect;
    return "";
  }

  function spellLevelLabel(lv) {
    const n = Number(lv) || 0;
    return n <= 0 ? "Заговоры" : n + "-й круг";
  }

  function schoolIconOf(sp) {
    return SCHOOL_ICON[(sp && sp.school) || ""] || "";
  }

  function itemSourceName(sp) {
    if (!sp) return "";
    if (sp.id === "shield-of-faith" || (sp.itemCast && sp.itemCast.resourceId === "item-shield-faith")) {
      return "Амулет неувядающей молитвы";
    }
    if (sp.itemCast && sp.itemCast.itemName && sp.itemCast.itemName !== "Наложение щита" && sp.itemCast.itemName !== "Предмет") {
      return sp.itemCast.itemName;
    }
    return "";
  }

  function grantLabelOf(sp) {
    if (!sp) return "";
    const itemName = itemSourceName(sp);
    if (itemName) return itemName;
    if (sp.grantLabel && sp.grantLabel !== "Архетип" && sp.grantLabel !== "Предмет") return sp.grantLabel;
    if (sp.grantCast && sp.grantCast.label) return sp.grantCast.label;
    return sp.grantLabel || "";
  }

  function panelSpells() {
    return allAccessibleSpells().filter(visibleOnPanel);
  }

  function maxSlotLevel() {
    const slots = sheet.slots || {};
    const levels = Object.keys(slots).map(Number).filter((n) => slots[n] && slots[n].max > 0);
    const fromSpells = panelSpells().map((s) => s.level || 0);
    return Math.max(0, ...(levels.length ? levels : [0]), ...(fromSpells.length ? fromSpells : [0]));
  }

  function sortSpellsAlpha(list) {
    return list.slice().sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "ru", { sensitivity: "base" }));
  }

  function orderedCircleSpells(level, list) {
    const ids = (state.spellOrder && state.spellOrder[String(level)]) || [];
    if (!ids.length) return sortSpellsAlpha(list);
    const map = {};
    list.forEach((s) => { map[s.id] = s; });
    const out = [];
    ids.forEach((id) => { if (map[id]) { out.push(map[id]); delete map[id]; } });
    out.push.apply(out, sortSpellsAlpha(Object.keys(map).map((id) => map[id])));
    return out;
  }

  function spellPassesFilters(sp) {
    const f = state.spellFilter || "all";
    let on = f === "all";
    if (f === "cantrips") on = (sp.level || 0) <= 0;
    if (f === "rituals") on = !!sp.ritual;
    if (f === "concentration") on = !!sp.concentration;
    if (f === "ritual_book") on = isWizardBookRitual(sp);
    if (state.circleFilter !== "" && state.circleFilter != null) {
      if (String(sp.level || 0) !== String(state.circleFilter)) on = false;
    }
    const q = (state.spellQuery || "").trim().toLowerCase();
    if (q) {
      const blob = [sp.name, sp.text, sp.school, sp.effect, grantLabelOf(sp)].join(" ").toLowerCase();
      if (blob.indexOf(q) < 0) on = false;
    }
    return on;
  }

  function renderCastChips() {
    const keys = casterKeysNow();
    if (!keys.length) return "";
    return `<div class="spell-cast-col" data-cast-row>` + keys.map((key) => {
      const prof = liveCasterProfile(key);
      return `<button type="button" class="cast-chip is-${esc(prof.cls || "wis")}" data-open-cast-break="${esc(key)}" title="${esc(prof.title)}" aria-label="Сл. спас. и атака заклинаний, ${esc(prof.name)}"><span class="cast-chip__profile">${esc(prof.name)} · <span class="cast-chip__abil">${esc(prof.abil)}</span> · Сл ${prof.dc} · ${esc(prof.atk)}</span><span class="cast-chip__quota">${esc(prof.quota)}</span></button>`;
    }).join("") + `</div>`;
  }

  function renderSpellHeader() {
    const gear = state.scene !== "combat"
      ? `<button type="button" class="spell-gear" data-open-spell-settings aria-label="Настроить магию" title="Настроить магию"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#ico-settings"/></svg></button>`
      : "";
    return `<div class="spell-cast-row${gear ? " is-with-gear" : ""}">
      ${renderCastChips()}
      ${gear}
    </div>`;
  }

  function renderSpellTools() {
    const focusOn = !!sheet.hasFocus;
    const pouchOn = !!sheet.hasPouch;
    const wizard = hasWizardCaster();
    const preparing = casterKeysNow().some(isPreparingClass);
    const prepareBtn = preparing
      ? `<button type="button" class="chip" data-open-prepare>Подготовить</button>`
      : "";
    const grimBtn = wizard
      ? `<button type="button" class="chip" data-open-grimoire>Гримуар</button>`
      : "";
    return `<div class="spell-head-tools">
      <button type="button" class="spell-gear" data-open-spell-settings aria-label="Настройки магии" title="Настройки магии"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#ico-settings"/></svg></button>
      ${prepareBtn}${grimBtn}
      <button type="button" class="chip${focusOn ? " is-on" : ""}" data-toggle-focus>${focusOn ? "Фокус ✓" : "Фокус ✗"}</button>
      <button type="button" class="chip${pouchOn ? " is-on" : ""}" data-toggle-pouch>${pouchOn ? "Мешочек ✓" : "Мешочек ✗"}</button>
    </div>`;
  }

  function renderSpellFilters() {
    const wizard = hasWizardCaster() && !sheet.bookLost && panelSpells().some(isWizardBookRitual);
    const filters = [
      ["all", "все"],
      ["cantrips", "заговоры"],
      ["rituals", "ритуалы"],
      ["concentration", "концентрация"]
    ];
    if (wizard) filters.push(["ritual_book", "ритуалы из книги"]);
    const fHtml = filters.map(([id, lab]) =>
      `<button type="button" class="chip${state.spellFilter === id ? " is-on" : ""}" data-spell-filter="${id}">${lab}</button>`
    ).join("");
    const maxLv = maxSlotLevel();
    const circ = [];
    for (let i = 0; i <= maxLv; i++) circ.push(i);
    const cHtml = circ.map((n) =>
      `<button type="button" class="chip${String(state.circleFilter) === String(n) ? " is-on" : ""}" data-circle-filter="${n}">${n === 0 ? "0" : String(n)}</button>`
    ).join("");
    return `<div class="spell-filter-row" data-inv="spell-filters">${fHtml}<span class="spell-filter-sep" aria-hidden="true"></span>${cHtml}</div>
      <div class="spell-search-row">
        <input class="spell-search" type="search" data-spell-search value="${esc(state.spellQuery || "")}" placeholder="Поиск заклинания" aria-label="Поиск заклинания">
        <button type="button" class="spell-ico-btn" data-collapse-all aria-label="Свернуть все" title="Свернуть все"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#ico-collapse-all"/></svg></button>
        <button type="button" class="spell-ico-btn" data-expand-all aria-label="Развернуть все" title="Развернуть все"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#ico-expand-all"/></svg></button>
        <button type="button" class="spell-ico-btn" data-reset-order aria-label="Сбросить порядок (А–Я)" title="Сбросить порядок (А–Я)"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#ico-az-reset"/></svg></button>
      </div>`;
  }

  function slotPips(level) {
    const slot = (sheet.slots || {})[level];
    if (!slot || !slot.max) return "";
    let html = `<div class="circle-slots" aria-label="Ячейки ${level}-го круга ${slot.cur} из ${slot.max}">`;
    for (let i = 0; i < slot.max; i++) {
      html += `<button type="button" class="pip${i < slot.cur ? " is-on" : ""}" data-toggle-slot="${level}:${i}" aria-label="Ячейка ${i + 1}"></button>`;
    }
    html += `</div>`;
    return html;
  }

  function splitDamagePreview(text) {
    if (!text) return null;
    const raw = String(text).trim();
    let m = raw.match(/^КД\s*([+\-−]?\d+)$/i);
    if (m) {
      const n = m[1];
      return { num: (n.charAt(0) === "+" || n.charAt(0) === "-" || n.charAt(0) === "−") ? n : ("+" + n), cap: "КД" };
    }
    m = raw.match(/^КД\s+(.+)$/i);
    if (m) return { num: m[1].replace(/\s+/g, ""), cap: "КД" };
    m = raw.match(/(?:к20\s*)?([+\-−]?\d*к\d+)\s*к\s*атаке и спасам/i);
    if (m) {
      const n = m[1];
      return { num: (n.charAt(0) === "+" || n.charAt(0) === "-" || n.charAt(0) === "−") ? n : ("+" + n), cap: "атака и спасы" };
    }
    m = raw.match(/^(.+?)\s+хитов(.*)$/i);
    if (m) {
      let cap = "хиты";
      const extra = (m[2] || "").trim();
      if (/до\s*6/i.test(extra)) cap = "хиты, до 6";
      else if (extra) cap = ("хиты " + extra).trim();
      return { num: m[1].trim(), cap: cap };
    }
    m = raw.match(/^макс\.\s*и текущие хиты\s*([+\-−]\d+)$/i);
    if (m) return { num: m[1], cap: "макс. и текущие хиты" };
    m = raw.match(/^скорость полёта\s+(.+)$/i);
    if (m) return { num: m[1], cap: "полёт" };
    m = raw.match(/^(\d+)\s*луча,\s*(\d+к\d+)\s+(.+)$/i);
    if (m) return { num: m[1] + "×" + m[2], cap: m[3] };
    const types = "излучение|огонь|холод|силовой|кислота|некротика|яд|молния|звук|дробящий|колющий|рубящий|психический";
    m = raw.match(new RegExp("^(.+?)\\s+(" + types + ")$", "i"));
    if (m) return { num: m[1].trim(), cap: m[2] };
    if ((/[кk]\d/.test(raw) || /^[+\-−]?\d/.test(raw)) && raw.length <= 14) return { num: raw, cap: "" };
    return null;
  }


  function shortSpellTime(sp) {
    const t = String((sp && sp.time) || "");
    const lab = String((sp && sp.timeLabel) || "");
    if (t === "bonus" || /бонус/i.test(lab)) return "бонус";
    if (t === "reaction" || /реакц/i.test(lab)) return "реакция";
    if (t === "action" || lab === "1 действие") return "действие";
    return shortSpellDuration(lab || t) || lab || t || "—";
  }
  function shortSpellRange(r) {
    if (!r) return "—";
    return String(r).replace(/футов/g, "фт").replace(/фута/g, "фт").replace(/фут\b/g, "фт");
  }
  function shortSpellComps(c) {
    if (!c) return "—";
    return String(c).replace(/\s*,\s*/g, "/").replace(/\s+/g, "");
  }
  function shortSpellDuration(d) {
    if (!d || /^мгновен/i.test(d)) return "";
    return String(d)
      .replace(/минут[аы]?/g, "мин")
      .replace(/часов/g, "ч")
      .replace(/часа/g, "ч")
      .replace(/час\b/g, "ч")
      .replace(/\s+/g, " ")
      .trim();
  }
  function spellAtkOrSave(sp) {
    if (sp && sp.attack) return "атака";
    if (sp && sp.save) {
      const key = (typeof casterKeysNow === "function" && casterKeysNow()[0]) || "";
      const live = (typeof liveSpellStats === "function") ? liveSpellStats(key) : null;
      const dc = live && live.dc;
      const short = { "Ловкость": "Ловк.", "Мудрость": "Мудр.", "Сила": "Сил.", "Телосложение": "Тел.", "Интеллект": "Инт.", "Харизма": "Хар." };
      const s = short[sp.save] || sp.save;
      return dc != null ? ("Сл " + dc + " " + s) : s;
    }
    return "—";
  }
  function spellMetaLine(sp) {
    const bits = [
      shortSpellTime(sp),
      shortSpellRange(sp && sp.range),
      spellAtkOrSave(sp),
      shortSpellComps(sp && sp.components),
      (sp && sp.school) || ""
    ];
    const dur = shortSpellDuration(sp && sp.duration);
    if (dur) bits.push(dur);
    return bits.filter(Boolean).join(" · ");
  }
  function spellShortMeta(sp) {
    const bits = [shortSpellTime(sp), shortSpellRange(sp && sp.range)].filter(Boolean);
    return bits.join(" · ");
  }
  function spellLevelLine(sp) {
    let lab = (sp.level <= 0 ? "заговор" : (sp.level + " ур."));
    if (sp.id === "shield-of-faith" && sheet.shieldChargesMax) {
      lab += " · " + sheet.shieldCharges + "/" + sheet.shieldChargesMax + " зар.";
    }
    return lab;
  }
  function shortAbilFromWord(w) {
    const s = String(w || "").toLowerCase().replace(/[.]/g, "");
    const map = {
      мудрости: "МУД", мудрость: "МУД", мудр: "МУД",
      ловкости: "ЛОВ", ловкость: "ЛОВ", ловк: "ЛОВ",
      силы: "СИЛ", сила: "СИЛ", сил: "СИЛ",
      телосложения: "ТЕЛ", телосложение: "ТЕЛ", тел: "ТЕЛ",
      интеллекта: "ИНТ", интеллект: "ИНТ", инт: "ИНТ",
      харизмы: "ХАР", харизма: "ХАР", хар: "ХАР"
    };
    return map[s] || "";
  }
  function spellBadgeParts(sp) {
    const preview = spellDamagePreview(sp, sp.level) || "";
    if (!preview) return null;
    const hasDice = /\d*к\d+/i.test(preview);
    const saveM = preview.match(/спас(?:броске|бросок|а)?\s+([А-Яа-яЁё.]+)/i);
    if (saveM && !hasDice) {
      const ab = shortAbilFromWord(saveM[1]) || saveM[1];
      return { head: "спас " + ab, caption: "", title: preview, shortened: true };
    }
    const kd = preview.match(/^КД\s*(.+)$/);
    if (kd) return { head: kd[1].trim(), caption: "КД", title: preview };
    const dice = preview.match(/^([+]?(?:\d+×)?(?:к\d+|\d+к\d+)(?:\s*\+\s*(?:\d+к\d+|к\d+|\d+))*)\s*(.*)$/i);
    if (dice && /к\d+/i.test(dice[1])) {
      return { head: dice[1].replace(/\s+/g, " ").trim(), caption: (dice[2] || "").trim(), title: preview };
    }
    const mid = preview.match(/^(.*?)(\d+к\d+(?:[+\-]\d+)?)\s*(.*)$/i);
    if (mid && /к\d+/i.test(mid[2])) {
      return { head: mid[2], caption: (mid[3] || "").trim(), title: preview };
    }
    const ft = preview.match(/^(.*?)\s+(\d+\s*фт)$/i);
    if (ft) return { head: ft[2], caption: ft[1].trim(), title: preview };
    const trail = preview.match(/^(.*?)\s+([+\-]?\d+)$/);
    if (trail && trail[1]) return { head: trail[2], caption: trail[1].trim(), title: preview };
    return { head: preview, caption: "", title: preview };
  }
  function compactBadgeCaption(cap) {
    if (!cap) return "";
    const cut = String(cap).match(/^([^\(\[]+?)\s*[\(\[]/);
    if (cut) return cut[1].trim();
    return cap;
  }

  function spellCardHtml(sp) {
    const src = grantLabelOf(sp);
    const srcChip = (src && (sp.grant || sp.always || sp.itemCast))
      ? `<span class="spl-src" title="${esc(src)}">${esc(src)}</span>`
      : "";
    const customChip = sp.custom ? `<span class="spl-tag">своё</span>` : "";
    const flags = [];
    if (sp.concentration) flags.push(`<span class="spell-flag is-conc" title="Концентрация">конц.</span>`);
    if (sp.ritual) flags.push(`<span class="spell-flag" title="${isWizardBookRitual(sp) ? "Не подготовлено · ритуал из книги" : "Ритуал"}">ритуал${isWizardBookRitual(sp) ? " · из книги" : ""}</span>`);
    if (srcChip) flags.push(srcChip);
    if (customChip) flags.push(customChip);
    const parts = spellBadgeParts(sp);
    const badgeCap = parts ? compactBadgeCaption(parts.caption) : "";
    const badge = parts
      ? `<div class="spl-badge" title="${esc(parts.title)}"><b>${esc(parts.head)}</b>${badgeCap ? `<span>${esc(badgeCap)}</span>` : ""}</div>`
      : "";
    const school = schoolIconOf(sp);
    const art = school
      ? `<div class="spl-art" aria-hidden="true"><svg class="icon-ink" viewBox="0 0 96 96" width="96" height="96" preserveAspectRatio="xMidYMid meet"><use href="#${esc(school)}"/></svg></div>`
      : `<div class="spl-art" aria-hidden="true"></div>`;
    const metaFull = spellMetaLine(sp);
    const levelLab = spellLevelLine(sp);
    const open = state.expandedSpell === sp.id;
    const icos = [];
    if (sp.concentration) icos.push(`<svg class="spl-ico is-conc" viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" focusable="false"><title>Концентрация</title><use href="#ico-concentration"/></svg>`);
    if (sp.ritual) icos.push(`<svg class="spl-ico is-ritual" viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" focusable="false"><title>${isWizardBookRitual(sp) ? "Ритуал из книги" : "Ритуал"}</title><use href="#ico-ritual"/></svg>`);
    const moreFlags = flags.length ? `<div class="spl-tags">${flags.join("")}</div>` : "";
    const more = `<div class="spl-more"${open ? "" : " hidden"}>
        ${moreFlags}
        <p class="spl-meta is-more" title="${esc(metaFull)}">${esc(metaFull)}</p>
        <div class="spl-desc">${esc(sp.text || "")}</div>
      </div>`;
    return `<article class="spl-card${sp.grant || sp.always ? " is-granted" : ""}${open ? " is-expanded" : ""}" data-spell data-spell-id="${esc(sp.id)}" data-spell-expand="${esc(sp.id)}" data-circle="${sp.level || 0}"${sp.concentration ? " data-conc=\"1\"" : ""}${isWizardBookRitual(sp) ? " data-ritual-book=\"1\"" : ""}>
      ${art}
      <div class="spl-main">
        <div class="spl-body">
          <div class="spl-head">
            <div class="spl-name-row">
              <span class="spl-grip" aria-hidden="true"><i></i><i></i></span>
              <span class="spl-name-core">
                <button type="button" class="spl-name" data-spell-expand="${esc(sp.id)}">${esc(sp.name)}</button>
                <span class="spell-level">${esc(levelLab)}</span>
                ${icos.length ? `<span class="spl-meta-flags">${icos.join("")}</span>` : ""}
              </span>
              ${srcChip}
              ${customChip}
            </div>
            <p class="spl-meta is-full" title="${esc(metaFull)}">${esc(metaFull)}</p>
          </div>
          <div class="spl-actions">
            ${badge}
            <button type="button" class="spl-cast" data-open-cast="${esc(sp.id)}">Каст</button>
            ${sp.custom ? `<button type="button" class="btn" data-del-custom-spell="${esc(sp.id)}">Удалить</button>` : ""}
          </div>
        </div>
      </div>
      ${more}
    </article>`;
  }

  function renderSpellList() {
    if (hasWizardCaster() && sheet.bookLost) {
      return `<p class="book-lost-note">Книга утеряна: подготовка из книги и ритуалы из книги недоступны.</p>` + renderVisibleCircles();
    }
    return renderVisibleCircles();
  }

  function renderVisibleCircles() {
    const groups = {};
    panelSpells().forEach((s) => {
      const lv = s.level || 0;
      if (!groups[lv]) groups[lv] = [];
      groups[lv].push(s);
    });
    const levels = Object.keys(groups).map(Number).sort((a, b) => a - b);
    if (!levels.length) return `<p class="flags">Нет заклинаний, подходящих под фильтр.</p>`;
    return `<div data-spell-list>` + levels.map((lv) => {
      const all = orderedCircleSpells(lv, groups[lv]);
      const vis = all.filter(spellPassesFilters);
      if (!vis.length) return "";
      const collapsed = !!(state.collapsedCircles && state.collapsedCircles[String(lv)]) || !!state.circlesCollapsed;
      const chev = collapsed ? "▸" : "▾";
      return `<section class="spell-circle${collapsed ? " is-collapsed" : ""}" data-circle="${lv}">
        <div class="circle-toolbar" data-toggle-circle="${lv}" role="button" aria-expanded="${collapsed ? "false" : "true"}" tabindex="0">
          <span class="circle-head__name">${esc(spellLevelLabel(lv))}</span>
          <span class="circle-head__count">${vis.length}</span>
          ${lv > 0 ? slotPips(lv) : ""}
          <span class="circle-head__chev">${chev}</span>
        </div>
        ${vis.map(spellCardHtml).join("")}
      </section>`;
    }).join("") + `</div>`;
  }

  function renderSpellPanel() {
    if (!showMagicUi()) return "";
    return `<div class="spell-panel">
      ${renderSpellHeader()}
      ${renderSpellFilters()}
      ${renderSpellList()}
    </div>`;
  }

  function renderCombatFight() {
    const magic = showMagicUi();
    if (magic && state.magicOpen) {
      return renderSpellPanel();
    }
    const cards = liveAttacks().map((atk) => {
      const held = !!atk.held;
      const tags = [];
      if (atk.sourceRu) tags.push(atk.sourceRu);
      if (held) tags.push("в руках");
      const tagHtml = tags.map((t) => `<span class="atk-tag">${esc(t)}</span>`).join("");
      const qty = atk.qty != null ? `${esc(atk.ammoName || "шт.")} × ${atk.qty}` : "";
      const chip = showVersatileChip(atk)
        ? `<button type="button" class="atk-mode${twoHandOn(atk) ? " is-on" : ""}" data-toggle-mode="${esc(atk.id)}">${esc(modeLabel(atk))}</button>`
        : "";
      const dmg = damageFace(atk);
      const favLab = atk.fav ? "В избранном" : `+ в избранное (${favCount()}/3)`;
      return `<article class="atk-card${held ? " is-held" : ""}" data-atk="${esc(atk.id)}" id="atk-${esc(atk.id)}">
        <div class="atk-body">
          <div class="atk-head">
            <p class="atk-name">${esc(atk.name)}</p>
            <div class="atk-tags">${tagHtml}</div>
            <p class="atk-meta">${esc(atk.meta || "")}${qty ? " · " + qty : ""}${state.target ? " · цель: " + esc(state.target) : ""}</p>
            ${chip}
          </div>
          <div class="atk-art" aria-hidden="true"><svg class="icon-ink" viewBox="0 0 96 96" width="96" height="96" preserveAspectRatio="xMidYMid meet"><use href="#${esc(atk.icon || "wp-sword")}"/></svg></div>
          <div class="atk-badges">
            <button type="button" class="atk-badge" data-roll-attack="${esc(atk.id)}"><b>${fmtMod(atk.bonus)}</b><span>атака</span></button>
            <button type="button" class="atk-badge" data-roll-damage="${esc(atk.id)}"><b>${esc(dmg)}</b><span>${esc(atk.dtype || "урон")}</span></button>
          </div>
          <div class="atk-tools">
            <button type="button" data-open-break="${esc(atk.id)}">Разборка</button>
            <button type="button" class="${held ? "is-on" : ""}" data-toggle-held="${esc(atk.id)}">${held ? "В руках" : "В руки"}</button>
            <button type="button" data-open-item="${esc(atk.id)}">Предмет</button>
            <button type="button" class="${atk.fav ? "is-on" : ""}" data-toggle-fav="atk:${esc(atk.id)}">${esc(favLab)}</button>
          </div>
        </div>
      </article>`;
    }).join("");
    const cons = (sheet.consumables || []);
    const consBlock = cons.length ? `<h3 class="block-title">Расходники <span class="fav-count">избранное ${favCount()}/3</span></h3>` + cons.map((c) => `
      <div class="cons-row">
        <div class="cons-body"><b>${esc(c.name)} × ${c.qty}</b><span>${esc(c.note || "")}</span></div>
        <button type="button" class="${c.fav ? "is-on" : ""}" data-toggle-fav="cons:${esc(c.id)}">${c.fav ? "В избранном" : "+ в избранное"}</button>
        <button type="button" data-use-cons="${esc(c.id)}">Использовать</button>
      </div>`).join("") : "";
    const res = classResources();
    const resBlock = res.length ? `<h3 class="block-title">Классовые ресурсы</h3>` + res.map((r) => `
      <div class="res-row">
        <div class="res-body"><b>${esc(r.name)}</b><span>${r.max != null ? r.cur + " из " + r.max : (r.note || "")}</span></div>
        <button type="button" ${r.instant ? `data-res-instant="${esc(r.instant)}"` : `data-open-resource="${esc(r.id)}"`}>${r.instant ? "Потратить" : "Открыть"}</button>
      </div>`).join("") : "";
    return `${cards}
      ${consBlock}
      ${resBlock}`;
  }

  function renderSpellSettings() {
    const keys = casterKeysNow();
    const cat = keys.map((key) => {
      const name = CASTER_NAME_OF[key] || key;
      if (KNOWN_CAPS[key] && !isPreparingClass(key)) return `${name} · ${casterQuotaText(key)}`;
      return `${name} · ${casterQuotaText(key)}`;
    }).join(" · ");
    const slots = sheet.slots || {};
    const slotsRows = Object.keys(slots).map(Number).sort((a, b) => a - b).map((lv) => {
      const s = slots[lv];
      return `<div class="settings-slot-row"><span>Ячейки ${lv}-го круга</span><span>${state.settingsAdvanced ? `макс. <input type="number" min="0" max="9" data-slot-max="${lv}" value="${s.max}"> ` : ""}<b class="num">${s.cur}/${s.max}</b></span></div>`;
    }).join("") || "<p class='flags'>Ячеек нет.</p>";
    const pact = hasWarlockCaster()
      ? `<div class="settings-slot-row"><span>Ячейки договора · ${(sheet.pactSlots || {}).level || 1} круг</span><b class="num">${(sheet.pactSlots || {}).cur || 0}/${(sheet.pactSlots || {}).max || 0}</b></div>`
      : `<p class="flags">Ячейки договора нет.</p>`;
    const wizardBlock = hasWizardCaster()
      ? `<div class="settings-block"><h3>Утеря / замена книги заклинаний</h3>
          <div class="chips"><button type="button" class="chip${sheet.bookLost ? " is-on" : ""}" data-toggle-book-lost>${sheet.bookLost ? "Книга утеряна" : "Книга на месте"}</button></div>
          <p class="flags">Утерянная книга закрывает подготовку из книги и ритуалы из книги.</p></div>`
      : "";
    const prepBtns = [];
    if (keys.some(isPreparingClass)) prepBtns.push(`<button type="button" class="btn" data-open-prepare>Подготовить</button>`);
    if (hasWizardCaster()) prepBtns.push(`<button type="button" class="btn" data-open-grimoire>Гримуар</button>`);
    return `<div class="settings-block"><h3>Каталог и подготовка / изучение</h3>
        <p class="flags">${esc(cat)}</p>
        <div class="modal-actions">${prepBtns.join("")}<button type="button" class="btn" data-open-custom-spell>Добавить своё заклинание</button></div>
      </div>
      <div class="settings-block"><h3>Фокус и мешочек</h3>
        <div class="chips">
          <button type="button" class="chip${sheet.hasFocus ? " is-on" : ""}" data-toggle-focus>${sheet.hasFocus ? "Фокус ✓" : "Фокус ✗"}</button>
          <button type="button" class="chip${sheet.hasPouch ? " is-on" : ""}" data-toggle-pouch>${sheet.hasPouch ? "Мешочек ✓" : "Мешочек ✗"}</button>
        </div>
      </div>
      <div class="settings-block"><h3>Сл. спас. и атака заклинаний</h3>
        <div class="modal-actions"><button type="button" class="btn" data-open-cast-break="${esc(keys[0] || "")}">Разборка сл. спас. и атаки</button></div>
        <p class="flags">8+БМ+мод / БМ+мод</p>
      </div>
      <div class="settings-block"><h3>Ячейки</h3>
        <div class="settings-slots">${slotsRows}</div>${pact}
        <div class="modal-actions"><button type="button" class="btn" data-settings-advanced>${state.settingsAdvanced ? "Скрыть расширенное" : "Расширенное"}</button></div>
      </div>
      ${wizardBlock}`;
  }

  function renderPrepareRows(list, used, cap, key) {
    const groups = {};
    list.forEach((s) => {
      const k = s.level;
      if (!groups[k]) groups[k] = [];
      groups[k].push(s);
    });
    return Object.keys(groups).map(Number).sort((a, b) => a - b).map((lv) => {
      const rows = sortSpellsAlpha(groups[lv]).map((s) => {
        const lock = s.always || s.grant;
        const atCap = !s.prepared && !lock && used >= cap;
        const cannot = (sheet.bookLost && hasWizardCaster() && !s.prepared) || atCap;
        const btn = lock
          ? `<span class="prepare-row__badge">${esc(grantLabelOf(s) || "всегда")}</span>`
          : (s.prepared
            ? `<button type="button" class="btn" data-prep-toggle="${esc(s.id)}">Убрать</button>`
            : `<button type="button" class="btn primary" data-prep-toggle="${esc(s.id)}"${cannot ? " disabled" : ""}>Подготовить</button>`);
        return `<li class="prepare-row${s.grant || s.always ? " is-granted" : ""}"><div><div class="prepare-row__name">${esc(s.name)}</div><div class="prepare-row__meta">${s.concentration ? `<span class="prepare-row__badge">концентрация</span>` : ""}${s.ritual ? `<span class="prepare-row__badge">ритуал</span>` : ""}${s.always ? `<span class="prepare-row__badge">всегда</span>` : ""}</div></div>${btn}</li>`;
      }).join("");
      return `<p class="spell-group-label">${esc(spellLevelLabel(lv))}</p><ul class="prepare-list">${rows}</ul>`;
    }).join("");
  }

  function renderPrepare() {
    const keys = casterKeysNow().filter(isPreparingClass);
    const key = keys[0] || String(sheetMainClass().id || "").toLowerCase();
    const tab = state.prepareTab || "prepared";
    const used = preparedUsedFor(key);
    const cap = preparedCapFor(key);
    const always = alwaysPreparedCountFor(key);
    const list = allAccessibleSpells().filter((s) => s.level > 0 && String(s.id).indexOf("wizard-") !== 0 && !isGrantSibling(s) && (keys.length < 2 || spellClassOf(s) === key));
    const prepared = list.filter((s) => s.prepared || s.always || s.grant);
    const available = list.filter((s) => !s.prepared && !s.always && !s.grant);
    const shown = tab === "prepared" ? prepared : available;
    const body = renderPrepareRows(shown, used, cap, key) || (tab === "prepared"
      ? `<p class="flags">Ничего не подготовлено — открой «Список класса» и нажми «Подготовить».</p>`
      : `<p class="flags">Всё из списка уже подготовлено.</p>`);
    const classNote = keys.length > 1 ? " · " + (CASTER_NAME_OF[key] || key) : "";
    return `<p class="prepare-limit">Лимит ${used}/${cap}${always ? " · всегда " + always : ""}${classNote}</p>
      ${keys.length > 1 ? `<div class="prepare-tabs">` + keys.map((k) => `<button type="button" class="chip is-on">${esc(CASTER_NAME_OF[k] || k)}</button>`).join("") + `</div>` : ""}
      <div class="prepare-tabs" role="tablist">
        <button type="button" class="chip${tab === "prepared" ? " is-on" : ""}" data-prepare-tab="prepared">Подготовленные</button>
        <button type="button" class="chip${tab === "available" ? " is-on" : ""}" data-prepare-tab="available">Список класса</button>
      </div>
      ${body}`;
  }

  function renderGrimoire() {
    const wizard = hasWizardCaster();
    if (!wizard) {
      return `<p class="flags">Гримуар есть только у волшебника.</p>`;
    }
    const mode = state.grimoireCaster || sheet.grimoireCaster || "wizard";
    const tabs = `<div class="prepare-tabs">
        <button type="button" class="chip${mode === "wizard" ? " is-on" : ""}" data-grim-caster="wizard">Волшебник · книга</button>
      </div>`;
    if (sheet.bookLost) {
      return tabs + `<p class="book-lost-note">Книга утеряна — подготовка из книги и ритуалы из книги недоступны.</p>
        <div class="modal-actions"><button type="button" class="btn" data-toggle-book-lost>Вернуть книгу</button>
        <button type="button" class="btn" data-open-custom-spell>Своё заклинание</button></div>`;
    }
    const used = preparedUsedFor("wizard");
    const cap = preparedCapFor("wizard");
    const groups = {};
    (sheet.wizardBook || []).forEach((s) => {
      const lv = s.level || 0;
      if (!groups[lv]) groups[lv] = [];
      groups[lv].push(s);
    });
    const body = Object.keys(groups).map(Number).sort((a, b) => a - b).map((lv) => {
      const rows = sortSpellsAlpha(groups[lv]).map((s) => {
        const marks = [];
        if (s.ritual) marks.push(`<span class="prepare-row__badge">${s.prepared ? "ритуал" : "ритуал · из книги"}</span>`);
        if (s.concentration) marks.push(`<span class="prepare-row__badge">концентрация</span>`);
        const atCap = !s.prepared && used >= cap;
        const cannot = atCap;
        const pipLab = s.prepared ? "Подготовлено: " + s.name : "Подготовить: " + s.name;
        return `<li class="grim-card">
          <button type="button" class="grim-pip${s.prepared ? " is-on" : ""}" data-wiz-prep="${esc(s.id)}" aria-label="${esc(pipLab)}" title="${esc(pipLab)}"${cannot ? " disabled" : ""}></button>
          <div class="grim-card__body">
            <div class="grim-card__name">${esc(s.name)}</div>
            <div class="grim-card__meta"><span class="prepare-row__badge">${esc(spellLevelLabel(s.level))}</span>${marks.join("")}</div>
          </div>
        </li>`;
      }).join("");
      return `<p class="spell-group-label">${esc(spellLevelLabel(lv))}</p><ul class="grim-list">${rows}</ul>`;
    }).join("") || `<p class="flags">В книге пока нет заклинаний.</p>`;
    return tabs + `<p class="prepare-limit">В книге ${(sheet.wizardBook || []).length} · подг. ${used}/${cap}</p>` + body +
      `<div class="modal-actions"><button type="button" class="btn" data-open-custom-spell>Своё заклинание</button></div>`;
  }

  function listCastSources(sp) {
    const sources = [];
    if ((sp.level || 0) <= 0) {
      sources.push({ id: "cantrip", label: "Заговор" });
      return sources;
    }
    sources.push({ id: "slot", label: "Ячейка" });
    if (sp.ritual) sources.push({ id: "ritual", label: isWizardBookRitual(sp) ? "Ритуал из книги" : "Ритуал" });
    if (sp.grantCast && (sp.grantCast.max - (sp.grantCast.used || 0)) > 0) {
      sources.push({ id: "grant:" + sp.id, label: sp.grantCast.label || grantLabelOf(sp), left: (sp.grantCast.max - (sp.grantCast.used || 0)) + "/" + sp.grantCast.max });
    }
    if (sp.itemCast && sheet.shieldCharges > 0 && sp.id === "shield-of-faith") {
      sources.push({ id: "item", label: itemSourceName(sp) || sp.itemCast.itemName, left: sheet.shieldCharges + "/" + sheet.shieldChargesMax });
    } else if (sp.itemCast && sp.itemCast.charges > 0) {
      sources.push({ id: "item", label: sp.itemCast.itemName || grantLabelOf(sp) });
    }
    allAccessibleSpells().filter(isGrantSibling).forEach((sib) => {
      if (sib.name !== sp.name) return;
      if (sib.grantCast && (sib.grantCast.max - (sib.grantCast.used || 0)) > 0) {
        sources.push({ id: "grant:" + sib.id, label: sib.grantCast.label || grantLabelOf(sib), left: (sib.grantCast.max - (sib.grantCast.used || 0)) + "/" + sib.grantCast.max });
      }
    });
    return sources;
  }

  function renderCastSpell() {
    const sp = spellById(state.castSpellId);
    if (!sp) return `<p class="flags">Заклинание не найдено.</p>`;
    const sources = listCastSources(sp);
    if (!state.castPath) state.castPath = sources[0] ? sources[0].id : "slot";
    if (!sources.some((s) => s.id === state.castPath)) state.castPath = sources[0] ? sources[0].id : "slot";
    const srcHtml = sources.map((s) =>
      `<button type="button" class="chip${state.castPath === s.id ? " is-on" : ""}" data-cast-path="${esc(s.id)}">${esc(s.label)}${s.left ? " · " + s.left : ""}</button>`
    ).join("");
    let slotsHtml = "";
    if (state.castPath === "slot" && (sp.level || 0) > 0) {
      const slots = sheet.slots || {};
      const levels = Object.keys(slots).map(Number).filter((lv) => lv >= (sp.level || 1) && slots[lv] && slots[lv].cur > 0).sort((a, b) => a - b);
      if (!state.castSlot || state.castSlot < (sp.level || 1) || !(slots[state.castSlot] && slots[state.castSlot].cur > 0)) {
        state.castSlot = levels[0] || sp.level || 1;
      }
      if (!levels.length) {
        slotsHtml = `<p class="flags">Нет свободных ячеек этого круга или выше.</p>`;
      } else {
        slotsHtml = `<div class="cast-slots">` + levels.map((lv) =>
          `<button type="button" class="chip${Number(state.castSlot) === lv ? " is-on" : ""}" data-cast-slot="${lv}">${lv}-й · ${slots[lv].cur}/${slots[lv].max}${lv > (sp.level || 0) ? " · апкаст" : ""}</button>`
        ).join("") + `</div>`;
      }
    }
    const preview = spellDamagePreview(sp, state.castPath === "slot" ? state.castSlot : sp.level);
    const conc = sp.concentration && state.concentration && state.concentration !== sp.name
      ? `<p class="flags">Сейчас концентрация: «${esc(state.concentration)}». Каст сменит её на «${esc(sp.name)}».</p>`
      : (sp.concentration && state.concentration === sp.name ? `<p class="flags">Уже концентрируешься на «${esc(sp.name)}».</p>` : "");
    const noSlot = state.castPath !== "slot" || (sp.level || 0) <= 0;
    return `<p class="lead">${esc(sp.name)} · ${esc(sp.level <= 0 ? "заговор" : (sp.level + " круг"))}</p>
      <p class="flags">${esc([sp.timeLabel, sp.range, sp.school, preview].filter(Boolean).join(" · "))}</p>
      <div class="cast-paths">${srcHtml}</div>
      ${slotsHtml}
      ${conc}
      <p class="pad-note">${noSlot ? "Ячейка не тратится." : "Ячейка потратится после подтверждения."}</p>
      <div class="cast-actions">
        <button type="button" class="btn primary" data-confirm-cast>Каст</button>
        <button type="button" class="btn" data-close>Отмена</button>
      </div>`;
  }

  function renderCastBreak(key) {
    const k = key || casterKeysNow()[0] || String(sheetMainClass().id || "").toLowerCase();
    const live = liveSpellStats(k);
    const name = CASTER_NAME_OF[k] || k;
    const abil = CASTER_ABIL_TITLE[live.abil] || live.abil;
    return `<p class="lead">${esc(name)} · ${esc(abil)}</p>
      <div class="break-row"><span>Модификатор</span><b>${fmtMod(live.mod)}</b></div>
      <div class="break-row"><span>Бонус мастерства</span><b>${fmtMod(live.pb)}</b></div>
      <div class="break-row"><span>Сл. спас.</span><b>${live.dc}</b></div>
      <div class="break-row"><span>Атака заклинанием</span><b>${esc(live.atkLabel)}</b></div>
      <p class="flags">Сл. спас. = 8 + БМ + мод. Атака = БМ + мод.</p>
      <div class="break-row"><span>Квота</span><b>${esc(casterQuotaText(k))}</b></div>`;
  }

  function renderCustomSpell() {
    const d = state.customSpellDraft || { name: "", level: 1, ritual: false, concentration: false, text: "" };
    return `<label class="field">Название <input type="text" data-cs-name value="${esc(d.name || "")}"></label>
      <label class="field">Круг <input type="number" min="0" max="9" data-cs-level value="${d.level || 0}"></label>
      <div class="chips" style="display:flex;flex-wrap:wrap;gap:6px;margin:8px 0">
        <button type="button" class="chip${d.ritual ? " is-on" : ""}" data-cs-ritual>Ритуал</button>
        <button type="button" class="chip${d.concentration ? " is-on" : ""}" data-cs-conc>Концентрация</button>
      </div>
      <label class="field">Описание <textarea data-cs-text rows="4">${esc(d.text || "")}</textarea></label>
      <div class="cs-actions">
        <button type="button" class="btn primary" data-cs-save>Добавить</button>
        <button type="button" class="btn" data-close>Отмена</button>
      </div>`;
  }

  function renderConcDamageBody() {
    const a = state.concPending || { damage: 16, dc: 10, spellName: state.concentration || "Благословение" };
    const name = a.spellName ? " («" + a.spellName + "»)" : "";
    const box = $("[data-conc-damage-body]");
    if (!box) return;
    box.innerHTML = `<p class="lead">Урон ${a.damage} хитов. Спас концентрации Сл ${a.dc}${esc(name)}. Удержал?</p>
      <div class="conc-actions">
        <button type="button" class="btn primary" data-conc-held>Удержал</button>
        <button type="button" class="btn" data-conc-broke>Сорвалось</button>
      </div>`;
  }

  function confirmCast() {
    const sp = spellById(state.castSpellId);
    if (!sp) { toast("Заклинание не найдено"); return; }
    const path = state.castPath || "slot";
    if (path === "slot" && (sp.level || 0) > 0) {
      const slot = (sheet.slots || {})[state.castSlot];
      if (!slot || slot.cur <= 0) { toast("Нет ячейки"); return; }
      slot.cur -= 1;
    } else if (path === "item" && sp.id === "shield-of-faith") {
      if (sheet.shieldCharges > 0) sheet.shieldCharges -= 1;
    } else if (String(path).indexOf("grant:") === 0) {
      const id = String(path).slice(6);
      const row = spellById(id) || sp;
      if (row.grantCast) {
        row.grantCast.used = (row.grantCast.used || 0) + 1;
      }
    }
    if (sp.concentration) {
      state.concentration = sp.name;
    }
    toast("Каст: " + sp.name + (path === "slot" && state.castSlot > (sp.level || 0) ? (" · " + state.castSlot + " круг") : ""));
    closeDialog();
  }

  function saveCustomSpell() {
    const d = state.customSpellDraft || {};
    const name = String(d.name || "").trim();
    if (!name) { toast("Укажи название"); return; }
    const id = "custom-" + Date.now();
    const sp = {
      id: id,
      name: name,
      level: Math.max(0, Math.min(9, Number(d.level) || 0)),
      ritual: !!d.ritual,
      concentration: !!d.concentration,
      school: "",
      range: "—",
      duration: "—",
      components: "В, С",
      kind: "utility",
      prepared: true,
      always: false,
      grant: false,
      onSheet: true,
      custom: true,
      text: String(d.text || "").trim(),
      time: "action",
      timeLabel: "1 действие"
    };
    sheet.customSpells = (sheet.customSpells || []).concat([sp]);
    state.customSpellDraft = { name: "", level: 1, ritual: false, concentration: false, text: "" };
    toast("Добавлено: " + name);
    closeDialog();
  }

  function openConcSave(opts) {
    const o = opts || {};
    const dmg = Math.max(0, Number(o.damage) || 16);
    state.concPending = {
      damage: dmg,
      dc: o.dc != null ? Number(o.dc) : Math.max(10, Math.floor(dmg / 2)),
      spellName: o.spellName || state.concentration || "Благословение"
    };
    openDialog("conc-damage");
  }

  let spellDrag = null;

  function bindSpellDrag() {
    const list = $("[data-spell-list]");
    if (!list) return;
    list.querySelectorAll("[data-spell]").forEach((card) => {
      card.addEventListener("pointerdown", onSpellPointerDown);
    });
  }

  function onSpellPointerDown(e) {
    if (e.button && e.button !== 0) return;
    if (e.target.closest && e.target.closest("[data-open-cast]")) return;
    const card = e.currentTarget;
    const startX = e.clientX, startY = e.clientY;
    const startId = card.getAttribute("data-spell-id");
    const circle = card.closest("section.spell-circle");
    if (!circle) return;
    let started = false;
    let timer = setTimeout(() => {
      timer = 0;
      started = true;
      card.classList.add("is-dragging");
      try { card.setPointerCapture(e.pointerId); } catch (err) {}
    }, 300);
    function move(ev) {
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      if (!started) {
        if (Math.hypot(dx, dy) > 10) {
          if (timer) { clearTimeout(timer); timer = 0; }
        }
        return;
      }
      ev.preventDefault();
      const midY = ev.clientY;
      const cards = [...circle.querySelectorAll(":scope > [data-spell]")];
      for (let i = 0; i < cards.length; i++) {
        const r = cards[i].getBoundingClientRect();
        const mid = r.top + r.height / 2;
        if (midY < mid) {
          if (cards[i] !== card) circle.insertBefore(card, cards[i]);
          break;
        }
        if (i === cards.length - 1 && cards[i] !== card) circle.appendChild(card);
      }
    }
    function up() {
      if (timer) { clearTimeout(timer); timer = 0; }
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
      document.removeEventListener("pointercancel", up);
      if (started) {
        card.classList.remove("is-dragging");
        const lv = circle.getAttribute("data-circle");
        state.spellOrder = state.spellOrder || {};
        state.spellOrder[String(lv)] = [...circle.querySelectorAll(":scope > [data-spell]")].map((el) => el.getAttribute("data-spell-id"));
        window._spellJustDragged = true;
        setTimeout(() => { window._spellJustDragged = false; }, 80);
      }
    }
    document.addEventListener("pointermove", move, { passive: false });
    document.addEventListener("pointerup", up);
    document.addEventListener("pointercancel", up);
    void startId;
  }

  function handleMagicClick(t) {
    if (t.matches("[data-combat-pane]")) {
      state.combatPane = t.getAttribute("data-combat-pane") || "attacks";
      state.magicOpen = state.combatPane === "spells" && isCaster();
      render();
      return true;
    }
    if (t.matches("[data-open-spell-settings]")) { openExtra("spell-settings", "Магия"); return true; }
    if (t.matches("[data-open-prepare]")) { state.prepareTab = state.prepareTab || "prepared"; openExtra("prepare", "Подготовить"); return true; }
    if (t.matches("[data-open-grimoire]")) {
      if (!hasWizardCaster()) { toast("Гримуар есть только у волшебника"); return true; }
      openExtra("grimoire", "Гримуар");
      return true;
    }
    if (t.matches("[data-toggle-focus]")) { sheet.hasFocus = !sheet.hasFocus; render(); return true; }
    if (t.matches("[data-toggle-pouch]")) { sheet.hasPouch = !sheet.hasPouch; render(); return true; }
    if (t.matches("[data-toggle-book-lost]")) { sheet.bookLost = !sheet.bookLost; render(); return true; }
    if (t.matches("[data-spell-filter]")) {
      const f = t.getAttribute("data-spell-filter");
      state.spellFilter = f || "all";
      render();
      return true;
    }
    if (t.matches("[data-circle-filter]")) {
      const c = t.getAttribute("data-circle-filter");
      state.circleFilter = String(state.circleFilter) === String(c) ? "" : c;
      render();
      return true;
    }
    if (t.matches("[data-collapse-all]")) {
      state.circlesCollapsed = true;
      state.collapsedCircles = {};
      render();
      return true;
    }
    if (t.matches("[data-expand-all]")) {
      state.circlesCollapsed = false;
      state.collapsedCircles = {};
      render();
      return true;
    }
    if (t.matches("[data-reset-order]")) {
      state.spellOrder = {};
      toast("Порядок заклинаний сброшен (А–Я)");
      render();
      return true;
    }
    if (t.matches("[data-toggle-circle]")) {
      const lv = t.getAttribute("data-toggle-circle");
      state.collapsedCircles = state.collapsedCircles || {};
      if (state.circlesCollapsed) {
        state.circlesCollapsed = false;
        const maxLv = maxSlotLevel();
        for (let i = 0; i <= maxLv; i++) state.collapsedCircles[String(i)] = String(i) !== String(lv);
      } else {
        state.collapsedCircles[String(lv)] = !state.collapsedCircles[String(lv)];
      }
      render();
      return true;
    }
    if (t.matches("[data-toggle-slot]")) {
      const raw = t.getAttribute("data-toggle-slot") || "";
      const parts = raw.split(":");
      const lv = Number(parts[0]);
      const idx = Number(parts[1]);
      const slot = (sheet.slots || {})[lv];
      if (!slot) return true;
      if (idx < slot.cur) slot.cur = idx;
      else slot.cur = Math.min(slot.max, idx + 1);
      render();
      return true;
    }
    if (t.matches("[data-spell-expand]")) {
      if (window._spellJustDragged) { window._spellJustDragged = false; return true; }
      const id = t.getAttribute("data-spell-expand");
      state.expandedSpell = state.expandedSpell === id ? "" : id;
      render();
      return true;
    }
    if (t.matches("[data-open-cast]")) {
      state.castSpellId = t.getAttribute("data-open-cast");
      const sp = spellById(state.castSpellId);
      state.castPath = "";
      state.castSlot = sp ? (sp.level || 0) : 0;
      openExtra("cast-spell", "Каст" + (sp ? ": " + sp.name : ""));
      return true;
    }
    if (t.matches("[data-cast-path]")) { state.castPath = t.getAttribute("data-cast-path"); render(); return true; }
    if (t.matches("[data-cast-slot]")) { state.castSlot = Number(t.getAttribute("data-cast-slot")); render(); return true; }
    if (t.matches("[data-confirm-cast]")) { confirmCast(); return true; }
    if (t.matches("[data-open-cast-break]")) {
      state.breakId = t.getAttribute("data-open-cast-break") || casterKeysNow()[0] || "";
      openExtra("spell-cast-break", "Сл. спас. и атака заклинаний");
      return true;
    }
    if (t.matches("[data-prepare-tab]")) { state.prepareTab = t.getAttribute("data-prepare-tab") || "prepared"; render(); return true; }
    if (t.matches("[data-prep-toggle]")) {
      const id = t.getAttribute("data-prep-toggle");
      const sp = spellById(id);
      if (!sp || sp.always || sp.grant) return true;
      const key = spellClassOf(sp);
      if (!sp.prepared && preparedUsedFor(key) >= preparedCapFor(key)) { toast("Лимит подготовки исчерпан"); return true; }
      if (sheet.bookLost && hasWizardCaster() && !sp.prepared) { toast("Книга утеряна"); return true; }
      sp.prepared = !sp.prepared;
      const bookRow = (sheet.wizardBook || []).find((w) => w.id === sp.id || w.name === sp.name);
      if (bookRow) bookRow.prepared = sp.prepared;
      render();
      return true;
    }
    if (t.matches("[data-open-custom-spell]")) {
      state.customSpellDraft = { name: "", level: 1, ritual: false, concentration: false, text: "" };
      openExtra("custom-spell", "Своё заклинание");
      return true;
    }
    if (t.matches("[data-cs-ritual]")) { state.customSpellDraft.ritual = !state.customSpellDraft.ritual; render(); return true; }
    if (t.matches("[data-cs-conc]")) { state.customSpellDraft.concentration = !state.customSpellDraft.concentration; render(); return true; }
    if (t.matches("[data-cs-save]")) { saveCustomSpell(); return true; }
    if (t.matches("[data-settings-advanced]")) { state.settingsAdvanced = !state.settingsAdvanced; render(); return true; }
    if (t.matches("[data-conc-held]")) {
      toast("Концентрация удержана");
      state.concPending = null;
      closeDialog();
      return true;
    }
    if (t.matches("[data-conc-broke]")) {
      state.concentration = null;
      state.concPending = null;
      toast("Концентрация сорвалась");
      closeDialog();
      return true;
    }
    if (t.matches("[data-grim-caster]")) {
      const mode = t.getAttribute("data-grim-caster") || "wizard";
      state.grimoireCaster = mode;
      sheet.grimoireCaster = mode;
      render();
      return true;
    }
    if (t.matches("[data-wiz-prep]")) {
      const id = t.getAttribute("data-wiz-prep");
      const row = (sheet.wizardBook || []).find((w) => w.id === id);
      if (!row) return true;
      if (sheet.bookLost && !row.prepared) { toast("Книга утеряна"); return true; }
      if (!row.prepared && preparedUsedFor("wizard") >= preparedCapFor("wizard")) {
        toast("Лимит подготовки исчерпан");
        return true;
      }
      row.prepared = !row.prepared;
      const sp = spellById(id) || allAccessibleSpells().find((s) => s.name === row.name);
      if (sp) sp.prepared = row.prepared;
      render();
      return true;
    }
    return false;
  }

