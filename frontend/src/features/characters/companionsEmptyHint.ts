/**
 * COMP-01: empty-state copy for the Companions scene by host class / subclass.
 */

import type { CompanionsEmptyHint } from './CompanionsPanel'

type ClassLike = {
  id: string
  name: string
  level?: number
  subclass_name?: string | null
}

export function resolveCompanionsEmptyHint(input: {
  classes: ClassLike[]
  subclassSlugByEntryId?: Record<string, string | null | undefined>
  /** 2024 uses the «Дикий спутник…» card button; 2014 keeps the Wild Shape fork. */
  rulesEdition?: '2014' | '2024' | string | null
}): CompanionsEmptyHint {
  const classes = input.classes
  const slugOf = (row: ClassLike) =>
    (input.subclassSlugByEntryId?.[row.id] || row.subclass_name || '').toLowerCase()

  const druid = classes.find((row) => /друид|druid/i.test(row.name))
  if (druid) {
    if (input.rulesEdition === '2024') {
      return {
        kind: 'druid',
        title: 'Нет спутника',
        description:
          'Дикий спутник — через кнопку «Дикий спутник…» на умении друида. Можно добавить вручную.',
        actionLabel: 'Дикий спутник…',
      }
    }
    return {
      kind: 'druid',
      title: 'Нет спутника',
      description:
        'Дикий спутник — через кнопку «Через Дикий облик…» на умении друида. Можно добавить вручную.',
      actionLabel: 'Через Дикий облик…',
    }
  }

  const warlock = classes.find((row) => /колдун|warlock/i.test(row.name))
  if (warlock) {
    const slug = slugOf(warlock)
    const vestige =
      /vestige/i.test(slug) || /предтеч/i.test(warlock.subclass_name || '')
    if (vestige && (warlock.level ?? 1) >= 3) {
      return {
        kind: 'generic',
        title: 'Нет спутника-предтечи',
        description:
          'У Предтечи спутник появляется после выбора типа (Исчадие / Небожитель / Нежить). Можно добавить вручную.',
        actionLabel: '+ Добавить',
      }
    }
  }

  const wizard = classes.find((row) =>
    /волшебник|wizard|колдун|warlock|чародей|sorcerer/i.test(row.name),
  )
  if (wizard && /волшебник|wizard|колдун|warlock/i.test(wizard.name)) {
    return {
      kind: 'wizard',
      title: 'Нет фамильяра',
      description:
        'Кастни «Поиск фамильяра» (ячейка или ритуал) — после выбора облика карточка появится сама.',
      actionLabel: 'Поиск фамильяра',
    }
  }

  const paladin = classes.find((row) => /паладин|paladin/i.test(row.name))
  if (paladin) {
    return {
      kind: 'paladin',
      title: 'Нет скакуна',
      description:
        'Кастни «Поиск скакуна» — после выбора облика скакун появится в «Напарниках».',
      actionLabel: 'Поиск скакуна',
    }
  }

  const ranger = classes.find((row) => /следопыт|ranger/i.test(row.name))
  if (ranger) {
    const slug = slugOf(ranger)
    const beast =
      /beast|звер|повелитель/i.test(slug) ||
      /звер|повелитель|beast/i.test(ranger.subclass_name || '')
    if (beast) {
      return {
        kind: 'ranger_beast',
        title: 'Нет спутника архетипа',
        description:
          'У повелителя зверей слот зверя появляется от архетипа. Заполни статы из бестиария или добавь вручную.',
        actionLabel: '+ Добавить',
      }
    }
  }

  return {
    kind: 'generic',
    title: 'Пока пусто',
    description:
      'Спутники архетипа и призывы умений появятся здесь. Можно добавить вручную.',
    actionLabel: '+ Добавить',
  }
}
