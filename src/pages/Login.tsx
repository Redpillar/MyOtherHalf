import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SiteHeader } from '../components/SiteHeader'
import { setMemberProfile, setMemberSession } from '../lib/memberSession'
import './signup.scss'
import './login.scss'

export function Login() {
  const navigate = useNavigate()
  const [loginId, setLoginId] = useState('')

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const id = loginId.trim()
    if (id) setMemberProfile({ userId: id })
    else setMemberProfile(null)
    setMemberSession(true)
    navigate('/', { replace: true })
  }

  return (
    <div className="loginPage">
      <SiteHeader />

      <main className="signupMain">
        <div className="container signupInner">
          <h1 className="signupTitle">로그인</h1>

          <div className="signupHero" aria-hidden="true">
            <div className="signupHeroCircles">
              <div className="signupHeroSun" />
              <svg className="signupHeroSilhouette" viewBox="0 0 200 120" fill="none">
                <path
                  d="M55 95c0-22 18-40 40-40s40 18 40 40H55zm40-52a16 16 0 1 1 0-32 16 16 0 0 1 0 32zm45 52c0-18 14-32 32-32s32 14 32 32h-64zm32-44a14 14 0 1 1 0-28 14 14 0 0 1 0 28z"
                  fill="rgba(15,23,42,0.35)"
                />
              </svg>
            </div>
          </div>

          <p className="loginTagline">가벼운 소개팅과 결혼 중개의 중간,</p>
          <p className="loginTagline loginTaglineStrong">
            그 사이에서 <strong>내반쪽</strong>이 기준이 됩니다.
          </p>

          <form className="signupForm loginForm" onSubmit={onSubmit}>
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
                  placeholder="비밀번호를 입력하세요"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button type="submit" className="submitBtn loginSubmitBtn">
              로그인
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
