import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getAccessToken } from '../api/client'

type RequireAuthProps = {
  children: ReactNode
}

export function RequireAuth({ children }: RequireAuthProps) {
  const location = useLocation()
  if (!getAccessToken()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return children
}
