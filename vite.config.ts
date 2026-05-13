import { spawn, type ChildProcess } from 'node:child_process'
import type { ServerResponse } from 'node:http'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = dirname(fileURLToPath(import.meta.url))
const apiEntry = join(__dirname, 'server', 'index.mjs')

let apiChild: ChildProcess | null = null
let apiHealthTimer: ReturnType<typeof setInterval> | null = null

async function isApiHealthy(): Promise<boolean> {
  try {
    const ac = new AbortController()
    const t = setTimeout(() => ac.abort(), 1500)
    const r = await fetch('http://127.0.0.1:8787/api/health', { signal: ac.signal })
    clearTimeout(t)
    return r.ok
  } catch {
    return false
  }
}

/** Vite가 요청을 받기 전에 API가 응답할 때까지 대기 (관리자 로그인 등 `/api` 프록시 실패 방지) */
async function waitForApiReady(maxMs: number): Promise<boolean> {
  const deadline = Date.now() + maxMs
  while (Date.now() < deadline) {
    if (await isApiHealthy()) return true
    await new Promise((r) => setTimeout(r, 250))
  }
  return false
}

function stopApiServer() {
  if (!apiChild || apiChild.killed) return
  apiChild.kill('SIGTERM')
  apiChild = null
}

function startApiServer() {
  if (process.env.DEMO_API_SPAWN === '0') return
  stopApiServer()
  apiChild = spawn(process.execPath, [apiEntry], {
    cwd: __dirname,
    env: { ...process.env, API_PORT: process.env.API_PORT || '8787' },
    stdio: 'inherit',
    windowsHide: true,
  })
  apiChild.on('exit', (code, signal) => {
    apiChild = null
    if (signal === 'SIGTERM') return
    if (code !== 0 && code !== null) {
      console.error(`[demo] API process exited with code ${code}`)
    }
  })
}

function ensureApiHealthLoop() {
  if (apiHealthTimer) return
  apiHealthTimer = setInterval(() => {
    if (process.env.DEMO_API_SPAWN === '0') return
    void (async () => {
      if (await isApiHealthy()) return
      console.log('[demo] 로컬 API(8787)가 꺼져 있어 다시 띄웁니다.')
      startApiServer()
    })()
  }, 8000)
}

function clearApiHealthLoop() {
  if (apiHealthTimer) {
    clearInterval(apiHealthTimer)
    apiHealthTimer = null
  }
}

/**
 * `DEMO_API_SPAWN=0`(기본 `npm run dev`): API는 concurrently가 띄우므로 Vite는 스폰하지 않고 8787 준비만 대기.
 * `dev:vite-only`(순수 `vite`): Vite가 자식으로 API를 띄웁니다.
 */
function localApiPlugin() {
  return {
    name: 'demo-local-api',
    configureServer(server) {
      const onServerFileChange = (file: string) => {
        const norm = file.replace(/\\/g, '/')
        if (!norm.includes('/server/')) return
        console.log('[demo] server 파일 변경 → API 재시작')
        startApiServer()
      }

      const cleanupWithWatcher = () => {
        server.watcher.off('change', onServerFileChange)
        clearApiHealthLoop()
        stopApiServer()
      }

      const cleanupNoWatcher = () => {
        clearApiHealthLoop()
        stopApiServer()
      }

      if (process.env.DEMO_API_SPAWN === '0') {
        return (async () => {
          console.log(
            '[demo] DEMO_API_SPAWN=0 — API는 이 터미널과 함께 떠 있는 `node server/index.mjs`(예: npm run dev 의 api)를 사용합니다.',
          )
          const ok = await waitForApiReady(45000)
          if (ok) {
            console.log('[demo] API(8787) 준비됨 — /api 프록시 사용')
          } else {
            console.error(
              '[demo] 45초 내 127.0.0.1:8787/api/health 에 연결하지 못했습니다. `npm run dev` 한 줄로 web+api를 같이 켜 보세요.',
            )
          }
          return cleanupNoWatcher
        })()
      }

      server.watcher.on('change', onServerFileChange)

      return (async () => {
        if (await isApiHealthy()) {
          console.log('[demo] 127.0.0.1:8787 에 API가 이미 있어 Vite가 자식 프로세스로 API를 띄우지 않습니다.')
          ensureApiHealthLoop()
          return cleanupWithWatcher
        }

        startApiServer()
        ensureApiHealthLoop()

        const ok = await waitForApiReady(30000)
        if (ok) {
          console.log('[demo] 로컬 API 준비 완료 (/api/health)')
        } else {
          console.error(
            '[demo] API(8787)이 30초 안에 응답하지 않았습니다. server/index.mjs 오류·포트 충돌을 확인하세요. 관리자 비밀번호 기본값: admin123',
          )
        }
        return cleanupWithWatcher
      })()
    },
    configurePreviewServer(server) {
      const onServerFileChange = (file: string) => {
        const norm = file.replace(/\\/g, '/')
        if (!norm.includes('/server/')) return
        console.log('[demo] server 파일 변경 → API 재시작')
        startApiServer()
      }

      const cleanupWithWatcher = () => {
        server.watcher.off('change', onServerFileChange)
        clearApiHealthLoop()
        stopApiServer()
      }

      const cleanupNoWatcher = () => {
        clearApiHealthLoop()
        stopApiServer()
      }

      if (process.env.DEMO_API_SPAWN === '0') {
        return (async () => {
          const ok = await waitForApiReady(45000)
          if (!ok) {
            console.error('[demo] preview: 45초 내 API(8787)를 찾지 못했습니다.')
          }
          return cleanupNoWatcher
        })()
      }

      server.watcher.on('change', onServerFileChange)

      return (async () => {
        if (await isApiHealthy()) {
          ensureApiHealthLoop()
          return cleanupWithWatcher
        }
        startApiServer()
        ensureApiHealthLoop()
        await waitForApiReady(30000)
        return cleanupWithWatcher
      })()
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localApiPlugin()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
        configure(proxy) {
          proxy.on('error', (_err, _req, res) => {
            const out = res as ServerResponse | undefined
            if (!out || out.headersSent || out.writableEnded) return
            out.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' })
            out.end(
              JSON.stringify({
                error:
                  'API(127.0.0.1:8787)에 연결하지 못했습니다. 터미널에서 `npm run dev`로 web·api가 함께 떴는지, [demo] API(8787) 준비됨 로그가 있는지 확인하세요.',
              }),
            )
          })
        },
      },
    },
  },
  preview: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
        configure(proxy) {
          proxy.on('error', (_err, _req, res) => {
            const out = res as ServerResponse | undefined
            if (!out || out.headersSent || out.writableEnded) return
            out.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' })
            out.end(
              JSON.stringify({
                error:
                  'API(127.0.0.1:8787)에 연결하지 못했습니다. preview와 API 실행 여부를 확인하세요.',
              }),
            )
          })
        },
      },
    },
  },
})
