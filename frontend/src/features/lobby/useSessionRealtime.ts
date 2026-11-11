import { useEffect, useRef } from 'react'
import { getAccessToken } from '../../shared/api/client'
import { sessionWsUrl, type SessionDetail, type SessionEvent } from '../../shared/api/lobbies'
import {
  WS_OFFLINE_POLL_MS,
  WS_PING_INTERVAL_MS,
  nextPingState,
  offlinePollDue,
} from './wsKeepalive'

type SessionWsMessage =
  | { type: 'session_event'; event: SessionEvent }
  | { type: 'session_update'; session: SessionDetail }
  | { type: 'session_changed'; session_id?: string; event?: undefined; session?: undefined }
  | { type: 'pong' | 'ping' | string; event?: undefined; session?: undefined }

type Handlers = {
  onEvent?: (event: SessionEvent) => void
  onSessionUpdate?: (session: SessionDetail) => void
  /** Сигнал без чужого снимка: забрать GET /sessions/{id} своим токеном. */
  onSessionChanged?: () => void
  /** Сокет отваливался: добрать состояние, которое могли пропустить. */
  onReconnect?: () => void
}

/**
 * Подписка на живую шину сессии. Переподключается при смене sessionId.
 * Пока сокет не открыт дольше 10 с, раз в 15 с зовёт onReconnect.
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
      handlersRef.current.onReconnect?.()
    }, WS_OFFLINE_POLL_MS)

    function connect() {
      if (closed) return
      const access = getAccessToken()
      if (!access || !sessionId) return
      ws = new WebSocket(sessionWsUrl(sessionId, access))
      ws.onopen = () => {
        if (closed) return
        connectedRef.current = true
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
        if (isReconnect) handlersRef.current.onReconnect?.()
      }
      ws.onmessage = (msg) => {
        try {
          const data = JSON.parse(String(msg.data)) as SessionWsMessage
          if (data.type === 'pong') unanswered = 0
          if (data.type === 'session_event' && data.event) {
            handlersRef.current.onEvent?.(data.event)
          }
          if (data.type === 'session_update' && data.session) {
            handlersRef.current.onSessionUpdate?.(data.session)
          }
          if (data.type === 'session_changed') {
            handlersRef.current.onSessionChanged?.()
          }
        } catch {
          // ignore non-json
        }
      }
      ws.onclose = () => {
        connectedRef.current = false
        clearSocketTimers()
        if (offlineSince == null) offlineSince = Date.now()
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
      clearSocketTimers()
      if (pollTimer) clearInterval(pollTimer)
      ws?.close()
    }
  }, [sessionId])

  return { connected: connectedRef.current }
}
