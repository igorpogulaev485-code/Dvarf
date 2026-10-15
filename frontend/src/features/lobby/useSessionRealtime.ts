import { useEffect, useRef } from 'react'
import { getAccessToken } from '../../shared/api/client'
import { sessionWsUrl, type SessionEvent } from '../../shared/api/lobbies'

type SessionWsMessage =
  | { type: 'session_event'; event: SessionEvent }
  | { type: string; [key: string]: unknown }

/**
 * Подписка на живую шину сессии. Переподключается при смене sessionId.
 * onEvent стабилизируется через ref — можно передавать inline-колбэк.
 */
export function useSessionRealtime(
  sessionId: string | null | undefined,
  onEvent: (event: SessionEvent) => void,
): { connected: boolean } {
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent
  const connectedRef = useRef(false)

  useEffect(() => {
    if (!sessionId) return
    const token = getAccessToken()
    if (!token) return

    let closed = false
    let ws: WebSocket | null = null
    let pingTimer: ReturnType<typeof setInterval> | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let attempt = 0

    function clearTimers() {
      if (pingTimer) {
        clearInterval(pingTimer)
        pingTimer = null
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
    }

    function connect() {
      if (closed) return
      const access = getAccessToken()
      if (!access || !sessionId) return
      ws = new WebSocket(sessionWsUrl(sessionId, access))
      ws.onopen = () => {
        connectedRef.current = true
        attempt = 0
        pingTimer = setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send('ping')
          }
        }, 25000)
      }
      ws.onmessage = (msg) => {
        try {
          const data = JSON.parse(String(msg.data)) as SessionWsMessage
          if (data.type === 'session_event' && data.event) {
            onEventRef.current(data.event)
          }
        } catch {
          // ignore non-json
        }
      }
      ws.onclose = () => {
        connectedRef.current = false
        clearTimers()
        if (closed) return
        const delay = Math.min(15000, 1000 * 2 ** attempt)
        attempt += 1
        reconnectTimer = setTimeout(connect, delay)
      }
      ws.onerror = () => {
        ws?.close()
      }
    }

    connect()

    return () => {
      closed = true
      connectedRef.current = false
      clearTimers()
      ws?.close()
    }
  }, [sessionId])

  return { connected: connectedRef.current }
}
