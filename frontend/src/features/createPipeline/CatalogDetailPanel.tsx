/** Rich right-panel detail for race / background / class / feat catalog picks. */

import type { ReactNode } from 'react'
import { Stack, Text } from '../../ui'
import type { CatalogEntry } from '../../shared/api/catalog'
import { ABILITY_LABELS, SKILL_DEFS, type AbilityKey } from '../characters/sheetTypes'
import {
  resolveBackgroundGrantDef,
  type BackgroundGrantDef,
} from '../../shared/dnd/backgroundGrants'
import {
  resolveClassGrantDef,
  type ClassGrantDef,
  type ClassProficiencyPackage,
} from '../../shared/dnd/classGrants'
import {
  localFeaturePack,
  resolveClassFeatureSlug,
} from '../../shared/dnd/classFeatures'
import { featGrantDefFromCatalog } from '../../shared/dnd/featGrants'
import {
  RACE_SIZE_LABELS,
  resolveRaceGrantDef,
  type RaceGrantDef,
} from '../../shared/dnd/raceGrants'

const ARMOR_RU: Record<string, string> = {
  light: 'лёгкие',
  medium: 'средние',
  heavy: 'тяжёлые',
  shields: 'щиты',
}

const WEAPON_RU: Record<string, string> = {
  simple: 'простое',
  martial: 'воинское',
}

function skillLabel(key: string): string {
  return SKILL_DEFS.find((row) => row.key === key)?.label ?? key
}

function saveLabels(saves: AbilityKey[]): string {
  return saves.map((key) => ABILITY_LABELS[key] ?? key.toUpperCase()).join(', ')
}

function packageSummary(pkg: ClassProficiencyPackage): string[] {
  const lines: string[] = []
  if (pkg.saves.length) lines.push(`Спасброски: ${saveLabels(pkg.saves)}`)
  const armor = pkg.armor.map((key) => ARMOR_RU[key] ?? key)
  if (armor.length) lines.push(`Доспехи: ${armor.join(', ')}`)
  const weapons = [
    ...pkg.weapons.map((key) => WEAPON_RU[key] ?? key),
    ...pkg.weaponExtras,
  ]
  if (weapons.length) lines.push(`Оружие: ${weapons.join(', ')}`)
  if (pkg.skillChoices) {
    const from =
      pkg.skillChoices.from === 'any'
        ? 'любые'
        : pkg.skillChoices.from.map(skillLabel).join(', ')
    lines.push(`Навыки: выбрать ${pkg.skillChoices.count} (${from})`)
  }
  if (pkg.toolsFixed.length) lines.push(`Инструменты: ${pkg.toolsFixed.join(', ')}`)
  if (pkg.toolChoices) {
    lines.push(
      `Инструменты (выбор ${pkg.toolChoices.count}): ${pkg.toolChoices.from.join(', ')}`,
    )
  }
  return lines
}

function raceAsiLine(def: RaceGrantDef): string | null {
  const fixed = Object.entries(def.abilityBonuses)
    .filter(([, value]) => value)
    .map(([key, value]) => `${ABILITY_LABELS[key as AbilityKey] ?? key}+${value}`)
  if (fixed.length) return `ASI: ${fixed.join(', ')}`
  if (def.abilityBonusChoices) {
    return 'ASI: гибкий выбор (в диалоге настройки)'
  }
  return null
}

function catalogBlurb(entry: CatalogEntry): string | null {
  const data = entry.data ?? {}
  const summary =
    (typeof data.summary_ru === 'string' && data.summary_ru) ||
    (typeof data.description_ru === 'string' && data.description_ru) ||
    (typeof data.feature_text_ru === 'string' && data.feature_text_ru) ||
    null
  if (!summary) return null
  return summary.length > 520 ? `${summary.slice(0, 520)}…` : summary
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="create-pipeline__detail-section">
      <Text className="create-pipeline__detail-section-title">{title}</Text>
      {children}
    </div>
  )
}

