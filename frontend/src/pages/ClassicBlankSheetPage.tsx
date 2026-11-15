import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ClassicPrintSheet } from '../features/classicSheet/ClassicPrintSheet'
import {
  setClassicSheetLayout,
  type ClassicSheetLayout,
} from '../features/classicSheet/classicSheetLayout'
import { ClassicSheetUiProvider } from '../features/classicSheet/classicSheetUi'
import { setClassicPencilBlanks } from '../features/classicSheet/classicPrintSettings'
import type { CharacterDetail } from '../shared/api/characters'
import { Button, SegmentedControl } from '../ui'

function blankCharacter(layout: ClassicSheetLayout): CharacterDetail {
  let character: CharacterDetail = {
    id: 'classic-blank',
    name: '',
    avatar_url: null,
    // level 0 → no «ур. 1» / derived PB / hit-die labels on the blank.
    level: 0,
    class_name: null,
    race_name: null,
    hp_current: null,
    hp_max: null,
    rules_edition: layout,
    sheet_version: 0,
    is_draft: false,
    created_at: '1970-01-01T00:00:00Z',
    updated_at: '1970-01-01T00:00:00Z',
    sheet: {
      ui: {},
      // No ability scores — blank must not print 10 / +0 placeholders.
      abilities: {},
      combat: {},
      identity: {},
      inventory: { items: [], coins: {}, notes: '' },
      spells: { known: [], slots: {}, casting_ability: null },
      companions: [],
      text_blocks: [],
      proficiency: {},
    },
  }
  const withLayout = setClassicSheetLayout(character, layout)
  character = { ...character, sheet: withLayout.sheet ?? character.sheet }
  const withPencil = setClassicPencilBlanks(character, true)
  return { ...character, sheet: withPencil.sheet ?? character.sheet }
}

function parseLayoutParam(raw: string | null): ClassicSheetLayout {
  return raw === '2024' ? '2024' : '2014'
}

/** Empty official-style blank for pencil — no character API, no fixtures. */
export function ClassicBlankSheetPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const layout = parseLayoutParam(searchParams.get('layout'))
  const character = useMemo(() => blankCharacter(layout), [layout])

  function setLayout(next: ClassicSheetLayout) {
    const params = new URLSearchParams(searchParams)
    if (next === '2014') {
      params.delete('layout')
    } else {
      params.set('layout', next)
    }
    setSearchParams(params, { replace: true })
  }

  return (
    <div
      className="classic-print-page"
      data-testid="classic-blank-sheet"
      data-classic-color="bw"
      data-classic-font="serif"
      data-classic-name-script="0"
    >
      <header className="classic-print-toolbar no-print">
        <div>
          <Link to="/characters">← К персонажам</Link>
          <div>
            Пустой бланк
            <small>Без данных персонажа · макет {layout}</small>
          </div>
          <p className="classic-print-banner">
            Чистые страницы под карандаш. Для заполненного бланка откройте классический лист
            персонажа.
          </p>
        </div>
        <div className="classic-toolbar-actions">
          <div className="classic-toolbar-group">
            <span className="classic-toolbar-group__label">Макет</span>
            <SegmentedControl
              aria-label="Макет пустого бланка"
              size="sm"
              className="classic-toolbar-segmented"
              value={layout}
              onChange={setLayout}
              options={[
                { id: '2014', label: '2014' },
                { id: '2024', label: '2024' },
              ]}
            />
          </div>
          <div className="classic-print-cta">
            <Button variant="secondary" onClick={() => window.print()}>
              Печать / PDF
            </Button>
            <small>В диалоге печати выберите «Сохранить как PDF»</small>
          </div>
        </div>
      </header>
      <ClassicSheetUiProvider editing={false} pencilBlanks>
        <ClassicPrintSheet character={character} layout={layout} />
      </ClassicSheetUiProvider>
    </div>
  )
}
