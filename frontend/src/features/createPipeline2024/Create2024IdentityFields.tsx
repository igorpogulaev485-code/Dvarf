/**
 * Name + gender (+ dice) for the 2024 «Вид» setup. Same naming engine as the 2014
 * RaceSetupDialog (`generateRaceName`); the dice needs a gender, like there.
 */

import { useEffect, useMemo, useState } from 'react'
import { Button, Field, Input, Stack, Text, ToggleChip } from '../../ui'
import type { CatalogEntry } from '../../shared/api/catalog'
import {
  CHARACTER_GENDER_LABELS,
  CHARACTER_GENDERS,
  parseCharacterGender,
} from '../../shared/dnd/characterGender'
import { generateRaceName, namingModesFor, preferredNamingModeId } from '../../shared/dnd/raceNaming'
import type { Create2024State } from './createPipeline2024Types'

/**
 * Catalog species slug → key of the curated naming tables (`elf__lfl` → `elf`,
 * `lorwyn-changeling` → `lorwyn_changeling`).
 *
 * Species with no dedicated table fall back to `GLOBAL_FANTASY_FALLBACK` (human-like names):
 * boggart, lupin, khoravar, faerie, flamekin, kithkin, lorwyn-changeling, rimekin.
 */
export function speciesNamingSlug(slug: string | null | undefined): string | null {
  const base = (slug ?? '').split('__')[0].trim().toLowerCase().replace(/-/g, '_')
  return base || null
}

type Props = {
  state: Pick<Create2024State, 'characterName' | 'gender' | 'speciesSlug'>
  speciesEntry: CatalogEntry | null
  patch: (next: Partial<Create2024State>) => void
}

export function Create2024IdentityFields({ state, speciesEntry, patch }: Props) {
  const namingContext = useMemo(() => {
    const slug = speciesNamingSlug(state.speciesSlug ?? speciesEntry?.slug)
    if (!slug) return null
    return { naming: speciesEntry?.data?.naming, slug, parentSlug: null }
  }, [state.speciesSlug, speciesEntry])

  const namingModes = useMemo(
    () => (namingContext ? namingModesFor(namingContext) : []),
    [namingContext],
  )
  const [modeId, setModeId] = useState<string | null>(null)

  useEffect(() => {
    if (namingModes.length === 0) {
      setModeId(null)
      return
    }
    const hinted = preferredNamingModeId(namingContext?.slug)
    setModeId((prev) => {
      if (hinted && namingModes.some((mode) => mode.id === hinted)) return hinted
      if (prev && namingModes.some((mode) => mode.id === prev)) return prev
      return namingModes[0]?.id ?? null
    })
  }, [namingModes, namingContext?.slug])

  const gender = parseCharacterGender(state.gender)
  const canGenerate = Boolean(gender && namingContext)

  function handleGenerateName() {
    if (!gender || !namingContext) return
    const generated = generateRaceName({
      gender,
      naming: namingContext.naming,
      slug: namingContext.slug,
      parentSlug: namingContext.parentSlug,
      modeId,
    })
    if (generated) patch({ characterName: generated.name })
  }

  return (
    <Stack gap={10} className="create-2024__identity">
      <Field label="Имя персонажа">
        <div className="create-2024__name-row">
          <Input
            value={state.characterName}
            onChange={(e) => patch({ characterName: e.target.value })}
            placeholder="Как зовут героя?"
            autoComplete="off"
            data-testid="p24-m03-name"
          />
          <Button
            variant="secondary"
            onClick={handleGenerateName}
            disabled={!canGenerate}
            aria-label="Сгенерировать имя"
            title={gender ? 'Сгенерировать имя' : 'Сначала укажите пол'}
            data-testid="p24-m03-name-generate"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3.5" y="3.5" width="17" height="17" rx="3.5" />
              <circle cx="8.5" cy="8.5" r="1.1" fill="currentColor" stroke="none" />
              <circle cx="15.5" cy="8.5" r="1.1" fill="currentColor" stroke="none" />
              <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
              <circle cx="8.5" cy="15.5" r="1.1" fill="currentColor" stroke="none" />
              <circle cx="15.5" cy="15.5" r="1.1" fill="currentColor" stroke="none" />
            </svg>
          </Button>
        </div>
      </Field>
      <div className="create-2024__gender" role="group" aria-label="Пол персонажа">
        {CHARACTER_GENDERS.map((g) => (
          <ToggleChip
            key={g}
            main={CHARACTER_GENDER_LABELS[g]}
            checked={gender === g}
            onChange={() => patch({ gender: gender === g ? null : g })}
            data-testid={`p24-m03-gender-${g}`}
          />
        ))}
      </div>
      {namingModes.length > 1 ? (
        <div className="create-2024__gender" role="group" aria-label="Стиль имени">
          {namingModes.map((mode) => (
            <ToggleChip
              key={mode.id}
              main={mode.labelRu}
              checked={modeId === mode.id}
              onChange={() => setModeId(mode.id)}
              data-testid={`p24-m03-name-mode-${mode.id}`}
            />
          ))}
        </div>
      ) : null}
      {!gender ? (
        <Text tone="muted" className="create-2024__note">
          Имя и пол нужны, чтобы продолжить. Пол задаёт, какие имена предложит кубик.
        </Text>
      ) : null}
    </Stack>
  )
}
