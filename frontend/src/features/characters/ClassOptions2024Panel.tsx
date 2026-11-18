/**
 * P24-M02a+: выбор воззваний / метамагии / планов реплики на листе 2024.
 * Artificer EFA: известные схемы + активные реплики (лимит / старейшая / настройка).
 */
import { useState } from 'react'
import { Button, Text } from '../../ui'
import {
  ARTIFICER_REPLICATE_PLANS_2024,
  ELDRITCH_INVOCATIONS_2024,
  METAMAGIC_2024,
  metamagicKnownLimit2024,
  replicatePlanById2024,
  warlockInvocationLimit2024,
  type ClassOptions2024State,
} from '../../shared/dnd/edition2024ClassOptions'
import { normalizeClassSlug2024 } from '../../shared/dnd/edition2024Classes'
import {
  artificerAttunementLimit2024,
  createReplicateActive2024,
  dissolveReplicateActive2024,
  MAGIC_ITEMS_COLUMN_RU,
  PLANS_KNOWN_COLUMN_RU,
  replicateAttunedCount2024,
  replicateLimits2024,
  setReplicateAttuned2024,
} from '../../shared/dnd/artificer2024Features'
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
  const plansLimits = replicateLimits2024(artificerLv)
  const plansLimit = plansLimits.plansKnown
  const itemsLimit = plansLimits.magicItems
  const attuneLimit = artificerAttunementLimit2024(artificerLv)
  const [pendingPlan, setPendingPlan] = useState('')
  const [pendingAttune, setPendingAttune] = useState(false)

  function toggleList(
    key: 'eldritch_invocations' | 'metamagic' | 'replicate_plans',
    id: string,
    limit: number,
  ) {
    const cur = new Set(state[key])
    if (cur.has(id)) {
      cur.delete(id)
      if (key === 'replicate_plans') {
        onChange({
          ...state,
          replicate_plans: [...cur],
          replicate_active: state.replicate_active.filter((row) => row.planId !== id),
        })
        return
      }
    } else {
      if (cur.size >= limit) {
        onToast?.(`Лимит: ${limit}`)
        return
      }
      cur.add(id)
    }
    onChange({ ...state, [key]: [...cur] })
  }

  function createReplica() {
    const result = createReplicateActive2024({
      state,
      planId: pendingPlan,
      artificerLevel: artificerLv,
      attune: pendingAttune,
      attunementLimit: attuneLimit,
    })
    if (!result.ok) {
      onToast?.(result.reasonRu)
      return
    }
    onChange(result.state)
    onToast?.(result.feedLineRu)
    setPendingPlan('')
    setPendingAttune(false)
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
            {PLANS_KNOWN_COLUMN_RU} ({state.replicate_plans.length}/{plansLimit})
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

          <div data-testid="class-options-replicates-active" style={{ marginTop: 12 }}>
            <Text as="h3">
              {MAGIC_ITEMS_COLUMN_RU} ({state.replicate_active.length}/{itemsLimit})
              {' · '}
              настройка {replicateAttunedCount2024(state.replicate_active)}/{attuneLimit}
            </Text>
            {state.replicate_active.length === 0 ? (
              <Text tone="muted">Нет созданных реплик. После долгого отдыха создайте предмет по известной схеме.</Text>
            ) : (
              <ul data-testid="replicate-active-list" style={{ margin: '8px 0', paddingLeft: 18 }}>
                {[...state.replicate_active]
                  .sort((a, b) => a.seq - b.seq)
                  .map((row) => {
                    const plan = replicatePlanById2024(row.planId)
                    return (
                      <li key={row.seq} data-testid={`replicate-active-${row.seq}`}>
                        {plan?.nameRu ?? row.planId}
                        {row.attuned ? ' · настроен' : ''}
                        {plan?.requiresAttunement ? (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              const next = setReplicateAttuned2024({
                                state,
                                seq: row.seq,
                                attuned: !row.attuned,
                                attunementLimit: attuneLimit,
                              })
                              if (!next.ok) {
                                onToast?.(next.reasonRu)
                                return
                              }
                              onChange(next.state)
                            }}
                          >
                            {row.attuned ? 'Снять настройку' : 'Настроиться'}
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => onChange(dissolveReplicateActive2024(state, row.seq))}
                        >
                          Развоплотить
                        </Button>
                      </li>
                    )
                  })}
              </ul>
            )}
            <div className="sheet-chip-row" style={{ alignItems: 'center', gap: 8 }}>
              <select
                data-testid="replicate-create-plan"
                value={pendingPlan}
                onChange={(e) => {
                  setPendingPlan(e.target.value)
                  setPendingAttune(false)
                }}
              >
                <option value="">Схема для реплики…</option>
                {state.replicate_plans.map((id) => {
                  const plan = replicatePlanById2024(id)
                  if (!plan || plan.minLevel > artificerLv) return null
                  return (
                    <option key={id} value={id}>
                      {plan.nameRu}
                    </option>
                  )
                })}
              </select>
              {replicatePlanById2024(pendingPlan)?.requiresAttunement ? (
                <label>
                  <input
                    type="checkbox"
                    data-testid="replicate-create-attune"
                    checked={pendingAttune}
                    onChange={(e) => setPendingAttune(e.target.checked)}
                  />{' '}
                  Настроиться сразу
                </label>
              ) : null}
              <Button
                type="button"
                data-testid="replicate-create-submit"
                disabled={!pendingPlan}
                onClick={createReplica}
              >
                Создать реплику
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
