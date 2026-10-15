import type { ReactNode } from 'react'

type MobileAbilitiesPageProps = {
  open: boolean
  onClose: () => void
  onOpenOwnership: () => void
  /** Desk rail passives (Внимат. / Анализ / Прониц.) — restored under skills. */
  passives?: ReactNode
  children: ReactNode
}

/** Full-screen characteristics page (mobile kit path B). */
export function MobileAbilitiesPage({
  open,
  onClose,
  onOpenOwnership,
  passives,
  children,
}: MobileAbilitiesPageProps) {
  if (!open) return null
  return (
    <div className="mobile-abil-page" role="dialog" aria-modal="true" aria-label="Характеристики">
      <header className="mobile-abil-page__head">
        <button type="button" className="mobile-abil-page__back" onClick={onClose}>
          ←
        </button>
        <h2 className="mobile-abil-page__title">Характеристики</h2>
      </header>
      <div className="mobile-abil-page__body">{children}</div>
      <footer className="mobile-abil-page__foot">
        {passives ? <div className="mobile-abil-page__passives">{passives}</div> : null}
        <button type="button" className="mobile-abil-page__own" onClick={onOpenOwnership}>
          Владения ▸
        </button>
      </footer>
    </div>
  )
}
