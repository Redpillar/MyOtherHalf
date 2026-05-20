import {
  type FormEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { SiteHeader } from '../components/SiteHeader'
import { EDUCATION_OPTIONS } from '../data/educationLevels'
import { getSigunguForSido, KOREA_SIDO } from '../data/koreaRegions'
import { apiFetch } from '../lib/apiFetch'
import './signup.scss'

const termsPlaceholder =
  '제1조 (목적)\n이 약관은 내반쪽 서비스 이용과 관련하여 회사와 회원 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.\n\n제2조 (정의)\n이 약관에서 사용하는 용어의 정의는 서비스 화면 및 안내에 따릅니다.'

const privacyPlaceholder =
  '수집 항목: 이름, 연락처, 생년월일, 계정정보 등\n이용 목적: 회원 관리, 본인 확인, 서비스 제공, 고객 상담\n보유 기간: 회원 탈퇴 시까지(관련 법령에 따라 일정 기간 보관될 수 있음)'

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

/** month: 1–12, 해당 월의 일 수 */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function ageFromBirthDate(year: number, month1: number, day: number): number {
  const today = new Date()
  let age = today.getFullYear() - year
  if (today.getMonth() + 1 < month1 || (today.getMonth() + 1 === month1 && today.getDate() < day)) {
    age -= 1
  }
  return age
}

/** 클라이언트 검증 실패 사유를 사람이 읽기 쉬운 문장으로 나열합니다. */
function getSignupFormIssues(
  form: HTMLFormElement | null,
  agreeTerms: boolean,
  agreePrivacy: boolean,
): string[] {
  if (!form) return ['폼을 불러올 수 없습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.']

  const issues: string[] = []

  if (!agreeTerms) issues.push('이용약관 동의(필수)에 체크해 주세요.')
  if (!agreePrivacy) issues.push('개인정보 수집 및 이용 동의(필수)에 체크해 주세요.')

  const fd = new FormData(form)
  const req = (name: string) => String(fd.get(name) ?? '').trim()

  if (!req('phone')) issues.push('휴대폰번호를 입력해 주세요.')
  if (!req('name')) issues.push('이름을 입력해 주세요.')
  const birthStr = req('birth')
  if (!birthStr) {
    issues.push('생년월일(연·월·일)을 모두 선택해 주세요.')
  } else {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthStr)
    if (!m) {
      issues.push('생년월일 값이 올바르지 않습니다.')
    } else {
      const y = Number(m[1])
      const mo = Number(m[2])
      const d = Number(m[3])
      const dim = daysInMonth(y, mo)
      if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d) || mo < 1 || mo > 12 || d < 1 || d > dim) {
        issues.push('존재하지 않는 날짜입니다. 연·월·일을 다시 선택해 주세요.')
      } else {
        const age = ageFromBirthDate(y, mo, d)
        if (age < 19) issues.push('만 19세 이상만 가입할 수 있습니다.')
      }
    }
  }
  if (!req('userId')) issues.push('아이디를 입력해 주세요.')

  const password = String(fd.get('password') ?? '')
  const password2 = String(fd.get('password2') ?? '')
  if (!password && !password2) {
    issues.push('비밀번호와 비밀번호 확인을 입력해 주세요.')
  } else if (!password) {
    issues.push('비밀번호를 입력해 주세요.')
  } else if (!password2) {
    issues.push('비밀번호 확인을 입력해 주세요.')
  } else {
    if (password.length < 8) issues.push('비밀번호는 8자 이상이어야 합니다.')
    else if (password !== password2) issues.push('비밀번호와 비밀번호 확인이 서로 다릅니다.')
  }

  const obligationEl = form.querySelector<HTMLInputElement>('input[name="obligation"]')
  if (!obligationEl?.checked) issues.push('「회원의 의무」 항목에 동의해 주세요.')

  const photo1 = (form.elements.namedItem('photo1') as HTMLInputElement | null)?.files?.length ?? 0
  const photo2 = (form.elements.namedItem('photo2') as HTMLInputElement | null)?.files?.length ?? 0
  if (!photo1) issues.push('「사진업로드」 첫 번째 칸(필수)에 이미지 파일을 선택해 주세요.')
  if (!photo2) issues.push('「사진업로드」 두 번째 칸(필수)에 이미지 파일을 선택해 주세요.')

  if (!req('height')) issues.push('키(cm)를 입력해 주세요.')
  if (!req('weight')) issues.push('몸무게(kg)를 입력해 주세요.')
  if (!req('job')) issues.push('직업을 입력해 주세요.')

  const r1 = req('region1')
  const r2 = req('region2')
  if (!r1) issues.push('지역(시·도)을 선택해 주세요.')
  if (!r2) issues.push('지역(구)을 선택해 주세요.')

  const gender = String(fd.get('gender') ?? '').trim()
  if (!gender) issues.push('성별(남자/여자)을 선택해 주세요.')

  return issues
}

