import type { ReportType } from './operationReport'

export type ReportStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface ReportManagementRecord {
    id: string
    name: string
    type: ReportType
    createTime: number
    completeTime?: number
    status: ReportStatus
    fileSize?: number
    downloadUrl?: string
    operator: string
}

export interface ReportManagementQuery {
    page: number
    pageSize: number
    type?: ReportType
    status?: ReportStatus
    startTime?: number
    endTime?: number
}
