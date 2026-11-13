/** Каркас Play Desk: собирает шапку, сцены и диалоги в прежнем порядке. */
import type { SheetModel } from './sheetModel'
import { EquipmentProficienciesPanel } from '../EquipmentProficienciesPanel'
import {
  Button,
  Field,
  NumberInput,
  Panel,
  Stack,
  Text,
} from '../../../ui'
import { syncAttacksHeldFromInventory } from '../AttacksPanel'
import { canWearArmor } from '../equipmentProficiency'
import { LanguagesToolsPanel } from '../LanguagesToolsPanel'
import { OnboardingChecklist, HoverTipCard, SCENE_TIPS } from '../../onboarding'
import { PlayDeskHotBar } from '../PlayDeskHotBar'
import { BottomSceneNav } from '../BottomSceneNav'
import { MobileAbilitiesPage } from '../MobileAbilitiesPage'
import { PlayDeskSkillStrip } from '../PlayDeskSkillStrip'
import { MODE_HINT, MODE_LABELS, modeUsesSpellSplit } from '../playDeskUi'
import { PlayDeskTop } from './PlayDeskTop'
import { SheetIdentityDialog } from './SheetIdentityDialog'
import { PlayDeskScenes } from './PlayDeskScenes'
import { SheetDialogsRolls } from './SheetDialogsRolls'
import { SheetDialogsResources } from './SheetDialogsResources'
import { SheetDialogsSetup } from './SheetDialogsSetup'
import { TurnEconomyDeskHost } from '../TurnEconomyDeskHost'

