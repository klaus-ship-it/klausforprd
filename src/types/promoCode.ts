import { PaginationParams } from './index'

export interface PromoCode {
  id: string
  code: string
  name: string
  hasExpiry: boolean
  hasMaxRedemptions: boolean
  rewardType: 'GOLD' | 'SILVER' | 'BRONZE' | 'ACTIVITY_BONUS'
  rewardAmount: number
  startTime?: string
  endTime?: string
  maxRedemptions?: number
  usedRedemptions: number
  /** 活動金(銀幣)專用：流水門檻倍數，選填 */
  turnoverMultiplier?: number
  /** 活動金(銀幣)專用：轉換上限數值，選填 */
  conversionLimit?: number
  status: 'ACTIVE' | 'INACTIVE'
  createdAt: string
  createdBy: string
}

export interface PromoCodeQueryParams extends PaginationParams {
  code?: string
  name?: string
  hasExpiry?: boolean | ''
  hasMaxRedemptions?: boolean | ''
  status?: 'ACTIVE' | 'INACTIVE' | ''
}

export interface CreatePromoCodeData {
  code: string
  name: string
  hasExpiry: boolean
  hasMaxRedemptions: boolean
  rewardType: 'GOLD' | 'SILVER' | 'BRONZE' | 'ACTIVITY_BONUS'
  rewardAmount: number
  startTime?: string
  endTime?: string
  maxRedemptions?: number
  turnoverMultiplier?: number
  conversionLimit?: number
  status: 'ACTIVE' | 'INACTIVE'
}

export interface UpdatePromoCodeData {
  name?: string
  hasExpiry?: boolean
  hasMaxRedemptions?: boolean
  rewardType?: 'GOLD' | 'SILVER' | 'BRONZE' | 'ACTIVITY_BONUS'
  rewardAmount?: number
  startTime?: string
  endTime?: string
  maxRedemptions?: number
  turnoverMultiplier?: number
  conversionLimit?: number
  status?: 'ACTIVE' | 'INACTIVE'
}
