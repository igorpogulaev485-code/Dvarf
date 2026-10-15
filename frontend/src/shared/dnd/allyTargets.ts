/** Эффекты/способности, которые по умолчанию вешаются на союзников. */

/** Имена, которые обычно вешаются на союзников (не на врагов вроде Hex). */
const ALLY_NAME_RE =
  /благословен|bless|ускорен|haste|щит\s*вер|shield of faith|наставлен|guidance|помощ[ьи]|\baid\b|героизм|heroism|вардинг|warding bond|вдохновен|inspiration|инфуз|infusion|бафф?|\bбаф\b/i

export function guessAppliesToAllies(name: string): boolean {
  return ALLY_NAME_RE.test(name.trim())
}
