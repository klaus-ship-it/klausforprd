import { ApiResponse } from '@/types'
import { OperationConfig, UpdateOperationConfigRequest } from '@/types/operationConfig'
import { mockOperationConfig } from '@/mocks/config'

const delay = (ms = 300) => new Promise(res => setTimeout(res, ms))

export const operationConfigApi = {
  async get(): Promise<ApiResponse<OperationConfig>> {
    await delay()
    return { code: 0, msg: 'success', data: mockOperationConfig }
  },

  async update(req: UpdateOperationConfigRequest, reason: string): Promise<ApiResponse<void>> {
    await delay()
    // Validate critical parameters
    if (req.bonus_rollover_multiplier !== undefined && req.bonus_rollover_multiplier < 0) {
      return { code: 400, msg: 'Bonus rollover multiplier cannot be negative' }
    }
    if (req.registration_bonus_amount !== undefined && req.registration_bonus_amount < 0) {
      return { code: 400, msg: 'Registration bonus cannot be negative' }
    }
    if (req.login_error_limit !== undefined && req.login_error_limit < 1) {
      return { code: 400, msg: 'Login error limit must be at least 1' }
    }

    // Log change (in real system, would write to audit log OPE-104)
    console.log(`[Audit] Config Update: ${reason}`, {
      before: mockOperationConfig,
      after: { ...mockOperationConfig, ...req }
    })

    // Apply changes
    Object.assign(mockOperationConfig, req, { updated_at: new Date().toISOString() })

    return { code: 0, msg: 'success' }
  },

  // Utility: check if maintenance is active
  async isUnderMaintenance(): Promise<ApiResponse<{ maintenance: boolean; message?: string }>> {
    await delay(50)
    return {
      code: 0,
      msg: 'success',
      data: {
        maintenance: mockOperationConfig.maintenance_enabled,
        message: mockOperationConfig.maintenance_message.zh
      }
    }
  }
}
