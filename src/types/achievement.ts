export type AchievementCategory = 'DEPOSIT' | 'TURNOVER' | 'SAVINGS'
export type AchievementRewardCurrency = 'SILVER' | 'BRONZE'

export interface PlayerAchievement {
  id: string
  name: string
  badge_url: string
  category: AchievementCategory
  target_amount: number
  reward_currency: AchievementRewardCurrency
  reward_amount: number
  turnover_multiplier?: number
  conversion_cap?: number
  is_active: boolean
  created_at: string
}

export type AchievementInput = Omit<PlayerAchievement, 'id' | 'created_at'>
