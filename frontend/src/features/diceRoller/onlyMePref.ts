/** «Только себе» — не слать броски в ленту сессии. Per character, local only. */

export function onlyMeStorageKey(characterId: string): string {
  return `dvarf.diceOnlyMe.v1.${characterId}`
}

export function readOnlyMePref(characterId: string): boolean {
  if (typeof localStorage === 'undefined') return false
  try {
    return localStorage.getItem(onlyMeStorageKey(characterId)) === '1'
  } catch {
    return false
  }
}

export function writeOnlyMePref(characterId: string, value: boolean): void {
  if (typeof localStorage === 'undefined') return
  try {
    if (value) localStorage.setItem(onlyMeStorageKey(characterId), '1')
    else localStorage.removeItem(onlyMeStorageKey(characterId))
  } catch {
    // ignore quota / private mode
  }
}