function isSignupFormReady(
  form: HTMLFormElement | null,
  agreeTerms: boolean,
  agreePrivacy: boolean,
): boolean {
  return getSignupFormIssues(form, agreeTerms, agreePrivacy).length === 0
}

function fileHint(form: HTMLFormElement | null, name: string): string {
  if (!form) return '선택된 파일 없음'
  const el = form.elements.namedItem(name) as HTMLInputElement | null
  const f = el?.files?.[0]
  return f?.name ?? '선택된 파일 없음'
}

const MAX_PHOTO_SLOTS = 5

function hasPhotoFile(form: HTMLFormElement | null, slot: number): boolean {
  if (!form) return false
  const el = form.elements.namedItem(`photo${slot}`) as HTMLInputElement | null
  return Boolean(el?.files?.length)
}

/** 1·2번 필수. 둘 다 선택된 뒤로는 채워진 칸 다음까지 한 칸씩 노출(최대 5). */
function computeVisiblePhotoSlotCount(form: HTMLFormElement | null): number {
  if (!form) return 2
  if (!hasPhotoFile(form, 1) || !hasPhotoFile(form, 2)) return 2
  for (let k = 3; k <= MAX_PHOTO_SLOTS; k++) {
    if (!hasPhotoFile(form, k)) return k
  }
  return MAX_PHOTO_SLOTS
}

