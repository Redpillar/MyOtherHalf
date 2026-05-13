export const siteNavItems = [
  { id: 'guide', href: '/#guide', label: '소개팅 이용안내' },
  { id: 'guarantee', href: '/#guarantee', label: '만남보장 이용안내' },
  { id: 'managers', href: '/managers', label: '매니저소개' },
  { id: 'contact', href: '/inquiry', label: '1:1문의' },
  { id: 'notice', href: '/#notice', label: '공지사항' },
  { id: 'reviews', href: '/#reviews', label: '커플 후기' },
] as const

export type SiteNavItem = (typeof siteNavItems)[number]
export type SiteNavId = SiteNavItem['id']
