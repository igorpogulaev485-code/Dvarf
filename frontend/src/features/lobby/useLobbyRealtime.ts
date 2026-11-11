import { useEffect, useRef } from 'react'
import { getAccessToken } from '../../shared/api/client'
import { lobbyWsUrl } from '../../shared/api/chat'
import {
  WS_OFFLINE_POLL_MS,
  WS_PING_INTERVAL_MS,
  nextPingState,
  offlinePollDue,
} from './wsKeepalive'

type LobbyWsHandler = (data: { type: string; [key: string]: unknown }) => void

export function useLobbyRealtime(
  lobbyId: string | null | undefined,
  onMessage: LobbyWsHandler,
  onReconnect?: () => void,
): void {
  const onMessageRef = useRef(onMessage)
  const onReconnectRef = useRef(onReconnect)
  onMessageRef.current = onMessage
  onReconnectRef.current = onReconnect

  useEffect(() => {
    if (!lobbyId) return
    const token = getAccessToken()
    if (!token) return

    let closed = false
    let openedOnce = false
    let unanswered = 0
    let offlineSince: number | null = Date.now()
    let ws: WebSocket | null = null
    let pingTimer: ReturnType<typeof setInterval> | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let pollTimer: ReturnType<typeof setInterval> | null = null
    let attempt = 0

    function clearSocketTimers() {
      if (pingTimer) clearInterval(pingTimer)
      if (reconnectTimer) clearTimeout(reconnectTimer)
      pingTimer = null
      reconnectTimer = null
    }

    pollTimer = setInterval(() => {
      if (closed) return
      if (ws?.readyState === WebSocket.OPEN) return
      if (offlineSince == null) return
      if (!offlinePollDue(Date.now() - offlineSince)) return
      onReconnectRef.current?.()
    }, WS_OFFLINE_POLL_MS)

    function connect() {
      if (closed) return
      const access = getAccessToken()
      if (!access || !lobbyId) return
      ws = new WebSocket(lobbyWsUrl(lobbyId, access))
      ws.onopen = () => {
        if (closed) return
        offlineSince = null
        unanswered = 0
        const isReconnect = openedOnce
        openedOnce = true
        attempt = 0
        if (pingTimer) clearInterval(pingTimer)
        pingTimer = setInterval(() => {
          const socket = ws
          if (!socket || socket.readyState !== WebSocket.OPEN) return
          const step = nextPingState(unanswered)
          if (step.close) {
            socket.close()
            return
          }
          unanswered = step.unanswered
          socket.send('ping')
        }, WS_PING_INTERVAL_MS)
        if (isReconnect) onReconnectRef.current?.()
      }
      ws.onmessage = (msg) => {
        try {
          const data = JSON.parse(String(msg.data)) as { type: string }
          if (data.type === 'pong') unanswered = 0
          onMessageRef.current(data)
        } catch {
          // ignore
        }
      }
      ws.onclose = () => {
        clearSocketTimers()
        if (offlineSince == null) offlineSince = Date.now()
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
      clearSocketTimers()
      if (pollTimer) clearInterval(pollTimer)
      ws?.close()
    }
  }, [lobbyId])
}