export function Signup() {
  const navigate = useNavigate()
  const formRef = useRef<HTMLFormElement>(null)
  const [formTick, setFormTick] = useState(0)
  const bumpForm = useCallback(() => setFormTick((n) => n + 1), [])

  const onHeightWeightDigitsOnly = useCallback(
    (e: FormEvent<HTMLInputElement>) => {
      const el = e.currentTarget
      const next = el.value.replace(/\D/g, '')
      if (el.value !== next) el.value = next
      bumpForm()
    },
    [bumpForm],
  )

  const onPhoneDigitsOnly = useCallback(
    (e: FormEvent<HTMLInputElement>) => {
      const el = e.currentTarget
      const next = el.value.replace(/\D/g, '')
      if (el.value !== next) el.value = next
      bumpForm()
    },
    [bumpForm],
  )

  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const agreeAll = agreeTerms && agreePrivacy
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [validationIssues, setValidationIssues] = useState<string[]>([])
  const [userIdDupHint, setUserIdDupHint] = useState<string | null>(null)
  const [userIdDupKind, setUserIdDupKind] = useState<'ok' | 'err' | null>(null)
  const [userIdDupBusy, setUserIdDupBusy] = useState(false)
  const feedbackRef = useRef<HTMLDivElement>(null)

  const [regionSido, setRegionSido] = useState('')
  const [regionSigungu, setRegionSigungu] = useState('')

  const sigunguOptions = useMemo(() => getSigunguForSido(regionSido), [regionSido])

  const birthYearOptions = useMemo(() => {
    const y0 = new Date().getFullYear()
    const max = y0 - 19
    const min = y0 - 100
    const out: number[] = []
    for (let y = max; y >= min; y -= 1) out.push(y)
    return out
  }, [])

  const [birthYear, setBirthYear] = useState<number | null>(null)
  const [birthMonth, setBirthMonth] = useState<number | null>(null)
  const [birthDay, setBirthDay] = useState<number | null>(null)

  const maxDayInMonth = useMemo(() => {
    if (birthYear == null || birthMonth == null) return 31
    return daysInMonth(birthYear, birthMonth)
  }, [birthYear, birthMonth])

  const birthValue =
    birthYear != null && birthMonth != null && birthDay != null
      ? `${birthYear}-${pad2(birthMonth)}-${pad2(birthDay)}`
      : ''

  const canSubmit = useMemo(
    () => isSignupFormReady(formRef.current, agreeTerms, agreePrivacy),
    [formTick, agreeTerms, agreePrivacy],
  )

  const visiblePhotoSlotCount = useMemo(
    () => computeVisiblePhotoSlotCount(formRef.current),
    [formTick],
  )

  const photoSlotNumbers = useMemo(
    () => Array.from({ length: visiblePhotoSlotCount }, (_, i) => i + 1),
    [visiblePhotoSlotCount],
  )

  useLayoutEffect(() => {
    bumpForm()
  }, [bumpForm])

  useEffect(() => {
    const form = formRef.current
    if (!form) return
    const onNative = (ev: Event) => {
      // 캡처 단계에서 즉시 setState 하면 일부 브라우저에서 <select> 네이티브 메뉴가 닫히거나 클릭이 먹지 않을 수 있음
      if (ev.target instanceof HTMLSelectElement) {
        window.setTimeout(() => bumpForm(), 0)
        return
      }
      bumpForm()
    }
    form.addEventListener('input', onNative, true)
    form.addEventListener('change', onNative, true)
    return () => {
      form.removeEventListener('input', onNative, true)
      form.removeEventListener('change', onNative, true)
    }
  }, [bumpForm])

  useEffect(() => {
    if (validationIssues.length === 0 && !formError) return
    feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [validationIssues, formError])

  useEffect(() => {
    queueMicrotask(() => {
      setValidationIssues([])
    })
  }, [formTick, agreeTerms, agreePrivacy])

  const onDupCheck = async () => {
    const el = document.getElementById('userId') as HTMLInputElement | null
    const userId = el?.value?.trim()
    if (!userId) {
      setUserIdDupKind('err')
      setUserIdDupHint('아이디를 입력한 뒤 중복 확인을 눌러 주세요.')
      return
    }
    setUserIdDupBusy(true)
    setUserIdDupHint(null)
    setUserIdDupKind(null)
    try {
      const r = await apiFetch(`/api/members/check-userid?userId=${encodeURIComponent(userId)}`)
      const raw = await r.text()
      let j = {} as { available?: boolean; error?: string }
      try {
        j = JSON.parse(raw) as { available?: boolean; error?: string }
      } catch {
        setUserIdDupKind('err')
        setUserIdDupHint('서버 응답을 해석할 수 없습니다. API가 실행 중인지 확인해 주세요.')
        return
      }
      if (!r.ok) {
        setUserIdDupKind('err')
        setUserIdDupHint(j.error || '확인에 실패했습니다.')
        return
      }
      if (j.available) {
        setUserIdDupKind('ok')
        setUserIdDupHint('사용 가능한 아이디입니다.')
      } else {
        setUserIdDupKind('err')
        setUserIdDupHint('이미 사용 중인 아이디입니다.')
      }
    } catch (e) {
      setUserIdDupKind('err')
      setUserIdDupHint(
        e instanceof TypeError &&
          (/failed to fetch/i.test(String(e.message)) || /load failed/i.test(String(e.message)))
          ? '서버에 연결할 수 없습니다. npm run dev 로 API가 떠 있는지 확인해 주세요.'
          : e instanceof Error
            ? e.message
            : '확인 중 오류가 발생했습니다.',
      )
    } finally {
      setUserIdDupBusy(false)
    }
  }

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormError(null)
    setValidationIssues([])

    const issues = getSignupFormIssues(e.currentTarget, agreeTerms, agreePrivacy)
    if (issues.length > 0) {
      setValidationIssues(issues)
      return
    }

    const form = e.currentTarget
    const fd = new FormData(form)

    setSubmitting(true)
    try {
      const r = await apiFetch('/api/signup', {
        method: 'POST',
        body: fd,
      })
      const raw = await r.text()
      const ct = (r.headers.get('content-type') || '').toLowerCase()
      let j: { error?: string; member?: { name?: string; userId?: string } } = {}

      if (ct.includes('application/json')) {
        try {
          j = JSON.parse(raw) as { error?: string; member?: { name?: string; userId?: string } }
        } catch {
          setFormError(`서버 응답을 JSON으로 해석할 수 없습니다. (HTTP ${r.status})`)
          return
        }
      } else {
        if (!r.ok) {
          const snippet = raw.replace(/\s+/g, ' ').trim().slice(0, 200)
          setFormError(
            snippet
              ? `서버가 JSON이 아닌 응답을 돌려주었습니다. (HTTP ${r.status}) ${snippet}`
              : `서버가 JSON이 아닌 응답을 돌려주었습니다. (HTTP ${r.status})`,
          )
          return
        }
        setFormError(
          `가입 응답이 JSON이 아닙니다. Vite 프록시와 API 서버(예: npm run dev, 포트 8787) 설정을 확인해 주세요. (HTTP ${r.status})`,
        )
        return
      }

      if (!r.ok) {
        const base = j.error?.trim() || '가입 요청이 거절되었습니다.'
        setFormError(`${base} (HTTP ${r.status})`)
        return
      }
      navigate('/join/complete', {
        replace: true,
        state: {
          name: j.member?.name,
          userId: j.member?.userId,
        },
      })
    } catch (err) {
      const msg =
        err instanceof TypeError &&
        (/failed to fetch/i.test(String(err.message)) || /load failed/i.test(String(err.message)))
          ? '네트워크에 연결할 수 없습니다. 브라우저가 오프라인이 아닌지, 그리고 npm run dev 로 API(보통 127.0.0.1:8787)가 함께 떠 있는지 확인해 주세요.'
          : err instanceof Error
            ? err.message
            : '요청 중 알 수 없는 오류가 발생했습니다.'
      setFormError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="signupPage">
      <SiteHeader />

      <main className="signupMain">
        <div className="container signupInner">
          <h1 className="signupTitle">회원가입</h1>

          <div className="signupHero" aria-hidden="true">
            <div className="signupHeroCircles">
              <img className="signupHeroImage" src="/hero/signup-hero.png" alt="" />
            </div>
          </div>

          <p className="signupLead">이제, 우리 둘만의 이야기가 시작됩니다.</p>
          <p className="signupSub">내반쪽에서 더 특별한 인연을 만나보세요.</p>
          <p className="signupRequiredLegend">
            <span className="req" aria-hidden>
              *
            </span>{' '}
            표시는 필수 입력·동의 항목입니다. (선택)은 입력하지 않아도 됩니다.
          </p>

          <div ref={feedbackRef} className="signupFeedbackAnchor">
            {validationIssues.length > 0 ? (
              <div className="formValidationBanner" role="alert">
                <p className="formValidationTitle">가입을 진행하려면 아래를 확인해 주세요.</p>
                <ul className="formValidationList">
                  {validationIssues.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {formError ? (
              <p className="formErrorBanner" role="alert">
                {formError}
              </p>
            ) : null}
          </div>

          <form ref={formRef} className="signupForm" onSubmit={onSubmit}>
            <div className="formRow">
              <label className="formLabel" htmlFor="phone">
                <span className="req">*</span> 휴대폰번호
              </label>
              <div className="formFieldGrow">
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  className="formInput"
                  placeholder="숫자만 입력 (하이픈 없이)"
                  autoComplete="tel"
                  required
                  onInput={onPhoneDigitsOnly}
                />
              </div>
            </div>

            <div className="formRow">
              <label className="formLabel" htmlFor="name">
                <span className="req">*</span> 이름
              </label>
              <div className="formFieldGrow">
                <input
                  id="name"
                  name="name"
                  type="text"
                  className="formInput"
                  placeholder="이름을 입력하세요"
                  autoComplete="name"
                  required
                />
              </div>
            </div>

            <div className="formRow formRowBirth">
              <div className="formLabel" id="birth-label">
                <span className="req">*</span> 생년월일
              </div>
              <div className="formFieldGrow birthSelectGroup" role="group" aria-labelledby="birth-label">
                <input type="hidden" name="birth" value={birthValue} />
                <select
                  id="birth-year"
                  className="formSelect birthSelect"
                  aria-label="출생 연도"
                  value={birthYear === null ? '' : String(birthYear)}
                  onChange={(e) => {
                    const v = e.target.value
                    if (v === '') {
                      setBirthYear(null)
                      setBirthMonth(null)
                      setBirthDay(null)
                    } else {
                      const nextY = Number(v)
                      const prevY = birthYear
                      setBirthYear(nextY)
                      if (prevY != null && prevY !== nextY) {
                        setBirthMonth(null)
                        setBirthDay(null)
                      }
                    }
                  }}
                >
                  <option value="">연도</option>
                  {birthYearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}년
                    </option>
                  ))}
                </select>
                <select
                  id="birth-month"
                  className="formSelect birthSelect"
                  aria-label="출생 월"
                  value={birthMonth === null ? '' : String(birthMonth)}
                  onChange={(e) => {
                    const v = e.target.value
                    if (v === '') {
                      setBirthMonth(null)
                      setBirthDay(null)
                    } else {
                      const nextM = Number(v)
                      const prevM = birthMonth
                      setBirthMonth(nextM)
                      if (prevM != null && prevM !== nextM) {
                        setBirthDay(null)
                      }
                    }
                  }}
                >
                  <option value="">월</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((mo) => (
                    <option key={mo} value={mo}>
                      {mo}월
                    </option>
                  ))}
                </select>
                <select
                  id="birth-day"
                  className="formSelect birthSelect"
                  aria-label="출생 일"
                  disabled={birthYear === null || birthMonth === null}
                  value={birthDay === null ? '' : String(birthDay)}
                  onChange={(e) => {
                    const v = e.target.value
                    setBirthDay(v === '' ? null : Number(v))
                  }}
                >
                  <option value="">일</option>
                  {birthYear != null && birthMonth != null
                    ? Array.from({ length: maxDayInMonth }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>
                          {d}일
                        </option>
                      ))
                    : null}
                </select>
              </div>
            </div>

            <div className="formRow formRowUserId">
              <label className="formLabel" htmlFor="userId">
                <span className="req">*</span> 아이디
              </label>
              <div className="formFieldGrow formFieldUserIdCol">
                <div className="formUserIdRow">
                  <input
                    id="userId"
                    name="userId"
                    type="text"
                    className="formInput"
                    placeholder="아이디를 입력하세요"
                    autoComplete="username"
                    required
                    onInput={() => {
                      setUserIdDupHint(null)
                      setUserIdDupKind(null)
                    }}
                  />
                  <button
                    type="button"
                    className="dupCheckBtn"
                    disabled={userIdDupBusy}
                    onClick={() => void onDupCheck()}
                  >
                    {userIdDupBusy ? '확인 중…' : '아이디 중복 확인'}
                  </button>
                </div>
                {userIdDupHint ? (
                  <p
                    className={
                      userIdDupKind === 'ok' ? 'signupDupCheckHint signupDupCheckHintOk' : 'signupDupCheckHint signupDupCheckHintErr'
                    }
                    role="status"
                    aria-live="polite"
                  >
                    {userIdDupHint}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="formRow">
              <label className="formLabel" htmlFor="password">
                <span className="req">*</span> 비밀번호
              </label>
              <div className="formFieldGrow">
                <input
                  id="password"
                  name="password"
                  type="password"
                  className="formInput"
                  placeholder="비밀번호를 입력하세요 (8자 이상)"
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
              </div>
            </div>

            <div className="formRow">
              <label className="formLabel" htmlFor="password2">
                <span className="req">*</span> 비밀번호 확인
              </label>
              <div className="formFieldGrow">
                <input
                  id="password2"
                  name="password2"
                  type="password"
                  className="formInput"
                  placeholder="비밀번호를 다시 입력하세요"
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
              </div>
            </div>

            <div className="formRow formRowStack">
              <div className="formLabel">
                <span className="req">*</span> 회원의 의무
              </div>
              <label className="checkboxLine">
                <input name="obligation" type="checkbox" />
                <span>
                  법적으로 싱글이 아니거나 위조된 서류로 인증을 하는 경우 즉시 이용계약이 해지되며,
                  회사측 손해에 대한 구상권 청구에 동의합니다.
                </span>
              </label>
            </div>

            <p className="signupPhotoLegend">
              <span className="req">*</span> 1·2번 사진은 필수입니다. 두 장을 모두 고르면 다음 칸이 하나씩 열리며, 최대 {MAX_PHOTO_SLOTS}장까지 추가할 수 있습니다.
            </p>
            {photoSlotNumbers.map((n) => (
              <div key={n} className="formRow">
                <span className="formLabel">
                  {n <= 2 && <span className="req">*</span>}
                  사진 {n}
                  {n > 2 ? <span className="fieldOptional"> (선택)</span> : null}
                </span>
                <div className="formFieldGrow fileRow">
                  <label className="filePickLabel">
                    <span className="fileBtn">파일 선택</span>
                    <input
                      type="file"
                      name={`photo${n}`}
                      accept="image/*"
                      className="srOnly"
                      required={n <= 2}
                    />
                  </label>
                  <span className="fileHint">{fileHint(formRef.current, `photo${n}`)}</span>
                </div>
              </div>
            ))}

            <div className="formRow">
              <span className="formLabel">
                <span className="req">*</span> 성별
              </span>
              <div className="radioGroup">
                <label>
                  <input type="radio" name="gender" value="male" defaultChecked required /> 남자
                </label>
                <label>
                  <input type="radio" name="gender" value="female" /> 여자
                </label>
              </div>
            </div>

            <div className="formRow">
              <label className="formLabel" htmlFor="height">
                <span className="req">*</span> 키
              </label>
              <div className="formFieldGrow inlineUnit">
                <input
                  id="height"
                  name="height"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  className="formInput short"
                  required
                  onInput={onHeightWeightDigitsOnly}
                />
                <span className="unit">cm</span>
              </div>
            </div>

            <div className="formRow">
              <label className="formLabel" htmlFor="weight">
                <span className="req">*</span> 몸무게
              </label>
              <div className="formFieldGrow inlineUnit">
                <input
                  id="weight"
                  name="weight"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  className="formInput short"
                  required
                  onInput={onHeightWeightDigitsOnly}
                />
                <span className="unit">kg</span>
              </div>
            </div>

            <div className="formRow">
              <label className="formLabel" htmlFor="job">
                <span className="req">*</span> 직업
              </label>
              <div className="formFieldGrow">
                <input
                  id="job"
                  name="job"
                  type="text"
                  className="formInput"
                  placeholder="직업을 입력해주세요."
                  required
                />
              </div>
            </div>

            <div className="formRow">
              <span className="formLabel">
                <span className="req">*</span> 지역
              </span>
              <div className="formFieldGrow regionRow">
                <select
                  name="region1"
                  className="formSelect"
                  required
                  value={regionSido}
                  onChange={(e) => {
                    setRegionSido(e.target.value)
                    setRegionSigungu('')
                    bumpForm()
                  }}
                >
                  <option value="" disabled>
                    시·도 선택
                  </option>
                  {KOREA_SIDO.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <select
                  name="region2"
                  className="formSelect"
                  required
                  value={regionSigungu}
                  disabled={!regionSido}
                  onChange={(e) => {
                    setRegionSigungu(e.target.value)
                    bumpForm()
                  }}
                >
                  <option value="" disabled>
                    {regionSido ? '시·군·구 선택' : '시·도를 먼저 선택하세요'}
                  </option>
                  {sigunguOptions.map((g) => (
                    <option key={g.code} value={g.code}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>


            <div className="formRow">
              <label className="formLabel" htmlFor="education">
                최종학력 <span className="fieldOptional">(선택)</span>
              </label>
              <div className="formFieldGrow">
                <select id="education" name="education" className="formSelect" defaultValue="">
                  <option value="">최종학력 선택</option>
                  {EDUCATION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="formRow">
              <label className="formLabel" htmlFor="mbti">
                MBTI <span className="fieldOptional">(선택)</span>
              </label>
              <div className="formFieldGrow">
                <select id="mbti" name="mbti" className="formSelect" defaultValue="">
                  <option value="">MBTI를 선택해주세요.</option>
                  {['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP'].map(
                    (m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>

            <div className="formRow">
              <span className="formLabel">
                흡연여부 <span className="fieldOptional">(선택)</span>
              </span>
              <div className="radioGroup">
                <label>
                  <input type="radio" name="smoke" value="yes" /> 흡연
                </label>
                <label>
                  <input type="radio" name="smoke" value="no" defaultChecked /> 비흡연
                </label>
              </div>
            </div>

            <div className="formRow">
              <span className="formLabel">
                음주여부 <span className="fieldOptional">(선택)</span>
              </span>
              <div className="radioGroup">
                <label>
                  <input type="radio" name="drink" value="yes" /> 음주
                </label>
                <label>
                  <input type="radio" name="drink" value="no" defaultChecked /> 비음주
                </label>
              </div>
            </div>

            <div className="formRow">
              <label className="formLabel" htmlFor="car">
                차종 <span className="fieldOptional">(선택)</span>
              </label>
              <div className="formFieldGrow">
                <input
                  id="car"
                  name="car"
                  type="text"
                  className="formInput"
                  placeholder="차종을 알려 주세요."
                />
              </div>
            </div>

            <div className="formRow">
              <label className="formLabel" htmlFor="appeal">
                이성에게 어필할 한마디 <span className="fieldOptional">(선택)</span>
              </label>
              <div className="formFieldGrow">
                <input
                  id="appeal"
                  name="appeal"
                  type="text"
                  className="formInput"
                  placeholder="하고싶은 말을 적어주세요."
                />
              </div>
            </div>

            <div className="termsBlock">
              <label className="checkboxLine strong">
                <input
                  type="checkbox"
                  checked={agreeAll}
                  onChange={(e) => {
                    const v = e.target.checked
                    setAgreeTerms(v)
                    setAgreePrivacy(v)
                    bumpForm()
                  }}
                />
                이용약관, 개인정보 수집 및 이용에 모두 동의합니다.
              </label>

              <label className="checkboxLine">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => {
                    setAgreeTerms(e.target.checked)
                    bumpForm()
                  }}
                />
                이용약관 동의 <span className="req">(필수)</span>
              </label>
              <div className="termsBox" tabIndex={0}>
                {termsPlaceholder}
              </div>

              <label className="checkboxLine">
                <input
                  type="checkbox"
                  checked={agreePrivacy}
                  onChange={(e) => {
                    setAgreePrivacy(e.target.checked)
                    bumpForm()
                  }}
                />
                개인정보 수집 및 이용 동의 <span className="req">(필수)</span>
              </label>
              <div className="termsBox" tabIndex={0}>
                {privacyPlaceholder}
              </div>
            </div>

            <button type="submit" className="submitBtn" disabled={submitting}>
              {submitting ? '처리 중…' : '가입하기'}
            </button>
            {!canSubmit && !submitting ? (
              <p className="signupSubmitHint">
                필수 입력·동의가 남아 있어도 가입하기를 누르면, 위에 부족한 항목이 목록으로 표시됩니다.
              </p>
            ) : null}
          </form>
        </div>
      </main>
    </div>
  )
}
