import { createContext, useContext, type ReactNode } from 'react'
import type { ClassicTextStyle } from './classicPrintSettings'

type ClassicSheetUiValue = {
  /** Show print typography / size controls (toolbar «Правка печати»). */
  editing: boolean
  textStyle?: ClassicTextStyle
  pencilBlanks?: boolean
}

const ClassicSheetUiContext = createContext<ClassicSheetUiValue>({ editing: false })

export function ClassicSheetUiProvider({
  editing,
  textStyle,
  pencilBlanks,
  children,
}: {
  editing: boolean
  textStyle?: ClassicTextStyle
  /** @deprecated Ignored — global scale removed. */
  globalFontScale?: number
  pencilBlanks?: boolean
  children: ReactNode
}) {
  return (
    <ClassicSheetUiContext.Provider value={{ editing, textStyle, pencilBlanks }}>
      {children}
    </ClassicSheetUiContext.Provider>
  )
}

export function useClassicSheetUi(): ClassicSheetUiValue {
  return useContext(ClassicSheetUiContext)
}
