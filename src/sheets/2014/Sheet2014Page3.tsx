import type { Character } from '../../types/character';

type Props = {
  character: Character;
  onChange: (next: Character) => void;
};

const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

function emptyLines(count: number, filled: string[]): string[] {
  const rows = [...filled];
  while (rows.length < count) rows.push('');
  return rows.slice(0, count);
}

export function Sheet2014Page3({ character: c, onChange }: Props) {
  const set = (patch: Partial<Character>) => onChange({ ...c, ...patch });

  const setSpell = (level: (typeof LEVELS)[number], index: number, value: string) => {
    const current = emptyLines(level === 1 || level === 2 || level === 3 ? 13 : 9, c.spellsByLevel[level]);
    current[index] = value;
    set({
      spellsByLevel: {
        ...c.spellsByLevel,
        [level]: current.filter((x, i) => x || i < current.findLastIndex((y) => y) + 1),
      },
    });
  };

  const setCantrip = (index: number, value: string) => {
    const rows = emptyLines(8, c.cantrips);
    rows[index] = value;
    set({ cantrips: rows.filter((x, i) => x || i < rows.findLastIndex((y) => y) + 1) });
  };

  const togglePrepared = (name: string) => {
    if (!name) return;
    const has = c.preparedSpells.includes(name);
    set({
      preparedSpells: has ? c.preparedSpells.filter((x) => x !== name) : [...c.preparedSpells, name],
    });
  };

  const renderLevel = (level: (typeof LEVELS)[number], lines: number) => {
    const slots = c.spellSlots[level];
    const rows = emptyLines(lines, c.spellsByLevel[level]);
    return (
      <section className="spell-level" key={level}>
        <div className="spell-level__head">
          <div className="spell-level__badge">{level}</div>
          <div className="spell-level__slots">
            <label>
              Всего ячеек
              <input
                type="number"
                value={slots.total}
                onChange={(e) =>
                  set({
                    spellSlots: {
                      ...c.spellSlots,
                      [level]: { ...slots, total: Number(e.target.value) || 0 },
                    },
                  })
                }
              />
            </label>
            <label>
              Потрачено
              <input
                type="number"
                value={slots.expended}
                onChange={(e) =>
                  set({
                    spellSlots: {
                      ...c.spellSlots,
                      [level]: { ...slots, expended: Number(e.target.value) || 0 },
                    },
                  })
                }
              />
            </label>
          </div>
        </div>
        <ul className="spell-lines">
          {rows.map((name, i) => (
            <li key={i}>
              <button
                type="button"
                className={`bubble-btn ${c.preparedSpells.includes(name) ? 'is-on' : ''}`}
                aria-label="Подготовлено"
                onClick={() => togglePrepared(name)}
              >
                <span className={`bubble ${c.preparedSpells.includes(name) ? 'bubble--filled' : ''}`} />
              </button>
              <input value={name} onChange={(e) => setSpell(level, i, e.target.value)} />
            </li>
          ))}
        </ul>
      </section>
    );
  };

  return (
    <article className="sheet sheet-2014 sheet-2014--page3" aria-label="Лист персонажа 2014, страница 3">
      <header className="spell-header">
        <div className="sheet-2014__brand">
          <div className="sheet-2014__brand-mark">D&amp;D</div>
        </div>
        <label className="sheet-2014__name-banner">
          <span>Класс заклинателя</span>
          <input
            value={c.spellcastingClass}
            onChange={(e) => set({ spellcastingClass: e.target.value })}
          />
        </label>
        <div className="spell-stats">
          <label>
            <span>Базовая характеристика</span>
            <input
              value={c.spellcastingAbility}
              onChange={(e) => set({ spellcastingAbility: e.target.value })}
            />
          </label>
          <label>
            <span>Сложность спасброска</span>
            <input value={c.spellSaveDc} onChange={(e) => set({ spellSaveDc: e.target.value })} />
          </label>
          <label>
            <span>Бонус атаки заклинанием</span>
            <input
              value={c.spellAttackBonus}
              onChange={(e) => set({ spellAttackBonus: e.target.value })}
            />
          </label>
        </div>
      </header>

      <div className="spell-columns">
        <div className="spell-col">
          <section className="spell-level">
            <div className="spell-level__head">
              <div className="spell-level__badge">0</div>
              <div className="spell-level__title">Заговоры</div>
            </div>
            <ul className="spell-lines spell-lines--cantrips">
              {emptyLines(8, c.cantrips).map((name, i) => (
                <li key={i}>
                  <input value={name} onChange={(e) => setCantrip(i, e.target.value)} />
                </li>
              ))}
            </ul>
          </section>
          {renderLevel(1, 13)}
          {renderLevel(2, 13)}
        </div>
        <div className="spell-col">
          {renderLevel(3, 13)}
          {renderLevel(4, 7)}
          {renderLevel(5, 9)}
        </div>
        <div className="spell-col">
          {renderLevel(6, 9)}
          {renderLevel(7, 9)}
          {renderLevel(8, 7)}
          {renderLevel(9, 7)}
        </div>
      </div>
    </article>
  );
}
