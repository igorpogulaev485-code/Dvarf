import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

type Props = {
  inviteCode: string
  lobbyName: string
  size?: number
}

/** Локальный QR полного URL входа — без api.qrserver.com (L-03). */
export function InviteQr({ inviteCode, lobbyName, size = 180 }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const joinUrl = `${window.location.origin}/join/${inviteCode}`
    void QRCode.toDataURL(joinUrl, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (active) setDataUrl(url)
      })
      .catch(() => {
        if (active) setDataUrl(null)
      })
    return () => {
      active = false
    }
  }, [inviteCode, size])

  if (!dataUrl) {
    return (
      <div
        className="invite-qr invite-qr--pending"
        style={{ width: size, height: size }}
        aria-hidden
      />
    )
  }

  return (
    <img
      className="invite-qr"
      src={dataUrl}
      alt={`QR для входа в лобби ${lobbyName}`}
      width={size}
      height={size}
    />
  )
}

export function joinUrlForCode(inviteCode: string): string {
  return `${window.location.origin}/join/${inviteCode}`
}
