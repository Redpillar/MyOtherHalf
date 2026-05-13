import { Link } from 'react-router-dom'
import './landing-post-recommend.scss'

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
  { title: '본인인증', desc: '핸드폰, 카카오톡 인증', Icon: IconPhone },
  { title: '직업인증', desc: '사원증, 명함, 재직증명서 등', Icon: IconBriefcase },
  { title: '신분증', desc: '주민등록증, 운전면허증', Icon: IconId },
]

const BIGDATA_MEMBERS = [
  { line: '이○주 | 30세 | S대기업 | 남', status: '활동중' },
  { line: '김○준 | 29세 | 프리랜서 | 남', status: '활동중' },
  { line: '설○은 | 33세 | 디자이너 | 여', status: '활동중' },
  { line: '서○우 | 27세 | 컨설팅업 | 여', status: '활동중' },
]

const PROCESS_STEPS: {
  num: string
  title: string
  body: string
  extra?: string
  reverse?: boolean
}[] = [
  {
    num: '01',
    title: '상담 진행 | 회원님을 알아가는 과정',
    body:
      '회원님의 성향, 연애 가치관, 선호 조건을 상세히 파악하여 최적의 매칭을 진행합니다. 또한, 상대방에게도 회원님의 매력을 효과적으로 소개할 수 있도록 돕습니다.',
    extra: '· 필요 서류를 정확히 제출해 주시면 더욱 원활한 진행이 가능합니다.',
  },
  {
    num: '02',
    title: '상대 프로필카드 수령 | 맞춤형 이상형 매칭',
    body:
      '상담 내용을 바탕으로 회원님의 매력을 담은 프로필 카드를 제작합니다. 회원님의 성향과 조건에 맞춰 신중하게 선별된 이상형의 프로필 카드를 전달해 드립니다. 프로필을 확인한 후, 수락 또는 거절 의사를 전달해 주세요.',
    reverse: true,
  },
  {
    num: '03',
    title: '매칭 성사, 일정 조율 | 완벽한 만남 준비',
    body:
      '거리, 취향 등을 고려하여 가장 설레는 장소와 시간을 함께 조율합니다. 만남 전까지 전담 매니저가 소통 창구를 유지해 드립니다.',
  },
  {
    num: '04',
    title: '두근두근 데이트 | 만남의 시작',
    body:
      '최적의 데이트 장소 추천 및 시간 조율을 진행합니다. 데이트 전날, 비상연락망으로 오픈채팅방을 개설하여 원활한 소통을 지원합니다. 약속 당일 30분 이상 지각 시, 매칭 횟수 차감 불이익이 발생합니다.',
    extra: '* 1회 차감 (단, 사전 양해를 구한 경우 제외)',
    reverse: true,
  },
  {
    num: '05',
    title: '애프터 케어 서비스 | 지속적인 피드백과 개선',
    body:
      '만남 이후, 애프터 진행 여부 및 상대방의 피드백을 공유해 드립니다. 회원님의 가장 매력적인 포인트와 보완할 점을 분석하여 더욱 성공적인 만남을 지원합니다. 개별 맞춤 피드백을 통해 회원님만의 특별한 매력을 찾아 최적의 매칭을 이어갑니다.',
    extra:
      '· 내반쪽은 단순한 소개팅을 넘어, 회원님의 인연을 소중히 만들어갑니다. 보다 신뢰할 수 있는 매칭을 위해 최선을 다하겠습니다.',
  },
]

