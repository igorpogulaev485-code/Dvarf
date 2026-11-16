import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PAGINATION_PAGE_SIZES } from '../../ui/Pagination'

const DEFAULT_SIZE = 20

function parsePage(raw: string | null): number {
  const n = Number.parseInt(raw || '1', 10)
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.floor(n)
}

function parsePageSize(raw: string | null): number {
  const n = Number.parseInt(raw || String(DEFAULT_SIZE), 10)
  if ((PAGINATION_PAGE_SIZES as readonly number[]).includes(n)) return n
  return DEFAULT_SIZE
}

/**
 * page / page_size в query админки — обновление и «Назад» браузера сохраняют место.
 */
export function useAdminPaging() {
  const [params, setParams] = useSearchParams()
  const page = parsePage(params.get('page'))
  const pageSize = parsePageSize(params.get('page_size'))

  const setPage = useCallback(
    (next: number) => {
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          p.set('page', String(Math.max(1, Math.floor(next))))
          if (!p.get('page_size')) p.set('page_size', String(pageSize))
          return p
        },
        { replace: true },
      )
    },
    [pageSize, setParams],
  )

  const setPageSize = useCallback(
    (size: number) => {
      const nextSize = (PAGINATION_PAGE_SIZES as readonly number[]).includes(size)
        ? size
        : DEFAULT_SIZE
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          p.set('page_size', String(nextSize))
          p.set('page', '1')
          return p
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const resetPage = useCallback(() => {
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        p.set('page', '1')
        return p
      },
      { replace: true },
    )
  }, [setParams])

  return {
    page,
    pageSize,
    setPage,
    setPageSize,
    resetPage,
    pageSizeOptions: PAGINATION_PAGE_SIZES,
  }
}
