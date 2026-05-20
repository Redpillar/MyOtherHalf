import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import type { AdminMember } from '../admin/memberTypes'
import { SiteHeader } from '../components/SiteHeader'
import { EDUCATION_OPTIONS } from '../data/educationLevels'
import { getSigunguForSido, KOREA_SIDO } from '../data/koreaRegions'
import { apiFetch, readJsonResponse } from '../lib/apiFetch'
import { setMemberSession, useMemberProfile, useMemberSession } from '../lib/memberSession'
import './signup.scss'
import './admin.scss'
import './member-edit.scss'

type MemberEditDraft = {
  userId: string
  name: string
  phone: string
  birth: string
  gender: string
  height: string
  weight: string
  job: string
  region1: string
  region2: string
  education: string
  mbti: string
  smoke: string
  drink: string
  car: string
  appeal: string
  obligationAgreed: boolean
  newPassword: string
  newPasswordConfirm: string
}

function memberToDraft(m: AdminMember): MemberEditDraft {
  return {
    userId: m.userId,
    name: m.name,
    phone: m.phone,
    birth: m.birth,
    gender: m.gender,
    height: m.height,
    weight: m.weight,
    job: m.job,
    region1: m.region1,
    region2: m.region2,
    education: m.education ?? '',
    mbti: m.mbti ?? '',
    smoke: m.smoke ?? '',
    drink: m.drink ?? '',
    car: m.car ?? '',
    appeal: m.appeal ?? '',
    obligationAgreed: m.obligationAgreed,
    newPassword: '',
    newPasswordConfirm: '',
  }
}

