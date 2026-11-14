/**
 * Ref-counted body scroll lock for stacked dialogs/pads.
 * Restoring a single dialog must not clear overflow while another is open.
 *
 * iPad Safari: overflow:hidden on body alone still rubber-bands the page under
 * a fixed backdrop — pin html+body and freeze scrollY while any dialog is open.
 */

let lockCount = 0
let previousBodyOverflow = ''
let previousHtmlOverflow = ''
let previousBodyPosition = ''
let previousBodyTop = ''
let previousBodyLeft = ''
let previousBodyRight = ''
let previousBodyWidth = ''
let previousHtmlOverscroll = ''
let lockedScrollY = 0

export function acquireBodyScrollLock(): () => void {
  if (typeof document === 'undefined') {
    return () => undefined
  }
  if (lockCount === 0) {
    const body = document.body
    const html = document.documentElement
    previousBodyOverflow = body.style.overflow
    previousHtmlOverflow = html.style.overflow
    previousBodyPosition = body.style.position
    previousBodyTop = body.style.top
    previousBodyLeft = body.style.left
    previousBodyRight = body.style.right
    previousBodyWidth = body.style.width
    previousHtmlOverscroll = html.style.overscrollBehavior
    lockedScrollY = window.scrollY || window.pageYOffset || 0

    html.style.overflow = 'hidden'
    html.style.overscrollBehavior = 'none'
    body.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = `-${lockedScrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'
  }
  lockCount += 1
  let released = false
  return () => {
    if (released) return
    released = true
    lockCount = Math.max(0, lockCount - 1)
    if (lockCount === 0) {
      const body = document.body
      const html = document.documentElement
      body.style.overflow = previousBodyOverflow
      body.style.position = previousBodyPosition
      body.style.top = previousBodyTop
      body.style.left = previousBodyLeft
      body.style.right = previousBodyRight
      body.style.width = previousBodyWidth
      html.style.overflow = previousHtmlOverflow
      html.style.overscrollBehavior = previousHtmlOverscroll
      previousBodyOverflow = ''
      previousHtmlOverflow = ''
      previousBodyPosition = ''
      previousBodyTop = ''
      previousBodyLeft = ''
      previousBodyRight = ''
      previousBodyWidth = ''
      previousHtmlOverscroll = ''
      window.scrollTo(0, lockedScrollY)
      lockedScrollY = 0
    }
  }
}

/** Emergency clear — route change / remount when a dialog leaked the lock. */
export function forceReleaseBodyScrollLock(): void {
  if (typeof document === 'undefined') return
  const y = lockedScrollY
  lockCount = 0
  const body = document.body
  const html = document.documentElement
  body.style.overflow = previousBodyOverflow
  body.style.position = previousBodyPosition
  body.style.top = previousBodyTop
  body.style.left = previousBodyLeft
  body.style.right = previousBodyRight
  body.style.width = previousBodyWidth
  html.style.overflow = previousHtmlOverflow
  html.style.overscrollBehavior = previousHtmlOverscroll
  previousBodyOverflow = ''
  previousHtmlOverflow = ''
  previousBodyPosition = ''
  previousBodyTop = ''
  previousBodyLeft = ''
  previousBodyRight = ''
  previousBodyWidth = ''
  previousHtmlOverscroll = ''
  lockedScrollY = 0
  window.scrollTo(0, y)
}
