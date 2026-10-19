import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/** Public product site (domain). Until HTTPS/nginx is ready, in-app /legal is the safe target. */
export const PRODUCT_SITE_URL = 'https://creed20.tech'
export const LEGAL_CONTACT_EMAIL = 'info@creed20.tech'

/** Wordmark: from «Крит», Т struck through and replaced by D → КриD20 */
export function Creed20Wordmark({ className }: { className?: string }) {
  return (
    <span className={className ? `brand-wordmark ${className}` : 'brand-wordmark'}>
      Кри
      <span className="brand-wordmark__struck" aria-hidden="true">
        т
      </span>
      <span className="brand-wordmark__d">D</span>20
    </span>
  )
}

export function openProductSite(): void {
  // Same app on creed20.tech; fall back to in-app /legal if domain unreachable.
  window.location.assign(PRODUCT_SITE_URL)
}

export function AppLegalFooter({ extra }: { extra?: ReactNode }) {
  return (
    <footer className="app-legal-footer">
      <p className="app-legal-footer__links">
        <Link to="/legal">Правовая информация</Link>
        <span aria-hidden="true"> · </span>
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>
      </p>
      {extra}
    </footer>
  )
}
