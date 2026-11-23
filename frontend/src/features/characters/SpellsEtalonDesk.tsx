import { useMemo, useState } from 'react'
import { Dialog } from '../../ui'

export type SpellMagicVariant = 'kaedrin' | 'multiclass' | 'warlock' | 'wizard'

type SpellCircle = 0 | 1 | 2 | 3 | 4 | 5

type SpellRow = {
  id: string
  circle: SpellCircle
  name: string
  level: string
  dmg?: string
  tags?: string
  meta: string
  school?: string
  granted?: boolean
  ritual?: boolean
  concentration?: boolean
  bookRitual?: boolean
  hidden?: boolean
}

const CIRCLES: Array<{ id: SpellCircle; title: string; count: string; slots?: string }> = [
  { id: 0, title: 'Заговоры', count: '1' },
  { id: 1, title: '1-й уровень', count: '4', slots: 'Ячейки 4/4' },
  { id: 2, title: '2-й уровень', count: '3', slots: 'Ячейки 3/3' },
  { id: 3, title: '3-й уровень', count: '0', slots: 'Ячейки 2/2' },
]

const SPELLS: SpellRow[] = [
  { id: 'sacred-flame', circle: 0, name: 'Священное пламя', level: 'заговор', dmg: '2к8 излучение', school: 'воплощение', meta: 'действие · 60 фт · Сл 14 Ловк. · В/С · воплощение' },
  { id: 'bless', circle: 1, name: 'Благословение', level: '1 ур.', dmg: 'союзники +1к4', tags: 'Архетип', school: 'очарование', granted: true, meta: 'действие · 30 фт · — · В/С/М · очарование · 1 мин', concentration: true },
  { id: 'cure', circle: 1, name: 'Лечение ран', level: '1 ур.', dmg: '1к8+3 хитов', tags: 'Архетип', school: 'воплощение', granted: true, meta: 'действие · Касание · — · В/С · воплощение' },
  { id: 'detect', circle: 1, name: 'Обнаружение магии', level: '1 ур.', school: 'прорицание', meta: 'действие · На себя · — · В/С · прорицание · 10 мин', ritual: true, concentration: true, hidden: true },
  { id: 'sanctuary', circle: 1, name: 'Укрытие', level: '1 ур.', dmg: 'Умение: Убежище верных 1/1', school: 'ограждение', granted: true, meta: 'бонус · 30 фт · — · В/С/М · ограждение · 1 мин' },
  { id: 'shield-faith', circle: 1, name: 'Щит веры', level: '1 ур. · 2/3 зар.', dmg: 'КД +2', tags: 'Наложение щита 2/3', school: 'ограждение', granted: true, meta: 'бонус · 60 фт · — · В/С/М · ограждение · 10 мин', concentration: true },
  { id: 'spiritual', circle: 2, name: 'Духовное оружие', level: '2 ур.', dmg: '1к8+3 силовое', tags: 'Архетип', school: 'воплощение', granted: true, meta: 'бонус · 60 фт · атака · В/С · воплощение · 1 мин' },
  { id: 'lesser', circle: 2, name: 'Малое восстановление', level: '2 ур.', dmg: 'болезнь или состояние', tags: 'Архетип', school: 'ограждение', granted: true, meta: 'действие · Касание · — · В/С · ограждение' },
  { id: 'prayer', circle: 2, name: 'Молитва лечения', level: '2 ур.', dmg: '2к8+3 хиты, до 6 существ', school: 'воплощение', meta: '10 мин · 30 фт · — · В · воплощение' },
]

