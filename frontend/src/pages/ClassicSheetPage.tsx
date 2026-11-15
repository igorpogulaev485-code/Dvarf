import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ClassicPrintSheet } from '../features/classicSheet/ClassicPrintSheet'
import { ClassicSheetUiProvider } from '../features/classicSheet/classicSheetUi'
import type { ClassicPatch } from '../features/classicSheet/fromApi'
import { asRecord } from '../features/characters/sheetTypes'
import {
  classicPrintFontFamilyCss,
  isClassicPrintSettingsOnlyPatch,
  readClassicExtraNotePages,
  readClassicPencilBlanks,
  readClassicPrintColor,
  readClassicTextStyle,
  resetClassicPrintTextSettings,
  setClassicExtraNotePages,
  setClassicPencilBlanks,
  setClassicPrintColor,
  setClassicTextStyle,
  type ClassicLineHeight,
  type ClassicPrintColorMode,
  type ClassicPrintFontFamily,
  type ClassicTextAlign,
} from '../features/classicSheet/classicPrintSettings'
import {
  readClassicSheetLayout,
  setClassicSheetLayout,
  type ClassicSheetLayout,
} from '../features/classicSheet/classicSheetLayout'
import {
  getCharacter,
  updateCharacter,
  type CharacterDetail,
} from '../shared/api/characters'
import { ApiRequestError } from '../shared/api/client'
import { Button, Text } from '../ui'

