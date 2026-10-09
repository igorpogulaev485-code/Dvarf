import { useCallback, useEffect, useMemo, useState } from 'react'
import type { RulesEdition } from '../../shared/api/characters'
import type { CatalogEntry } from '../../shared/api/catalog'
import type { ClassLevelEntry } from '../../shared/dnd/classLevels'
import {
  averageHpGain,
  canTakeMulticlassLevel,
  hitDieForClass,
  isClassEligibleForMulticlass,
  type AbilityScores,
} from '../../shared/dnd/multiclassRules'
import type { HitDie } from '../../shared/dnd/hitDice'
import { CatalogCombobox } from '../catalog'
import { Dialog, Field, NumberInput, Stack, Text } from '../../ui'

export type LevelUpChoice =
  | {
      type: 'same'
      classId: string
      hpGain: number
      hitDie: HitDie | null
    }
  | {
      type: 'multiclass'
      name: string
      catalog_id: string | null
      catalog_slug: string | null
      catalog_data: Record<string, unknown> | null
      hpGain: number
      hitDie: HitDie | null
    }

type LevelUpDialogProps = {
  open: boolean
  edition: RulesEdition
  classes: ClassLevelEntry[]
  abilities: AbilityScores
  constitutionMod: number
  onConfirm: (choice: LevelUpChoice) => void
  onClose: () => void
}

type HpMode = 'average' | 'manual'

