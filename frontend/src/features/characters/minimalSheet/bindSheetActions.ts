/** Собирает действия листа на model до запуска хуков. */
import type { SheetModel } from './sheetModel'
import { installSheetActions1 } from './sheetActions1'
import { installSheetActions2 } from './sheetActions2'
import { installSheetActions3 } from './sheetActions3'
import { installSheetActions4 } from './sheetActions4'
import { installSheetActions5 } from './sheetActions5'

export function bindSheetActions(model: SheetModel) {
  installSheetActions1(model)
  installSheetActions2(model)
  installSheetActions3(model)
  installSheetActions4(model)
  installSheetActions5(model)
}
