import { Announcement, AnnouncementType, AnnouncementLanguage } from '@/types/announcement'

export const mockAnnouncements: Announcement[] = [
    {
        id: '1',
        type: AnnouncementType.MARQUEE,
        title: '歡迎來到遊戲平台！',
        languages: [AnnouncementLanguage.ZH_TW, AnnouncementLanguage.ZH_CN, AnnouncementLanguage.EN],
        content: '祝各位玩家遊戲愉快，好運連連！',
        jumpUrl: '',
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2025-12-31T23:59:59Z',
        weight: 10,
        statusTest: true,
        statusLive: true,
        lastModifiedAt: '2024-01-01T12:00:00Z',
        lastModifiedBy: 'admin'
    },
    {
        id: '2',
        type: AnnouncementType.SYSTEM_NOTIFICATION,
        title: '系統維護公告',
        languages: [AnnouncementLanguage.ZH_TW],
        content: '將於凌晨 2:00 進行維護，預計耗時 2 小時。',
        jumpUrl: '/maintenance',
        startTime: '2024-02-01T02:00:00Z',
        endTime: '2024-02-01T04:00:00Z',
        weight: 1,
        statusTest: true,
        statusLive: false,
        lastModifiedAt: '2024-01-31T18:00:00Z',
        lastModifiedBy: 'system'
    },
    {
        id: '3',
        type: AnnouncementType.OPERATION_ANNOUNCEMENT,
        title: '春節限時活動',
        languages: [AnnouncementLanguage.ZH_TW, AnnouncementLanguage.ZH_CN],
        content: '<b>春節大特賣！</b> 儲值就送 50% 額外獎金。',
        jumpUrl: 'https://example.com/cny',
        startTime: '2024-02-05T00:00:00Z',
        endTime: '2024-02-15T23:59:59Z',
        weight: 5,
        statusTest: true,
        statusLive: true,
        lastModifiedAt: '2024-02-01T09:00:00Z',
        lastModifiedBy: 'op_manager'
    }
]