export function LevelUpDialog({
  open,
  edition,
  classes,
  abilities,
  constitutionMod,
  onConfirm,
  onClose,
}: LevelUpDialogProps) {
  const [mode, setMode] = useState<'same' | 'multiclass'>('same')
  const [classId, setClassId] = useState(classes[0]?.id ?? '')
  const [newClassName, setNewClassName] = useState('')
  const [newCatalogId, setNewCatalogId] = useState<string | null>(null)
  const [newCatalogSlug, setNewCatalogSlug] = useState<string | null>(null)
  const [newCatalogData, setNewCatalogData] = useState<Record<string, unknown> | null>(
    null,
  )
  const [hpMode, setHpMode] = useState<HpMode>('average')
  const [manualHp, setManualHp] = useState<number | null>(null)

  const currentClassNames = useMemo(
    () => classes.map((row) => row.name).filter((name) => name.trim()),
    [classes],
  )

  useEffect(() => {
    if (!open) return
    setMode('same')
    setClassId(classes[0]?.id ?? '')
    setNewClassName('')
    setNewCatalogId(null)
    setNewCatalogSlug(null)
    setNewCatalogData(null)
    setHpMode('average')
    setManualHp(null)
  }, [open, classes])

  const targetClass = useMemo(() => {
    if (mode === 'same') {
      const row = classes.find((item) => item.id === classId) ?? classes[0]
      return {
        name: row?.name ?? '',
        catalogData: null as Record<string, unknown> | null,
      }
    }
    return {
      name: newClassName,
      catalogData: newCatalogData,
    }
  }, [mode, classes, classId, newClassName, newCatalogData])

  const hitDie = useMemo(
    () =>
      hitDieForClass({
        className: targetClass.name,
        catalogData: targetClass.catalogData,
      }),
    [targetClass],
  )

  const averageGain = hitDie ? averageHpGain(hitDie, constitutionMod) : null

  const multiclassGate = useMemo(() => {
    if (mode !== 'multiclass') return null
    if (!newClassName.trim()) return null
    return canTakeMulticlassLevel({
      newClassName,
      currentClassNames,
      abilities,
    })
  }, [mode, newClassName, currentClassNames, abilities])

  const hpGain =
    hpMode === 'average'
      ? averageGain
      : manualHp == null
        ? null
        : Math.floor(manualHp)

  const canConfirm = (() => {
    if (hpGain == null || !Number.isFinite(hpGain)) return false
    if (mode === 'same') {
      return Boolean(classId && classes.some((row) => row.id === classId))
    }
    if (!newCatalogId || !newClassName.trim()) return false
    return multiclassGate?.ok === true
  })()

  const filterEligibleClassStable = useCallback(
    (entry: CatalogEntry) =>
      isClassEligibleForMulticlass({
        className: entry.name_ru,
        currentClassNames,
        abilities,
      }),
    [currentClassNames, abilities],
  )

  return (
    <Dialog
      open={open}
      title="Прокачка"
      primaryLabel="Дальше"
      secondaryLabel="Отмена"
      primaryDisabled={!canConfirm}
      onPrimary={() => {
        if (!canConfirm || hpGain == null) return
        if (mode === 'same') {
          onConfirm({ type: 'same', classId, hpGain, hitDie })
          return
        }
        onConfirm({
          type: 'multiclass',
          name: newClassName.trim(),
          catalog_id: newCatalogId,
          catalog_slug: newCatalogSlug,
          catalog_data: newCatalogData,
          hpGain,
          hitDie,
        })
      }}
      onSecondary={onClose}
    >
      <Stack gap={12}>
        <Text tone="muted">
          Шаг 1: куда идёт уровень и сколько HP. Дальше откроется мастер умений / ASI (или итог
          прокачки, если выборов нет). Мультикласс — пороги характеристик PHB 2014.
        </Text>

        <div className="chip-row">
          <button
            type="button"
            className={`sheet-chip${mode === 'same' ? ' is-on' : ''}`}
            onClick={() => setMode('same')}
          >
            Этот класс
          </button>
          <button
            type="button"
            className={`sheet-chip${mode === 'multiclass' ? ' is-on' : ''}`}
            onClick={() => setMode('multiclass')}
          >
            Мультикласс
          </button>
        </div>

        {mode === 'same' ? (
          <Field label="Класс для +1">
            <select
              className="play-select"
              value={classId}
              onChange={(event) => setClassId(event.target.value)}
            >
              {classes.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name || 'Без названия'} · сейчас {row.level}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Stack gap={8}>
            <Field
              label="Новый класс"
              hint="Только из справочника. В списке — классы, которым хватает характеристик (новый + уже взятые)."
            >
              <CatalogCombobox
                kind="class"
                edition={edition}
                value={newClassName}
                placeholder="Начните вводить класс"
                filterEntry={filterEligibleClassStable}
                onChange={(value, selected) => {
                  setNewClassName(value)
                  setNewCatalogId(selected?.id ?? null)
                  setNewCatalogSlug(selected?.slug ?? null)
                  setNewCatalogData(selected?.data ?? null)
                }}
              />
            </Field>
            {multiclassGate && !multiclassGate.ok ? (
              <Text tone="danger">{multiclassGate.reason}</Text>
            ) : null}
            <Text tone="muted">
              Как на create: пороги PHB на новый класс и на уже взятые. Не хватает характеристик —
              класс не выбрать, пока не поднимешь ASI / не перераспределишь.
            </Text>
          </Stack>
        )}

        <Field label="Хиты за уровень">
          <div className="chip-row">
            <button
              type="button"
              className={`sheet-chip${hpMode === 'average' ? ' is-on' : ''}`}
              onClick={() => setHpMode('average')}
            >
              Среднее
            </button>
            <button
              type="button"
              className={`sheet-chip${hpMode === 'manual' ? ' is-on' : ''}`}
              onClick={() => setHpMode('manual')}
            >
              Вручную
            </button>
          </div>
        </Field>

        {hpMode === 'average' ? (
          <Text tone="muted">
            {hitDie && averageGain != null
              ? `Среднее по ${hitDie}: ⌊${hitDie.slice(1)}/2⌋+1 + ТЕЛ (${constitutionMod >= 0 ? '+' : ''}${constitutionMod}) = +${averageGain} к макс. HP`
              : 'Не удалось определить кость хитов класса — выбери класс из справочника или введи HP вручную.'}
          </Text>
        ) : (
          <Field label="Прибавка к макс. HP" hint="Бросок кости + модификатор ТЕЛ">
            <NumberInput
              min={1}
              emptyValue={null}
              value={manualHp}
              onValueChange={setManualHp}
            />
          </Field>
        )}

        {!canConfirm ? (
          <Text tone="muted">
            {mode === 'same'
              ? hitDie == null && hpMode === 'average'
                ? 'Нужна кость хитов класса или ручной ввод HP.'
                : hpMode === 'manual' && manualHp == null
                  ? 'Укажи прибавку к HP.'
                  : 'Выбери класс, в который идёт уровень.'
              : multiclassGate && !multiclassGate.ok
                ? multiclassGate.reason
                : !newCatalogId
                  ? 'Выбери класс из справочника (не свободный текст).'
                  : hpMode === 'manual' && manualHp == null
                    ? 'Укажи прибавку к HP.'
                    : hitDie == null && hpMode === 'average'
                      ? 'Нужна кость хитов или ручной ввод HP.'
                      : 'Укажи новый класс из справочника.'}
          </Text>
        ) : null}
      </Stack>
    </Dialog>
  )
}
