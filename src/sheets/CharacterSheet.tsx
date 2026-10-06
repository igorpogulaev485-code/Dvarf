import type { Character, SheetLayout } from '../types/character';
import { Sheet2014Page1 } from './2014/Sheet2014Page1';
import { Sheet2014Page2 } from './2014/Sheet2014Page2';
import { Sheet2014Page3 } from './2014/Sheet2014Page3';

type Props = {
  character: Character;
  onChange: (next: Character) => void;
};

export function CharacterSheet({ character, onChange }: Props) {
  if (character.sheetLayout === '2014') {
    return (
      <div className="sheet-stack">
        <Sheet2014Page1 character={character} onChange={onChange} />
        <Sheet2014Page2 character={character} onChange={onChange} />
        <Sheet2014Page3 character={character} onChange={onChange} />
      </div>
    );
  }

  return (
    <div className="sheet-placeholder">
      <h2>Вёрстка листа 2024 — следующий шаг</h2>
      <p>
        Сейчас доступен лист 2014. Модель уже разделяет{' '}
        <code>rulesEdition</code> (правила) и <code>sheetLayout</code> (вёрстка), так что позже можно
        играть по правилам 2014 на листе 2024.
      </p>
    </div>
  );
}

export function supportsSheetLayout(layout: SheetLayout): boolean {
  return layout === '2014';
}
