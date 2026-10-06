import { useState } from 'react';
import { sampleDwarfWizard2014 } from './data/sampleCharacter';
import { CharacterSheet, supportsSheetLayout } from './sheets/CharacterSheet';
import type { Character, RulesEdition, SheetLayout } from './types/character';
import './index.css';

export default function App() {
  const [character, setCharacter] = useState<Character>(sampleDwarfWizard2014);

  const setRulesEdition = (rulesEdition: RulesEdition) => {
    setCharacter((prev) => ({ ...prev, rulesEdition }));
  };

  const setSheetLayout = (sheetLayout: SheetLayout) => {
    if (!supportsSheetLayout(sheetLayout)) return;
    setCharacter((prev) => ({ ...prev, sheetLayout }));
  };

  return (
    <div className="app-shell">
      <header className="toolbar no-print">
        <div className="toolbar__brand">
          Dvarf
          <small>Лист персонажа · правила и вёрстка раздельно</small>
        </div>
        <div className="toolbar__controls">
          <label>
            Правила
            <select
              value={character.rulesEdition}
              onChange={(e) => setRulesEdition(e.target.value as RulesEdition)}
            >
              <option value="2014">2014</option>
              <option value="2024">2024</option>
            </select>
          </label>
          <label>
            Вёрстка листа
            <select
              value={character.sheetLayout}
              onChange={(e) => setSheetLayout(e.target.value as SheetLayout)}
            >
              <option value="2014">2014</option>
              <option value="2024" disabled>
                2024 (скоро)
              </option>
            </select>
          </label>
          <button type="button" onClick={() => window.print()}>
            Печать / PDF
          </button>
        </div>
        <p className="toolbar__note">
          Сейчас собираем лист 2014. Можно уже выбрать правила 2014 при будущей вёрстке 2024 — так
          удобнее, если играешь по 14-м, а лист 24-го привычнее. Длинный текст в блоках на экране
          расширяет поле, а не обрезается.
        </p>
      </header>

      <main className="sheet-viewport">
        <CharacterSheet character={character} onChange={setCharacter} />
      </main>
    </div>
  );
}
