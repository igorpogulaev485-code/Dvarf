import { useEffect, useMemo, useState } from 'react'
import type {
  EncounterComposition,
  EncounterEnemyCasters,
  EncounterFlyers,
  EncounterGeneratePayload,
  EncounterGenerateResult,
  EncounterMonsterOption,
  EncounterWaveProfile,
} from '../../shared/api/lobbies'
import { Button, Dialog, Field, NumberInput, Stack, Text } from '../../ui'
import {
  ENCOUNTER_COMPOSITIONS,
  ENCOUNTER_DIFFICULTIES,
  ENCOUNTER_ENEMY_CASTERS,
  ENCOUNTER_ENVIRONMENTS,
  ENCOUNTER_FLYERS,
  ENCOUNTER_THEMES,
  ENCOUNTER_WAVE_PROFILES,
  type EncounterDifficultyId,
} from './encounterGeneratorMeta'

const THEME_GROUPS: Array<{ id: 'type' | 'tribe' | 'race'; title: string }> = [
  { id: 'type', title: 'Тип' },
  { id: 'tribe', title: 'Племя / фракция' },
  { id: 'race', title: 'Раса гуманоида' },
]

export type EncounterDeployPick = {
  waveIndex: number
  boss: EncounterMonsterOption | null
  pack: EncounterMonsterOption | null
  packCount: number
}

type Props = {
  open: boolean
  busy?: boolean
  result: EncounterGenerateResult | null
  onClose: () => void
  onInvalidate?: () => void
  onGenerate: (payload: EncounterGeneratePayload) => void
  /** Высадка всех выбранных волн через существующие S-02 эндпоинты. */
  onDeploy: (picks: EncounterDeployPick[]) => void
}

