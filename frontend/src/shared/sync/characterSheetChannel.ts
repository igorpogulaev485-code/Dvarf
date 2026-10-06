export type SheetSyncMessage =
  | {
      type: 'sheet-saved'
      characterId: string
      sheetVersion: number
      sourceTabId: string
    }
  | {
      type: 'sheet-opened'
      characterId: string
      sheetVersion: number
      sourceTabId: string
    }

const CHANNEL_NAME = 'dvarf.character-sheet'

export const sheetTabId =
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `tab-${Math.random().toString(36).slice(2)}`

export function createSheetSyncChannel(
  onMessage: (message: SheetSyncMessage) => void,
): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') {
    return null
  }
  const channel = new BroadcastChannel(CHANNEL_NAME)
  channel.onmessage = (event: MessageEvent<SheetSyncMessage>) => {
    const data = event.data
    if (!data || typeof data !== 'object' || !('type' in data)) {
      return
    }
    if (data.sourceTabId === sheetTabId) {
      return
    }
    onMessage(data)
  }
  return channel
}

export function publishSheetSync(
  channel: BroadcastChannel | null,
  message: Omit<SheetSyncMessage, 'sourceTabId'>,
): void {
  channel?.postMessage({ ...message, sourceTabId: sheetTabId })
}
