import type { AchievementInput, PlayerAchievement } from '@/types/achievement'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const achievements: PlayerAchievement[] = [
  { id: 'ACH-001', name: '儲值達人', badge_url: '', category: 'DEPOSIT', target_amount: 100000, reward_currency: 'SILVER', reward_amount: 1000, turnover_multiplier: 2, conversion_cap: 1000, is_active: true, created_at: '2026-08-01T09:00:00Z' },
  { id: 'ACH-002', name: '流水巨擘', badge_url: '', category: 'TURNOVER', target_amount: 1000000, reward_currency: 'BRONZE', reward_amount: 5000, is_active: false, created_at: '2026-08-03T09:00:00Z' }
]

export const achievementApi = {
  async getAchievements() {
    await delay(250)
    return { code: 0, msg: 'success', data: achievements.map(item => ({ ...item })) }
  },
  async createAchievement(input: AchievementInput) {
    await delay(350)
    const item: PlayerAchievement = { ...input, id: `ACH-${String(achievements.length + 1).padStart(3, '0')}`, created_at: new Date().toISOString() }
    achievements.unshift(item)
    return { code: 0, msg: 'success', data: item }
  },
  async updateAchievement(id: string, input: AchievementInput) {
    await delay(350)
    const index = achievements.findIndex(item => item.id === id)
    if (index < 0) return { code: 404, msg: '找不到成就' }
    achievements[index] = { ...achievements[index], ...input }
    return { code: 0, msg: 'success', data: achievements[index] }
  },
  async deleteAchievement(id: string) {
    await delay(250)
    const index = achievements.findIndex(item => item.id === id)
    if (index < 0) return { code: 404, msg: '找不到成就' }
    if (achievements[index].is_active) return { code: 400, msg: '僅可刪除停用中的成就' }
    achievements.splice(index, 1)
    return { code: 0, msg: 'success' }
  }
}