/** Текст живого окна «Описание заклинания» для Каэдрина. */
const SPELL_DETAILS: Record<string, { name: string; flags: string; meta: string; preview?: string; text: string }> = {
  'sacred-flame': {
    name: 'Священное пламя',
    flags: 'заговор · воплощение · 1 действие',
    meta: 'Дистанция: 60 футов · Длительность: Мгновенная · Компоненты: В, С',
    preview: '2к8 излучение',
    text: 'Цель в пределах дистанции должна преуспеть в спасброске Ловкости, иначе получает урон излучением. Укрытие не помогает.',
  },
  bless: {
    name: 'Благословение',
    flags: '1-й круг · очарование · 1 действие · концентрация · всегда подготовлено · Архетип',
    meta: 'Дистанция: 30 футов · Длительность: 1 минута · Компоненты: В, С, М',
    preview: 'к20 +1к4 к атаке и спасам',
    text: 'До трёх существ получают прибавку 1к4 к броскам атаки и спасброскам, пока держится концентрация.',
  },
  cure: {
    name: 'Лечение ран',
    flags: '1-й круг · восстановление · 1 действие · всегда подготовлено · Архетип',
    meta: 'Дистанция: Касание · Длительность: Мгновенная · Компоненты: В, С',
    preview: '1к8+6 хитов',
    text: 'Касанием восстанавливаешь хиты. У домена Жизни лечение усилено ученичеством жизни.',
  },
  detect: {
    name: 'Обнаружение магии',
    flags: '1-й круг · прорицание · 1 действие · ритуал · концентрация',
    meta: 'Дистанция: На себя · Длительность: 10 минут · Компоненты: В, С',
    text: 'Чувствуешь присутствие магии в пределах 30 футов. Как ритуал — без ячейки, время каста +10 минут.',
  },
  sanctuary: {
    name: 'Укрытие',
    flags: '1-й круг · ограждение · 1 бонусное действие · всегда подготовлено · Умение: Убежище верных',
    meta: 'Дистанция: 30 футов · Длительность: 1 минута · Компоненты: В, С, М',
    preview: 'атакующий должен пройти спас Мудрости',
    text: 'Существо защищено: атакующий должен преуспеть в спасброске Мудрости, иначе выбирает другую цель. Не концентрация. Умение «Убежище верных» даёт один каст без ячейки за длинный отдых.',
  },
  'shield-faith': {
    name: 'Щит веры',
    flags: '1-й круг · ограждение · 1 бонусное действие · концентрация · всегда подготовлено · Предмет',
    meta: 'Дистанция: 60 футов · Длительность: 10 минут · Компоненты: В, С, М',
    preview: 'КД +2',
    text: 'Цель получает +2 к КД, пока держится концентрация. Заряды предмета «Наложение щита» позволяют каст без ячейки; слот тоже можно потратить.',
  },
  spiritual: {
    name: 'Духовное оружие',
    flags: '2-й круг · воплощение · 1 бонусное действие · всегда подготовлено · Архетип',
    meta: 'Дистанция: 60 футов · Длительность: 1 минута · Компоненты: В, С',
    preview: '1к8+3 силовой',
    text: 'Создаёшь призванное оружие и сразу совершаешь рукопашную атаку заклинанием. Последующие атаки — бонусным действием.',
  },
  lesser: {
    name: 'Малое восстановление',
    flags: '2-й круг · восстановление · 1 действие · всегда подготовлено · Архетип',
    meta: 'Дистанция: Касание · Длительность: Мгновенная · Компоненты: В, С',
    text: 'Касанием снимаешь одну болезнь или состояние: ослепление, глухоту, паралич или отравление.',
  },
  prayer: {
    name: 'Молитва лечения',
    flags: '2-й круг · восстановление · 10 минут',
    meta: 'Дистанция: 30 футов · Длительность: Мгновенная · Компоненты: В',
    preview: '2к8+7 хитов (до 6 существ)',
    text: 'До шести существ восстанавливают хиты. Время каста 10 минут — не подходит для хода в бою.',
  },
}

/** Живое окно каста заговора «Священное пламя». */
const CAST_VIEWS: Record<
  string,
  { title: string; name: string; meta: string; previewLabel: string; preview: string; comp: string; rest: string; time: string }
> = {
  'sacred-flame': {
    title: 'Использовать заговор?',
    name: 'Священное пламя',
    meta: 'заговор',
    previewLabel: 'Итог эффекта (ур. персонажа 5): ',
    preview: '2к8 излучение',
    comp: 'Фокус есть · материальный компонент не нужен',
    rest: 'По желанию · без ячейки',
    time: 'Время: 1 действие · Длительность: Мгновенная',
  },
}

/** Илис Чернильный, Волшебник 10 — лист sheet-desktop.html, data-set-demo-char=ilis. */
const WIZARD_CIRCLES: Array<{ id: SpellCircle; title: string; count: string; slots?: string }> = [
  { id: 0, title: 'Заговоры', count: '6' },
  { id: 1, title: '1-й уровень', count: '7', slots: 'Ячейки 4/4' },
  { id: 2, title: '2-й уровень', count: '3', slots: 'Ячейки 3/3' },
  { id: 3, title: '3-й уровень', count: '5', slots: 'Ячейки 3/3' },
  { id: 4, title: '4-й уровень', count: '3', slots: 'Ячейки 3/3' },
  { id: 5, title: '5-й уровень', count: '1', slots: 'Ячейки 2/2' },
]

