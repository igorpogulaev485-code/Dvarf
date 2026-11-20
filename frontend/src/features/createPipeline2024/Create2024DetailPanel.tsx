/** Rich right-panel detail for 2024 class / background / species / feat / spell catalog picks. */

import type { ReactNode } from 'react'
import { Stack, Text } from '../../ui'
import type { CatalogEntry } from '../../shared/api/catalog'
import { catalogSourceLabelRu } from '../../shared/dnd/catalogSourceLabelRu'
import { ABILITY_LABEL_RU, type AbilityKey } from '../../shared/dnd/pointBuy'
import {
  castingTimeLabelRu,
  creatureTypeLabelRu,
  hitDieLabel,
  itemNameRu,
  ruDice,
  sizeLabelRu,
  spellComponentsLabelRu,
  spellSchoolLabelRu,
  type ItemNameIndex,
} from './create2024Labels'
import {
  backgroundToolChoicesOf,
  formatBackgroundPackPreview,
  formatClassPackPreview,
} from './create2024PackExpand'
import { featTraitsText, originFeatNameOf, originFeatSlugOf, skillLabelRu } from './create2024FeatPicks'
import { WEAPON_MASTERY_NAME_RU } from '../../shared/dnd/paladin2024Features'
import {
  backgroundAsiTrio,
  classSkillNeed,
  classStartingPacks,
  classToolChoice,
  findFeat,
  speciesLineages,
  weaponMasteryLimit,
} from './createPipeline2024State'
import { classL1Spellcasting, entryData } from './createPipeline2024Types'

const ARMOR_RU: Record<string, string> = {
  light: 'лёгкие',
  medium: 'средние',
  heavy: 'тяжёлые',
  shields: 'щиты',
  shield: 'щиты',
}

const FEAT_CATEGORY_RU: Record<string, string> = {
  origin: 'Черта происхождения',
  general: 'Общая черта',
  fighting_style: 'Боевой стиль',
  epic_boon: 'Эпический дар',
  dragonmark: 'Драконья метка',
  dark_gift: 'Тёмный дар',
}

export type Create2024DetailKind = 'class' | 'background' | 'species' | 'feat' | 'spell'

type Create2024DetailPanelProps = {
  kind: Create2024DetailKind
  entry: CatalogEntry | null
  emptyTitle: string
  emptyHint?: string
  feats?: readonly CatalogEntry[]
  items?: ItemNameIndex
  /** Selected background tool — resolves pack preview placeholders. */
  backgroundToolId?: string | null
  /** Selected class tools — resolves class pack tool slots. */
  classToolIds?: readonly string[]
  /** Class slug → Russian name (spell list line). */
  classNames?: ReadonlyMap<string, string>
  /** Picks / CTAs rendered below the description. */
  children?: ReactNode
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="create-pipeline__detail-section">
      <Text className="create-pipeline__detail-section-title">{title}</Text>
      {children}
    </div>
  )
}

/** Seed texts sometimes carry a literal `br` before the next sentence. */
function cleanText(text: string, limit = 900): string {
  const cleaned = ruDice(text.replace(/\bbr(?=[А-ЯЁ])/g, '\n')).trim()
  return cleaned.length > limit ? `${cleaned.slice(0, limit)}…` : cleaned
}

function Header({ entry }: { entry: CatalogEntry }) {
  const source = catalogSourceLabelRu(entry.source)
  return (
    <>
      <Text as="h2">{entry.name_ru}</Text>
      {source ? <Text tone="muted">Источник: {source}</Text> : null}
    </>
  )
}

function abilityList(values: unknown): string {
  if (!Array.isArray(values)) return '—'
  return values
    .map((x) => ABILITY_LABEL_RU[String(x).toLowerCase() as AbilityKey])
    .filter(Boolean)
    .join(', ')
}

