import { useEffect, useState } from 'react'
import { updateMe, type User } from '../../shared/api/auth'
import { ApiRequestError } from '../../shared/api/client'
import {
  ACCENT_OPTIONS,
  DARK_BACKGROUNDS,
  FONT_OPTIONS,
  LIGHT_BACKGROUNDS,
  applyAccountAppearance,
  normalizeAppearance,
  type AbilityColorsMode,
  type AccountAppearance,
  type BackgroundId,
  type FontPairId,
  type SurfaceId,
  type ThemeId,
} from '../../shared/theme/accountAppearance'
import { Button, Stack, Text } from '../../ui'
import { AppearanceSurvey } from './AppearanceSurvey'

type AppearancePanelProps = {
  user: User
  onSaved: (user: User) => void
}

type AppearancePatch = {
  theme_id?: ThemeId
  ability_colors?: AbilityColorsMode
  surface?: SurfaceId
  bg_light?: BackgroundId
  bg_dark?: BackgroundId
  font_pair?: FontPairId
}

export function AppearancePanel({ user, onSaved }: AppearancePanelProps) {
  const fromUser = normalizeAppearance(user)
  const [current, setCurrent] = useState<AccountAppearance>(fromUser)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [surveyOpen, setSurveyOpen] = useState(false)

  useEffect(() => {
    setCurrent(normalizeAppearance(user))
  }, [user])

  async function save(patch: AppearancePatch) {
    setPending(true)
    setError(null)
    const previous = current
    const nextLocal = normalizeAppearance({
      themeId: patch.theme_id ?? current.themeId,
      abilityColors: patch.ability_colors ?? current.abilityColors,
      surface: patch.surface ?? current.surface,
      bgLight: patch.bg_light ?? current.bgLight,
      bgDark: patch.bg_dark ?? current.bgDark,
      fontPair: patch.font_pair ?? current.fontPair,
    })
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

  const dark = current.surface === 'leaf-classic'
  const backgrounds = dark ? DARK_BACKGROUNDS : LIGHT_BACKGROUNDS
  const activeBg = dark ? current.bgDark : current.bgLight

  return (
    <Stack gap={16}>
      <div>
        <Text as="h3" className="cabinet-appearance__label">
          Тема
        </Text>
        <Text tone="muted" className="cabinet-appearance__hint">
          Светлая и тёмная. При смене темы вспоминается последняя подложка этой темы.
        </Text>
        <div className="cabinet-ability-mode" role="radiogroup" aria-label="Тема">
          <button
            type="button"
            role="radio"
            aria-checked={!dark}
            disabled={pending}
            className={`sheet-chip${!dark ? ' is-on' : ''}`}
            onClick={() => {
              if (!dark) return
              void save({ surface: 'light-designer3' })
            }}
          >
            Светлая
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={dark}
            disabled={pending}
            className={`sheet-chip${dark ? ' is-on' : ''}`}
            onClick={() => {
              if (dark) return
              void save({ surface: 'leaf-classic' })
            }}
          >
            Тёмная
          </button>
        </div>
      </div>

      <div>
        <Text as="h3" className="cabinet-appearance__label">
          Подложки
        </Text>
        <div
          className="cabinet-bg-grid"
          role="radiogroup"
          aria-label={dark ? 'Подложки тёмной темы' : 'Подложки светлой темы'}
        >
          {backgrounds.map((bg) => {
            const on = activeBg === bg.id
            return (
              <button
                key={bg.id}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={pending}
                className={`cabinet-bg-tile${on ? ' is-selected' : ''}`}
                onClick={() => {
                  if (on) return
                  void save(dark ? { bg_dark: bg.id } : { bg_light: bg.id })
                }}
              >
                <span className="cabinet-bg-tile__preview" data-bg-id={bg.id} aria-hidden="true" />
                <span className="cabinet-bg-tile__name">{bg.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <Text as="h3" className="cabinet-appearance__label">
          Акцент
        </Text>
        <Text tone="muted" className="cabinet-appearance__hint">
          Красит кнопки, вкладки, фильтры и заголовки панелей.
        </Text>
        <div className="cabinet-theme-grid" role="radiogroup" aria-label="Акцент">
          {ACCENT_OPTIONS.map((theme) => {
            const on = current.themeId === theme.id
            const swatch = dark ? theme.dark : theme.light
            return (
              <button
                key={theme.id}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={pending}
                className={`cabinet-theme-card${on ? ' is-on' : ''}`}
                style={{
                  ['--swatch' as string]: swatch,
                  ['--swatch-soft' as string]: dark
                    ? `color-mix(in srgb, ${swatch} 22%, #141414)`
                    : theme.soft,
                }}
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
                    {theme.note ? ` · ${theme.note}` : ''}
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
        <div className="cabinet-ability-mode" role="radiogroup" aria-label="Цвета характеристик">
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
            Уникальные
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
          {ACCENT_OPTIONS.map((theme) => (
            <span
              key={theme.id}
              className="abil-block cabinet-ability-preview__chip"
              data-abil={theme.id}
            >
              {theme.ability}
            </span>
          ))}
        </div>
      </div>

      <div>
        <Text as="h3" className="cabinet-appearance__label">
          Шрифт
        </Text>
        <div className="cabinet-font-grid" role="radiogroup" aria-label="Шрифт">
          {FONT_OPTIONS.map((font) => {
            const on = current.fontPair === font.id
            return (
              <button
                key={font.id}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={pending}
                className={`cabinet-font-card${on ? ' is-selected' : ''}`}
                onClick={() => {
                  if (on) return
                  void save({ font_pair: font.id })
                }}
              >
                <span
                  className="cabinet-font-card__aa"
                  style={{ fontFamily: font.display, fontWeight: font.weight }}
                >
                  Аа
                </span>
                <span className="cabinet-font-card__nums" style={{ fontFamily: font.num }}>
                  012345
                </span>
                <span className="cabinet-font-card__name">
                  {font.name}
                  {font.note ? ` · ${font.note}` : ''}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="cabinet-appearance__preview">
        <Text tone="muted">Превью</Text>
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
      <div className="shell-survey__actions">
        <Button type="button" variant="secondary" onClick={() => setSurveyOpen(true)}>
          Пройти опрос заново
        </Button>
      </div>
      <AppearanceSurvey
        open={surveyOpen}
        mode="replay"
        user={user}
        onDismiss={() => setSurveyOpen(false)}
        onSaved={(next) => {
          setSurveyOpen(false)
          onSaved(next)
        }}
      />
    </Stack>
  )
}
