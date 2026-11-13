import { useId, useState } from 'react'
import {
  coverLabelRu,
  type CoverLevel,
} from '../../shared/dnd/o08ActionsCoverConditions'
import {
  MOUNTED_COMBATANT_ADV_HINT,
  MOUNTED_COMBATANT_RANGED_DIS_HINT,
  UNDERWATER_HINT,
} from '../../shared/dnd/o10MountedUnderwater'
import {
  POWER_ATTACK_HINT_GWM,
  POWER_ATTACK_HINT_SS,
} from '../../shared/dnd/o05CombatFeats'

export type TargetModifiersValue = {
  cover: CoverLevel
  dodging: boolean
  prone: boolean
  restrained: boolean
  paralyzedClose: boolean
  fearSourceVisible: boolean
  invisibleDiscovered: boolean
  underwater: boolean
  isMounted: boolean
  aimAtMount: boolean
  dismissRiderRangedDis: boolean
  smallerThanMount: boolean
  isObject: boolean
  powerAttackOn: boolean
  longRangeMarked: boolean
  within5ft: boolean
  grappledByMe: boolean
}

export type TargetModifiersFlags = {
  showAdamantineObject?: boolean
  hasGwm?: boolean
  hasSharpshooter?: boolean
  hasCrossbowExpert?: boolean
  hasGunner?: boolean
  hasGrappler?: boolean
  hasMountedCombatant?: boolean
  isMountedNow?: boolean
  mountSizeLabel?: string | null
}

type Props = {
  value: TargetModifiersValue
  onChange: (patch: Partial<TargetModifiersValue>) => void
  flags?: TargetModifiersFlags
  /** Start expanded (tests / rare). Default collapsed — 17:42. */
  defaultOpen?: boolean
  className?: string
}

/**
 * SC-02 / UX-02: укрытие и состояния цели — только в окне атаки,
 * по умолчанию свёрнуты за «+ Укрытие / состояние цели».
 * Не путать с «Под водой» героя (HotConditionsDialog).
 */
