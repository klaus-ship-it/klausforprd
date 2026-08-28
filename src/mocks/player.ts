import { Player, PlayerAuditLog, Wallet } from '@/types/player'
import { RolloverEngine } from './engine' // Import Engine

const generateWallets = (): Wallet[] => [
    { type: 'CASH', currency: 'GOLD', balance: Math.floor(Math.random() * 50000) },
    { type: 'CASH', currency: 'SILVER', balance: Math.floor(Math.random() * 10000) },
    { type: 'BONUS', currency: 'GOLD', balance: Math.floor(Math.random() * 5000) },
    { type: 'BONUS', currency: 'SILVER', balance: Math.floor(Math.random() * 3000) },
    { type: 'GAME', currency: 'BRONZE', balance: Math.floor(Math.random() * 1000) },
    { type: 'SAFE', currency: 'GOLD', balance: Math.floor(Math.random() * 10000) }
]

const names = ['Alex', 'Ben', 'Charlie', 'David', 'Eve', 'Frank', 'Grace', 'Helen']
const statuses = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'LOCKED', 'FROZEN', 'SUSPENDED'] as const

export const mockPlayers: Player[] = Array.from({ length: 50 }).map((_, i) => {
    // Generate base player
    const player: Player = {
        id: `P${10000 + i}`,
        username: `user_${10000 + i}`,
        display_name: `${names[i % names.length]}_${i}`,
        phone: `0912${String(i).padStart(6, '0')}`,
        status: statuses[i % 6] as any,
        tags: i % 10 === 0 ? ['TEST', 'VIP'] : ['NORMAL'],
        vip_level: Math.floor(Math.random() * 5),
        promo_code: i % 5 === 1 ? `A${20000 + i}` : undefined,
        agent_id: i % 5 === 1 ? `${20000 + i}` : undefined, // Mock agent ID for affiliated players
        agent_name: i % 5 === 1 ? `agent_${20000 + i}` : undefined, // Mock agent name for affiliated players
        invite_code: `INV${10000 + i}`, // Unique invite code for every player
        invited_by_code: i > 0 && i % 3 === 1 ? `INV10000` : (i > 0 && i % 4 === 2 ? `INV10002` : undefined), // Mock invited by relation
        rtp: parseFloat((Math.random() * 40 + 70).toFixed(2)), // Random RTP between 80.00 and 120.00
        register_source: i % 3 === 0 ? 'Admin_Manual' : 'SEO_Google',
        register_ip: `192.168.1.${i % 255}`,
        register_at: new Date(Date.now() - Math.random() * 100000000).toISOString(),
        last_login_at: new Date(Date.now() - Math.random() * 100000000).toISOString(),
        last_login_ip: `192.168.1.${i % 255}`,
        is_online: Math.random() > 0.7,
        wallets: generateWallets(),
        is_muted: 'NONE',
        is_gift_disabled: false,
        is_deposit_disabled: false,
        is_play_disabled: false,
        // Extended Profile
        gender: i % 3 === 0 ? 'MALE' : (i % 3 === 1 ? 'FEMALE' : 'UNKNOWN'),
        birthday: '1990-01-01',
        email: `player${i}@example.com`,
        is_retention_active: i % 2 === 0,
        consecutive_check_in_days: i % 9,
        // Init Bonus Queue
        bonus_queue: i % 4 === 0 ? [
            RolloverEngine.createBonusCard(100, 10, 500, 7),
            RolloverEngine.createBonusCard(50, 5, 200, 3),
            RolloverEngine.createBonusCard(80, 8, 400, 5),
            RolloverEngine.createBonusCard(120, 12, 600, 10),
            RolloverEngine.createBonusCard(30, 3, 150, 2)
        ] : [],
        // Init Container (Every 5th player has active bonus)
        rollover_container: undefined
    }

    // Activate bonus for some players
    if (i % 5 === 0 && player.bonus_queue && player.bonus_queue.length > 0) {
        const card = player.bonus_queue.shift()!
        RolloverEngine.activateBonus(player, card)
    }

    // VIP v2 prototype snapshot fields (real values will come from backend aggregates).
    player.vip_historical_max_level = player.vip_level
    player.vip_lifetime_deposit = player.vip_level * 1200
    player.vip_lifetime_turnover = player.vip_level * 12000
    player.vip_current_month_deposit = player.vip_level * 300
    player.vip_current_month_turnover = player.vip_level * 3000
    player.vip_current_month_active_days = player.vip_level * 2
    player.vip_reward_claimed_levels = Array.from({ length: player.vip_level }, (_, rank) => rank + 1)
    player.vip_monthly_protection = i % 7 === 0

    return player
})

export const mockAuditLogs: PlayerAuditLog[] = Array.from({ length: 100 }).map((_, i) => ({
    id: `log-${i}`,
    player_id: `P${10000 + (i % 50)}`,
    operator: i % 3 === 0 ? 'system' : 'admin',
    action: ['Login', 'Update Profile', 'Change Password', 'KYC Submit'][i % 4],
    details: `Action detail ${i}`,
    ip_address: `192.168.1.${i % 255}`,
    created_at: new Date(Date.now() - Math.random() * 10000000).toISOString()
}))

export const mockPlayerTransfers: import('@/types/player').PlayerTransferRecord[] = []
