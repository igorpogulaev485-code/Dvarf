import type { ReactNode } from 'react'
import { clampExhaustion } from '../../shared/dnd/rest'
import { NeedsSetupIndicator } from './NeedsSetupIndicator'
import type { NeedsSetupItem } from './needsSetup'
import type { PlayState } from './play'

type SpeedTag = { key: string; label: string; value: number }

type ClassChip = { id: string; label: string; subclass: string }

export type DeskHeadEtalonProps = {
  name: string
  avatarUrl?: string | null
  raceLabel: string
  alignmentLabel: string
  editionLabel: string
  classChips: ClassChip[]
  needsSetupItems: NeedsSetupItem[]
  onNeedsSetupSelect?: (item: NeedsSetupItem) => void
  xpLabel: string
  xpRatio: number
  onOpenXp: () => void
  autoAc: number
  acHint: string
  shieldInHand: boolean
  shieldAvailable: boolean
  onOpenAc?: () => void
  onToggleShield?: () => void
  speedValue: number | null
  speedLabel: string
  speedTitle: string
  speedTags: SpeedTag[]
  onOpenSpeed?: () => void
  jumpLongFt: number | null
  jumpHighFt: number | null
  initiativeLabel: string
  onOpenInitiative?: () => void
  onInitiativeRoll?: () => void
  proficiencyLabel: string
  inspiration: boolean
  onToggleInspiration?: () => void
  exhaustion: number
  onExhaustionChange: (next: number) => void
  walletLabel: string
  onOpenCoins: () => void
  onOpenRest?: () => void
  hpLabel: string
  hpTitle: string
  onOpenHp: () => void
  onOpenIdentity?: () => void
  effectsMain?: ReactNode
  onNextRound?: () => void
  showDeath: boolean
  deathSuccesses: number
  deathFails: number
  onDeathChange: (patch: Partial<PlayState>) => void
  onDeathRoll: () => void
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase()
  }
  return (parts[0]?.[0] ?? '?').toUpperCase()
}