function ClassDetail({
  entry,
  items,
  classToolIds = [],
}: {
  entry: CatalogEntry
  items: ItemNameIndex | undefined
  classToolIds?: readonly string[]
}) {
  const data = entryData(entry)
  const armor = Array.isArray(data.armor)
    ? (data.armor as unknown[]).map((k) => ARMOR_RU[String(k)] ?? 'особые')
    : []
  const weaponRow =
    data.weapons && typeof data.weapons === 'object' ? (data.weapons as Record<string, unknown>) : {}
  const weapons: string[] = []
  if (weaponRow.simple) weapons.push('простое')
  if (weaponRow.martial) weapons.push('воинское')
  const extras = Array.isArray(weaponRow.extras) ? weaponRow.extras.map((x) => String(x)) : []
  const extraNames = extras.map((id) => {
    const key = id.trim().toLowerCase().replace(/[\s-]+/g, '_')
    if (key === 'light_martial_melee' || key === 'light_martial') {
      return 'воинское рукопашное со свойством «лёгкое»'
    }
    return itemNameRu(id, items)
  })
  const weaponNote = typeof weaponRow.note_ru === 'string' ? weaponRow.note_ru : null
  const skills = classSkillNeed(entry)
  const sc = classL1Spellcasting(entry)
  const mastery = weaponMasteryLimit(entry.slug)
  const toolChoice = classToolChoice(entry)
  const fixedTools = Array.isArray(data.tools_fixed)
    ? (data.tools_fixed as unknown[]).map((id) => itemNameRu(String(id), items))
    : []
  const levels = Array.isArray(data.levels) ? data.levels : []
  const l1 = levels.find(
    (row) => row && typeof row === 'object' && (row as { level?: number }).level === 1,
  ) as { features?: Array<{ name_ru?: string; summary_ru?: string }> } | undefined
  const packs = classStartingPacks(entry)
  const summary = typeof data.summary_ru === 'string' ? data.summary_ru : null
  const slots =
    sc && l1 && (l1 as { spellcasting?: { slots?: Record<string, number> } }).spellcasting?.slots
      ? (l1 as { spellcasting: { slots: Record<string, number> } }).spellcasting.slots
      : null

  return (
    <Stack gap={12}>
      <Header entry={entry} />
      {summary ? <Text className="create-pipeline__detail-body">{cleanText(summary)}</Text> : null}
      <DetailSection title="Основа">
        <ul className="create-pipeline__detail-list">
          <li>Кость хитов: {hitDieLabel(data.hit_die)}</li>
          <li>Основные характеристики: {abilityList(data.primary_abilities)}</li>
          <li>Спасброски: {abilityList(data.saving_throws)}</li>
        </ul>
      </DetailSection>
      <DetailSection title="Владения">
        <ul className="create-pipeline__detail-list">
          <li>Доспехи: {armor.length ? armor.join(', ') : 'нет'}</li>
          <li>
            Оружие: {weapons.length ? weapons.join(', ') : 'нет'}
            {extraNames.length ? ` + ${extraNames.join(', ')}` : ''}
            {weaponNote ? ` (${weaponNote})` : ''}
          </li>
          {fixedTools.length ? <li>Инструменты: {fixedTools.join(', ')}</li> : null}
          {toolChoice ? <li>Инструменты на выбор: {toolChoice.count}</li> : null}
          {skills.count > 0 ? (
            <li>
              Навыки: выбрать {skills.count} из {skills.from.map(skillLabelRu).join(', ')}
            </li>
          ) : null}
          {mastery > 0 ? (
            <li>
              {WEAPON_MASTERY_NAME_RU}:{' '}
              {mastery} вида
            </li>
          ) : null}
        </ul>
      </DetailSection>
      {sc ? (
        <DetailSection title="Колдовство на 1 уровне">
          <ul className="create-pipeline__detail-list">
            <li>Заговоры: {sc.cantrips}</li>
            <li>Подготовлено заклинаний: {sc.prepared_spells}</li>
            {slots ? (
              <li>
                Ячейки:{' '}
                {Object.entries(slots)
                  .map(([lvl, n]) => `${lvl} круг × ${n}`)
                  .join(', ')}
              </li>
            ) : null}
          </ul>
        </DetailSection>
      ) : null}
      {l1?.features?.length ? (
        <DetailSection title="Умения 1 уровня">
          <ul className="create-pipeline__detail-list">
            {l1.features.map((feature) => (
              <li key={feature.name_ru}>
                <strong>{feature.name_ru}</strong>
                {feature.summary_ru ? ` — ${ruDice(feature.summary_ru)}` : ''}
              </li>
            ))}
          </ul>
        </DetailSection>
      ) : null}
      {packs.length ? (
        <DetailSection title="Стартовое снаряжение">
          <ul className="create-pipeline__detail-list">
            {packs.map((pack) => {
              const resolved =
                !pack.isGold && items
                  ? formatClassPackPreview({
                      pack,
                      classToolIds,
                      items,
                    })
                  : ''
              const line = resolved || pack.summaryRu || ''
              return (
                <li key={pack.id}>
                  <strong>{pack.labelRu}</strong>
                  {line && !pack.isGold ? `: ${line}` : ''}
                </li>
              )
            })}
          </ul>
        </DetailSection>
      ) : null}
      <Text tone="muted">Подкласс на 1 уровне недоступен — он открывается с 3 уровня.</Text>
    </Stack>
  )
}

