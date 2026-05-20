import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { KpiAnimatedBar } from '../components/KpiAnimatedBar'
import { SiteHeader } from '../components/SiteHeader'
import { apiFetch, readJsonResponse } from '../lib/apiFetch'
import { useMemberSession } from '../lib/memberSession'
import type { RecommendTone, RecommendationItem } from '../lib/recommendationTypes'
import { LandingPostRecommendSections } from '../components/LandingPostRecommendSections'
import { LandingReviewsSection } from '../components/LandingReviewsSection'
import './landing.scss'

const RECOMMEND_TONES: RecommendTone[] = ['gray', 'blue', 'pink', 'purple', 'slate']

function isRecommendTone(t: string): t is RecommendTone {
  return (RECOMMEND_TONES as readonly string[]).includes(t)
}

const MATCHING_STEPS = [
  {
    title: '회원가입',
    body: '프로필을 꼼꼼하게 작성할수록 더 자연스럽고 정확한 매칭이 가능해져요.',
  },
  {
    title: '매니저 상담',
    body: '매니저와의 상담을 통해 나에게 맞는 이상형을 함께 찾아갑니다.',
  },
  {
    title: '매칭 진행',
    body: '매칭부터 실제 만남까지 자연스럽게 이어질 수 있도록 세심하게 진행해드립니다.',
  },
] as const

