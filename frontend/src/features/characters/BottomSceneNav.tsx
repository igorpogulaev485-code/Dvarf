import { HoverTipCard, SCENE_TIPS } from '../onboarding'
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
  /** Absolute beginner: long-press tip on scene tab. */
  showValueTips?: boolean
}

/** Mobile kit: 5 scene tabs (desktop MODE_LABELS, no ЕЩЁ). */
export function BottomSceneNav({
  mode,
  onModeChange,
  showValueTips = false,
}: BottomSceneNavProps) {
  return (
    <nav className="mobile-scene-nav" aria-label="Сцены листа" data-onboarding="desk-modes">
      <div className="mobile-scene-nav__tabs" role="tablist">
        {MODE_LABELS.map(({ id, label }) => {
          const on = mode === id
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={on}
              aria-label={label}
              className={`mobile-scene-nav__tab${on ? ' is-on' : ''}${
                showValueTips ? ' has-onboarding-tip' : ''
              }`}
              onClick={() => onModeChange(id)}
            >
              <span className="mobile-scene-nav__ico" aria-hidden>
                {MODE_ICON[id]}
              </span>
              <span className="mobile-scene-nav__label">{MODE_SHORT[id]}</span>
              {showValueTips ? <HoverTipCard tip={SCENE_TIPS[id]} /> : null}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