function BackgroundDetail({
  entry,
  feats,
  items,
  backgroundToolId = null,
}: {
  entry: CatalogEntry
  feats: readonly CatalogEntry[]
  items: ItemNameIndex | undefined
  backgroundToolId?: string | null
}) {
  const data = entryData(entry)
  const trio = backgroundAsiTrio(entry)
  const featSlug = originFeatSlugOf(entry)
  const feat = findFeat(feats, featSlug)
  const featName = feat?.name_ru ?? originFeatNameOf(entry)
  const featText = feat ? featTraitsText(feat) : ''
  const skills = Array.isArray(data.skill_proficiencies)
    ? (data.skill_proficiencies as unknown[]).map((id) => skillLabelRu(String(id)))
    : []
  const fixedTools = Array.isArray(data.tool_proficiencies)
    ? (data.tool_proficiencies as unknown[]).map((id) => itemNameRu(String(id), items))
    : []
  const choice =
    data.tool_choices && typeof data.tool_choices === 'object'
      ? (data.tool_choices as { label_ru?: string; count?: number; category?: string; from_category?: string })
      : null
  const choiceLabel = choice
    ? choice.label_ru ||
      (String(choice.category || choice.from_category || '').includes('artisan')
        ? 'Инструменты ремесленника (на выбор)'
        : String(choice.category || choice.from_category || '').includes('gaming')
          ? 'Игровой набор (на выбор)'
          : 'Музыкальный инструмент (на выбор)')
    : null
  const gear = data.equipment_or_gold as
    | { pack_summary_ru?: string; gold_alternative_gp?: number }
    | undefined

  return (
    <Stack gap={12}>
      <Header entry={entry} />
      <DetailSection title="Увеличение характеристик">
        {trio.length === 3 ? (
          <ul className="create-pipeline__detail-list">
            <li>Доступны: {trio.map((k) => ABILITY_LABEL_RU[k]).join(' / ')}</li>
            <li>Варианты: +2 и +1 к двум из трёх или +1 ко всем трём</li>
          </ul>
        ) : (
          <Text tone="muted">В каталоге нет тройки характеристик.</Text>
        )}
      </DetailSection>
      <DetailSection title="Черта происхождения">
        <Text>
          <strong>{featName || 'Не указана'}</strong>
        </Text>
        {featText ? (
          <Text className="create-pipeline__detail-body">{cleanText(featText, 700)}</Text>
        ) : null}
      </DetailSection>
      <DetailSection title="Владения">
        <ul className="create-pipeline__detail-list">
          {skills.length ? <li>Навыки: {skills.join(', ')}</li> : null}
          {fixedTools.length ? <li>Инструменты: {fixedTools.join(', ')}</li> : null}
          {choiceLabel ? <li>Инструмент: {choiceLabel}</li> : null}
        </ul>
      </DetailSection>
      {gear ? (
        <DetailSection title="Снаряжение">
          <ul className="create-pipeline__detail-list">
            {gear.pack_summary_ru ? (
              <li>
                Пакет:{' '}
                {items
                  ? formatBackgroundPackPreview({
                      packSummaryRu: gear.pack_summary_ru,
                      backgroundToolId,
                      toolChoices: backgroundToolChoicesOf(entry),
                      items,
                    })
                  : cleanText(gear.pack_summary_ru, 400)}
              </li>
            ) : null}
            <li>Вместо пакета: {gear.gold_alternative_gp ?? 50} зм</li>
          </ul>
        </DetailSection>
      ) : null}
      <Text tone="muted">Предыстория не даёт языков — их вы выберете на отдельном шаге.</Text>
    </Stack>
  )
}

