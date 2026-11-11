import { useMemo } from 'react'
import type { FeaturePicksState } from '../../shared/dnd/featurePicks'
import {
  listKnownFavoredEnemies,
  listKnownFavoredTerrains,
} from '../../shared/dnd/rangerFavoredDesk'
import { Button, Dialog, Stack, Text } from '../../ui'

type RangerFavoredDeskDialogProps = {
  open: boolean
  classEntryId: string
  featurePicks: FeaturePicksState
  onToast: (message: string) => void
  onClose: () => void
}

export function RangerFavoredDeskDialog({
  open,
  classEntryId,
  featurePicks,
  onToast,
  onClose,
}: RangerFavoredDeskDialogProps) {
  const enemies = useMemo(
    () => listKnownFavoredEnemies(featurePicks, classEntryId),
    [featurePicks, classEntryId],
  )
  const terrains = useMemo(
    () => listKnownFavoredTerrains(featurePicks, classEntryId),
    [featurePicks, classEntryId],
  )

  return (
    <Dialog
      open={open}
      title="Избранное следопыта"
      size="wide"
      primaryLabel="Закрыть"
      onPrimary={onClose}
      secondaryLabel="Отмена"
      onSecondary={onClose}
    >
      <Stack gap={14}>
        <Text tone="muted">
          Враги и местности с листа. Тост — отметить, что применил преимущество /
          осведомлённость (ячейку трать отдельно в умении).
        </Text>

        <div>
          <Text>
            <strong>Избранные враги</strong>
          </Text>
          {enemies.length === 0 ? (
            <Text tone="muted">Не выбраны — умение 1 ур.</Text>
          ) : (
            <div className="sorcery-spend-list">
              {enemies.map((row) => (
                <div key={row.id} className="sorcery-spend-row">
                  <div className="sorcery-spend-row__text">
                    <b>{row.nameRu}</b>
                    <span>Преимущество на Выживание / знания о типе</span>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => onToast(`Избранный враг: ${row.nameRu}`)}
                  >
                    Ок
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <Text>
            <strong>Избранные местности</strong>
          </Text>
          {terrains.length === 0 ? (
            <Text tone="muted">Не выбраны — умение 1 ур.</Text>
          ) : (
            <div className="sorcery-spend-list">
              {terrains.map((row) => (
                <div key={row.id} className="sorcery-spend-row">
                  <div className="sorcery-spend-row__text">
                    <b>{row.nameRu}</b>
                    <span>Исследователь природы / путешествие</span>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => onToast(`Избранная местность: ${row.nameRu}`)}
                  >
                    Ок
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Stack>
    </Dialog>
  )
}
