import { useEffect, useState } from 'react'

/** Create-pipeline phone breakpoint (matches `14-create-pipeline.css`). */
export const CREATE_PIPELINE_PHONE_QUERY = '(max-width: 860px)'

function readPhone(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(CREATE_PIPELINE_PHONE_QUERY).matches
}

export function useIsPhone(): boolean {
  const [phone, setPhone] = useState(readPhone)
  useEffect(() => {
    const mq = window.matchMedia(CREATE_PIPELINE_PHONE_QUERY)
    const onChange = () => setPhone(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return phone
}
