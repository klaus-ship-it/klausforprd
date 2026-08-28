import { ThirdPartyKey } from '@/types/thirdparty'

const now = () => new Date().toISOString()
const pastDate = () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

export const mockThirdPartyKeys: ThirdPartyKey[] = [
  {
    id: 'K1',
    category: 'GAME',
    provider: 'PG Soft',
    endpoint: 'https://staging.pg.example.com/api',
    merchant_id: 'MERC_PG_001',
    api_key: 'PUBKEY_PG_STAGING',
    secret_key_encrypted: 'encrypted_dummy_pg',
    secret_masked: '****0123',
    ip_whitelist: '1.2.3.4, 5.6.7.8',
    enabled: true,
    created_at: pastDate(),
    updated_at: now()
  },
  {
    id: 'K2',
    category: 'GAME',
    provider: 'PG Soft',
    endpoint: 'https://api.pg.example.com/api',
    merchant_id: 'MERC_PG_PROD',
    api_key: 'PUBKEY_PG_PROD',
    secret_key_encrypted: 'encrypted_prod_pg',
    secret_masked: '****5678',
    ip_whitelist: '10.0.0.0/8',
    enabled: true,
    error: '連線逾時 (Connection Timeout)',
    created_at: pastDate(),
    updated_at: now()
  },
  {
    id: 'K3',
    category: 'GAME',
    provider: 'JILI',
    endpoint: 'https://test.jili.example.com/api',
    merchant_id: 'MERC_JILI_001',
    api_key: 'JILI_KEY_TEST',
    secret_key_encrypted: 'encrypted_jili_test',
    secret_masked: '****9999',
    ip_whitelist: '1.1.1.0/24',
    enabled: true,
    created_at: pastDate(),
    updated_at: now()
  },
  {
    id: 'K4',
    category: 'PAYMENT',
    provider: '綠界科技 (ECPay)',
    endpoint: 'https://payment-stage.ecpay.com.tw/Cweb/CreateMerchantTradeOrder',
    merchant_id: 'ECPAY_MERC_TEST',
    api_key: 'ECPAY_HASHIV_TEST',
    secret_key_encrypted: 'encrypted_ecpay_hashkey',
    secret_masked: '****aaaa',
    ip_whitelist: '',
    enabled: true,
    error: 'Merchant ID 無效',
    created_at: pastDate(),
    updated_at: now()
  },
  {
    id: 'K5',
    category: 'PAYMENT',
    provider: 'Stripe',
    endpoint: 'https://api.stripe.com/v1',
    merchant_id: 'acct_1234567890',
    api_key: 'pk_test_123456789',
    secret_key_encrypted: 'encrypted_stripe_secret',
    secret_masked: '****zzzz',
    ip_whitelist: '',
    enabled: false,
    created_at: pastDate(),
    updated_at: now()
  },
  {
    id: 'K6',
    category: 'SMS',
    provider: 'Twilio',
    endpoint: 'https://api.twilio.com/2010-4-01',
    merchant_id: 'AC12345678901234567890',
    api_key: 'TWILIO_ACCOUNT_SID',
    secret_key_encrypted: 'encrypted_twilio_token',
    secret_masked: '****xxxx',
    ip_whitelist: '',
    enabled: true,
    created_at: pastDate(),
    updated_at: now()
  },
  {
    id: 'K7',
    category: 'AUTH',
    provider: 'Google Authenticator',
    endpoint: 'https://accounts.google.com/o/oauth2/auth',
    merchant_id: 'GOOGLE_CLIENT_ID',
    api_key: 'GOOGLE_CLIENT_SECRET',
    secret_key_encrypted: 'encrypted_google_oauth',
    secret_masked: '****yyyy',
    ip_whitelist: '127.0.0.1',
    enabled: true,
    created_at: pastDate(),
    updated_at: now()
  }
]
