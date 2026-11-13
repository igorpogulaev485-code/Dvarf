import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ClassicPrintSheet } from '../features/classicSheet/ClassicPrintSheet'
import {
  readClassicSheetLayout,
  setClassicSheetLayout,
  type ClassicSheetLayout,
} from '../features/classicSheet/classicSheetLayout'
import { ClassicSheetUiProvider } from '../features/classicSheet/classicSheetUi'
import type { ClassicPatch } from '../features/classicSheet/fromApi'
import { asRecord } from '../features/characters/sheetTypes'
import {
  CLASSIC_GLOBAL_FONT_SCALE_MAX,
  CLASSIC_GLOBAL_FONT_SCALE_MIN,
  isClassicPrintSettingsOnlyPatch,
  readClassicExtraNotePages,
  readClassicGlobalFontScale,
  readClassicPencilBlanks,
  readClassicTextStyle,
  resetClassicPrintTextSettings,
  setClassicExtraNotePages,
  setClassicGlobalFontScale,
  setClassicPencilBlanks,
  setClassicTextStyle,
  type ClassicLineHeight,
  type ClassicPrintFontFamily,
  type ClassicTextAlign,
} from '../features/classicSheet/classicPrintSettings'
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
  const saveTimer = useRef<number | null>(null)
  const versionRef = useRef(0)
  const latestRef = useRef<CharacterDetail | null>(null)

  useEffect(() => {
    let active = true
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

  const sheetLayout = character ? readClassicSheetLayout(character) : '2014'
  const pencilBlanks = character ? readClassicPencilBlanks(character) : false
  const extraNotePages = character ? readClassicExtraNotePages(character) : 0
  const textStyle = character ? readClassicTextStyle(character) : null
  const fontScale = character ? readClassicGlobalFontScale(character) : 1

  const handleLayoutChange = useCallback(
    (layout: ClassicSheetLayout) => {
      const current = latestRef.current
      if (!current) return
      handlePrintSettings(setClassicSheetLayout(current, layout))
    },
    [handlePrintSettings],
  )

  return (
    <div
      className="classic-print-page"
      data-classic-font={textStyle?.fontFamily ?? 'serif'}
      data-classic-leading={textStyle?.lineHeight ?? 'normal'}
      style={
        {
          ['--classic-global-font-scale']: String(fontScale),
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
                disabled={!character}
                onClick={() => handleLayoutChange(year)}
              >
                {year}
              </button>
            ))}
            <span className="classic-layout-switch__hint">печатная форма</span>
          </div>
          <label className="classic-pencil-toggle" title="Добавляет запасные пустые строки и страницы">
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
            Пустые поля под карандаш
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
            <span>Доп. заметки: {extraNotePages}</span>
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
              <option value="serif">С засечками (Source Serif 4)</option>
              <option value="sans">Без засечек (IBM Plex Sans)</option>
              <option value="script">Для имени (Pinyon Script)</option>
            </select>
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
          <label>
            <input
              type="checkbox"
              checked={textStyle.headingBold}
              onChange={(e) =>
                handlePrintSettings(
                  setClassicTextStyle(character, { headingBold: e.target.checked }),
                )
              }
            />
            Жирные заголовки
          </label>
          <label>
            <input
              type="checkbox"
              checked={textStyle.headingItalic}
              onChange={(e) =>
                handlePrintSettings(
                  setClassicTextStyle(character, { headingItalic: e.target.checked }),
                )
              }
            />
            Курсив заголовков
          </label>
          <label>
            Общий масштаб
            <input
              type="number"
              min={CLASSIC_GLOBAL_FONT_SCALE_MIN}
              max={CLASSIC_GLOBAL_FONT_SCALE_MAX}
              step={0.05}
              value={fontScale}
              onChange={(e) =>
                handlePrintSettings(
                  setClassicGlobalFontScale(character, Number(e.target.value) || 1),
                )
              }
            />
          </label>
          <button
            type="button"
            onClick={() => handlePrintSettings(resetClassicPrintTextSettings(character))}
          >
            Сбросить настройки текста
          </button>
          <p className="classic-print-typo__hint">
            Размер шрифта у блока — верхняя граница; автоподгонка не ниже 7 pt. Высоту блока тяните
            за нижний край в режиме правки печати.
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
          globalFontScale={fontScale}
          pencilBlanks={pencilBlanks}
        >
          <ClassicPrintSheet character={character} onPrintSettings={handlePrintSettings} />
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
