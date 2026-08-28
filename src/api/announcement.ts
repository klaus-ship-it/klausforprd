import { ApiResponse, PaginatedResponse } from '@/types'
import {
    Announcement,
    AnnouncementQueryParams,
    CreateAnnouncementData,
    UpdateAnnouncementData
} from '@/types/announcement'
import { mockAnnouncements } from '@/mocks/announcement'

const SIMULATE_DELAY = 500
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const announcementApi = {
    async getAnnouncements(params: AnnouncementQueryParams & { page: number, pageSize: number }): Promise<ApiResponse<PaginatedResponse<Announcement>>> {
        await delay(SIMULATE_DELAY)

        let filtered = [...mockAnnouncements]

        if (params.types && params.types.length > 0) {
            filtered = filtered.filter(a => params.types!.includes(a.type))
        }

        if (params.title) {
            filtered = filtered.filter(a => a.title.toLowerCase().includes(params.title!.toLowerCase()))
        }

        if (params.languages && params.languages.length > 0) {
            // If "ALL" is selected, it should probably match everything or specific logic
            // For now, if any of the selected languages match the announcement's languages
            filtered = filtered.filter(a =>
                params.languages!.some(lang => a.languages.includes(lang))
            )
        }

        if (params.startTime) {
            const start = new Date(params.startTime).getTime()
            filtered = filtered.filter(a => new Date(a.startTime).getTime() >= start)
        }

        if (params.endTime) {
            const end = new Date(params.endTime).getTime()
            filtered = filtered.filter(a => new Date(a.endTime).getTime() <= end)
        }

        // Sort by weight (asc) then start time (desc)
        filtered.sort((a, b) => {
            if (a.weight !== b.weight) return a.weight - b.weight
            return new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        })

        const total = filtered.length
        const startIdx = (params.page - 1) * params.pageSize
        const endIdx = startIdx + params.pageSize
        const items = filtered.slice(startIdx, endIdx)

        return {
            code: 0,
            msg: 'success',
            data: {
                items,
                total,
                page: params.page,
                pageSize: params.pageSize
            }
        }
    },

    async createAnnouncement(data: CreateAnnouncementData): Promise<ApiResponse<Announcement>> {
        await delay(SIMULATE_DELAY)
        const newAnnouncement: Announcement = {
            ...data,
            id: Math.random().toString(36).substr(2, 9),
            jumpUrl: data.jumpUrl || '',
            statusTest: false,
            statusLive: false,
            lastModifiedAt: new Date().toISOString(),
            lastModifiedBy: 'admin'
        }
        mockAnnouncements.unshift(newAnnouncement)
        return { code: 0, msg: 'success', data: newAnnouncement }
    },

    async updateAnnouncement(id: string, data: UpdateAnnouncementData): Promise<ApiResponse<void>> {
        await delay(SIMULATE_DELAY)
        const index = mockAnnouncements.findIndex(a => a.id === id)
        if (index === -1) return { code: 404, msg: 'Not found' }

        mockAnnouncements[index] = {
            ...mockAnnouncements[index],
            ...data,
            lastModifiedAt: new Date().toISOString(),
            lastModifiedBy: 'admin'
        }
        return { code: 0, msg: 'success' }
    },

    async deleteAnnouncement(id: string): Promise<ApiResponse<void>> {
        await delay(SIMULATE_DELAY)
        const index = mockAnnouncements.findIndex(a => a.id === id)
        if (index === -1) return { code: 404, msg: 'Not found' }

        mockAnnouncements.splice(index, 1)
        return { code: 0, msg: 'success' }
    },

    async toggleStatus(id: string, site: 'test' | 'live', status: boolean): Promise<ApiResponse<void>> {
        await delay(SIMULATE_DELAY)
        const index = mockAnnouncements.findIndex(a => a.id === id)
        if (index === -1) return { code: 404, msg: 'Not found' }

        if (site === 'test') {
            mockAnnouncements[index].statusTest = status
        } else {
            mockAnnouncements[index].statusLive = status
        }

        mockAnnouncements[index].lastModifiedAt = new Date().toISOString()
        mockAnnouncements[index].lastModifiedBy = 'admin'

        // In real app, this would trigger Redis cache update
        console.log(`[Cache] Updating Announcement_Cache_Key for ${id}`)

        return { code: 0, msg: 'success' }
    }
}
