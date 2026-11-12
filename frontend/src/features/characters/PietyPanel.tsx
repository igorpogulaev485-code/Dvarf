import { Panel, Stack, Text } from '../../ui'
import {
  PIETY_RANKS,
  PIETY_THRESHOLDS,
  THEROS_GODS,
  championAbilityOptions,
  chooseGod,
  godDef,
  isRankUnlocked,
  isTherosGodSlug,
  rankLabelRu,
  setChampionAbility,
  setSupernaturalGift,
  type AbilityKey,
  type PietyState,
  type SupernaturalGiftSlug,
} from '../../shared/dnd/therosPiety'

const ABILITY_RU: Record<AbilityKey, string> = {
  str: 'Сила',
  dex: 'Ловкость',
  con: 'Телосложение',
  int: 'Интеллект',
  wis: 'Мудрость',
  cha: 'Харизма',
}

type Props = {
  piety: PietyState
  onChange: (piety: PietyState) => void
}

/** B-09: бог, счёт (только мастер правит), ранги, дар и выбор поборника. */
export function PietyPanel({ piety, onChange }: Props) {
  const god = godDef(piety.god)
  const hasStarted = Boolean(piety.god) || piety.gift === 'oracle' || piety.score > 0
  const atChampion = isRankUnlocked(piety.score, 'champion')
  const abilityOptions = championAbilityOptions(piety)
  const lastEntry = piety.journal.length > 0 ? piety.journal[piety.journal.length - 1] : null

  return (
    <Panel title="Благочестие" className="piety-panel">
      <Stack gap={10}>
        <div className="piety-panel__row">
          <label className="piety-panel__field">
            <Text tone="muted">Бог</Text>
            <select
              className="ui-input"
              value={piety.god ?? ''}
              onChange={(event) => {
                const value = event.target.value
                if (!value) {
                  onChange({
                    ...piety,
                    god: null,
                    champion_ability: null,
                    champion_applied: 0,
                  })
                  return
                }
                if (isTherosGodSlug(value)) onChange(chooseGod(piety, value))
              }}
            >
              <option value="">Без бога</option>
              {THEROS_GODS.map((g) => (
                <option key={g.slug} value={g.slug}>
                  {g.nameRu}
                </option>
              ))}
            </select>
          </label>
          <label className="piety-panel__field">
            <Text tone="muted">Сверхъестественный дар</Text>
            <select
              className="ui-input"
              value={piety.gift ?? ''}
              onChange={(event) => {
                const value = event.target.value
                onChange(
                  setSupernaturalGift(
                    piety,
                    value === 'heroic_destiny' || value === 'oracle'
                      ? (value as SupernaturalGiftSlug)
                      : null,
                  ),
                )
              }}
            >
              <option value="">Нет</option>
              <option value="heroic_destiny">Героическая судьба</option>
              <option value="oracle">Оракул</option>
            </select>
          </label>
          <div className="piety-panel__field">
            <Text tone="muted">Счёт (выдаёт мастер)</Text>
            <Text as="span" className="piety-panel__score">
              {piety.score}
            </Text>
          </div>
        </div>

        {hasStarted ? (
          <ul className="piety-panel__ranks">
            {PIETY_RANKS.map((rank) => {
              const unlocked = isRankUnlocked(piety.score, rank)
              return (
                <li key={rank} className={unlocked ? 'is-unlocked' : 'is-locked'}>
                  <span>{rankLabelRu(rank, piety.god, piety.gift)}</span>
                  <span className="piety-panel__threshold">
                    {PIETY_THRESHOLDS[rank]} {unlocked ? '· открыто' : '· закрыто'}
                  </span>
                </li>
              )
            })}
          </ul>
        ) : (
          <Text tone="muted">Выбери бога или дар оракула, чтобы начать копить благочестие.</Text>
        )}

        {atChampion && abilityOptions.length > 0 ? (
          <label className="piety-panel__field">
            <Text tone="muted">
              {god?.championTitleRu ?? 'Поборник'}: +2 к характеристике и к её максимуму
            </Text>
            <select
              className="ui-input"
              value={piety.champion_ability ?? ''}
              onChange={(event) => {
                const value = event.target.value as AbilityKey | ''
                onChange(setChampionAbility(piety, value || null))
              }}
            >
              <option value="">Выбрать…</option>
              {abilityOptions.map((key) => (
                <option key={key} value={key}>
                  {ABILITY_RU[key]}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {lastEntry ? (
          <Text tone="muted">
            Последнее: {lastEntry.delta > 0 ? '+' : ''}
            {lastEntry.delta}
            {lastEntry.comment ? ` · ${lastEntry.comment}` : ''}
          </Text>
        ) : null}
      </Stack>
    </Panel>
  )
}
