import { useState } from 'react'
import { ClassicPrintSheet } from '../features/classicSheet/ClassicPrintSheet'
import {
  readClassicSheetLayout,
  setClassicSheetLayout,
  type ClassicSheetLayout,
} from '../features/classicSheet/classicSheetLayout'
import { sampleClassic2014Character } from '../features/classicSheet/sampleClassicCharacter'
import type { CharacterDetail } from '../shared/api/characters'
import { Button } from '../ui'

/** DEV-only visual sandbox for classic printable layouts (no API). */
export function ClassicSheetPreviewPage() {
  const [character, setCharacter] = useState<CharacterDetail>(sampleClassic2014Character)
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

  return (
    <div className="classic-print-page">
      <header className="classic-print-toolbar no-print">
        <div>
          <div>
            Classic · preview
            <small>Локальный образец без API · макет {layout}</small>
          </div>
        </div>
        <div className="classic-toolbar-actions">
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
