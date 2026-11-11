/**
 * Spell Mastery (PHB 18) and Signature Spells (PHB 20): picks from the book.
 */

import { Button, Field, Stack, Text } from '../../ui'
import type { FeaturePicksState } from '../../shared/dnd/featurePicks'
import {
  SIGNATURE_SPELLS_FEATURE_ID,
  SPELL_MASTERY_FEATURE_ID,
  masterySpellIds,
  setWizardCapstonePick,
} from '../../shared/dnd/wizardTradition'
import { getFeaturePickList } from '../../shared/dnd/featurePicks'
import type { SheetSpell } from './spells'

type WizardCapstonePicksProps = {
  featureId: string
  classEntryId: string
  spells: SheetSpell[]
  featurePicks: FeaturePicksState
  onFeaturePicksChange: (picks: FeaturePicksState) => void
  onToast?: (message: string) => void
}

export function WizardCapstonePicks({
  featureId,
  classEntryId,
  spells,
  featurePicks,
  onFeaturePicksChange,
  onToast,
}: WizardCapstonePicksProps) {
  const mastery = featureId === SPELL_MASTERY_FEATURE_ID
  const signature = featureId === SIGNATURE_SPELLS_FEATURE_ID
  if (!mastery && !signature) return null
  const book = spells.filter(
    (spell) => spell.level > 0 && spell.in_spellbook !== false && spell.name.trim(),
  )
  const selected = mastery
    ? masterySpellIds(featurePicks, classEntryId)
    : getFeaturePickList(featurePicks, classEntryId, SIGNATURE_SPELLS_FEATURE_ID)
  const slots = mastery
    ? [
        { level: 1, label: '1 круг' },
        { level: 2, label: '2 круг' },
      ]
    : [
        { level: 3, label: 'Первое, 3 круг' },
        { level: 3, label: 'Второе, 3 круг' },
      ]

  function write(nextIds: string[]) {
    onFeaturePicksChange(
      setWizardCapstonePick(featurePicks, classEntryId, featureId, nextIds),
    )
  }

  return (
    <div className="feature-resource">
      <Text tone="muted">
        {mastery
          ? 'Из книги. Бесплатный базовый каст только пока заклинание подготовлено. Замена — 8 часов изучения.'
          : 'Из книги. Всегда подготовлены вне лимита. У каждого свой бесплатный каст, не общий запас на двоих.'}
      </Text>
      <Stack gap={8}>
        {slots.map((slot, index) => {
          const options = book.filter((spell) => spell.level === slot.level)
          const value = selected[index] ?? ''
          return (
            <Field key={`${slot.label}:${index}`} label={slot.label}>
              <select
                className="play-select"
                value={value}
                onChange={(event) => {
                  const next = [...selected]
                  while (next.length < slots.length) next.push('')
                  next[index] = event.target.value
                  const cleaned = next.filter(Boolean)
                  if (signature && new Set(cleaned).size !== cleaned.length) {
                    onToast?.('Два фирменных заклинания должны быть разными')
                    return
                  }
                  write(next)
                  onToast?.(
                    mastery
                      ? 'Мастерство заклинаний записано. Замена потребует 8 часов изучения.'
                      : 'Фирменные заклинания записаны',
                  )
                }}
              >
                <option value="">Не выбрано</option>
                {options.map((spell) => (
                  <option key={spell.id} value={spell.id} disabled={signature && selected.includes(spell.id) && spell.id !== value}>
                    {spell.name}
                  </option>
                ))}
              </select>
            </Field>
          )
        })}
        {selected.some(Boolean) ? (
          <Button type="button" variant="secondary" onClick={() => write([])}>
            {mastery ? 'Сбросить (8 часов изучения)' : 'Сбросить выбор'}
          </Button>
        ) : null}
      </Stack>
    </div>
  )
}
