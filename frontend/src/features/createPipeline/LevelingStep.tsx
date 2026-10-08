import { useMemo, useState } from 'react'
import { Button, Field, NumberInput, Stack, Text } from '../../ui'
import type { CatalogEntry } from '../../shared/api/catalog'
import {
  canTakeMulticlassLevel,
  formatPrerequisite,
  hitDieForClass,
  unmetPrerequisiteDetail,
  type AbilityScores,
  MULTICLASS_PREREQUISITES,
} from '../../shared/dnd/multiclassRules'
import {
  addMulticlassLevel,
  bumpClassLevel,
  createClassLevel,
  reduceClassLevel,
  totalCharacterLevel,
  type ClassLevelEntry,
} from '../../shared/dnd/classLevels'
import { hitDieSides, type HitDie } from '../../shared/dnd/hitDice'
import type { HpLevelChoice } from './createPipelineTypes'

type LevelingStepProps = {
  classes: ClassLevelEntry[]
  classCatalog: CatalogEntry[]
  abilities: AbilityScores
  hpChoices: HpLevelChoice[]
  primaryClassEntryId: string
  onClassesChange: (classes: ClassLevelEntry[]) => void
  onHpChoicesChange: (choices: HpLevelChoice[]) => void
  onOpenChoices: (classEntryId: string) => void
  onOpenSpells: () => void
}

function averageFace(die: HitDie): number {
  return Math.floor(hitDieSides(die) / 2) + 1
}

function ensureHpChoices(
  classes: ClassLevelEntry[],
  previous: HpLevelChoice[],
): HpLevelChoice[] {
  const prevMap = new Map(previous.map((row) => [row.key, row]))
  const next: HpLevelChoice[] = []
  classes.forEach((cls, classIndex) => {
    for (let lvl = 1; lvl <= cls.level; lvl += 1) {
      const key = `${cls.id}:${lvl}`
      const existing = prevMap.get(key)
      const isOriginFirst = classIndex === 0 && lvl === 1
      next.push(
        existing ?? {
          key,
          classEntryId: cls.id,
          classLevel: lvl,
          mode: isOriginFirst ? 'average' : 'average',
          rolled: null,
        },
      )
    }
  })
  return next
}

export function LevelingStep({
  classes,
  classCatalog,
  abilities,
  hpChoices,
  primaryClassEntryId,
  onClassesChange,
  onHpChoicesChange,
  onOpenChoices,
  onOpenSpells,
}: LevelingStepProps) {
  const [mcOpen, setMcOpen] = useState(false)
  const totalLevel = totalCharacterLevel(classes)

  const mcOptions = useMemo(() => {
    return classCatalog
      .filter((entry) => !entry.parent_id)
      .map((entry) => {
        const slug = entry.slug
        const check = canTakeMulticlassLevel({
          newClassName: entry.name_ru,
          currentClassNames: classes.map((row) => row.name),
          abilities,
        })
        const prereq = MULTICLASS_PREREQUISITES[slug]
        const detail = check.ok
          ? null
          : unmetPrerequisiteDetail(prereq, abilities) ?? check.reason
        return { entry, ok: check.ok, detail, prereq }
      })
      .sort(
        (a, b) =>
          Number(b.ok) - Number(a.ok) || a.entry.name_ru.localeCompare(b.entry.name_ru, 'ru'),
      )
  }, [abilities, classCatalog, classes])

  function setClassLevel(classId: string, level: number) {
    const clamped = Math.max(0, Math.min(20, Math.floor(level)))
    let next = classes.map((row) =>
      row.id === classId ? { ...row, level: Math.max(1, clamped) } : row,
    )
    if (clamped <= 0) {
      // Attempt remove — protect primary if it's the only class.
      if (classes.length === 1) {
        next = classes.map((row) => (row.id === classId ? { ...row, level: 1 } : row))
      } else {
        next = reduceClassLevel(classes, classId)
      }
    }
    // Drop MC that no longer meet prereqs after level-down on primary abilities unchanged —
    // ability ASI might be undone by parent; here we only check class list integrity.
    const removed = classes.filter((row) => !next.some((n) => n.id === row.id))
    if (removed.length) {
      // ok
    }
    const withHp = ensureHpChoices(next, hpChoices)
    onClassesChange(next)
    onHpChoicesChange(withHp)
  }

  function addMulticlass(entry: CatalogEntry) {
    const check = canTakeMulticlassLevel({
      newClassName: entry.name_ru,
      currentClassNames: classes.map((row) => row.name),
      abilities,
    })
    if (!check.ok) return
    const next = addMulticlassLevel(classes, {
      name: entry.name_ru,
      catalog_id: entry.id,
    })
    const normalized = next.map((row) =>
      row.name.trim().toLowerCase() === entry.name_ru.trim().toLowerCase() && !row.catalog_id
        ? { ...row, catalog_id: entry.id }
        : row,
    )
    onClassesChange(normalized)
    onHpChoicesChange(ensureHpChoices(normalized, hpChoices))
    setMcOpen(false)
  }

  function patchHp(key: string, patch: Partial<HpLevelChoice>) {
    onHpChoicesChange(hpChoices.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  function rollDie(die: HitDie): number {
    return 1 + Math.floor(Math.random() * hitDieSides(die))
  }

  return (
    <Stack gap={16}>
      <div>
        <Text as="h2">Прокачка</Text>
        <Text tone="muted">
          Крути уровни классов. Сумма = уровень персонажа ({totalLevel}). Здесь же умения, архетип,
          ASI, снаряжение и заклинания.
        </Text>
      </div>

      {classes.map((row, index) => {
        const die = hitDieForClass({ className: row.name }) ?? 'd8'
        const isPrimary = row.id === primaryClassEntryId || index === 0
        return (
          <div key={row.id} className="create-pipeline__level-block">
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
                />
              </Field>
            </div>
            <div className="create-pipeline__level-actions">
              <Button variant="secondary" onClick={() => onOpenChoices(row.id)}>
                Развилки и умения
              </Button>
              {!isPrimary ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (classes.length <= 1) return
                    const next = classes.filter((item) => item.id !== row.id)
                    onClassesChange(next.length ? next : [createClassLevel({ level: 1 })])
                    onHpChoicesChange(ensureHpChoices(next, hpChoices))
                  }}
                >
                  Убрать класс
                </Button>
              ) : null}
            </div>
            <div className="create-pipeline__hp-list">
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
          </div>
        )
      })}

      <div className="create-pipeline__mc">
        <Button onClick={() => setMcOpen((open) => !open)}>Добавить мультикласс</Button>
        {mcOpen ? (
          <ul className="create-pipeline__card-list">
            {mcOptions.map(({ entry, ok, detail, prereq }) => (
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
                >
                  <span className="create-pipeline__card-title">{entry.name_ru}</span>
                  <span className="create-pipeline__card-sub">
                    {ok
                      ? prereq
                        ? `ОК · ${formatPrerequisite(prereq)}`
                        : 'ОК'
                      : detail || 'недоступно'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <Button variant="secondary" onClick={onOpenSpells}>
        Заклинания
      </Button>

      <Text tone="muted">
        Минус уровня: если после смены характеристик/порогов мультикласс перестанет подходить —
        покажем предупреждение и снимем лишнее (логика на шаге характеристик / подтверждении).
      </Text>
    </Stack>
  )
}

/** Re-export bump for parent warnings. */
export { bumpClassLevel, ensureHpChoices }
