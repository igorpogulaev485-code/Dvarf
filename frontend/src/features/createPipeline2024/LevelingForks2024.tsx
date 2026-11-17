/**
 * P24-M03c: per-level forks panel for the 2024 create wizard «Прокачка».
 * Reuses LevelingStep shell patterns; 2024 multiclass / ASI / subclass / stubs.
 */

import { useMemo, useState } from 'react'
import { Button, Field, NumberInput, SegmentedControl, Stack, Text } from '../../ui'
import type { CatalogEntry } from '../../shared/api/catalog'
import {
  addMulticlassLevel,
  createClassLevel,
  reduceClassLevel,
  totalCharacterLevel,
  type ClassLevelEntry,
} from '../../shared/dnd/classLevels'
import {
  checkMulticlassPrerequisites2024,
  classCatalog2024,
  computeProgression2024,
  MULTICLASS_PROFICIENCIES_2024,
  normalizeClassSlug2024,
} from '../../shared/dnd/edition2024Classes'
import {
  isPhb2024CreateSubclass,
  SUBCLASS_CATALOG_2024,
} from '../../shared/dnd/edition2024Subclasses'
import {
  epicBoonLevelForClassSlug,
  featLevelsForClassSlug,
  subclassLevelForClassSlug,
} from '../../shared/dnd/pendingFeatureChoices2024'
import {
  BLESSED_STRIKES_DIVINE_STRIKE,
  BLESSED_STRIKES_MIN_LEVEL_2024,
  BLESSED_STRIKES_NAME_RU,
  BLESSED_STRIKES_POTENT_SPELLCASTING,
  DIVINE_STRIKE_NAME_RU,
  POTENT_SPELLCASTING_NAME_RU,
  type BlessedStrikesPick2024,
} from '../../shared/dnd/cleric2024Features'
import {
  ELEMENTAL_FURY_MIN_LEVEL_2024,
  ELEMENTAL_FURY_NAME_RU,
  ELEMENTAL_FURY_POTENT_SPELLCASTING,
  ELEMENTAL_FURY_PRIMAL_STRIKE,
  POTENT_SPELLCASTING_NAME_RU as DRUID_POTENT_SPELLCASTING_NAME_RU,
  PRIMAL_STRIKE_NAME_RU,
  type ElementalFuryPick2024,
} from '../../shared/dnd/druid2024Features'
import { hitDieForClass, type AbilityScores } from '../../shared/dnd/multiclassRules'
import { hitDieSides, type HitDie } from '../../shared/dnd/hitDice'
import { WEAPON_MASTERY_CLASS_RULES } from '../../shared/dnd/weaponMastery'
import type { HpLevelChoice } from '../createPipeline/createPipelineTypes'
import { ensureHpChoices } from '../createPipeline/LevelingStep'

const CASTER_SLUGS = new Set([
  'bard',
  'cleric',
  'druid',
  'sorcerer',
  'wizard',
  'paladin',
  'ranger',
  'artificer',
  'warlock',
])
const THIRD_CASTER_SUBS = new Set([
  'fighter__eldritch-knight',
  'rogue__arcane-trickster',
])

export type AsiChoice2024 = {
  classSlug: string
  classLevel: number
  kind: 'asi_plus2' | 'asi_plus1_plus1' | 'feat' | 'epic_boon' | 'stub'
  abilities?: Partial<AbilityScores>
  featSlug?: string | null
  noteRu?: string | null
}

