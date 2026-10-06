import type { Session, Setting } from '../types/table';

const STORAGE_KEY = 'dvarf.table.v1';

export type TableSnapshot = {
  version: 1;
  settings: Setting[];
  sessions: Session[];
};

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function emptySnapshot(): TableSnapshot {
  return { version: 1, settings: [], sessions: [] };
}

export function loadTable(): TableSnapshot {
  if (!canUseStorage()) return emptySnapshot();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptySnapshot();
    const parsed = JSON.parse(raw) as TableSnapshot;
    if (!parsed || !Array.isArray(parsed.settings) || !Array.isArray(parsed.sessions)) {
      return emptySnapshot();
    }
    return {
      version: 1,
      settings: parsed.settings,
      sessions: parsed.sessions.map((s) => ({
        ...s,
        settingId: s.settingId ?? null,
        characterIds: Array.isArray(s.characterIds) ? s.characterIds : [],
      })),
    };
  } catch {
    return emptySnapshot();
  }
}

export function saveTable(snapshot: TableSnapshot): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ version: 1, settings: snapshot.settings, sessions: snapshot.sessions }),
  );
}
