import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ClassicBackgroundPicker } from '../features/classicSheet/ClassicBackgroundPicker'
import { ClassicPrintSheet } from '../features/classicSheet/ClassicPrintSheet'
import type { ClassicPatch } from '../features/classicSheet/fromApi'
import {
  getCharacter,
  updateCharacter,
  type CharacterDetail,
} from '../shared/api/characters'
import { ApiRequestError } from '../shared/api/client'
import {
  createSheetSyncChannel,
  publishSheetSync,
} from '../shared/sync/characterSheetChannel'
import { Button, Text } from '../ui'

export function ClassicSheetPage() {
  const { characterId = '' } = useParams()
  const navigate = useNavigate()
  const [character, setCharacter] = useState<CharacterDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'saving' | 'saved'>('loading')
  const saveTimer = useRef<number | null>(null)
  const versionRef = useRef(0)
  const latestRef = useRef<CharacterDetail | null>(null)
  const channelRef = useRef(createSheetSyncChannel(() => undefined))

  useEffect(() => {
    let active = true
    getCharacter(characterId)
      .then((item) => {
        if (!active) return
        setCharacter(item)
        latestRef.current = item
        versionRef.current = item.sheet_version
        setStatus('saved')
      })
      .catch((err: unknown) => {
        if (!active) return
        if (err instanceof ApiRequestError && err.status === 401) {
          navigate('/login', { replace: true })
          return
        }
        setError(err instanceof ApiRequestError ? err.message : 'Не удалось открыть персонажа')
        setStatus('saved')
      })
    return () => {
      active = false
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
      channelRef.current?.close()
    }
  }, [characterId, navigate])

  const persist = useCallback(async () => {
    const next = latestRef.current
    if (!next) return
    setStatus('saving')
    try {
      const updated = await updateCharacter(next.id, {
        sheet_version: versionRef.current,
        name: next.name,
        level: next.level,
        class_name: next.class_name,
        race_name: next.race_name,
        hp_current: next.hp_current,
        hp_max: next.hp_max,
        sheet: next.sheet,
      })
      versionRef.current = updated.sheet_version
      latestRef.current = updated
      setCharacter(updated)
      setStatus('saved')
      publishSheetSync(channelRef.current, {
        type: 'sheet-saved',
        characterId: updated.id,
        sheetVersion: updated.sheet_version,
      })
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Не удалось сохранить лист')
      setStatus('saved')
    }
  }, [])

  const handlePatch = useCallback((patch: ClassicPatch) => {
    const current = latestRef.current
    if (!current) return
    const next: CharacterDetail = {
      ...current,
      name: patch.name ?? current.name,
      level: patch.level ?? current.level,
      class_name: patch.class_name === undefined ? current.class_name : patch.class_name,
      race_name: patch.race_name === undefined ? current.race_name : patch.race_name,
      hp_current: patch.hp_current === undefined ? current.hp_current : patch.hp_current,
      hp_max: patch.hp_max === undefined ? current.hp_max : patch.hp_max,
      sheet: patch.sheet ?? current.sheet,
    }
    latestRef.current = next
    setCharacter(next)
    setStatus('saving')
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      void persist()
    }, 500)
  }, [persist])

  return (
    <div className="classic-print-page">
      <header className="classic-print-toolbar no-print">
        <div>
          <Link to={character ? `/characters/${character.id}` : '/characters'}>← К карточке</Link>
          <div>
            {character?.name || 'Классический лист'}
            <small>
              {status === 'loading'
                ? 'Загрузка…'
                : status === 'saving'
                  ? 'Сохраняем в карточку…'
                  : 'Сохранено в персонажа'}
            </small>
          </div>
        </div>
        <Button variant="secondary" onClick={() => window.print()}>
          Печать / PDF
        </Button>
      </header>
      {error ? (
        <Text tone="danger" className="no-print">
          {error}
        </Text>
      ) : null}
      {toast ? (
        <div className="no-print" style={{ padding: '0 1.25rem' }}>
          <Text>{toast}</Text>
        </div>
      ) : null}
      {character ? (
        <>
          <div style={{ padding: '0.75rem 1.25rem 0' }}>
            <ClassicBackgroundPicker
              character={character}
              onPatch={handlePatch}
              onToast={(message) => {
                setToast(message)
                window.setTimeout(() => setToast(null), 4000)
              }}
            />
          </div>
          <ClassicPrintSheet character={character} onPatch={handlePatch} />
        </>
      ) : null}
    </div>
  )
}
