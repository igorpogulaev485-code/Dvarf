import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ClassicPrintSheet } from '../features/classicSheet/ClassicPrintSheet'
import {
  setClassicSheetLayout,
  type ClassicSheetLayout,
} from '../features/classicSheet/classicSheetLayout'
import { ClassicSheetUiProvider } from '../features/classicSheet/classicSheetUi'
import { setClassicPencilBlanks } from '../features/classicSheet/classicPrintSettings'
import type { CharacterDetail } from '../shared/api/characters'
import { Button } from '../ui'

function blankCharacter(layout: ClassicSheetLayout): CharacterDetail {
  let character: CharacterDetail = {
    id: 'classic-blank',
    name: '',
    avatar_url: null,
    level: 1,
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
      abilities: {
        str: { score: 10 },
        dex: { score: 10 },
        con: { score: 10 },
        int: { score: 10 },
        wis: { score: 10 },
        cha: { score: 10 },
      },
      combat: {},
      identity: {},
      inventory: { items: [], coins: {}, notes: '' },
      spells: { known: [], slots: {}, casting_ability: null },
      companions: [],
      text_blocks: [],
    },
  }
  const withLayout = setClassicSheetLayout(character, layout)
  character = { ...character, sheet: withLayout.sheet ?? character.sheet }
  const withPencil = setClassicPencilBlanks(character, true)
  return { ...character, sheet: withPencil.sheet ?? character.sheet }
}

/** Empty official-style blank for pencil — no character API, no fixtures. */
export function ClassicBlankSheetPage() {
  const [params, setParams] = useSearchParams()
  const layoutParam = params.get('layout') === '2024' ? '2024' : '2014'
  const [layout, setLayout] = useState<ClassicSheetLayout>(layoutParam)
  const character = useMemo(() => blankCharacter(layout), [layout])

  const changeLayout = (next: ClassicSheetLayout) => {
    setLayout(next)
    setParams({ layout: next })
  }

  return (
    <div className="classic-print-page" data-testid="classic-blank-sheet">
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
          <div className="classic-layout-switch" role="group" aria-label="Макет пустого бланка">
            <span className="classic-layout-switch__label">Макет</span>
            {(['2014', '2024'] as const).map((year) => (
              <button
                key={year}
                type="button"
                className={layout === year ? 'is-active' : undefined}
                onClick={() => changeLayout(year)}
              >
                {year}
              </button>
            ))}
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
