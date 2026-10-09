import { Dialog, Stack, Text } from '../../ui'

export type LevelUpRecapFeature = {
  id: string
  nameRu: string
  summaryRu: string
  source: 'class' | 'subclass'
}

type LevelUpRecapDialogProps = {
  open: boolean
  characterLevel: number
  className: string
  classLevel: number
  hpGain: number
  features: LevelUpRecapFeature[]
  onClose: () => void
}

export function LevelUpRecapDialog({
  open,
  characterLevel,
  className,
  classLevel,
  hpGain,
  features,
  onClose,
}: LevelUpRecapDialogProps) {
  return (
    <Dialog
      open={open}
      title={`Прокачка · ур. ${characterLevel}`}
      primaryLabel="Готово"
      onPrimary={onClose}
      onSecondary={onClose}
      secondaryLabel="Закрыть"
    >
      <Stack gap={12}>
        <Text>
          {className.trim() || 'Класс'} {classLevel}
          {hpGain > 0 ? ` · HP +${hpGain}` : ''}
        </Text>
        {features.length > 0 ? (
          <Stack gap={8}>
            <Text tone="muted">Новые умения на этом уровне:</Text>
            <ul className="level-up-recap__list">
              {features.map((feature) => (
                <li key={feature.id} className="level-up-recap__item">
                  <strong>
                    {feature.nameRu}
                    {feature.source === 'subclass' ? ' · архетип' : ''}
                  </strong>
                  {feature.summaryRu.trim() ? (
                    <span className="level-up-recap__summary">{feature.summaryRu}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </Stack>
        ) : (
          <Text tone="muted">
            На этом уровне нет отдельных выборов — хиты и слоты уже обновлены. Умения смотри в
            блоке классовых способностей.
          </Text>
        )}
      </Stack>
    </Dialog>
  )
}