const WIZARD_SPELLS: SpellRow[] = [
  { id: 'fire-bolt', circle: 0, name: 'Огненный снаряд', level: 'заговор', dmg: '2к10 огонь', school: 'воплощение', meta: 'действие · 120 фт · атака · В/С · воплощение' },
  { id: 'mage-hand', circle: 0, name: 'Волшебная рука', level: 'заговор', school: 'вызов', meta: 'действие · 30 фт · — · В/С · вызов · 1 мин' },
  { id: 'prestidigitation', circle: 0, name: 'Фокусы', level: 'заговор', school: 'преобразование', meta: 'действие · 10 фт · — · В/С · преобразование · до 1 ч' },
  { id: 'minor-illusion', circle: 0, name: 'Малая иллюзия', level: 'заговор', school: 'иллюзия', meta: 'действие · 30 фт · — · С/М · иллюзия · 1 мин' },
  { id: 'ray-frost', circle: 0, name: 'Луч холода', level: 'заговор', dmg: '2к8 холод', school: 'воплощение', meta: 'действие · 60 фт · атака · В/С · воплощение' },
  { id: 'light', circle: 0, name: 'Свет', level: 'заговор', tags: 'Раса: Высший эльф', school: 'воплощение', granted: true, meta: 'действие · Касание · — · В/М · воплощение · 1 ч' },
  { id: 'mage-armor', circle: 1, name: 'Доспехи мага', level: '1 ур.', dmg: 'КД 13 + Ловк.', school: 'ограждение', meta: 'действие · Касание · — · В/С/М · ограждение · 8 ч' },
  { id: 'magic-missile', circle: 1, name: 'Волшебная стрела', level: '1 ур.', dmg: '3×1к4+1 силовой', school: 'воплощение', meta: 'действие · 120 фт · — · В/С · воплощение' },
  { id: 'shield', circle: 1, name: 'Щит', level: '1 ур.', dmg: 'КД +5', school: 'ограждение', meta: 'реакция · На себя · — · В/С · ограждение · 1 раунд' },
  { id: 'w-detect', circle: 1, name: 'Обнаружение магии', level: '1 ур.', school: 'прорицание', meta: 'действие · На себя · — · В/С · прорицание · 10 мин', concentration: true, bookRitual: true },
  { id: 'identify', circle: 1, name: 'Опознавание', level: '1 ур.', school: 'прорицание', meta: '1 мин · Касание · — · В/С/М · прорицание', bookRitual: true },
  { id: 'alarm', circle: 1, name: 'Сигнал тревоги', level: '1 ур.', school: 'ограждение', meta: '1 мин · 30 фт · — · В/С/М · ограждение · 8 ч', bookRitual: true },
  { id: 'find-familiar', circle: 1, name: 'Поиск фамильяра', level: '1 ур.', school: 'вызов', meta: '1 ч · 10 фт · — · В/С/М · вызов', bookRitual: true },
  { id: 'misty-step', circle: 2, name: 'Туманный шаг', level: '2 ур.', school: 'вызов', meta: 'бонус · На себя · — · В/С · вызов' },
  { id: 'scorching-ray', circle: 2, name: 'Палящий луч', level: '2 ур.', dmg: '3 луча, 2к6 огонь', school: 'воплощение', meta: 'действие · 120 фт · атака · В/С · воплощение' },
  { id: 'ink-mark', circle: 2, name: 'Метка чернил', level: 'своё 2 ур.', school: 'преобразование', meta: 'действие · Касание · — · В/С · преобразование · 1 ч', concentration: true },
  { id: 'counterspell', circle: 3, name: 'Контрзаклинание', level: '3 ур.', school: 'ограждение', meta: 'реакция · 60 фт · — · В/С · ограждение' },
  { id: 'fireball', circle: 3, name: 'Огненный шар', level: '3 ур.', dmg: '8к6 огонь', school: 'воплощение', meta: 'действие · 150 фт · Сл 16 Ловк. · В/С/М · воплощение' },
  { id: 'fly', circle: 3, name: 'Полёт', level: '3 ур.', dmg: 'скорость полёта 60 фт', school: 'преобразование', meta: 'действие · Касание · — · В/С/М · преобразование · 10 мин', concentration: true },
  { id: 'haste', circle: 3, name: 'Ускорение', level: '3 ур.', school: 'преобразование', meta: 'действие · 30 фт · — · В/С/М · преобразование · 1 мин', concentration: true },
  { id: 'tiny-hut', circle: 3, name: 'Леомундова хижина', level: '3 ур.', school: 'воплощение', meta: '1 мин · На себя · — · В/С/М · воплощение · 8 ч', bookRitual: true },
  { id: 'polymorph', circle: 4, name: 'Превращение', level: '4 ур.', school: 'преобразование', meta: 'действие · 60 фт · Сл 16 Мудр. · В/С/М · преобразование · 1 ч', concentration: true },
  { id: 'greater-invis', circle: 4, name: 'Высшая невидимость', level: '4 ур.', school: 'иллюзия', meta: 'действие · Касание · — · В/С · иллюзия · 1 мин', concentration: true },
  { id: 'dimension-door', circle: 4, name: 'Переносящая дверь', level: '4 ур.', school: 'вызов', meta: 'действие · 500 фт · — · В · вызов' },
  { id: 'telekinesis', circle: 5, name: 'Телекинез', level: '5 ур.', school: 'преобразование', meta: 'действие · 60 фт · — · В/С · преобразование · 10 мин', concentration: true },
]

/** Школа из листа → контур. Одни и те же имена, что в spell.school эталона. */
const SCHOOL_SYMBOL: Record<string, string> = {
  ограждение: 'sch-abjuration',
  вызов: 'sch-conjuration',
  прорицание: 'sch-divination',
  очарование: 'sch-enchantment',
  воплощение: 'sch-evocation',
  иллюзия: 'sch-illusion',
  некромантия: 'sch-necromancy',
  преобразование: 'sch-transmutation',
}

type PactPool = { cur: number; max: number; level: number }

/** Живой sheet.pactSlots после «4 заклинателя»: 1/1 первого круга. */
const PACT_POOL: Partial<Record<SpellMagicVariant, PactPool>> = {
  warlock: { cur: 1, max: 1, level: 1 },
}

function PactSlots({ pool }: { pool: PactPool }) {
  return (
    <div className="pact-row">
      <span>{`Ячейки договора: ${pool.cur}/${pool.max} · ${pool.level}-й круг`}</span>
      <span className="slots" aria-label={`Ячейки договора ${pool.cur}/${pool.max}`}>
        {Array.from({ length: pool.max }).map((_, index) => (
          <button
            key={index}
            type="button"
            className={`pip${index < pool.cur ? ' is-on' : ''}`}
            aria-label={`Ячейка договора ${index + 1}`}
          />
        ))}
      </span>
    </div>
  )
}

