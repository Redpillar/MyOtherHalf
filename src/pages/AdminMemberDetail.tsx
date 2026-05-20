import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { SiteHeader } from '../components/SiteHeader'
import {
  findSigunguName,
  findSidoName,
  getSigunguForSido,
  KOREA_SIDO,
  normalizeSidoCode,
} from '../data/koreaRegions'
import { EDUCATION_OPTIONS, isKnownEducation } from '../data/educationLevels'
import { apiFetch } from '../lib/apiFetch'
import type { AdminMember, ConsultationStatus } from '../admin/memberTypes'
import { adminConsultationStatusLabel, ADMIN_CONSULTATION_STATUS_OPTIONS } from '../consult/consultTypes'
import { clearAdminToken, getAdminToken, useAdminToken } from '../admin/adminSession'
import { AdminMenu } from '../components/AdminMenu'
import './signup.scss'
import './admin.scss'

function genderLabel(v: string) {
  if (v === 'male') return '남'
  if (v === 'female') return '여'
  return v || '—'
}

function ynSmoke(v: string) {
  if (v === 'yes') return '흡연'
  if (v === 'no') return '비흡연'
  return v || '—'
}

function ynDrink(v: string) {
  if (v === 'yes') return '음주'
  if (v === 'no') return '비음주'
  return v || '—'
}

function locationStatusText(member: AdminMember) {
  if (!member.hasLocation || member.locationLat == null || member.locationLng == null) {
    return '저장된 위치 없음'
  }
  const accuracyText =
    member.locationAccuracyM != null ? `정확도 약 ${member.locationAccuracyM}m` : '정확도 정보 없음'
  const timeText = member.locationUpdatedAt ? new Date(member.locationUpdatedAt).toLocaleString('ko-KR') : '시간 정보 없음'
  return `${member.locationLat}, ${member.locationLng} · ${accuracyText} · ${timeText}`
}

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
  consultationStatus: ConsultationStatus
  newPassword: string
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
    region1: normalizeSidoCode(m.region1),
    region2: m.region2,
    education: m.education ?? '',
    mbti: m.mbti ?? '',
    smoke: m.smoke,
    drink: m.drink,
    car: m.car ?? '',
    appeal: m.appeal ?? '',
    obligationAgreed: m.obligationAgreed,
    consultationStatus: m.consultationStatus ?? 'none',
    newPassword: '',
  }
}

function AdminMemberPhoto({ memberId, index, photoKey }: { memberId: number; index: number; photoKey: string }) {
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false
    const ac = new AbortController()
    void (async () => {
      const t = getAdminToken()
      if (!t) {
        if (!cancelled) setFailed(true)
        return
      }
      try {
        const r = await apiFetch(
          `/api/admin/members/${encodeURIComponent(String(memberId))}/photo/${index}`,
          {
            headers: { Authorization: `Bearer ${t}` },
            signal: ac.signal,
          },
        )
        if (cancelled) return
        if (!r.ok) {
          setFailed(true)
          return
        }
        const blob = await r.blob()
        if (cancelled) return
        const u = URL.createObjectURL(blob)
        if (cancelled) {
          URL.revokeObjectURL(u)
          return
        }
        objectUrl = u
        setSrc(u)
      } catch {
        if (!cancelled) setFailed(true)
      }
    })()
    return () => {
      cancelled = true
      ac.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [memberId, index, photoKey])

  if (failed) {
    return <div className="adminPhotoTile adminPhotoTileError" role="img" aria-label="사진을 불러오지 못했습니다." />
  }
  if (!src) {
    return <div className="adminPhotoTile adminPhotoTileLoading" aria-hidden />
  }
  return <img className="adminPhotoTileImg" src={src} alt={`제출 사진 ${index + 1}`} />
}

