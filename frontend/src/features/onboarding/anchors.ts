import type { SheetTourStepId } from './types'

function asHtmlElement(node: Element | null | undefined): HTMLElement | null {
  if (!node) return null
  // Avoid `instanceof HTMLElement` — Node selfcheck has no DOM globals.
  if (typeof (node as HTMLElement).getBoundingClientRect !== 'function') return null
  return node as HTMLElement
}

/** True when the node participates in layout and has a measurable box. */
export function isElementVisible(el: HTMLElement): boolean {
  if (typeof window === 'undefined') return false
  const style = window.getComputedStyle(el)
  if (style.display === 'none' || style.visibility === 'hidden') return false
  const r = el.getBoundingClientRect()
  if (r.width < 2 && r.height < 2) return false
  return true
}

/** First visible `data-onboarding` match — skips `display:none` siblings. */
export function queryVisibleAnchor(
  selector: string,
  root: ParentNode = document,
): HTMLElement | null {
  const nodes = root.querySelectorAll(selector)
  for (const node of nodes) {
    const el = asHtmlElement(node as Element)
    if (el && isElementVisible(el)) return el
  }
  return null
}

export function hasVisibleOnboardingAnchor(anchor: string, root: ParentNode = document): boolean {
  return Boolean(queryVisibleAnchor(`[data-onboarding="${anchor}"]`, root))
}

/**
 * Pick the tour spotlight id for a step.
 * Desktop checklist may sit below the fold — caller scrolls; if the node is
 * gone after M-packs, fall back to needs-setup badge or «Справка».
 */
export function resolveSheetTourAnchor(
  stepId: SheetTourStepId,
  preferred: string,
  opts: { narrow: boolean; hasVisible: (anchor: string) => boolean },
): string {
  if (opts.narrow) {
    if (stepId === 'checklist') return 'help'
    return preferred
  }
  if (stepId === 'checklist') {
    if (opts.hasVisible('checklist')) return 'checklist'
    if (opts.hasVisible('needs-setup')) return 'needs-setup'
    if (opts.hasVisible('help')) return 'help'
    return preferred
  }
  return preferred
}
