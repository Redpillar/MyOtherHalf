import { Link, useLocation } from 'react-router-dom'
import { SiteHeader } from '../components/SiteHeader'
import './signup.scss'
import './signup-complete.scss'

type SignupCompleteState = {
  name?: string
  userId?: string
} | null

export function SignupComplete() {
  const { state } = useLocation()
  const s = state as SignupCompleteState
  const name = typeof s?.name === 'string' ? s.name.trim() : ''
  const userId = typeof s?.userId === 'string' ? s.userId.trim() : ''

  return (
    <div className="signupPage">
      <SiteHeader />

      <main className="signupMain">
        <div className="container signupInner">
          <h1 className="signupTitle">회원가입 완료</h1>

          <div className="signupHero" aria-hidden="true">
            <div className="signupCompleteHeroWrap">
              <div className="signupHeroCircles">
                <img className="signupHeroImage" src="/hero/signup-hero.png" alt="" />
              </div>
              <div className="signupCompleteBadge" aria-hidden="true">
                <svg viewBox="0 0 48 48" fill="none" className="signupCompleteCheckSvg">
                  <circle cx="24" cy="24" r="22" fill="#fff" />
                  <path
                    d="M14 24.5l7 7 13-14"
                    stroke="#2a1f52"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="signupCompleteCard">
            <p className="signupCompleteLead">
              {name ? (
                <>
                  <strong className="signupCompleteName">{name}</strong> 님, 환영합니다.
                </>
              ) : (
                <>회원가입이 정상적으로 완료되었습니다.</>
              )}
            </p>
            {userId ? (
              <p className="signupCompleteMeta">
                가입 아이디 <span className="signupCompleteUserId">{userId}</span>
              </p>
            ) : null}
            <ul className="signupCompleteSteps">
              <li>제출하신 정보와 사진은 내부 검토 후 매칭에 활용됩니다.</li>
              <li>서비스 이용을 위해 로그인해 주세요.</li>
            </ul>
          </div>

          <div className="signupCompleteActions">
            <Link to="/login" className="submitBtn submitBtnLink">
              로그인하기
            </Link>
            <Link to="/" className="signupCompleteSecondary">
              메인으로
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
