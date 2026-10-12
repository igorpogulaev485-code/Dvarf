import {
  formatSpellComponents,
  spellSchoolLabelRu,
} from '../../shared/dnd/spellCatalog'
import { levelLabel } from '../../shared/dnd/spells'
import { Dialog, Stack, Text } from '../../ui'
import { grantCastRemaining, spellSourceBadge, type SheetSpell } from './spells'

type SpellDetailDialogProps = {
  open: boolean
  spell: SheetSpell | null
  onClose: () => void
  /** Optional: jump to cast flow from the detail sheet. */
  onCast?: () => void
}

/** Full read-only spell card from sheet fields (notes + higher levels). */
export function SpellDetailDialog({
  open,
  spell,
  onClose,
  onCast,
}: SpellDetailDialogProps) {
  if (!spell) return null

  const source = spellSourceBadge(spell)
  const grantLeft =
    spell.grant_cast && spell.grant_cast.max > 0 ? grantCastRemaining(spell) : null
  const school = spell.school ? spellSchoolLabelRu(spell.school) : ''
  const comps = spell.components ? formatSpellComponents(spell.components) : ''
  const rows: Array<{ label: string; value: string }> = [
    { label: 'Уровень', value: levelLabel(spell.level) },
    { label: 'Время', value: spell.casting_time.trim() },
    { label: 'Дистанция', value: spell.range.trim() },
    { label: 'Длительность', value: (spell.duration ?? '').trim() },
    { label: 'Компоненты', value: comps },
    { label: 'Школа', value: school },
    { label: 'Атака / спас', value: spell.attack_or_save.trim() },
    { label: 'Урон / эффект', value: spell.damage.trim() },
    { label: 'Источник', value: (spell.source_book ?? '').trim() },
  ].filter((row) => row.value && row.value !== '—')

  const flags = [
    spell.ritual ? 'ритуал' : '',
    spell.concentration ? 'концентрация' : '',
    source ? source.label : '',
  ].filter(Boolean)

  return (
    <Dialog
      open={open}
      title={spell.name || 'Заклинание'}
      size="wide"
      primaryLabel={onCast ? 'Каст' : 'Закрыть'}
      secondaryLabel={onCast ? 'Закрыть' : undefined}
      onPrimary={() => {
        if (onCast) onCast()
        else onClose()
      }}
      onSecondary={onCast ? onClose : undefined}
    >
      <Stack gap={12}>
        {flags.length > 0 ? (
          <Text tone="muted">{flags.join(' · ')}</Text>
        ) : null}
        {source ? (
          <Text tone="muted" title={source.title}>
            Подготовлено за счёт: <strong>{source.label}</strong>
            {grantLeft != null
              ? ` · ${source.label} ${grantLeft}/${spell.grant_cast!.max} без ячейки`
              : ''}
          </Text>
        ) : null}

        <div className="spell-detail-grid">
          {rows.map((row) => (
            <div key={row.label} className="spell-detail-grid__cell">
              <Text tone="muted">{row.label}</Text>
              <div>{row.value}</div>
            </div>
          ))}
        </div>

        {spell.higher_levels?.trim() ? (
          <div>
            <Text tone="muted">На больших уровнях</Text>
            <Text>{spell.higher_levels.trim()}</Text>
          </div>
        ) : null}

        {spell.notes?.trim() ? (
          <div>
            <Text tone="muted">Заметки</Text>
            <Text>{spell.notes.trim()}</Text>
          </div>
        ) : null}

        {!spell.notes?.trim() && !spell.higher_levels?.trim() && rows.length === 0 ? (
          <Text tone="muted">На листе пока мало данных — открой полное редактирование.</Text>
        ) : null}
      </Stack>
    </Dialog>
  )
}
