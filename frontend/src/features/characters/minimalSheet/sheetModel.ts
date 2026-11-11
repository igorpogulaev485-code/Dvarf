/** Общий мешок состояния листа. Поля заполняются по ходу рендера, функции читают их в момент вызова. */
import type { Dispatch, SetStateAction } from 'react'
import type { CatalogEntry } from '../../../shared/api/catalog'
import type { CompanionEntry } from '../companions'
import type { GuidedWizardSession } from '../GuidedWizardDialog'
import type { AbilityKey } from '../sheetTypes'
import type { Draft } from './draft'

export interface SheetModel {
  draft: Draft
  setDraft: Dispatch<SetStateAction<Draft>>
  dockCompanions: CompanionEntry[]
  gearAbilities: Record<AbilityKey, number>
  abilityBreakdownKey: AbilityKey | null
  raceCatalogRows: CatalogEntry[]
  setGuidedWizard: Dispatch<SetStateAction<GuidedWizardSession | null>>
  setPausedWizardForBackground: Dispatch<SetStateAction<GuidedWizardSession | null>>
  setPausedWizardForSubclass: Dispatch<SetStateAction<GuidedWizardSession | null>>
  mergeSubclassSlice: (prev: Draft, slice: any) => Draft
  [key: string]: any
}
