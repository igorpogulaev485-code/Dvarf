import type { Session, Setting } from '../types/table';

export function createBlankSetting(partial?: Partial<Setting>): Setting {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: 'Новый сеттинг',
    worldNotes: '',
    ...partial,
    createdAt: partial?.createdAt ?? now,
    updatedAt: partial?.updatedAt ?? now,
  };
}

export function createBlankSession(partial?: Partial<Session>): Session {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: 'Новая сессия',
    settingId: null,
    characterIds: [],
    ...partial,
    createdAt: partial?.createdAt ?? now,
    updatedAt: partial?.updatedAt ?? now,
  };
}