export function AdminMemberDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const token = useAdminToken()
  const [member, setMember] = useState<AdminMember | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<MemberEditDraft | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [photoDeletingIdx, setPhotoDeletingIdx] = useState<number | null>(null)
  const [adminUserIdDupHint, setAdminUserIdDupHint] = useState<string | null>(null)
  const [adminUserIdDupKind, setAdminUserIdDupKind] = useState<'ok' | 'err' | null>(null)
  const [adminUserIdDupBusy, setAdminUserIdDupBusy] = useState(false)

  const load = useCallback(async () => {
    const t = getAdminToken()
    if (!t) {
      setError('로그인이 필요합니다.')
      setLoading(false)
      setMember(null)
      return
    }
    if (!id) {
      setError('잘못된 경로입니다.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const r = await apiFetch(`/api/admin/members/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${t}` },
      })
      const ct = r.headers.get('content-type') || ''
      const raw = await r.text()
      let j: { member?: AdminMember; error?: string } = {}
      if (ct.includes('application/json')) {
        try {
          j = JSON.parse(raw) as { member?: AdminMember; error?: string }
        } catch {
          throw new Error('서버 응답(JSON)을 해석할 수 없습니다.')
        }
      } else if (!r.ok) {
        throw new Error(raw.slice(0, 120) || `HTTP ${r.status}`)
      }

      if (r.status === 401) {
        clearAdminToken()
        setError('세션이 만료되었습니다. 관리자에서 다시 로그인해 주세요.')
        setMember(null)
        return
      }
      if (r.status === 404) {
        setError(j.error || '회원을 찾을 수 없습니다.')
        setMember(null)
        return
      }
      if (!r.ok) throw new Error(j.error || `불러오지 못했습니다. (${r.status})`)
      if (!j.member) throw new Error('데이터가 없습니다.')
      setMember(j.member)
      setEditing(false)
      setDraft(null)
      setSaveError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'API 연결을 확인하세요.')
      setMember(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
  }, [load])

  const beginEdit = () => {
    if (!member) return
    setDraft(memberToDraft(member))
    setSaveError(null)
    setAdminUserIdDupHint(null)
    setAdminUserIdDupKind(null)
    setEditing(true)
  }

  const cancelEdit = () => {
    setEditing(false)
    setDraft(null)
    setSaveError(null)
    setAdminUserIdDupHint(null)
    setAdminUserIdDupKind(null)
  }

  const patchField = <K extends keyof MemberEditDraft>(key: K, value: MemberEditDraft[K]) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d))
    if (key === 'userId') {
      setAdminUserIdDupHint(null)
      setAdminUserIdDupKind(null)
    }
  }

  const onAdminUserIdDupCheck = async () => {
    if (!draft || !member) return
    const userId = draft.userId.trim()
    if (!userId) {
      setAdminUserIdDupKind('err')
      setAdminUserIdDupHint('아이디를 입력한 뒤 중복 확인을 눌러 주세요.')
      return
    }
    if (userId === member.userId) {
      setAdminUserIdDupKind('ok')
      setAdminUserIdDupHint('현재 회원이 사용 중인 아이디입니다.')
      return
    }
    setAdminUserIdDupBusy(true)
    setAdminUserIdDupHint(null)
    setAdminUserIdDupKind(null)
    try {
      const r = await apiFetch(`/api/members/check-userid?userId=${encodeURIComponent(userId)}`)
      const raw = await r.text()
      let j = {} as { available?: boolean; error?: string }
      try {
        j = JSON.parse(raw) as { available?: boolean; error?: string }
      } catch {
        setAdminUserIdDupKind('err')
        setAdminUserIdDupHint('서버 응답을 해석할 수 없습니다.')
        return
      }
      if (!r.ok) {
        setAdminUserIdDupKind('err')
        setAdminUserIdDupHint(j.error || '확인에 실패했습니다.')
        return
      }
      if (j.available) {
        setAdminUserIdDupKind('ok')
        setAdminUserIdDupHint('사용 가능한 아이디입니다.')
      } else {
        setAdminUserIdDupKind('err')
        setAdminUserIdDupHint('이미 사용 중인 아이디입니다.')
      }
    } catch (e) {
      setAdminUserIdDupKind('err')
      setAdminUserIdDupHint(
        e instanceof TypeError &&
          (/failed to fetch/i.test(String(e.message)) || /load failed/i.test(String(e.message)))
          ? '서버에 연결할 수 없습니다.'
          : e instanceof Error
            ? e.message
            : '확인 중 오류가 발생했습니다.',
      )
    } finally {
      setAdminUserIdDupBusy(false)
    }
  }

  const adminSidoOptions = useMemo(() => {
    if (!draft?.region1) return KOREA_SIDO
    const c = normalizeSidoCode(draft.region1)
    if (KOREA_SIDO.some((s) => s.code === c)) return KOREA_SIDO
    return [{ code: draft.region1, name: `${draft.region1} (저장된 코드)` }, ...KOREA_SIDO]
  }, [draft?.region1])

  const adminSigunguOptions = useMemo(() => {
    if (!draft) return []
    const sido = normalizeSidoCode(draft.region1)
    const base = getSigunguForSido(sido)
    if (!draft.region2) return base
    if (base.some((x) => x.code === draft.region2)) return base
    return [{ code: draft.region2, name: `${draft.region2} (저장된 코드)` }, ...base]
  }, [draft])

  const saveEdit = async () => {
    if (!id || !draft || !token) return
    setSaving(true)
    setSaveError(null)
    try {
      const body: Record<string, unknown> = {
        userId: draft.userId,
        name: draft.name,
        phone: draft.phone,
        birth: draft.birth,
        gender: draft.gender,
        height: draft.height,
        weight: draft.weight,
        job: draft.job,
        region1: draft.region1,
        region2: draft.region2,
        education: draft.education,
        mbti: draft.mbti,
        smoke: draft.smoke,
        drink: draft.drink,
        car: draft.car,
        appeal: draft.appeal,
        obligationAgreed: draft.obligationAgreed,
        consultationStatus: draft.consultationStatus,
      }
      if (draft.newPassword.trim()) {
        body.newPassword = draft.newPassword.trim()
      }
      const r = await apiFetch(`/api/admin/members/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
      const raw = await r.text()
      let j: { member?: AdminMember; error?: string } = {}
      try {
        j = JSON.parse(raw) as { member?: AdminMember; error?: string }
      } catch {
        throw new Error(r.ok ? '서버 응답을 해석할 수 없습니다.' : `저장 실패 (HTTP ${r.status})`)
      }
      if (r.status === 401) {
        clearAdminToken()
        setSaveError('세션이 만료되었습니다. 다시 로그인해 주세요.')
        return
      }
      if (!r.ok) {
        setSaveError(j.error || `저장하지 못했습니다. (${r.status})`)
        return
      }
      if (!j.member) {
        setSaveError('응답에 회원 정보가 없습니다.')
        return
      }
      setMember(j.member)
      setEditing(false)
      setDraft(null)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : '저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const deletePhoto = async (photoIndex: number) => {
    if (!id || !token || !member) return
    if (!window.confirm('이 사진을 삭제할까요?')) return
    setPhotoDeletingIdx(photoIndex)
    setSaveError(null)
    try {
      const r = await apiFetch(`/api/admin/members/${encodeURIComponent(id)}/photo/${photoIndex}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const ct = r.headers.get('content-type') || ''
      const raw = await r.text()
      let j: { member?: AdminMember; error?: string } = {}
      if (ct.includes('application/json') && raw.trim()) {
        j = JSON.parse(raw) as { member?: AdminMember; error?: string }
      }
      if (r.status === 401) {
        clearAdminToken()
        setSaveError('세션이 만료되었습니다. 다시 로그인해 주세요.')
        return
      }
      if (!r.ok) {
        setSaveError(j.error || `사진을 삭제하지 못했습니다. (${r.status})`)
        return
      }
      if (!j.member) {
        setSaveError('응답에 회원 정보가 없습니다.')
        return
      }
      setMember(j.member)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : '사진 삭제 중 오류가 발생했습니다.')
    } finally {
      setPhotoDeletingIdx(null)
    }
  }

  return (
    <div className="adminPage">
      <SiteHeader />

      <main className="adminMain">
        <div className="container adminInner">
          <AdminMenu />

          <div className="adminDetailHead">
            <button type="button" className="adminDetailBackBtn" onClick={() => navigate('/admin')}>
              ← 회원 목록
            </button>
            <div className="adminDetailHeadRow">
              <div className="adminDetailHeadMain">
                <h1 className="adminTitle">회원 상세</h1>
                {id ? <p className="adminDetailSub">회원 ID · {id}</p> : null}
              </div>
              {token && member && !loading && !error ? (
                <div className="adminDetailActions">
                  {!editing ? (
                    <button type="button" className="btn btnPrimary" onClick={beginEdit}>
                      정보 수정
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="btn btnPrimary"
                        disabled={saving}
                        onClick={() => void saveEdit()}
                      >
                        {saving ? '저장 중…' : '저장'}
                      </button>
                      <button type="button" className="btn btnGhost" disabled={saving} onClick={cancelEdit}>
                        취소
                      </button>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          {!token ? (
            <p className="adminError">
              관리자 로그인이 필요합니다.{' '}
              <Link to="/admin">관리자 페이지로</Link>
            </p>
          ) : loading ? (
            <p className="adminLoading">불러오는 중…</p>
          ) : error ? (
            <div className="adminDetailErrorBox">
              <p className="adminError">{error}</p>
              <button type="button" className="btnGhost adminDetailRetry" onClick={() => void load()}>
                다시 시도
              </button>
              <button type="button" className="linkBtn" onClick={() => navigate('/admin')}>
                회원 목록으로
              </button>
            </div>
          ) : member ? (
            <div className="adminDetailCard">
              <section className="adminConsultPanel" aria-labelledby="admin-consult-title">
                <div className="adminConsultPanelHead">
                  <h2 id="admin-consult-title" className="adminConsultPanelTitle">
                    마이페이지 · 상담 상태
                  </h2>
                  {!editing ? (
                    <p className="adminConsultPanelHint">정보 수정에서 상태를 변경할 수 있습니다.</p>
                  ) : null}
                </div>
                {editing && draft ? (
                  <div className="adminConsultPanelBody">
                    <select
                      className="adminDetailSelect adminConsultSelect"
                      value={draft.consultationStatus}
                      onChange={(e) => patchField('consultationStatus', e.target.value as ConsultationStatus)}
                    >
                      {ADMIN_CONSULTATION_STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {member.consultationRequestedAt ? (
                      <p className="adminDetailMuted adminConsultPanelMeta">
                        신청일 {new Date(member.consultationRequestedAt).toLocaleString('ko-KR')}
                      </p>
                    ) : (
                      <p className="adminDetailMuted adminConsultPanelMeta">
                        미신청 상태에서 다른 단계로 변경하면 신청일이 자동 기록됩니다.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="adminConsultPanelBody">
                    <span className="adminConsultStatusPill">
                      {adminConsultationStatusLabel(member.consultationStatus)}
                    </span>
                    {member.consultationRequestedAt ? (
                      <p className="adminDetailMuted adminConsultPanelMeta">
                        신청일 {new Date(member.consultationRequestedAt).toLocaleString('ko-KR')}
                      </p>
                    ) : null}
                  </div>
                )}
              </section>

              {editing && draft ? (
                <>
                  {saveError ? <p className="adminDetailSaveHint adminError">{saveError}</p> : null}
                  {!saveError ? (
                    <p className="adminDetailSaveHint">
                      변경 후 저장을 누르면 반영됩니다. 비밀번호는 비워 두면 그대로 유지됩니다.
                      <br />
                      <span className="req">*</span> 표시는 필수 항목입니다.
                    </p>
                  ) : null}
                  <div className="adminDetailDl" role="list">
                    <div className="adminDetailRow">
                      <div className="adminDetailDt">내부 ID</div>
                      <div className="adminDetailDd">{member.id}</div>
                    </div>
                    <div className="adminDetailRow">
                      <div className="adminDetailDt">
                        <span className="req">*</span> 아이디
                      </div>
                      <div className="adminDetailDd">
                        <div className="adminUserIdEditCol">
                          <div className="adminUserIdEditRow">
                            <input
                              className="adminDetailInput adminUserIdInput"
                              value={draft.userId}
                              onChange={(e) => patchField('userId', e.target.value)}
                              autoComplete="username"
                            />
                            <button
                              type="button"
                              className="dupCheckBtn"
                              disabled={adminUserIdDupBusy}
                              onClick={() => void onAdminUserIdDupCheck()}
                            >
                              {adminUserIdDupBusy ? '확인 중…' : '아이디 중복 확인'}
                            </button>
                          </div>
                          {adminUserIdDupHint ? (
                            <p
                              className={
                                adminUserIdDupKind === 'ok'
                                  ? 'signupDupCheckHint signupDupCheckHintOk'
                                  : 'signupDupCheckHint signupDupCheckHintErr'
                              }
                              role="status"
                              aria-live="polite"
                            >
                              {adminUserIdDupHint}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="adminDetailRow">
                      <div className="adminDetailDt">
                        <span className="req">*</span> 이름
                      </div>
                      <div className="adminDetailDd">
                        <input
                          className="adminDetailInput"
                          value={draft.name}
                          onChange={(e) => patchField('name', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="adminDetailRow">
                      <div className="adminDetailDt">
                        <span className="req">*</span> 연락처
                      </div>
                      <div className="adminDetailDd">
                        <input
                          className="adminDetailInput"
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel"
                          placeholder="숫자만 입력"
                          value={draft.phone}
                          onChange={(e) => patchField('phone', e.target.value.replace(/\D/g, ''))}
                        />
                      </div>
                    </div>
                    <div className="adminDetailRow">
                      <div className="adminDetailDt">
                        <span className="req">*</span> 생년월일
                      </div>
                      <div className="adminDetailDd">
                        <input
                          className="adminDetailInput"
                          type="date"
                          value={draft.birth}
                          onChange={(e) => patchField('birth', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="adminDetailRow">
                      <div className="adminDetailDt">
                        <span className="req">*</span> 성별
                      </div>
                      <div className="adminDetailDd">
                        <select
                          className="adminDetailSelect"
                          value={draft.gender}
                          onChange={(e) => patchField('gender', e.target.value)}
                        >
                          <option value="male">남</option>
                          <option value="female">여</option>
                        </select>
                      </div>
                    </div>
                    <div className="adminDetailRow">
                      <div className="adminDetailDt">
                        <span className="req">*</span> 키 (cm)
                      </div>
                      <div className="adminDetailDd">
                        <input
                          className="adminDetailInput"
                          inputMode="decimal"
                          value={draft.height}
                          onChange={(e) => patchField('height', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="adminDetailRow">
                      <div className="adminDetailDt">
                        <span className="req">*</span> 몸무게 (kg)
                      </div>
                      <div className="adminDetailDd">
                        <input
                          className="adminDetailInput"
                          inputMode="decimal"
                          value={draft.weight}
                          onChange={(e) => patchField('weight', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="adminDetailRow">
                      <div className="adminDetailDt">
                        <span className="req">*</span> 직업
                      </div>
                      <div className="adminDetailDd">
                        <input
                          className="adminDetailInput"
                          value={draft.job}
                          onChange={(e) => patchField('job', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="adminDetailRow">
                      <div className="adminDetailDt">
                        <span className="req">*</span> 지역 (시·도)
                      </div>
                      <div className="adminDetailDd">
                        <select
                          className="adminDetailSelect"
                          value={draft.region1}
                          onChange={(e) => {
                            const v = e.target.value
                            setDraft((d) => (d ? { ...d, region1: v, region2: '' } : d))
                          }}
                        >
                          <option value="" disabled>
                            시·도 선택
                          </option>
                          {adminSidoOptions.map((s) => (
                            <option key={s.code} value={s.code}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="adminDetailRow">
                      <div className="adminDetailDt">
                        <span className="req">*</span> 시·군·구
                      </div>
                      <div className="adminDetailDd">
                        <select
                          className="adminDetailSelect"
                          value={draft.region2}
                          disabled={!draft.region1}
                          onChange={(e) => patchField('region2', e.target.value)}
                        >
                          <option value="" disabled>
                            {draft.region1 ? '시·군·구 선택' : '시·도를 먼저 선택하세요'}
                          </option>
                          {adminSigunguOptions.map((g) => (
                            <option key={g.code} value={g.code}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="adminDetailRow">
                      <div className="adminDetailDt">저장된 위치</div>
                      <div className="adminDetailDd">{locationStatusText(member)}</div>
                    </div>
                    <div className="adminDetailRow">
                      <div className="adminDetailDt">
                        최종학력 <span className="fieldOptional">(선택)</span>
                      </div>
                      <div className="adminDetailDd">
                        <select
                          className="adminDetailSelect"
                          value={draft.education}
                          onChange={(e) => patchField('education', e.target.value)}
                        >
                          <option value="">선택 안 함</option>
                          {!isKnownEducation(draft.education) && draft.education ? (
                            <option value={draft.education}>{draft.education} (기존)</option>
                          ) : null}
                          {EDUCATION_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="adminDetailRow">
                      <div className="adminDetailDt">
                        MBTI <span className="fieldOptional">(선택)</span>
                      </div>
                      <div className="adminDetailDd">
                        <input
                          className="adminDetailInput"
                          value={draft.mbti}
                          onChange={(e) => patchField('mbti', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="adminDetailRow">
                      <div className="adminDetailDt">
                        흡연 <span className="fieldOptional">(선택)</span>
                      </div>
                      <div className="adminDetailDd">
                        <select
                          className="adminDetailSelect"
                          value={draft.smoke}
                          onChange={(e) => patchField('smoke', e.target.value)}
                        >
                          <option value="yes">흡연</option>
                          <option value="no">비흡연</option>
                        </select>
                      </div>
                    </div>
                    <div className="adminDetailRow">
                      <div className="adminDetailDt">
                        음주 <span className="fieldOptional">(선택)</span>
                      </div>
                      <div className="adminDetailDd">
                        <select
                          className="adminDetailSelect"
                          value={draft.drink}
                          onChange={(e) => patchField('drink', e.target.value)}
                        >
                          <option value="yes">음주</option>
                          <option value="no">비음주</option>
                        </select>
                      </div>
                    </div>
                    <div className="adminDetailRow">
                      <div className="adminDetailDt">
                        차종 <span className="fieldOptional">(선택)</span>
                      </div>
                      <div className="adminDetailDd">
                        <input
                          className="adminDetailInput"
                          value={draft.car}
                          onChange={(e) => patchField('car', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="adminDetailRow adminDetailRowBlock">
                      <div className="adminDetailDt">
                        이성에게 어필 <span className="fieldOptional">(선택)</span>
                      </div>
                      <div className="adminDetailDd">
                        <textarea
                          className="adminDetailTextarea"
                          value={draft.appeal}
                          onChange={(e) => patchField('appeal', e.target.value)}
                          rows={4}
                        />
                      </div>
                    </div>
                    <div className="adminDetailRow">
                      <div className="adminDetailDt">
                        <span className="req">*</span> 회원의 의무 동의
                      </div>
                      <div className="adminDetailDd">
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'default' }}>
                          <input
                            type="checkbox"
                            checked={draft.obligationAgreed}
                            disabled
                            readOnly
                          />
                          <span>동의함</span>
                        </label>
                      </div>
                    </div>
                    <div className="adminDetailRow">
                      <div className="adminDetailDt">
                        새 비밀번호 <span className="fieldOptional">(선택)</span>
                      </div>
                      <div className="adminDetailDd">
                        <input
                          className="adminDetailInput"
                          type="password"
                          autoComplete="new-password"
                          placeholder="변경하지 않으려면 비워 두세요 (8자 이상)"
                          value={draft.newPassword}
                          onChange={(e) => patchField('newPassword', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="adminDetailRow adminDetailRowBlock adminDetailPhotoBlock">
                      <div className="adminDetailDt">제출 사진</div>
                      <div className="adminDetailDd adminDetailPhotoDd">
                        {(member.photos?.length ?? 0) > 0 ? (
                          <div className="adminDetailPhotosGrid">
                            {(member.photos ?? []).map((photoName, i) => (
                              <div key={`${photoName}-${i}`} className="adminPhotoCard">
                                <AdminMemberPhoto memberId={member.id} index={i} photoKey={photoName} />
                                <button
                                  type="button"
                                  className="linkBtn adminPhotoDeleteBtn"
                                  disabled={photoDeletingIdx === i}
                                  onClick={() => void deletePhoto(i)}
                                >
                                  {photoDeletingIdx === i ? '삭제 중…' : '사진 삭제'}
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="adminDetailMuted">저장된 사진이 없습니다.</span>
                        )}
                      </div>
                    </div>
                    <div className="adminDetailRow">
                      <div className="adminDetailDt">가입일시</div>
                      <div className="adminDetailDd">{new Date(member.createdAt).toLocaleString('ko-KR')}</div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="adminDetailDl" role="list">
                  <div className="adminDetailRow">
                    <div className="adminDetailDt">내부 ID</div>
                    <div className="adminDetailDd">{member.id}</div>
                  </div>
                  <div className="adminDetailRow">
                    <div className="adminDetailDt">아이디</div>
                    <div className="adminDetailDd">{member.userId}</div>
                  </div>
                  <div className="adminDetailRow">
                    <div className="adminDetailDt">이름</div>
                    <div className="adminDetailDd">{member.name}</div>
                  </div>
                  <div className="adminDetailRow">
                    <div className="adminDetailDt">연락처</div>
                    <div className="adminDetailDd">{member.phone}</div>
                  </div>
                  <div className="adminDetailRow">
                    <div className="adminDetailDt">생년월일</div>
                    <div className="adminDetailDd">{member.birth}</div>
                  </div>
                  <div className="adminDetailRow">
                    <div className="adminDetailDt">성별</div>
                    <div className="adminDetailDd">{genderLabel(member.gender)}</div>
                  </div>
                  <div className="adminDetailRow">
                    <div className="adminDetailDt">키 / 몸무게</div>
                    <div className="adminDetailDd">
                      {member.height} cm · {member.weight} kg
                    </div>
                  </div>
                  <div className="adminDetailRow">
                    <div className="adminDetailDt">직업</div>
                    <div className="adminDetailDd">{member.job}</div>
                  </div>
                    <div className="adminDetailRow">
                      <div className="adminDetailDt">지역</div>
                      <div className="adminDetailDd">
                        {findSidoName(member.region1)} · {findSigunguName(member.region1, member.region2)}
                      </div>
                    </div>
                  <div className="adminDetailRow">
                    <div className="adminDetailDt">저장된 위치</div>
                    <div className="adminDetailDd">{locationStatusText(member)}</div>
                  </div>
                  <div className="adminDetailRow">
                    <div className="adminDetailDt">최종학력</div>
                    <div className="adminDetailDd">{member.education || '—'}</div>
                  </div>
                  <div className="adminDetailRow">
                    <div className="adminDetailDt">MBTI</div>
                    <div className="adminDetailDd">{member.mbti || '—'}</div>
                  </div>
                  <div className="adminDetailRow">
                    <div className="adminDetailDt">흡연 / 음주</div>
                    <div className="adminDetailDd">
                      {ynSmoke(member.smoke)} · {ynDrink(member.drink)}
                    </div>
                  </div>
                  <div className="adminDetailRow">
                    <div className="adminDetailDt">차종</div>
                    <div className="adminDetailDd">{member.car || '—'}</div>
                  </div>
                  <div className="adminDetailRow adminDetailRowBlock">
                    <div className="adminDetailDt">이성에게 어필</div>
                    <div className="adminDetailDd">{member.appeal || '—'}</div>
                  </div>
                  <div className="adminDetailRow adminDetailRowBlock adminDetailPhotoBlock">
                    <div className="adminDetailDt">제출 사진</div>
                    <div className="adminDetailDd adminDetailPhotoDd">
                      {(member.photos?.length ?? 0) > 0 ? (
                        <div className="adminDetailPhotosGrid">
                          {(member.photos ?? []).map((photoName, i) => (
                            <AdminMemberPhoto key={`${photoName}-${i}`} memberId={member.id} index={i} photoKey={photoName} />
                          ))}
                        </div>
                      ) : (
                        <span className="adminDetailMuted">저장된 사진이 없습니다.</span>
                      )}
                    </div>
                  </div>
                  <div className="adminDetailRow">
                    <div className="adminDetailDt">회원의 의무 동의</div>
                    <div className="adminDetailDd">{member.obligationAgreed ? '동의' : '미동의'}</div>
                  </div>
                  <div className="adminDetailRow">
                    <div className="adminDetailDt">가입일시</div>
                    <div className="adminDetailDd">{new Date(member.createdAt).toLocaleString('ko-KR')}</div>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          <p className="adminBack">
            <Link to="/admin/dashboard">← 관리자 홈</Link>
            {' > '}
            <Link to="/admin">회원 목록</Link>
            {' > '}
            <span>회원 상세</span>
          </p>
        </div>
      </main>
    </div>
  )
}
