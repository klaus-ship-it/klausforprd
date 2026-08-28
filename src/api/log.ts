import { mockAssetLogs } from '@/mocks/assetLogs'
import { LogSearchParams, AssetLog } from '@/types/log'

// Helpers
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const logApi = {
    getLogs: async (params: LogSearchParams): Promise<{ code: number; msg: string; data: { list: AssetLog[]; total: number } }> => {
        await delay(300) // Sim network delay

        let logs = [...mockAssetLogs]

        // Filtering
        if (params.player_id) {
            logs = logs.filter(l => l.player_id.includes(params.player_id!) || l.username.includes(params.player_id!))
        }
        if (params.currency) {
            logs = logs.filter(l => l.currency === params.currency)
        }
        if (params.change_type) {
            logs = logs.filter(l => l.change_type === params.change_type)
        }
        if (params.date_start && params.date_end) {
            const start = new Date(params.date_start).getTime()
            const end = new Date(params.date_end).getTime()
            logs = logs.filter(l => {
                const t = new Date(l.timestamp).getTime()
                return t >= start && t <= end
            })
        }

        // Pagination
        const total = logs.length
        const start = (params.page - 1) * params.page_size
        const end = start + params.page_size
        const list = logs.slice(start, end)

        return {
            code: 0,
            msg: 'success',
            data: {
                list,
                total
            }
        }
    }
}
