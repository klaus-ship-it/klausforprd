import { ApiResponse, PaginatedResponse } from '@/types'
import {
  PromoCode,
  PromoCodeQueryParams,
  CreatePromoCodeData,
  UpdatePromoCodeData
} from '@/types/promoCode'
import { mockPromoCodes } from '@/mocks/promoCode'

const SIMULATE_DELAY = 300
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const promoCodeApi = {
  async getPromoCodes(
    params: PromoCodeQueryParams
  ): Promise<ApiResponse<PaginatedResponse<PromoCode>>> {
    await delay(SIMULATE_DELAY)

    let filtered = [...mockPromoCodes]

    if (params.code) {
      filtered = filtered.filter(p =>
        p.code.toLowerCase().includes(params.code!.toLowerCase())
      )
    }

    if (params.name) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(params.name!.toLowerCase())
      )
    }

    if (params.hasExpiry !== '' && params.hasExpiry !== undefined) {
      filtered = filtered.filter(p => p.hasExpiry === params.hasExpiry)
    }

    if (params.hasMaxRedemptions !== '' && params.hasMaxRedemptions !== undefined) {
      filtered = filtered.filter(p => p.hasMaxRedemptions === params.hasMaxRedemptions)
    }

    if (params.status) {
      filtered = filtered.filter(p => p.status === params.status)
    }

    // Sort by created time descending
    filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

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

  async createPromoCode(
    data: CreatePromoCodeData
  ): Promise<ApiResponse<PromoCode>> {
    await delay(SIMULATE_DELAY)

    const newPromo: PromoCode = {
      ...data,
      id: 'promo-' + Math.random().toString(36).substr(2, 9),
      usedRedemptions: 0,
      createdAt: new Date().toISOString(),
      createdBy: 'admin'
    }

    mockPromoCodes.unshift(newPromo)

    return {
      code: 0,
      msg: 'success',
      data: newPromo
    }
  },

  async updatePromoCode(
    id: string,
    data: UpdatePromoCodeData
  ): Promise<ApiResponse<void>> {
    await delay(SIMULATE_DELAY)

    const index = mockPromoCodes.findIndex(p => p.id === id)
    if (index === -1) return { code: 404, msg: 'Not found' }

    mockPromoCodes[index] = {
      ...mockPromoCodes[index],
      ...data
    }

    return {
      code: 0,
      msg: 'success'
    }
  },

  async deletePromoCode(id: string): Promise<ApiResponse<void>> {
    await delay(SIMULATE_DELAY)

    const index = mockPromoCodes.findIndex(p => p.id === id)
    if (index === -1) return { code: 404, msg: 'Not found' }

    mockPromoCodes.splice(index, 1)

    return {
      code: 0,
      msg: 'success'
    }
  },

  async toggleStatus(id: string, status: boolean): Promise<ApiResponse<void>> {
    await delay(SIMULATE_DELAY)

    const index = mockPromoCodes.findIndex(p => p.id === id)
    if (index === -1) return { code: 404, msg: 'Not found' }

    mockPromoCodes[index].status = status ? 'ACTIVE' : 'INACTIVE'

    return {
      code: 0,
      msg: 'success'
    }
  }
}
