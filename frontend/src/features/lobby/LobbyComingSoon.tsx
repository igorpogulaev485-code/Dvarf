import { EmptyState, Panel } from '../../ui'

type Props = {
  title: string
  description: string
}

export function LobbyComingSoon({ title, description }: Props) {
  return (
    <Panel title={title}>
      <EmptyState title="Скоро" description={description} />
    </Panel>
  )
}
