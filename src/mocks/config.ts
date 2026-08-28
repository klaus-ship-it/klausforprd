import { OperationConfig } from '@/types/operationConfig'

const now = () => new Date().toISOString()

export const mockOperationConfig: OperationConfig = {
  // 營運與維護
  maintenance_enabled: false,
  maintenance_message: {
    zh: '系統正在升級維護中，請稍候...',
    'zh-CN': '系统正在升级维护中，请稍候...'
  },
  maintenance_kickout_delay_seconds: 30,
  allow_test_login: true,
  registration_enabled: true,

  // 網站基礎設定
  site_title: 'Yota娛樂城',
  default_language: 'zh-TW',
  timezone: 'Asia/Taipei',

  // 推廣與財務參數
  p2p_transaction_fee: 5.0,
  bonus_rollover_multiplier: 20.0,
  registration_bonus_amount: 100,
  rollover_settlement_threshold: 0.99,

  // 安全性設定
  login_error_limit: 5,
  captcha_enabled: true,
  force_phone_binding: false,
  whitelist_ips: '127.0.0.1\n192.168.1.1',

  // 其他
  payout_threshold_multiplier: 2.0,
  password_reset_cooldown_hours: 24,
  session_timeout_minutes: 120,

  updated_at: now(),
  updated_by: 'admin'
}
