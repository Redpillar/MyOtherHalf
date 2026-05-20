import { useMemo } from 'react'

export type AdminPaginationResult<T> = {
  page: number
  pageSize: number
  total: number
  totalPages: number
  pageItems: T[]
  from: number
  to: number
}

export function paginate<T>(items: T[], page: number, pageSize: number): AdminPaginationResult<T> {
  const safePageSize = Math.max(1, Math.min(200, Math.floor(pageSize) || 20))
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / safePageSize))
  const safePage = Math.max(1, Math.min(totalPages, Math.floor(page) || 1))
  const start = (safePage - 1) * safePageSize
  const end = Math.min(total, start + safePageSize)
  const pageItems = items.slice(start, end)
  return {
    page: safePage,
    pageSize: safePageSize,
    total,
    totalPages,
    pageItems,
    from: total === 0 ? 0 : start + 1,
    to: end,
  }
}

export function usePagination<T>(items: T[], page: number, pageSize: number) {
  return useMemo(() => paginate(items, page, pageSize), [items, page, pageSize])
}

