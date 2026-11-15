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
import {
  Button,
  Field,
  SegmentedControl,
  Select,
  Text,
  ToggleChip,
} from '../ui'

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
  /** Bumps on each persist so a late response cannot leave «Сохраняем…» stuck. */
  const saveSeqRef = useRef(0)

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
      // Drop pending debounce; do not leave a stuck saving label after unmount/remount.
      saveSeqRef.current += 1
    }
  }, [characterId, navigate])

  const persistPrintSettings = useCallback(async (next: CharacterDetail) => {
    const seq = ++saveSeqRef.current
    setStatus('saving')
    try {
      const updated = await updateCharacter(next.id, {
        sheet_version: versionRef.current,
        sheet: next.sheet,
      })
      if (seq !== saveSeqRef.current) return
      versionRef.current = updated.sheet_version
      latestRef.current = updated
      setCharacter(updated)
      setLayoutOverride(null)
    } catch (err) {
      if (seq !== saveSeqRef.current) return
      setError(err instanceof ApiRequestError ? err.message : 'Не удалось сохранить настройки печати')
    } finally {
      if (seq === saveSeqRef.current) {
        setStatus('ready')
      }
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
      // Status flips to «saving» only when the request actually starts (persistPrintSettings),
      // not during the debounce window — avoids a stuck label if the timer is cleared.
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
      saveTimer.current = window.setTimeout(() => {
        void persistPrintSettings(latestRef.current ?? next)
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

  const statusLabel =
    status === 'loading'
      ? 'Загрузка…'
      : status === 'saving'
        ? 'Сохраняем настройки печати…'
        : null

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
        <div className="classic-toolbar-identity">
          <Link to={character ? `/characters/${character.id}` : '/characters'}>
            ← К основному листу
          </Link>
          <div className="classic-toolbar-identity__title">
            {character?.name || 'Классический лист'}
            {statusLabel ? <small>{statusLabel}</small> : null}
          </div>
          <p className="classic-print-banner">
            Только для печати — правки делайте в{' '}
            <Link to={character ? `/characters/${character.id}` : '/characters'}>
              основном листе
            </Link>
          </p>
        </div>
        <div className="classic-toolbar-actions">
          <div className="classic-toolbar-actions__controls">
            <div className="classic-toolbar-group">
              <span className="classic-toolbar-group__label">Макет</span>
              <SegmentedControl
                aria-label="Макет классического листа"
                size="sm"
                className="classic-toolbar-segmented"
                value={sheetLayout}
                onChange={(year) => {
                  if (!character) return
                  handleLayoutChange(year)
                }}
                options={[
                  { id: '2014', label: '2014' },
                  { id: '2024', label: '2024' },
                ]}
              />
              <span className="classic-toolbar-group__hint">
                печатная форма · D&D 5e {sheetLayout}
              </span>
            </div>

            <ToggleChip
              className="classic-toolbar-chip classic-toolbar-switch"
              main="Линии под карандаш"
              rest={pencilBlanks ? 'Вкл' : 'Выкл'}
              checked={pencilBlanks}
              disabled={!character}
              aria-label={`Линии под карандаш: ${pencilBlanks ? 'включены' : 'выключены'}`}
              onChange={(next) => {
                const current = latestRef.current
                if (!current) return
                handlePrintSettings(setClassicPencilBlanks(current, next))
              }}
            />

            <div className="classic-toolbar-stepper" role="group" aria-label="Доп. страницы заметок">
              <span className="classic-toolbar-group__label">Доп. страницы заметок</span>
              <div className="classic-toolbar-stepper__controls">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!character || extraNotePages <= 0}
                  aria-label="Меньше страниц заметок"
                  onClick={() => {
                    const current = latestRef.current
                    if (!current) return
                    handlePrintSettings(setClassicExtraNotePages(current, extraNotePages - 1))
                  }}
                >
                  −
                </Button>
                <span className="classic-toolbar-stepper__value" aria-live="polite">
                  {extraNotePages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!character || extraNotePages >= 12}
                  aria-label="Больше страниц заметок"
                  onClick={() => {
                    const current = latestRef.current
                    if (!current) return
                    handlePrintSettings(setClassicExtraNotePages(current, extraNotePages + 1))
                  }}
                >
                  +
                </Button>
              </div>
            </div>

            <SegmentedControl
              aria-label="Цвет печати"
              size="sm"
              className="classic-toolbar-segmented"
              value={printColor}
              onChange={(mode) => {
                const current = latestRef.current
                if (!current) return
                handlePrintSettings(setClassicPrintColor(current, mode))
              }}
              options={[
                { id: 'bw', label: 'Чёрно-белая' },
                { id: 'color', label: 'Цвет' },
              ]}
            />

            <Button
              variant={editing ? 'primary' : 'secondary'}
              size="sm"
              className="classic-edit-toggle"
              aria-pressed={editing}
              disabled={!character}
              title="Размер шрифта блоков, гарнитура, интервал, высота полей"
              onClick={() => setEditing((v) => !v)}
            >
              Правка печати
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="classic-blank-link"
              onClick={() => navigate(`/classic/blank?layout=${sheetLayout}`)}
            >
              Распечатать пустой бланк
            </Button>
          </div>

          <div className="classic-print-cta">
            <Button variant="primary" onClick={() => window.print()}>
              Печать / PDF
            </Button>
            <small>В диалоге печати выберите «Сохранить как PDF»</small>
          </div>
        </div>
      </header>

      {editing && character && textStyle ? (
        <div className="classic-print-typo no-print" aria-label="Настройки текста для печати">
          <Field label="Гарнитура" className="classic-print-typo__field">
            <Select
              size="sm"
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
            </Select>
          </Field>

          <ToggleChip
            className="classic-print-typo__chip"
            main="Имя рукописным"
            rest="Marck Script"
            checked={textStyle.nameScript}
            onChange={(next) =>
              handlePrintSettings(setClassicTextStyle(character, { nameScript: next }))
            }
          />

          <Field label="Интервал" className="classic-print-typo__field">
            <Select
              size="sm"
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
            </Select>
          </Field>

          <Field label="Выравнивание" className="classic-print-typo__field">
            <Select
              size="sm"
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
            </Select>
          </Field>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlePrintSettings(resetClassicPrintTextSettings(character))}
          >
            Сбросить настройки текста
          </Button>

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
