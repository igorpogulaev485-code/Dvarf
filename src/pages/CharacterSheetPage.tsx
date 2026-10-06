import { Link, Navigate, useParams } from 'react-router-dom';
import { CharacterSheet, supportsSheetLayout } from '../sheets/CharacterSheet';
import { useCharacters } from '../store/characters';
import type { RulesEdition, SheetLayout } from '../types/character';

export function CharacterSheetPage() {
  const { id = '' } = useParams();
  const { getById, updateCharacter, saveStatus } = useCharacters();
  const character = getById(id);

  if (!character) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="app-shell">
      <header className="toolbar no-print">
        <div className="toolbar__brand">
          <Link to={`/characters/${character.id}`} className="toolbar__back">
            ← К карточке
          </Link>
          <div>
            {character.name || 'Безымянный персонаж'}
            <small>
              Классический лист · {saveStatus === 'saving' ? 'сохраняем…' : 'сохранено в карточку'}
            </small>
          </div>
        </div>
        <div className="toolbar__controls">
          <label>
            Правила
            <select
              value={character.rulesEdition}
              onChange={(e) =>
                updateCharacter({
                  ...character,
                  rulesEdition: e.target.value as RulesEdition,
                })
              }
            >
              <option value="2014">2014</option>
              <option value="2024">2024</option>
            </select>
          </label>
          <label>
            Вёрстка листа
            <select
              value={character.sheetLayout}
              onChange={(e) => {
                const sheetLayout = e.target.value as SheetLayout;
                if (!supportsSheetLayout(sheetLayout)) return;
                updateCharacter({ ...character, sheetLayout });
              }}
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
          Правки на листе пишутся в ту же сущность персонажа, что и карточка (как digital ↔ classic у
          ЛСС). Сейчас хранение локальное; сервер — следующий шаг.
        </p>
      </header>

      <main className="sheet-viewport">
        <CharacterSheet character={character} onChange={updateCharacter} />
      </main>
    </div>
  );
}
