export type InquiryStatus = 'new' | 'in_progress' | 'closed'

export type InquiryListItem = {
  id: number
  memberUserId?: string
  name: string
  email: string
  phone: string
  title: string
  status: InquiryStatus
  hasReply?: boolean
  createdAt: string
  updatedAt: string
}

export type PublicInquirySummary = {
  id: number
  title: string
  createdAt: string
  status: InquiryStatus
  hasReply: boolean
}

export type PublicInquiryDetail = {
  id: number
  title: string
  body: string
  createdAt: string
  status: InquiryStatus
  reply: string
  replyAt: string
}

export type AdminInquiry = InquiryListItem & {
  body: string
  adminMemo: string
  reply: string
  replyAt: string
}