export function MemberEdit() {
  const navigate = useNavigate()
  const member = useMemberSession()
  const profile = useMemberProfile()
  const [draft, setDraft] = useState<MemberEditDraft | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveOk, setSaveOk] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (!member) {
    return <Navigate to="/login" replace />
  }

  const currentUserId = String(profile?.userId || '').trim()

  const load = useCallback(async () => {
    if (!currentUserId) {
      setLoading(false)
      setError('로그인한 회원 정보를 찾을 수 없습니다. 다시 로그인해 주세요.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const r = await apiFetch(`/api/me?userId=${encodeURIComponent(currentUserId)}`)
      const j = await readJsonResponse<{ member?: AdminMember; error?: string }>(r)
      if (r.status === 404) {
        setMemberSession(false)
        setError('회원 정보를 찾을 수 없습니다. 다시 로그인해 주세요.')
        setDraft(null)
        return
      }
      if (!r.ok) throw new Error(j.error || '회원 정보를 불러오지 못했습니다.')
      if (!j.member) throw new Error('데이터가 없습니다.')
      setDraft(memberToDraft(j.member))
    } catch (e) {
      setError(e instanceof Error ? e.message : '연결을 확인해 주세요.')
      setDraft(null)
    } finally {
      setLoading(false)
    }
  }, [currentUserId])

  useEffect(() => {
    void load()
  }, [load])

  const sigunguOptions = useMemo(() => getSigunguForSido(draft?.region1 || ''), [draft?.region1])

  const patchField = <K extends keyof MemberEditDraft>(key: K, value: MemberEditDraft[K]) => {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev))
    setSaveOk(null)
  }

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!draft || !currentUserId) return
    const nextPassword = draft.newPassword.trim()
    const nextPasswordConfirm = draft.newPasswordConfirm.trim()
    setSaveError(null)
    setSaveOk(null)
    if (nextPassword || nextPasswordConfirm) {
      if (!nextPassword) {
        setSaveError('새 비밀번호를 입력해 주세요.')
        return
      }
      if (!nextPasswordConfirm) {
        setSaveError('비밀번호 확인을 입력해 주세요.')
        return
      }
      if (nextPassword !== nextPasswordConfirm) {
        setSaveError('새 비밀번호와 비밀번호 확인이 일치하지 않습니다.')
        return
      }
    }
    setSaving(true)
    try {
      const r = await apiFetch(`/api/me?userId=${encodeURIComponent(currentUserId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draft.name.trim(),
          phone: draft.phone.replace(/\D/g, ''),
          birth: draft.birth,
          gender: draft.gender,
          height: draft.height.trim(),
          weight: draft.weight.trim(),
          job: draft.job.trim(),
          region1: draft.region1,
          region2: draft.region2,
          education: draft.education,
          mbti: draft.mbti.trim(),
          smoke: draft.smoke,
          drink: draft.drink,
          car: draft.car.trim(),
          appeal: draft.appeal.trim(),
          obligationAgreed: draft.obligationAgreed,
          newPassword: nextPassword,
          newPasswordConfirm: nextPasswordConfirm,
        }),
      })
      const j = await readJsonResponse<{ member?: AdminMember; error?: string }>(r)
      if (!r.ok) {
        setSaveError(j.error || '저장하지 못했습니다.')
        return
      }
      if (!j.member) {
        setSaveError('응답에 회원 정보가 없습니다.')
        return
      }
      setDraft(memberToDraft(j.member))
      window.alert('저장되었습니다.')
      navigate('/', { replace: true })
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="loginPage memberEditPage">
      <SiteHeader />

      <main className="signupMain">
        <div className="container signupInner memberEditInner">
          <h1 className="signupTitle">회원 정보 수정</h1>
          <p className="memberEditIntro">
            로그인한 회원 정보 기준으로 수정됩니다. 비밀번호는 새 비밀번호와 비밀번호 확인을 둘 다 입력할 때만 변경됩니다.
          </p>

          {loading ? <p className="adminLoading">불러오는 중…</p> : null}
          {error ? <p className="adminError">{error}</p> : null}

          {!loading && !error && draft ? (
            <form className="signupForm" onSubmit={(ev) => void onSubmit(ev)}>
              {saveError ? <p className="memberEditSaveHint adminError">{saveError}</p> : null}
              {!saveError && saveOk ? <p className="memberEditSaveHint memberEditSaveOk">{saveOk}</p> : null}

              <div className="formRow formRowUserId">
                <label className="formLabel" htmlFor="member-userId">
                  아이디
                </label>
                <div className="formFieldGrow">
                  <input id="member-userId" className="formInput memberEditReadonlyInput" value={draft.userId} readOnly autoComplete="username" />
                  <p className="memberEditFieldHint">아이디는 변경할 수 없습니다.</p>
                </div>
              </div>

              <div className="formRow">
                <label className="formLabel" htmlFor="member-name">
                  이름
                </label>
                <div className="formFieldGrow">
                  <input id="member-name" className="formInput memberEditReadonlyInput" value={draft.name} readOnly />
                  <p className="memberEditFieldHint">이름은 변경할 수 없습니다.</p>
                </div>
              </div>

              <div className="formRow">
                <label className="formLabel" htmlFor="member-phone">
                  휴대폰번호
                </label>
                <div className="formFieldGrow">
                  <input id="member-phone" className="formInput memberEditReadonlyInput" inputMode="numeric" autoComplete="tel" value={draft.phone} readOnly />
                  <p className="memberEditFieldHint">휴대폰번호는 변경할 수 없습니다.</p>
                </div>
              </div>

              <div className="formRow">
                <label className="formLabel" htmlFor="member-birth">
                  생년월일
                </label>
                <div className="formFieldGrow">
                  <input id="member-birth" className="formInput memberEditReadonlyInput" type="date" value={draft.birth} readOnly />
                  <p className="memberEditFieldHint">생년월일은 변경할 수 없습니다.</p>
                </div>
              </div>

              <div className="formRow">
                <label className="formLabel" htmlFor="member-gender">
                  성별
                </label>
                <div className="formFieldGrow">
                  <select id="member-gender" className="formSelect memberEditReadonlySelect" value={draft.gender} disabled>
                    <option value="male">남자</option>
                    <option value="female">여자</option>
                  </select>
                  <p className="memberEditFieldHint">성별은 변경할 수 없습니다.</p>
                </div>
              </div>

              <div className="formRow">
                <label className="formLabel" htmlFor="member-height">
                  <span className="req">*</span>키
                </label>
                <div className="formFieldGrow inlineUnit">
                  <input
                    id="member-height"
                    className="formInput short"
                    inputMode="decimal"
                    value={draft.height}
                    onChange={(e) => patchField('height', e.target.value.replace(/[^\d.]/g, ''))}
                  />
                  <span className="unit">cm</span>
                </div>
              </div>

              <div className="formRow">
                <label className="formLabel" htmlFor="member-weight">
                  <span className="req">*</span>몸무게
                </label>
                <div className="formFieldGrow inlineUnit">
                  <input
                    id="member-weight"
                    className="formInput short"
                    inputMode="decimal"
                    value={draft.weight}
                    onChange={(e) => patchField('weight', e.target.value.replace(/[^\d.]/g, ''))}
                  />
                  <span className="unit">kg</span>
                </div>
              </div>

              <div className="formRow">
                <label className="formLabel" htmlFor="member-job">
                  <span className="req">*</span>직업
                </label>
                <div className="formFieldGrow">
                  <input id="member-job" className="formInput" value={draft.job} onChange={(e) => patchField('job', e.target.value)} />
                </div>
              </div>

              <div className="formRow formRowStack">
                <label className="formLabel">
                  <span className="req">*</span>지역
                </label>
                <div className="formFieldGrow regionRow">
                  <select
                    className="formSelect"
                    value={draft.region1}
                    onChange={(e) =>
                      setDraft((prev) => (prev ? { ...prev, region1: e.target.value, region2: '' } : prev))
                    }
                  >
                    <option value="">시/도 선택</option>
                    {KOREA_SIDO.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <select className="formSelect" value={draft.region2} onChange={(e) => patchField('region2', e.target.value)}>
                    <option value="">시/군/구 선택</option>
                    {sigunguOptions.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="formRow">
                <label className="formLabel" htmlFor="member-education">
                  최종학력
                </label>
                <div className="formFieldGrow">
                  <select
                    id="member-education"
                    className="formSelect"
                    value={draft.education}
                    onChange={(e) => patchField('education', e.target.value)}
                  >
                    <option value="">선택 안 함</option>
                    {EDUCATION_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="formRow">
                <label className="formLabel" htmlFor="member-mbti">
                  MBTI
                </label>
                <div className="formFieldGrow">
                  <input id="member-mbti" className="formInput" value={draft.mbti} onChange={(e) => patchField('mbti', e.target.value.toUpperCase())} />
                </div>
              </div>

              <div className="formRow">
                <label className="formLabel" htmlFor="member-smoke">
                  흡연 여부
                </label>
                <div className="formFieldGrow">
                  <select id="member-smoke" className="formSelect" value={draft.smoke} onChange={(e) => patchField('smoke', e.target.value)}>
                    <option value="">선택</option>
                    <option value="no">비흡연</option>
                    <option value="yes">흡연</option>
                  </select>
                </div>
              </div>

              <div className="formRow">
                <label className="formLabel" htmlFor="member-drink">
                  음주 여부
                </label>
                <div className="formFieldGrow">
                  <select id="member-drink" className="formSelect" value={draft.drink} onChange={(e) => patchField('drink', e.target.value)}>
                    <option value="">선택</option>
                    <option value="no">비음주</option>
                    <option value="yes">음주</option>
                  </select>
                </div>
              </div>

              <div className="formRow">
                <label className="formLabel" htmlFor="member-car">
                  차량 보유
                </label>
                <div className="formFieldGrow">
                  <input id="member-car" className="formInput" value={draft.car} onChange={(e) => patchField('car', e.target.value)} />
                </div>
              </div>

              <div className="formRow formRowStack">
                <label className="formLabel" htmlFor="member-appeal">
                  자기소개
                </label>
                <div className="formFieldGrow">
                  <textarea
                    id="member-appeal"
                    className="memberEditTextarea"
                    rows={6}
                    value={draft.appeal}
                    onChange={(e) => patchField('appeal', e.target.value)}
                    placeholder="나를 소개하는 문장을 입력해 주세요."
                  />
                </div>
              </div>

              <div className="formRow">
                <label className="formLabel" htmlFor="member-new-password">
                  새 비밀번호
                </label>
                <div className="formFieldGrow">
                  <input
                    id="member-new-password"
                    className="formInput"
                    type="password"
                    autoComplete="new-password"
                    placeholder="변경할 때만 입력"
                    value={draft.newPassword}
                    onChange={(e) => patchField('newPassword', e.target.value)}
                  />
                </div>
              </div>

              <div className="formRow">
                <label className="formLabel" htmlFor="member-new-password-confirm">
                  비밀번호 확인
                </label>
                <div className="formFieldGrow">
                  <input
                    id="member-new-password-confirm"
                    className="formInput"
                    type="password"
                    autoComplete="new-password"
                    placeholder="새 비밀번호를 다시 입력"
                    value={draft.newPasswordConfirm}
                    onChange={(e) => patchField('newPasswordConfirm', e.target.value)}
                  />
                  <p className="memberEditFieldHint">새 비밀번호를 변경할 때는 같은 값을 한 번 더 입력해 주세요.</p>
                </div>
              </div>

              <div className="formRow formRowStack">
                <label className="formLabel">회원 의무</label>
                <div className="formFieldGrow">
                  <label className="memberEditCheckboxRow">
                    <input
                      type="checkbox"
                      checked={draft.obligationAgreed}
                      disabled
                      readOnly
                    />
                    <span>회원의 의무 항목에 동의했습니다.</span>
                  </label>
                  <p className="memberEditFieldHint">회원 의무 동의 여부는 변경할 수 없습니다.</p>
                </div>
              </div>

              <div className="memberEditActions">
                <button type="submit" className="submitBtn" disabled={saving}>
                  {saving ? '저장 중…' : '저장하기'}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </main>
    </div>
  )
}