export function ClassicSheetPage() {
  const { characterId = '' } = useParams()
  const navigate = useNavigate()
  const [character, setCharacter] = useState<CharacterDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'saving' | 'ready'>('loading')
  const [editing, setEditing] = useState(false)
  /** Optimistic layout so switcher is-active matches the sheet before save round-trip. */
  const [layoutOverride, setLayoutOverride] = useState<ClassicSheetLayout | null>(null)
  const saveTimer = useRef<number | null>(null)
  const versionRef = useRef(0)
  const latestRef = useRef<CharacterDetail | null>(null)

  useEffect(() => {
    let active = true
    setLayoutOverride(null)
    getCharacter(characterId)
      .then((item) => {
        if (!active) return
        setCharacter(item)
        latestRef.current = item
        versionRef.current = item.sheet_version
        setStatus('ready')
      })
      .catch((err: unknown) => {
        if (!active) return
        if (err instanceof ApiRequestError && err.status === 401) {
          navigate('/login', { replace: true })
          return
        }
        setError(err instanceof ApiRequestError ? err.message : 'Не удалось открыть персонажа')
        setStatus('ready')
      })
    return () => {
      active = false
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
    }
  }, [characterId, navigate])

  const persistPrintSettings = useCallback(async (next: CharacterDetail) => {
    setStatus('saving')
    try {
      const updated = await updateCharacter(next.id, {
        sheet_version: versionRef.current,
        sheet: next.sheet,
      })
      versionRef.current = updated.sheet_version
      latestRef.current = updated
      setCharacter(updated)
      setLayoutOverride(null)
      setStatus('ready')
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Не удалось сохранить настройки печати')
      setStatus('ready')
    }
  }, [])

  const handlePrintSettings = useCallback(
    (patch: ClassicPatch) => {
      const current = latestRef.current
      if (!current) return
      if (!isClassicPrintSettingsOnlyPatch(current, patch)) {
        setError('Классический бланк только для печати — правки персонажа делайте в основном листе')
        return
      }
      const next: CharacterDetail = {
        ...current,
        sheet: patch.sheet ?? current.sheet,
      }
      latestRef.current = next
      setCharacter(next)
      setStatus('saving')
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
      saveTimer.current = window.setTimeout(() => {
        void persistPrintSettings(next)
      }, 500)
    },
    [persistPrintSettings],
  )

  const sheetLayout: ClassicSheetLayout =
    layoutOverride ?? (character ? readClassicSheetLayout(character) : '2014')
  const pencilBlanks = character ? readClassicPencilBlanks(character) : false
  const extraNotePages = character ? readClassicExtraNotePages(character) : 0
  const textStyle = character ? readClassicTextStyle(character) : null
  const printColor: ClassicPrintColorMode = character
    ? readClassicPrintColor(character)
    : 'bw'

  const handleLayoutChange = useCallback(
    (layout: ClassicSheetLayout) => {
      const current = latestRef.current
      if (!current) return
      setLayoutOverride(layout)
      handlePrintSettings(setClassicSheetLayout(current, layout))
    },
    [handlePrintSettings],
  )

  return (
    <div
      className="classic-print-page"
      data-classic-font={textStyle?.fontFamily ?? 'serif'}
      data-classic-leading={textStyle?.lineHeight ?? 'normal'}
      data-classic-color={printColor}
      data-classic-name-script={textStyle?.nameScript ? '1' : '0'}
      style={
        {
          ['--classic-ink-font']: classicPrintFontFamilyCss(
            textStyle?.fontFamily ?? 'serif',
          ),
        } as CSSProperties
      }
    >
      <header className="classic-print-toolbar no-print">
        <div>
          <Link to={character ? `/characters/${character.id}` : '/characters'}>
            ← К основному листу
          </Link>
          <div>
            {character?.name || 'Классический лист'}
            <small>
              {status === 'loading'
                ? 'Загрузка…'
                : status === 'saving'
                  ? 'Сохраняем настройки печати…'
                  : 'Только для печати'}
            </small>
          </div>
          <p className="classic-print-banner">
            Только для печати — правки делайте в{' '}
            <Link to={character ? `/characters/${character.id}` : '/characters'}>
              основном листе
            </Link>
          </p>
        </div>
        <div className="classic-toolbar-actions">
          <div className="classic-layout-switch" role="group" aria-label="Макет классического листа">
            <span className="classic-layout-switch__label">Макет</span>
            {(['2014', '2024'] as const).map((year) => (
              <button
                key={year}
                type="button"
                className={sheetLayout === year ? 'is-active' : undefined}
                aria-pressed={sheetLayout === year}
                disabled={!character}
                onClick={() => handleLayoutChange(year)}
              >
                {year}
              </button>
            ))}
            <span className="classic-layout-switch__hint">
              печатная форма · D&D 5e {sheetLayout}
            </span>
          </div>
          <label
            className="classic-pencil-toggle"
            title="Пустые строки в атаках, заклинаниях, монетах и т.п."
          >
            <input
              type="checkbox"
              checked={pencilBlanks}
              disabled={!character}
              onChange={(e) => {
                const current = latestRef.current
                if (!current) return
                handlePrintSettings(setClassicPencilBlanks(current, e.target.checked))
              }}
            />
            Линии под карандаш
          </label>
          <div className="classic-extra-notes" role="group" aria-label="Доп. страницы заметок">
            <button
              type="button"
              disabled={!character || extraNotePages <= 0}
              onClick={() => {
                const current = latestRef.current
                if (!current) return
                handlePrintSettings(setClassicExtraNotePages(current, extraNotePages - 1))
              }}
            >
              −
            </button>
            <span>Доп. страницы заметок: {extraNotePages}</span>
            <button
              type="button"
              disabled={!character || extraNotePages >= 12}
              onClick={() => {
                const current = latestRef.current
                if (!current) return
                handlePrintSettings(setClassicExtraNotePages(current, extraNotePages + 1))
              }}
            >
              +
            </button>
          </div>
          <div className="classic-color-switch" role="group" aria-label="Цвет печати">
            {([
              ['bw', 'Чёрно-белая'],
              ['color', 'Цвет'],
            ] as const).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                className={printColor === mode ? 'is-active' : undefined}
                aria-pressed={printColor === mode}
                disabled={!character}
                onClick={() => {
                  const current = latestRef.current
                  if (!current) return
                  handlePrintSettings(setClassicPrintColor(current, mode))
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={['classic-edit-toggle', editing ? 'is-active' : ''].filter(Boolean).join(' ')}
            aria-pressed={editing}
            disabled={!character}
            onClick={() => setEditing((v) => !v)}
            title="Размер шрифта блоков, гарнитура, интервал, высота полей"
          >
            Правка печати
          </button>
          <Link className="classic-blank-link" to={`/classic/blank?layout=${sheetLayout}`}>
            Пустой бланк
          </Link>
          <div className="classic-print-cta">
            <Button variant="secondary" onClick={() => window.print()}>
              Печать / PDF
            </Button>
            <small>В диалоге печати выберите «Сохранить как PDF»</small>
          </div>
        </div>
      </header>

      {editing && character && textStyle ? (
        <div className="classic-print-typo no-print" aria-label="Настройки текста для печати">
          <label>
            Гарнитура
            <select
              value={textStyle.fontFamily}
              onChange={(e) =>
                handlePrintSettings(
                  setClassicTextStyle(character, {
                    fontFamily: e.target.value as ClassicPrintFontFamily,
                  }),
                )
              }
            >
              <option value="serif">Source Serif 4</option>
              <option value="sans">IBM Plex Sans</option>
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={textStyle.nameScript}
              onChange={(e) =>
                handlePrintSettings(
                  setClassicTextStyle(character, { nameScript: e.target.checked }),
                )
              }
            />
            Имя рукописным
          </label>
          <label>
            Интервал
            <select
              value={textStyle.lineHeight}
              onChange={(e) =>
                handlePrintSettings(
                  setClassicTextStyle(character, {
                    lineHeight: e.target.value as ClassicLineHeight,
                  }),
                )
              }
            >
              <option value="tight">Плотно</option>
              <option value="normal">Обычно</option>
              <option value="loose">Свободно</option>
            </select>
          </label>
          <label>
            Выравнивание
            <select
              value={textStyle.align}
              onChange={(e) =>
                handlePrintSettings(
                  setClassicTextStyle(character, {
                    align: e.target.value as ClassicTextAlign,
                  }),
                )
              }
            >
              <option value="left">Слева</option>
              <option value="justify">По ширине</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => handlePrintSettings(resetClassicPrintTextSettings(character))}
          >
            Сбросить настройки текста
          </button>
          <p className="classic-print-typo__hint">
            Гарнитура — на все вписанные значения; подписи бланка не меняются. Размер у блока
            7–14 pt, автоподгонка не ниже 7 pt. Высоту блока тяните за нижний край.
          </p>
        </div>
      ) : null}

      {error ? (
        <Text tone="danger" className="no-print">
          {error}
        </Text>
      ) : null}
      {character ? (
        <ClassicSheetUiProvider
          editing={editing}
          textStyle={textStyle ?? undefined}
          pencilBlanks={pencilBlanks}
        >
          <ClassicPrintSheet
            character={character}
            onPrintSettings={handlePrintSettings}
            layout={sheetLayout}
          />
        </ClassicSheetUiProvider>
      ) : null}
    </div>
  )
}

/** Exported for selfcheck — ensures print PATCH never carries game fields. */
export function classicPrintUpdatePayload(character: CharacterDetail): {
  sheet_version: number
  sheet: Record<string, unknown>
} {
  return {
    sheet_version: character.sheet_version,
    sheet: asRecord(character.sheet),
  }
}
