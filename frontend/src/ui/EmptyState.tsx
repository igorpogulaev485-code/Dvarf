import type { ReactNode } from 'react'
import { Stack } from './Stack'
import { Text } from './Text'

type EmptyStateProps = {
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="ui-empty">
      <Stack gap={10}>
        <Text as="h2">{title}</Text>
        {description ? <Text tone="muted">{description}</Text> : null}
        {action}
      </Stack>
    </div>
  )
}
