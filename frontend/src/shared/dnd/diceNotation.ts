/**
 * Кириллическое «к» — только показ. Хранение и API остаются на «d».
 * Квадратные скобки (английские имена вроде [Chain Lightning]) не меняются.
 */

const DICE_D = /(?<![A-Za-zА-Яа-яЁё0-9])(\d*)[dD](\d{1,3})(?!\d)/g
const DICE_K = /(?<![A-Za-zА-Яа-яЁё0-9])(\d*)[кК](\d{1,3})(?!\d)/g

function mapOutsideBrackets(text: string, fn: (chunk: string) => string): string {
  return text.replace(/\[[^\[\]]*\]|[^[]+/g, (chunk) =>
    chunk.startsWith('[') ? chunk : fn(chunk),
  )
}

/** «1d20» / «d8» → «1к20» / «к8». Уже кириллическое «к» не трогает. */
export function displayDiceNotation(text: string): string {
  return mapOutsideBrackets(text, (chunk) =>
    chunk.replace(DICE_D, (_match, count: string, sides: string) => `${count}к${sides}`),
  )
}

/** «1к20» → «1d20» перед записью в формулу/API. «d» остаётся «d». */
export function storageDiceNotation(text: string): string {
  return mapOutsideBrackets(text, (chunk) =>
    chunk.replace(DICE_K, (_match, count: string, sides: string) => `${count}d${sides}`),
  )
}
