import { useEffect, useRef } from 'react'
import { getAccessToken } from '../../shared/api/client'
import { lobbyWsUrl } from '../../shared/api/chat'

type LobbyWsHandler = (data: { type: string; [key: string]: unknown }) => void

export function useLobbyRealtime(
  lobbyId: string | null | undefined,
  onMessage: LobbyWsHandler,
): void {
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  useEffect(() => {
    if (!lobbyId) return
    const token = getAccessToken()
    if (!token) return

    let closed = false
    let ws: WebSocket | null = null
    let pingTimer: ReturnType<typeof setInterval> | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let attempt = 0

    function clearTimers() {
      if (pingTimer) clearInterval(pingTimer)
      if (reconnectTimer) clearTimeout(reconnectTimer)
      pingTimer = null
      reconnectTimer = null
    }

    function connect() {
      if (closed) return
      const access = getAccessToken()
      if (!access || !lobbyId) return
      ws = new WebSocket(lobbyWsUrl(lobbyId, access))
      ws.onopen = () => {
        attempt = 0
        pingTimer = setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) ws.send('ping')
        }, 25000)
      }
      ws.onmessage = (msg) => {
        try {
          const data = JSON.parse(String(msg.data)) as { type: string }
          onMessageRef.current(data)
        } catch {
          // ignore
        }
      }
      ws.onclose = () => {
        clearTimers()
        if (closed) return
        const delay = Math.min(15000, 1000 * 2 ** attempt)
        attempt += 1
        reconnectTimer = setTimeout(connect, delay)
      }
      ws.onerror = () => ws?.close()
    }

    connect()
    return () => {
      closed = true
      clearTimers()
      ws?.close()
    }
  }, [lobbyId])
}
