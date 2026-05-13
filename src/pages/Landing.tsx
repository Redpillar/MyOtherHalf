import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { KpiAnimatedBar } from '../components/KpiAnimatedBar'
import { SiteHeader } from '../components/SiteHeader'
import { apiFetch, readJsonResponse } from '../lib/apiFetch'
import { useMemberSession } from '../lib/memberSession'
import type { RecommendTone, RecommendationItem } from '../lib/recommendationTypes'
import { LandingPostRecommendSections } from '../components/LandingPostRecommendSections'
import './landing.scss'

const RECOMMEND_TONES: RecommendTone[] = ['gray', 'blue', 'pink', 'purple', 'slate']

function isRecommendTone(t: string): t is RecommendTone {
  return (RECOMMEND_TONES as readonly string[]).includes(t)
}

function RecommendAvatar({ tone }: { tone: RecommendTone }) {
  return (
    <div className={`recommendAvatar recommendAvatar--${tone}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4Zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4Z" />
      </svg>
    </div>
  )
}

/** 카드 가로(px). 카드 사이 간격은 `REC_GAP_PX`. 무한 루프는 슬롯(카드+간격) 폭으로 한 칸씩 이동합니다. */
const REC_CARD_WIDTH_PX = 265
const REC_GAP_PX = 10
const REC_SLOT_PX = REC_CARD_WIDTH_PX + REC_GAP_PX

const COUPLE_REVIEW_CARDS = [
  {
    title: '첫 만남이 두 번째 약속으로',
    label: '내반쪽 만남후기',
    sublabel: '내반쪽 커플후기♥',
    tone: 'peach',
    messages: [
      { side: 'left', text: '오늘 분위기 너무 편해서 시간 가는 줄 몰랐어요 :)' },
      { side: 'right', text: '저도요! 다음엔 제가 맛집 예약할게요.' },
      { side: 'left', text: '이번 주말 저녁 괜찮으세요?' },
      { side: 'right', text: '좋아요. 벌써 기대돼요!' },
    ],
  },
  {
    title: '서툴렀던 대화가 설렘으로',
    label: '내반쪽 만남후기',
    sublabel: '내반쪽 커플후기♥',
    tone: 'sky',
    messages: [
      { side: 'left', text: '처음엔 긴장했는데 편하게 리드해 주셔서 감사했어요.' },
      { side: 'right', text: '저도 대화가 잘 통해서 집 가는 길이 아쉬웠어요.' },
      { side: 'right', text: '다음에는 전시회 같이 가요!' },
      { side: 'left', text: '좋아요. 일정 바로 맞춰볼게요.' },
    ],
  },
  {
    title: '자연스럽게 이어진 연락',
    label: '내반쪽 만남후기',
    sublabel: '내반쪽 커플후기♥',
    tone: 'mint',
    messages: [
      { side: 'left', text: '오늘 이야기한 산책 코스, 진짜 같이 가보고 싶어요.' },
      { side: 'right', text: '그 말 하려던 참이었어요 ㅎㅎ' },
      { side: 'right', text: '다음 주에 시간 맞추면 어떨까요?' },
      { side: 'left', text: '좋죠. 저녁까지 같이 보내요!' },
    ],
  },
  {
    title: '만남 이후 더 커진 확신',
    label: '내반쪽 만남후기',
    sublabel: '내반쪽 커플후기♥',
    tone: 'gold',
    messages: [
      { side: 'left', text: '매니저님 덕분에 좋은 분을 만난 것 같아요.' },
      { side: 'right', text: '저도 정말 같은 마음이에요.' },
      { side: 'left', text: '다음엔 조금 더 길게 데이트해요.' },
      { side: 'right', text: '좋아요. 우리 천천히 오래 봐요.' },
    ],
  },
] as const

const PRODUCT_ITEMS = [
  {
    name: '블라인드',
    desc: '대화 속에서 진짜 매력을 발견하고 싶은 분들께 추천',
  },
  {
    name: '프리미엄',
    note: '(상위 10%)',
    desc: '연락과 상대방의 외모를 중요시하시는 분들께 추천',
  },
  {
    name: '화이트 만남권',
    desc: '빠르고 부담 없는 만남을 원하는 분들께 추천',
  },
  {
    name: '블랙 만남권',
    desc: '직업, 경제력, 학력 등 현실적인 세부 조건을 선택하고 미래를 함께할 인연을 찾는 분들께 추천',
  },
  {
    name: '스페셜 만남권',
    desc: '횟수 제한 없이 교제할 때까지 마음 편하게 소개팅을 진행하고 싶은 분들께 추천',
  },
] as const

function cardsPerViewForWidth(width: number): number {
  if (width <= 640) return 1
  if (width <= 1024) return 2
  return 3
}

function estimateCarouselMeta(width: number, itemCount: number) {
  if (itemCount <= 0) {
    return { n: 3, short: true }
  }
  const n = cardsPerViewForWidth(width)
  const short = itemCount <= n
  return { n, short }
}

/** 보이는 n칸의 가운데가 패드 가로 중앙에 오도록 이동량(px, 왼쪽으로 양수). */
function recommendTrackTransform(
  recommendIdx: number,
  padWidth: number,
  n: number,
  short: boolean,
  recLen: number,
): string | undefined {
  if (short || recLen === 0) return undefined
  if (padWidth <= 0) return `translateX(-${recommendIdx * REC_SLOT_PX}px)`
  const d = recommendIdx * REC_SLOT_PX + (n * REC_SLOT_PX) / 2 - padWidth / 2
  return `translateX(-${d}px)`
}

export function Landing() {
  const member = useMemberSession()
  const [recItems, setRecItems] = useState<RecommendationItem[]>([])
  const [recLoadError, setRecLoadError] = useState<string | null>(null)
  const [recommendIdx, setRecommendIdx] = useState(0)
  const viewportRef = useRef<HTMLDivElement>(null)
  const [carousel, setCarousel] = useState({ n: 3, short: true })
  const [padWidth, setPadWidth] = useState(0)
  const [noTrans, setNoTrans] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const fn = () => setReduceMotion(mq.matches)
    fn()
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await apiFetch('/api/recommendations')
        const j = await readJsonResponse<{ items?: unknown[]; error?: string }>(r)
        if (!r.ok) throw new Error(j.error || '추천 문구를 불러오지 못했습니다.')
        const raw = Array.isArray(j.items) ? j.items : []
        const items: RecommendationItem[] = raw
          .map((x) => {
            if (!x || typeof x !== 'object') return null
            const o = x as Record<string, unknown>
            const id = Number(o.id)
            const quote = String(o.quote || '').trim()
            const toneRaw = String(o.tone || 'gray')
            const tone = isRecommendTone(toneRaw) ? toneRaw : 'gray'
            if (!Number.isFinite(id) || !quote) return null
            return { id, quote, tone }
          })
          .filter((x): x is RecommendationItem => Boolean(x))
        if (!cancelled) {
          setRecItems(items)
          setRecLoadError(null)
          if (typeof window !== 'undefined') {
            setCarousel(estimateCarouselMeta(window.innerWidth, items.length))
          }
        }
      } catch (e) {
        if (!cancelled) {
          setRecItems([])
          setRecLoadError(e instanceof Error ? e.message : '연결을 확인해 주세요.')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useLayoutEffect(() => {
    const vp = viewportRef.current
    if (!vp || recItems.length === 0) {
      setCarousel({ n: 3, short: true })
      setPadWidth(0)
      return
    }

    const measure = () => {
      const inner = vp.querySelector('.recommendViewportPad') as HTMLElement | null
      const pad = inner?.clientWidth ?? 0
      setPadWidth(pad)
      const w = vp.getBoundingClientRect().width
      const n = cardsPerViewForWidth(w)
      const short = recItems.length <= n
      setCarousel({ n, short })
    }

    measure()
    const ro = new ResizeObserver(() => measure())
    ro.observe(vp)
    return () => ro.disconnect()
  }, [recItems])

  useLayoutEffect(() => {
    if (carousel.short || recItems.length === 0) return
    if (recommendIdx !== recItems.length) return
    setNoTrans(true)
    setRecommendIdx(0)
    requestAnimationFrame(() => setNoTrans(false))
  }, [recommendIdx, recItems.length, carousel.short])

  useEffect(() => {
    if (carousel.short) setRecommendIdx(0)
  }, [carousel.short])

  useEffect(() => {
    if (recItems.length === 0) return
    if (carousel.short) return
    if (reduceMotion) return
    const L = recItems.length
    const t = window.setInterval(() => {
      setRecommendIdx((prev) => {
        if (prev >= L) return 0
        return prev + 1
      })
    }, 4500)
    return () => window.clearInterval(t)
  }, [recItems.length, carousel.short, reduceMotion])

  const trackTransform = useMemo(
    () => recommendTrackTransform(recommendIdx, padWidth, carousel.n, carousel.short, recItems.length),
    [recommendIdx, padWidth, carousel.n, carousel.short, recItems.length],
  )

  return (
    <div className="landing">
      <SiteHeader />

      <main>
        <section className="heroSection" id="top">
          <div className="heroBackdrop" aria-hidden="true" />
          <div className="container heroInner">
            <div className="heroGrid">
              <article className="heroCard">
                <div className="heroIcon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path
                      d="M16 11c1.66 0 3-1.79 3-4s-1.34-4-3-4-3 1.79-3 4 1.34 4 3 4Zm-8 0c1.66 0 3-1.79 3-4S9.66 3 8 3 5 4.79 5 7s1.34 4 3 4Zm0 2c-2.33 0-7 1.17-7 3.5V21h14v-4.5C15 14.17 10.33 13 8 13Zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V21h6v-4.5c0-2.33-4.67-3.5-7-3.5Z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <h1>
                  카톡으로 해주는 확실하고
                  <br />
                  빠른 소개팅!
                </h1>
                <Link className="btn btnGhost heroBtn" to="/join">
                  신청하기
                </Link>
              </article>

              <article className="heroCard heroCardAlt">
                <div className="heroIcon talk" aria-hidden="true">
                  <span className="talkBubble">TALK</span>
                </div>
                <h1>
                  만남보장형 1:1
                  <br />
                  대면 소개팅!
                </h1>
                <Link className="btn btnGhost heroBtn" to="/join">
                  신청하기
                </Link>
              </article>
            </div>
          </div>
        </section>

        <section className="ctaSection">
          <div className="container ctaInner">
            <p className="ctaTitle">진지한 만남을 위한 부담없는 소개팅, 내반쪽</p>
            <Link className="btn btnPrimary" to="/join">
              신청하기
            </Link>

            <KpiAnimatedBar />
          </div>
        </section>

        <section className="section aboutSection" id="guide">
          <div className="container">
            <div className="sectionHeader center">
              <div className="eyebrow">ABOUT US</div>
              <h2>AI가 아닌 사람이 직접 해주는 리얼 소개팅!</h2>
            </div>

            <div className="aboutCard">
              <div className="aboutMedia" aria-hidden="true" />
              <div className="aboutText">
                <p className="aboutBrand">내반쪽</p>
                <h3>내반쪽은</h3>
                <p className="muted">
                  앱 안에서 좋아요/채팅으로 끝나는 소개팅이 아니라, 전담 매니저와 소통하며 실제
                  연결과 만남까지 이어지는 서비스를 지향합니다.
                </p>
                <p className="aboutStrong">
                  대면 소개팅까지 가능한, 알바가 없는
                  <br />
                  청정 소개팅입니다!
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="section diffSection" id="guarantee">
          <div className="container">
            <div className="sectionHeader center">
              <div className="eyebrow">WHAT&apos;S DIFFERENCE</div>
              <h2>소개팅 앱이나 결정사와 뭐가 다를까요?</h2>
              <p className="muted">
                가벼운 스침이 아닌, 진짜 인연을 만나고 싶다면 지금 새로운 만남을 시작해 보세요.
              </p>
            </div>

            <div className="grid3 diffGrid">
              {[
                { title: '전담 매니저', body: '전문 매니저가 직접 소통하며 철저한 매칭을 관리합니다.' },
                { title: '부담 없는 비용', body: '결정사보다 부담 없는 비용으로 퀄리티 있는 매칭을 제공합니다.' },
                { title: '만남 중심', body: '톡 연결부터 일정 조율까지 실제 만남을 중심으로 진행합니다.' },
              ].map((card) => (
                <div key={card.title} className="diffCard card">
                  <h3>{card.title}</h3>
                  <p className="muted">{card.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section howSection" id="managers">
          <div className="howBg" aria-hidden="true" />
          <div className="container">
            <div className="sectionHeader center">
              <div className="eyebrow">HOW TO USE</div>
              <h2>매칭은 어떻게 진행 되나요?</h2>
            </div>

            <div className="grid3 howGrid">
              {[
                {
                  title: '회원가입',
                  body: '내반쪽 회원가입을 진행합니다.',
                },
                {
                  title: '본인 정보 입력',
                  body: '정보가 상세할수록 더 빠르고 정확한 소개팅이 진행됩니다.',
                },
                {
                  title: '프로젝트 내용 보완',
                  body: '매니저 상담을 통해 이상형 조건을 구체화합니다.',
                },
              ].map((step, idx) => (
                <div key={step.title} className="howCard card">
                  <div className="howIcon" aria-hidden="true">
                    {String(idx + 1).padStart(2, '0')}
                  </div>
                  <h3>{step.title}</h3>
                  <p className="muted">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section recommendSection" aria-labelledby="recommend-heading">
          <div className="container">
            <div className="sectionHeader center">
              <div className="recommendEyebrow">내반쪽</div>
              <h2 id="recommend-heading">이런 분들께 추천드립니다!</h2>
            </div>

            {recItems.length === 0 ? (
              <p className="muted" style={{ textAlign: 'center', margin: '8px 0 0' }}>
                {recLoadError ?? '추천 문구가 없습니다. 관리자에서 등록해 주세요.'}
              </p>
            ) : null}
          </div>

          {recItems.length > 0 ? (
            <>
              <div ref={viewportRef} className="recommendViewport">
                <div className="recommendViewportPad">
                  <div
                    className={`recommendTrack${carousel.short ? ' recommendTrack--short' : ''}`}
                    style={{
                      transition:
                        noTrans || carousel.short || reduceMotion
                          ? 'none'
                          : 'transform 0.45s cubic-bezier(0.33, 1, 0.68, 1)',
                      transform: carousel.short || recItems.length === 0 ? undefined : trackTransform,
                    }}
                  >
                    {(carousel.short ? recItems : [...recItems, ...recItems]).map((s, i) => (
                      <div
                        key={carousel.short ? `rec-${s.id}` : `rec-${s.id}-${i}`}
                        className="recommendSlide"
                        style={{ width: REC_SLOT_PX, flex: '0 0 auto' }}
                      >
                        <div className="recommendCard" style={{ width: REC_CARD_WIDTH_PX }}>
                          <RecommendAvatar tone={s.tone} />
                          <p className="recommendQuote">{s.quote}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="container recommendDotsWrap">
                {!carousel.short && recItems.length > 1 ? (
                  <div className="recommendDots" role="tablist" aria-label="추천 카드 슬라이드">
                    {recItems.map((s, i) => {
                      const active = recommendIdx % recItems.length === i
                      return (
                        <button
                          key={`rec-dot-${s.id}`}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          aria-label={`${i + 1}번째 카드`}
                          className={`recommendDot${active ? ' recommendDot--active' : ''}`}
                          onClick={() => setRecommendIdx(i)}
                        />
                      )
                    })}
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </section>

        <LandingPostRecommendSections />

        <div id="notice" style={{ scrollMarginTop: 80 }} aria-hidden="true" />

        <section className="section reviewsSection" id="reviews" aria-labelledby="reviews-heading">
          <div className="container">
            <div className="sectionHeader center reviewsHeader">
              <div className="reviewsEyebrow">내반쪽 커플 후기</div>
              <h2 id="reviews-heading">이곳에서 시작된 인연, 그리고 진짜 사랑 이야기</h2>
              <p className="muted reviewsLead">
                단순한 매칭이 아니라, 진짜 인연을 이어드립니다.
                <br />
                내반쪽에서는 실제 회원분들의 리얼 후기가 꾸준히 이어지고 있습니다.
              </p>
              <p className="muted reviewsStory">
                처음은 어색했지만 점점 스며든 따뜻한 감정, 설렘으로 바뀐 두 번째 약속,
                <br />
                서로 다른 두 사람이 하나의 인연으로 이어진 순간들을 담았습니다.
              </p>
            </div>

            <div className="reviewsGrid">
              {COUPLE_REVIEW_CARDS.map((card) => (
                <article key={card.title} className={`reviewStoryCard reviewStoryCard--${card.tone}`}>
                  <div className="reviewChatFrame">
                    <div className="reviewChatTop">
                      <span className="reviewChatAvatar" aria-hidden="true" />
                      <div>
                        <p className="reviewChatName">{card.title}</p>
                        <p className="reviewChatMeta">실제 회원 대화 일부</p>
                      </div>
                    </div>
                    <div className="reviewChatBody">
                      {card.messages.map((message, idx) => (
                        <p key={`${card.title}-${idx}`} className={`reviewBubble reviewBubble--${message.side}`}>
                          {message.text}
                        </p>
                      ))}
                    </div>
                  </div>

                  <div className="reviewCardText">
                    <p className="reviewCardLabel">{card.label}</p>
                    <p className="reviewCardSubLabel">{card.sublabel}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section productSection" id="products" aria-labelledby="product-heading">
          <div className="container productInner">
            <div className="sectionHeader center productHeader">
              <div className="productEyebrow">내반쪽 상품</div>
              <h2 id="product-heading">회원님의 상황에 맞는 5가지 상품</h2>
              <p className="muted productLead">
                금액대별, 서비스별 5가지의 매칭 상품이 준비되어 있습니다.
                <br />
                매니저와의 상담을 통해 나에게 맞는 상품을 추천해드립니다.
              </p>
            </div>

            <div className="productList" role="list" aria-label="매칭 상품 설명">
              {PRODUCT_ITEMS.map((item) => (
                <article key={item.name} className="productItem" role="listitem">
                  <div className="productPill">
                    <span>{item.name}</span>
                    {item.note ? <small>{item.note}</small> : null}
                  </div>
                  <p className="productDesc">{item.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bottomCtaSection" aria-labelledby="bottom-cta-heading">
          <div className="container">
            <div className="bottomCtaPanel">
              <div className="bottomCtaBackdrop" aria-hidden="true">
                <div className="bottomCtaGlow bottomCtaGlow--left" />
                <div className="bottomCtaGlow bottomCtaGlow--right" />
                <div className="bottomCtaFigure" />
              </div>

              <div className="bottomCtaContent">
                <p className="bottomCtaEyebrow">내반쪽 프리미엄 매칭</p>
                <h2 id="bottom-cta-heading" className="bottomCtaTitle">
                  지금 이 순간에도 새로운 인연은
                  <br />
                  계속 이어지고 있습니다.
                </h2>
                <p className="bottomCtaLead">
                  최고의 전담 매칭 서비스를 통해 당신의 인연을 만들어 보세요.
                </p>
                <p className="bottomCtaBody">
                  상담은 무료! 5분의 투자가
                  <br />
                  당신의 평생의 인연을 만들 수도 있습니다.
                </p>
                <Link className="btn btnPrimary bottomCtaButton" to="/join">
                  무료 상담 신청
                </Link>
              </div>
            </div>
          </div>
        </section>

        <footer className="footer" id="contact">
          <div className="container footerInner">
            <div>
              <div className="brand footerBrand">
                <span className="brandMark" aria-hidden="true" />
                <span className="brandName">내반쪽</span>
              </div>
              <p className="muted">
                상담은 무료! 5분의 투자로
                <br />
                새로운 인연을 시작해 보세요.
              </p>
            </div>

            <div className="footerCta">
              <Link className="btn btnPrimary" to="/join">
                무료 상담 신청
              </Link>
              <Link className="btn btnGhost" to={member ? '/inquiry' : '/inquiry/new'} style={{ marginTop: 10 }}>
                1:1 문의 남기기
              </Link>
              <p className="muted tiny">
                회사명: 내반쪽 Co. | Email: contact@example.com
                <br />
                <Link to="/admin" className="muted tiny" style={{ fontWeight: 700 }}>
                  관리자
                </Link>
                {' · '}
                Copyright © {new Date().getFullYear()} 내반쪽.
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}

