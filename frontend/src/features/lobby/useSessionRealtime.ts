import { useEffect, useRef } from 'react'
import { getAccessToken } from '../../shared/api/client'
import { sessionWsUrl, type SessionDetail, type SessionEvent } from '../../shared/api/lobbies'

type SessionWsMessage =
  | { type: 'session_event'; event: SessionEvent }
  | { type: 'session_update'; session: SessionDetail }
  | { type: 'pong' | 'ping' | string; event?: undefined; session?: undefined }

type Handlers = {
  onEvent?: (event: SessionEvent) => void
  onSessionUpdate?: (session: SessionDetail) => void
}

/**
 * Подписка на живую шину сессии. Переподключается при смене sessionId.
 */
export function useSessionRealtime(
  sessionId: string | null | undefined,
  handlers: Handlers,
): { connected: boolean } {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers
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
            handlersRef.current.onEvent?.(data.event)
          }
          if (data.type === 'session_update' && data.session) {
            handlersRef.current.onSessionUpdate?.(data.session)
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
