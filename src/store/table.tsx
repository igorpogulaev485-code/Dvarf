import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { createBlankSession, createBlankSetting } from '../data/tableFactory';
import { loadTable, saveTable } from '../lib/tableStorage';
import type { Session, Setting } from '../types/table';

type TableContextValue = {
  settings: Setting[];
  sessions: Session[];
  getSetting: (id: string) => Setting | undefined;
  getSession: (id: string) => Session | undefined;
  sessionsForSetting: (settingId: string) => Session[];
  createSetting: (partial?: Partial<Setting>) => Setting;
  updateSetting: (next: Setting) => void;
  deleteSetting: (id: string) => void;
  createSession: (partial?: Partial<Session>) => Session;
  updateSession: (next: Session) => void;
  deleteSession: (id: string) => void;
  addCharacterToSession: (sessionId: string, characterId: string) => void;
  removeCharacterFromSession: (sessionId: string, characterId: string) => void;
  purgeCharacter: (characterId: string) => void;
};

const TableContext = createContext<TableContextValue | null>(null);

function stamp<T extends { updatedAt: string }>(item: T): T {
  return { ...item, updatedAt: new Date().toISOString() };
}

export function TableProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Setting[]>(() => loadTable().settings);
  const [sessions, setSessions] = useState<Session[]>(() => loadTable().sessions);

  const persist = useCallback((nextSettings: Setting[], nextSessions: Session[]) => {
    setSettings(nextSettings);
    setSessions(nextSessions);
    saveTable({ version: 1, settings: nextSettings, sessions: nextSessions });
  }, []);

  const getSetting = useCallback(
    (id: string) => settings.find((s) => s.id === id),
    [settings],
  );

  const getSession = useCallback(
    (id: string) => sessions.find((s) => s.id === id),
    [sessions],
  );

  const sessionsForSetting = useCallback(
    (settingId: string) => sessions.filter((s) => s.settingId === settingId),
    [sessions],
  );

  const createSetting = useCallback(
    (partial?: Partial<Setting>) => {
      const created = createBlankSetting(partial);
      persist([created, ...settings], sessions);
      return created;
    },
    [persist, settings, sessions],
  );

  const updateSetting = useCallback(
    (next: Setting) => {
      persist(
        settings.map((s) => (s.id === next.id ? stamp(next) : s)),
        sessions,
      );
    },
    [persist, settings, sessions],
  );

  const deleteSetting = useCallback(
    (id: string) => {
      persist(
        settings.filter((s) => s.id !== id),
        sessions.map((s) => (s.settingId === id ? stamp({ ...s, settingId: null }) : s)),
      );
    },
    [persist, settings, sessions],
  );

  const createSession = useCallback(
    (partial?: Partial<Session>) => {
      const created = createBlankSession(partial);
      persist(settings, [created, ...sessions]);
      return created;
    },
    [persist, settings, sessions],
  );

  const updateSession = useCallback(
    (next: Session) => {
      persist(
        settings,
        sessions.map((s) => (s.id === next.id ? stamp(next) : s)),
      );
    },
    [persist, settings, sessions],
  );

  const deleteSession = useCallback(
    (id: string) => {
      persist(
        settings,
        sessions.filter((s) => s.id !== id),
      );
    },
    [persist, settings, sessions],
  );

  const addCharacterToSession = useCallback(
    (sessionId: string, characterId: string) => {
      persist(
        settings,
        sessions.map((s) => {
          if (s.id !== sessionId || s.characterIds.includes(characterId)) return s;
          return stamp({ ...s, characterIds: [...s.characterIds, characterId] });
        }),
      );
    },
    [persist, settings, sessions],
  );

  const removeCharacterFromSession = useCallback(
    (sessionId: string, characterId: string) => {
      persist(
        settings,
        sessions.map((s) => {
          if (s.id !== sessionId) return s;
          return stamp({
            ...s,
            characterIds: s.characterIds.filter((cid) => cid !== characterId),
          });
        }),
      );
    },
    [persist, settings, sessions],
  );

  const purgeCharacter = useCallback(
    (characterId: string) => {
      persist(
        settings,
        sessions.map((s) =>
          s.characterIds.includes(characterId)
            ? stamp({
                ...s,
                characterIds: s.characterIds.filter((cid) => cid !== characterId),
              })
            : s,
        ),
      );
    },
    [persist, settings, sessions],
  );

  const value = useMemo(
    () => ({
      settings,
      sessions,
      getSetting,
      getSession,
      sessionsForSetting,
      createSetting,
      updateSetting,
      deleteSetting,
      createSession,
      updateSession,
      deleteSession,
      addCharacterToSession,
      removeCharacterFromSession,
      purgeCharacter,
    }),
    [
      settings,
      sessions,
      getSetting,
      getSession,
      sessionsForSetting,
      createSetting,
      updateSetting,
      deleteSetting,
      createSession,
      updateSession,
      deleteSession,
      addCharacterToSession,
      removeCharacterFromSession,
      purgeCharacter,
    ],
  );

  return <TableContext.Provider value={value}>{children}</TableContext.Provider>;
}

export function useTable(): TableContextValue {
  const ctx = useContext(TableContext);
  if (!ctx) throw new Error('useTable must be used within TableProvider');
  return ctx;
}
