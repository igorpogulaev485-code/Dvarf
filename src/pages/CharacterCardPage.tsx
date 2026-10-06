import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useCharacters } from '../store/characters';
import {
  ABILITY_LABELS_RU,
  abilityModifier,
  formatMod,
  type AbilityKey,
  type RulesEdition,
  type SheetLayout,
} from '../types/character';
import { supportsSheetLayout } from '../sheets/CharacterSheet';

export function CharacterCardPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { getById, updateCharacter, deleteCharacter, saveStatus } = useCharacters();
  const character = getById(id);

  if (!character) {
    return <Navigate to="/" replace />;
  }

  const setField = <K extends keyof typeof character>(key: K, value: (typeof character)[K]) => {
    updateCharacter({ ...character, [key]: value });
  };

  return (
    <div className="app-shell">
      <header className="toolbar no-print">
        <div className="toolbar__brand">
          <Link to="/" className="toolbar__back">
            ← К списку
          </Link>
          <div>
            {character.name || 'Безымянный персонаж'}
            <small>
              Карточка персонажа · {saveStatus === 'saving' ? 'сохраняем…' : 'сохранено'}
            </small>
          </div>
        </div>
        <div className="toolbar__controls">
          <Link className="btn btn--primary" to={`/characters/${character.id}/sheet`}>
            Открыть лист 2014
          </Link>
          <button
            type="button"
            className="btn btn--quiet"
            onClick={() => {
              if (confirm('Удалить персонажа?')) {
                deleteCharacter(character.id);
                navigate('/');
              }
            }}
          >
            Удалить
          </button>
        </div>
      </header>

      <main className="card-viewport">
        <section className="card-panel">
          <h1>Карточка</h1>
          <p className="card-panel__hint">
            Это краткая витрина того же персонажа, что и на листе. Измени имя или хиты здесь — на
            листе будет то же; и наоборот.
          </p>

          <div className="card-form">
            <label>
              Имя
              <input
                value={character.name}
                onChange={(e) => setField('name', e.target.value)}
              />
            </label>
            <label>
              Класс и уровень
              <input
                value={character.classAndLevel}
                onChange={(e) => setField('classAndLevel', e.target.value)}
              />
            </label>
            <label>
              Раса
              <input value={character.race} onChange={(e) => setField('race', e.target.value)} />
            </label>
            <label>
              Предыстория
              <input
                value={character.background}
                onChange={(e) => setField('background', e.target.value)}
              />
            </label>
            <label>
              Хиты (текущие)
              <input
                value={character.hitPointCurrent}
                onChange={(e) => setField('hitPointCurrent', e.target.value)}
              />
            </label>
            <label>
              Хиты (макс.)
              <input
                value={character.hitPointMax}
                onChange={(e) => setField('hitPointMax', e.target.value)}
              />
            </label>
            <label>
              Класс доспеха
              <input
                value={character.armorClass}
                onChange={(e) => setField('armorClass', e.target.value)}
              />
            </label>
            <label>
              Правила
              <select
                value={character.rulesEdition}
                onChange={(e) => setField('rulesEdition', e.target.value as RulesEdition)}
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
                  setField('sheetLayout', sheetLayout);
                }}
              >
                <option value="2014">2014</option>
                <option value="2024" disabled>
                  2024 (скоро)
                </option>
              </select>
            </label>
          </div>

          <h2>Характеристики</h2>
          <div className="card-abilities">
            {(Object.keys(ABILITY_LABELS_RU) as AbilityKey[]).map((key) => (
              <div key={key}>
                <span>{ABILITY_LABELS_RU[key]}</span>
                <strong>
                  {character.abilities[key]} ({formatMod(abilityModifier(character.abilities[key]))})
                </strong>
              </div>
            ))}
          </div>

          <div className="card-cta">
            <Link className="btn btn--primary btn--large" to={`/characters/${character.id}/sheet`}>
              Открыть классический лист
            </Link>
            <p>Лист редактируемый: все изменения вернутся в эту карточку автоматически.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
