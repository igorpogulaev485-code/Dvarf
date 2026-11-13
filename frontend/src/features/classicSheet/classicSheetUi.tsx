import { createContext, useContext, type ReactNode } from 'react'

type ClassicSheetUiValue = {
  /** Show per-block font-size controls (toolbar «Правка»). */
  editing: boolean
}

const ClassicSheetUiContext = createContext<ClassicSheetUiValue>({ editing: false })

export function ClassicSheetUiProvider({
  editing,
  children,
}: {
  editing: boolean
  children: ReactNode
}) {
  return (
    <ClassicSheetUiContext.Provider value={{ editing }}>
      {children}
    </ClassicSheetUiContext.Provider>
  )
}

export function useClassicSheetUi(): ClassicSheetUiValue {
  return useContext(ClassicSheetUiContext)
}
