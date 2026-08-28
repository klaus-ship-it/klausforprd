import { VersionRecord } from '@/types/version'

const now = () => new Date().toISOString()
const pastDate = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

export const mockVersions: VersionRecord[] = [
  {
    id: 'V1',
    platforms: ['IOS', 'ANDROID'],
    version: '1.2.0',
    build: 120,
    update_type: 'OPTION',
    download_link: 'https://example.com/download/1.2.0.apk',
    title: '發現新版本！',
    changelog: { zh: '- 修復若干問題\n- 性能優化\n- UI 改進' },
    enabled: true,
    created_at: pastDate(7),
    updated_at: now()
  },
  {
    id: 'V2',
    platforms: ['IOS'],
    version: '1.1.9',
    build: 119,
    update_type: 'NONE',
    download_link: 'https://apps.apple.com/tw/app/example/id123456789',
    title: '舊版本（不提示）',
    changelog: { zh: '- 維護版本' },
    enabled: false,
    created_at: pastDate(14),
    updated_at: pastDate(14)
  },
  {
    id: 'V3',
    platforms: ['ANDROID'],
    version: '1.2.1',
    build: 121,
    update_type: 'FORCE',
    download_link: 'https://play.google.com/store/apps/details?id=com.example.app',
    title: '重要更新（測試帳號強更）',
    changelog: { zh: '- 修復登入安全問題\n- 強制更新' },
    enabled: true,
    created_at: pastDate(3),
    updated_at: now()
  },
  {
    id: 'V4',
    platforms: ['H5'],
    version: '2.0.0',
    build: 200,
    update_type: 'FORCE',
    download_link: 'https://example.com/h5-2.0.0.zip',
    title: '主要版本更新（強更）',
    changelog: { zh: '- 全新 UI 設計\n- 遊戲效能提升 50%\n- 支援新功能\n- 強制更新' },
    enabled: true,
    created_at: pastDate(1),
    updated_at: now()
  },
  {
    id: 'V5',
    platforms: ['IOS', 'ANDROID'],
    version: '1.0.0',
    build: 100,
    update_type: 'OPTION',
    download_link: 'https://example.com/download/1.0.0.apk',
    title: '初始版本',
    changelog: { zh: '- 首次發佈' },
    enabled: true,
    created_at: pastDate(30),
    updated_at: pastDate(30)
  },
  {
    id: 'V6',
    platforms: ['ANDROID'],
    version: '1.3.0',
    build: 130,
    update_type: 'OPTION',
    download_link: 'https://play.google.com/store/apps/details?id=com.example.app',
    title: '代理版本專用',
    changelog: { zh: '- 代理後台功能\n- 報表增強\n- 代理佣金管理' },
    enabled: true,
    created_at: pastDate(5),
    updated_at: now()
  }
]
