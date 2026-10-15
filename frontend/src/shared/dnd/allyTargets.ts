/** Эффекты/способности, которые целят союзников (или включают себя). */

const ALLY_NAME_RE =
  /благословен|bless|ускорен|haste|щит\s*вер|shield of faith|наставлен|guidance|помощ[ьи]|\baid\b|героизм|heroism|вардинг|warding bond|вдохновен|inspiration|инфуз|infusion|бафф?|\bбаф\b/i

/** Сколько слотов целей показать (Bless/Aid = 3); заполнение необязательно. */
const MULTI_TARGET_RE = /благословен|bless|помощ[ьи]|\baid\b/i

export function guessAppliesToAllies(name: string): boolean {
  return ALLY_NAME_RE.test(name.trim())
}

export function guessAllyTargetCount(name: string): number {
  if (MULTI_TARGET_RE.test(name.trim())) return 3
  return 1
}
