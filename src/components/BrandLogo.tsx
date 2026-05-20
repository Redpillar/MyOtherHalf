type BrandLogoProps = {
  className?: string
}

/** 사이트 공통 로고 (`/public/brand-logo.png`) */
export function BrandLogo({ className = 'brandLogo' }: BrandLogoProps) {
  return <img className={className} src="/brand-logo.png" alt="내반쪽" width={54} height={41} decoding="async" />
}
