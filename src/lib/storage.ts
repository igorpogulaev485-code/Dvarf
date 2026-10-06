import type { Character } from '../types/character';
import { withSampleSeed } from '../data/characterFactory';

const STORAGE_KEY = 'dvarf.characters.v1';

export type CharactersSnapshot = {
  version: 1;
  characters: Character[];
};

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function loadCharacters(): Character[] {
  if (!canUseStorage()) return withSampleSeed();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = withSampleSeed();
      saveCharacters(seed);
      return seed;
    }
    const parsed = JSON.parse(raw) as CharactersSnapshot | Character[];
    const list = Array.isArray(parsed) ? parsed : parsed.characters;
    if (!Array.isArray(list) || list.length === 0) {
      const seed = withSampleSeed();
      saveCharacters(seed);
      return seed;
    }
    return list.map((c) => ({
      ...c,
      updatedAt: c.updatedAt ?? new Date().toISOString(),
    }));
  } catch {
    return withSampleSeed();
  }
}

export function saveCharacters(characters: Character[]): void {
  if (!canUseStorage()) return;
  const payload: CharactersSnapshot = { version: 1, characters };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}
