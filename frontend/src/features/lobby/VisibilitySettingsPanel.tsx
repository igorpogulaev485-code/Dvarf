import { useMemo, useState } from 'react'
import { Button, Panel, Stack, Text } from '../../ui'
import {
  applyVisibilityPreset,
  sectionCheckboxState,
  VISIBILITY_FIELD_META,
  type EventHistoryMode,
  type FieldPreset,
  type VisibilityProfile,
} from './visibilityProfile'

type Props = {
  profile: VisibilityProfile
  readOnly?: boolean
  playerPreview?: boolean
  onPlayerPreviewChange?: (value: boolean) => void
  onChange: (next: VisibilityProfile) => void
}

const EVENT_OPTIONS: Array<{ id: EventHistoryMode; label: string }> = [
  { id: 'active', label: 'Активно' },
  { id: 'hide_master_rolls', label: 'Без бросков мастера' },
  { id: 'off', label: 'Выключено' },
]

const PRESET_OPTIONS: Array<{ id: FieldPreset; label: string }> = [
  { id: 'all', label: 'Всё видно' },
  { id: 'complex_combat', label: 'Сложные бои' },
  { id: 'minimum', label: 'Минимум' },
  { id: 'custom', label: 'Свой набор' },
]

function modeLabel(mode: string): string {
  if (mode === 'color_only') return 'Только цвет'
  if (mode === 'off') return 'Выключено'
  return 'Активно'
}

export function VisibilitySettingsPanel({
  profile,
  readOnly,
  playerPreview = false,
  onPlayerPreviewChange,
  onChange,
}: Props) {
  const [open, setOpen] = useState<Partial<Record<keyof VisibilityProfile['fields'], boolean>>>({
    identity: true,
  })

  const sections = useMemo(
    () => Object.keys(VISIBILITY_FIELD_META) as Array<keyof VisibilityProfile['fields']>,
    [],
  )

  function setEventHistory(mode: EventHistoryMode) {
    if (readOnly) return
    onChange({ ...profile, event_history: mode })
  }

  function setPreset(preset: FieldPreset) {
    if (readOnly) return
    if (preset === 'custom') {
      onChange({ ...profile, preset: 'custom' })
      return
    }
    onChange(applyVisibilityPreset(preset))
  }

  function toggleSection(key: keyof VisibilityProfile['fields']) {
    if (readOnly) return
    const section = profile.fields[key]
    const nextEnabled = !section.enabled
    onChange({
      ...profile,
      preset: 'custom',
      fields: {
        ...profile.fields,
        [key]: { ...section, enabled: nextEnabled },
      },
    })
  }

  function setFieldMode(
    sectionKey: keyof VisibilityProfile['fields'],
    fieldKey: string,
    mode: string,
  ) {
    if (readOnly) return
    const section = profile.fields[sectionKey]
    onChange({
      ...profile,
      preset: 'custom',
      fields: {
        ...profile.fields,
        [sectionKey]: { ...section, [fieldKey]: mode },
      },
    })
  }

  return (
    <Panel title="Видимость для игроков">
      <Stack gap={16}>
        <div className="visibility-preview-row">
          <Text tone="muted">
            Что игроки видят на карточках и в истории. Настройки на всё лобби.
          </Text>
          {onPlayerPreviewChange ? (
            <label className="visibility-preview-toggle">
              <input
                type="checkbox"
                checked={playerPreview}
                onChange={(e) => onPlayerPreviewChange(e.target.checked)}
              />
              <span>Глазами игрока</span>
            </label>
          ) : null}
        </div>

        <div>
          <Text as="h3">История событий</Text>
          <div className="chip-row visibility-chip-row">
            {EVENT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`sheet-chip${profile.event_history === opt.id ? ' is-on' : ''}`}
                disabled={readOnly}
                onClick={() => setEventHistory(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Text as="h3">Профиль полей</Text>
          <div className="chip-row visibility-chip-row">
            {PRESET_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`sheet-chip${profile.preset === opt.id ? ' is-on' : ''}`}
                disabled={readOnly}
                onClick={() => setPreset(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="visibility-sections">
          {sections.map((sectionKey) => {
            const meta = VISIBILITY_FIELD_META[sectionKey]
            const section = profile.fields[sectionKey]
            const state = sectionCheckboxState(section)
            const isOpen = Boolean(open[sectionKey])
            return (
              <div className="visibility-section" key={sectionKey}>
                <div className="visibility-section__head">
                  <label className="visibility-section__check">
                    <input
                      type="checkbox"
                      checked={state !== 'off'}
                      ref={(el) => {
                        if (el) el.indeterminate = state === 'partial'
                      }}
                      disabled={readOnly}
                      onChange={() => toggleSection(sectionKey)}
                    />
                    <span>{meta.label}</span>
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    className="visibility-section__toggle"
                    aria-expanded={isOpen}
                    onClick={() => setOpen((prev) => ({ ...prev, [sectionKey]: !isOpen }))}
                  >
                    {isOpen ? '▴' : '▾'}
                  </Button>
                </div>
                {isOpen ? (
                  <Stack gap={10} className="visibility-section__body">
                    {meta.keys.map((field) => {
                      const modes = field.modes ?? (['active', 'off'] as const)
                      const sectionRecord = section as unknown as Record<string, string>
                      const current = String(sectionRecord[field.key] ?? 'off')
                      return (
                        <div className="visibility-field" key={field.key}>
                          <Text className="visibility-field__label">{field.label}</Text>
                          <div className="chip-row visibility-chip-row">
                            {modes.map((mode) => (
                              <button
                                key={mode}
                                type="button"
                                className={`sheet-chip${current === mode ? ' is-on' : ''}`}
                                disabled={readOnly || !section.enabled}
                                onClick={() => setFieldMode(sectionKey, field.key, mode)}
                              >
                                {modeLabel(mode)}
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </Stack>
                ) : null}
              </div>
            )
          })}
        </div>
      </Stack>
    </Panel>
  )
}
