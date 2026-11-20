/**
 * DEV preview for P24-02 Playwright: 2014 vs 2024 core rules isolation.
 * Does not open the 2024 create button (RULES_EDITION_2024_OPEN stays off).
 */
import { useMemo, useState } from 'react'
import { CreateCharacterButton } from '../features/characters/CreateCharacterButton'
import { RULES_EDITION_2024_OPEN } from '../shared/dnd/rulesEdition2024'
import {
  exhaustionD20PenaltyForEdition,
  exhaustionHpMaxForEdition,
  exhaustionSpeedFtForEdition,
  exhaustionStageLabelForEdition,
} from '../shared/dnd/exhaustionRules'
import {
  canSpendHeroicInspiration,
  grantHeroicInspiration,
  resolveHeroicReroll,
  spendHeroicInspiration,
} from '../shared/dnd/heroicInspiration'
import { applyLongRest } from '../shared/dnd/rest'
import { isBloodied } from '../shared/dnd/bloodied'
import { surpriseRoundAllowed } from '../shared/dnd/surprise2024'
import { TURN_ACTIONS_2024, HIDE_DC_2024 } from '../shared/dnd/turnActions2024'
import { homebrewCatalogForEdition } from '../features/lobby/campaignRules2024'
import { Button, ChipStack, Panel, Stack, Text, ToggleChip } from '../ui'