function Ico({ paths, className }: { paths: string[]; className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      {paths.map((d) => (
        <path
          key={d}
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  )
}

const ICO = {
  shield: ['M12 3.5 5.5 6.2v5.1c0 4.1 2.7 7.4 6.5 8.7 3.8-1.3 6.5-4.6 6.5-8.7V6.2L12 3.5Z'],
  boot: [
    'M7 5.5h5.2c1.2 0 2.2.9 2.3 2.1l.3 4.4H18c1.1 0 2 .8 2.1 1.9l.2 2.1H8.2L7 14.2V5.5Z',
    'M7 14.2H5.2A1.2 1.2 0 0 1 4 13V9.8',
  ],
  jump: [
    'M4.5 17.2c3.2-1.2 5.2-5.4 7.5-5.4s4.2 4.2 7.5 5.4',
    'M9.2 11.2 12 6.8l2.2 3.2',
    'M5.2 18.4h2.4M16.4 18.4h2.4',
  ],
  bolt: ['M13.2 3.5 7.5 13h4.2l-.9 7.5L16.5 11h-4.1l.8-7.5Z'],
  badge: ['M9.2 15.6 8 20.2l4-1.7 4 1.7-1.2-4.6'],
  spark: [
    'M12 3.8v3.2M12 17v3.2M3.8 12h3.2M17 12h3.2',
    'M7.2 7.2l2.1 2.1M14.7 14.7l2.1 2.1M16.8 7.2l-2.1 2.1M9.3 14.7l-2.1 2.1',
  ],
  exhaustion: ['M5.5 17.5h13', 'M6.5 14h11', 'M7.5 10.5h9', 'M8.5 7h7', 'M9.5 3.5h5'],
  coin: [
    'M12 9.2v5.6M10.4 10.6c.4-.6 1-.9 1.6-.9.9 0 1.6.5 1.6 1.3 0 1.4-3.2 1.1-3.2 2.7 0 .7.7 1.3 1.7 1.3.7 0 1.3-.3 1.6-.8',
  ],
  rest: ['M15.8 5.2a6.8 6.8 0 1 0 3 12.2 7.4 7.4 0 0 1-3-12.2Z', 'M16.8 7.2v2.2M15.7 8.3h2.2'],
}

/** Standing jump, as the concept face: half of the running long / high. */
function standingJump(running: number | null): number | null {
  if (running == null) return null
  return Math.max(0, Math.floor(running / 2))
}

function DeathPips({
  label,
  value,
  tone,
  onChange,
}: {
  label: string
  value: number
  tone: 'ok' | 'bad'
  onChange: (next: number) => void
}) {
  return (
    <div className="death-track" role="group" aria-label={label}>
      <span>{label}</span>
      <span className="death-pips">
        {Array.from({ length: 3 }, (_, index) => {
          const on = index < value
          return (
            <button
              key={index}
              type="button"
              className={`death-pip is-${tone}${on ? ' is-on' : ''}`}
              aria-label={`${label}: ${index + 1} из 3`}
              onClick={() => onChange(index < value ? index : index + 1)}
            />
          )
        })}
      </span>
    </div>
  )
}

/** Header face: DOM and class names from sheet-desktop.html, prod handlers. */
export function DeskHeadEtalon({
  name,
  avatarUrl,
  raceLabel,
  alignmentLabel,
  editionLabel,
  classChips,
  needsSetupItems,
  onNeedsSetupSelect,
  xpLabel,
  xpRatio,
  onOpenXp,
  autoAc,
  acHint,
  shieldInHand,
  shieldAvailable,
  onOpenAc,
  onToggleShield,
  speedValue,
  speedLabel,
  speedTitle,
  speedTags,
  onOpenSpeed,
  jumpLongFt,
  jumpHighFt,
  initiativeLabel,
  onOpenInitiative,
  onInitiativeRoll,
  proficiencyLabel,
  inspiration,
  onToggleInspiration,
  exhaustion,
  onExhaustionChange,
  walletLabel,
  onOpenCoins,
  onOpenRest,
  hpLabel,
  hpTitle,
  onOpenHp,
  onOpenIdentity,
  effectsMain,
  onNextRound,
  showDeath,
  deathSuccesses,
  deathFails,
  onDeathChange,
  onDeathRoll,
}: DeskHeadEtalonProps) {
  const standLong = standingJump(jumpLongFt)
  const standHigh = standingJump(jumpHighFt)
  const jumpText =
    standLong != null && standHigh != null ? `${standLong} / ${standHigh}` : null
  const jumpTip =
    standLong != null && standHigh != null
      ? `Прыжок: в длину ${standLong} фт, в высоту ${standHigh} фт`
      : 'Прыжок'
  const shownName = name.trim() || 'Без имени'
  const fill = Math.max(0, Math.min(100, Math.round(xpRatio * 100)))

  return (
    <>
      <div className="desk-head__top">
        <div className="desk-head__who">
          <button
            type="button"
            className="avatar"
            title="Основное: имя, раса, мировоззрение, предыстория"
            onClick={() => onOpenIdentity?.()}
          >
            {avatarUrl ? <img src={avatarUrl} alt="" /> : initials(shownName)}
          </button>
          <div className="ident">
            <h1>
              <button type="button" title={shownName} onClick={() => onOpenIdentity?.()}>
                {shownName}
              </button>
            </h1>
            <div className="ident__meta">
              <button type="button" onClick={() => onOpenIdentity?.()}>
                Основное
              </button>
              {' · '}
              <span>{raceLabel}</span>
              {alignmentLabel ? (
                <>
                  {' · '}
                  <span>{alignmentLabel}</span>
                </>
              ) : null}
              {' · '}
              <span>{editionLabel}</span>
            </div>
            <div className="chips">
              {classChips.length > 0 ? (
                <div className="class-row" aria-label="Классы">
                  <span className="class-row__face">
                    {classChips.map((chip) => (
                      <span key={chip.id} className="chip" data-class-chip>
                        {chip.subclass
                          ? `${chip.label} · ${chip.subclass}`
                          : chip.label}
                      </span>
                    ))}
                  </span>
                </div>
              ) : null}
              {onNeedsSetupSelect ? (
                <NeedsSetupIndicator
                  items={needsSetupItems}
                  onSelect={onNeedsSetupSelect}
                />
              ) : null}
            </div>
            <button type="button" className="xp" title={xpLabel} onClick={onOpenXp}>
              <div className="xp__bar" aria-hidden="true">
                <i style={{ width: `${fill}%` }} />
              </div>
              <div className="xp__lab">{xpLabel}</div>
            </button>
          </div>
        </div>

        <div className="desk-head__mid">
          <button
            type="button"
            className={`vital vital--ac${shieldInHand ? ' is-shield-on' : ''}`}
            title={`Класс доспеха ${autoAc}. ${acHint}. Нажми — разборка`}
            aria-label={`Класс доспеха ${autoAc}. Открыть разборку`}
            onClick={() => onOpenAc?.()}
          >
            <Ico paths={ICO.shield} className="vital__ico" />
            <span className="v num">{autoAc}</span>
            {onToggleShield ? (
              <span
                className={`vital__shield${shieldInHand ? ' is-on' : ''}`}
                role="button"
                tabIndex={0}
                title={
                  shieldInHand
                    ? 'Щит в руке — нажми, чтобы убрать (КД −бонус щита)'
                    : shieldAvailable
                      ? 'Взять щит в руку — КД с бонусом щита'
                      : 'Нет щита в инвентаре'
                }
                onClick={(event) => {
                  event.stopPropagation()
                  if (!shieldAvailable && !shieldInHand) return
                  onToggleShield()
                }}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return
                  event.preventDefault()
                  event.stopPropagation()
                  if (!shieldAvailable && !shieldInHand) return
                  onToggleShield()
                }}
              >
                Щит
              </span>
            ) : null}
          </button>

          <button
            type="button"
            className={`vital vital--speed${speedTags.length ? ' is-wide' : ''}`}
            title={`${speedTitle}. Нажми — все скорости`}
            aria-label={
              speedValue != null
                ? `Скорость ${speedValue} футов. Открыть список скоростей`
                : 'Скорость не задана. Открыть список скоростей'
            }
            onClick={() => onOpenSpeed?.()}
          >
            <span className="vital__stack">
              <Ico paths={ICO.boot} className="vital__ico" />
              <span className="v num">{speedValue ?? '—'}</span>
              <span className="k">{speedLabel}</span>
            </span>
            {speedTags.length > 0 ? (
              <span className="vital__tags" aria-hidden="true">
                {speedTags.map((tag) => (
                  <span key={tag.key} className="vital__tag">
                    {tag.label} {tag.value}
                  </span>
                ))}
              </span>
            ) : null}
          </button>

          {jumpText ? (
            <span className="vital" tabIndex={0} title={jumpTip} aria-label={jumpTip}>
              <Ico paths={ICO.jump} className="vital__ico" />
              <span className="v num">{jumpText}</span>
              <span className="k">Прыжок</span>
            </span>
          ) : null}

          <div className="vital vital--init">
            <button
              type="button"
              className="vital__main"
              title={`${initiativeLabel} инициатива. Нажми — разборка и бонусы`}
              aria-label={`Инициатива ${initiativeLabel}. Открыть разборку`}
              onClick={() => onOpenInitiative?.()}
            >
              <Ico paths={ICO.bolt} className="vital__ico" />
              <span className="v num">{initiativeLabel}</span>
              <span className="k">Иниц.</span>
            </button>
            {onInitiativeRoll ? (
              <button
                type="button"
                className="vital__roll"
                title="Бросок инициативы"
                aria-label="Бросок инициативы"
                onClick={onInitiativeRoll}
              >
                <svg viewBox="0 0 32 32" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M16 2.2 28.5 9v14L16 29.8 3.5 23V9L16 2.2zm0 2.5L6.2 10.1v11.8L16 27.3l9.8-5.4V10.1L16 4.7z"
                  />
                  <circle cx="16" cy="16" r="2.2" fill="currentColor" />
                </svg>
              </button>
            ) : null}
          </div>

          <span className="vital" tabIndex={0} title="Бонус мастерства (от уровня)">
            <svg className="vital__ico" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="11" r="5.2" fill="none" stroke="currentColor" strokeWidth="1.75" />
              <path
                d="M9.2 15.6 8 20.2l4-1.7 4 1.7-1.2-4.6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="v num">{proficiencyLabel}</span>
            <span className="k">БМ</span>
          </span>

          <div className="desk-head__stack">
            <button
              type="button"
              className={`vital-chip${inspiration ? ' is-on' : ''}`}
              title="Вдохновение — нажми, чтобы переключить"
              aria-label="Вдохновение"
              aria-pressed={inspiration}
              onClick={() => onToggleInspiration?.()}
            >
              <Ico paths={ICO.spark} className="vital-chip__ico" />
              Вдохн. <b>{inspiration ? '●' : '○'}</b>
            </button>
            <button
              type="button"
              className="vital-chip"
              title="Истощение — нажми, чтобы изменить уровень (0–6)"
              onClick={() =>
                onExhaustionChange(clampExhaustion(exhaustion >= 6 ? 0 : exhaustion + 1))
              }
            >
              <Ico paths={ICO.exhaustion} className="vital-chip__ico" />
              Истощ. <b className="num">{exhaustion}</b>
            </button>
          </div>
        </div>

        <div className="desk-head__right">
          <div className="desk-head__right-tools">
            <button
              type="button"
              className="vital-pill"
              title={walletLabel}
              aria-label={`${walletLabel} — кошелёк`}
              onClick={onOpenCoins}
            >
              <svg className="vital-pill__ico" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="7.2" fill="none" stroke="currentColor" strokeWidth="1.75" />
                <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.75" />
                <path
                  d="M12 9.2v5.6M10.4 10.6c.4-.6 1-.9 1.6-.9.9 0 1.6.5 1.6 1.3 0 1.4-3.2 1.1-3.2 2.7 0 .7.7 1.3 1.7 1.3.7 0 1.3-.3 1.6-.8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
              </svg>
              <span>{walletLabel}</span>
            </button>
            <button type="button" className="vital-pill" onClick={() => onOpenRest?.()}>
              <Ico paths={ICO.rest} className="vital-pill__ico" />
              Отдых
            </button>
          </div>
          <div className="desk-head__hp">
            <button type="button" className="hp-tile" title={hpTitle} onClick={onOpenHp}>
              <span className="v num">{hpLabel}</span>
              <span className="k">{showDeath ? 'при смерти' : 'хиты'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="effects">
        {effectsMain}
        <div className="death-saves" hidden={!showDeath}>
          <span className="death-saves__lab">Спасы от смерти</span>
          <span className="death-saves__dot" aria-hidden="true">
            ·
          </span>
          <DeathPips
            label="Успехи"
            value={deathSuccesses}
            tone="ok"
            onChange={(next) => onDeathChange({ isDying: true, deathSuccesses: next })}
          />
          <span className="death-saves__dot" aria-hidden="true">
            ·
          </span>
          <DeathPips
            label="Провалы"
            value={deathFails}
            tone="bad"
            onChange={(next) => onDeathChange({ isDying: true, deathFails: next })}
          />
          <button type="button" className="death-saves__roll" onClick={onDeathRoll}>
            к20
          </button>
        </div>
        {onNextRound ? (
          <button
            type="button"
            className="round-btn"
            title="Таймеры эффектов −1 раунд, истёкшие снимаются"
            aria-label="Следующий раунд — таймеры эффектов −1"
            onClick={onNextRound}
          >
            Следующий раунд
          </button>
        ) : null}
      </div>
    </>
  )
}
