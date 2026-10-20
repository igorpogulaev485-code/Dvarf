/**
 * Internal visual review for onboarding O0+O1 (no auth / API).
 * Route: /dev/onboarding-preview
 */
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  CharacterReadyDialog,
  HelpDrawer,
  OnboardingChecklist,
  PanelHelpButton,
  SheetTour,
  StepHint,
  WelcomeDialog,
  EMPTY_CHARACTERS,
} from '../features/onboarding'
import type { CreatePipelineStepId } from '../features/createPipeline/createPipelineTypes'
import { Button, EmptyState, Panel, Stack, Text } from '../ui'

type Scene =
  | 'welcome'
  | 'empty'
  | 'ready'
  | 'tour'
  | 'help'
  | 'panels'
  | 'create'
  | 'checklist'

const SCENES: Array<{ id: Scene; label: string }> = [
  { id: 'welcome', label: '1. Welcome' },
  { id: 'empty', label: '2. Empty список' },
  { id: 'create', label: '3. Create hint' },
  { id: 'ready', label: '4. Персонаж готов' },
  { id: 'tour', label: '5. Sheet tour' },
  { id: 'panels', label: '6. Кнопки ?' },
  { id: 'help', label: '7. Справка' },
  { id: 'checklist', label: '8. Чеклист' },
]

const SCENE_IDS = new Set(SCENES.map((s) => s.id))

export function OnboardingPreviewPage() {
  const [params, setParams] = useSearchParams()
  const sceneFromUrl = params.get('scene')
  const clean = params.get('clean') === '1'
  const scene: Scene =
    sceneFromUrl && SCENE_IDS.has(sceneFromUrl as Scene)
      ? (sceneFromUrl as Scene)
      : 'welcome'
  const [createStep, setCreateStep] = useState<CreatePipelineStepId>('race')
  const [helpOpenOverride, setHelpOpenOverride] = useState(true)

  const setScene = (next: Scene) => {
    const nextParams: Record<string, string> = {}
    if (next !== 'welcome') nextParams.scene = next
    if (clean) nextParams.clean = '1'
    setParams(nextParams)
  }

  return (
    <main className={`page page--app onboarding-preview${clean ? ' onboarding-preview--clean' : ''}`}>
      <Stack gap={16}>
        {clean ? null : (
          <>
            <header>
              <Text as="h1">Онбординг — превью UI</Text>
              <Text tone="muted">
                Реальные компоненты O0+O1 без API. Для скринов и решения по визуалу.
              </Text>
            </header>

            <nav className="onboarding-preview__nav" aria-label="Сцены">
              {SCENES.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className={`sheet-chip${scene === row.id ? ' is-on' : ''}`}
                  onClick={() => setScene(row.id)}
                >
                  {row.label}
                </button>
              ))}
            </nav>
          </>
        )}

        {scene === 'welcome' ? (
          <section className="onboarding-preview__stage" data-shot="welcome">
            <Text tone="muted">Сцена: первый вход после логина</Text>
            <div className="onboarding-preview__fake-page">
              <Text as="h2">Мои персонажи</Text>
              <Text tone="muted">список за диалогом…</Text>
            </div>
            <WelcomeDialog open onChoose={() => setScene('empty')} />
          </section>
        ) : null}

        {scene === 'empty' ? (
          <section className="onboarding-preview__stage" data-shot="empty">
            <EmptyState
              title={EMPTY_CHARACTERS.title}
              description={EMPTY_CHARACTERS.description}
              action={
                <Stack gap={8}>
                  <Button>Создать персонажа</Button>
                  <Button variant="ghost" onClick={() => setScene('help')}>
                    {EMPTY_CHARACTERS.howItWorks}
                  </Button>
                </Stack>
              }
            />
          </section>
        ) : null}

        {scene === 'create' ? (
          <section className="onboarding-preview__stage" data-shot="create">
            <Text as="h2">Создание персонажа</Text>
            <div className="chip-row" style={{ marginBottom: 12 }}>
              {(
                [
                  'race',
                  'feat',
                  'background',
                  'class',
                  'abilities',
                  'leveling',
                ] as CreatePipelineStepId[]
              ).map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`sheet-chip${createStep === id ? ' is-on' : ''}`}
                  onClick={() => setCreateStep(id)}
                >
                  {id}
                </button>
              ))}
            </div>
            <StepHint step={createStep} />
          </section>
        ) : null}

        {scene === 'ready' ? (
          <section className="onboarding-preview__stage" data-shot="ready">
            <div className="onboarding-preview__fake-page">
              <Text as="h2">Лист персонажа</Text>
              <Text tone="muted">открывается после моста…</Text>
            </div>
            <CharacterReadyDialog
              open
              onOpenWithTour={() => setScene('tour')}
              onOpenSkipTour={() => setScene('panels')}
            />
          </section>
        ) : null}

        {scene === 'tour' ? (
          <section className="onboarding-preview__stage" data-shot="tour">
            <div className="onboarding-preview__fake-desk">
              <div
                className="onboarding-preview__anchor onboarding-preview__anchor--lg"
                data-onboarding="combat-header"
              >
                Шапка боя · КД · хиты · инициатива
              </div>
              <div
                className="onboarding-preview__anchor"
                data-onboarding="desk-modes"
              >
                Бой · Исследование · Общение
              </div>
              <div className="onboarding-preview__anchor" data-onboarding="abilities">
                СИЛ ЛОВ ТЕЛ ИНТ МДР ХАР + навыки
              </div>
              <div className="onboarding-preview__anchor" data-onboarding="actions">
                Атаки / заклинания
              </div>
              <div data-onboarding="checklist">
                <OnboardingChecklist compact />
              </div>
            </div>
            <SheetTour open onComplete={() => setScene('panels')} onSkip={() => setScene('panels')} />
          </section>
        ) : null}

        {scene === 'panels' ? (
          <section className="onboarding-preview__stage" data-shot="panels">
            <Stack gap={12}>
              <Panel
                title="Атаки"
                titleAside={<PanelHelpButton panelId="attacks" forceOpen />}
              >
                <Text tone="muted">Справа «?» — what / зачем / если не знаешь</Text>
              </Panel>
              <Panel title="Заклинания" titleAside={<PanelHelpButton panelId="spells" />}>
                <Text tone="muted">То же для остальных панелей листа</Text>
              </Panel>
              <Panel title="Инвентарь" titleAside={<PanelHelpButton panelId="inventory" />}>
                <Text tone="muted">КД от доспеха</Text>
              </Panel>
            </Stack>
          </section>
        ) : null}

        {scene === 'help' ? (
          <section className="onboarding-preview__stage" data-shot="help">
            <Text tone="muted">Сцена: кнопка «Справка» в шапке</Text>
            <Button onClick={() => setHelpOpenOverride(true)}>Справка</Button>
            <HelpDrawer
              open={helpOpenOverride}
              onClose={() => {
                setHelpOpenOverride(false)
                setScene('checklist')
              }}
            />
          </section>
        ) : null}

        {scene === 'checklist' ? (
          <section className="onboarding-preview__stage" data-shot="checklist">
            <div style={{ maxWidth: 320 }}>
              <OnboardingChecklist />
            </div>
          </section>
        ) : null}
      </Stack>
    </main>
  )
}
