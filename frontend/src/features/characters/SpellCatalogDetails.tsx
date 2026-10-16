import { useState } from 'react'
import {
  formatSpellComponents,
  parseSpellCatalogData,
  spellSchoolLabelRu,
} from '../../shared/dnd/spellCatalog'
import { Text } from '../../ui'

type SpellCatalogDetailsProps = {
  data: Record<string, unknown>
  /** Compact one-line meta under the title. */
  compact?: boolean
}

export function SpellCatalogDetails({ data, compact = false }: SpellCatalogDetailsProps) {
  const [open, setOpen] = useState(false)
  const parsed = parseSpellCatalogData(data)
  const school = parsed.school ? spellSchoolLabelRu(parsed.school) : ''
  const meta = [
    parsed.casting_time_label,
    parsed.range,
    parsed.duration,
    formatSpellComponents(parsed.components),
    parsed.attack_or_save,
    parsed.damage,
    school,
    parsed.source_book,
  ].filter(Boolean)

  const hasBody = Boolean(parsed.description || parsed.higher_levels)

  if (compact) {
    return (
      <div className="spell-catalog-details spell-catalog-details--compact">
        <Text tone="muted">{meta.join(' · ') || '—'}</Text>
        {parsed.ritual ? <span className="prepare-row__badge">Ритуал</span> : null}
        {parsed.concentration ? <span className="prepare-row__badge">К</span> : null}
        {hasBody ? (
          <>
            <button
              type="button"
              className="spell-catalog-details__toggle"
              onClick={() => setOpen((value) => !value)}
            >
              {open ? 'Скрыть текст' : 'Текст'}
            </button>
            {open ? (
              <div className="spell-catalog-details__body">
                {parsed.description ? <p>{parsed.description}</p> : null}
                {parsed.higher_levels ? (
                  <p>
                    <strong>На больших уровнях.</strong> {parsed.higher_levels}
                  </p>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    )
  }

  return (
    <div className="spell-catalog-details">
      <div className="spell-catalog-details__grid">
        {parsed.casting_time_label ? (
          <div>
            <Text tone="muted">Время</Text>
            <div>{parsed.casting_time_label}</div>
          </div>
        ) : null}
        {parsed.range ? (
          <div>
            <Text tone="muted">Дистанция</Text>
            <div>{parsed.range}</div>
          </div>
        ) : null}
        {parsed.duration ? (
          <div>
            <Text tone="muted">Длительность</Text>
            <div>{parsed.duration}</div>
          </div>
        ) : null}
        <div>
          <Text tone="muted">Компоненты</Text>
          <div>{formatSpellComponents(parsed.components)}</div>
        </div>
        {school ? (
          <div>
            <Text tone="muted">Школа</Text>
            <div>{school}</div>
          </div>
        ) : null}
        {parsed.source_book ? (
          <div>
            <Text tone="muted">Источник</Text>
            <div>{parsed.source_book}</div>
          </div>
        ) : null}
        {parsed.attack_or_save ? (
          <div>
            <Text tone="muted">Атака / спас</Text>
            <div>{parsed.attack_or_save}</div>
          </div>
        ) : null}
        {parsed.damage ? (
          <div>
            <Text tone="muted">Эффект</Text>
            <div>{parsed.damage}</div>
          </div>
        ) : null}
      </div>
      <div className="chip-row">
        {parsed.ritual ? <span className="sheet-chip is-on">Ритуал</span> : null}
        {parsed.concentration ? <span className="sheet-chip is-on">Концентрация</span> : null}
      </div>
      {hasBody ? (
        <>
          <button
            type="button"
            className="spell-catalog-details__toggle"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? 'Скрыть описание' : 'Описание'}
          </button>
          {open ? (
            <div className="spell-catalog-details__body">
              {parsed.description ? <p>{parsed.description}</p> : null}
              {parsed.higher_levels ? (
                <p>
                  <strong>На больших уровнях.</strong> {parsed.higher_levels}
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      ) : (
        <Text tone="muted">Текст появится после наполнения справочника.</Text>
      )}
    </div>
  )
}
