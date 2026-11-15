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
import { ToggleChip } from '../../ui'

export type TargetModifiersValue = {
  cover: CoverLevel
  dodging: boolean
  prone: boolean
  restrained: boolean
  paralyzedClose: boolean
  fearSourceVisible: boolean
  /** Цель ослеплена. */
  blinded: boolean
  /** Цель невидима. */
  invisible: boolean
  /** Невидимый обнаружен (снимает помеху по невидимой цели). */
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
  /** Атакующий испуган — показать чип «Источник страха виден». */
  attackerFrightened?: boolean
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
  const showFear = Boolean(flags.attackerFrightened)

  const activeBits = [
    value.cover !== 'none' ? coverLabelRu(value.cover) : null,
    value.dodging ? 'уклоняется' : null,
    value.prone ? 'опрокинута' : null,
    value.restrained ? 'опутана' : null,
    value.paralyzedClose ? 'паралич в 5 фт' : null,
    value.blinded ? 'ослеплена' : null,
    value.invisible ? 'невидима' : null,
    value.underwater ? 'цель под водой' : null,
    value.isMounted ? 'цель верхом' : null,
    value.powerAttackOn ? '−5/+10' : null,
    value.within5ft ? 'в 5 фт' : null,
    value.grappledByMe ? 'схвачена' : null,
    value.isObject ? 'предмет' : null,
    showFear && value.fearSourceVisible ? 'страх виден' : null,
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
            <div className="chip-row" style={{ marginBottom: 8 }}>
              <ToggleChip
                main="Цель — предмет"
                rest="адамантин → автокрит"
                checked={value.isObject}
                onChange={(next) => onChange({ isObject: next })}
              />
            </div>
          ) : null}

          {showPower ? (
            <div className="chip-row" style={{ marginBottom: 8 }} role="group" aria-label="Силовой удар">
              <ToggleChip
                main={
                  flags.hasGwm && flags.hasSharpshooter
                    ? 'Силовой удар −5/+10'
                    : flags.hasGwm
                      ? 'Мастер большого оружия −5/+10'
                      : 'Меткий стрелок −5/+10'
                }
                checked={value.powerAttackOn}
                title={
                  flags.hasGwm && flags.hasSharpshooter
                    ? `${POWER_ATTACK_HINT_GWM} · ${POWER_ATTACK_HINT_SS}`
                    : flags.hasGwm
                      ? POWER_ATTACK_HINT_GWM
                      : POWER_ATTACK_HINT_SS
                }
                onChange={(next) => onChange({ powerAttackOn: next })}
              />
              {flags.hasSharpshooter ? (
                <ToggleChip
                  main="Дальняя дистанция"
                  checked={value.longRangeMarked}
                  onChange={(next) => onChange({ longRangeMarked: next })}
                />
              ) : null}
              {showWithin5 ? (
                <ToggleChip
                  main="В 5 фт"
                  checked={value.within5ft}
                  onChange={(next) => onChange({ within5ft: next })}
                />
              ) : null}
            </div>
          ) : showWithin5 ? (
            <div className="chip-row" style={{ marginBottom: 8 }}>
              <ToggleChip
                main="В 5 фт (дальнобойная)"
                checked={value.within5ft}
                onChange={(next) => onChange({ within5ft: next })}
              />
            </div>
          ) : null}

          {flags.hasGrappler ? (
            <div className="chip-row" style={{ marginBottom: 8 }}>
              <ToggleChip
                main="Цель схвачена мной"
                rest="преимущество"
                checked={value.grappledByMe}
                onChange={(next) => onChange({ grappledByMe: next })}
              />
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

          <div
            className="chip-row target-modifiers__conditions"
            style={{ marginBottom: 8 }}
            role="group"
            aria-label="Состояния цели"
          >
            <ToggleChip
              main="Цель уклоняется"
              checked={value.dodging}
              onChange={(next) => onChange({ dodging: next })}
            />
            <ToggleChip
              main="Цель опрокинута"
              checked={value.prone}
              onChange={(next) => onChange({ prone: next })}
            />
            <ToggleChip
              main="Цель опутана"
              checked={value.restrained}
              onChange={(next) => onChange({ restrained: next })}
            />
            <ToggleChip
              main="Паралич/без сознания в 5 фт"
              checked={value.paralyzedClose}
              onChange={(next) => onChange({ paralyzedClose: next })}
            />
            <ToggleChip
              main="Цель ослеплена"
              checked={value.blinded}
              onChange={(next) => onChange({ blinded: next })}
            />
            <ToggleChip
              main="Цель невидима"
              checked={value.invisible}
              onChange={(next) =>
                onChange(
                  next
                    ? { invisible: true }
                    : { invisible: false, invisibleDiscovered: false },
                )
              }
            />
            {value.invisible ? (
              <ToggleChip
                main="Невидимый обнаружен"
                checked={value.invisibleDiscovered}
                onChange={(next) => onChange({ invisibleDiscovered: next })}
              />
            ) : null}
            {showFear ? (
              <ToggleChip
                main="Источник страха виден"
                rest="вы испуганы"
                checked={value.fearSourceVisible}
                title="Источник страха виден (вы испуганы)"
                onChange={(next) => onChange({ fearSourceVisible: next })}
              />
            ) : null}
          </div>

          <div className="chip-row" style={{ marginBottom: 0 }} role="group" aria-label="Цель: верхом и под водой">
            <ToggleChip
              main="Цель под водой"
              checked={value.underwater}
              title={UNDERWATER_HINT}
              onChange={(next) => onChange({ underwater: next })}
            />
            {flags.hasMountedCombatant && flags.isMountedNow ? (
              <ToggleChip
                main={
                  flags.mountSizeLabel
                    ? `Цель меньше скакуна (${flags.mountSizeLabel})`
                    : 'Цель меньше скакуна'
                }
                checked={value.smallerThanMount}
                title={MOUNTED_COMBATANT_ADV_HINT}
                onChange={(next) => onChange({ smallerThanMount: next })}
              />
            ) : null}
            <ToggleChip
              main="Цель верхом"
              checked={value.isMounted}
              onChange={(next) => {
                onChange(
                  next
                    ? { isMounted: true }
                    : { isMounted: false, aimAtMount: false, dismissRiderRangedDis: false },
                )
              }}
            />
            {value.isMounted ? (
              <>
                <ToggleChip
                  main="Бью по скакуну"
                  checked={value.aimAtMount}
                  onChange={(next) => onChange({ aimAtMount: next })}
                />
                <ToggleChip
                  main="Помеха дальним по всаднику"
                  checked={!value.dismissRiderRangedDis && !value.aimAtMount}
                  disabled={value.aimAtMount}
                  title={MOUNTED_COMBATANT_RANGED_DIS_HINT}
                  onChange={(next) => onChange({ dismissRiderRangedDis: !next })}
                />
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

/** Map table combatant conditions → modifier chips (player may clear). */
export function modifiersFromTargetConditions(
  conditions: unknown[] | null | undefined,
): Partial<TargetModifiersValue> {
  const slugs = new Set<string>()
  for (const raw of conditions ?? []) {
    if (typeof raw === 'string') {
      slugs.add(raw.trim().toLowerCase())
      continue
    }
    if (raw && typeof raw === 'object') {
      const row = raw as { slug?: string; name?: string }
      if (row.slug) slugs.add(String(row.slug).trim().toLowerCase())
      const name = String(row.name || '').toLowerCase()
      if (/опрокинут/.test(name)) slugs.add('prone')
      if (/опутан/.test(name)) slugs.add('restrained')
      if (/паралич|парализован|без сознан/.test(name)) slugs.add('paralyzed')
      if (/ослепл/.test(name)) slugs.add('blinded')
      if (/невидим/.test(name)) slugs.add('invisible')
      if (/уклоня/.test(name)) slugs.add('dodging')
    }
  }
  const patch: Partial<TargetModifiersValue> = {
    prone: slugs.has('prone'),
    restrained: slugs.has('restrained'),
    paralyzedClose: slugs.has('paralyzed') || slugs.has('unconscious'),
    blinded: slugs.has('blinded'),
    invisible: slugs.has('invisible'),
    dodging: slugs.has('dodging'),
  }
  if (!patch.invisible) patch.invisibleDiscovered = false
  return patch
}
