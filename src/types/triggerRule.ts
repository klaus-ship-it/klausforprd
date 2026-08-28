// ── 自動觸發活動管理（TriggerRule）型別定義 ──────────────────────────

import type { CampaignStatus } from './promoCampaign'

/** 觸發事件類型 */
export type TriggerEventType =
  | 'ON_REGISTRATION'        // 註冊
  | 'ON_PROFILE_COMPLETED'   // 註冊完成資料

/** 觸發規則單筆紀錄 */
export interface TriggerRule {
  id: string                          // TRG-202607-001
  triggerEvent: TriggerEventType      // 觸發事件類型
  boundCampaignId: string             // 綁定的活動 ID
  boundCampaignName: string           // 綁定的活動名稱
  campaignStatus: CampaignStatus      // 目標活動當前狀態（即時同步）
  isEnabled: boolean                  // 規則開關
  creatorInfo: {
    creator: string
    createdAt: string                 // YYYY-MM-DD HH:mm:ss
  }
}

/** 新增/編輯觸發規則的表單資料 */
export interface TriggerRuleFormData {
  triggerEvent: TriggerEventType | null
  boundCampaignId: string
  boundCampaignName: string
  isEnabled: boolean
}

/** 觸發歷史紀錄（系統 Log）*/
export type TriggerResult =
  | 'SUCCESS'
  | 'SILENT_FAIL_IP_LIMIT'
  | 'SILENT_FAIL_DEVICE_LIMIT'
  | 'SILENT_FAIL_CAMPAIGN_CLOSED'
  | 'SILENT_FAIL_CAPACITY_FULL'
  | 'SILENT_FAIL_DUPLICATE'

export interface TriggerHistoryRecord {
  id: string
  ruleId: string
  triggeredAt: string                 // YYYY-MM-DD HH:mm:ss
  memberId: string
  memberName: string
  campaignId: string
  result: TriggerResult
  failReason?: string                 // e.g. REASON_IP_LIMIT_EXCEEDED
  ip?: string
  deviceId?: string
}
