export const siteNavItems = [
  { id: 'managers', href: '/managers', label: '매니저소개' },
  { id: 'reviews', href: '/reviews', label: '커플 후기' },
  { id: 'contact', href: '/inquiry', label: '1:1문의' },
  { id: 'notice', href: '/notices', label: '공지사항' },
] as const

export type SiteNavItem = (typeof siteNavItems)[number]
export type SiteNavId = SiteNavItem['id']
