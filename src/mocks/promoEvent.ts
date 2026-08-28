import { PromoEvent } from '@/types/promoEvent'

export const mockPromoEvents: PromoEvent[] = [
    {
        id: 'PE_1001',
        title: '新手衝刺特惠',
        start_time: '2026-05-01T00:00:00Z',
        end_time: '2026-12-31T23:59:59Z',
        is_sequential: true,
        status: 'ACTIVE',
        created_at: '2026-04-20T10:00:00Z',
        modules: [
            {
                id: 'M_1',
                type: 'REGISTER',
                require_invite_code: true,
                invite_code: 'NEW2026',
                completer_reward: { gold: 1000, silver: 500, copper: 0 },
                inviter_reward: { gold: 500, silver: 0, copper: 0 }
            },
            {
                id: 'M_2',
                type: 'DEPOSIT',
                target_amount: 1000,
                is_repeatable: false,
                completer_reward: { gold: 5000, silver: 0, copper: 0 },
                inviter_reward: { gold: 1000, silver: 0, copper: 0 }
            }
        ],
        final_completer_reward: { gold: 10000, silver: 10000, copper: 10000 },
        final_inviter_reward: { gold: 5000, silver: 5000, copper: 5000 }
    }
]
