import { useMemo } from 'react'
import {
  invocationById,
  type WarlockInvocationDef,
} from '../../shared/dnd/warlockInvocations'
import {
  getFeaturePickList,
  type FeaturePicksState,
} from '../../shared/dnd/featurePicks'
import { Button, Dialog, Stack, Text } from '../../ui'

type WarlockInvocationsDialogProps = {
  open: boolean
  classEntryId: string
  featurePicks: FeaturePicksState
  onToast: (message: string) => void
  onClose: () => void
}

export function listKnownInvocations(
  featurePicks: FeaturePicksState,
  classEntryId: string,
): WarlockInvocationDef[] {
  const ids = getFeaturePickList(
    featurePicks,
    classEntryId,
    'eldritch_invocations',
  )
  const rows: WarlockInvocationDef[] = []
  for (const id of ids) {
    const def = invocationById(id)
    if (def) rows.push(def)
  }
  return rows
}

export function WarlockInvocationsDialog({
  open,
  classEntryId,
  featurePicks,
  onToast,
  onClose,
}: WarlockInvocationsDialogProps) {
  const known = useMemo(
    () => listKnownInvocations(featurePicks, classEntryId),
    [featurePicks, classEntryId],
  )

  return (
    <Dialog
      open={open}
      title="Мистические воззвания"
      size="wide"
      primaryLabel="Закрыть"
      onPrimary={onClose}
      secondaryLabel="Отмена"
      onSecondary={onClose}
    >
      <Stack gap={14}>
        <Text tone="muted">
          Известные воззвания. Пассивные просто справочник; «по желанию» —
          отметь использование тостом (ячейку не тратит).
        </Text>

        {known.length === 0 ? (
          <Text tone="muted">
            Нет воззваний — выбери их в умении «Мистические воззвания».
          </Text>
        ) : (
          <div className="sorcery-spend-list">
            {known.map((def) => (
              <div key={def.id} className="sorcery-spend-row">
                <div className="sorcery-spend-row__text">
                  <b>{def.nameRu}</b>
                  <span>{def.summaryRu}</span>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onToast(`${def.nameRu}: использовано`)}
                >
                  Ок
                </Button>
              </div>
            ))}
          </div>
        )}
      </Stack>
    </Dialog>
  )
}
