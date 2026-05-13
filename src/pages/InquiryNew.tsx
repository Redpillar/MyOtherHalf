import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SiteHeader } from '../components/SiteHeader'
import { useMemberProfile, useMemberSession } from '../lib/memberSession'
import { apiFetch } from '../lib/apiFetch'
import './signup.scss'
import './admin.scss'

export function InquiryNew() {
  const navigate = useNavigate()
  const member = useMemberSession()
  const profile = useMemberProfile()
  const memberInquiry = Boolean(member && profile?.userId)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const uid = profile?.userId?.trim() || ''
      const payload = memberInquiry
        ? {
            memberUserId: uid,
            name: '',
            email: '',
            phone: '',
            title: title.trim(),
            body: body.trim(),
          }
        : {
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            title: title.trim(),
            body: body.trim(),
          }

      const r = await apiFetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const j = (await r.json()) as { inquiry?: { id: number }; error?: string }
      if (!r.ok) throw new Error(j.error || '접수에 실패했습니다.')
      const id = j.inquiry?.id
      if (id != null) navigate(`/inquiry/${id}`, { replace: true })
      else navigate('/inquiry', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '연결을 확인해 주세요.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="loginPage">
      <SiteHeader />

      <main className="signupMain">
        <div className="container signupInner" style={{ maxWidth: 560 }}>
          <h1 className="signupTitle">문의 작성</h1>
          <p style={{ margin: '0 0 24px', fontSize: 14, lineHeight: 1.55, color: 'rgba(15,23,42,0.55)' }}>
            {memberInquiry ? (
              <>
                로그인 회원 문의입니다. 이름·아이디·연락처는 입력하지 않으며, 회원 아이디로 접수됩니다. 목록은{' '}
                <Link to="/inquiry" style={{ fontWeight: 800 }}>
                  1:1 문의
                </Link>
                에서 확인할 수 있습니다.
              </>
            ) : (
              <>
                답변은 카카오톡 또는 이메일로 안내해 드립니다. 내용을 남겨 주시면 확인 후 연락드립니다.
              </>
            )}
          </p>

          <form className="signupForm" onSubmit={(ev) => void onSubmit(ev)}>
            {!memberInquiry ? (
              <>
                <div className="formRow">
                  <label className="formLabel" htmlFor="inq-name">
                    이름 <span className="req">*</span>
                  </label>
                  <div className="formFieldGrow">
                    <input
                      id="inq-name"
                      className="formInput"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      maxLength={80}
                    />
                  </div>
                </div>
                <div className="formRow">
                  <label className="formLabel" htmlFor="inq-email">
                    이메일 <span className="req">*</span>
                  </label>
                  <div className="formFieldGrow">
                    <input
                      id="inq-email"
                      type="email"
                      className="formInput"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>
                <div className="formRow">
                  <label className="formLabel" htmlFor="inq-phone">
                    연락처
                  </label>
                  <div className="formFieldGrow">
                    <input
                      id="inq-phone"
                      type="tel"
                      className="formInput"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="선택"
                      autoComplete="tel"
                    />
                  </div>
                </div>
              </>
            ) : null}
            <div className="formRow">
              <label className="formLabel" htmlFor="inq-title">
                제목 <span className="req">*</span>
              </label>
              <div className="formFieldGrow">
                <input
                  id="inq-title"
                  className="formInput"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={200}
                />
              </div>
            </div>
            <div className="formRow">
              <label className="formLabel" htmlFor="inq-body">
                문의 내용 <span className="req">*</span>
              </label>
              <div className="formFieldGrow">
                <textarea
                  id="inq-body"
                  className="formInput"
                  rows={8}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  required
                  minLength={10}
                  maxLength={20000}
                  placeholder="10자 이상 입력해 주세요."
                />
              </div>
            </div>

            {error ? <p className="adminError" style={{ margin: '0 0 8px' }}>{error}</p> : null}

            <button type="submit" className="submitBtn loginSubmitBtn" disabled={busy}>
              {busy ? '접수 중…' : '문의 접수'}
            </button>
          </form>

          <p style={{ marginTop: 24, fontSize: 14 }}>
            {memberInquiry ? (
              <Link to="/inquiry" className="navLink" style={{ fontWeight: 800 }}>
                ← 문의 목록
              </Link>
            ) : (
              <Link to="/" className="navLink" style={{ fontWeight: 800 }}>
                ← 메인으로
              </Link>
            )}
          </p>
        </div>
      </main>
    </div>
  )
}
