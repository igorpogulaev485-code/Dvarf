import { useMemo, useState } from 'react'
import { CatalogCombobox } from '../catalog'
import {
  BackgroundSetupDialog,
  HomebrewBackgroundDialog,
} from '../characters/BackgroundSetupDialog'
import {
  applyBackgroundGrantToDraft,
  readAppliedBackgroundGrant,
  revokeBackgroundGrant,
  type BackgroundGrantDraftSlice,
} from '../characters/backgroundEffects'
import {
  readIdentityExtras,
  type IdentityExtras,
} from '../characters/identity'
import { readInventory } from '../characters/inventory'
import { readTextBlocks } from '../characters/textBlocks'
import {
  backgroundGrantNeedsSetupDialog,
  emptyBackgroundPicks,
  resolveBackgroundGrantDef,
  type BackgroundGrantDef,
  type BackgroundGrantPicks,
} from '../../shared/dnd/backgroundGrants'
import {
  readAppliedClassGrants,
} from '../characters/classEffects'
import { readAppliedSubclassGrants } from '../characters/subclassEffects'
import { readAppliedRaceGrant } from '../../shared/dnd/raceGrants'
import type { CharacterDetail, RulesEdition } from '../../shared/api/characters'
import type { CatalogEntry } from '../../shared/api/catalog'
import { asRecord } from '../characters/sheetTypes'
import { Button, Stack, Text } from '../../ui'
import type { ClassicPatch } from './fromApi'
import { cloneSheet } from './fromApi'

type Props = {
  character: CharacterDetail
  onPatch: (patch: ClassicPatch) => void
  onToast?: (message: string) => void
}

function sliceFromCharacter(character: CharacterDetail): BackgroundGrantDraftSlice {
  const sheet = asRecord(character.sheet)
  const identity = readIdentityExtras(sheet)
  const classGrants = readAppliedClassGrants(sheet.class_grants)
  const subclassGrants = readAppliedSubclassGrants(sheet.subclass_grants)
  const raceGrant = readAppliedRaceGrant(sheet.race_grant)
  const backgroundGrant = readAppliedBackgroundGrant(sheet.background_grant)

  const protectedSkills = new Set([
    ...classGrants.flatMap((row) => row.skills),
    ...subclassGrants.flatMap((row) => row.skills),
    ...(raceGrant?.skills ?? []),
  ])
  const protectedTools = new Set([
    ...classGrants.flatMap((row) =>
      row.tools.map((item) => item.trim().toLowerCase()).filter(Boolean),
    ),
    ...subclassGrants.flatMap((row) =>
      [...row.tools, ...row.weaponExtras]
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    ),
    ...(raceGrant?.tools ?? []).map((item) => item.trim().toLowerCase()),
  ])
  const protectedLanguages = new Set(
    (raceGrant?.languages ?? []).map((item) => item.toLowerCase()),
  )

  return {
    identity,
    skills: Object.fromEntries(
      Object.entries(asRecord(sheet.skills)).map(([key, raw]) => {
        const block = asRecord(raw)
        return [
          key,
          {
            is_proficient: Boolean(block.is_proficient),
            is_expertise: Boolean(block.is_expertise),
          },
        ]
      }),
    ),
    inventory: readInventory(sheet),
    textBlocks: readTextBlocks(sheet),
    backgroundGrant,
    protectedSkills,
    protectedTools,
    protectedLanguages,
  }
}

function writeSliceToSheet(
  character: CharacterDetail,
  slice: BackgroundGrantDraftSlice,
  backgroundCatalogId: string | null,
): Record<string, unknown> {
  const sheet = cloneSheet(asRecord(character.sheet))
  const identity = asRecord(sheet.identity)
  identity.background = slice.identity.background.trim() || null
  identity.background_catalog_id = backgroundCatalogId
  sheet.identity = identity

  const proficiency = asRecord(sheet.proficiency)
  proficiency.languages = slice.identity.languages
  proficiency.tools = slice.identity.tools
  sheet.proficiency = proficiency

  const skills = asRecord(sheet.skills)
  for (const [key, state] of Object.entries(slice.skills)) {
    const block = asRecord(skills[key])
    block.is_proficient = state.is_proficient
    block.is_expertise = state.is_expertise
    skills[key] = block
  }
  sheet.skills = skills

  sheet.inventory = {
    coins: slice.inventory.coins,
    items: slice.inventory.items,
  }
  sheet.background_grant = slice.backgroundGrant

  const textBlocks = asRecord(sheet.text_blocks)
  for (const block of slice.textBlocks) {
    textBlocks[block.key] = {
      ...asRecord(textBlocks[block.key]),
      value: block.value,
      default_label: block.defaultLabel,
      custom_label: block.customLabel,
      is_hidden: block.isHidden,
      is_custom: block.isCustom,
      resource_id: block.resourceId,
    }
  }
  sheet.text_blocks = textBlocks

  return sheet
}

