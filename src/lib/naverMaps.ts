type NaverMapsWindow = Window & {
  naver?: {
    maps?: any
  }
}

const NAVER_MAPS_SCRIPT_ID = 'demo-naver-maps-sdk'

let pendingLoad: Promise<any> | null = null

export function getNaverMapsClientId(): string {
  return String(import.meta.env.VITE_NAVER_MAPS_CLIENT_ID || '').trim()
}

export async function loadNaverMapsSdk(): Promise<any> {
  const clientId = getNaverMapsClientId()
  if (!clientId) {
    throw new Error('VITE_NAVER_MAPS_CLIENT_ID 환경변수가 필요합니다.')
  }
  const win = window as NaverMapsWindow
  if (win.naver?.maps) return win.naver.maps
  if (pendingLoad) return pendingLoad

  pendingLoad = new Promise((resolve, reject) => {
    const existing = document.getElementById(NAVER_MAPS_SCRIPT_ID) as HTMLScriptElement | null
    const finish = () => {
      const maps = (window as NaverMapsWindow).naver?.maps
      if (maps) resolve(maps)
      else reject(new Error('네이버지도 SDK를 불러왔지만 maps 객체를 찾지 못했습니다.'))
    }
    const fail = () => reject(new Error('네이버지도 SDK를 불러오지 못했습니다.'))

    if (existing) {
      existing.addEventListener('load', finish, { once: true })
      existing.addEventListener('error', fail, { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = NAVER_MAPS_SCRIPT_ID
    script.async = true
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${encodeURIComponent(clientId)}`
    script.addEventListener('load', finish, { once: true })
    script.addEventListener('error', fail, { once: true })
    document.head.appendChild(script)
  })

  try {
    return await pendingLoad
  } catch (error) {
    pendingLoad = null
    throw error
  }
}
