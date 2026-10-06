import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { createBlankCharacter } from '../data/characterFactory';
import { loadCharacters, saveCharacters } from '../lib/storage';
import type { Character } from '../types/character';

type CharactersContextValue = {
  characters: Character[];
  getById: (id: string) => Character | undefined;
  createCharacter: () => Character;
  updateCharacter: (next: Character) => void;
  deleteCharacter: (id: string) => void;
  saveStatus: 'saved' | 'saving';
};

const CharactersContext = createContext<CharactersContextValue | null>(null);

export function CharactersProvider({ children }: { children: ReactNode }) {
  const [characters, setCharacters] = useState<Character[]>(() => loadCharacters());
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');

  const persist = useCallback((next: Character[]) => {
    setSaveStatus('saving');
    setCharacters(next);
    saveCharacters(next);
    window.setTimeout(() => setSaveStatus('saved'), 180);
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key !== 'dvarf.characters.v1') return;
      setCharacters(loadCharacters());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const getById = useCallback(
    (id: string) => characters.find((c) => c.id === id),
    [characters],
  );

  const createCharacter = useCallback(() => {
    const created = createBlankCharacter({ name: 'Новый персонаж' });
    persist([created, ...characters]);
    return created;
  }, [characters, persist]);

  const updateCharacter = useCallback(
    (next: Character) => {
      const stamped = { ...next, updatedAt: new Date().toISOString() };
      const exists = characters.some((c) => c.id === stamped.id);
      const list = exists
        ? characters.map((c) => (c.id === stamped.id ? stamped : c))
        : [stamped, ...characters];
      persist(list);
    },
    [characters, persist],
  );

  const deleteCharacter = useCallback(
    (id: string) => {
      persist(characters.filter((c) => c.id !== id));
    },
    [characters, persist],
  );

  const value = useMemo(
    () => ({
      characters,
      getById,
      createCharacter,
      updateCharacter,
      deleteCharacter,
      saveStatus,
    }),
    [characters, getById, createCharacter, updateCharacter, deleteCharacter, saveStatus],
  );

  return <CharactersContext.Provider value={value}>{children}</CharactersContext.Provider>;
}

export function useCharacters(): CharactersContextValue {
  const ctx = useContext(CharactersContext);
  if (!ctx) throw new Error('useCharacters must be used within CharactersProvider');
  return ctx;
}
