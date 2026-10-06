import type { CSSProperties, ReactNode } from 'react'

type StackProps = {
  children: ReactNode
  gap?: number
  className?: string
}

export function Stack({ children, gap = 12, className = '' }: StackProps) {
  const style = { '--stack-gap': `${gap}px` } as CSSProperties
  return (
    <div className={`ui-stack ${className}`.trim()} style={style}>
      {children}
    </div>
  )
}
