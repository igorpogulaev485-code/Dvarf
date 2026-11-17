/**
 * P24-M01: блок «Оружейное мастерство» на листе 2024.
 * Chips из UI-кита (§2i Features / sheet-chip). Не показывается для 2014.
 */
import { Text } from '../../ui'
import {
  WEAPON_MASTERY_CLASS_RULES,
  characterHasWeaponMastery,
  countChangedWeapons,
  masteryPropertyNameRu,
  normalizeClassSlug,
  resolveActiveMasteryBudget,
  weaponAllowedForMastery,
  type MasteryWeaponOption,
  type WeaponMasteryClassRules,
  type WeaponMasteryState,
} from '../../shared/dnd/weaponMastery'
import { WEAPON_MASTERY_NAME_RU } from '../../shared/dnd/paladin2024Features'
import type { ClassLevelEntry } from './classLevels'

export type WeaponMasteryPanelProps = {
  rulesEdition: string | null | undefined
  classes: ClassLevelEntry[]
  state: WeaponMasteryState
  onChange: (next: WeaponMasteryState) => void
  /** Catalog weapons (2024) available to pick. */
  weaponOptions: MasteryWeaponOption[]
  hasSimpleProf?: boolean
  hasMartialProf?: boolean
  onToast?: (message: string) => void
}

export function WeaponMasteryPanel({
  rulesEdition,
  classes,
  state,
  onChange,
  weaponOptions,
  hasSimpleProf = true,
  hasMartialProf = true,
  onToast,
}: WeaponMasteryPanelProps) {
  if (!characterHasWeaponMastery(rulesEdition, classes)) return null

  const budget = resolveActiveMasteryBudget(classes, state.sourceClass)
  if (!budget.rule || budget.limit <= 0) return null
  const rule: WeaponMasteryClassRules = budget.rule
  const limit = budget.limit

  const granting = classes
    .map((row) => {
      const slug = normalizeClassSlug(row.name)
      const r = slug ? WEAPON_MASTERY_CLASS_RULES[slug] : null
      return r?.enabled ? { slug: r.slug, name: row.name, level: row.level } : null
    })
    .filter(Boolean) as Array<{ slug: string; name: string; level: number }>

  const allowed = weaponOptions.filter((w) =>
    weaponAllowedForMastery(w, rule, {
      hasSimpleProf,
      hasMartialProf,
    }),
  )

  const selected = new Set(state.known.map((s) => s.toLowerCase()))
  const canEdit =
    state.known.length === 0 || state.swapAvailable || state.baseline.length === 0

  function toggle(slug: string) {
    const key = slug.toLowerCase()
    const isOn = selected.has(key)
    let nextKnown: string[]
    if (isOn) {
      nextKnown = state.known.filter((s) => s.toLowerCase() !== key)
    } else {
      if (state.known.length >= limit) {
        onToast?.(`Лимит мастерства: ${limit}`)
        return
      }
      nextKnown = [...state.known, key]
    }

    if (!canEdit && state.known.length > 0) {
      onToast?.('Смена после продолжительного отдыха')
      return
    }

    if (state.swapAvailable && state.baseline.length > 0) {
      const changed = countChangedWeapons(state.baseline, nextKnown)
      const maxChange = rule.changeAfterLongRest === 'all' ? 99 : rule.changeAfterLongRest
      if (changed > maxChange) {
        onToast?.(
          rule.changeAfterLongRest === 'all'
            ? 'Слишком много изменений'
            : `После отдыха можно сменить только ${rule.changeAfterLongRest} вид`,
        )
        return
      }
    }

    const completingSwap = state.swapAvailable && state.baseline.length > 0
    onChange({
      known: nextKnown,
      sourceClass: rule.slug,
      baseline: completingSwap
        ? nextKnown
        : state.baseline.length
          ? state.baseline
          : nextKnown,
      swapAvailable: completingSwap ? false : state.swapAvailable,
    })
  }

  return (
    <section
      className="sheet-section"
      data-testid="weapon-mastery-panel"
      aria-label={WEAPON_MASTERY_NAME_RU}
    >
      <header className="sheet-section__head">
        <Text as="h3">{WEAPON_MASTERY_NAME_RU}</Text>
        <Text tone="muted">
          {state.known.length}/{limit}
          {state.swapAvailable ? ' · можно сменить после отдыха' : ''}
          {rule.meleeOnly ? ' · только рукопашное' : ''}
        </Text>
      </header>

      {granting.length > 1 ? (
        <div className="sheet-chip-row" data-testid="weapon-mastery-source">
          {granting.map((g) => (
            <button
              key={g.slug}
              type="button"
              className={`sheet-chip${state.sourceClass === g.slug || (!state.sourceClass && rule.slug === g.slug) ? ' is-on' : ''}`}
              onClick={() =>
                onChange({
                  ...state,
                  sourceClass: g.slug,
                  known: [],
                  baseline: [],
                  swapAvailable: true,
                })
              }
            >
              {g.name} (ур. {g.level})
            </button>
          ))}
        </div>
      ) : null}

      <div className="sheet-chip-row" data-testid="weapon-mastery-picks">
        {allowed.map((w) => {
          const on = selected.has(w.slug.toLowerCase())
          return (
            <button
              key={w.slug}
              type="button"
              className={`sheet-chip${on ? ' is-on' : ''}`}
              disabled={!canEdit && !on}
              title={`${masteryPropertyNameRu(w.mastery)} — ${w.nameRu}`}
              onClick={() => toggle(w.slug)}
              data-testid={`weapon-mastery-chip-${w.slug}`}
            >
              {w.nameRu}
              <span className="sheet-chip__meta"> · {masteryPropertyNameRu(w.mastery)}</span>
            </button>
          )
        })}
      </div>

      {!canEdit ? (
        <div data-testid="weapon-mastery-locked">
          <Text tone="muted">
            Смена выбора — после продолжительного отдыха
            {rule.changeAfterLongRest === 'all'
              ? ' (можно заменить весь набор).'
              : ' (один вид).'}
          </Text>
        </div>
      ) : null}
    </section>
  )
}
