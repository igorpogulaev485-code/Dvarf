/** L-07: суммарный бейдж чатов для вкладки хаба. */

type ChatsBadge = {
  letters: number
  channels: number
  whispers: number
  total: number
}

function hubChatsBadgeCount(tab: string, badge: ChatsBadge): number {
  return tab === 'chats' ? 0 : badge.total
}

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg)
}

assert(
  hubChatsBadgeCount('roster', { letters: 1, channels: 2, whispers: 3, total: 6 }) === 6,
  'show total off chats tab',
)
assert(
  hubChatsBadgeCount('chats', { letters: 1, channels: 2, whispers: 3, total: 6 }) === 0,
  'hide while on chats tab',
)
assert(
  hubChatsBadgeCount('notes', { letters: 0, channels: 0, whispers: 0, total: 0 }) === 0,
  'zero stays zero',
)

console.log('lobbyChatsBadge.selfcheck: ok')