function schoolSymbol(school?: string): string | null {
  if (!school) return null
  if (school.startsWith('sch-')) return school
  return SCHOOL_SYMBOL[school] ?? null
}

const CASTER_CHIPS: Record<SpellMagicVariant, Array<{ cls: string; name: string; abil: string; stats: string; quota: string }>> = {
  kaedrin: [{ cls: 'is-wis', name: 'Жрец', abil: 'МУД', stats: 'Сл 14 · +6', quota: 'подг. 1/8 · всегда 5' }],
  multiclass: [
    { cls: 'is-wis', name: 'Жрец', abil: 'МУД', stats: 'Сл 14 · +6', quota: 'подг. 1/8 · всегда 5' },
    { cls: 'is-int', name: 'Волшебник', abil: 'ИНТ', stats: 'Сл 11 · +3', quota: 'подг. 1/8, в книге 8' },
  ],
  warlock: [
    { cls: 'is-cha', name: 'Паладин', abil: 'ХАР', stats: 'Сл 12 · +4', quota: 'подг. 1/8 · всегда 5' },
    { cls: 'is-wis', name: 'Жрец', abil: 'МУД', stats: 'Сл 14 · +6', quota: 'подг. 1/8 · всегда 5' },
    { cls: 'is-int', name: 'Волшебник', abil: 'ИНТ', stats: 'Сл 11 · +3', quota: 'подг. 1/8, в книге 8' },
    { cls: 'is-cha', name: 'Колдун', abil: 'ХАР', stats: 'Сл 12 · +4', quota: 'изв. 8/6' },
  ],
  wizard: [{ cls: 'is-int', name: 'Волшебник', abil: 'ИНТ', stats: 'Сл 16 · +8', quota: 'подг. 14/14, в книге 24' }],
}

type FilterId = 'all' | 'cantrips' | 'rituals' | 'concentration' | '0' | '1' | '2' | '3'

function SchoolSprite() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <symbol id="sch-abjuration" viewBox="0 0 96 96">
        <path d="M48 8 L78 20 L78 46 C78 68 62 82 48 90 C34 82 18 68 18 46 L18 20 Z" />
        <path d="M48 14 L72 24 L72 46 C72 64 58 76 48 82 C38 76 24 64 24 46 L24 24 Z" />
        <circle cx="48" cy="46" r="12" />
        <path d="M48 34 L48 58 M36 46 L60 46" />
        <path d="M40 38 L56 54 M56 38 L40 54" />
      </symbol>
      <symbol id="sch-divination" viewBox="0 0 96 96">
        <circle cx="48" cy="40" r="24" />
        <circle cx="48" cy="40" r="18" />
        <ellipse cx="48" cy="40" rx="14" ry="8" />
        <circle cx="48" cy="40" r="4" />
        <path d="M48 36 L48 44 M46 40 L50 40" />
        <path d="M36 62 L40 72 L56 72 L60 62" />
        <path d="M32 80 L40 72 M64 80 L56 72" />
        <path d="M28 80 L68 80" />
        <path d="M48 16 L48 10 M22 32 L16 28 M74 32 L80 28" />
      </symbol>
      <symbol id="sch-enchantment" viewBox="0 0 96 96">
        <path d="M48 30 C48 22 40 16 32 20 C22 26 22 40 32 50 L48 68 L64 50 C74 40 74 26 64 20 C56 16 48 22 48 30 Z" />
        <ellipse cx="48" cy="40" rx="10" ry="6" />
        <circle cx="48" cy="40" r="2.6" />
        <path d="M20 18 L24 26 L16 24 M76 18 L72 26 L80 24" />
        <path d="M14 48 L20 50 M82 48 L76 50" />
        <path d="M28 76 L32 70 M68 76 L64 70" />
        <path d="M48 74 L48 82 M44 78 L52 78" />
        <path d="M18 66 L22 62 M78 66 L74 62" />
      </symbol>
      <symbol id="sch-conjuration" viewBox="0 0 96 96">
        <ellipse cx="48" cy="50" rx="28" ry="16" />
        <ellipse cx="48" cy="50" rx="18" ry="10" />
        <ellipse cx="48" cy="50" rx="8" ry="4" />
        <path d="M20 50 Q20 30 48 22 Q76 30 76 50" />
        <path d="M26 38 L26 34 M48 22 L48 16 M70 38 L70 34" />
        <path d="M30 32 L28 26 M66 32 L68 26" />
        <path d="M48 54 L48 82" />
        <path d="M48 70 L42 78 M48 70 L54 78" />
        <path d="M22 50 L16 48 M74 50 L80 48" />
      </symbol>
      <symbol id="sch-illusion" viewBox="0 0 96 96">
        <path d="M24 28 C24 16 36 10 48 10 C60 10 72 16 72 28 L74 58 C74 74 62 84 48 84 C34 84 22 74 22 58 Z" />
        <path d="M34 36 C36 30 42 28 46 34" />
        <path d="M62 36 C60 30 54 28 50 34" />
        <path d="M34 38 C36 40 40 40 44 38" />
        <path d="M62 38 C60 40 56 40 52 38" />
        <path d="M36 60 C42 70 54 70 60 60" />
        <path d="M70 18 C82 8 90 28 80 36 C90 40 86 54 76 48" />
        <path d="M20 70 C10 78 18 90 30 84" />
      </symbol>
      <symbol id="sch-necromancy" viewBox="0 0 96 96">
        <path d="M32 28 C32 14 44 8 52 8 C70 8 80 22 80 36 C80 48 74 54 70 56 L70 66 C70 72 64 76 58 76 L40 76 C34 76 30 70 30 64 L30 56 C26 52 24 44 24 36 C24 32 26 28 32 28 Z" />
        <ellipse cx="44" cy="38" rx="7" ry="8" />
        <ellipse cx="64" cy="38" rx="6.5" ry="7.5" />
        <path d="M52 48 L48 58 L56 58 Z" />
        <path d="M36 66 L36 74 M44 66 L44 76 M52 66 L52 76 M60 66 L60 74" />
        <path d="M30 64 L70 64" />
        <path d="M22 80 L32 74 M74 82 L68 74" />
      </symbol>
      <symbol id="sch-transmutation" viewBox="0 0 96 96">
        <path d="M48 28 L48 72" />
        <path d="M48 28 C48 16 36 8 24 16 C16 22 16 36 28 40 C36 42 44 38 48 32" />
        <path d="M48 28 C48 16 60 8 72 16 C80 22 80 36 68 40 C60 42 52 38 48 32" />
        <path d="M48 50 C48 42 38 40 28 48 C18 56 20 70 32 70 C42 70 48 62 48 54" />
        <path d="M48 50 C48 42 58 40 68 48 C78 56 76 70 64 70 C54 70 48 62 48 54" />
        <circle cx="48" cy="30" r="2.2" />
        <path d="M44 22 C40 12 32 10 28 14 M52 22 C56 12 64 10 68 14" />
        <path d="M20 78 C20 70 28 66 34 70 C38 73 36 80 28 80 C22 80 20 74 26 72" />
        <path d="M76 78 C84 70 80 62 72 62 C66 62 64 70 70 72" />
      </symbol>
      <symbol id="sch-evocation" viewBox="0 0 96 96">
        <path d="M48 88 C28 88 22 68 30 54 C26 46 28 36 36 32 C34 44 40 46 42 36 C44 24 50 16 48 8 C62 18 70 32 66 48 C78 50 80 68 66 78 C72 70 62 66 58 72 C54 82 52 88 48 88 Z" />
        <path d="M46 80 C38 72 40 60 48 52 C52 62 58 64 56 74" />
        <path d="M20 30 L14 24 M76 30 L82 24 M16 54 L10 54 M80 54 L86 54 M28 16 L24 10 M68 16 L72 10" />
      </symbol>
    </svg>
  )
}