export function P24CoreRulesPreviewPage() {
  const [insp2024, setInsp2024] = useState(true)
  const [rerollLog, setRerollLog] = useState('—')
  const [transferLog, setTransferLog] = useState('—')

  const tips2014 = useMemo(() => homebrewCatalogForEdition('2014'), [])
  const tips2024 = useMemo(() => homebrewCatalogForEdition('2024'), [])
  const potion2014 = tips2014.find((e) => e.key === 'potion_bonus_self')
  const potion2024 = tips2024.find((e) => e.key === 'potion_bonus_self')
  const stack2024 = tips2024.find((e) => e.key === 'inspiration_stack')

  const exh3_2024 = {
    penalty: exhaustionD20PenaltyForEdition(3, '2024'),
    speed: exhaustionSpeedFtForEdition(30, 3, '2024'),
    label: exhaustionStageLabelForEdition(3, '2024'),
    hp: exhaustionHpMaxForEdition(40, 4, '2024'),
  }
  const exh3_2014 = {
    speed: exhaustionSpeedFtForEdition(30, 2, '2014'),
    hp: exhaustionHpMaxForEdition(40, 4, '2014'),
    label: exhaustionStageLabelForEdition(3, '2014'),
  }

  const rest2014 = applyLongRest({
    resources: [],
    slots: {},
    pact_slots: null,
    exhaustion: 1,
    hp_max: 20,
    hit_dice_current: 0,
    hit_dice_max: 8,
    rules_edition: '2014',
  })
  const rest2024 = applyLongRest({
    resources: [],
    slots: {},
    pact_slots: null,
    exhaustion: 1,
    hp_max: 20,
    hp_current: 5,
    hit_dice_current: 0,
    hit_dice_max: 8,
    rules_edition: '2024',
  })

  function onReroll() {
    if (!canSpendHeroicInspiration(insp2024)) {
      setRerollLog('нет героического вдохновения')
      return
    }
    const spent = spendHeroicInspiration(insp2024)
    if (!spent.ok) {
      setRerollLog(spent.reason)
      return
    }
    setInsp2024(Boolean(spent.next))
    const rr = resolveHeroicReroll({ previous: 7, sides: 20, rng: () => 0.5 })
    setRerollLog(`переброс к20: ${rr.previous} → ${rr.next}`)
  }

  function onTransfer() {
    const g = grantHeroicInspiration({
      current: true,
      allyIdWithout: 'ally-fixture',
    })
    if (g.ok && g.transferred) {
      setTransferLog(`передано союзнику ${g.allyId}`)
    } else {
      setTransferLog(g.ok ? 'ok' : g.reason)
    }
  }

  return (
    <main className="page page--app" data-testid="p24-02-preview">
      <Stack gap={20}>
        <h1 className="ui-text">P24-02 preview · базовые правила 2024</h1>
        <Text tone="muted">
          Флаг RULES_EDITION_2024_OPEN = {String(RULES_EDITION_2024_OPEN)}. Кнопка
          создания 2024 скрыта.
        </Text>

        <Panel title="Создание 2014 (регрессия)">
          <CreateCharacterButton onCreate={() => undefined} />
          <p className="ui-text ui-text--muted" data-testid="p24-02-flag-off">
            2024 закрыт
          </p>
        </Panel>

        <Panel title="Истощение">
          <Stack gap={8}>
            <p className="ui-text" data-testid="p24-02-exh-2024">
              2024 · ур.3: −{exh3_2024.penalty} к D20, скорость {exh3_2024.speed} фт (
              {exh3_2024.label}); ур.4 макс.хиты {exh3_2024.hp}
            </p>
            <p className="ui-text" data-testid="p24-02-exh-2014">
              2014 · ур.2 скорость {exh3_2014.speed}; ур.3 {exh3_2014.label}; ур.4
              макс.хиты {exh3_2014.hp}
            </p>
          </Stack>
        </Panel>

        <Panel title="Отдых · кости хитов">
          <p className="ui-text" data-testid="p24-02-rest-2014">
            2014 длинный: кости {rest2014.hit_dice_current}/{8}
          </p>
          <p className="ui-text" data-testid="p24-02-rest-2024">
            2024 длинный: кости {rest2024.hit_dice_current}/{8}
          </p>
        </Panel>

        <Panel title="Героическое вдохновение (фикстура 2024)">
          <div data-testid="p24-02-heroic-chip">
            <ChipStack>
              <ToggleChip
                main="Г.вдохн."
                checked={insp2024}
                onChange={setInsp2024}
              />
              <Button
                type="button"
                data-testid="p24-02-heroic-reroll"
                onClick={onReroll}
              >
                Перебросить кубик
              </Button>
              <Button
                type="button"
                variant="secondary"
                data-testid="p24-02-heroic-transfer"
                onClick={onTransfer}
              >
                Отдать союзнику
              </Button>
            </ChipStack>
          </div>
          <p className="ui-text" data-testid="p24-02-reroll-log">{rerollLog}</p>
          <p className="ui-text" data-testid="p24-02-transfer-log">{transferLog}</p>
        </Panel>

        <Panel title="Неожиданность и действия 2024">
          <p className="ui-text" data-testid="p24-02-surprise">
            раунд L-21 для 2024: {surpriseRoundAllowed('2024') ? 'да' : 'нет'} · Hide DC{' '}
            {HIDE_DC_2024}
          </p>
          <p className="ui-text" data-testid="p24-02-actions">
            {TURN_ACTIONS_2024.filter((a) =>
              ['magic', 'study', 'influence', 'utilize'].includes(a.id),
            )
              .map((a) => a.labelRu)
              .join(' · ')}
          </p>
          <p className="ui-text" data-testid="p24-02-bloodied">
            окровавлен 10/20: {isBloodied(10, 20) ? 'да' : 'нет'}
          </p>
        </Panel>

        <Panel title="Тумблеры лобби">
          <p className="ui-text" data-testid="p24-02-potion-2014">
            2014 зелье: {potion2014?.label}
          </p>
          <p className="ui-text" data-testid="p24-02-potion-2024">
            2024 зелье: {potion2024?.label}
          </p>
          <p className="ui-text" data-testid="p24-02-stack-2024">
            2024 стопка: {stack2024?.label}
          </p>
          <p className="ui-text" data-testid="p24-02-toggle-count">
            ключей 2024: {tips2024.length} (как в 2014: {tips2014.length})
          </p>
        </Panel>
      </Stack>
    </main>
  )
}