export type LevelingForks2024Props = {
  classes: ClassLevelEntry[]
  classCatalog: CatalogEntry[]
  abilities: AbilityScores
  hpChoices: HpLevelChoice[]
  primaryClassEntryId: string
  subclassByEntryId: Record<string, string | null>
  asiChoices: AsiChoice2024[]
  fightingStyleNameRu?: string | null
  weaponMasteryNamesRu?: string[]
  onClassesChange: (classes: ClassLevelEntry[]) => void
  onHpChoicesChange: (choices: HpLevelChoice[]) => void
  onSubclassChange: (classEntryId: string, subclassSlug: string | null) => void
  onAsiChoicesChange: (choices: AsiChoice2024[]) => void
  onOpenSpells: () => void
  onOpenFork: (classEntryId: string, classLevel: number, kind: string) => void
  /** Cleric 2024 Blessed Strikes pick (required from cleric level 7). */
  blessedStrikesPick?: BlessedStrikesPick2024 | null
  onBlessedStrikesChange?: (pick: BlessedStrikesPick2024) => void
  /** Druid 2024 Ярость стихий pick (required from druid level 7). */
  elementalFuryPick?: ElementalFuryPick2024 | null
  onElementalFuryChange?: (pick: ElementalFuryPick2024) => void
}

function averageFace(die: HitDie): number {
  return Math.floor(hitDieSides(die) / 2) + 1
}

function formatSlots(slots: Record<string, number>): string {
  const parts: string[] = []
  for (let level = 1; level <= 9; level += 1) {
    const max = slots[String(level)] ?? 0
    if (max > 0) parts.push(`${level}×${max}`)
  }
  return parts.length ? parts.join(' · ') : 'нет'
}

