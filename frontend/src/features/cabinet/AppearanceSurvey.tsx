import { useEffect, useState } from 'react'
import { updateMe, type User } from '../../shared/api/auth'
import { ApiRequestError } from '../../shared/api/client'
import {
  ACCENT_OPTIONS,
  DARK_BACKGROUNDS,
  FONT_OPTIONS,
  LIGHT_BACKGROUNDS,
  applyAccountAppearance,
  normalizeAppearance,
  type AccountAppearance,
  type BackgroundId,
  type FontPairId,
  type SurfaceId,
  type ThemeId,
} from '../../shared/theme/accountAppearance'
import { Button, Dialog, Stack, Text } from '../../ui'

type AppearanceSurveyProps = {
  open: boolean
  user: User
  /** first — всплывашка при заходе. replay — из кабинета, сразу вопросы. */
  mode: 'first' | 'replay'
  onDismiss: () => void
  onSaved: (user: User) => void
}

const KIT_DEFAULT: AccountAppearance = {
  themeId: 'wis',
  surface: 'light-designer3',
  bgLight: 'parchment',
  bgDark: 'ink',
  fontPair: 'antiqua',
  abilityColors: 'identity',
}

const WORLDS: { id: string; label: string; light: BackgroundId; dark: BackgroundId }[] = [
  { id: 'chronicle', label: 'Летопись (перья, свитки, чернильница)', light: 'parchment', dark: 'ink' },
  { id: 'travel', label: 'Странствия (карты, роза ветров, звёзды)', light: 'ivory', dark: 'night' },
  { id: 'home', label: 'Дом и дерево (лён, тепло, дубовый стол)', light: 'linen', dark: 'oak' },
  { id: 'dungeon', label: 'Подземелье (камень, руны, сланец)', light: 'stone', dark: 'slate' },
  { id: 'forest', label: 'Чаща (мох, смола, лесная тишина)', light: 'moss', dark: 'tar' },
  { id: 'skip', label: 'Не важно', light: 'parchment', dark: 'ink' },
]

function clone(value: AccountAppearance): AccountAppearance {
  return { ...value }
}

