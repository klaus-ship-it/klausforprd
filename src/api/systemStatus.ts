import { ApiResponse } from '@/types'

export interface ServiceStatus {
    id: string
    name: string
    group: 'PAYMENT' | 'GAME' | 'SYSTEM' | 'CORE'
    status: 'ALIVE' | 'WARNING' | 'CRITICAL' | 'MAINTENANCE'
    latency: number // ms
    lastCheck: string
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Mock Data Store
let mockServices: ServiceStatus[] = [
    { id: 'PAY_01', name: 'GreenPay (綠界)', group: 'PAYMENT', status: 'ALIVE', latency: 45, lastCheck: new Date().toISOString() },
    { id: 'PAY_02', name: 'USDT-TRC20', group: 'PAYMENT', status: 'ALIVE', latency: 120, lastCheck: new Date().toISOString() },
    { id: 'GAME_01', name: 'Evolution Gaming', group: 'GAME', status: 'ALIVE', latency: 85, lastCheck: new Date().toISOString() },
    { id: 'GAME_02', name: 'PG Soft', group: 'GAME', status: 'WARNING', latency: 1800, lastCheck: new Date().toISOString() },
    { id: 'SYS_01', name: 'SMS Gateway', group: 'SYSTEM', status: 'ALIVE', latency: 60, lastCheck: new Date().toISOString() },
    { id: 'SYS_02', name: 'Email Service', group: 'SYSTEM', status: 'ALIVE', latency: 110, lastCheck: new Date().toISOString() },
    { id: 'CORE_01', name: 'Database (Master)', group: 'CORE', status: 'ALIVE', latency: 5, lastCheck: new Date().toISOString() },
    { id: 'CORE_02', name: 'Redis Cache', group: 'CORE', status: 'ALIVE', latency: 2, lastCheck: new Date().toISOString() },
]

export const systemStatusApi = {
    async getHealthStats(): Promise<ApiResponse<ServiceStatus[]>> {
        await delay(400)

        // Simulate random latency fluctuations
        mockServices = mockServices.map(s => {
            // Keep critical/maintenance unless manually changed, but fluctuate latency
            if (s.status === 'ALIVE' || s.status === 'WARNING') {
                const variance = Math.floor(Math.random() * 50) - 25
                let newLatency = Math.max(1, s.latency + variance)

                // Randomly trigger warning if latency spikes (simulated)
                if (newLatency > 1500) {
                    s.status = 'WARNING'
                } else if (newLatency < 1000 && s.status === 'WARNING') {
                    s.status = 'ALIVE'
                }

                s.latency = newLatency
            }
            s.lastCheck = new Date().toISOString()
            return s
        })

        return {
            code: 0,
            msg: 'success',
            data: [...mockServices]
        }
    },

    async checkServiceIntegrity(id: string): Promise<ApiResponse<ServiceStatus>> {
        await delay(600)
        const service = mockServices.find(s => s.id === id)
        if (service) {
            // Simulate a fresh check result
            service.lastCheck = new Date().toISOString()
            service.latency = Math.floor(Math.random() * 100) + 20
            if (service.status !== 'MAINTENANCE') {
                service.status = 'ALIVE' // Assume manual check passes for mock
            }
            return { code: 0, msg: 'success', data: service }
        }
        return { code: 1, msg: 'Service not found', data: null as any }
    },

    // For Verification: Force a critical failure
    async mockServiceFailure(id: string, isCritical: boolean): Promise<ApiResponse<null>> {
        const service = mockServices.find(s => s.id === id)
        if (service) {
            service.status = isCritical ? 'CRITICAL' : 'ALIVE'
            service.latency = isCritical ? 9999 : 50
        }
        return { code: 0, msg: 'success', data: null }
    },

    // NEW: System Overview Stats
    async getSystemOverview(): Promise<ApiResponse<SystemOverviewStats>> {
        await delay(300)

        // Simulate fluctuating metrics
        const baseLoad = 45
        const loadVariance = Math.floor(Math.random() * 30) - 15
        const serverLoad = Math.min(100, Math.max(5, baseLoad + loadVariance))

        const cpuUsage = Math.min(100, Math.max(10, 35 + Math.floor(Math.random() * 40)))
        const memoryUsage = Math.min(100, Math.max(20, 55 + Math.floor(Math.random() * 25)))
        const memoryTotal = 64
        const memoryUsed = Math.round((memoryUsage / 100) * memoryTotal * 10) / 10
        const diskUsage = Math.min(100, Math.max(30, 42 + Math.floor(Math.random() * 15)))

        const avgLatency = Math.floor(mockServices.reduce((sum, s) => sum + s.latency, 0) / mockServices.length)

        // Simulate error count (0-15 range, mostly low)
        const errorCount = Math.random() > 0.7 ? Math.floor(Math.random() * 10) + 5 : Math.floor(Math.random() * 5)

        // Simulate QPS and connections
        const qps = Math.floor(Math.random() * 500) + 800
        const activeConnections = Math.floor(Math.random() * 200) + 150

        return {
            code: 0,
            msg: 'success',
            data: {
                serverLoad,
                cpuUsage,
                memoryUsage,
                memoryUsed,
                memoryTotal,
                diskUsage,
                avgLatency,
                errorCount24h: errorCount,
                currentQps: qps,
                activeConnections,
                uptime: '15d 7h 42m'
            }
        }
    },

    // NEW: Traffic Trend (24h)
    async getTrafficTrend(): Promise<ApiResponse<TrafficPoint[]>> {
        await delay(400)

        const now = new Date()
        const points: TrafficPoint[] = []

        for (let i = 23; i >= 0; i--) {
            const time = new Date(now.getTime() - i * 3600000)
            const hour = time.getHours()

            // Simulate traffic pattern: lower at night, peak at evening
            let baseTraffic = 5000
            if (hour >= 0 && hour < 6) baseTraffic = 2000
            else if (hour >= 6 && hour < 12) baseTraffic = 8000
            else if (hour >= 12 && hour < 18) baseTraffic = 12000
            else baseTraffic = 18000 // Evening peak

            const variance = Math.floor(Math.random() * 2000) - 1000

            points.push({
                time: `${String(hour).padStart(2, '0')}:00`,
                requests: Math.max(500, baseTraffic + variance)
            })
        }

        return { code: 0, msg: 'success', data: points }
    },

    // NEW: Error Logs
    async getErrorLogs(): Promise<ApiResponse<ErrorLogEntry[]>> {
        await delay(300)

        const mockErrors: ErrorLogEntry[] = [
            {
                id: 'ERR_001',
                timestamp: new Date(Date.now() - 1800000).toISOString(),
                apiEndpoint: '/api/v1/payment/callback',
                method: 'POST',
                statusCode: 500,
                message: 'Database connection timeout',
                severity: 'CRITICAL',
                traceId: 'trace-abc123'
            },
            {
                id: 'ERR_002',
                timestamp: new Date(Date.now() - 3600000).toISOString(),
                apiEndpoint: '/api/v1/game/session',
                method: 'GET',
                statusCode: 502,
                message: 'Upstream provider unavailable',
                severity: 'ERROR',
                traceId: 'trace-def456'
            },
            {
                id: 'ERR_003',
                timestamp: new Date(Date.now() - 7200000).toISOString(),
                apiEndpoint: '/api/v1/player/balance',
                method: 'GET',
                statusCode: 504,
                message: 'Gateway timeout',
                severity: 'WARNING',
                traceId: 'trace-ghi789'
            },
            {
                id: 'ERR_004',
                timestamp: new Date(Date.now() - 10800000).toISOString(),
                apiEndpoint: '/api/v1/auth/refresh',
                method: 'POST',
                statusCode: 401,
                message: 'Token validation failed',
                severity: 'WARNING',
                traceId: 'trace-jkl012'
            }
        ]

        return { code: 0, msg: 'success', data: mockErrors }
    }
}

// NEW Interfaces
export interface SystemOverviewStats {
    serverLoad: number        // 0-100%
    cpuUsage: number          // 0-100%
    memoryUsage: number       // 0-100%
    memoryUsed: number        // GB
    memoryTotal: number       // GB
    diskUsage: number         // 0-100%
    avgLatency: number        // ms
    errorCount24h: number     // count
    currentQps: number        // requests/second
    activeConnections: number // current connections
    uptime: string            // e.g. "15d 4h 23m"
}

export interface TrafficPoint {
    time: string              // e.g. "14:00"
    requests: number
}

export interface ErrorLogEntry {
    id: string
    timestamp: string
    apiEndpoint: string
    method: 'GET' | 'POST' | 'PUT' | 'DELETE'
    statusCode: number
    message: string
    severity: 'WARNING' | 'ERROR' | 'CRITICAL'
    traceId: string
}
