import { ApiResponse, PaginatedResponse } from '@/types'
import { Guild, GuildGlobalConfig, GuildQuery, GuildMember } from '@/types/guild'
import { mockGuilds, mockGuildGlobalConfig } from '@/mocks/guild'

const delay = (ms = 300) => new Promise(res => setTimeout(res, ms))

export const guildApi = {
    async list(query: GuildQuery): Promise<ApiResponse<PaginatedResponse<Guild>>> {
        await delay()
        let filtered = [...mockGuilds]

        if (query.guild_id_or_name) {
            filtered = filtered.filter(g =>
                g.id.includes(query.guild_id_or_name!) ||
                g.name.includes(query.guild_id_or_name!)
            )
        }

        if (query.leader_id) {
            filtered = filtered.filter(g => g.leader_id.includes(query.leader_id!))
        }

        const start = (query.page - 1) * query.pageSize
        const data = filtered.slice(start, start + query.pageSize)

        return {
            code: 0,
            msg: 'success',
            data: {
                items: data,
                total: filtered.length,
                page: query.page,
                pageSize: query.pageSize
            }
        }
    },

    async getGlobalConfig(): Promise<ApiResponse<GuildGlobalConfig>> {
        await delay(100)
        return { code: 0, msg: 'success', data: mockGuildGlobalConfig }
    },

    async updateGlobalConfig(config: GuildGlobalConfig): Promise<ApiResponse<void>> {
        await delay()
        Object.assign(mockGuildGlobalConfig, config)
        return { code: 0, msg: 'success' }
    },

    async dissolve(id: string): Promise<ApiResponse<void>> {
        await delay()
        const index = mockGuilds.findIndex(g => g.id === id)
        if (index !== -1) {
            mockGuilds[index].status = 'DISSOLVED'
        }
        return { code: 0, msg: 'success' }
    },

    async mute(id: string): Promise<ApiResponse<void>> {
        await delay()
        const index = mockGuilds.findIndex(g => g.id === id)
        if (index !== -1) {
            mockGuilds[index].status = 'MUTED'
        }
        return { code: 0, msg: 'success' }
    },

    async transferLeader(guildId: string, newLeaderId: string): Promise<ApiResponse<void>> {
        await delay()
        const index = mockGuilds.findIndex(g => g.id === guildId)
        if (index !== -1) {
            mockGuilds[index].leader_id = newLeaderId
        }
        return { code: 0, msg: 'success' }
    },

    async getMembers(_guildId: string): Promise<ApiResponse<GuildMember[]>> {
        await delay(500)
        // Generate mock members for any guild
        const members: GuildMember[] = [
            {
                player_id: 'P99001',
                username: 'GuildMaster_X',
                rank: 'LEADER',
                join_time: '2023-10-01 12:00:00',
                total_contribution: 500000,
                last_active: '2024-02-04 15:30:00'
            },
            {
                player_id: 'P99002',
                username: 'Elder_Shadow',
                rank: 'ELDER',
                join_time: '2023-10-05 09:15:00',
                total_contribution: 250000,
                last_active: '2024-02-04 14:45:00'
            },
            {
                player_id: 'P99003',
                username: 'Warrior_A',
                rank: 'MEMBER',
                join_time: '2023-11-12 18:20:00',
                total_contribution: 80000,
                last_active: '2024-02-03 23:10:00'
            },
            {
                player_id: 'P99004',
                username: 'Healer_B',
                rank: 'MEMBER',
                join_time: '2024-01-02 21:10:00',
                total_contribution: 35000,
                last_active: '2024-02-04 10:05:00'
            }
        ]
        return { code: 0, msg: 'success', data: members }
    }
}
