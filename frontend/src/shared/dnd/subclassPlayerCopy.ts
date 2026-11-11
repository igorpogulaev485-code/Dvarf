/**
 * User-facing subclass notes. Catalog seeds still contain internal «later»
 * markers; the sheet must show the 2014/Tasha rule and the real limitation.
 */

const EXACT: Record<string, string> = {
  'Martial weapons + smith\'s tools; INT вместо STR/DEX для magic weapons — правило атаки later.':
    'Владение воинским оружием и инструментами кузнеца. Атака магическим оружием может идти от Интеллекта вместо Силы или Ловкости — бонус на карточке атаки выставь вручную.',
  'Влияет на оружие доспеха / скорость; сохранить pick; смена при long rest — later.':
    'Модель задаёт оружие доспеха и скорость. Сменить модель можно после короткого или продолжительного отдыха: выбери другую модель здесь.',
  'Также 1 заговор друида — later_spells / traits.':
    'Дополнительно один заговор друида. Если карточки ещё нет — выбери его в заклинаниях; обычный лимит заговоров он не занимает.',
  'Bonus cantrip — later. Natural Recovery — фича.':
    'Дополнительный заговор друида. Восстановление сил — отдельное умение круга.',
  '+ cantrip (prestidigitation/druidcraft) — later_spells.':
    'Дополнительный заговор: Фокусы или Искусство друидов. Добавь его в список заклинаний, если карточки ещё нет.',
  'Без владений; заклинания пути — later_spells.':
    'Без владений. Заклинания пути тени бери из каталога, когда открывается уровень, если они ещё не на листе.',
  'Клятво-заклинания — later_spells; Channel Divinity — фича.':
    'Заклинания клятвы всегда подготовлены и не занимают лимит. Божественный канал — отдельное умение.',
  'Expanded spells — later. Patron at 1.':
    'Расширенный список покровителя доступен при выборе заклинаний. Покровитель берётся на 1 уровне.',
  'PHB Circle Spells: always-prepared по выбранной земле (3/5/7/9).':
    'Заклинания круга выбранной земли всегда подготовлены: с 3, 5, 7 и 9 уровня.',
  'Circle Spells по land_type (8 земель × 8 заклинаний). Bonus Cantrip (+1 заговор друида) — бюджет cantrips отдельно.':
    'Заклинания круга зависят от выбранной земли. Дополнительный заговор друида не занимает обычный бюджет заговоров.',
}

export function presentSubclassCopy(raw: string | undefined | null): string | undefined {
  if (typeof raw !== 'string') return undefined
  const text = raw.trim()
  if (!text) return undefined
  return EXACT[text] ?? text
}

export function subclassCopyHasInternalLater(text: string): boolean {
  return /\blater\b/i.test(text)
}
