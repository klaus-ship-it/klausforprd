import { MemberTag } from '@/types/player'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

let mockTags: MemberTag[] = [
    { id: 1, name: '一般玩家', type: 'SYSTEM', remark: '系統預設，一般註冊會員', status: 'ACTIVE', member_count: 1200, is_system_default: true },
    { id: 2, name: '測試帳號', type: 'SYSTEM', remark: '系統預設，內部測試使用', status: 'ACTIVE', member_count: 5, is_system_default: true },
    { id: 3, name: '幣商帳號', type: 'SYSTEM', remark: '系統預設，代理或幣商', status: 'ACTIVE', member_count: 12, is_system_default: true },
    { id: 4, name: 'VIP', type: 'CUSTOM', remark: '高價值客戶', status: 'ACTIVE', member_count: 50 },
    { id: 5, name: '高風險', type: 'CUSTOM', remark: '疑似套利或作弊', status: 'ACTIVE', member_count: 2 },
    { id: 6, name: '廣告號', type: 'CUSTOM', remark: '發送垃圾訊息', status: 'INACTIVE', member_count: 0 }
]

export const tagApi = {
    getTags: async (): Promise<{ code: number; msg: string; data: MemberTag[] }> => {
        await delay(300)
        return { code: 0, msg: 'success', data: [...mockTags] }
    },

    createTag: async (name: string, remark: string): Promise<{ code: number; msg: string; data?: MemberTag }> => {
        await delay(300)
        if (mockTags.some(t => t.name === name)) {
            return { code: 400, msg: '標籤名稱已存在' }
        }
        const newTag: MemberTag = {
            id: Math.max(...mockTags.map(t => t.id)) + 1,
            name,
            type: 'CUSTOM',
            remark,
            status: 'ACTIVE',
            member_count: 0
        }
        mockTags.push(newTag)
        return { code: 0, msg: 'success', data: newTag }
    },

    updateTag: async (id: number, data: Partial<Pick<MemberTag, 'name' | 'remark' | 'status'>>): Promise<{ code: number; msg: string }> => {
        await delay(300)
        const tag = mockTags.find(t => t.id === id)
        if (!tag) return { code: 404, msg: '標籤不存在' }

        if (tag.is_system_default) {
            // System tags validation
            if (data.name && data.name !== tag.name) {
                return { code: 403, msg: '系統預設標籤不可修改名稱' }
            }
            // System tags can modify remark
        } else {
            // Custom tags name unique check (if changing name)
            if (data.name && data.name !== tag.name && mockTags.some(t => t.name === data.name)) {
                return { code: 400, msg: '標籤名稱已存在' }
            }
        }

        // Status Validation
        if (data.status === 'INACTIVE' && tag.member_count > 0) {
            // In a real system, we might allow disabling but warn. 
            // Spec says "If tag has associated players, forbid disable" -> "關聯攔截：若該標籤下仍有玩家關聯，禁止停用"
            return { code: 400, msg: '此標籤仍有玩家關聯，無法停用' }
        }

        Object.assign(tag, data)
        return { code: 0, msg: 'success' }
    },

    deleteTag: async (id: number): Promise<{ code: number; msg: string }> => {
        await delay(300)
        const tag = mockTags.find(t => t.id === id)
        if (!tag) return { code: 404, msg: '標籤不存在' }

        if (tag.is_system_default) {
            return { code: 403, msg: '系統預設標籤不可刪除' }
        }

        if (tag.status === 'ACTIVE') {
            return { code: 400, msg: '僅可刪除停用狀態的標籤' }
        }

        if (tag.member_count > 0) {
            return { code: 400, msg: '尚有玩家使用此標籤，無法刪除' }
        }

        mockTags = mockTags.filter(t => t.id !== id)
        return { code: 0, msg: 'success' }
    }
}