function HowStepIcon({ step }: { step: number }) {
  const common = { width: 34, height: 34, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.75 }

  if (step === 0) {
    return (
      <svg
        {...common}
        width={22}
        height={22}
        className="howStepIcon"
        fill="currentColor"
        stroke="none"
        aria-hidden="true"
      >
        <path d="M11,14H5a5.006,5.006,0,0,0-5,5v5H3V19a2,2,0,0,1,2-2h6a2,2,0,0,1,2,2v5h3V19A5.006,5.006,0,0,0,11,14Z" />
        <path d="M8,12A6,6,0,1,0,2,6,6.006,6.006,0,0,0,8,12ZM8,3A3,3,0,1,1,5,6,3,3,0,0,1,8,3Z" />
        <path d="M21 10V7H18V10H15V13H18V16H21V13H24V10Z" />
      </svg>
    )
  }

  if (step === 1) {
    return (
      <svg
        className="howStepIcon"
        width={34}
        height={34}
        viewBox="0 0 24 20"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4.75 7.75 6.75 9.75 10.25 6.25" />
        <path d="M12.25 7.75H19.25" />
        <path d="M4.75 13.75 6.75 15.75 10.25 12.25" />
        <path d="M12.25 13.75H19.25" />
      </svg>
    )
  }

  return (
    <svg
      {...common}
      width={24}
      height={24}
      className="howStepIcon"
      fill="currentColor"
      stroke="none"
      style={{ transform: 'translateX(5px)' }}
      aria-hidden="true"
    >
      <path d="M3,3H13v2.384c.06-.068,.107-.144,.172-.209,.757-.758,1.761-1.175,2.827-1.175h0V0H0V21c0,1.657,1.343,3,3,3H13c1.657,0,3-1.343,3-3v-3H3V3Zm2.999,17h4v2.015H5.999v-2.015ZM21.999,6.001h-6c-1.1,0-2,.9-1.999,2l.002,7.911c0,.858,.949,1.378,1.672,.915l2.826-1.827h5.5v-6.999c0-1.105-.896-2-2.001-2Zm-2.999,7.5s-3-2.122-3-3.85c0-.911,.672-1.65,1.5-1.65s1.5,.739,1.5,1.65c0-.911,.672-1.65,1.5-1.65s1.5,.739,1.5,1.65c0,1.728-3,3.85-3,3.85Z" />
    </svg>
  )
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

const PRODUCT_ITEMS: ReadonlyArray<{
  name: string
  desc: string
  note?: string
}> = [
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
]

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

/** 보이는 n칸의 가운데가 뷰포트 가로 중앙에 오도록 이동량(px, 왼쪽으로 양수). */
function recommendTrackTransform(
  recommendIdx: number,
  viewportWidth: number,
  slotWidth: number,
  trackInsetLeft: number,
  n: number,
  short: boolean,
  recLen: number,
): string | undefined {
  if (short || recLen === 0 || slotWidth <= 0) return undefined
  if (viewportWidth <= 0) return `translateX(-${recommendIdx * slotWidth}px)`
  const d =
    trackInsetLeft + recommendIdx * slotWidth + (n * slotWidth) / 2 - viewportWidth / 2
  return `translateX(-${d}px)`
}

export function Landing() {
  const member = useMemberSession()
  const applyTo = member ? '/consult' : '/login'
  const consultTo = '/consult'
  const [recItems, setRecItems] = useState<RecommendationItem[]>([])
  const [recLoadError, setRecLoadError] = useState<string | null>(null)
  const [recommendIdx, setRecommendIdx] = useState(0)
  const mainRef = useRef<HTMLElement | null>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const [carousel, setCarousel] = useState({ n: 3, short: true })
  const [viewportWidth, setViewportWidth] = useState(0)
  const [slotWidth, setSlotWidth] = useState(REC_SLOT_PX)
  const [trackInsetLeft, setTrackInsetLeft] = useState(0)
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
      setViewportWidth(0)
      setSlotWidth(REC_SLOT_PX)
      setTrackInsetLeft(0)
      return
    }

    const measure = () => {
      const w = vp.getBoundingClientRect().width
      const pad = vp.querySelector('.recommendViewportPad') as HTMLElement | null
      const slide = vp.querySelector('.recommendSlide') as HTMLElement | null
      const track = vp.querySelector('.recommendTrack') as HTMLElement | null
      const card = slide?.querySelector('.recommendCard') as HTMLElement | null
      const cardW = card?.getBoundingClientRect().width ?? REC_CARD_WIDTH_PX
      const gap = track ? Number.parseFloat(getComputedStyle(track).gap) || REC_GAP_PX : REC_GAP_PX
      const inset = pad ? Number.parseFloat(getComputedStyle(pad).paddingLeft) || 0 : 0
      setViewportWidth(w)
      setSlotWidth(cardW + gap)
      setTrackInsetLeft(inset)
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

  useEffect(() => {
    const root = mainRef.current
    if (!root) return

    const markVisible = (el: HTMLElement) => {
      el.setAttribute('data-visible', 'true')
    }

    if (reduceMotion) {
      root.querySelectorAll<HTMLElement>('[data-landing-reveal]').forEach(markVisible)
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) markVisible(e.target as HTMLElement)
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -12% 0px' },
    )

    const observeNew = () => {
      root.querySelectorAll<HTMLElement>('[data-landing-reveal]:not([data-visible])').forEach((el) => {
        io.observe(el)
      })
    }

    observeNew()
    const mo = new MutationObserver(observeNew)
    mo.observe(root, { childList: true, subtree: true })

    return () => {
      io.disconnect()
      mo.disconnect()
    }
  }, [reduceMotion])

  const trackTransform = useMemo(
    () =>
      recommendTrackTransform(
        recommendIdx,
        viewportWidth,
        slotWidth,
        trackInsetLeft,
        carousel.n,
        carousel.short,
        recItems.length,
      ),
    [
      recommendIdx,
      viewportWidth,
      slotWidth,
      trackInsetLeft,
      carousel.n,
      carousel.short,
      recItems.length,
    ],
  )

  return (
    <div className="landing">
      <SiteHeader />

      <main
        ref={(el) => {
          mainRef.current = el
        }}
      >
        <section className="heroSection" id="top">
          <div className="heroSplit">
            <article className="heroPane heroPane--blue">
              <div className="heroPaneMedia" aria-hidden="true">
                <img
                  className="heroPaneMediaImg heroPaneMediaImg--photo"
                  src="/hero/manager-bg.png"
                  alt=""
                  width={1024}
                  height={576}
                  loading="eager"
                  decoding="async"
                />
                <div className="heroPaneMediaOverlay" />
              </div>
              <div className="heroPaneContent">
                <div className="heroPaneIcon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="40" height="40" fill="currentColor">
                    <path d="M16 11c1.66 0 3-1.79 3-4s-1.34-4-3-4-3 1.79-3 4 1.34 4 3 4Zm-8 0c1.66 0 3-1.79 3-4S9.66 3 8 3 5 4.79 5 7s1.34 4 3 4Zm0 2c-2.33 0-7 1.17-7 3.5V21h14v-4.5C15 14.17 10.33 13 8 13Zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V21h6v-4.5c0-2.33-4.67-3.5-7-3.5Z" />
                  </svg>
                </div>
                <h1 className="heroPaneTitle">
                  매니저와 바로 이어지는
                  <br />
                  빠르고 믿을 수 있는 인연!
                </h1>
                <Link className="btn heroPaneBtn heroPaneBtn--blue landingImpactBtn landingImpactBtn--ghost" to={applyTo}>
                  신청하기
                </Link>
              </div>
            </article>

            <article className="heroPane heroPane--pink">
              <div className="heroPaneMedia" aria-hidden="true">
                <picture className="heroPanePicture">
                  <source media="(max-width: 900px)" srcSet="/hero/meet-bg-mobile.png" />
                  <img
                    className="heroPaneMediaImg heroPaneMediaImg--photo"
                    src="/hero/meet-bg.png"
                    alt=""
                    width={1024}
                    height={571}
                    loading="eager"
                    decoding="async"
                  />
                </picture>
                <div className="heroPaneMediaOverlay" />
              </div>
              <div className="heroPaneContent">
                <div className="heroPaneIcon heroPaneIcon--talk" aria-hidden="true">
                  <span className="heroTalkMark">TALK</span>
                </div>
                <h2 className="heroPaneTitle">
                  둘이서 직접 마주하는
                  <br />
                  1:1 맞춤 만남!
                </h2>
                <Link className="btn heroPaneBtn heroPaneBtn--pink landingImpactBtn landingImpactBtn--ghost" to={applyTo}>
                  신청하기
                </Link>
              </div>
            </article>
          </div>
        </section>

        <section className="ctaSection">
          <div className="ctaInner" data-landing-reveal>
            <p className="ctaTitle">
              진지한 만남을 위한 부담없는 소개팅, <span className="ctaTitleBrand">내반쪽</span>
            </p>
            <Link className="btn btnPrimary landingImpactBtn landingImpactBtn--solid" to={applyTo}>
              신청하기
            </Link>

            <KpiAnimatedBar />
          </div>
        </section>

        <section className="section aboutSection" id="guide">
          <div className="container">
            <div className="sectionHeader center" data-landing-reveal>
              <div className="eyebrow">ABOUT US</div>
              <h2>실제 만남까지 이어지는 리얼 소개팅 내반쪽!</h2>
            </div>

            <div className="aboutCard" data-landing-reveal>
              <div className="aboutMedia">
                <img
                  className="aboutMediaImg"
                  src="/about/my-other-half.png"
                  alt="실제 만남까지 이어지는 따뜻한 소개팅 장면"
                  width={1024}
                  height={571}
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="aboutText">
                <p className="aboutBrand">My Other Half</p>
                <h3>내반쪽은</h3>
                <p className="muted">
                  앱 안에서 가볍게 지나가는 인연이 아닌, 매니저와의 1:1 상담을 통해 실제 성향과
                  분위기에 맞는 상대를 연결합니다.
                </p>
                <p className="aboutStrong">
                  단순 매칭으로 끝나는 서비스가 아니라 카톡 연결부터 자연스러운 만남까지 직접
                  이어지는 믿을 수 있는 소개팅을 제공합니다.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="section diffSection" id="guarantee">
          <div className="container">
            <div className="sectionHeader center" data-landing-reveal>
              <div className="eyebrow">WHAT&apos;S DIFFERENCE</div>
              <h2>내반쪽은 다른 소개팅 앱이랑 뭐가 다를까요?</h2>
              <p className="muted">
                소개팅 앱처럼 가볍게, 결정사처럼 부담스럽게 말고 진짜 나와 맞는 사람을 만나보세요.
              </p>
            </div>

            <div className="grid3 diffGrid" data-landing-reveal>
              {[
                {
                  title: '1:1 매칭 케어',
                  body: '회원님의 성향과 가치관을 바탕으로 더 잘 맞는 인연을 1:1로 세심하게 연결해드려요.',
                },
                {
                  title: '부담 없는 요금',
                  body: '누구나 편안하게 좋은 인연을 만날 수 있도록 합리적인 요금 방식으로 서비스를 이용할 수 있어요.',
                },
                {
                  title: '자연스러운 연결',
                  body: '채팅만 머무르지 않도록, 실제 인연으로 이어지는 만남이 되도록 진행해드려요.',
                },
              ].map((card) => (
                <div key={card.title} className="diffCard">
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
            <div className="sectionHeader center" data-landing-reveal>
              <div className="eyebrow">HOW IT WORKS</div>
              <h2>내반쪽의 매칭 방식이 궁금하신가요?</h2>
            </div>

            <div className="howSteps" data-landing-reveal>
              <ol className="howStepsList">
                {MATCHING_STEPS.map((step, idx) => (
                  <li key={step.title} className="howStep">
                    <div className="howStepNode" aria-hidden="true">
                      <span className="howStepNum">{String(idx + 1).padStart(2, '0')}</span>
                      <HowStepIcon step={idx} />
                    </div>
                    <div className="howStepContent">
                      <span className="howStepTag">STEP {String(idx + 1).padStart(2, '0')}</span>
                      <h3>{step.title}</h3>
                      <p className="muted">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section className="section recommendSection" aria-labelledby="recommend-heading">
          <div className="container">
            <div className="sectionHeader center" data-landing-reveal>
              <div className="recommendEyebrow">My Other Half</div>
              <h2 id="recommend-heading">이런 분들을 위해 만들었어요</h2>
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
                      >
                        <div className="recommendCard">
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

        <LandingReviewsSection />

        <section className="section productSection" id="products" aria-labelledby="product-heading">
          <div className="container productInner">
            <div className="sectionHeader center productHeader" data-landing-reveal>
              <div className="productEyebrow">내반쪽 상품</div>
              <h2 id="product-heading">회원님의 상황에 맞는 5가지 상품</h2>
              <p className="muted productLead">
                만남 스타일과 예산에 맞춰 선택할 수 있습니다.
                <br />
                전담 매니저 상담 후, 회원님께 맞는 상품을 안내해 드립니다.
              </p>
            </div>

            <div className="productList" role="list" aria-label="매칭 상품 설명" data-landing-reveal>
              {PRODUCT_ITEMS.map((item, index) => (
                <article key={item.name} className="productItem card" role="listitem">
                  <span className="productItemIndex" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="productItemBody">
                    <h3 className="productItemTitle">
                      <span className="productItemName">{item.name}</span>
                      {item.note ? <span className="productItemNote">{item.note}</span> : null}
                    </h3>
                    <p className="productDesc">{item.desc}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bottomCtaSection" aria-labelledby="bottom-cta-heading">
          <div className="container">
            <div className="bottomCtaPanel" data-landing-reveal>
              <div className="bottomCtaBackdrop" aria-hidden="true">
                <div className="bottomCtaGlow bottomCtaGlow--left" />
                <div className="bottomCtaGlow bottomCtaGlow--right" />
                <div className="bottomCtaFigure" />
              </div>

              <div className="bottomCtaContent">
                <p className="bottomCtaEyebrow">My Other Heart</p>
                <h2 id="bottom-cta-heading" className="bottomCtaTitle">
                  진지한 만남,
                  <br />
                  누구나 쉽게 지금 시작할 수 있습니다.
                </h2>
                <p className="bottomCtaLead">
                  검증된 회원과 전담 매니저가 함께하는 1:1 맞춤 매칭.
                  <br />
                  처음이어도 괜찮습니다. 상담부터 차근차근 안내해 드립니다.
                </p>
                <p className="bottomCtaBody">
                  상담은 무료입니다.
                  <br />
                  지금 신청하시면 전담 매니저가 연락드려
                  <br />
                  회원님께 맞는 만남 방식을 함께 정해 드립니다.
                </p>
                <Link className="btn btnPrimary bottomCtaButton landingImpactBtn landingImpactBtn--solid" to={consultTo}>
                  마이페이지
                </Link>
              </div>
            </div>
          </div>
        </section>

      </main>

      <footer className="footer" id="contact">
        <div className="container footerInner">
          <div className="footerColBrand">
            <div className="brand footerBrand">
              <span className="brandMark" aria-hidden="true" />
              <span className="brandName">내반쪽</span>
            </div>
            <p className="muted footerTagline">
              상담은 무료! 5분의 투자로
              <br />
              새로운 인연을 시작해 보세요.
            </p>
          </div>

          <div className="footerCta">
            <Link className="btn btnPrimary" to={consultTo}>
              마이페이지
            </Link>
            <Link className="btn btnGhost" to={member ? '/inquiry' : '/inquiry/new'}>
              1:1 문의 남기기
            </Link>
            <p className="muted tiny footerMeta">
              회사명: 내반쪽 Co. | Email: contact@example.com
              <br />
              <Link to="/admin" className="footerAdminLink">
                관리자
              </Link>
              {' · '}
              Copyright © {new Date().getFullYear()} 내반쪽.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

