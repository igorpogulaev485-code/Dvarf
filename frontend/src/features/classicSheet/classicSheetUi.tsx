import { createContext, useContext, type ReactNode } from 'react'
import type { ClassicTextStyle } from './classicPrintSettings'

type ClassicSheetUiValue = {
  /** Show print typography / size controls (toolbar «Правка печати»). */
  editing: boolean
  textStyle?: ClassicTextStyle
  globalFontScale?: number
  pencilBlanks?: boolean
}

const ClassicSheetUiContext = createContext<ClassicSheetUiValue>({ editing: false })

export function ClassicSheetUiProvider({
  editing,
  textStyle,
  globalFontScale,
  pencilBlanks,
  children,
}: {
  editing: boolean
  textStyle?: ClassicTextStyle
  globalFontScale?: number
  pencilBlanks?: boolean
  children: ReactNode
}) {
  return (
    <ClassicSheetUiContext.Provider
      value={{ editing, textStyle, globalFontScale, pencilBlanks }}
    >
      {children}
    </ClassicSheetUiContext.Provider>
  )
}

export function useClassicSheetUi(): ClassicSheetUiValue {
  return useContext(ClassicSheetUiContext)
}
