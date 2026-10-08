import { useEffect, useMemo, useRef, useState } from 'react'
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
  identityExtrasToSheet,
  readIdentityExtras,
  type IdentityExtras,
} from '../characters/identity'
import { readInventory } from '../characters/inventory'
import { readTextBlocks } from '../characters/textBlocks'
import type { WeaponAttack } from '../characters/AttacksPanel'
import { ABILITY_KEYS, type AbilityKey } from '../characters/sheetTypes'
import {
  backgroundGrantNeedsSetupDialog,
  backgroundVariantsForRoot,
  emptyBackgroundPicks,
  isBackgroundComboboxRoot,
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
import { listCatalogEntries, type CatalogEntry } from '../../shared/api/catalog'
import { asRecord } from '../characters/sheetTypes'
import { Button, Stack, Text } from '../../ui'
import type { ClassicPatch } from './fromApi'
import { cloneSheet } from './fromApi'

type Props = {
  character: CharacterDetail
  onPatch: (patch: ClassicPatch) => void
  onToast?: (message: string) => void
}

function readSheetWeapons(sheet: Record<string, unknown>): WeaponAttack[] {
  const raw = sheet.weapons
  if (!Array.isArray(raw)) return []
  return raw.map((item, index) => {
    const row = asRecord(item)
    const ability = ABILITY_KEYS.includes(row.ability as AbilityKey)
      ? (row.ability as AbilityKey)
      : 'str'
    return {
      id: typeof row.id === 'string' ? row.id : `weapon-${index}`,
      name: typeof row.name === 'string' ? row.name : '',
      catalog_id: typeof row.catalog_id === 'string' ? row.catalog_id : null,
      source_kind:
        row.source_kind === 'weapon' ||
        row.source_kind === 'artifact' ||
        row.source_kind === 'custom' ||
        row.source_kind === 'race'
          ? row.source_kind
          : 'weapon',
      ability,
      is_proficient: Boolean(row.is_proficient),
      damage: typeof row.damage === 'string' ? row.damage : '',
      damage_type: typeof row.damage_type === 'string' ? row.damage_type : '',
    }
  })
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
      row.tools.map((item) => item.trim().toLowerCase()).filter(Boolean),
    ),
    ...(raceGrant?.tools ?? []).map((item) => item.trim().toLowerCase()),
  ])
  const protectedLanguages = new Set(
    (raceGrant?.languages ?? []).map((item) => item.toLowerCase()),
  )
  const protectedWeaponExtras = new Set([
    ...classGrants.flatMap((row) =>
      (row.weaponExtras ?? []).map((item) => item.trim().toLowerCase()),
    ),
    ...subclassGrants.flatMap((row) =>
      (row.weaponExtras ?? []).map((item) => item.trim().toLowerCase()),
    ),
    ...(raceGrant?.weaponNames ?? []).map((item) => item.toLowerCase()),
  ])

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
    weapons: readSheetWeapons(sheet),
    backgroundGrant,
    protectedSkills,
    protectedTools,
    protectedLanguages,
    protectedWeaponExtras,
  }
}

function writeSliceToSheet(
  character: CharacterDetail,
  slice: BackgroundGrantDraftSlice,
  backgroundCatalogId: string | null,
): Record<string, unknown> {
  const sheet = cloneSheet(asRecord(character.sheet))
  const extras = identityExtrasToSheet(slice.identity)
  const identity = asRecord(sheet.identity)
  Object.assign(identity, extras.identityPatch)
  identity.background = slice.identity.background.trim() || null
  identity.background_catalog_id = backgroundCatalogId
  sheet.identity = identity

  const proficiency = asRecord(sheet.proficiency)
  proficiency.armor = extras.proficiencyPatch.armor
  proficiency.weapons = extras.proficiencyPatch.weapons
  proficiency.languages = extras.proficiencyPatch.languages
  proficiency.tools = extras.proficiencyPatch.tools
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
  sheet.weapons = slice.weapons
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
    root: CatalogEntry
    variants: CatalogEntry[]
  } | null>(null)
  const [homebrewOpen, setHomebrewOpen] = useState(false)
  const catalogCacheRef = useRef<CatalogEntry[] | null>(null)
  const edition = character.rules_edition as RulesEdition

  useEffect(() => {
    let active = true
    catalogCacheRef.current = null
    listCatalogEntries({ kind: 'background', edition })
      .then((rows) => {
        if (!active) return
        catalogCacheRef.current = rows
      })
      .catch(() => {
        /* retry on select */
      })
    return () => {
      active = false
    }
  }, [edition, character.id])

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
      Object.keys(grant.choiceTablePicks).length
        ? `таблицы ${Object.keys(grant.choiceTablePicks).length}`
        : null,
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

  async function requestOrApply(selected: CatalogEntry) {
    if (!isBackgroundComboboxRoot(selected)) {
      onToast?.(
        `«${selected.name_ru}» — выбери корневую предысторию; вариант будет в попапе`,
      )
      return
    }

    let allBackgrounds = catalogCacheRef.current
    if (!allBackgrounds) {
      try {
        allBackgrounds = await listCatalogEntries({
          kind: 'background',
          edition,
        })
        catalogCacheRef.current = allBackgrounds
      } catch {
        onToast?.('Не удалось загрузить справочник предысторий — попробуй ещё раз')
        return
      }
    }

    const variants = backgroundVariantsForRoot(selected, allBackgrounds)
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
    if (variants.length > 0 || backgroundGrantNeedsSetupDialog(def)) {
      setPicker({ root: selected, variants })
      return
    }
    commit({ selected, picks: emptyBackgroundPicks(), def })
  }

  function clearBackground() {
    const cleared = revokeBackgroundGrant(sliceFromCharacter(character))
    const sheet = writeSliceToSheet(
      character,
      {
        ...cleared,
        identity: { ...cleared.identity, background: '' },
      },
      null,
    )
    onPatch({ sheet })
    onToast?.('Предыстория снята')
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
            edition={edition}
            value={currentName}
            placeholder="Выбери предысторию — гранты применятся автоматически"
            filterEntry={(entry) => isBackgroundComboboxRoot(entry)}
            onChange={(_value, selected) => {
              if (!selected) {
                // Free-typing does not write to the blank; only catalog / clear / homebrew.
                return
              }
              void requestOrApply(selected)
            }}
          />
          {currentName ? (
            <Button type="button" variant="secondary" onClick={clearBackground}>
              Снять
            </Button>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            onClick={() => setHomebrewOpen(true)}
          >
            Хомбрю
          </Button>
        </div>
        <Text tone="muted">
          Корень в списке; вариант (шпион, гладиатор…), таблицы и снаряжение — в попапе.
          Поле «Предыстория» на бланке заполняется отсюда (без ручного ввода).
        </Text>
      </Stack>

      <BackgroundSetupDialog
        open={picker != null}
        root={picker?.root ?? null}
        variants={picker?.variants ?? []}
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
