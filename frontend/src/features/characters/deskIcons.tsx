/** Line icons for play-desk header / chrome (kit desk-chrome). */

import type { ReactNode } from 'react'

type IconProps = { className?: string; title?: string }

function Svg({
  className,
  title,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      className={className ? `desk-icon ${className}` : 'desk-icon'}
      viewBox="0 0 24 24"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  )
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

/** Armor class — shield */
export function IconShield(props: IconProps) {
  return (
    <Svg {...props}>
      <path {...stroke} d="M12 3.5 5.5 6.2v5.1c0 4.1 2.7 7.4 6.5 8.7 3.8-1.3 6.5-4.6 6.5-8.7V6.2L12 3.5Z" />
    </Svg>
  )
}

/** Speed — boot */
export function IconBoot(props: IconProps) {
  return (
    <Svg {...props}>
      <path {...stroke} d="M7 5.5h5.2c1.2 0 2.2.9 2.3 2.1l.3 4.4H18c1.1 0 2 .8 2.1 1.9l.2 2.1H8.2L7 14.2V5.5Z" />
      <path {...stroke} d="M7 14.2H5.2A1.2 1.2 0 0 1 4 13V9.8" />
    </Svg>
  )
}

/** Initiative — spark / bolt */
export function IconBolt(props: IconProps) {
  return (
    <Svg {...props}>
      <path {...stroke} d="M13.2 3.5 7.5 13h4.2l-.9 7.5L16.5 11h-4.1l.8-7.5Z" />
    </Svg>
  )
}

/** Proficiency bonus — seal / badge */
export function IconBadge(props: IconProps) {
  return (
    <Svg {...props}>
      <circle {...stroke} cx="12" cy="11" r="5.2" />
      <path {...stroke} d="M9.2 15.6 8 20.2l4-1.7 4 1.7-1.2-4.6" />
    </Svg>
  )
}

/** Coin — gold piece */
export function IconCoin(props: IconProps) {
  return (
    <Svg {...props}>
      <circle {...stroke} cx="12" cy="12" r="7.2" />
      <circle {...stroke} cx="12" cy="12" r="4.2" />
      <path {...stroke} d="M12 9.2v5.6M10.4 10.6c.4-.6 1-.9 1.6-.9.9 0 1.6.5 1.6 1.3 0 1.4-3.2 1.1-3.2 2.7 0 .7.7 1.3 1.7 1.3.7 0 1.3-.3 1.6-.8" />
    </Svg>
  )
}

/** Rest — crescent / bedroll spark */
export function IconRest(props: IconProps) {
  return (
    <Svg {...props}>
      <path {...stroke} d="M15.8 5.2a6.8 6.8 0 1 0 3 12.2 7.4 7.4 0 0 1-3-12.2Z" />
      <path {...stroke} d="M16.8 7.2v2.2M15.7 8.3h2.2" />
    </Svg>
  )
}

/** Inspiration — sparkle */
export function IconSpark(props: IconProps) {
  return (
    <Svg {...props}>
      <path {...stroke} d="M12 3.8v3.2M12 17v3.2M3.8 12h3.2M17 12h3.2" />
      <path {...stroke} d="M7.2 7.2l2.1 2.1M14.7 14.7l2.1 2.1M16.8 7.2l-2.1 2.1M9.3 14.7l-2.1 2.1" />
      <circle {...stroke} cx="12" cy="12" r="2.2" />
    </Svg>
  )
}
