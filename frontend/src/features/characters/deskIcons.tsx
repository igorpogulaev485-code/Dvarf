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

/** Death saves — skull */
export function IconSkull(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        {...stroke}
        d="M12 3.8c-3.7 0-6.4 2.6-6.4 6.1 0 2.2 1 3.7 2.2 4.7v2.6c0 .7.6 1.3 1.3 1.3h5.8c.7 0 1.3-.6 1.3-1.3v-2.6c1.2-1 2.2-2.5 2.2-4.7 0-3.5-2.7-6.1-6.4-6.1Z"
      />
      <circle {...stroke} cx="9.2" cy="10.2" r="1.15" />
      <circle {...stroke} cx="14.8" cy="10.2" r="1.15" />
      <path {...stroke} d="M10.2 14.2h3.6M11.2 16.8v1.6M12.8 16.8v1.6" />
    </Svg>
  )
}

/** Conditions — linked nodes (kit desk-chrome §D) */
export function IconConditions(props: IconProps) {
  return (
    <Svg {...props}>
      <circle {...stroke} cx="7.2" cy="8.2" r="2.4" />
      <circle {...stroke} cx="16.8" cy="8.2" r="2.4" />
      <circle {...stroke} cx="12" cy="16.2" r="2.4" />
      <path {...stroke} d="M9.2 9.4 10.4 14.2M14.8 9.4 13.6 14.2M9.6 8.2h4.8" />
    </Svg>
  )
}

/** Exhaustion — stacked bars */
export function IconExhaustion(props: IconProps) {
  return (
    <Svg {...props}>
      <path {...stroke} d="M5.5 17.5h13" />
      <path {...stroke} d="M6.5 14h11" />
      <path {...stroke} d="M7.5 10.5h9" />
      <path {...stroke} d="M8.5 7h7" />
      <path {...stroke} d="M9.5 3.5h5" />
    </Svg>
  )
}

/** Concentration — orbit (kit desk-chrome §D / hot-bar) */
export function IconConcentration(props: IconProps) {
  return (
    <Svg {...props}>
      <circle {...stroke} cx="12" cy="12" r="3.2" />
      <path {...stroke} d="M12 4.2a7.8 7.8 0 0 1 7.8 7.8" />
      <path {...stroke} d="M12 19.8A7.8 7.8 0 0 1 4.2 12" />
      <path {...stroke} d="M18.6 7.2l1.4-.8M5.4 16.8l-1.4.8" />
    </Svg>
  )
}

/** Resources — pouch (kit desk-chrome §D) */
export function IconPouch(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        {...stroke}
        d="M8.2 9.2h7.6c1.2 0 2.1 1 2 2.2l-.6 7.2c-.1 1.1-1 1.9-2.1 1.9H8.9c-1.1 0-2-.8-2.1-1.9l-.6-7.2c-.1-1.2.8-2.2 2-2.2Z"
      />
      <path {...stroke} d="M9.5 9.2V7.6A2.5 2.5 0 0 1 12 5.1 2.5 2.5 0 0 1 14.5 7.6v1.6" />
      <path {...stroke} d="M10.5 13.2h3" />
    </Svg>
  )
}
