/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_ORIGIN?: string
  readonly VITE_NAVER_MAPS_CLIENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