export function ClassicBackgroundPicker({ character, onPatch, onToast }: Props) {
  const [picker, setPicker] = useState<{
    entry: CatalogEntry
    def: BackgroundGrantDef
  } | null>(null)
  const [homebrewOpen, setHomebrewOpen] = useState(false)

  const currentName = useMemo(() => {
    const identity = asRecord(asRecord(character.sheet).identity)
    return typeof identity.background === 'string' ? identity.background : ''
  }, [character.sheet])

  const grantSummary = useMemo(() => {
    const grant = readAppliedBackgroundGrant(asRecord(character.sheet).background_grant)
    if (!grant) return null
    const bits = [
      grant.skills.length ? `навыки ${grant.skills.length}` : null,
      grant.tools.length ? `инстр. ${grant.tools.length}` : null,
      grant.languages.length ? `языки ${grant.languages.length}` : null,
      grant.featureNameRu ? grant.featureNameRu : null,
    ]
    return bits.filter(Boolean).join(' · ')
  }, [character.sheet])

  function commit(input: {
    selected: CatalogEntry
    picks: BackgroundGrantPicks
    def?: BackgroundGrantDef | null
  }) {
    const applied = applyBackgroundGrantToDraft({
      draft: sliceFromCharacter(character),
      selected: input.selected,
      picks: input.picks,
      def: input.def,
    })
    if (!applied) {
      onToast?.('Не удалось применить предысторию — проверь развилки')
      return
    }
    const sheet = writeSliceToSheet(
      character,
      applied.draft,
      input.selected.id,
    )
    onPatch({ sheet })
    onToast?.(`Предыстория «${input.selected.name_ru}»: ${applied.summary}`)
  }

  function requestOrApply(selected: CatalogEntry) {
    const def = resolveBackgroundGrantDef({
      backgroundName: selected.name_ru,
      catalogSlug: selected.slug,
      catalogData: selected.data,
      nameRu: selected.name_ru,
    })
    if (!def) {
      const sheet = cloneSheet(asRecord(character.sheet))
      const identity = asRecord(sheet.identity)
      identity.background = selected.name_ru
      identity.background_catalog_id = selected.id
      sheet.identity = identity
      onPatch({ sheet })
      onToast?.(`«${selected.name_ru}» без пакета — только название`)
      return
    }
    if (backgroundGrantNeedsSetupDialog(def)) {
      setPicker({ entry: selected, def })
      return
    }
    commit({ selected, picks: emptyBackgroundPicks(), def })
  }

  function applyHomebrew(name: string) {
    const cleared = revokeBackgroundGrant(sliceFromCharacter(character))
    const nextIdentity: IdentityExtras = { ...cleared.identity, background: name }
    const sheet = writeSliceToSheet(
      character,
      { ...cleared, identity: nextIdentity },
      null,
    )
    onPatch({ sheet })
    onToast?.(`Хомбрю-предыстория «${name}»`)
  }

  return (
    <div className="classic-background-picker no-print">
      <Stack gap={8}>
        <Text>
          <strong>Предыстория из справочника</strong>
          {grantSummary ? (
            <span style={{ marginLeft: 8, opacity: 0.8 }}>— {grantSummary}</span>
          ) : null}
        </Text>
        <div className="classic-background-picker__row">
          <CatalogCombobox
            id="classic-background"
            kind="background"
            edition={character.rules_edition as RulesEdition}
            value={currentName}
            placeholder="Начните вводить предысторию"
            onChange={(value, selected) => {
              if (!selected) {
                const cleared = revokeBackgroundGrant(sliceFromCharacter(character))
                const sheet = writeSliceToSheet(
                  character,
                  {
                    ...cleared,
                    identity: { ...cleared.identity, background: value },
                  },
                  null,
                )
                onPatch({ sheet })
                return
              }
              requestOrApply(selected)
            }}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => setHomebrewOpen(true)}
          >
            Хомбрю
          </Button>
        </div>
        <Text tone="muted">
          Те же гранты, что на цифровом листе: навыки, языки, инструменты, снаряжение и умение.
          Попадут в инвентарь и блок «Умения».
        </Text>
      </Stack>

      <BackgroundSetupDialog
        open={picker != null}
        entry={picker?.entry ?? null}
        def={picker?.def ?? null}
        onClose={() => setPicker(null)}
        onConfirm={(result) => {
          commit({
            selected: result.entry,
            picks: result.picks,
            def: result.def,
          })
          setPicker(null)
        }}
      />

      <HomebrewBackgroundDialog
        open={homebrewOpen}
        initialName={currentName}
        onClose={() => setHomebrewOpen(false)}
        onConfirm={(name) => {
          applyHomebrew(name)
          setHomebrewOpen(false)
        }}
      />
    </div>
  )
}
