import { useState } from 'react'
import { ClassicPrintSheet } from '../features/classicSheet/ClassicPrintSheet'
import {
  readClassicSheetLayout,
  setClassicSheetLayout,
  type ClassicSheetLayout,
} from '../features/classicSheet/classicSheetLayout'
import {
  sampleClassic2014Character,
  sampleQuackClassicCharacter,
} from '../features/classicSheet/sampleClassicCharacter'
import type { CharacterDetail } from '../shared/api/characters'
import { Button } from '../ui'

type FixtureId = 'torin' | 'quack'

const FIXTURES: Record<FixtureId, CharacterDetail> = {
  torin: sampleClassic2014Character,
  quack: sampleQuackClassicCharacter,
}

/** DEV-only visual sandbox for classic printable layouts (no API). */
export function ClassicSheetPreviewPage() {
  const [fixture, setFixture] = useState<FixtureId>('quack')
  const [character, setCharacter] = useState<CharacterDetail>(FIXTURES.quack)
  const layout = readClassicSheetLayout(character)

  const applyPatch = (patch: {
    name?: string
    level?: number
    class_name?: string | null
    race_name?: string | null
    hp_current?: number | null
    hp_max?: number | null
    sheet?: Record<string, unknown>
  }) => {
    setCharacter((prev) => ({
      ...prev,
      name: patch.name ?? prev.name,
      level: patch.level ?? prev.level,
      class_name: patch.class_name === undefined ? prev.class_name : patch.class_name,
      race_name: patch.race_name === undefined ? prev.race_name : patch.race_name,
      hp_current: patch.hp_current === undefined ? prev.hp_current : patch.hp_current,
      hp_max: patch.hp_max === undefined ? prev.hp_max : patch.hp_max,
      sheet: patch.sheet ?? prev.sheet,
    }))
  }

  const setLayout = (next: ClassicSheetLayout) => {
    applyPatch(setClassicSheetLayout(character, next))
  }

  const loadFixture = (id: FixtureId) => {
    setFixture(id)
    setCharacter(FIXTURES[id])
  }

  return (
    <div className="classic-print-page" data-testid="classic-sheet-preview">
      <header className="classic-print-toolbar no-print">
        <div>
          <div>
            Classic · preview
            <small>
              Локальный образец без API · макет {layout} ·{' '}
              {fixture === 'quack' ? 'Квакк R1' : 'Торин mono'}
            </small>
          </div>
        </div>
        <div className="classic-toolbar-actions">
          <div className="classic-layout-switch" role="group" aria-label="Фикстура">
            <span className="classic-layout-switch__label">Лист</span>
            <button
              type="button"
              className={fixture === 'quack' ? 'is-active' : undefined}
              data-testid="classic-fixture-quack"
              onClick={() => loadFixture('quack')}
            >
              Квакк
            </button>
            <button
              type="button"
              className={fixture === 'torin' ? 'is-active' : undefined}
              onClick={() => loadFixture('torin')}
            >
              Торин
            </button>
          </div>
          <div className="classic-layout-switch" role="group" aria-label="Макет классического листа">
            <span className="classic-layout-switch__label">Макет</span>
            {(['2014', '2024'] as const).map((year) => (
              <button
                key={year}
                type="button"
                className={layout === year ? 'is-active' : undefined}
                onClick={() => setLayout(year)}
              >
                {year}
              </button>
            ))}
            <span className="classic-layout-switch__hint">только отображение</span>
          </div>
          <Button variant="secondary" onClick={() => window.print()}>
            Печать / PDF
          </Button>
        </div>
      </header>
      <ClassicPrintSheet character={character} onPatch={applyPatch} layout={layout} />
    </div>
  )
}
