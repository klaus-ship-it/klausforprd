import { ApiResponse } from '@/types'

export interface TodoStats {
    pendingDeposits: number // Timeout & has proof
    pendingWithdrawals: number // Pending audit
    riskAlerts: number // Unresolved med/high risk
    apiHealth: {
        status: 'healthy' | 'degraded' | 'down'
        failedServices: string[]
    }
    ccu: number // Concurrent users
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const dashboardApi = {
    async getTodoStats(): Promise<ApiResponse<TodoStats>> {
        await delay(500)

        // Mock Data
        // In real impl, this would query multiple tables or a dedicated view
        return {
            code: 0,
            msg: 'success',
            data: {
                pendingDeposits: 3,
                pendingWithdrawals: 12,
                riskAlerts: 5,
                apiHealth: {
                    status: 'healthy',
                    failedServices: []
                    // Mock 'down' scenario: 
                    // status: 'degraded', failedServices: ['GameProvider_A']
                },
                ccu: 12450
            }
        }
    }
}
