export type AdminMember = {
  id: number
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
  createdAt: string
  photos?: string[]
  photoCount?: number
}
