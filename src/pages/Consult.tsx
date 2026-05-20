import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { AdminMember } from '../admin/memberTypes'
import {
  CONSULTATION_TIMELINE,
  consultationStatusLabel,
  consultationTimelineIndex,
  type ConsultationStatus,
} from '../consult/consultTypes'
import { SiteHeader } from '../components/SiteHeader'
import { findSidoName, findSigunguName } from '../data/koreaRegions'
import { apiFetch, readJsonResponse } from '../lib/apiFetch'
import { useMemberProfile, useMemberSession } from '../lib/memberSession'
import './signup.scss'
import './admin.scss'
import './consult.scss'

const INTRO_STEPS = [
  {
    title: '회원가입 · 프로필 작성',
    desc: '기본 정보와 사진을 등록하면 매니저가 회원님을 더 정확히 이해할 수 있습니다.',
  },
  {
    title: '상담 신청',
    desc: '상담 신청 후 담당 매니저가 프로필을 검토합니다. 상담료는 없습니다.',
  },
  {
    title: '카카오톡 1:1 상담',
    desc: '등록하신 휴대폰 번호로 카카오톡 연락을 드리며, 이상형과 만남 방식을 함께 정합니다.',
  },
  {
    title: '맞춤 매칭 시작',
    desc: '상담 내용을 바탕으로 회원님께 맞는 인연을 제안해 드립니다.',
  },
] as const

