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
  const all = queryVisibleAnchors(selector, root)
  return all[0] ?? null
}

/** All visible matches for a selector (e.g. mid + right header strips). */
export function queryVisibleAnchors(
  selector: string,
  root: ParentNode = document,
): HTMLElement[] {
  const out: HTMLElement[] = []
  const nodes = root.querySelectorAll(selector)
  for (const node of nodes) {
    const el = asHtmlElement(node as Element)
    if (el && isElementVisible(el)) out.push(el)
  }
  return out
}

export type AnchorRect = { top: number; left: number; width: number; height: number }

/** Bounding box union of every visible match — for multi-node spotlights. */
export function unionVisibleRects(
  selector: string,
  root: ParentNode = document,
): AnchorRect | null {
  const els = queryVisibleAnchors(selector, root)
  if (els.length === 0) return null
  let top = Infinity
  let left = Infinity
  let right = -Infinity
  let bottom = -Infinity
  for (const el of els) {
    const r = el.getBoundingClientRect()
    if (r.width < 2 && r.height < 2) continue
    top = Math.min(top, r.top)
    left = Math.min(left, r.left)
    right = Math.max(right, r.right)
    bottom = Math.max(bottom, r.bottom)
  }
  if (!Number.isFinite(top) || right - left < 2 || bottom - top < 2) return null
  return { top, left, width: right - left, height: bottom - top }
}

export function hasVisibleOnboardingAnchor(anchor: string, root: ParentNode = document): boolean {
  return Boolean(queryVisibleAnchor(`[data-onboarding="${anchor}"]`, root))
}

/**
 * Pick the tour spotlight id for a step.
 * TOUR-01: vitals (incl. collapsed), hot-bar, scenes, turn row, help — never needs-setup.
 */
export function resolveSheetTourAnchor(
  stepId: SheetTourStepId,
  preferred: string,
  opts: { narrow: boolean; hasVisible: (anchor: string) => boolean },
): string {
  if (stepId === 'combat_header') {
    if (opts.hasVisible('combat-vitals')) return 'combat-vitals'
    if (opts.hasVisible('combat-header')) return 'combat-header'
    return preferred
  }
  if (stepId === 'hot_bar') {
    if (opts.hasVisible('hot-bar')) return 'hot-bar'
    return preferred
  }
  if (stepId === 'desk_modes') {
    if (opts.hasVisible('desk-modes')) return 'desk-modes'
    return preferred
  }
  if (stepId === 'turn_actions') {
    // Prefer the turn row; never the mobile «Атаки / Заклинания» toggle (`actions`).
    if (opts.hasVisible('turn-actions')) return 'turn-actions'
    return preferred
  }
  if (stepId === 'help') {
    if (opts.hasVisible('help')) return 'help'
    return preferred
  }
  return preferred
}

/** Switch Play Desk to «Бой» and (on phone) «Атаки» so the turn row is visible. */
export function ensureCombatTourSurface(): void {
  if (typeof document === 'undefined') return
  const clickFirst = (nodes: NodeListOf<Element> | Element[]) => {
    for (const node of nodes) {
      const el = asHtmlElement(node as Element)
      if (el && isElementVisible(el)) {
        el.click()
        return true
      }
    }
    return false
  }

  const combatTabs = document.querySelectorAll(
    '[data-onboarding="desk-modes"] [data-desk-mode="combat"], [data-onboarding="desk-modes"] [aria-label="Бой"]',
  )
  clickFirst(combatTabs)

  // Fallback: text match on mode buttons / bottom nav.
  if (!document.querySelector('.play-desk__mode.is-on[data-desk-mode="combat"], .mobile-scene-nav__tab.is-on[data-desk-mode="combat"]')) {
    const byText = [...document.querySelectorAll('.play-desk__mode, .mobile-scene-nav__tab')].filter(
      (el) => /^Бой$/i.test((el.textContent || '').trim()) || (el.getAttribute('aria-label') || '') === 'Бой',
    )
    clickFirst(byText)
  }

  // Caster phone: turn row lives under «Атаки», not under «Заклинания».
  const seg = document.querySelector('.mobile-combat-seg[aria-label="Бой"]')
  if (seg) {
    const tabs = [...seg.querySelectorAll('[role="tab"]')]
    const attacks = tabs.find((el) => /Атаки/i.test(el.textContent || ''))
    if (attacks instanceof HTMLElement && attacks.getAttribute('aria-selected') !== 'true') {
      attacks.click()
    }
  }
}
