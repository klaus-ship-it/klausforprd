import { AssetLog } from '@/types/log'

// Global store for mock logs
export const mockAssetLogs: AssetLog[] = []

export const addLog = (log: AssetLog) => {
    mockAssetLogs.unshift(log) // Newest first
    // Keep size reasonable for mock
    if (mockAssetLogs.length > 2000) {
        mockAssetLogs.pop()
    }
}