export function AppearanceSurvey({ open, user, mode, onDismiss, onSaved }: AppearanceSurveyProps) {
  const initial = normalizeAppearance(user)
  const [step, setStep] = useState(mode === 'replay' ? 1 : 0)
  const [draft, setDraft] = useState<AccountAppearance>(() => clone(initial))
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const start = normalizeAppearance(user)
    setDraft(clone(start))
    setStep(mode === 'replay' ? 1 : 0)
    setError(null)
  }, [open, mode, user])

  function preview(next: AccountAppearance) {
    setDraft(next)
    applyAccountAppearance(next)
  }

  function restoreAndClose() {
    applyAccountAppearance(initial)
    onDismiss()
  }

  function applyTime(kind: 'day' | 'night' | 'skip') {
    const surface: SurfaceId = kind === 'night' ? 'leaf-classic' : 'light-designer3'
    const next = clone(draft)
    next.surface = surface
    if (kind !== 'night') next.bgLight = next.bgLight || 'parchment'
    if (kind === 'night') next.bgDark = next.bgDark || 'ink'
    preview(next)
  }

  function applyWorld(world: (typeof WORLDS)[number]) {
    const next = clone(draft)
    if (next.surface === 'leaf-classic') next.bgDark = world.dark
    else next.bgLight = world.light
    preview(next)
  }

  async function save() {
    setPending(true)
    setError(null)
    try {
      const updated = await updateMe({
        theme_id: draft.themeId,
        ability_colors: draft.abilityColors,
        surface: draft.surface,
        bg_light: draft.bgLight,
        bg_dark: draft.bgDark,
        font_pair: draft.fontPair,
      })
      applyAccountAppearance(normalizeAppearance(updated))
      onSaved(updated)
    } catch (err) {
      applyAccountAppearance(initial)
      setError(err instanceof ApiRequestError ? err.message : 'Не удалось сохранить оформление')
    } finally {
      setPending(false)
    }
  }

  function restart() {
    preview(clone(KIT_DEFAULT))
    setStep(1)
  }

  const question = step >= 1 && step <= 5
  const title =
    step === 0 ? 'Настроить сайт под тебя или потом?' : step === 6 ? 'Твоё оформление' : `Вопрос ${step} из 5`

  const dark = draft.surface === 'leaf-classic'
  const backgrounds = dark ? DARK_BACKGROUNDS : LIGHT_BACKGROUNDS
  const activeBg = dark ? draft.bgDark : draft.bgLight

  return (
    <Dialog
      open={open}
      title={title}
      size="wide"
      primaryLabel="Дальше"
      showActions={false}
      showClose
      onPrimary={() => undefined}
      onDismiss={restoreAndClose}
      closeOnBackdrop
    >
      <Stack gap={12}>
        {step === 0 ? (
          <>
            <Text>Можно сразу собрать вид под тебя. Потом всё так же правится в кабинете.</Text>
            <div className="shell-survey__actions">
              <Button type="button" onClick={() => setStep(1)}>
                Настроить
              </Button>
              <Button type="button" variant="secondary" onClick={restoreAndClose}>
                Потом
              </Button>
            </div>
          </>
        ) : null}

        {step === 1 ? (
          <Question
            legend="Когда обычно садишься за стол?"
            hint="Свет вокруг меняет, как читается лист."
            options={[
              ['day', 'Днём, при свете окна'],
              ['night', 'Вечером, при лампе или ночью'],
              ['skip', 'Не важно'],
            ]}
            onPick={(id) => applyTime(id as 'day' | 'night' | 'skip')}
          />
        ) : null}

        {step === 2 ? (
          <Question
            legend="Какой мир тебе ближе?"
            hint="Подложка — бумага стола; карточки и поля остаются сплошными."
            options={WORLDS.map((world) => [world.id, world.label])}
            onPick={(id) => {
              const world = WORLDS.find((item) => item.id === id)
              if (world) applyWorld(world)
            }}
          />
        ) : null}

        {step === 3 ? (
          <Question
            legend="Каким пигментом писать заголовки и кнопки?"
            options={[
              ...ACCENT_OPTIONS.map((item) => [item.id, item.name] as [string, string]),
              ['skip', 'Не важно'],
            ]}
            onPick={(id) => {
              const themeId: ThemeId = id === 'skip' ? 'wis' : (id as ThemeId)
              preview({ ...draft, themeId })
            }}
          />
        ) : null}

        {step === 4 ? (
          <Question
            legend="Как должна звучать строка на листе?"
            hint="Заголовки могут быть характерными; цифры и меню остаются на читаемом гротеске."
            options={[
              ['antiqua', 'Как в печатной книге'],
              ['grotesque', 'Ясно и просто, без засечек'],
              ['ustav', 'Как старый славянский устав'],
              ['scribe', 'Как наборная книга заклинаний'],
              ['script', 'Как живая подпись на полях'],
              ['tabular', 'Как графы таблицы, цифры в ряд'],
              ['skip', 'Не важно'],
            ]}
            onPick={(id) => {
              const fontPair: FontPairId = id === 'skip' ? 'antiqua' : (id as FontPairId)
              preview({ ...draft, fontPair })
            }}
          />
        ) : null}

        {step === 5 ? (
          <Question
            legend="Как раскрасить шесть характеристик?"
            options={[
              ['identity', 'Каждая своим цветом'],
              ['theme', 'Все цветом темы'],
              ['skip', 'Не важно'],
            ]}
            onPick={(id) =>
              preview({
                ...draft,
                abilityColors: id === 'theme' ? 'theme' : 'identity',
              })
            }
          />
        ) : null}

        {step === 6 ? (
          <Stack gap={10}>
            <Text tone="muted">Тема, подложка, акцент, шрифт и цвета характеристик. Сохранится только по кнопке «Сохранить».</Text>
            <div className="shell-survey__actions">
              <Button type="button" variant={!dark ? 'primary' : 'secondary'} onClick={() => preview({ ...draft, surface: 'light-designer3' })}>
                Светлая
              </Button>
              <Button type="button" variant={dark ? 'primary' : 'secondary'} onClick={() => preview({ ...draft, surface: 'leaf-classic' })}>
                Тёмная
              </Button>
            </div>
            <div className="shell-survey__options" role="radiogroup" aria-label="Подложка">
              {backgrounds.map((bg) => (
                <button
                  key={bg.id}
                  type="button"
                  className={`sheet-chip${activeBg === bg.id ? ' is-on' : ''}`}
                  onClick={() =>
                    preview(dark ? { ...draft, bgDark: bg.id } : { ...draft, bgLight: bg.id })
                  }
                >
                  {bg.name}
                </button>
              ))}
            </div>
            <div className="shell-survey__options">
              {ACCENT_OPTIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`sheet-chip${draft.themeId === item.id ? ' is-on' : ''}`}
                  onClick={() => preview({ ...draft, themeId: item.id })}
                >
                  {item.name}
                </button>
              ))}
            </div>
            <div className="shell-survey__options">
              {FONT_OPTIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`sheet-chip${draft.fontPair === item.id ? ' is-on' : ''}`}
                  onClick={() => preview({ ...draft, fontPair: item.id })}
                >
                  {item.name}
                </button>
              ))}
            </div>
            <div className="cabinet-ability-preview" aria-hidden="true">
              {ACCENT_OPTIONS.map((item) => (
                <span key={item.id} className="abil-block cabinet-ability-preview__chip" data-abil={item.id}>
                  {item.ability}
                </span>
              ))}
            </div>
          </Stack>
        ) : null}

        {error ? <Text tone="danger">{error}</Text> : null}

        {question || step === 6 ? (
          <div className="shell-survey__actions">
            <Button type="button" variant="ghost" onClick={() => setStep((value) => Math.max(mode === 'replay' ? 1 : 0, value - 1))}>
              Назад
            </Button>
            {question ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (step === 1) applyTime('skip')
                  if (step === 2) applyWorld(WORLDS[WORLDS.length - 1])
                  if (step === 3) preview({ ...draft, themeId: 'wis' })
                  if (step === 4) preview({ ...draft, fontPair: 'antiqua' })
                  if (step === 5) preview({ ...draft, abilityColors: 'identity' })
                  setStep((value) => value + 1)
                }}
              >
                Пропустить
              </Button>
            ) : null}
            {question ? (
              <Button type="button" onClick={() => setStep((value) => value + 1)}>
                {step === 5 ? 'К итогу' : 'Дальше'}
              </Button>
            ) : null}
            {step === 6 ? (
              <>
                <Button type="button" variant="secondary" onClick={restart} disabled={pending}>
                  Пройти заново
                </Button>
                <Button type="button" onClick={() => void save()} disabled={pending}>
                  {pending ? 'Сохраняем…' : 'Сохранить'}
                </Button>
              </>
            ) : null}
          </div>
        ) : null}
      </Stack>
    </Dialog>
  )
}

function Question({
  legend,
  hint,
  options,
  onPick,
}: {
  legend: string
  hint?: string
  options: readonly (readonly [string, string])[]
  onPick: (id: string) => void
}) {
  return (
    <Stack gap={8}>
      <Text as="h3">{legend}</Text>
      {hint ? <Text tone="muted">{hint}</Text> : null}
      <div className="shell-survey__options" role="radiogroup" aria-label={legend}>
        {options.map(([id, label]) => (
          <button key={id} type="button" className="sheet-chip" onClick={() => onPick(id)}>
            {label}
          </button>
        ))}
      </div>
    </Stack>
  )
}
