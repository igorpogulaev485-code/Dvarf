import { SCENE_TIPS } from '../onboarding'
import { MODE_LABELS, type PlayDeskMode } from './playDeskUi'

const MODE_SHORT: Record<PlayDeskMode, string> = {
  combat: 'Бой',
  explore: 'Исслед.',
  social: 'Общение',
  companions: 'Напарн.',
  features: 'Способн.',
}

const MODE_ICON: Record<PlayDeskMode, string> = {
  combat: '⚔',
  explore: '🎒',
  social: '💬',
  companions: '🐾',
  features: '✦',
}

type BottomSceneNavProps = {
  mode: PlayDeskMode
  onModeChange: (mode: PlayDeskMode) => void
  /** Absolute beginner: native title = short scene explain (no hover on touch). */
  showValueTips?: boolean
}

/** Mobile kit: 5 scene tabs (desktop MODE_LABELS, no ЕЩЁ). */
export function BottomSceneNav({
  mode,
  onModeChange,
  showValueTips = false,
}: BottomSceneNavProps) {
  return (
    <nav className="mobile-scene-nav" aria-label="Сцены листа">
      <div className="mobile-scene-nav__tabs" role="tablist">
        {MODE_LABELS.map(({ id, label }) => {
          const on = mode === id
          const tip = SCENE_TIPS[id]
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={on}
              aria-label={label}
              title={
                showValueTips ? `${tip.meaning} ${tip.use}` : undefined
              }
              className={`mobile-scene-nav__tab${on ? ' is-on' : ''}`}
              onClick={() => onModeChange(id)}
            >
              <span className="mobile-scene-nav__ico" aria-hidden>
                {MODE_ICON[id]}
              </span>
              <span className="mobile-scene-nav__label">{MODE_SHORT[id]}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
