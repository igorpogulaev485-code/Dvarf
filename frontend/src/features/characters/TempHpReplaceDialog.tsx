/** B-08 / Р4: leave or replace temporary hit points; highlight the larger pool. */
import { Dialog, Stack, Text } from '../../ui'

export type TempHpReplaceRequest = {
  current: number
  incoming: number
  resolve: (choice: 'keep' | 'replace') => void
}

type Props = {
  request: TempHpReplaceRequest | null
}

export function TempHpReplaceDialog({ request }: Props) {
  if (!request) return null
  const { current, incoming } = request
  const larger = incoming > current ? 'replace' : incoming < current ? 'keep' : 'equal'
  const preferReplace = larger === 'replace'
  return (
    <Dialog
      open
      title="Временные хиты"
      primaryLabel={preferReplace ? `Заменить на ${incoming} · больше` : `Заменить на ${incoming}`}
      secondaryLabel={
        preferReplace ? `Оставить ${current}` : `Оставить ${current}${larger === 'keep' ? ' · больше' : ''}`
      }
      primaryVariant="primary"
      onPrimary={() => request.resolve('replace')}
      onSecondary={() => request.resolve('keep')}
    >
      <Stack gap={10}>
        <Text>
          У вас уже есть временные хиты. Они не складываются — выберите один пул.
        </Text>
        <div className="chip-row" role="group" aria-label="Выбор пула временных хитов">
          <span className={`sheet-chip${larger !== 'replace' ? ' is-on' : ''}`}>
            Сейчас {current}
          </span>
          <span className={`sheet-chip${larger !== 'keep' ? ' is-on' : ''}`}>
            Новые {incoming}
          </span>
        </div>
      </Stack>
    </Dialog>
  )
}