/**
 * G-01: генератор боя на живом столе (доработка B8, не второй диалог).
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
  const [composition, setComposition] = useState<EncounterComposition>('mixed')
  const [waveProfile, setWaveProfile] = useState<EncounterWaveProfile>('even')
  const [flyers, setFlyers] = useState<EncounterFlyers>('auto')
  const [enemyCasters, setEnemyCasters] = useState<EncounterEnemyCasters>('any')
  const [envs, setEnvs] = useState<Set<string>>(() => new Set(['любая']))
  const [themes, setThemes] = useState<Set<string>>(() => new Set())
  const [similar, setSimilar] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [overrideOn, setOverrideOn] = useState(false)
  const [overrideCount, setOverrideCount] = useState<number | null>(4)
  const [overrideLevel, setOverrideLevel] = useState<number | null>(5)
  const [waveIndex, setWaveIndex] = useState(0)
  const [bossByWave, setBossByWave] = useState<Record<number, string | null>>({})
  const [packByWave, setPackByWave] = useState<Record<number, string | null>>({})

  useEffect(() => {
    if (!open) return
    setDifficulty('medium')
    setWaves(1)
    setComposition('mixed')
    setWaveProfile('even')
    setFlyers('auto')
    setEnemyCasters('any')
    setEnvs(new Set(['любая']))
    setThemes(new Set())
    setSimilar(false)
    setShowMore(false)
    setOverrideOn(false)
    setOverrideCount(4)
    setOverrideLevel(5)
    setWaveIndex(0)
    setBossByWave({})
    setPackByWave({})
  }, [open])

  const themesByGroup = useMemo(() => {
    return {
      type: ENCOUNTER_THEMES.filter((t) => t.group === 'type'),
      tribe: ENCOUNTER_THEMES.filter((t) => t.group === 'tribe'),
      race: ENCOUNTER_THEMES.filter((t) => t.group === 'race'),
    }
  }, [])

  useEffect(() => {
    if (!result?.waves.length) {
      setBossByWave({})
      setPackByWave({})
      setWaveIndex(0)
      return
    }
    const idx = Math.min(waveIndex, result.waves.length - 1)
    setWaveIndex(idx)
    setBossByWave((prev) => {
      const next = { ...prev }
      for (const w of result.waves) {
        if (next[w.wave_index] == null) {
          next[w.wave_index] = w.boss?.options[0]?.slug ?? null
        }
      }
      return next
    })
    setPackByWave((prev) => {
      const next = { ...prev }
      for (const w of result.waves) {
        if (next[w.wave_index] == null) {
          next[w.wave_index] = w.pack?.options[0]?.slug ?? null
        }
      }
      return next
    })
  }, [result, waveIndex])

  const filterKey = [
    difficulty,
    waves,
    composition,
    waveProfile,
    flyers,
    enemyCasters,
    [...envs].sort().join(','),
    [...themes].sort().join(','),
    similar,
    overrideOn,
    overrideCount,
    overrideLevel,
  ].join('|')
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
  const bossSlug = wave ? bossByWave[wave.wave_index] ?? null : null
  const packSlug = wave ? packByWave[wave.wave_index] ?? null : null
  const boss =
    wave?.boss?.options.find((o) => o.slug === bossSlug) ?? wave?.boss?.options[0] ?? null
  const pack =
    wave?.pack?.options.find((o) => o.slug === packSlug) ?? wave?.pack?.options[0] ?? null
  const packCount = wave?.pack?.suggested_count ?? 0

  const canGenerate = themes.size > 0 && (waves ?? 0) >= 1
  const deployPicks: EncounterDeployPick[] = useMemo(() => {
    if (!result?.waves.length) return []
    return result.waves.map((w) => {
      const bSlug = bossByWave[w.wave_index]
      const pSlug = packByWave[w.wave_index]
      const b =
        w.boss?.options.find((o) => o.slug === bSlug) ?? w.boss?.options[0] ?? null
      const p =
        w.pack?.options.find((o) => o.slug === pSlug) ?? w.pack?.options[0] ?? null
      return {
        waveIndex: w.wave_index,
        boss: b,
        pack: p,
        packCount: w.pack?.suggested_count ?? 0,
      }
    })
  }, [result, bossByWave, packByWave])

  const canDeploy = Boolean(
    result &&
      deployPicks.some(
        (p) => p.boss || (p.pack && p.packCount >= 1),
      ),
  )

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

  function buildPayload(): EncounterGeneratePayload {
    return {
      difficulty,
      environments: envPayload,
      theme_ids: [...themes],
      similar,
      waves: Math.max(1, Math.min(8, waves ?? 1)),
      composition,
      wave_profile: waveProfile,
      flyers,
      enemy_casters: enemyCasters,
      party_count_override: overrideOn ? Math.max(1, overrideCount ?? 1) : null,
      party_level_override: overrideOn ? Math.max(1, overrideLevel ?? 1) : null,
    }
  }

  const noteLabels: Record<string, string> = {
    anti_air_weak: 'дальний слабый',
    flyers_auto_suppressed: 'летуны скрыты (авто)',
    flyers_weak_ranged_warning: 'летуны при слабом дальнем — с предупреждением',
    flyers_wanted: 'летуны запрошены',
    flyers_none: 'без летунов',
    empty_pool: 'пустой пул',
    no_casters_in_pool: 'заклинателей в пуле нет',
    hp_fallback: 'HP по норме уровня',
  }

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
        if (canDeploy) {
          onDeploy(deployPicks)
          return
        }
        if (!canGenerate) return
        onGenerate(buildPayload())
      }}
    >
      <Stack gap={14}>
        <Stack gap={4}>
          <Text as="h4" className="session-xp-recipients__title">
            Партия
          </Text>
          {result?.party ? (
            <>
              <Text>
                <strong>{result.party.member_count}</strong>
                {result.party.levels.length
                  ? ` героев, ур. ${result.party.levels.join('–')}`
                  : ' героев'}{' '}
                · сила <strong>×{result.party.party_power.toFixed(2)}</strong> · дальний:{' '}
                <strong>{result.party.ranged_band_label}</strong>
                {result.party.override_used ? ' · ручной расчёт' : ''}
              </Text>
              {result.party.homebrew_applied.length > 0 ? (
                <Text tone="muted">
                  Учли: {result.party.homebrew_applied.join(', ')}
                </Text>
              ) : (
                <Text tone="muted">Домашние правила не включены или не влияют на бюджет</Text>
              )}
            </>
          ) : (
            <Text tone="muted">
              После подбора — число, уровни, сила ×, дальний и учтённые домашние правила с
              листов. Ступень — ярлык модели, не сырой DMG.
            </Text>
          )}
        </Stack>

        <Stack gap={8}>
          <Text as="h4" className="session-xp-recipients__title">
            Ступень
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

        <Stack gap={8}>
          <Text as="h4" className="session-xp-recipients__title">
            Стиль
          </Text>
          <div className="session-gen-chips">
            {ENCOUNTER_COMPOSITIONS.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`session-gen-chip${composition === c.id ? ' is-on' : ''}`}
                disabled={busy}
                onClick={() => setComposition(c.id)}
              >
                {c.label}
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
            onValueChange={(v) => setWaves(v ?? 1)}
          />
        </Field>

        {(waves ?? 1) > 1 ? (
          <Stack gap={8}>
            <Text as="h4" className="session-xp-recipients__title">
              Профиль волн
            </Text>
            <div className="session-gen-chips">
              {ENCOUNTER_WAVE_PROFILES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`session-gen-chip${waveProfile === p.id ? ' is-on' : ''}`}
                  disabled={busy}
                  onClick={() => setWaveProfile(p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </Stack>
        ) : null}

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

        <Stack gap={10}>
          <Text as="h4" className="session-xp-recipients__title">
            Тема (мультивыбор)
          </Text>
          {THEME_GROUPS.map((g) => (
            <Stack key={g.id} gap={6}>
              <Text tone="muted">{g.title}</Text>
              <div className="session-gen-chips">
                {themesByGroup[g.id].map((t) => (
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
            </Stack>
          ))}
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

        <Stack gap={8}>
          <Text as="h4" className="session-xp-recipients__title">
            Летуны
          </Text>
          <div className="session-gen-chips">
            {ENCOUNTER_FLYERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`session-gen-chip${flyers === f.id ? ' is-on' : ''}`}
                disabled={busy}
                onClick={() => setFlyers(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </Stack>

        <Stack gap={8}>
          <Text as="h4" className="session-xp-recipients__title">
            Заклинатели врагов
          </Text>
          <div className="session-gen-chips">
            {ENCOUNTER_ENEMY_CASTERS.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`session-gen-chip${enemyCasters === c.id ? ' is-on' : ''}`}
                disabled={busy}
                onClick={() => setEnemyCasters(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </Stack>

        <div>
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => setShowMore((v) => !v)}
          >
            {showMore ? 'Скрыть ещё' : 'Ещё'}
          </Button>
        </div>
        {showMore ? (
          <Stack gap={8}>
            <label className="session-feed-filter">
              <input
                type="checkbox"
                checked={overrideOn}
                disabled={busy}
                onChange={(e) => setOverrideOn(e.target.checked)}
              />
              Считать как N героев уровня L
            </label>
            {overrideOn ? (
              <div className="session-gen-actions">
                <Field label="Героев">
                  <NumberInput
                    value={overrideCount}
                    min={1}
                    max={12}
                    disabled={busy}
                    onValueChange={(v) => setOverrideCount(v ?? 1)}
                  />
                </Field>
                <Field label="Уровень">
                  <NumberInput
                    value={overrideLevel}
                    min={1}
                    max={20}
                    disabled={busy}
                    onValueChange={(v) => setOverrideLevel(v ?? 1)}
                  />
                </Field>
              </div>
            ) : null}
          </Stack>
        ) : null}

        {result ? (
          <Stack gap={10}>
            <Text>
              Бюджет <strong>{result.budget_total}</strong> XP · сила{' '}
              <strong>×{result.party_power.toFixed(2)}</strong>
              {result.flyers_warning
                ? ' · ⚠ летуны при слабом дальнем'
                : result.anti_air_ok
                  ? ''
                  : ' · дальний слабый'}
            </Text>
            {result.notes.length > 0 ? (
              <Text tone="muted">
                {result.notes.map((n) => noteLabels[n] || n).join(' · ')}
              </Text>
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
                    Волна {w.wave_index} · {w.budget_xp} XP
                  </button>
                ))}
              </div>
            ) : null}

            {wave ? (
              <>
                {wave.boss ? (
                  <RolePicker
                    title={`Босс · 2–3 кандидата · ~${wave.budget_xp} XP волны`}
                    options={wave.boss.options}
                    selectedSlug={boss?.slug ?? null}
                    onSelect={(slug) =>
                      setBossByWave((prev) => ({ ...prev, [wave.wave_index]: slug }))
                    }
                    busy={busy}
                  />
                ) : null}
                {wave.pack ? (
                  <RolePicker
                    title={`Пачка · 2–3 кандидата · ×${packCount || '—'}`}
                    options={wave.pack.options}
                    selectedSlug={pack?.slug ?? null}
                    onSelect={(slug) =>
                      setPackByWave((prev) => ({ ...prev, [wave.wave_index]: slug }))
                    }
                    busy={busy}
                    countHint={packCount}
                  />
                ) : null}
                {!wave.boss && !wave.pack ? (
                  <Text tone="muted">Пустой пул — смени темы или локацию.</Text>
                ) : null}
              </>
            ) : (
              <Text tone="muted">Пустой пул — смени темы или локацию.</Text>
            )}

            <div className="session-gen-actions">
              <Button
                type="button"
                variant="secondary"
                disabled={busy || !canGenerate}
                onClick={() => onGenerate(buildPayload())}
              >
                Перекинуть
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled
                title="Страница «Бой» в вики появится в W-03"
              >
                В вики
              </Button>
            </div>
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
                  {o.caster ? ' · ✦' : ''}
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