const SPELLBOOK_ROWS: Array<{ name: string; meta: string; badge?: string; action?: string }> = [
  { name: 'Благословение', meta: '1-й круг · концентрация', badge: 'Архетип' },
  { name: 'Лечение ран', meta: '1-й круг', badge: 'Архетип' },
  { name: 'Обнаружение магии', meta: '1-й круг · ритуал · концентрация', action: 'Подготовить' },
  { name: 'Укрытие', meta: '1-й круг', badge: 'Умение: Убежище верных' },
  { name: 'Щит веры', meta: '1-й круг · концентрация', badge: 'Предмет' },
  { name: 'Духовное оружие', meta: '2-й круг', badge: 'Архетип' },
  { name: 'Малое восстановление', meta: '2-й круг', badge: 'Архетип' },
  { name: 'Молитва лечения', meta: '2-й круг', action: 'Подготовлено' },
  { name: 'Направленный снаряд', meta: '1-й круг', action: 'Подготовить' },
  { name: 'Лечащее слово', meta: '1-й круг', action: 'Подготовить' },
  { name: 'Наказ', meta: '1-й круг', action: 'Подготовить' },
  { name: 'Удержание личности', meta: '2-й круг · концентрация', action: 'Подготовить' },
  { name: 'Подмога', meta: '2-й круг', action: 'Подготовить' },
  { name: 'Духовные стражи', meta: '3-й круг · концентрация', action: 'Подготовить' },
  { name: 'Рассеивание магии', meta: '3-й круг', action: 'Подготовить' },
]

function SpellbookRow({
  name,
  meta,
  badge,
  action,
}: {
  name: string
  meta: string
  badge?: string
  action?: string
}) {
  return (
    <li className={`prepare-row${badge ? ' is-granted' : ''}`}>
      <div>
        <div className="prepare-row__name">{name}</div>
        <div className="prepare-row__meta">{meta}</div>
      </div>
      {action ? (
        <button type="button" className="btn">
          {action}
        </button>
      ) : (
        <span className="prepare-row__badge">{badge}</span>
      )}
    </li>
  )
}

