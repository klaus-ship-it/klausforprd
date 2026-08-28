import { ApiResponse } from '@/types'
import { ReportManagementRecord, ReportManagementQuery } from '@/types/reportManagement'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const reportManagementApi = {
    async getReportList(params: ReportManagementQuery): Promise<ApiResponse<{ list: ReportManagementRecord[], total: number }>> {
        await delay(500)

        // 生成模擬數據
        const list: ReportManagementRecord[] = []
        const types: any[] = ['ggr', 'deposit', 'activity', 'activity_bonus']
        const statuses: any[] = ['completed', 'processing', 'pending', 'failed']

        for (let i = 0; i < params.pageSize; i++) {
            const id = (params.page - 1) * params.pageSize + i + 1
            const type = types[Math.floor(Math.random() * types.length)]
            const status = i < 2 ? statuses[i] : statuses[Math.floor(Math.random() * statuses.length)]

            list.push({
                id: `REP-${id}`,
                name: `${type.toUpperCase()} Report - ${new Date().toISOString().split('T')[0]}`,
                type,
                createTime: Date.now() - i * 3600000,
                completeTime: status === 'completed' ? Date.now() - (i - 1) * 3600000 : undefined,
                status,
                fileSize: status === 'completed' ? Math.floor(Math.random() * 5000000) + 100000 : undefined,
                downloadUrl: status === 'completed' ? 'https://example.com/report.xlsx' : undefined,
                operator: 'admin'
            })
        }

        return {
            code: 0,
            msg: 'success',
            data: {
                list,
                total: 100
            }
        }
    },

    async deleteReport(_id: string): Promise<ApiResponse<null>> {
        await delay(300)
        return { code: 0, msg: 'success', data: null }
    }
}
