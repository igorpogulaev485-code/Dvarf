import { useState } from 'react'
import { ClassicPrintSheet } from '../features/classicSheet/ClassicPrintSheet'
import { sampleClassic2014Character } from '../features/classicSheet/sampleClassicCharacter'
import type { CharacterDetail } from '../shared/api/characters'
import { Button } from '../ui'

/** DEV-only visual sandbox for classic 2014 P1 (no API). */
export function ClassicSheetPreviewPage() {
  const [character, setCharacter] = useState<CharacterDetail>(sampleClassic2014Character)

  return (
    <div className="classic-print-page">
      <header className="classic-print-toolbar no-print">
        <div>
          <div>
            Classic 2014 · preview
            <small>Локальный образец без API · S1/S2 визуал P1</small>
          </div>
        </div>
        <Button variant="secondary" onClick={() => window.print()}>
          Печать / PDF
        </Button>
      </header>
      <ClassicPrintSheet
        character={character}
        onPatch={(patch) => {
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
        }}
      />
    </div>
  )
}
