import { type ChangeEvent } from 'react'

export function AdminPager(props: {
  page: number
  pageSize: number
  total: number
  totalPages: number
  from: number
  to: number
  onPageChange: (next: number) => void
  onPageSizeChange: (next: number) => void
  pageSizeOptions?: number[]
}) {
  const opts = props.pageSizeOptions || [10, 20, 30, 50, 100]
  const canPrev = props.page > 1
  const canNext = props.page < props.totalPages

  const onSelect = (e: ChangeEvent<HTMLSelectElement>) => {
    const n = Number(e.currentTarget.value)
    if (Number.isFinite(n) && n > 0) props.onPageSizeChange(n)
  }

  return (
    <div className="adminPager" role="navigation" aria-label="페이지 이동">
      <div className="adminPagerInfo">
        <strong>{props.from}</strong>–<strong>{props.to}</strong> / <strong>{props.total}</strong>
      </div>

      <div className="adminPagerControls">
        <button type="button" className="adminPagerBtn" onClick={() => props.onPageChange(1)} disabled={!canPrev}>
          처음
        </button>
        <button type="button" className="adminPagerBtn" onClick={() => props.onPageChange(props.page - 1)} disabled={!canPrev}>
          이전
        </button>
        <span className="adminPagerInfo">
          {props.page} / {props.totalPages}
        </span>
        <button type="button" className="adminPagerBtn" onClick={() => props.onPageChange(props.page + 1)} disabled={!canNext}>
          다음
        </button>
        <button
          type="button"
          className="adminPagerBtn"
          onClick={() => props.onPageChange(props.totalPages)}
          disabled={!canNext}
        >
          끝
        </button>
        <select className="adminPagerSelect" value={props.pageSize} onChange={onSelect} aria-label="페이지당 개수">
          {opts.map((n) => (
            <option key={n} value={n}>
              {n}개
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

