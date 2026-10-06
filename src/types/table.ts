/** Сеттинг — зона мира / кампании. Не обязателен для игры. */
export interface Setting {
  id: string;
  name: string;
  /** Блок про мир, лор, заметки мастера. */
  worldNotes: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Сессия — «этот раз» за столом: состав, бой, лут.
 * Может жить без сеттинга (ваншот) или быть привязана к одному сеттингу.
 */
export interface Session {
  id: string;
  name: string;
  /** null = ваншот, без сеттинга. */
  settingId: string | null;
  /** Персонажи из лобби, которые сидят за этим столом. */
  characterIds: string[];
  createdAt: string;
  updatedAt: string;
}

export function isOneshot(session: Session): boolean {
  return session.settingId == null;
}
