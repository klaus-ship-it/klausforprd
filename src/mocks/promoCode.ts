import { PromoCode } from '@/types/promoCode'

export const mockPromoCodes: PromoCode[] = [
  {
    id: 'promo-1',
    code: 'WELCOME888',
    name: '新手首發金幣包',
    hasExpiry: true,
    hasMaxRedemptions: false,
    rewardType: 'GOLD',
    rewardAmount: 888,
    startTime: '2026-01-01T00:00:00Z',
    endTime: '2026-12-31T23:59:59Z',
    usedRedemptions: 125,
    status: 'ACTIVE',
    createdAt: '2026-01-01T08:00:00Z',
    createdBy: 'admin'
  },
  {
    id: 'promo-2',
    code: 'EVENT500',
    name: '春季限時活動銀幣',
    hasExpiry: true,
    hasMaxRedemptions: false,
    rewardType: 'SILVER',
    rewardAmount: 500,
    startTime: '2026-03-01T00:00:00Z',
    endTime: '2026-06-30T23:59:59Z',
    usedRedemptions: 48,
    status: 'ACTIVE',
    createdAt: '2026-03-01T10:00:00Z',
    createdBy: 'admin'
  },
  {
    id: 'promo-3',
    code: 'LIMITED100',
    name: '限量搶兌活動金 (前100名)',
    hasExpiry: true,
    hasMaxRedemptions: true,
    rewardType: 'ACTIVITY_BONUS',
    rewardAmount: 1000,
    startTime: '2026-05-01T00:00:00Z',
    endTime: '2026-05-31T23:59:59Z',
    maxRedemptions: 100,
    usedRedemptions: 98,
    status: 'ACTIVE',
    createdAt: '2026-05-01T09:00:00Z',
    createdBy: 'admin'
  },
  {
    id: 'promo-4',
    code: 'BRONZE5000',
    name: '銅幣回饋包（限量）',
    hasExpiry: false,
    hasMaxRedemptions: true,
    rewardType: 'BRONZE',
    rewardAmount: 5000,
    maxRedemptions: 500,
    usedRedemptions: 150,
    status: 'INACTIVE',
    createdAt: '2026-04-15T14:30:00Z',
    createdBy: 'admin'
  },
  {
    id: 'promo-5',
    code: 'FOREVER999',
    name: '常駐福利金幣包',
    hasExpiry: false,
    hasMaxRedemptions: false,
    rewardType: 'GOLD',
    rewardAmount: 999,
    usedRedemptions: 3210,
    status: 'ACTIVE',
    createdAt: '2026-01-15T12:00:00Z',
    createdBy: 'admin'
  }
]