export function PlayDeskLayout({ model }: { model: SheetModel }) {
  return (
    <div
      className={[
        'play-desk',
        model.isPlayDesk ? 'play-desk--wide' : 'play-desk--mobile',
        model.deskSplit ? 'play-desk--split' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <PlayDeskTop model={model} />

      <div className="play-desk__body">
        <aside className="play-desk__left">
          {model.abilityColumn}
          <div className="play-desk__rail-foot">
            {model.passivesCompact}
            <Button type="button" variant="secondary" onClick={() => model.setOwnershipOpen(true)}>
              Владения ▸
            </Button>
            {model.showOnboardingChecklist ? <OnboardingChecklist compact /> : null}
          </div>
        </aside>

        <div className="play-desk__stage">
          {model.isPlayDesk ? (
            <div className="play-desk__modes" aria-label="Сцены листа">
              <div className="play-desk__mode-tabs" data-onboarding="desk-modes" role="group" aria-label="Вкладки сцен">
                {MODE_LABELS.map(({ id: mode, label }) => (
                  <button
                    key={mode}
                    type="button"
                    className={`play-desk__mode${model.draft.sheetUi.deskMode === mode ? ' is-on' : ''}${
                      model.showValueTips ? ' has-onboarding-tip' : ''
                    }`}
                    onClick={() => model.setDeskMode(mode)}
                  >
                    {label}
                    {model.showValueTips ? <HoverTipCard tip={SCENE_TIPS[mode]} /> : null}
                  </button>
                ))}
              </div>
              <div
                className="play-desk__roll-mode"
                role="group"
                aria-label="Преимущество / помеха"
              >
                {(
                  [
                    ['normal', 'норм'],
                    ['advantage', 'преим.'],
                    ['disadvantage', 'помеха'],
                  ] as const
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    className={`play-desk__roll-mode-btn${
                      model.deskRollMode === mode ? ' is-on' : ''
                    }`}
                    aria-pressed={model.deskRollMode === mode}
                    onClick={() => model.setDeskRollMode(mode)}
                  >
                    {label}
                  </button>
                ))}
                {typeof model.luckyPointsRemaining === 'function' &&
                model.luckyPointsRemaining() > 0 ? (
                  <button
                    type="button"
                    className={`play-desk__roll-mode-btn${
                      model.luckyRollArmed ? ' is-on' : ''
                    }`}
                    aria-pressed={Boolean(model.luckyRollArmed)}
                    title="Везунчик: лишняя к20, выбрать любую"
                    onClick={() =>
                      model.setLuckyRollArmed?.(!model.luckyRollArmed)
                    }
                  >
                    удача {model.luckyPointsRemaining()}
                  </button>
                ) : null}
                {model.draft.inspiration || model.inspirationRollArmed ? (
                  <button
                    type="button"
                    className={`play-desk__roll-mode-btn${
                      model.inspirationRollArmed ? ' is-on' : ''
                    }`}
                    aria-pressed={Boolean(model.inspirationRollArmed)}
                    title="Потратить вдохновение: преимущество на один бросок атаки, проверки или спаса"
                    onClick={() => {
                      if (model.inspirationRollArmed) {
                        model.setInspirationRollArmed?.(false)
                        return
                      }
                      if (!model.draft.inspiration) {
                        model.onToast?.('Нет вдохновения')
                        return
                      }
                      if (model.deskRollMode === 'advantage') {
                        model.onToast?.('Уже есть преимущество')
                        return
                      }
                      model.setInspirationRollArmed?.(true)
                    }}
                  >
                    вдохн.
                  </button>
                ) : null}
                <button
                  type="button"
                  className="play-desk__roll-mode-btn"
                  title="История бросков на этом листе"
                  onClick={() => model.setRollHistoryOpen(true)}
                >
                  броски
                  {model.draft.sheetUi.rollHistory.length > 0
                    ? ` ${Math.min(model.draft.sheetUi.rollHistory.length, 99)}`
                    : ''}
                </button>
              </div>
              {modeUsesSpellSplit(model.draft.sheetUi.deskMode) ? (
                <button
                  type="button"
                  className={`play-desk__split-btn${model.deskSplit ? ' is-on' : ''}`}
                  aria-pressed={model.deskSplit}
                  title={
                    model.deskSplit
                      ? 'Скрыть магию — основная панель на всю ширину'
                      : model.hasMagicSources
                        ? 'Показать магию справа рядом с панелью'
                        : 'Показать панель магии (у персонажа нет источников магии)'
                  }
                  onClick={() => model.patchSheetUi({ deskSplit: !model.draft.sheetUi.deskSplit })}
                >
                  {model.deskSplit ? 'Скрыть магию' : 'Показать магию'}
                </button>
              ) : null}
              <span className="play-desk__mode-hint">{MODE_HINT[model.draft.sheetUi.deskMode]}</span>
            </div>
          ) : null}

          <PlayDeskHotBar
            conditionNames={model.hotConditionNames}
            exhaustion={model.draft.play.exhaustion}
            concentration={model.draft.play.concentration}
            resources={model.draft.play.resources}
            mobileMoreOverflow={!model.isPlayDesk}
            onOpenConditions={() => model.setHotConditionsOpen(true)}
            onClearConcentration={() => model.clearConcentrationDismissingCompanions(null)}
            onResourceUsedChange={(id, used) => {
              const row = model.draft.play.resources.find((item) => item.id === id)
              // Spending a special pool → open picker instead of blind ±1.
              if (row && used > row.used && model.openResourceSpendDialog(id)) return
              model.setDraft((prev) => ({
                ...prev,
                play: {
                  ...prev.play,
                  resources: prev.play.resources.map((item) =>
                    item.id === id ? { ...item, used } : item,
                  ),
                },
              }))
            }}
          />

          {!model.isPlayDesk && model.draft.sheetUi.deskMode === 'combat' ? (
            <div className="mobile-combat-seg-stack">
              {model.hasMagicSources ? (
              <div
                className="mobile-combat-seg"
                role="tablist"
                aria-label="Бой"
                data-onboarding="actions"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={model.activePanel === 'attacks'}
                  className={`mobile-combat-seg__btn${
                    model.activePanel === 'attacks' ? ' is-on' : ''
                  }`}
                  onClick={() => {
                    model.setActivePanel('attacks')
                    model.setMobileSpellSurface('combat')
                    model.setSpellsSettingsOpen(false)
                  }}
                >
                  Атаки
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={model.activePanel === 'spells'}
                  className={`mobile-combat-seg__btn${
                    model.activePanel === 'spells' ? ' is-on' : ''
                  }`}
                  onClick={() => model.setActivePanel('spells')}
                >
                  Заклинания
                </button>
              </div>
              ) : null}
              {model.hasMagicSources && model.activePanel === 'spells' ? (
                <div
                  className="mobile-combat-seg mobile-combat-seg--spell"
                  role="tablist"
                  aria-label="Заклинания"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={model.mobileSpellSurface === 'combat'}
                    className={`mobile-combat-seg__btn${
                      model.mobileSpellSurface === 'combat' ? ' is-on' : ''
                    }`}
                    onClick={() => {
                      model.setMobileSpellSurface('combat')
                      model.setSpellsSettingsOpen(false)
                    }}
                  >
                    Бой
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={model.mobileSpellSurface === 'book'}
                    className={`mobile-combat-seg__btn${
                      model.mobileSpellSurface === 'book' ? ' is-on' : ''
                    }`}
                    onClick={() => {
                      model.setMobileSpellSurface('book')
                      model.setSpellsSettingsOpen(true)
                    }}
                  >
                    Книга
                  </button>
                </div>
              ) : null}
              <div
                className="mobile-combat-roll"
                role="group"
                aria-label="Преимущество / помеха"
              >
                {(
                  [
                    ['normal', 'норм'],
                    ['advantage', 'преим.'],
                    ['disadvantage', 'помеха'],
                  ] as const
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    className={`mobile-combat-roll__btn${
                      model.deskRollMode === mode ? ' is-on' : ''
                    }`}
                    aria-pressed={model.deskRollMode === mode}
                    onClick={() => model.setDeskRollMode(mode)}
                  >
                    {label}
                  </button>
                ))}
                                {typeof model.luckyPointsRemaining === 'function' &&
                model.luckyPointsRemaining() > 0 ? (
                  <button
                    type="button"
                    className={`mobile-combat-roll__btn${
                      model.luckyRollArmed ? ' is-on' : ''
                    }`}
                    aria-pressed={Boolean(model.luckyRollArmed)}
                    title="Везунчик: лишняя к20, выбрать любую"
                    onClick={() =>
                      model.setLuckyRollArmed?.(!model.luckyRollArmed)
                    }
                  >
                    удача {model.luckyPointsRemaining()}
                  </button>
                ) : null}
                {model.draft.inspiration || model.inspirationRollArmed ? (
                  <button
                    type="button"
                    className={`mobile-combat-roll__btn${
                      model.inspirationRollArmed ? ' is-on' : ''
                    }`}
                    aria-pressed={Boolean(model.inspirationRollArmed)}
                    title="Потратить вдохновение: преимущество на один бросок атаки, проверки или спаса"
                    onClick={() => {
                      if (model.inspirationRollArmed) {
                        model.setInspirationRollArmed?.(false)
                        return
                      }
                      if (!model.draft.inspiration) {
                        model.onToast?.('Нет вдохновения')
                        return
                      }
                      if (model.deskRollMode === 'advantage') {
                        model.onToast?.('Уже есть преимущество')
                        return
                      }
                      model.setInspirationRollArmed?.(true)
                    }}
                  >
                    вдохн.
                  </button>
                ) : null}
<button
                  type="button"
                  className="mobile-combat-roll__btn mobile-combat-roll__btn--history"
                  title="История бросков на этом листе"
                  onClick={() => model.setRollHistoryOpen(true)}
                >
                  броски
                  {model.draft.sheetUi.rollHistory.length > 0
                    ? ` ${Math.min(model.draft.sheetUi.rollHistory.length, 99)}`
                    : ''}
                </button>
              </div>
            </div>
          ) : null}

          {/*
            SC-01 / решение 13.11 17:42: на десктопе полоска навыков боя скрыта
            (дубль левой колонки). На телефоне оставляем.
          */}
          {!model.isPlayDesk && model.draft.sheetUi.deskMode === 'combat' ? (
            <PlayDeskSkillStrip
              ariaLabel="Навыки боя"
              skills={model.modeSkillChips('combat')}
              onSkillClick={model.rollModeSkill}
              mobileOverflow
            />
          ) : null}

          {!model.isPlayDesk && model.draft.sheetUi.deskMode === 'explore' ? (
            <div
              className="mobile-combat-roll mobile-combat-roll--explore"
              role="group"
              aria-label="Преимущество / помеха"
            >
              {(
                [
                  ['normal', 'норм'],
                  ['advantage', 'преим.'],
                  ['disadvantage', 'помеха'],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  className={`mobile-combat-roll__btn${
                    model.deskRollMode === mode ? ' is-on' : ''
                  }`}
                  aria-pressed={model.deskRollMode === mode}
                  onClick={() => model.setDeskRollMode(mode)}
                >
                  {label}
                </button>
              ))}
                              {typeof model.luckyPointsRemaining === 'function' &&
                model.luckyPointsRemaining() > 0 ? (
                  <button
                    type="button"
                    className={`mobile-combat-roll__btn${
                      model.luckyRollArmed ? ' is-on' : ''
                    }`}
                    aria-pressed={Boolean(model.luckyRollArmed)}
                    title="Везунчик: лишняя к20, выбрать любую"
                    onClick={() =>
                      model.setLuckyRollArmed?.(!model.luckyRollArmed)
                    }
                  >
                    удача {model.luckyPointsRemaining()}
                  </button>
                ) : null}
                {model.draft.inspiration || model.inspirationRollArmed ? (
                  <button
                    type="button"
                    className={`mobile-combat-roll__btn${
                      model.inspirationRollArmed ? ' is-on' : ''
                    }`}
                    aria-pressed={Boolean(model.inspirationRollArmed)}
                    title="Потратить вдохновение: преимущество на один бросок атаки, проверки или спаса"
                    onClick={() => {
                      if (model.inspirationRollArmed) {
                        model.setInspirationRollArmed?.(false)
                        return
                      }
                      if (!model.draft.inspiration) {
                        model.onToast?.('Нет вдохновения')
                        return
                      }
                      if (model.deskRollMode === 'advantage') {
                        model.onToast?.('Уже есть преимущество')
                        return
                      }
                      model.setInspirationRollArmed?.(true)
                    }}
                  >
                    вдохн.
                  </button>
                ) : null}
<button
                type="button"
                className="mobile-combat-roll__btn mobile-combat-roll__btn--history"
                title="История бросков на этом листе"
                onClick={() => model.setRollHistoryOpen(true)}
              >
                броски
                {model.draft.sheetUi.rollHistory.length > 0
                  ? ` ${Math.min(model.draft.sheetUi.rollHistory.length, 99)}`
                  : ''}
              </button>
            </div>
          ) : null}

          {model.draft.sheetUi.deskMode === 'explore' ? (
            <PlayDeskSkillStrip
              ariaLabel="Навыки исследования"
              skills={model.modeSkillChips('explore')}
              onSkillClick={model.rollModeSkill}
              mobileOverflow={!model.isPlayDesk}
            />
          ) : null}

          {!model.isPlayDesk && model.draft.sheetUi.deskMode === 'social' ? (
            <div
              className="mobile-combat-roll mobile-combat-roll--social"
              role="group"
              aria-label="Преимущество / помеха"
            >
              {(
                [
                  ['normal', 'норм'],
                  ['advantage', 'преим.'],
                  ['disadvantage', 'помеха'],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  className={`mobile-combat-roll__btn${
                    model.deskRollMode === mode ? ' is-on' : ''
                  }`}
                  aria-pressed={model.deskRollMode === mode}
                  onClick={() => model.setDeskRollMode(mode)}
                >
                  {label}
                </button>
              ))}
                              {typeof model.luckyPointsRemaining === 'function' &&
                model.luckyPointsRemaining() > 0 ? (
                  <button
                    type="button"
                    className={`mobile-combat-roll__btn${
                      model.luckyRollArmed ? ' is-on' : ''
                    }`}
                    aria-pressed={Boolean(model.luckyRollArmed)}
                    title="Везунчик: лишняя к20, выбрать любую"
                    onClick={() =>
                      model.setLuckyRollArmed?.(!model.luckyRollArmed)
                    }
                  >
                    удача {model.luckyPointsRemaining()}
                  </button>
                ) : null}
                {model.draft.inspiration || model.inspirationRollArmed ? (
                  <button
                    type="button"
                    className={`mobile-combat-roll__btn${
                      model.inspirationRollArmed ? ' is-on' : ''
                    }`}
                    aria-pressed={Boolean(model.inspirationRollArmed)}
                    title="Потратить вдохновение: преимущество на один бросок атаки, проверки или спаса"
                    onClick={() => {
                      if (model.inspirationRollArmed) {
                        model.setInspirationRollArmed?.(false)
                        return
                      }
                      if (!model.draft.inspiration) {
                        model.onToast?.('Нет вдохновения')
                        return
                      }
                      if (model.deskRollMode === 'advantage') {
                        model.onToast?.('Уже есть преимущество')
                        return
                      }
                      model.setInspirationRollArmed?.(true)
                    }}
                  >
                    вдохн.
                  </button>
                ) : null}
<button
                type="button"
                className="mobile-combat-roll__btn mobile-combat-roll__btn--history"
                title="История бросков на этом листе"
                onClick={() => model.setRollHistoryOpen(true)}
              >
                броски
                {model.draft.sheetUi.rollHistory.length > 0
                  ? ` ${Math.min(model.draft.sheetUi.rollHistory.length, 99)}`
                  : ''}
              </button>
            </div>
          ) : null}

          {model.draft.sheetUi.deskMode === 'social' ? (
            <PlayDeskSkillStrip
              ariaLabel="Навыки общения"
              skills={model.modeSkillChips('social')}
              onSkillClick={model.rollModeSkill}
              mobileOverflow={!model.isPlayDesk}
            />
          ) : null}

          {model.deskSplit && model.splitSecondary === 'spells' && model.activePanel !== 'spells' ? (
            <p className="play-desk__split-hint">
              Справа — заклинания · слева — выбранная панель
            </p>
          ) : null}

      <TurnEconomyDeskHost model={model}>
        <SheetIdentityDialog model={model} />
        <PlayDeskScenes model={model} />
      </TurnEconomyDeskHost>

      {model.error ? <Text tone="danger">{model.error}</Text> : null}

      <div className="sheet-actions sheet-actions--autosave">
        <Text
          tone={model.saveStatus === 'error' ? 'danger' : 'muted'}
          className={
            model.saveStatus === 'saving' || model.saveStatus === 'dirty'
              ? 'sheet-autosave sheet-autosave--busy'
              : 'sheet-autosave'
          }
        >
          {model.reloading
            ? 'Обновляем…'
            : model.saveStatus === 'saving'
              ? 'Сохраняем…'
              : model.saveStatus === 'dirty'
                ? 'Сохраним через мгновение…'
                : model.saveStatus === 'error'
                  ? 'Ошибка сохранения'
                  : 'Сохранено'}
        </Text>
        <Text tone="muted">
          Редакция {model.baseCharacter.rules_edition} · v{model.sheetVersion}
        </Text>
      </div>

      </div>{/* stage */}
      </div>{/* body */}

      {!model.isPlayDesk ? (
        <BottomSceneNav
          mode={model.draft.sheetUi.deskMode}
          onModeChange={model.setDeskMode}
          showValueTips={model.showValueTips}
        />
      ) : null}

      {!model.isPlayDesk ? (
        <MobileAbilitiesPage
          open={model.mobileAbilitiesOpen}
          onClose={() => model.setMobileAbilitiesOpen(false)}
          onOpenOwnership={() => {
            // Keep Характеристики under the ownership sheet.
            model.setOwnershipOpen(true)
          }}
          passives={model.passivesCompact}
        >
          {model.abilityColumn}
        </MobileAbilitiesPage>
      ) : null}

      {model.ownershipOpen ? (
        <>
          <div
            className="play-desk-drawer-backdrop"
            onClick={() => model.setOwnershipOpen(false)}
          />
          <aside className="play-desk-drawer" aria-label="Владения">
            <div className="play-desk-drawer__head">
              <h3>Владения</h3>
              <Button type="button" variant="ghost" onClick={() => model.setOwnershipOpen(false)}>
                Закрыть
              </Button>
            </div>
            <div className="play-desk-drawer__body">
              <Panel title="Скорости и зрение">
                <Stack gap={12}>
                  <Field
                    label="Тёмное зрение, фт"
                    htmlFor="sheet-darkvision"
                    hint={
                      model.effectiveDarkvisionFt !== model.draft.identity.darkvision
                        ? `база ${model.draft.identity.darkvision || 0} · итого ${model.effectiveDarkvisionFt} фт (умения/предметы)`
                        : '0 = нет'
                    }
                  >
                    <NumberInput
                      id="sheet-darkvision"
                      min={0}
                      emptyValue={0}
                      value={model.draft.identity.darkvision}
                      onValueChange={(darkvision) =>
                        model.patchIdentity({ darkvision: darkvision ?? 0 })
                      }
                    />
                  </Field>
                  <div className="sheet-grid sheet-grid--speeds">
                    <Field label="Лазание, фт" htmlFor="sheet-climb" hint="пусто = нет">
                      <NumberInput
                        id="sheet-climb"
                        min={0}
                        value={model.draft.climbSpeed}
                        onValueChange={(climbSpeed) =>
                          model.setDraft((prev) => ({ ...prev, climbSpeed }))
                        }
                      />
                    </Field>
                    <Field label="Плавание, фт" htmlFor="sheet-swim" hint="пусто = нет">
                      <NumberInput
                        id="sheet-swim"
                        min={0}
                        value={model.draft.swimSpeed}
                        onValueChange={(swimSpeed) =>
                          model.setDraft((prev) => ({ ...prev, swimSpeed }))
                        }
                      />
                    </Field>
                    <Field label="Полёт, фт" htmlFor="sheet-fly" hint="пусто = нет">
                      <NumberInput
                        id="sheet-fly"
                        min={0}
                        value={model.draft.flySpeed}
                        onValueChange={(flySpeed) =>
                          model.setDraft((prev) => ({ ...prev, flySpeed }))
                        }
                      />
                    </Field>
                  </div>
                </Stack>
              </Panel>

              <EquipmentProficienciesPanel
                armor={model.draft.identity.armor}
                weapons={model.draft.identity.weapons}
                onChange={(patch) => {
                  let dropped = 0
                  model.setDraft((prev) => {
                    const nextArmor = patch.armor ?? prev.identity.armor
                    const nextWeapons = patch.weapons ?? prev.identity.weapons
                    let items = prev.inventory.items
                    // Drop armor/shield that the character can no longer wear.
                    if (patch.armor) {
                      items = items.map((item) => {
                        if (
                          item.equipped &&
                          item.armor_kind !== 'none' &&
                          !canWearArmor(item.armor_kind, nextArmor)
                        ) {
                          dropped += 1
                          return { ...item, equipped: false }
                        }
                        return item
                      })
                    }
                    return {
                      ...prev,
                      identity: {
                        ...prev.identity,
                        armor: nextArmor,
                        weapons: nextWeapons,
                      },
                      inventory: { ...prev.inventory, items },
                      weapons: syncAttacksHeldFromInventory(prev.weapons, items),
                    }
                  })
                  if (dropped > 0) {
                    model.onToast(
                      dropped === 1
                        ? 'Доспех снят — нет владения'
                        : `Снято без владения: ${dropped}`,
                    )
                  }
                }}
              />
              <LanguagesToolsPanel
                languages={model.draft.identity.languages}
                tools={model.draft.identity.tools}
                onChange={(patch) => model.patchIdentity(patch)}
              />
            </div>
          </aside>
        </>
      ) : null}

      <SheetDialogsRolls model={model} />
      <SheetDialogsResources model={model} />
      <SheetDialogsSetup model={model} />
    </div>
  )
}
