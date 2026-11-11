/**
 * C4: в тексте чата кликабельны пути /settings/:id и /settings/:id?page=:pageId
 */
import { Link } from 'react-router-dom'
import { Fragment, type ReactNode } from 'react'

const SETTING_PATH =
  /(?:^|[\s(])(\/settings\/[0-9a-fA-F-]{36}(?:\?page=[0-9a-fA-F-]{36})?)/g

function labelForPath(path: string): string {
  const pageMatch = path.match(/[?&]page=([0-9a-fA-F-]{36})/)
  if (pageMatch) return 'страница вики'
  return 'сеттинг'
}

export function ChatBodyText({ body }: { body: string }) {
  const nodes: ReactNode[] = []
  let last = 0
  const re = new RegExp(SETTING_PATH.source, 'g')
  let match: RegExpExecArray | null
  while ((match = re.exec(body)) !== null) {
    const full = match[0]
    const path = match[1]
    const prefixLen = full.length - path.length
    const start = match.index + prefixLen
    if (start > last) {
      nodes.push(body.slice(last, start))
    }
    nodes.push(
      <Link key={`${start}-${path}`} to={path} className="chat-message__wiki-link">
        {labelForPath(path)}
      </Link>,
    )
    last = start + path.length
  }
  if (last < body.length) nodes.push(body.slice(last))
  if (nodes.length === 0) return <>{body}</>
  return (
    <>
      {nodes.map((n, i) => (
        <Fragment key={i}>{n}</Fragment>
      ))}
    </>
  )
}
