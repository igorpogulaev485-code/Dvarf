/**
 * P24-M02a+: выбор воззваний / метамагии / планов реплики на листе 2024.
 */
import { Text } from '../../ui'
import {
  ARTIFICER_REPLICATE_PLANS_2024,
  ELDRITCH_INVOCATIONS_2024,
  METAMAGIC_2024,
  metamagicKnownLimit2024,
  warlockInvocationLimit2024,
  type ClassOptions2024State,
} from '../../shared/dnd/edition2024ClassOptions'
import { normalizeClassSlug2024 } from '../../shared/dnd/edition2024Classes'
import { invocationUnavailableReason2024 } from '../../shared/dnd/warlock2024Features'
import type { ClassLevelEntry } from './classLevels'

export type ClassOptions2024PanelProps = {
  rulesEdition: string | null | undefined
  classes: ClassLevelEntry[]
  state: ClassOptions2024State
  onChange: (next: ClassOptions2024State) => void
  onToast?: (message: string) => void
}

function classLevel(classes: ClassLevelEntry[], slug: string): number {
  return classes.reduce((sum, row) => {
    const s = normalizeClassSlug2024(row.catalog_id) || normalizeClassSlug2024(row.name)
    return s === slug ? sum + Math.max(0, row.level || 0) : sum
  }, 0)
}

export function ClassOptions2024Panel({
  rulesEdition,
  classes,
  state,
  onChange,
  onToast,
}: ClassOptions2024PanelProps) {
  if (String(rulesEdition || '') !== '2024') return null

  const warlockLv = classLevel(classes, 'warlock')
  const sorcererLv = classLevel(classes, 'sorcerer')
  const artificerLv = classLevel(classes, 'artificer')
  if (!warlockLv && !sorcererLv && !artificerLv) return null

  const invLimit = warlockLv ? warlockInvocationLimit2024(warlockLv) : 0
  const metaLimit = sorcererLv ? metamagicKnownLimit2024(sorcererLv) : 0
  // Approximate plans limit from typical table checkpoints when progression scales present.
  const plansLimit =
    artificerLv >= 18
      ? 8
      : artificerLv >= 14
        ? 7
        : artificerLv >= 10
          ? 6
          : artificerLv >= 6
            ? 5
            : artificerLv >= 2
              ? 4
              : 0

  function toggleList(
    key: 'eldritch_invocations' | 'metamagic' | 'replicate_plans',
    id: string,
    limit: number,
  ) {
    const cur = new Set(state[key])
    if (cur.has(id)) {
      cur.delete(id)
    } else {
      if (cur.size >= limit) {
        onToast?.(`Лимит: ${limit}`)
        return
      }
      cur.add(id)
    }
    onChange({ ...state, [key]: [...cur] })
  }

  return (
    <div className="feature-resource" data-testid="class-options-2024">
      {warlockLv > 0 ? (
        <div data-testid="class-options-invocations">
          <Text as="h3">
            Таинственные воззвания ({state.eldritch_invocations.length}/{invLimit})
          </Text>
          <div className="sheet-chip-row">
            {ELDRITCH_INVOCATIONS_2024.map((row) => {
              const on = state.eldritch_invocations.includes(row.id)
              const reason = on
                ? null
                : invocationUnavailableReason2024({
                    known: state.eldritch_invocations,
                    addId: row.id,
                    warlockLevel: warlockLv,
                  })
              const locked = reason != null
              return (
                <button
                  key={row.id}
                  type="button"
                  className={`sheet-chip${on ? ' is-on' : ''}`}
                  disabled={locked}
                  aria-disabled={locked}
                  style={locked ? { opacity: 0.45 } : undefined}
                  title={locked ? `${row.summaryRu} — ${reason}` : row.summaryRu}
                  onClick={() => toggleList('eldritch_invocations', row.id, invLimit)}
                >
                  {row.nameRu}
                  {row.minLevel > 1 ? ` ·${row.minLevel}+` : ''}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {sorcererLv >= 2 ? (
        <div data-testid="class-options-metamagic">
          <Text as="h3">
            Метамагия ({state.metamagic.length}/{metaLimit})
          </Text>
          <div className="sheet-chip-row">
            {METAMAGIC_2024.map((row) => {
              const on = state.metamagic.includes(row.id)
              return (
                <button
                  key={row.id}
                  type="button"
                  className={`sheet-chip${on ? ' is-on' : ''}`}
                  title={`${row.summaryRu} (−${row.cost} очк.)`}
                  onClick={() => toggleList('metamagic', row.id, metaLimit)}
                >
                  {row.nameRu} ·{row.cost}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {artificerLv >= 2 && plansLimit > 0 ? (
        <div data-testid="class-options-plans">
          <Text as="h3">
            Планы реплики ({state.replicate_plans.length}/{plansLimit})
          </Text>
          <div className="sheet-chip-row">
            {ARTIFICER_REPLICATE_PLANS_2024.filter((row) => row.minLevel <= artificerLv).map(
              (row) => {
                const on = state.replicate_plans.includes(row.id)
                return (
                  <button
                    key={row.id}
                    type="button"
                    className={`sheet-chip${on ? ' is-on' : ''}`}
                    title={`${row.rarity} · с ${row.minLevel} ур.`}
                    onClick={() => toggleList('replicate_plans', row.id, plansLimit)}
                  >
                    {row.nameRu}
                  </button>
                )
              },
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