function RaceDetail({ entry, def }: { entry: CatalogEntry; def: RaceGrantDef }) {
  const asi = raceAsiLine(def)
  const size =
    def.sizeChoices.length > 1
      ? def.sizeChoices.map((row) => RACE_SIZE_LABELS[row]).join(' / ')
      : RACE_SIZE_LABELS[def.size]
  return (
    <Stack gap={12}>
      <Text as="h2">{entry.name_ru}</Text>
      {entry.name_en ? <Text tone="muted">{entry.name_en}</Text> : null}
      {entry.source ? <Text tone="muted">Источник: {entry.source}</Text> : null}
      <DetailSection title="Основные">
        <ul className="create-pipeline__detail-list">
          <li>Скорость {def.speed} фт.</li>
          <li>Размер: {size}</li>
          <li>Тёмное зрение: {def.darkvision ? `${def.darkvision} фт.` : 'нет'}</li>
          {asi ? <li>{asi}</li> : null}
          {def.languages.length ? <li>Языки: {def.languages.join(', ')}</li> : null}
          {def.languagesChoose > 0 ? (
            <li>Доп. языки: выбрать {def.languagesChoose}</li>
          ) : null}
        </ul>
      </DetailSection>
      {def.skillProficiencies.length || def.skillChoices ? (
        <DetailSection title="Навыки">
          <ul className="create-pipeline__detail-list">
            {def.skillProficiencies.map((key) => (
              <li key={key}>{skillLabel(key)}</li>
            ))}
            {def.skillChoices ? (
              <li>
                Выбор {def.skillChoices.count}:{' '}
                {def.skillChoices.from === 'any'
                  ? 'любые'
                  : def.skillChoices.from.map(skillLabel).join(', ')}
              </li>
            ) : null}
          </ul>
        </DetailSection>
      ) : null}
      {def.featNoteRu ? (
        <DetailSection title="Черта">
          <Text>{def.featNoteRu}</Text>
        </DetailSection>
      ) : null}
      {def.racialSpells.length ? (
        <DetailSection title="Расовые заклинания">
          <ul className="create-pipeline__detail-list">
            {def.racialSpells.map((spell) => (
              <li key={spell.id}>
                {spell.nameRu}
                {spell.unlockLevel > 1 ? ` (с ${spell.unlockLevel} ур.)` : ''}
                {spell.grant === 'spell_list' ? ' · в список кастера' : ' · врождённое'}
                {spell.notesRu ? ` — ${spell.notesRu}` : ''}
              </li>
            ))}
          </ul>
        </DetailSection>
      ) : null}
      {def.traitsText ? (
        <DetailSection title="Черты">
          <Text className="create-pipeline__detail-body">{def.traitsText}</Text>
        </DetailSection>
      ) : null}
      {!def.traitsText && catalogBlurb(entry) ? (
        <Text className="create-pipeline__detail-body">{catalogBlurb(entry)}</Text>
      ) : null}
    </Stack>
  )
}

function BackgroundDetail({
  entry,
  def,
}: {
  entry: CatalogEntry
  def: BackgroundGrantDef
}) {
  return (
    <Stack gap={12}>
      <Text as="h2">{entry.name_ru}</Text>
      {entry.name_en ? <Text tone="muted">{entry.name_en}</Text> : null}
      {entry.source ? <Text tone="muted">Источник: {entry.source}</Text> : null}
      <DetailSection title="Владения">
        <ul className="create-pipeline__detail-list">
          {def.skillProficiencies.length ? (
            <li>Навыки: {def.skillProficiencies.map(skillLabel).join(', ')}</li>
          ) : null}
          {def.skillChoices ? (
            <li>
              Навыки (выбор {def.skillChoices.count}):{' '}
              {def.skillChoices.from === 'any'
                ? 'любые'
                : def.skillChoices.from.map(skillLabel).join(', ')}
            </li>
          ) : null}
          {def.toolProficiencies.length ? (
            <li>Инструменты: {def.toolProficiencies.join(', ')}</li>
          ) : null}
          {def.languages.length ? <li>Языки: {def.languages.join(', ')}</li> : null}
          {def.languagesChoose > 0 ? (
            <li>
              Доп. языки: {def.languagesChoose}
              {def.languagesChooseNoteRu ? ` (${def.languagesChooseNoteRu})` : ''}
            </li>
          ) : null}
        </ul>
      </DetailSection>
      {def.featureNameRu || def.featureTextRu ? (
        <DetailSection title={def.featureNameRu || 'Умение предыстории'}>
          <Text className="create-pipeline__detail-body">
            {def.featureTextRu || 'Текст умения применится после настройки.'}
          </Text>
        </DetailSection>
      ) : null}
      {def.equipment.length ? (
        <DetailSection title="Снаряжение">
          <ul className="create-pipeline__detail-list">
            {def.equipment.map((pkg) => (
              <li key={pkg.id}>
                {pkg.labelRu}: {pkg.summary}
              </li>
            ))}
          </ul>
        </DetailSection>
      ) : null}
      {catalogBlurb(entry) && !def.featureTextRu ? (
        <Text className="create-pipeline__detail-body">{catalogBlurb(entry)}</Text>
      ) : null}
    </Stack>
  )
}

