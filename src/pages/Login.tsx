import { type FormEvent, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { SiteHeader } from '../components/SiteHeader'
import { apiFetch, readJsonResponse } from '../lib/apiFetch'
import { setMemberProfile, setMemberSession } from '../lib/memberSession'
import './signup.scss'
import './login.scss'

export function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnTo = useMemo(() => {
    const raw = searchParams.get('returnTo') || '/'
    if (!raw.startsWith('/') || raw.startsWith('//')) return '/'
    return raw
  }, [searchParams])
  const [loginId, setLoginId] = useState('')
  const [loginPw, setLoginPw] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const id = loginId.trim()
    const password = loginPw
    if (!id) {
      setError('아이디를 입력해 주세요.')
      return
    }
    if (!password) {
      setError('비밀번호를 입력해 주세요.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const r = await apiFetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id, password }),
      })
      const j = await readJsonResponse<{ member?: { userId?: string }; error?: string }>(r)
      if (!r.ok) {
        setError(j.error || '로그인에 실패했습니다.')
        return
      }
      const nextId = String(j.member?.userId || '').trim()
      if (!nextId) {
        setError('회원 정보를 불러오지 못했습니다.')
        return
      }
      setMemberProfile({ userId: nextId })
      setMemberSession(true)
      navigate(returnTo, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="loginPage">
      <SiteHeader />

      <main className="signupMain">
        <div className="container signupInner">
          <h1 className="signupTitle">로그인</h1>

          <div className="signupHero" aria-hidden="true">
            <div className="signupHeroCircles">
              <img className="signupHeroImage" src="/hero/login-hero.png" alt="" />
            </div>
          </div>

          <p className="loginTagline">검증된 회원, 1:1 맞춤 상담</p>
          <p className="loginTagline loginTaglineStrong">
            <strong>내반쪽</strong>만의 만남 방식.
          </p>

          <form className="signupForm loginForm" onSubmit={onSubmit}>
            {error ? <p className="adminError" style={{ marginTop: 14 }}>{error}</p> : null}
            <div className="formRow">
              <label className="formLabel" htmlFor="loginId">
                아이디
              </label>
              <div className="formFieldGrow">
                <input
                  id="loginId"
                  name="loginId"
                  type="text"
                  className="formInput"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="아이디를 입력하세요"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="formRow">
              <label className="formLabel" htmlFor="loginPw">
                비밀번호
              </label>
              <div className="formFieldGrow">
                <input
                  id="loginPw"
                  name="loginPw"
                  type="password"
                  className="formInput"
                  value={loginPw}
                  onChange={(e) => setLoginPw(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            <button type="submit" className="submitBtn loginSubmitBtn" disabled={submitting}>
              {submitting ? '로그인 중…' : '로그인'}
            </button>

            <div className="loginAuthLinks">
              <span className="loginAuthLinksLeft">
                <button type="button" className="textLinkBtn">
                  아이디 찾기
                </button>
                <span className="loginAuthSep">|</span>
                <button type="button" className="textLinkBtn">
                  비밀번호 찾기
                </button>
              </span>
              <Link to="/join" className="textLinkA">
                회원가입
              </Link>
            </div>
          </form>
        </div>
      </main>

      <footer className="loginSiteFooter">
        <div className="container loginSiteFooterInner">
          <div className="loginSiteFooterBrand">
            <span className="brandMark" aria-hidden="true" />
            <span className="brandName">내반쪽</span>
          </div>
          <div className="loginSiteFooterMeta">
            <p>
              회사명 : 내반쪽 Co. 개인정보책임관리자 : 담당자명 사업자등록번호 : 000-00-00000
            </p>
            <p>
              Email : contact@example.com <span className="mutedParen">(이메일 무단수집거부)</span>
            </p>
            <p>Copyright {new Date().getFullYear()}. 내반쪽 Co. all rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
