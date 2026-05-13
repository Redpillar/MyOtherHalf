/**
 * 브라우저에서는 **같은 출처의 `/api`(Vite 프록시)** 만 사용합니다.
 * `localhost:5173` → `localhost:8787` 같은 **교차 출처 직접 호출은 하지 않습니다**
 * (브라우저·보안 정책 때문에 `Failed to fetch`가 나기 쉽습니다).
 *
 * 배포 시에도 상대 경로 `/api`가 일반적입니다.
 * 예외적으로 직접 API 호스트를 쓰려면 `.env.local`에 `VITE_API_ORIGIN=http://127.0.0.1:8787` 처럼 설정하세요.
 */

function normalizePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`
}

/** 브라우저 기본 메시지(Failed to fetch 등)를 한글 안내로 바꿉니다. */
function wrapFetchFailure(path: string, attemptedUrls: readonly string[], err: unknown): Error {
  const inner = err instanceof Error ? err.message : String(err)
  const lower = inner.toLowerCase()
  const looksLikeNetwork =
    inner === 'Failed to fetch' ||
    inner === 'NetworkError when attempting to fetch resource.' ||
    lower.includes('failed to fetch') ||
    lower.includes('networkerror when attempting to fetch') ||
    lower.includes('load failed') ||
    (err instanceof TypeError && lower.includes('fetch'))

  if (!looksLikeNetwork) {
    return err instanceof Error ? err : new Error(inner || '요청에 실패했습니다.')
  }

  const uniq = [...new Set(attemptedUrls)]
  const tried =
    uniq.length > 0
      ? ` 시도한 주소(중복 제거): ${uniq.join(' → ')}`
      : ''
  const devHint = import.meta.env.DEV
    ? ` 로컬: \`npm run dev\` 한 줄이면 프론트(web)와 API(api)가 동시에 뜹니다. 터미널에 [demo] API(8787) 준비됨 이 나온 뒤 다시 시도하세요. \`npm run dev:vite-only\`(Vite만)을 쓰는 경우에는 다른 터미널에서 \`npm run dev:api\`를 켜 두세요. 확인: curl -sS http://127.0.0.1:8787/api/health`
    : ''
  return new Error(`「${path}」서버에 연결되지 않았습니다.${tried}${devHint} (원인: ${inner})`)
}

function envApiOrigin(): string {
  const v = import.meta.env.VITE_API_ORIGIN
  return typeof v === 'string' ? v.trim().replace(/\/$/, '') : ''
}

function cloneFormData(fd: FormData): FormData {
  const next = new FormData()
  fd.forEach((value, key) => {
    if (value instanceof Blob) {
      const name = value instanceof File ? value.name : undefined
      next.append(key, value, name)
    } else {
      next.append(key, value as string)
    }
  })
  return next
}

function requestInitForAttempt(init: RequestInit | undefined, attemptIndex: number): RequestInit | undefined {
  if (!init) return init
  if (init.body instanceof FormData && attemptIndex > 0) {
    return { ...init, body: cloneFormData(init.body) }
  }
  return init
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const p = normalizePath(path)
  const fixed = envApiOrigin()

  const urls: string[] = []
  if (fixed) urls.push(`${fixed}${p}`)
  else urls.push(p)

  const maxRounds = import.meta.env.DEV && !fixed ? 6 : 1
  const attempted: string[] = []
  let lastErr: unknown
  let attemptKey = 0

  for (let round = 0; round < maxRounds; round++) {
    if (round > 0) await new Promise((r) => setTimeout(r, 400))

    for (const url of urls) {
      attempted.push(url)
      const attemptInit = requestInitForAttempt(init, attemptKey++)
      try {
        const res = await fetch(url, attemptInit)
        if (
          import.meta.env.DEV &&
          !fixed &&
          (res.status === 502 || res.status === 504) &&
          round < maxRounds - 1
        ) {
          await res.arrayBuffer().catch(() => {})
          break
        }
        return res
      } catch (e) {
        lastErr = e
      }
    }
  }

  throw wrapFetchFailure(p, attempted, lastErr)
}

/**
 * `Response.json()` 대신 본문을 텍스트로 읽어 파싱합니다.
 * Vite 프록시 502·API 재시작 등으로 본문이 비어 있을 때 `Unexpected end of JSON input`을 피하고 안내 메시지를 줍니다.
 */
export async function readJsonResponse<T = unknown>(r: Response): Promise<T> {
  const text = await r.text()
  const trimmed = text.trim()
  if (!trimmed) {
    const proxyHint =
      r.status === 502 || r.status === 504
        ? ' (로컬 API 8787이 꺼져 있거나 프록시에 연결되지 않았을 수 있습니다.)'
        : ''
    throw new Error(`서버 응답이 비어 있습니다. (HTTP ${r.status})${proxyHint}`)
  }
  try {
    return JSON.parse(trimmed) as T
  } catch {
    throw new Error(
      '서버에서 JSON이 아닌 응답을 받았습니다. API 주소와 서버 실행 여부를 확인해 주세요.',
    )
  }
}