const FAQ_ITEMS = [
  {
    q: '상담 비용이 있나요?',
    a: '무료 상담입니다. 매칭 상품 선택 및 이용은 상담 후 별도 안내해 드립니다.',
  },
  {
    q: '언제 연락받을 수 있나요?',
    a: '신청 후 영업일 기준 1~2일 이내 등록하신 휴대폰 번호로 카카오톡 연락을 드립니다.',
  },
  {
    q: '1:1 문의와 무엇이 다른가요?',
    a: '무료 상담은 매칭 시작을 위한 신청이며, 1:1 문의는 결제·운영 등 일반 질문 접수입니다.',
  },
] as const

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 8) return phone
  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`
}

function normalizeStatus(raw: string | undefined): ConsultationStatus {
  const allowed: ConsultationStatus[] = ['none', 'requested', 'contacted', 'in_progress', 'completed']
  return allowed.includes(raw as ConsultationStatus) ? (raw as ConsultationStatus) : 'none'
}

function ConsultTimeline({ status }: { status: ConsultationStatus }) {
  const activeIndex = consultationTimelineIndex(status)

  return (
    <ol className="consultTimeline" aria-label="상담 진행 단계">
      {CONSULTATION_TIMELINE.map((step, index) => {
        const done = activeIndex >= index
        const current = activeIndex === index
        const itemClass = [
          'consultTimelineItem',
          done ? 'consultTimelineItem--done' : '',
          current ? 'consultTimelineItem--current' : '',
        ]
          .filter(Boolean)
          .join(' ')

        return (
          <li key={step.id} className={itemClass}>
            <span className="consultTimelineDot" aria-hidden="true">
              {done ? '✓' : index + 1}
            </span>
            <div>
              <p className="consultTimelineLabel">{step.label}</p>
              <p className="consultTimelineDesc">{step.desc}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function GuestConsultView() {
  return (
    <>
      <article className="card consultCard">
        <h2 className="consultCardTitle">매칭 상담 안내</h2>
        <p className="consultCardLead">
          내반쪽은 앱식 자동 매칭이 아니라, 전담 매니저가 카카오톡으로 1:1 맞춤 상담을 진행합니다. 상담 신청은
          로그인 후 가능합니다.
        </p>
        <div className="consultStepsGrid">
          {INTRO_STEPS.map((step, index) => (
            <div key={step.title} className="consultStepItem">
              <span className="consultStepNum">{String(index + 1).padStart(2, '0')}</span>
              <div>
                <p className="consultStepTitle">{step.title}</p>
                <p className="consultStepDesc">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="consultActions">
          <Link to="/join" className="consultPrimaryBtn">
            회원가입하고 상담 신청
          </Link>
          <Link to="/login?returnTo=/consult" className="consultSecondaryBtn">
            로그인
          </Link>
        </div>
      </article>

      <article className="card consultCard">
        <h2 className="consultCardTitle">자주 묻는 질문</h2>
        <div className="consultFaqList">
          {FAQ_ITEMS.map((item) => (
            <div key={item.q} className="consultFaqItem">
              <p className="consultFaqQ">{item.q}</p>
              <p className="consultFaqA">{item.a}</p>
            </div>
          ))}
        </div>
        <p className="consultNote">
          결제·환불·기타 문의는 <Link to="/inquiry/new">1:1 문의</Link>를 이용해 주세요.
        </p>
      </article>
    </>
  )
}

function ApplyConsultView({
  member,
  submitting,
  submitError,
  onSubmit,
}: {
  member: AdminMember
  submitting: boolean
  submitError: string | null
  onSubmit: () => void
}) {
  return (
    <article className="card consultCard">
      <h2 className="consultCardTitle">상담 신청</h2>
      <p className="consultCardLead">
        아래 정보로 상담을 신청할 수 있습니다. 신청 후 담당 매니저가 카카오톡으로 연락드립니다.
      </p>

      <dl className="consultProfileGrid">
        <div className="consultProfileRow">
          <dt>이름</dt>
          <dd>{member.name}</dd>
        </div>
        <div className="consultProfileRow">
          <dt>연락처</dt>
          <dd>{maskPhone(member.phone)}</dd>
        </div>
        <div className="consultProfileRow">
          <dt>지역</dt>
          <dd>
            {findSidoName(member.region1)} · {findSigunguName(member.region1, member.region2)}
          </dd>
        </div>
        <div className="consultProfileRow">
          <dt>직업</dt>
          <dd>{member.job || '—'}</dd>
        </div>
      </dl>

      {submitError ? <p className="adminError">{submitError}</p> : null}

      <div className="consultActions">
        <button type="button" className="consultPrimaryBtn" disabled={submitting} onClick={onSubmit}>
          {submitting ? '신청 중…' : '상담 신청하기'}
        </button>
        <Link to="/me/edit" className="consultSecondaryBtn">
          프로필 수정
        </Link>
      </div>
    </article>
  )
}

function WaitingConsultView({ member, status }: { member: AdminMember; status: ConsultationStatus }) {
  const isWaiting = status === 'requested'
  const badgeClass = isWaiting
    ? 'consultStatusBadge consultStatusBadge--waiting'
    : status === 'completed'
      ? 'consultStatusBadge consultStatusBadge--active'
      : 'consultStatusBadge consultStatusBadge--active'

  return (
    <>
      <article className="card consultCard">
        <span className={badgeClass}>{consultationStatusLabel(status)}</span>
        <h2 className="consultCardTitle">
          {isWaiting ? '매니저 연락을 기다리고 있습니다' : '상담이 진행 중입니다'}
        </h2>
        <p className="consultCardLead">
          {isWaiting ? (
            <>
              {member.name} 님, 상담 신청이 접수되었습니다. 담당 매니저가 프로필을 검토한 뒤{' '}
              <strong>{maskPhone(member.phone)}</strong> 번호로 카카오톡 연락을 드릴 예정입니다.
            </>
          ) : (
            <>
              {member.name} 님, 현재 매니저와 상담 또는 매칭이 진행 중입니다. 카카오톡으로 안내된 내용을
              확인해 주세요.
            </>
          )}
        </p>
        {member.consultationRequestedAt ? (
          <p className="consultNote">
            신청일 {new Date(member.consultationRequestedAt).toLocaleString('ko-KR')}
          </p>
        ) : null}
        <ConsultTimeline status={status} />
      </article>

      <article className="card consultCard">
        <h2 className="consultCardTitle">다음에 할 일</h2>
        <div className="consultStepsGrid">
          {isWaiting ? (
            <>
              <div className="consultStepItem">
                <span className="consultStepNum">01</span>
                <div>
                  <p className="consultStepTitle">카카오톡 연락 확인</p>
                  <p className="consultStepDesc">등록하신 번호로 매니저 메시지가 도착하면 답장해 주세요.</p>
                </div>
              </div>
              <div className="consultStepItem">
                <span className="consultStepNum">02</span>
                <div>
                  <p className="consultStepTitle">프로필 최신 상태 유지</p>
                  <p className="consultStepDesc">연락 전 프로필과 사진을 한 번 더 확인해 주세요.</p>
                </div>
              </div>
            </>
          ) : (
            <div className="consultStepItem">
              <span className="consultStepNum">01</span>
              <div>
                <p className="consultStepTitle">카카오톡 상담 이어가기</p>
                <p className="consultStepDesc">매니저 안내에 따라 상담과 매칭 일정을 진행해 주세요.</p>
              </div>
            </div>
          )}
        </div>
        <div className="consultActions">
          <Link to="/me/edit" className="consultSecondaryBtn">
            프로필 수정
          </Link>
          <Link to="/managers" className="consultSecondaryBtn">
            매니저 소개
          </Link>
          <Link to="/inquiry/new" className="consultSecondaryBtn">
            1:1 문의
          </Link>
        </div>
      </article>
    </>
  )
}

export function Consult() {
  const memberSession = useMemberSession()
  const profile = useMemberProfile()
  const [member, setMember] = useState<AdminMember | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const userId = String(profile?.userId || '').trim()

  const load = useCallback(async () => {
    if (!memberSession || !userId) {
      setMember(null)
      setError(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const r = await apiFetch(`/api/me?userId=${encodeURIComponent(userId)}`)
      const j = await readJsonResponse<{ member?: AdminMember; error?: string }>(r)
      if (!r.ok) throw new Error(j.error || '회원 정보를 불러오지 못했습니다.')
      if (!j.member) throw new Error('회원 정보가 없습니다.')
      setMember(j.member)
    } catch (e) {
      setError(e instanceof Error ? e.message : '연결을 확인해 주세요.')
      setMember(null)
    } finally {
      setLoading(false)
    }
  }, [memberSession, userId])

  useEffect(() => {
    void load()
  }, [load])

  const status = useMemo(() => normalizeStatus(member?.consultationStatus), [member?.consultationStatus])

  const heroLead = useMemo(() => {
    if (!memberSession) {
      return '전담 매니저가 카카오톡으로 1:1 맞춤 상담을 도와드립니다. 상담료는 없습니다.'
    }
    if (status === 'none' || status === 'completed') {
      return '가입 정보를 확인하고 상담을 신청할 수 있습니다.'
    }
    if (status === 'requested') {
      return '상담 신청이 접수되었습니다. 매니저가 카카오톡으로 연락드릴 예정입니다.'
    }
    return '매니저와 상담 및 매칭이 진행 중입니다.'
  }, [memberSession, status])

  const onSubmit = async () => {
    if (!userId) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const r = await apiFetch(`/api/me/consultation?userId=${encodeURIComponent(userId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const j = await readJsonResponse<{ member?: AdminMember; error?: string }>(r)
      if (!r.ok) throw new Error(j.error || '상담 신청에 실패했습니다.')
      if (!j.member) throw new Error('응답에 회원 정보가 없습니다.')
      setMember(j.member)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : '상담 신청 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const showApply = memberSession && member && (status === 'none' || status === 'completed')
  const showWaiting = memberSession && member && !showApply && status !== 'none'

  return (
    <div className="consultPage">
      <SiteHeader />

      <main className="signupMain signupMain--hero">
        <section className="consultHero">
          <div className="container consultHeroInner">
            <h1 className="consultHeroTitle">마이페이지</h1>
            <p className="consultHeroLead">{heroLead}</p>
          </div>
        </section>

        <div className="container signupInner consultBodyWrap">
          {loading ? <p className="adminLoading">불러오는 중…</p> : null}
          {error ? <p className="adminError">{error}</p> : null}

          {!memberSession ? <GuestConsultView /> : null}

          {showApply && member ? (
            <ApplyConsultView
              member={member}
              submitting={submitting}
              submitError={submitError}
              onSubmit={() => void onSubmit()}
            />
          ) : null}

          {showWaiting && member ? <WaitingConsultView member={member} status={status} /> : null}

          {memberSession && !loading && !error && !member ? (
            <article className="card consultCard">
              <p className="consultCardLead">
                로그인 정보를 확인할 수 없습니다.{' '}
                <Link to="/login?returnTo=/consult">다시 로그인</Link>해 주세요.
              </p>
            </article>
          ) : null}
        </div>
      </main>
    </div>
  )
}