export function TargetModifiersFields({
  value,
  onChange,
  flags = {},
  defaultOpen = false,
  className,
}: Props) {
  const panelId = useId()
  const [open, setOpen] = useState(defaultOpen)
  const showPower = Boolean(flags.hasGwm || flags.hasSharpshooter)
  const showWithin5 =
    Boolean(flags.hasCrossbowExpert || flags.hasGunner || flags.hasSharpshooter) ||
    (!showPower && Boolean(flags.hasCrossbowExpert || flags.hasGunner))

  const activeBits = [
    value.cover !== 'none' ? coverLabelRu(value.cover) : null,
    value.dodging ? 'уклоняется' : null,
    value.prone ? 'опрокинута' : null,
    value.restrained ? 'опутана' : null,
    value.paralyzedClose ? 'паралич в 5 фт' : null,
    value.underwater ? 'цель под водой' : null,
    value.isMounted ? 'цель верхом' : null,
    value.powerAttackOn ? '−5/+10' : null,
    value.within5ft ? 'в 5 фт' : null,
    value.grappledByMe ? 'схвачена' : null,
    value.isObject ? 'предмет' : null,
  ].filter(Boolean)

  return (
    <div className={className ?? 'target-modifiers'}>
      <button
        type="button"
        className={`target-modifiers__toggle${open ? ' is-open' : ''}${
          activeBits.length ? ' has-active' : ''
        }`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? '▾' : '+'} Укрытие / состояние цели
        {activeBits.length && !open ? (
          <span className="target-modifiers__hint"> · {activeBits.join(', ')}</span>
        ) : null}
      </button>
      {open ? (
        <div id={panelId} className="target-modifiers__panel">
          {flags.showAdamantineObject ? (
            <label className="field" style={{ marginBottom: 4 }}>
              <input
                type="checkbox"
                checked={value.isObject}
                onChange={(e) => onChange({ isObject: e.target.checked })}
              />{' '}
              Цель — предмет (адамантин → автокрит)
            </label>
          ) : null}

          {showPower ? (
            <div className="chip-row" style={{ marginBottom: 8 }} role="group" aria-label="Силовой удар">
              <button
                type="button"
                className={`sheet-chip${value.powerAttackOn ? ' is-on' : ''}`}
                title={
                  flags.hasGwm && flags.hasSharpshooter
                    ? `${POWER_ATTACK_HINT_GWM} · ${POWER_ATTACK_HINT_SS}`
                    : flags.hasGwm
                      ? POWER_ATTACK_HINT_GWM
                      : POWER_ATTACK_HINT_SS
                }
                onClick={() => onChange({ powerAttackOn: !value.powerAttackOn })}
              >
                {flags.hasGwm && flags.hasSharpshooter
                  ? 'Силовой удар −5/+10'
                  : flags.hasGwm
                    ? 'Мастер большого оружия −5/+10'
                    : 'Меткий стрелок −5/+10'}
              </button>
              {flags.hasSharpshooter ? (
                <label className="field" style={{ margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={value.longRangeMarked}
                    onChange={(e) => onChange({ longRangeMarked: e.target.checked })}
                  />{' '}
                  Дальняя дистанция
                </label>
              ) : null}
              {showWithin5 ? (
                <label className="field" style={{ margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={value.within5ft}
                    onChange={(e) => onChange({ within5ft: e.target.checked })}
                  />{' '}
                  В 5 фт
                </label>
              ) : null}
            </div>
          ) : showWithin5 ? (
            <div className="chip-row" style={{ marginBottom: 8 }}>
              <label className="field" style={{ margin: 0 }}>
                <input
                  type="checkbox"
                  checked={value.within5ft}
                  onChange={(e) => onChange({ within5ft: e.target.checked })}
                />{' '}
                В 5 фт (дальнобойная)
              </label>
            </div>
          ) : null}

          {flags.hasGrappler ? (
            <div className="chip-row" style={{ marginBottom: 8 }}>
              <label className="field" style={{ margin: 0 }}>
                <input
                  type="checkbox"
                  checked={value.grappledByMe}
                  onChange={(e) => onChange({ grappledByMe: e.target.checked })}
                />{' '}
                Цель схвачена мной (преимущество)
              </label>
            </div>
          ) : null}

          <div className="chip-row" style={{ marginBottom: 8 }} role="group" aria-label="Укрытие цели">
            {(['none', 'half', 'three_quarters', 'total'] as CoverLevel[]).map((lvl) => (
              <button
                key={lvl}
                type="button"
                className={`sheet-chip${value.cover === lvl ? ' is-on' : ''}`}
                aria-pressed={value.cover === lvl}
                title={coverLabelRu(lvl)}
                onClick={() => onChange({ cover: lvl })}
              >
                {lvl === 'none' ? 'Без укрытия' : coverLabelRu(lvl)}
              </button>
            ))}
          </div>

          <div className="chip-row" style={{ marginBottom: 8 }}>
            <label className="field" style={{ margin: 0 }}>
              <input
                type="checkbox"
                checked={value.dodging}
                onChange={(e) => onChange({ dodging: e.target.checked })}
              />{' '}
              Цель уклоняется
            </label>
            <label className="field" style={{ margin: 0 }}>
              <input
                type="checkbox"
                checked={value.prone}
                onChange={(e) => onChange({ prone: e.target.checked })}
              />{' '}
              Цель опрокинута
            </label>
            <label className="field" style={{ margin: 0 }}>
              <input
                type="checkbox"
                checked={value.restrained}
                onChange={(e) => onChange({ restrained: e.target.checked })}
              />{' '}
              Цель опутана
            </label>
            <label className="field" style={{ margin: 0 }}>
              <input
                type="checkbox"
                checked={value.paralyzedClose}
                onChange={(e) => onChange({ paralyzedClose: e.target.checked })}
              />{' '}
              Паралич/без сознания в 5 фт
            </label>
            <label className="field" style={{ margin: 0 }}>
              <input
                type="checkbox"
                checked={value.fearSourceVisible}
                onChange={(e) => onChange({ fearSourceVisible: e.target.checked })}
              />{' '}
              Источник страха виден
            </label>
            <label className="field" style={{ margin: 0 }}>
              <input
                type="checkbox"
                checked={value.invisibleDiscovered}
                onChange={(e) => onChange({ invisibleDiscovered: e.target.checked })}
              />{' '}
              Невидимый обнаружен
            </label>
          </div>

          <div className="chip-row" style={{ marginBottom: 0 }} role="group" aria-label="Цель: верхом и под водой">
            <label className="field" style={{ margin: 0 }} title={UNDERWATER_HINT}>
              <input
                type="checkbox"
                checked={value.underwater}
                onChange={(e) => onChange({ underwater: e.target.checked })}
              />{' '}
              Цель под водой
            </label>
            {flags.hasMountedCombatant && flags.isMountedNow ? (
              <label className="field" style={{ margin: 0 }} title={MOUNTED_COMBATANT_ADV_HINT}>
                <input
                  type="checkbox"
                  checked={value.smallerThanMount}
                  onChange={(e) => onChange({ smallerThanMount: e.target.checked })}
                />{' '}
                Цель меньше скакуна
                {flags.mountSizeLabel ? ` (${flags.mountSizeLabel})` : ''}
              </label>
            ) : null}
            <label className="field" style={{ margin: 0 }}>
              <input
                type="checkbox"
                checked={value.isMounted}
                onChange={(e) => {
                  const next = e.target.checked
                  onChange(
                    next
                      ? { isMounted: true }
                      : { isMounted: false, aimAtMount: false, dismissRiderRangedDis: false },
                  )
                }}
              />{' '}
              Цель верхом
            </label>
            {value.isMounted ? (
              <>
                <label className="field" style={{ margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={value.aimAtMount}
                    onChange={(e) => onChange({ aimAtMount: e.target.checked })}
                  />{' '}
                  Бью по скакуну
                </label>
                <label
                  className="field"
                  style={{ margin: 0 }}
                  title={MOUNTED_COMBATANT_RANGED_DIS_HINT}
                >
                  <input
                    type="checkbox"
                    checked={!value.dismissRiderRangedDis && !value.aimAtMount}
                    disabled={value.aimAtMount}
                    onChange={(e) => onChange({ dismissRiderRangedDis: !e.target.checked })}
                  />{' '}
                  Помеха дальним по всаднику
                </label>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
