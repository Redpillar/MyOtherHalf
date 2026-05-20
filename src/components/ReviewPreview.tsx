import type { ReviewTone } from '../review/reviewTypes'

type ReviewPreviewProps = {
  title: string
  subtitle: string
  summary: string
  tone: ReviewTone
  compact?: boolean
}

function makeLines(title: string, subtitle: string, summary: string) {
  const clean = [subtitle, summary, title]
    .map((value) => value.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  return [
    clean[0] || '처음엔 조금 어색했는데',
    clean[1] || '대화가 길어질수록 더 편안했어요.',
    clean[2] || '다음 만남이 기다려졌어요.',
  ]
}

export function ReviewPreview({ title, subtitle, summary, tone, compact = false }: ReviewPreviewProps) {
  const [lineA, lineB, lineC] = makeLines(title, subtitle, summary)

  return (
    <div className={`reviewPreview reviewTone-${tone} ${compact ? 'reviewPreviewCompact' : ''}`} aria-hidden="true">
      <div className="reviewPreviewTop">
        <span className="reviewPreviewDot" />
        <span className="reviewPreviewDot" />
        <span className="reviewPreviewDot" />
      </div>
      <div className="reviewPreviewBody">
        <div className="reviewBubble reviewBubbleLeft">{lineA}</div>
        <div className="reviewBubble reviewBubbleRight">{lineB}</div>
        <div className="reviewBubble reviewBubbleLeft reviewBubbleAccent">{lineC}</div>
      </div>
    </div>
  )
}
