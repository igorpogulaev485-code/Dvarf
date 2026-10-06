import { useId, useMemo, useRef, useState } from 'react';
import type { Character } from '../types/character';
import { filterRaceCatalog, type RaceCatalogItem } from '../data/races/choiceSchema';
import { RaceSetupModal } from './RaceSetupModal';

type Props = {
  character: Character;
  onChange: (next: Character) => void;
  /** Компактный вид для ячейки листа */
  compact?: boolean;
};

export function RaceField({ character, onChange, compact }: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [openList, setOpenList] = useState(false);
  const [modalRaceId, setModalRaceId] = useState<string | null>(null);

  const query = draft ?? character.race;

  const suggestions = useMemo(() => filterRaceCatalog(query).slice(0, 12), [query]);

  const pick = (item: RaceCatalogItem) => {
    setDraft(item.labelRu);
    setOpenList(false);
    setModalRaceId(item.id);
  };

  return (
    <>
      <div
        className={`race-field ${compact ? 'race-field--compact' : ''}`}
        ref={rootRef}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpenList(false);
        }}
      >
        {!compact ? <span className="race-field__label">Раса</span> : null}
        <input
          value={query}
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={openList}
          placeholder="Начните вводить расу…"
          onFocus={() => setOpenList(true)}
          onChange={(e) => {
            setDraft(e.target.value);
            setOpenList(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && suggestions[0]) {
              e.preventDefault();
              pick(suggestions[0]);
            }
            if (e.key === 'Escape') setOpenList(false);
          }}
        />
        {openList && suggestions.length > 0 ? (
          <ul id={listId} className="race-field__list" role="listbox">
            {suggestions.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  role="option"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(item)}
                >
                  <span>{item.labelRu}</span>
                  <small>
                    {item.sourceRu}
                    {item.hasSubraces ? ' · есть подрасы' : ''}
                  </small>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {modalRaceId ? (
        <RaceSetupModal
          key={modalRaceId}
          open
          selectedCatalogId={modalRaceId}
          character={character}
          onClose={() => {
            setModalRaceId(null);
            setDraft(null);
          }}
          onApply={(next) => {
            setModalRaceId(null);
            setDraft(null);
            onChange(next);
          }}
        />
      ) : null}
    </>
  );
}
