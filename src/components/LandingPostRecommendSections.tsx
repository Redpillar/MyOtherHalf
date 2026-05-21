import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  DEFAULT_LANDING_MEMBER_STATS,
  formatGenderRatio,
  formatMemberCount,
  type LandingMemberStats,
} from '../landing/landingMemberStatsTypes'
import { apiFetch, readJsonResponse } from '../lib/apiFetch'
import { useMemberSession } from '../lib/memberSession'
import './landing-post-recommend.scss'

type BigDataMember = {
  id: number
  line: string
  status: string
}

function IconCheckCircle() {
  return (
    <svg className="prIcon" viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="rgba(79, 70, 229, 0.95)" />
      <path
        d="M8.5 12.2 10.8 14.5 15.5 9.8"
        fill="none"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconPhone() {
  return (
    <svg className="prIcon prIcon--line" viewBox="0 0 24 24" width="32" height="32" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6.6 10.8c1.6 3.4 4.2 6 7.6 7.6l2.5-2.5c.3-.3.8-.4 1.2-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1v4c0 .6-.4 1-1 1C10.6 22 2 13.4 2 3c0-.6.4-1 1-1h4c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.4 0 .9-.2 1.2L8.2 9.4c.2.4.1.9-.2 1.2l-.4.2Z"
      />
    </svg>
  )
}

function IconBriefcase() {
  return (
    <svg className="prIcon prIcon--line" viewBox="0 0 24 24" width="32" height="32" aria-hidden="true">
      <path
        fill="currentColor"
        d="M10 4h4a2 2 0 0 1 2 2v2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2h2V6a2 2 0 0 1 2-2Zm6 6H4v10h16V10Zm-8-4v2h4V6h-4Z"
      />
    </svg>
  )
}

function IconId() {
  return (
    <svg className="prIcon prIcon--line" viewBox="0 0 24 24" width="32" height="32" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Zm14 0H6v12h12V6Zm-8 3h4v2h-4V9Zm0 4h4v2H8v-2h2Zm-2 4h8v2H6v-2Z"
      />
    </svg>
  )
}

const VERIFY_CARDS = [
  { title: '본인 확인', desc: '휴대폰·카카오톡 인증', Icon: IconPhone },
  { title: '직업 확인', desc: '사원증·명함·재직증명서', Icon: IconBriefcase },
  { title: '신분 확인', desc: '주민등록증·운전면허증', Icon: IconId },
]

const BD_SURNAMES = [
  '김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '유', '홍',
] as const

const BD_GIVEN_MALE = ['민준', '서준', '도윤', '예준', '시우', '하준', '지훈', '우진', '현우', '준서'] as const
const BD_GIVEN_FEMALE = ['서연', '지우', '서윤', '지민', '수아', '하은', '민서', '채원', '예은', '다은'] as const

const BD_JOBS = [
  'S대기업',
  '스타트업',
  '프리랜서',
  '디자이너',
  '공무원',
  '교사',
  '의료직',
  '금융권',
  'IT개발',
  '컨설팅업',
  '마케팅',
  '연구직',
  '법률직',
  '요리사',
  '건축직',
] as const

/** 표시 이름: 3자(김○준) 95% · 2자(김○) 5% */
function maskName(surname: string, given: string, memberId: number): string {
  const twoChar = memberId % 20 === 0
  if (twoChar) return `${surname}○`
  const last = given.slice(-1)
  return last ? `${surname}○${last}` : `${surname}○`
}

function buildBigDataMembers(): BigDataMember[] {
  const males: BigDataMember[] = []
  const females: BigDataMember[] = []

  for (let i = 0; i < 50; i++) {
    const ageM = 26 + (i % 14)
    const ageF = 25 + ((i + 3) % 15)
    const surnameM = BD_SURNAMES[i % BD_SURNAMES.length]
    const surnameF = BD_SURNAMES[(i + 9) % BD_SURNAMES.length]
    const givenM = BD_GIVEN_MALE[(i * 3) % BD_GIVEN_MALE.length]
    const givenF = BD_GIVEN_FEMALE[(i * 5) % BD_GIVEN_FEMALE.length]
    const jobM = BD_JOBS[i % BD_JOBS.length]
    const jobF = BD_JOBS[(i + 5) % BD_JOBS.length]

    males.push({
      id: i * 2,
      line: `${maskName(surnameM, givenM, i * 2)} | ${ageM}세 | ${jobM} | 남`,
      status: '활동중',
    })
    females.push({
      id: i * 2 + 1,
      line: `${maskName(surnameF, givenF, i * 2 + 1)} | ${ageF}세 | ${jobF} | 여`,
      status: '활동중',
    })
  }

  const mixed: BigDataMember[] = []
  for (let i = 0; i < 50; i++) {
    mixed.push(males[i], females[i])
  }
  return mixed
}

const BIGDATA_MEMBERS = buildBigDataMembers()

function PrMemberTicker({ members }: { members: readonly BigDataMember[] }) {
  const trackItems = useMemo(() => [...members, ...members], [members])

  return (
    <div className="prMemberTicker card" aria-label="매칭 성사 중 회원 목록">
      <div className="prMemberTickerViewport">
        <ul className="prMemberTickerTrack">
          {trackItems.map((m, i) => (
            <li key={`${m.id}-${i}`} className="prMemberRow">
              <span className="prMemberLine">{m.line}</span>
              <span className="prMemberPill">{m.status}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

const PROCESS_STEPS: {
  num: string
  title: string
  body: string
  extra?: string
  reverse?: boolean
  imageSrc?: string
}[] = [
  {
    num: '01',
    title: '상담 진행 | 회원님 이해하기',
    body:
      '성향과 연애 가치관, 이상형 조건을 기반으로 맞춤 매칭을 진행합니다.\n회원님의 매력을 효과적으로 전달할 수 있도록 함께 준비합니다.',
    extra: '· 원활한 진행을 위해 관련 서류는 정확히 제출해 주시기 바랍니다.',
    imageSrc: '/steps/step-01-consultation.png',
  },
  {
    num: '02',
    title: '상대 프로필 확인 | 맞춤 매칭 제안',
    body:
      '전담 매니저가 회원님 프로필 카드를 완성합니다.\n맞춤 선별된 상대 프로필을 안내해 드리며, 수락 여부는 회원님이 결정하시면 됩니다.',
    reverse: true,
    imageSrc: '/steps/step-02-profile-matching.png',
  },
  {
    num: '03',
    title: '만남 확정 | 일정 맞추기',
    body:
      '상호 수락으로 매칭이 확정됩니다.\n일정·장소는 신중하게 조율하며, 만남 전 과정에서도 전담 매니저가 안내해 드립니다.\n일정이 확정된 후, 일방적인 변심으로 인해 취소되는 경우 취소 당사자에게 패널티가 부과됩니다.',
    extra:
      '매칭 횟수 2회 차감 (다회권 회원)\n1회권 회원의 경우 영구 탈퇴 처리\n* 매칭이 파기된 경우, 회원님의 매칭권은 차감되지 않습니다.',
    imageSrc: '/steps/step-03-schedule-confirm.png',
  },
  {
    num: '04',
    title: '첫 만남 | 데이트 진행',
    body:
      '약속 당일, 편안한 분위기에서 첫 만남을 진행합니다.\n만남 전날 오픈채팅방을 열어 두 분의 소통을 돕고, 당일에도 매니저가 지원합니다.\n약속 당일 30분 이상 지각 시, 매칭 횟수 차감 불이익이 발생합니다.',
    extra: '* 1회 차감 (단, 사전 양해를 구한 경우 제외)',
    reverse: true,
    imageSrc: '/steps/step-04-first-meeting.png',
  },
  {
    num: '05',
    title: '애프터 케어 | 지속 매칭 관리',
    body:
      '만남 후, 애프터 진행 여부와 상대방 피드백을 전달해 드립니다.\n매력 포인트와 보완할 점을 정리해, 다음 만남을 위한 맞춤 매칭을 이어갑니다.',
    imageSrc: '/steps/step-05-aftercare.png',
  },
]

export function LandingPostRecommendSections() {
  const member = useMemberSession()
  const applyTo = member ? '/consult' : '/login'
  const [memberStats, setMemberStats] = useState<LandingMemberStats>(DEFAULT_LANDING_MEMBER_STATS)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const r = await apiFetch('/api/landing-member-stats')
        const j = await readJsonResponse<{ stats?: LandingMemberStats }>(r)
        if (!r.ok || !j.stats || cancelled) return
        setMemberStats(j.stats)
      } catch {
        // ignore — defaults shown
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const genderRatioLabel = useMemo(
    () => formatGenderRatio(memberStats.maleMembers, memberStats.femaleMembers),
    [memberStats.maleMembers, memberStats.femaleMembers],
  )

  return (
    <div className="pr">
      {/* 1. SERVICE 소개 */}
      {/* <section className="prBlock section" aria-labelledby="pr-svc-title">
        <div className="container">
          <header className="prHead">
            <p className="prEyebrow">SERVICE</p>
            <h2 id="pr-svc-title" className="prH2">
              내반쪽 만남보장 서비스 안내
            </h2>
          </header>
          <article className="prSvcCard">
            <div className="prSvcCardHead">
              <span className="prSvcBadge" aria-hidden="true">
                01
              </span>
              <div className="prSvcCardTitles">
                <p className="prSvcLead">앱처럼 편하고, 결정사처럼 신뢰 있는</p>
                <h3 className="prSvcTitle">1:1 매니저 매칭 케어</h3>
              </div>
            </div>

            <p className="prSvcDesc muted">조건 분석부터 매칭까지, 전담 매니저가 끝까지 함께합니다.</p>

            <ul className="prSvcFeatures">
              {SERVICE_FEATURES.map((feature, index) => (
                <li key={feature.title} className="prSvcFeature">
                  <span className="prSvcFeatureNum" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h4 className="prSvcFeatureTitle">{feature.title}</h4>
                  <p className="prSvcFeatureDesc muted">{feature.desc}</p>
                </li>
              ))}
            </ul>

            <div className="prSvcCardFoot">
              <p className="prSvcNote muted">
                매니저 상담으로 조건을 설정하고, 맞지 않으면 다시 말씀해 주세요. 이상형에 맞는 분으로{' '}
                <strong>소개팅을 진행</strong>해 드립니다.
              </p>
              <Link className="btn landingApplyBtn prSvcCta" to={applyTo}>
                소개팅 신청
              </Link>
            </div>
          </article>
        </div>
      </section> */}

      {/* 2. 결정사 프로세스 카드 */}
      {/* <section className="prBlock section prBlock--tight" aria-labelledby="pr-process-title">
        <div className="container">
          <article className="prHighlightCard">
            <div className="prHighlightArt" aria-hidden="true">
              <span className="prSpark" />
              <span className="prSpark prSpark--2" />
              <span className="prSpark prSpark--3" />
            </div>
            <h2 id="pr-process-title" className="prHighlightTitle">
              결정사의 만남 프로세스
            </h2>
            <p className="prHighlightBody muted">
              결정보다 저렴한 부담없는 비용, 결정사의 프로세스를 가져와 장점을 도입하여 부담없고 <strong>진지한 소개팅</strong>을
              제공합니다.
            </p>
          </article>
        </div>
      </section> */}

      {/* 3. 신원 검증 (회색) */}
      {/* <section className="prBlock section prBlock--gray" aria-labelledby="pr-id-title">
        <div className="container">
          <div className="prSplit prSplit--alignStart">
            <div className="prStack">
              <span className="prBadge" aria-hidden="true">
                02
              </span>
              <p className="prLeadStrong">프로필과 상대방이 너무 달라 실망했나요?</p>
              <p className="prLead">철저한 신원확인을 통한</p>
              <h2 id="pr-id-title" className="prH3">
                신원 검증 시스템
              </h2>
              <p className="prBody muted">전담 매니저의 상담과 검증을 통해 신원이 확인된 분들을 소개해드립니다!</p>
            </div>
            <div className="prCardStack">
              <article className="prInfoCard">
                <div className="prInfoCardArt prInfoCardArt--suit" aria-hidden="true" />
                <h3 className="prInfoCardTitle">전담 매니저 검증</h3>
                <p className="prInfoCardBody muted">
                  전담 매니저가 1:1 상담을 통해 회원가입 과정에서 입력한 서류, 사진, 학력 등{' '}
                  <strong className="prEm">허위정보를 필터링</strong>합니다.
                </p>
              </article>
              <article className="prInfoCard">
                <div className="prInfoCardArt prInfoCardArt--cafe" aria-hidden="true" />
                <h3 className="prInfoCardTitle">진정성 있는 프로필</h3>
                <p className="prInfoCardBody muted">
                  전담 매니저와 1:1 상담 후 회원님만의 스토리를 반영한 프로필로 신뢰도를 높입니다.
                </p>
              </article>
            </div>
          </div>
        </div>
      </section> */}

      {/* 4. 애프터 케어 메인 */}
      {/* <section className="prBlock section" aria-labelledby="pr-after-title">
        <div className="container">
          <div className="prSplit prSplit--alignStart">
            <div className="prStack">
              <span className="prBadge" aria-hidden="true">
                03
              </span>
              <p className="prLeadStrong">소개만 받고 끝인가요?</p>
              <h2 id="pr-after-title" className="prH3">
                애프터 케어 서비스
              </h2>
              <p className="prBody muted">
                전담 매니저의 지속적인 분석과 피드백으로 회원님의 연애 성공을 위한 지속적 관리를 제공합니다.
              </p>
            </div>
            <div className="prAfterCol">
              <div className="prProfileMock" aria-hidden="true">
                <div className="prProfileMockCard">
                  <span className="prProfileMockTag">Profile card</span>
                  <div className="prProfileMockRow" />
                  <div className="prProfileMockRow prProfileMockRow--short" />
                </div>
                <div className="prProfileMockCard prProfileMockCard--back">
                  <span className="prProfileMockTag">Profile card</span>
                </div>
              </div>
              <h3 className="prAfterSubTitle">지속적인 매칭 관리</h3>
              <p className="prBody muted">
                회원님의 인연을 찾아드리기 위해 지속적으로 분석, 매칭하여 한 번의 만남이 아닌 &apos;진짜 인연&apos;을 소개해드립니다!
              </p>
              <div className="prWalkIllustration" aria-hidden="true" />
            </div>
          </div>
        </div>
      </section> */}

      {/* 5. 애프터 케어 카드 (중앙) */}
      {/* <section className="prBlock section prBlock--tight" aria-labelledby="pr-after-card-title">
        <div className="container">
          <article className="prSoloCard">
            <div className="prSoloCardArt" aria-hidden="true" />
            <h2 id="pr-after-card-title" className="prSoloCardTitle">
              애프터 케어
            </h2>
            <p className="prSoloCardBody muted">
              만남의 시간, 장소 조율부터 만남 후 피드백까지
              <br />
              지속적인 만남을 위한 <strong className="prEm">애프터 케어 서비스</strong>가 제공됩니다.
            </p>
          </article>
        </div>
      </section> */}

      {/* 6. BIG DATA */}
      <section className="prBlock section prBlock--lavender" aria-labelledby="pr-bd-title">
        <div className="container">
          <div className="sectionHeader center prBigDataHeader">
            <p className="recommendEyebrow">BIG DATA</p>
            <h2 id="pr-bd-title">내반쪽 회원 현황</h2>
          </div>

          <div className="prBigRow">
            <div className="prBigText">
              <h3 className="prBigSubTitle">지금 만남을 기다리는 회원</h3>
              <p className="prBody muted">
                내반쪽에는 진지하게 만남을 원하는 분들이 꾸준히 모이고 있습니다.
              </p>
              <Link className="btn landingApplyBtn prCta" to={applyTo}>
                소개팅 신청
              </Link>
            </div>
            <PrMemberTicker members={BIGDATA_MEMBERS} />
          </div>
          <div className="prBigRow prBigRow--reverse">
            <div className="prStats card">
              <div className="prStatRow">
                <span className="prStatLabel">남성 회원</span>
                <span className="prStatValue">{formatMemberCount(memberStats.maleMembers)}</span>
              </div>
              <div className="prStatRow">
                <span className="prStatLabel">여성 회원</span>
                <span className="prStatValue">{formatMemberCount(memberStats.femaleMembers)}</span>
              </div>
              <div className="prStatRow prStatRow--strong">
                <span className="prStatLabel">전체 회원 남녀 성비</span>
                <span className="prStatValue">{genderRatioLabel}</span>
              </div>
            </div>
            <div className="prBigText">
              <h3 className="prBigSubTitle">남녀 회원 비율을 꾸준히 관리해요</h3>
              <p className="prBody muted">
                남녀 회원 수를 균형 있게 맞춰, 더 자연스럽고 공정한 매칭이 가능합니다.
              </p>
              <Link className="btn landingApplyBtn prCta" to={applyTo}>
                소개팅 신청
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 7. 회원 검증 */}
      <section className="prBlock section prBlock--verify" aria-labelledby="pr-verify-title">
        <div className="container">
          <header className="prHead">
            <p className="prEyebrow">회원 검증</p>
            <h2 id="pr-verify-title" className="prH2">
              가입 전, 이렇게 확인해요
            </h2>
            <p className="prSubCenter muted">본인·직업·신분을 단계별로 검증합니다</p>
            <div className="prChevron" aria-hidden="true">
              ⌄
            </div>
          </header>
          <ul className="prVerifyRow">
            {VERIFY_CARDS.map((c) => (
              <li key={c.title} className="prVerifyCard card">
                <div className="prVerifyIconWrap">
                  <IconCheckCircle />
                </div>
                <c.Icon />
                <h3 className="prVerifyTitle">{c.title}</h3>
                <p className="prVerifyDesc muted">{c.desc}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 8. 매칭 진행 절차 + 단계별 상세 */}
      <section className="prBlock section prBlock--steps" aria-labelledby="pr-process-title">
        <div className="container">
          <header className="prHead">
            <p className="prEyebrow">내반쪽 진행절차</p>
            <h2 id="pr-process-title" className="prH2">
              매칭 서비스 진행 절차
            </h2>
            <p className="prIntroWide muted">
              검증된 회원만을 대상으로, 회원님에게 맞는 분을 신중하게 소개합니다.
              <br />
              상담부터 만남 후 피드백까지, 단계별로 안내해 드립니다.
            </p>
          </header>
          {PROCESS_STEPS.map((step) => (
            <article
              key={step.num}
              className={`prStepRow${step.reverse ? ' prStepRow--reverse' : ''}`}
            >
              <div className={`prStepVisual prStepVisual--${step.num}`} aria-hidden="true">
                {step.imageSrc ? (
                  <img
                    src={step.imageSrc}
                    alt=""
                    className="prStepVisualImg"
                    loading="lazy"
                    decoding="async"
                  />
                ) : null}
              </div>
              <div className="prStepText">
                <h3 className="prStepTitle">
                  {step.num}. {step.title}
                </h3>
                <p className="prBody muted">{step.body}</p>
                {step.extra ? <p className="prExtra muted">{step.extra}</p> : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