export function LandingPostRecommendSections() {
  return (
    <div className="pr">
      {/* 1. SERVICE 소개 */}
      <section className="prBlock section" aria-labelledby="pr-svc-title">
        <div className="container">
          <header className="prHead">
            <p className="prEyebrow">SERVICE</p>
            <h2 id="pr-svc-title" className="prH2">
              내반쪽 만남보장 서비스 안내
            </h2>
          </header>
          <div className="prSplit">
            <div className="prStack">
              <span className="prBadge" aria-hidden="true">
                01
              </span>
              <p className="prLead">소개팅 + 결정사의 장점을 결합한</p>
              <h3 className="prH3">매니저 전담 케어 시스템</h3>
              <p className="prBody muted">
                전담 매니저가 소개팅 조건 분석을 통해 당신의 이상형을 찾아드립니다!
              </p>
              <Link className="btn btnPrimary prCta" to="/join">
                소개팅 신청
              </Link>
            </div>
            <div className="prMediaPanel" aria-hidden="true">
              <div className="prMediaPanelGlow" />
              <div className="prMediaCard">
                <p className="prMediaCardTitle">내가 원하는 이상형 매칭</p>
                <p className="prMediaCardText">
                  매니저와의 상담을 통해 회원님의 소개팅 조건을 설정합니다. 나의 조건과 맞지 않는다면 말씀해 주세요! 나의 이상형에 맞는 분으로{' '}
                  <strong>소개팅을 진행해</strong> 드립니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. 결정사 프로세스 카드 */}
      <section className="prBlock section prBlock--tight" aria-labelledby="pr-process-title">
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
      </section>

      {/* 3. 신원 검증 (회색) */}
      <section className="prBlock section prBlock--gray" aria-labelledby="pr-id-title">
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
      </section>

      {/* 4. 애프터 케어 메인 */}
      <section className="prBlock section" aria-labelledby="pr-after-title">
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
      </section>

      {/* 5. 애프터 케어 카드 (중앙) */}
      <section className="prBlock section prBlock--tight" aria-labelledby="pr-after-card-title">
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
      </section>

      {/* 6. BIG DATA */}
      <section className="prBlock section prBlock--lavender" aria-labelledby="pr-bd-title">
        <div className="container">
          <div className="prBigRow">
            <div className="prBigText">
              <p className="prEyebrow">BIG DATA</p>
              <h2 id="pr-bd-title" className="prH2 prH2--left">
                매칭이 성사중인 회원
              </h2>
              <p className="prBody muted">
                당신의 인연이 될 다양한 회원분들이 내반쪽에서 만남을 기다리고 있습니다.
              </p>
              <Link className="btn btnGhost prCta prCta--dark" to="/join">
                소개팅 신청
              </Link>
            </div>
            <ul className="prMemberList card">
              {BIGDATA_MEMBERS.map((m) => (
                <li key={m.line} className="prMemberRow">
                  <span className="prMemberLine">{m.line}</span>
                  <span className="prMemberPill">{m.status}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="prBigRow prBigRow--reverse">
            <div className="prStats card">
              <div className="prStatRow">
                <span className="prStatLabel">남성 회원</span>
                <span className="prStatValue">35,430명</span>
              </div>
              <div className="prStatRow">
                <span className="prStatLabel">여성 회원</span>
                <span className="prStatValue">33,490명</span>
              </div>
              <div className="prStatRow prStatRow--strong">
                <span className="prStatLabel">전체 회원 남녀 성비</span>
                <span className="prStatValue">5 : 5</span>
              </div>
            </div>
            <div className="prBigText">
              <p className="prEyebrow">BIG DATA</p>
              <h2 className="prH2 prH2--left">철저한 남녀 성비 유지</h2>
              <p className="prBody muted">
                20대부터 40대까지 폭넓은 연령층, 다양한 직종에 종사하는 매력적인 회원 풀로 내 조건에 맞는 인연을 만나게 해드립니다!
              </p>
              <Link className="btn btnGhost prCta prCta--dark" to="/join">
                소개팅 신청
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 7. 검증 + 진행 절차 도입 */}
      <section className="prBlock section" aria-labelledby="pr-flow-title">
        <div className="container">
          <header className="prHead">
            <p className="prEyebrow">내반쪽 진행방법</p>
            <h2 id="pr-flow-title" className="prH2">
              매칭은 어떻게 진행이 되나요?
            </h2>
            <p className="prSubCenter muted">등록전 회원가입 검증</p>
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
          <header className="prHead prHead--spaced">
            <p className="prEyebrow">내반쪽 진행절차</p>
            <h2 className="prH2">매칭 서비스 진행 절차</h2>
            <p className="prIntroWide muted">
              내반쪽은 회원님의 성향과 가치관을 바탕으로 최적의 인연을 찾아드리는 맞춤형 매칭 서비스입니다. 아래 절차에 따라 신뢰할 수
              있는 만남을 제공합니다.
            </p>
          </header>
        </div>
      </section>

      {/* 8–9. 단계별 상세 */}
      <section className="prBlock section prBlock--steps" aria-label="매칭 서비스 단계별 안내">
        <div className="container">
          {PROCESS_STEPS.map((step) => (
            <article
              key={step.num}
              className={`prStepRow${step.reverse ? ' prStepRow--reverse' : ''}`}
            >
              <div className={`prStepVisual prStepVisual--${step.num}`} aria-hidden="true" />
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
