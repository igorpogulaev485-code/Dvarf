import { useEffect, useState } from 'react'
import type {
  EncounterGenerateDifficulty,
  EncounterGenerateResult,
  EncounterMonsterOption,
} from '../../shared/api/lobbies'
import { Button, Dialog, Field, NumberInput, Stack, Text } from '../../ui'
import {
  ENCOUNTER_DIFFICULTIES,
  ENCOUNTER_ENVIRONMENTS,
  ENCOUNTER_THEMES,
  type EncounterDifficultyId,
} from './encounterGeneratorMeta'

type Props = {
  open: boolean
  busy?: boolean
  result: EncounterGenerateResult | null
  onClose: () => void
  onInvalidate?: () => void
  onGenerate: (payload: {
    difficulty: EncounterGenerateDifficulty
    environments: string[]
    theme_ids: string[]
    similar: boolean
    waves: number
  }) => void
  onDeploy: (picks: {
    boss: EncounterMonsterOption
    pack: EncounterMonsterOption
    packCount: number
    waveIndex: number
  }) => void
}

/**
 * B8 draft: умный генератор — сложность → волны → локация → темы → предложения → на стол.
 */
export function EncounterGenerateDialog({
  open,
  busy = false,
  result,
  onClose,
  onInvalidate,
  onGenerate,
  onDeploy,
}: Props) {
  const [difficulty, setDifficulty] = useState<EncounterDifficultyId>('medium')
  const [waves, setWaves] = useState<number | null>(1)
  const [envs, setEnvs] = useState<Set<string>>(() => new Set(['любая']))
  const [themes, setThemes] = useState<Set<string>>(() => new Set())
  const [similar, setSimilar] = useState(false)
  const [waveIndex, setWaveIndex] = useState(0)
  const [bossSlug, setBossSlug] = useState<string | null>(null)
  const [packSlug, setPackSlug] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setDifficulty('medium')
    setWaves(1)
    setEnvs(new Set(['любая']))
    setThemes(new Set())
    setSimilar(false)
    setWaveIndex(0)
    setBossSlug(null)
    setPackSlug(null)
  }, [open])

  useEffect(() => {
    if (!result?.waves.length) {
      setBossSlug(null)
      setPackSlug(null)
      setWaveIndex(0)
      return
    }
    const idx = Math.min(waveIndex, result.waves.length - 1)
    setWaveIndex(idx)
    const wave = result.waves[idx]
    setBossSlug(wave.boss.options[0]?.slug ?? null)
    setPackSlug(wave.pack.options[0]?.slug ?? null)
  }, [result, waveIndex])

  const filterKey = `${difficulty}|${waves}|${[...envs].sort().join(',')}|${[
    ...themes,
  ]
    .sort()
    .join(',')}|${similar}`
  const [pinnedKey, setPinnedKey] = useState<string | null>(null)
  useEffect(() => {
    if (!result) {
      setPinnedKey(null)
      return
    }
    if (pinnedKey == null) setPinnedKey(filterKey)
  }, [result, filterKey, pinnedKey])
  useEffect(() => {
    if (!result || pinnedKey == null) return
    if (filterKey !== pinnedKey) onInvalidate?.()
  }, [filterKey, pinnedKey, result, onInvalidate])

  const wave = result?.waves[waveIndex] ?? null
  const boss =
    wave?.boss.options.find((o) => o.slug === bossSlug) ?? wave?.boss.options[0] ?? null
  const pack =
    wave?.pack.options.find((o) => o.slug === packSlug) ?? wave?.pack.options[0] ?? null
  const packCount = wave?.pack.suggested_count ?? 0
  const canGenerate = themes.size > 0 && (waves ?? 0) >= 1
  const canDeploy = Boolean(result && boss && pack && packCount >= 1)

  function toggleTheme(id: string) {
    setThemes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleEnv(name: string) {
    setEnvs((prev) => {
      if (name === 'любая') return new Set(['любая'])
      const next = new Set(prev)
      next.delete('любая')
      if (next.has(name)) next.delete(name)
      else next.add(name)
      if (next.size === 0) return new Set(['любая'])
      return next
    })
  }

  const envPayload = [...envs].filter((e) => e !== 'любая')

  return (
    <Dialog
      open={open}
      title="Генератор боя"
      size="wide"
      busy={busy}
      secondaryLabel="Закрыть"
      onSecondary={onClose}
      primaryLabel={canDeploy ? 'На стол' : 'Подобрать'}
      primaryDisabled={canDeploy ? !canDeploy || busy : !canGenerate || busy}
      onPrimary={() => {
        if (canDeploy && boss && pack) {
          onDeploy({
            boss,
            pack,
            packCount,
            waveIndex: wave?.wave_index ?? 1,
          })
          return
        }
        if (!canGenerate) return
        onGenerate({
          difficulty,
          environments: envPayload,
          theme_ids: [...themes],
          similar,
          waves: Math.max(1, Math.min(8, waves ?? 1)),
        })
      }}
    >
      <Stack gap={14}>
        <Text tone="muted">
          Бюджет по листам за столом. Смертельный — смертельный. Draft B8.
        </Text>

        <Stack gap={8}>
          <Text as="h4" className="session-xp-recipients__title">
            Сложность
          </Text>
          <div className="session-gen-chips">
            {ENCOUNTER_DIFFICULTIES.map((d) => (
              <button
                key={d.id}
                type="button"
                className={`session-gen-chip${difficulty === d.id ? ' is-on' : ''}`}
                disabled={busy}
                onClick={() => setDifficulty(d.id)}
              >
                {d.label}
              </button>
            ))}
          </div>
        </Stack>

        <Field label="Волн (1 = сразу)">
          <NumberInput
            value={waves}
            min={1}
            max={8}
            disabled={busy}
            onChange={setWaves}
          />
        </Field>

        <Stack gap={8}>
          <Text as="h4" className="session-xp-recipients__title">
            Локация
          </Text>
          <div className="session-gen-chips">
            {ENCOUNTER_ENVIRONMENTS.map((env) => (
              <button
                key={env}
                type="button"
                className={`session-gen-chip${envs.has(env) ? ' is-on' : ''}`}
                disabled={busy}
                onClick={() => toggleEnv(env)}
              >
                {env}
              </button>
            ))}
          </div>
        </Stack>

        <Stack gap={8}>
          <Text as="h4" className="session-xp-recipients__title">
            Тема (мультивыбор)
          </Text>
          <div className="session-gen-chips">
            {ENCOUNTER_THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`session-gen-chip${themes.has(t.id) ? ' is-on' : ''}`}
                disabled={busy}
                onClick={() => toggleTheme(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <label className="session-feed-filter">
            <input
              type="checkbox"
              checked={similar}
              disabled={busy}
              onChange={(e) => setSimilar(e.target.checked)}
            />
            С похожими (семейство)
          </label>
        </Stack>

        {result ? (
          <Stack gap={10}>
            <Text>
              Бюджет <strong>{result.budget_total}</strong> XP · сила пати{' '}
              <strong>×{result.party_power.toFixed(2)}</strong>
              {result.anti_air_ok ? '' : ' · летающие отфильтрованы'}
            </Text>
            {result.notes.length > 0 ? (
              <Text tone="muted">{result.notes.join(' · ')}</Text>
            ) : null}

            {result.waves.length > 1 ? (
              <div className="session-gen-chips">
                {result.waves.map((w, i) => (
                  <button
                    key={w.wave_index}
                    type="button"
                    className={`session-gen-chip${waveIndex === i ? ' is-on' : ''}`}
                    disabled={busy}
                    onClick={() => setWaveIndex(i)}
                  >
                    Волна {w.wave_index}
                  </button>
                ))}
              </div>
            ) : null}

            {wave ? (
              <>
                <RolePicker
                  title={`Босс · ~${wave.budget_xp} XP волны`}
                  options={wave.boss.options}
                  selectedSlug={boss?.slug ?? null}
                  onSelect={setBossSlug}
                  busy={busy}
                />
                <RolePicker
                  title={`Пачка ×${packCount}`}
                  options={wave.pack.options}
                  selectedSlug={pack?.slug ?? null}
                  onSelect={setPackSlug}
                  busy={busy}
                  countHint={packCount}
                />
              </>
            ) : (
              <Text tone="muted">Пустой пул — смени темы или локацию.</Text>
            )}

            <Button
              type="button"
              variant="secondary"
              disabled={busy || !canGenerate}
              onClick={() =>
                onGenerate({
                  difficulty,
                  environments: envPayload,
                  theme_ids: [...themes],
                  similar,
                  waves: Math.max(1, Math.min(8, waves ?? 1)),
                })
              }
            >
              Перекинуть
            </Button>
          </Stack>
        ) : null}
      </Stack>
    </Dialog>
  )
}

function RolePicker({
  title,
  options,
  selectedSlug,
  onSelect,
  busy,
  countHint,
}: {
  title: string
  options: EncounterMonsterOption[]
  selectedSlug: string | null
  onSelect: (slug: string) => void
  busy: boolean
  countHint?: number
}) {
  if (options.length === 0) {
    return (
      <Stack gap={6}>
        <Text as="h4" className="session-xp-recipients__title">
          {title}
        </Text>
        <Text tone="muted">Нет кандидатов</Text>
      </Stack>
    )
  }
  return (
    <Stack gap={6}>
      <Text as="h4" className="session-xp-recipients__title">
        {title}
      </Text>
      <ul className="session-gen-options">
        {options.map((o) => {
          const on = o.slug === selectedSlug
          return (
            <li key={o.slug}>
              <button
                type="button"
                className={`session-gen-option${on ? ' is-on' : ''}`}
                disabled={busy}
                onClick={() => onSelect(o.slug)}
              >
                <strong>
                  {o.name_ru}
                  {countHint && countHint > 1 && on ? ` ×${countHint}` : ''}
                </strong>
                <span>
                  CR {o.cr} · {o.xp} XP
                  {o.fly ? ' · ✈' : ''}
                  {o.subtype ? ` · ${o.subtype}` : ''}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </Stack>
  )
}
