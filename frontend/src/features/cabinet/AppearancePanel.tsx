import { useEffect, useState } from 'react'
import { updateMe, type User } from '../../shared/api/auth'
import { ApiRequestError } from '../../shared/api/client'
import {
  THEME_OPTIONS,
  applyAccountAppearance,
  normalizeAppearance,
  type AbilityColorsMode,
  type AccountAppearance,
  type ThemeId,
} from '../../shared/theme/accountAppearance'
import { Stack, Text } from '../../ui'

type AppearancePanelProps = {
  user: User
  onSaved: (user: User) => void
}

export function AppearancePanel({ user, onSaved }: AppearancePanelProps) {
  const fromUser = normalizeAppearance(user)
  const [current, setCurrent] = useState<AccountAppearance>(fromUser)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setCurrent(normalizeAppearance(user))
  }, [user])

  async function save(patch: { theme_id?: ThemeId; ability_colors?: AbilityColorsMode }) {
    setPending(true)
    setError(null)
    const previous = current
    const nextLocal = normalizeAppearance({
      themeId: patch.theme_id ?? current.themeId,
      abilityColors: patch.ability_colors ?? current.abilityColors,
    })
    // Optimistic preview + chip selection while request runs.
    setCurrent(nextLocal)
    applyAccountAppearance(nextLocal)
    try {
      const updated = await updateMe(patch)
      const saved = normalizeAppearance(updated)
      setCurrent(saved)
      applyAccountAppearance(saved)
      onSaved(updated)
    } catch (err) {
      setCurrent(previous)
      applyAccountAppearance(previous)
      setError(err instanceof ApiRequestError ? err.message : 'Не удалось сохранить оформление')
    } finally {
      setPending(false)
    }
  }

  return (
    <Stack gap={16}>
      <Text tone="muted">
        Цвет темы красит кнопки, вкладки, фильтры и заголовки панелей. Пергамент общий.
      </Text>

      <div>
        <Text as="h3" className="cabinet-appearance__label">
          Цвет темы
        </Text>
        <div className="cabinet-theme-grid" role="radiogroup" aria-label="Цвет темы аккаунта">
          {THEME_OPTIONS.map((theme) => {
            const on = current.themeId === theme.id
            return (
              <button
                key={theme.id}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={pending}
                className={`cabinet-theme-card${on ? ' is-on' : ''}`}
                style={{ ['--swatch' as string]: theme.accent, ['--swatch-soft' as string]: theme.soft }}
                onClick={() => {
                  if (on) return
                  void save({ theme_id: theme.id })
                }}
              >
                <span className="cabinet-theme-card__swatch" aria-hidden="true" />
                <span className="cabinet-theme-card__meta">
                  <span className="cabinet-theme-card__name">{theme.name}</span>
                  <span className="cabinet-theme-card__sub">
                    {theme.ability}
                    {theme.note ? ` · ${theme.note}` : ''} · {theme.accent}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <Text as="h3" className="cabinet-appearance__label">
          Цвета характеристик
        </Text>
        <Text tone="muted" className="cabinet-appearance__hint">
          Уникальные цвета — понятнее на глаз. Один цвет темы — спокойнее, если пёстрое режет.
        </Text>
        <div
          className="cabinet-ability-mode"
          role="radiogroup"
          aria-label="Цвета характеристик"
        >
          <button
            type="button"
            role="radio"
            aria-checked={current.abilityColors === 'identity'}
            disabled={pending}
            className={`sheet-chip${current.abilityColors === 'identity' ? ' is-on' : ''}`}
            onClick={() => {
              if (current.abilityColors === 'identity') return
              void save({ ability_colors: 'identity' })
            }}
          >
            Уникальные (СИЛ…ХАР)
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={current.abilityColors === 'theme'}
            disabled={pending}
            className={`sheet-chip${current.abilityColors === 'theme' ? ' is-on' : ''}`}
            onClick={() => {
              if (current.abilityColors === 'theme') return
              void save({ ability_colors: 'theme' })
            }}
          >
            Цвет темы
          </button>
        </div>
        <div className="cabinet-ability-preview" aria-hidden="true">
          {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map((key) => (
            <span
              key={key}
              className="abil-block cabinet-ability-preview__chip"
              data-abil={key}
            >
              {THEME_OPTIONS.find((t) => t.id === key)?.ability}
            </span>
          ))}
        </div>
      </div>

      <div className="cabinet-appearance__preview">
        <Text tone="muted">Превью хрома</Text>
        <div className="cabinet-appearance__preview-row">
          <button type="button" className="ui-button ui-button--primary" tabIndex={-1}>
            Сохранить
          </button>
          <button type="button" className="ui-button ui-button--secondary" tabIndex={-1}>
            Из справочника
          </button>
          <span className="sheet-chip is-on">Бой</span>
          <span className="sheet-chip">Инвентарь</span>
        </div>
      </div>

      {error ? <Text tone="danger">{error}</Text> : null}
    </Stack>
  )
}