function SpeciesDetail({ entry }: { entry: CatalogEntry }) {
  const data = entryData(entry)
  const sizes = Array.isArray(data.size_options)
    ? (data.size_options as unknown[]).map((x) => sizeLabelRu(String(x)))
    : [sizeLabelRu(String(data.size || 'medium'))]
  const lineages = speciesLineages(entry)
  const traits = typeof data.traits_text === 'string' ? data.traits_text : ''
  const dv = Number(data.darkvision || 0)
  return (
    <Stack gap={12}>
      <Header entry={entry} />
      <DetailSection title="Основное">
        <ul className="create-pipeline__detail-list">
          <li>Тип: {creatureTypeLabelRu(data.creature_type)}</li>
          <li>Размер: {sizes.join(' / ')}</li>
          <li>Скорость: {Number(data.speed || 30)} фт.</li>
          <li>Тёмное зрение: {dv ? `${dv} фт.` : 'нет'}</li>
          <li>Увеличение характеристик: нет (даёт предыстория)</li>
          <li>Языки: в окне предыстории (Общий + 2)</li>
        </ul>
      </DetailSection>
      {lineages.length ? (
        <DetailSection title="Родословные">
          <ul className="create-pipeline__detail-list">
            {lineages.map((row) => (
              <li key={row.id}>
                <strong>{row.name_ru}</strong>
                {row.summary_ru ? ` — ${row.summary_ru}` : ''}
              </li>
            ))}
          </ul>
        </DetailSection>
      ) : null}
      {traits ? (
        <DetailSection title="Особенности">
          <Text className="create-pipeline__detail-body">{cleanText(traits, 1400)}</Text>
        </DetailSection>
      ) : null}
    </Stack>
  )
}

function FeatDetail({ entry }: { entry: CatalogEntry }) {
  const data = entryData(entry)
  const category = FEAT_CATEGORY_RU[String(data.category || '')] ?? 'Черта'
  const text = featTraitsText(entry)
  return (
    <Stack gap={12}>
      <Header entry={entry} />
      <Text tone="muted">{category}</Text>
      {text ? (
        <Text className="create-pipeline__detail-body">{cleanText(text, 1200)}</Text>
      ) : (
        <Text tone="muted">Описание черты не найдено.</Text>
      )}
    </Stack>
  )
}

function SpellDetail({
  entry,
  classNames,
}: {
  entry: CatalogEntry
  classNames: ReadonlyMap<string, string> | undefined
}) {
  const data = entryData(entry)
  const level = Number(data.level ?? 0)
  const classes = Array.isArray(data.classes)
    ? (data.classes as unknown[])
        .map((slug) => classNames?.get(String(slug)))
        .filter((name): name is string => Boolean(name))
    : []
  const summary = typeof data.summary_ru === 'string' ? data.summary_ru : ''
  const description = typeof data.description === 'string' ? data.description : ''
  const text = description && description !== summary ? `${summary}\n${description}` : summary
  return (
    <Stack gap={12}>
      <Header entry={entry} />
      <Text tone="muted">
        {level === 0 ? 'Заговор' : `${level} круг`} · {spellSchoolLabelRu(entry)}
      </Text>
      <DetailSection title="Параметры">
        <ul className="create-pipeline__detail-list">
          <li>Время накладывания: {castingTimeLabelRu(entry)}</li>
          <li>Дистанция: {ruDice(String(data.range || '—'))}</li>
          <li>Компоненты: {spellComponentsLabelRu(entry)}</li>
          <li>Длительность: {String(data.duration || '—')}</li>
          {data.concentration ? <li>Концентрация</li> : null}
          {data.ritual ? <li>Ритуал</li> : null}
          {data.damage ? <li>Урон: {ruDice(String(data.damage))}</li> : null}
        </ul>
      </DetailSection>
      {text ? <Text className="create-pipeline__detail-body">{cleanText(text, 900)}</Text> : null}
      {classes.length ? <Text tone="muted">Списки: {classes.join(', ')}</Text> : null}
    </Stack>
  )
}

export function Create2024DetailPanel({
  kind,
  entry,
  emptyTitle,
  emptyHint = 'Выберите карточку слева.',
  feats = [],
  items,
  backgroundToolId = null,
  classToolIds = [],
  classNames,
  children,
}: Create2024DetailPanelProps) {
  if (!entry) {
    return (
      <Stack gap={12}>
        <Text as="h2">{emptyTitle}</Text>
        <Text tone="muted">{emptyHint}</Text>
        {children}
      </Stack>
    )
  }
  let body: ReactNode
  if (kind === 'class') {
    body = <ClassDetail entry={entry} items={items} classToolIds={classToolIds} />
  } else if (kind === 'background') {
    body = (
      <BackgroundDetail
        entry={entry}
        feats={feats}
        items={items}
        backgroundToolId={backgroundToolId}
      />
    )
  } else if (kind === 'species') body = <SpeciesDetail entry={entry} />
  else if (kind === 'spell') body = <SpellDetail entry={entry} classNames={classNames} />
  else body = <FeatDetail entry={entry} />

  return (
    <Stack gap={16}>
      {body}
      {children}
    </Stack>
  )
}
