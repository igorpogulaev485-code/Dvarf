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
  if (typeof document !== 'undefined' && document.documentElement.dataset.deskWindows === '1') {
    return (
      <Dialog
        open
        title="Временные хиты"
        primaryLabel="Закрыть"
        onPrimary={() => request.resolve('keep')}
        showActions={false}
        showClose
        onDismiss={() => request.resolve('keep')}
        className="desk-temp-hp"
      >
        <div className="confirm-box">
          <p>
            У тебя уже есть <b>{current}</b> врем. хитов. Заменить на <b>{incoming}</b> или оставить{' '}
            <b>{current}</b>?
          </p>
          <p className="pad-note">
            По правилам D&D временные хиты не складываются — остаётся один пул.
          </p>
          <div className="pad-row">
            <button type="button" className="btn primary" onClick={() => request.resolve('replace')}>
              Заменить на {incoming}
            </button>
            <button type="button" className="btn" onClick={() => request.resolve('keep')}>
              Оставить {current}
            </button>
          </div>
        </div>
      </Dialog>
    )
  }

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