function PrepareRow({
  name,
  meta,
  badge,
  action,
}: {
  name: string
  meta?: string[]
  badge?: string
  action?: string
}) {
  return (
    <li className={`prepare-row${badge ? ' is-granted' : ''}`}>
      <div>
        <div className="prepare-row__name">{name}</div>
        {meta && meta.length > 0 ? (
          <div className="prepare-row__meta">
            {meta.map((item) => (
              <span key={item} className="prepare-row__badge">
                {item}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      {action ? (
        <button type="button" className="btn">
          {action}
        </button>
      ) : (
        <span className="prepare-row__badge">{badge}</span>
      )}
    </li>
  )
}

/** Desktop spell column from sheet-desktop.html. Phone keeps PlayDeskSpellsCompact. */
export function SpellsEtalonDesk({
  variant = 'kaedrin',
  onClearSplit,
  onOpenSettings,
}: {
  variant?: SpellMagicVariant
  onClearSplit?: () => void
  onOpenSettings?: () => void
}) {
  const [filter, setFilter] = useState<FilterId>('all')
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState<Set<number>>(() => new Set())
  const [detailId, setDetailId] = useState<string | null>(null)
  const [castId, setCastId] = useState<string | null>(null)
  const [breakOpen, setBreakOpen] = useState(false)
  const [prepareOpen, setPrepareOpen] = useState(false)
  const [spellbookOpen, setSpellbookOpen] = useState(false)
  const detail = detailId ? SPELL_DETAILS[detailId] : null
  const cast = castId ? CAST_VIEWS[castId] : null

  const bookRitualsOnSheet = variant === 'multiclass' || variant === 'warlock'
  const catalog = (variant === 'wizard' ? WIZARD_SPELLS : SPELLS).map((spell) => {
    if (spell.id !== 'detect' || !bookRitualsOnSheet) return spell
    return { ...spell, hidden: false, ritual: false, bookRitual: true }
  })
  const circles = (variant === 'wizard' ? WIZARD_CIRCLES : CIRCLES).map((circle) => {
    if (circle.id === 1 && bookRitualsOnSheet) return { ...circle, count: '5' }
    return circle
  })
  const showBook = variant !== 'kaedrin'
  const circleFilters: SpellCircle[] = variant === 'wizard' ? [0, 1, 2, 3, 4, 5] : [0, 1, 2, 3]

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return catalog.filter((spell) => {
      if (spell.hidden && filter !== 'all' && !q) return false
      if (filter === 'cantrips' && spell.circle !== 0) return false
      if (filter === 'rituals' && !spell.ritual) return false
      if (filter === 'concentration' && !spell.concentration) return false
      if (filter === '0' || filter === '1' || filter === '2' || filter === '3') {
        if (String(spell.circle) !== filter) return false
      }
      if (!q) return true
      return `${spell.name} ${spell.meta}`.toLowerCase().includes(q)
    })
  }, [catalog, filter, query])

  return (
    <>
      <SchoolSprite />
      <h2>
        Заклинания (закреплено)
        <span className="links">
          <button type="button" className="ghost" title="Скрыть магию — основная панель на всю ширину" onClick={onClearSplit}>
            Скрыть магию
          </button>
          <button type="button" className="ghost" data-desk-prepare onClick={() => setPrepareOpen(true)}>
            Подготовить
          </button>
          <button type="button" className="ghost" data-desk-spellbook onClick={() => setSpellbookOpen(true)}>
            Книга
          </button>
          <button type="button" className="ghost" title="Магия: подготовка, настройки" onClick={onOpenSettings}>
            Магия
          </button>
        </span>
      </h2>
      <div className="spell-cast-row">
        {CASTER_CHIPS[variant].map((chip) => (
          <button
            key={`${chip.name}-${chip.stats}`}
            type="button"
            className={`cast-chip ${chip.cls}`}
            aria-label="Сл. спас. и атака заклинаний"
            onClick={() => setBreakOpen(true)}
          >
            <span className="cast-chip__profile">
              {chip.name} · <span className="cast-chip__abil">{chip.abil}</span> · {chip.stats}
            </span>
            <span className="cast-chip__quota">{chip.quota}</span>
          </button>
        ))}
      </div>
      <div className="spell-head-tools">
        <button type="button" className="chip is-on" aria-pressed="true">Фокус <span className="chip-mark">✓</span></button>
        <button type="button" className="chip is-on" aria-pressed="true">Мешочек <span className="chip-mark">✓</span></button>
        {showBook ? (
          <button type="button" className="ghost" title="Ритуалы из книги — каст без ячейки">Ритуалы из книги</button>
        ) : null}
      </div>
      <div className="filters">
        {(
          [
            ['all', 'все'],
            ['cantrips', 'заговоры'],
            ['rituals', 'ритуалы'],
            ['concentration', 'концентрация'],
          ] as Array<[FilterId, string]>
        ).map(([id, label]) => (
          <button key={id} type="button" className={`chip${filter === id ? ' is-on' : ''}`} onClick={() => setFilter(id)}>
            {label}
          </button>
        ))}
        {showBook ? (
          <button type="button" className={`chip${filter === 'rituals' ? '' : ''}`}>ритуалы из книги</button>
        ) : null}
        <span className="filters-sep" aria-hidden="true" />
        {circleFilters.map((circle) => (
          <button
            key={circle}
            type="button"
            className={`chip${filter === String(circle) ? ' is-on' : ''}`}
            onClick={() => setFilter(String(circle) as FilterId)}
          >
            {circle}
          </button>
        ))}
      </div>
      <label className="sr-only" htmlFor="spell-search">Поиск заклинания</label>
      <input
        id="spell-search"
        type="search"
        placeholder="Поиск по названию"
        aria-label="Поиск заклинания"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {PACT_POOL[variant] ? <PactSlots pool={PACT_POOL[variant]} /> : null}
      <div className="spell-collapse-row">
        <button type="button" className="chip" onClick={() => setCollapsed(new Set([0, 1, 2, 3]))}>Свернуть все</button>
        <button type="button" className="chip" onClick={() => setCollapsed(new Set())}>Развернуть все</button>
        <button type="button" className="chip">Сбросить порядок (А–Я)</button>
      </div>
      <div className="list">
        {circles.map((circle) => {
          const rows = shown.filter((spell) => spell.circle === circle.id)
          if (filter !== 'all' && rows.length === 0 && circle.id === 3 && filter !== '3') return null
          if ((filter === 'cantrips' || filter === 'rituals' || filter === 'concentration' || filter === '0' || filter === '1' || filter === '2') && rows.length === 0) return null
          const isCollapsed = collapsed.has(circle.id)
          return (
            <div
              key={circle.id}
              className={`spell-circle${isCollapsed ? ' is-collapsed' : ''}${rows.length === 0 ? ' is-empty' : ''}`}
            >
              <div className="circle-head">
                <button
                  type="button"
                  className="circle-toggle"
                  aria-expanded={!isCollapsed}
                  onClick={() =>
                    setCollapsed((prev) => {
                      const next = new Set(prev)
                      if (next.has(circle.id)) next.delete(circle.id)
                      else next.add(circle.id)
                      return next
                    })
                  }
                >
                  <span className="circle-chevron" aria-hidden="true">{isCollapsed ? '▸' : '▾'}</span>
                  <strong>{circle.title}</strong>
                  <span className="circle-count">{circle.count}</span>
                </button>
                {circle.slots ? (
                  <span className="slots" aria-label={circle.slots}>
                    <span className="slot-count">{circle.slots}</span>
                    {Array.from({ length: Number(circle.slots.match(/(\d+)\/(\d+)/)?.[2] ?? 0) }).map((_, index) => (
                      <button key={index} type="button" className="pip is-on" aria-label={`Ячейка ${index + 1}`} />
                    ))}
                  </span>
                ) : null}
              </div>
              {rows.map((spell) => (
                <article
                  key={spell.id}
                  className={`plaque is-spell${spell.granted ? ' is-granted' : ''}`}
                  hidden={spell.hidden || undefined}
                >
                  {schoolSymbol(spell.school) ? (
                    <div className="plaque-art" aria-hidden="true">
                      <svg viewBox="0 0 96 96" className="icon-ink" width="100%" height="100%">
                        <use href={`#${schoolSymbol(spell.school)}`} />
                      </svg>
                    </div>
                  ) : null}
                  <div className="plaque__body">
                    <div className="spell-top">
                      <button
                        type="button"
                        className="plaque__name"
                        onClick={() => {
                          if (SPELL_DETAILS[spell.id]) setDetailId(spell.id)
                        }}
                      >
                        {spell.name}
                      </button>
                      <span className="spell-level">{spell.level}</span>
                      {spell.dmg ? <span className="spell-dmg">{spell.dmg}</span> : null}
                      {spell.tags ? <span className="spell-level">{spell.tags}</span> : null}
                      {spell.bookRitual ? <span className="spell-flag">ритуал · из книги</span> : null}
                      {spell.ritual ? <span className="spell-flag is-ritual">ритуал</span> : null}
                      {spell.concentration ? <span className="spell-flag is-conc">конц.</span> : null}
                    </div>
                    {spell.meta ? <div className="plaque__meta">{spell.meta}</div> : null}
                  </div>
                  <div className="plaque__actions">
                    <button
                      type="button"
                      className="primary"
                      onClick={() => {
                        if (CAST_VIEWS[spell.id]) setCastId(spell.id)
                      }}
                    >
                      Каст
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )
        })}
      </div>
      {detail ? (
        <Dialog
          open
          title={detail.name}
          primaryLabel="Каст"
          onPrimary={() => setDetailId(null)}
          secondaryLabel="Закрыть"
          onSecondary={() => setDetailId(null)}
          showActions={false}
          showClose
          onDismiss={() => setDetailId(null)}
          className="desk-spell-detail"
        >
          <div className="spell-detail">
            <p className="flags">{detail.flags}</p>
            <p>{detail.meta}</p>
            {detail.preview ? (
              <p>
                <b>{detail.preview}</b>
              </p>
            ) : null}
            <p>{detail.text}</p>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn" onClick={() => setDetailId(null)}>
              Закрыть
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                setDetailId(null)
                if (detailId && CAST_VIEWS[detailId]) setCastId(detailId)
              }}
            >
              Каст
            </button>
          </div>
        </Dialog>
      ) : null}
      {prepareOpen ? (
        <Dialog
          open
          title="Подготовить заклинания"
          size="wide"
          primaryLabel="Готово"
          onPrimary={() => setPrepareOpen(false)}
          secondaryLabel="Закрыть"
          onSecondary={() => setPrepareOpen(false)}
          showActions={false}
          showClose
          onDismiss={() => setPrepareOpen(false)}
          className="desk-prepare"
        >
          <p className="prepare-limit">Лимит 1/8 · всегда 5</p>
          <div className="prepare-tabs" role="tablist">
            <button type="button" className="chip is-on">
              Подготовленные
            </button>
            <button type="button" className="chip">
              Список класса
            </button>
          </div>
          <p className="spell-group-label">1-й круг</p>
          <ul className="prepare-list">
            <PrepareRow name="Благословение" meta={['концентрация', 'всегда']} badge="Архетип" />
            <PrepareRow name="Лечение ран" meta={['всегда']} badge="Архетип" />
            <PrepareRow name="Укрытие" meta={['всегда']} badge="Умение: Убежище верных" />
            <PrepareRow name="Щит веры" meta={['концентрация']} badge="Предмет" />
          </ul>
          <p className="spell-group-label">2-й круг</p>
          <ul className="prepare-list">
            <PrepareRow name="Духовное оружие" meta={['всегда']} badge="Архетип" />
            <PrepareRow name="Малое восстановление" meta={['всегда']} badge="Архетип" />
            <PrepareRow name="Молитва лечения" action="Убрать" />
          </ul>
          <div className="modal-actions">
            <button type="button" className="btn" onClick={() => setPrepareOpen(false)}>
              Закрыть
            </button>
            <button type="button" className="btn primary" onClick={() => setPrepareOpen(false)}>
              Готово
            </button>
          </div>
        </Dialog>
      ) : null}
      {spellbookOpen ? (
        <Dialog
          open
          title="Книга заклинаний"
          size="wide"
          primaryLabel="Готово"
          onPrimary={() => setSpellbookOpen(false)}
          secondaryLabel="Своё заклинание"
          onSecondary={() => setSpellbookOpen(false)}
          showActions={false}
          showClose
          onDismiss={() => setSpellbookOpen(false)}
          className="desk-spellbook"
        >
          <div className="prepare-tabs">
            <button type="button" className="chip is-on">
              Жрец · список класса
            </button>
          </div>
          <p className="prepare-limit">Подготовка 1/8 · всегда 5</p>
          <p className="flags">Полный список класса жреца: отметь, что подготовлено на сегодня.</p>
          <ul className="prepare-list">
            {SPELLBOOK_ROWS.map((row) => (
              <SpellbookRow key={row.name} {...row} />
            ))}
          </ul>
          <div className="modal-actions">
            <button type="button" className="btn" onClick={() => setSpellbookOpen(false)}>
              Своё заклинание
            </button>
            <button type="button" className="btn primary" onClick={() => setSpellbookOpen(false)}>
              Готово
            </button>
          </div>
        </Dialog>
      ) : null}
      {breakOpen ? (
        <Dialog
          open
          title="Заклинания: сл. спас. и атака"
          size="wide"
          primaryLabel="Готово"
          onPrimary={() => setBreakOpen(false)}
          secondaryLabel="Закрыть"
          onSecondary={() => setBreakOpen(false)}
          showActions={false}
          showClose
          onDismiss={() => setBreakOpen(false)}
          className="desk-cast-break"
        >
          <p className="flags">8+БМ+мод / БМ+мод</p>
          <div className="break-hero-badges">
            <div className="break-badge" aria-label="Сл. спас. 14">
              <b>14</b>
              <span>сл. спас.</span>
            </div>
            <div className="break-badge" aria-label="Атака +6">
              <b>+6</b>
              <span>атака</span>
            </div>
          </div>
          <section className="ac-break">
            <h3>Сл. спасброска</h3>
            <div className="ac-break__base">База 14 · 8+БМ+мод · Жрец · МУД</div>
            <button type="button" className="ac-break__add">
              + Добавить бонус
            </button>
          </section>
          <section className="ac-break">
            <h3>Атака заклинанием</h3>
            <div className="ac-break__base">База +6 · БМ+мод</div>
            <button type="button" className="ac-break__add">
              + Добавить бонус
            </button>
          </section>
          <div className="ac-break__foot">
            <button type="button" className="btn" onClick={() => setBreakOpen(false)}>
              Закрыть
            </button>
            <button type="button" className="btn primary" onClick={() => setBreakOpen(false)}>
              Готово
            </button>
          </div>
        </Dialog>
      ) : null}
      {cast ? (
        <Dialog
          open
          title={cast.title}
          primaryLabel="Каст"
          onPrimary={() => setCastId(null)}
          secondaryLabel="Отмена"
          onSecondary={() => setCastId(null)}
          showActions={false}
          showClose
          onDismiss={() => setCastId(null)}
          className="desk-cast"
        >
          <p className="cast-meta">
            <strong>{cast.name}</strong>
            {cast.meta ? ` · ${cast.meta}` : ''}
          </p>
          {cast.preview ? (
            <div className="cast-preview">
              {cast.previewLabel}
              <b>{cast.preview}</b>
            </div>
          ) : null}
          <p className="cast-comp">{cast.comp}</p>
          <p className="cast-note">{cast.rest}</p>
          {cast.time ? <p className="cast-note">{cast.time}</p> : null}
          <div className="modal-actions">
            <button type="button" className="btn" onClick={() => setCastId(null)}>
              Отмена
            </button>
            <button type="button" className="btn primary" onClick={() => setCastId(null)}>
              Каст
            </button>
          </div>
        </Dialog>
      ) : null}
    </>
  )
}