export function LevelingForks2024({
  classes,
  classCatalog,
  abilities,
  hpChoices,
  primaryClassEntryId,
  subclassByEntryId,
  asiChoices,
  fightingStyleNameRu = null,
  weaponMasteryNamesRu = [],
  onClassesChange,
  onHpChoicesChange,
  onSubclassChange,
  onAsiChoicesChange,
  onOpenSpells,
  onOpenFork,
  blessedStrikesPick = null,
  onBlessedStrikesChange,
  elementalFuryPick = null,
  onElementalFuryChange,
}: LevelingForks2024Props) {
  const [mcOpen, setMcOpen] = useState(false)
  const [cascadeWarn, setCascadeWarn] = useState<{
    classId: string
    nextLevel: number
    dependents: string[]
  } | null>(null)

  const totalLevel = totalCharacterLevel(classes)

  const progression = useMemo(() => {
    return computeProgression2024({
      classes,
      subclassSlugByEntryId: subclassByEntryId,
      abilities,
    })
  }, [abilities, classes, subclassByEntryId])

  const mcOptions = useMemo(() => {
    const currentNames = classes.map((row) => row.name)
    const currentSlugs = new Set(
      classes
        .map((row) => normalizeClassSlug2024(row.catalog_id) || normalizeClassSlug2024(row.name))
        .filter(Boolean),
    )
    return classCatalog
      .filter((entry) => {
        // Only base classes — never subclasses (kind/parent/slug with __).
        if (entry.kind && entry.kind !== 'class') return false
        if (entry.parent_id) return false
        const slug = String(entry.slug || '')
        if (slug.includes('__')) return false
        const norm = normalizeClassSlug2024(slug) || normalizeClassSlug2024(entry.name_ru)
        if (!norm) return false
        if (currentSlugs.has(norm)) return false
        return true
      })
      .map((entry) => {
        const check = checkMulticlassPrerequisites2024({
          currentClasses: currentNames,
          newClass: entry.slug || entry.name_ru,
          abilities,
        })
        const slug = normalizeClassSlug2024(entry.slug) || normalizeClassSlug2024(entry.name_ru)
        const grants = slug ? MULTICLASS_PROFICIENCIES_2024[slug] : null
        return { entry, ok: check.ok, detail: check.reasonRu, grants, slug }
      })
      .sort(
        (a, b) =>
          Number(b.ok) - Number(a.ok) || a.entry.name_ru.localeCompare(b.entry.name_ru, 'ru'),
      )
  }, [abilities, classCatalog, classes])

  function commitClasses(next: ClassLevelEntry[]) {
    onClassesChange(next)
    onHpChoicesChange(ensureHpChoices(next, hpChoices))
  }

  function setClassLevel(classId: string, level: number) {
    const row = classes.find((item) => item.id === classId)
    if (!row) return
    const clamped = Math.max(0, Math.min(20, Math.floor(level)))
    if (clamped < row.level) {
      // Cascade: dropping a level that later classes depend on (order after this row).
      const idx = classes.findIndex((item) => item.id === classId)
      const dependents = classes.slice(idx + 1).filter((item) => item.level > 0)
      if (dependents.length && clamped < row.level) {
        setCascadeWarn({
          classId,
          nextLevel: clamped,
          dependents: dependents.map((d) => d.name || 'класс'),
        })
        return
      }
    }
    applyClassLevel(classId, clamped)
  }

  function applyClassLevel(classId: string, clamped: number) {
    let next = classes.map((row) =>
      row.id === classId ? { ...row, level: Math.max(1, clamped) } : row,
    )
    if (clamped <= 0) {
      if (classes.length === 1) {
        next = classes.map((row) => (row.id === classId ? { ...row, level: 1 } : row))
      } else {
        next = reduceClassLevel(classes, classId)
      }
    }
    // Drop ASI / subclass picks above new level.
    const row = next.find((item) => item.id === classId)
    const slug = row ? normalizeClassSlug2024(row.catalog_id) || normalizeClassSlug2024(row.name) : null
    const newLevel = row?.level ?? 1
    onAsiChoicesChange(
      asiChoices.filter(
        (a) =>
          !(
            slug &&
            a.classSlug === slug &&
            a.classLevel > newLevel
          ),
      ),
    )
    if (slug && newLevel < subclassLevelForClassSlug(slug)) {
      onSubclassChange(classId, null)
    }
    commitClasses(next)
  }

  function addMulticlass(entry: CatalogEntry) {
    const check = checkMulticlassPrerequisites2024({
      currentClasses: classes.map((row) => row.name),
      newClass: entry.slug || entry.name_ru,
      abilities,
    })
    if (!check.ok) return
    const next = addMulticlassLevel(classes, {
      name: entry.name_ru,
      catalog_id: entry.id,
    }).map((row) =>
      row.name.trim().toLowerCase() === entry.name_ru.trim().toLowerCase() && !row.catalog_id
        ? { ...row, catalog_id: entry.id }
        : row,
    )
    commitClasses(next)
    setMcOpen(false)
  }

  function patchHp(key: string, patch: Partial<HpLevelChoice>) {
    onHpChoicesChange(hpChoices.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  function rollDie(die: HitDie): number {
    return 1 + Math.floor(Math.random() * hitDieSides(die))
  }

  function forksFor(row: ClassLevelEntry, isPrimary: boolean) {
    const slug = normalizeClassSlug2024(row.catalog_id) || normalizeClassSlug2024(row.name)
    if (!slug) return [] as Array<{ level: number; kind: string; label: string; stub?: boolean; detail?: string }>
    const out: Array<{
      level: number
      kind: string
      label: string
      stub?: boolean
      detail?: string
    }> = []
    const subGate = subclassLevelForClassSlug(slug)
    const masteryRule = WEAPON_MASTERY_CLASS_RULES[slug]
    for (let lv = 1; lv <= row.level; lv += 1) {
      if (lv === 1 && isPrimary) {
        if (slug === 'fighter' || slug === 'paladin' || slug === 'ranger') {
          out.push({
            level: 1,
            kind: 'fighting_style',
            label: 'Боевой стиль',
            detail: fightingStyleNameRu || 'Выбран на шаге «Класс»',
          })
        }
        if (masteryRule?.enabled) {
          const need = masteryRule.byLevel[1] ?? 0
          const names = weaponMasteryNamesRu.length
            ? weaponMasteryNamesRu.join(', ')
            : `выбрано на шаге «Класс» (${need})`
          out.push({
            level: 1,
            kind: 'weapon_mastery',
            label: `Мастерство оружия (${need})`,
            detail: names,
          })
        }
      }
      if (lv === subGate) {
        out.push({
          level: lv,
          kind: 'subclass',
          label: subclassByEntryId[row.id] ? 'Подкласс выбран' : `Подкласс (с ${subGate} ур.)`,
        })
      }
      if (featLevelsForClassSlug(slug).includes(lv)) {
        const picked = asiChoices.find((a) => a.classSlug === slug && a.classLevel === lv)
        out.push({
          level: lv,
          kind: 'asi',
          label: picked
            ? picked.kind === 'asi_plus2'
              ? 'Увеличение характеристик: +2 к одной'
              : picked.kind === 'asi_plus1_plus1'
                ? 'Увеличение характеристик: +1 к двум'
                : picked.kind === 'feat'
                  ? 'Черта'
                  : 'Увеличение характеристик / черта'
            : `Увеличение характеристик или черта (${lv} ур.)`,
        })
      }
      if (lv === epicBoonLevelForClassSlug(slug)) {
        out.push({ level: lv, kind: 'epic_boon', label: 'Эпический дар' })
      }
      // Features live under data.levels[n].features (PHB 2024 packs), not a flat data.features.
      const cat = classCatalog2024()[slug]
      const levelRows = Array.isArray(cat?.data?.levels)
        ? (cat!.data.levels as Array<{ level?: number; features?: unknown[] }>)
        : []
      const levelRow = levelRows.find((r) => Number(r?.level) === lv)
      const levelFeatures = Array.isArray(levelRow?.features) ? levelRow!.features! : []
      const packLoaded = levelRows.length > 0
      const coveredIds = new Set([
        'ability-score-improvement',
        'epic-boon',
        `${slug}-subclass`,
        'wizard-subclass',
        'sorcerer-subclass',
        'warlock-subclass',
        'cleric-subclass',
        'druid-subclass',
        'bard-subclass',
        'fighter-subclass',
        'rogue-subclass',
        'ranger-subclass',
        'paladin-subclass',
        'barbarian-subclass',
        'monk-subclass',
        'artificer-subclass',
      ])
      for (const raw of levelFeatures) {
        if (!raw || typeof raw !== 'object') continue
        const feat = raw as { id?: string; name_ru?: string }
        const id = String(feat.id || '')
        if (!id || coveredIds.has(id) || id.endsWith('-subclass')) continue
        if (lv === 1 && isPrimary) continue // L1 class features already on the Class step
        if (id === 'subclass-feature') {
          const subSlug = subclassByEntryId[row.id]
          if (subSlug) {
            const sub = SUBCLASS_CATALOG_2024[subSlug]
            const blocks =
              (sub?.data?.features as Array<{
                level?: number
                features?: Array<{ id?: string; name_ru?: string }>
              }>) || []
            const block = blocks.find((b) => Number(b?.level) === lv)
            const subFeats = Array.isArray(block?.features) ? block!.features! : []
            if (subFeats.length) {
              for (const sf of subFeats) {
                const name = String(sf?.name_ru || sf?.id || '').trim()
                if (!name) continue
                out.push({ level: lv, kind: 'subclass', label: name })
              }
              continue
            }
            out.push({
              level: lv,
              kind: 'subclass',
              label: `Умение подкласса (${lv} ур.)`,
            })
            continue
          }
          out.push({
            level: lv,
            kind: 'subclass',
            label: `Умение подкласса (${lv} ур.) — выберите подкласс`,
          })
          continue
        }
        const name = String(feat.name_ru || id).trim()
        if (!name) continue
        const kind =
          id === 'metamagic' || id.includes('invocation') || id === 'scholar'
            ? 'class_option'
            : 'class_feature'
        out.push({ level: lv, kind, label: name })
      }
      // Only stub when the class pack is missing entirely (no levels table).
      if (
        !packLoaded &&
        lv > 1 &&
        levelFeatures.length === 0 &&
        !featLevelsForClassSlug(slug).includes(lv) &&
        lv !== subGate &&
        [2, 5, 6, 7, 9, 10, 11, 13, 14, 15, 17, 18].includes(lv)
      ) {
        out.push({
          level: lv,
          kind: 'class_option',
          label: `Умения ${lv} уровня появятся с пакетом класса`,
          stub: true,
        })
      }
    }
    return out
  }

  const subclassesFor = (slug: string | null) => {
    if (!slug) return [] as CatalogEntry[]
    return classCatalog.filter((entry) => {
      const entrySlug = String(entry.slug || '')
      if (!isPhb2024CreateSubclass(entrySlug, entry.source)) return false
      const parent =
        String(entry.data?.parent_class || entry.data?.parent_slug || entry.data?.parent || '') ||
        (entrySlug.includes('__') ? entrySlug.split('__')[0] : '')
      return (
        normalizeClassSlug2024(parent) === slug ||
        entrySlug.startsWith(`${slug}__`) ||
        (Boolean(entry.parent_id) && entrySlug.includes(slug))
      )
    })
  }

  const hasSpellcasting = useMemo(() => {
    return classes.some((row) => {
      const slug = normalizeClassSlug2024(row.catalog_id) || normalizeClassSlug2024(row.name)
      if (slug && CASTER_SLUGS.has(slug)) return true
      const sub = subclassByEntryId[row.id]
      return Boolean(sub && THIRD_CASTER_SUBS.has(sub))
    })
  }, [classes, subclassByEntryId])

  return (
    <div data-testid="p24-m03c-leveling">
    <Stack gap={16}>
      <div>
        <Text as="h2">Прокачка</Text>
        <Text tone="muted">
          Уровни 1–20, хиты (среднее/бросок), развилки по уровням (подкласс, увеличение характеристик
          или черта, эпический дар, умения класса), мультикласс по требованиям 2024 и заклинания.
          Стартовые навыки и снаряжение основного класса уже выбраны на шаге «Класс».
        </Text>
        <Text tone="muted">
          Общий уровень: {totalLevel} · бонус мастерства +{Math.floor((Math.max(1, totalLevel) - 1) / 4) + 2}
        </Text>
      </div>

      {classes.map((row, index) => {
        const die = hitDieForClass({ className: row.name }) ?? 'd8'
        const isPrimary = row.id === primaryClassEntryId || index === 0
        const slug = normalizeClassSlug2024(row.catalog_id) || normalizeClassSlug2024(row.name)
        const forks = forksFor(row, isPrimary)
        const subclassList = subclassesFor(slug)
        return (
          <div key={row.id} className="create-pipeline__level-block" data-testid={`p24-m03c-class-${slug || row.id}`}>
            <div className="create-pipeline__level-head">
              <Text>
                {row.name || 'Класс'} {isPrimary ? '(основной)' : '(мультикласс)'}
              </Text>
              <Field label="Уровень">
                <NumberInput
                  value={row.level}
                  min={1}
                  max={20}
                  onValueChange={(value) => setClassLevel(row.id, value ?? 1)}
                  data-testid={`p24-m03c-level-${slug || row.id}`}
                />
              </Field>
            </div>

            {!isPrimary ? (
              <Text tone="muted" data-testid={`p24-m03c-mc-grants-${slug || row.id}`}>
                Владения при входе:{' '}
                {slug && MULTICLASS_PROFICIENCIES_2024[slug]
                  ? [
                      ...(MULTICLASS_PROFICIENCIES_2024[slug].armor || []).map((a) =>
                        a === 'light'
                          ? 'лёгкие доспехи'
                          : a === 'medium'
                            ? 'средние доспехи'
                            : a === 'shields'
                              ? 'щиты'
                              : a,
                      ),
                      ...(MULTICLASS_PROFICIENCIES_2024[slug].weapons || []).map((w) =>
                        w === 'simple' ? 'простое оружие' : w === 'martial' ? 'воинское оружие' : w,
                      ),
                      MULTICLASS_PROFICIENCIES_2024[slug].skills
                        ? `навыков: ${MULTICLASS_PROFICIENCIES_2024[slug].skills}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(', ') || 'нет дополнительных'
                  : 'по таблице мультикласса 2024'}
              </Text>
            ) : null}

            <div className="create-pipeline__level-actions">
              <Button
                variant="secondary"
                onClick={() => onOpenFork(row.id, row.level, 'overview')}
                data-testid={`p24-m03c-forks-${slug || row.id}`}
              >
                Развилки и умения
              </Button>
              {!isPrimary ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (classes.length <= 1) return
                    const next = classes.filter((item) => item.id !== row.id)
                    commitClasses(next.length ? next : [createClassLevel({ level: 1 })])
                  }}
                >
                  Убрать класс
                </Button>
              ) : null}
            </div>

            <div className="create-pipeline__hp-list" data-testid={`p24-m03c-hp-${slug || row.id}`}>
              {hpChoices
                .filter((choice) => choice.classEntryId === row.id)
                .map((choice) => {
                  const originMax = isPrimary && choice.classLevel === 1
                  return (
                    <div key={choice.key} className="create-pipeline__hp-row">
                      <Text>
                        {row.name} {choice.classLevel} · {die}
                      </Text>
                      {originMax ? (
                        <Text tone="muted">макс. кости</Text>
                      ) : (
                        <div className="create-pipeline__method-row">
                          <Button
                            variant={choice.mode === 'average' ? 'primary' : 'secondary'}
                            onClick={() => patchHp(choice.key, { mode: 'average', rolled: null })}
                          >
                            Среднее ({averageFace(die)})
                          </Button>
                          <Button
                            variant={choice.mode === 'roll' ? 'primary' : 'secondary'}
                            onClick={() => {
                              const rolled = rollDie(die)
                              patchHp(choice.key, { mode: 'roll', rolled })
                            }}
                          >
                            Бросок{choice.rolled != null ? `: ${choice.rolled}` : ''}
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>

            {forks.length ? (
              <div data-testid={`p24-m03c-fork-list-${slug || row.id}`}>
              <Stack gap={8}>
                <Text as="h3" className="create-pipeline__section-title">
                  Развилки по уровням
                </Text>
                {forks.map((fork, forkIndex) => (
                  <div
                    key={`${fork.kind}-${fork.level}-${forkIndex}`}
                    className="create-pipeline__hp-row"
                    data-testid={`p24-m03c-fork-${fork.kind}-${slug}-${fork.level}`}
                  >
                    <div>
                      <Text>
                        {fork.level} ур. · {fork.label}
                      </Text>
                      {fork.detail ? (
                        <Text tone="muted">{fork.detail}</Text>
                      ) : null}
                    </div>
                    {fork.kind === 'subclass' ? (
                      <div className="create-pipeline__method-row">
                        {subclassList.length ? (
                          subclassList.map((sub) => (
                            <Button
                              key={sub.id}
                              variant={
                                subclassByEntryId[row.id] === sub.slug ? 'primary' : 'secondary'
                              }
                              onClick={() => onSubclassChange(row.id, sub.slug)}
                              data-testid={`p24-m03c-subclass-${sub.slug}`}
                            >
                              {sub.name_ru}
                            </Button>
                          ))
                        ) : (
                          <Text tone="muted">Подклассы появятся с пакетом класса.</Text>
                        )}
                      </div>
                    ) : fork.kind === 'asi' ? (
                      <div className="create-pipeline__method-row">
                        <Button
                          variant="secondary"
                          onClick={() => {
                            const next: AsiChoice2024 = {
                              classSlug: slug || '',
                              classLevel: fork.level,
                              kind: 'asi_plus2',
                              abilities: {
                                [(slug === 'monk' || slug === 'rogue' || slug === 'ranger'
                                  ? 'dex'
                                  : slug === 'wizard' || slug === 'artificer'
                                    ? 'int'
                                    : slug === 'cleric' || slug === 'druid'
                                      ? 'wis'
                                      : slug === 'bard' ||
                                          slug === 'sorcerer' ||
                                          slug === 'warlock' ||
                                          slug === 'paladin'
                                        ? 'cha'
                                        : 'str') as keyof AbilityScores]: 2,
                              },
                            }
                            onAsiChoicesChange([
                              ...asiChoices.filter(
                                (a) => !(a.classSlug === slug && a.classLevel === fork.level),
                              ),
                              next,
                            ])
                          }}
                          data-testid={`p24-m03c-asi-plus2-${slug}-${fork.level}`}
                        >
                          +2 к одной или +1 к двум
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() =>
                            onAsiChoicesChange([
                              ...asiChoices.filter(
                                (a) => !(a.classSlug === slug && a.classLevel === fork.level),
                              ),
                              {
                                classSlug: slug || '',
                                classLevel: fork.level,
                                kind: 'feat',
                                noteRu: 'Черта общего вида — каталог дополнится пакетом класса',
                              },
                            ])
                          }
                          data-testid={`p24-m03c-asi-feat-${slug}-${fork.level}`}
                        >
                          Черта
                        </Button>
                      </div>
                    ) : fork.stub ? (
                      <Text tone="muted">Не блокирует создание</Text>
                    ) : fork.kind === 'fighting_style' || fork.kind === 'weapon_mastery' ? (
                      <Button
                        variant="ghost"
                        onClick={() => onOpenFork(row.id, fork.level, fork.kind)}
                      >
                        Изменить на шаге «Класс»
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        onClick={() => onOpenFork(row.id, fork.level, fork.kind)}
                      >
                        Открыть
                      </Button>
                    )}
                  </div>
                ))}
              </Stack>
              </div>
            ) : null}

            {slug === 'cleric' && isPrimary && row.level >= BLESSED_STRIKES_MIN_LEVEL_2024 ? (
              <div data-testid="p24-m02-blessed-strikes-pick">
                <Stack gap={8}>
                  <Text as="h3" className="create-pipeline__section-title">
                    {BLESSED_STRIKES_NAME_RU} (с {BLESSED_STRIKES_MIN_LEVEL_2024} ур.) — обязательный выбор
                  </Text>
                  <SegmentedControl<BlessedStrikesPick2024>
                    aria-label={BLESSED_STRIKES_NAME_RU}
                    options={[
                      {
                        id: BLESSED_STRIKES_DIVINE_STRIKE,
                        label: DIVINE_STRIKE_NAME_RU,
                        testId: `p24-m02-blessed-strikes-${BLESSED_STRIKES_DIVINE_STRIKE}`,
                      },
                      {
                        id: BLESSED_STRIKES_POTENT_SPELLCASTING,
                        label: POTENT_SPELLCASTING_NAME_RU,
                        testId: `p24-m02-blessed-strikes-${BLESSED_STRIKES_POTENT_SPELLCASTING}`,
                      },
                    ]}
                    value={(blessedStrikesPick ?? '') as BlessedStrikesPick2024}
                    onChange={(pick) => onBlessedStrikesChange?.(pick)}
                  />
                  {!blessedStrikesPick ? (
                    <Text tone="muted">Не выбрано — выберите, чтобы продолжить.</Text>
                  ) : null}
                </Stack>
              </div>
            ) : null}
            {slug === 'druid' && isPrimary && row.level >= ELEMENTAL_FURY_MIN_LEVEL_2024 ? (
              <div data-testid="p24-m02-elemental-fury-pick">
                <Stack gap={8}>
                  <Text as="h3" className="create-pipeline__section-title">
                    {ELEMENTAL_FURY_NAME_RU} (с {ELEMENTAL_FURY_MIN_LEVEL_2024} ур.) — обязательный выбор
                  </Text>
                  <SegmentedControl<ElementalFuryPick2024>
                    aria-label={ELEMENTAL_FURY_NAME_RU}
                    options={[
                      {
                        id: ELEMENTAL_FURY_POTENT_SPELLCASTING,
                        label: DRUID_POTENT_SPELLCASTING_NAME_RU,
                        testId: `p24-m02-elemental-fury-${ELEMENTAL_FURY_POTENT_SPELLCASTING}`,
                      },
                      {
                        id: ELEMENTAL_FURY_PRIMAL_STRIKE,
                        label: PRIMAL_STRIKE_NAME_RU,
                        testId: `p24-m02-elemental-fury-${ELEMENTAL_FURY_PRIMAL_STRIKE}`,
                      },
                    ]}
                    value={(elementalFuryPick ?? '') as ElementalFuryPick2024}
                    onChange={(pick) => onElementalFuryChange?.(pick)}
                  />
                  {!elementalFuryPick ? (
                    <Text tone="muted">Не выбрано — выберите, чтобы продолжить.</Text>
                  ) : null}
                </Stack>
              </div>
            ) : null}
          </div>
        )
      })}

      <div className="create-pipeline__mc" data-testid="p24-m03c-multiclass">
        <Button
          onClick={() => setMcOpen((open) => !open)}
          data-testid="p24-m03c-mc-open"
          variant={mcOpen ? 'primary' : 'secondary'}
        >
          {mcOpen ? 'Скрыть мультикласс' : 'Добавить мультикласс'}
        </Button>
        {mcOpen ? (
          <ul className="create-pipeline__card-list" data-testid="p24-m03c-mc-list">
            {mcOptions.map(({ entry, ok, detail }) => (
              <li key={entry.id}>
                <button
                  type="button"
                  className={
                    ok
                      ? 'create-pipeline__card'
                      : 'create-pipeline__card create-pipeline__card--blocked'
                  }
                  disabled={!ok}
                  onClick={() => addMulticlass(entry)}
                  data-testid={`p24-m03c-mc-${entry.slug}`}
                >
                  <span className="create-pipeline__card-title">{entry.name_ru}</span>
                  <span className="create-pipeline__card-sub">
                    {ok ? 'Доступен · требования 13+ выполнены' : detail || 'недоступно'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {hasSpellcasting ? (
        <div className="create-pipeline__spells-block" data-testid="p24-m03c-slots">
          <div className="create-pipeline__method-row">
            <Button variant="secondary" onClick={onOpenSpells} data-testid="p24-m03c-spells">
              Заклинания
            </Button>
          </div>
          <Text>
            Ячейки (общая таблица мультикласса):{' '}
            {formatSlots(progression.multiclass_slots || {})}
            {progression.multiclass_pact
              ? ` · Магия договора ${progression.multiclass_pact.count}×${progression.multiclass_pact.level}`
              : ''}
          </Text>
          <Text tone="muted">
            Подготовленные и известные считаются по каждому классу отдельно; ячейки колдуна —
            отдельно (Магия договора). Бонус мастерства — по общему уровню {totalLevel}.
          </Text>
        </div>
      ) : null}

      {cascadeWarn ? (
        <div className="create-pipeline__modal" data-testid="p24-m03c-cascade">
          <Stack gap={12}>
            <Text as="h3">Снять уровень каскадом?</Text>
            <Text>
              После этого уровня идут: {cascadeWarn.dependents.join(', ')}. Снятие затронет их
              выборы — как в мастере 2014.
            </Text>
            <div className="create-pipeline__method-row">
              <Button variant="ghost" onClick={() => setCascadeWarn(null)}>
                Отмена
              </Button>
              <Button
                onClick={() => {
                  applyClassLevel(cascadeWarn.classId, cascadeWarn.nextLevel)
                  setCascadeWarn(null)
                }}
              >
                Подтвердить каскад
              </Button>
            </div>
          </Stack>
        </div>
      ) : null}
    </Stack>
    </div>
  )
}
