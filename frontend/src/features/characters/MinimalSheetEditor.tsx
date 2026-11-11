/** Публичный редактор листа. Логика разнесена по minimalSheet/, контракт компонента прежний. */
import type { MinimalSheetEditorProps } from './minimalSheet/draft'
import type { SheetModel } from './minimalSheet/sheetModel'
import { bindSheetActions } from './minimalSheet/bindSheetActions'
import { useSheetEditorPart1 } from './minimalSheet/useSheetEditorPart1'
import { useSheetEditorPart2 } from './minimalSheet/useSheetEditorPart2'
import { useSheetEditorPart3 } from './minimalSheet/useSheetEditorPart3'
import { useSheetEditorPart4 } from './minimalSheet/useSheetEditorPart4'
import { useSheetEditorPart5 } from './minimalSheet/useSheetEditorPart5'
import { PlayDeskLayout } from './minimalSheet/PlayDeskLayout'

export function MinimalSheetEditor(props: MinimalSheetEditorProps) {
  const model = {} as SheetModel
  bindSheetActions(model)
  useSheetEditorPart1(model, props)
  useSheetEditorPart2(model)
  useSheetEditorPart3(model)
  useSheetEditorPart4(model)
  useSheetEditorPart5(model)
  return <PlayDeskLayout model={model} />
}