function ClassDetail({ entry, def }: { entry: CatalogEntry; def: ClassGrantDef }) {
  const slug = resolveClassFeatureSlug(entry.name_ru) || def.slug
  const pack = localFeaturePack(slug)
  const levelOne = (pack?.features ?? []).filter((row) => row.level === 1).slice(0, 6)
  const startLines = packageSummary(def.start)
  return (
    <Stack gap={12}>
      <Text as="h2">{entry.name_ru}</Text>
      {entry.name_en ? <Text tone="muted">{entry.name_en}</Text> : null}
      {entry.source ? <Text tone="muted">Источник: {entry.source}</Text> : null}
      <DetailSection title="Кость хитов">
        <Text>{def.hitDie}</Text>
      </DetailSection>
      <DetailSection title="Владения (1 ур.)">
        <ul className="create-pipeline__detail-list">
          {startLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </DetailSection>
      {levelOne.length ? (
        <DetailSection title="Умения 1 уровня">
          <ul className="create-pipeline__detail-list">
            {levelOne.map((feature) => (
              <li key={feature.id}>
                <strong>{feature.name_ru}</strong>
                {feature.summary_ru ? ` — ${feature.summary_ru}` : ''}
              </li>
            ))}
          </ul>
        </DetailSection>
      ) : null}
      {def.equipment?.length ? (
        <DetailSection title="Стартовое снаряжение">
          <ul className="create-pipeline__detail-list">
            {def.equipment.slice(0, 4).map((pkg) => (
              <li key={pkg.id}>
                {pkg.labelRu}: {pkg.summary}
              </li>
            ))}
          </ul>
        </DetailSection>
      ) : null}
      <Text tone="muted">
        Навыки, инструменты и снаряжение выбираются сразу в диалоге настройки класса.
      </Text>
    </Stack>
  )
}

function FeatDetail({ entry }: { entry: CatalogEntry }) {
  const blurb = catalogBlurb(entry)
  const data = entry.data ?? {}
  const def = featGrantDefFromCatalog({
    slug: entry.slug,
    nameRu: entry.name_ru,
    data: entry.data,
  })
  const prereq =
    def?.prerequisitesRu ||
    (typeof data.prerequisite_ru === 'string' && data.prerequisite_ru) ||
    (typeof data.prerequisite === 'string' && data.prerequisite) ||
    null
  const choiceLabels = (def?.choices ?? [])
    .map((choice) => choice.label_ru?.trim())
    .filter(Boolean)
  return (
    <Stack gap={12}>
      <Text as="h2">{entry.name_ru}</Text>
      {entry.name_en ? <Text tone="muted">{entry.name_en}</Text> : null}
      {entry.source ? <Text tone="muted">Источник: {entry.source}</Text> : null}
      {prereq ? (
        <DetailSection title="Требование">
          <Text>{prereq}</Text>
        </DetailSection>
      ) : null}
      {blurb ? <Text className="create-pipeline__detail-body">{blurb}</Text> : (
        <Text tone="muted">Краткое описание появится после расширения каталога черт.</Text>
      )}
      {choiceLabels.length ? (
        <DetailSection title="Нужно выбрать в настройке">
          <ul className="create-pipeline__detail-list">
            {choiceLabels.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        </DetailSection>
      ) : null}
    </Stack>
  )
}

export type CatalogDetailKind = 'race' | 'background' | 'class' | 'feat'

type CatalogDetailPanelProps = {
  kind: CatalogDetailKind
  entry: CatalogEntry | null
  emptyTitle: string
  emptyHint?: string
  /** Extra content under the detail (name field, CTAs). */
  children?: ReactNode
}

export function CatalogDetailPanel({
  kind,
  entry,
  emptyTitle,
  emptyHint = 'Выберите карточку слева.',
  children,
}: CatalogDetailPanelProps) {
  if (!entry) {
    return (
      <Stack gap={12}>
        <Text as="h2">{emptyTitle}</Text>
        <Text tone="muted">{emptyHint}</Text>
        {children}
      </Stack>
    )
  }

  let body: React.ReactNode = null
  if (kind === 'race') {
    const def = resolveRaceGrantDef({
      raceName: entry.name_ru,
      catalogSlug: entry.slug,
      catalogData: entry.data,
      nameRu: entry.name_ru,
    })
    body = def ? (
      <RaceDetail entry={entry} def={def} />
    ) : (
      <Stack gap={12}>
        <Text as="h2">{entry.name_ru}</Text>
        <Text>{catalogBlurb(entry) ?? 'Нет пакета грантов расы в каталоге.'}</Text>
      </Stack>
    )
  } else if (kind === 'background') {
    const def = resolveBackgroundGrantDef({
      backgroundName: entry.name_ru,
      catalogSlug: entry.slug,
      catalogData: entry.data,
      nameRu: entry.name_ru,
    })
    body = def ? (
      <BackgroundDetail entry={entry} def={def} />
    ) : (
      <Stack gap={12}>
        <Text as="h2">{entry.name_ru}</Text>
        <Text>{catalogBlurb(entry) ?? 'Нет пакета грантов предыстории.'}</Text>
      </Stack>
    )
  } else if (kind === 'class') {
    const def = resolveClassGrantDef({
      className: entry.name_ru,
      catalogSlug: entry.slug,
      catalogData: entry.data,
    })
    body = def ? (
      <ClassDetail entry={entry} def={def} />
    ) : (
      <Stack gap={12}>
        <Text as="h2">{entry.name_ru}</Text>
        <Text>{catalogBlurb(entry) ?? 'Нет пакета владений класса.'}</Text>
      </Stack>
    )
  } else {
    body = <FeatDetail entry={entry} />
  }

  return (
    <Stack gap={16}>
      {body}
      {children}
    </Stack>
  )
}
