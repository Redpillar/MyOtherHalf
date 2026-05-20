export type CapturedBrowserLocation = {
  lat: number
  lng: number
  accuracyM: number | null
  updatedAt: string
}

export function getCurrentBrowserLocation(): Promise<CapturedBrowserLocation> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('이 브라우저에서는 위치 기능을 사용할 수 없습니다.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: Number(position.coords.latitude.toFixed(7)),
          lng: Number(position.coords.longitude.toFixed(7)),
          accuracyM: Number.isFinite(position.coords.accuracy)
            ? Number(position.coords.accuracy.toFixed(1))
            : null,
          updatedAt: new Date(position.timestamp || Date.now()).toISOString(),
        })
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new Error('위치 권한이 거부되었습니다. 브라우저 권한을 허용해 주세요.'))
          return
        }
        if (error.code === error.POSITION_UNAVAILABLE) {
          reject(new Error('현재 위치를 확인할 수 없습니다. 네트워크 또는 GPS 상태를 확인해 주세요.'))
          return
        }
        if (error.code === error.TIMEOUT) {
          reject(new Error('위치 확인 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.'))
          return
        }
        reject(new Error('위치 정보를 가져오지 못했습니다.'))
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      },
    )
  })
}
