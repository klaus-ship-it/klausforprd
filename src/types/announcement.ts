export enum AnnouncementType {
    MARQUEE = 'MARQUEE',
    SYSTEM_NOTIFICATION = 'SYSTEM_NOTIFICATION',
    OPERATION_ANNOUNCEMENT = 'OPERATION_ANNOUNCEMENT'
}

export enum AnnouncementLanguage {
    ZH_TW = 'zh-TW',
    ZH_CN = 'zh-CN',
    EN = 'en',
    ALL = 'all'
}

export interface Announcement {
    id: string;
    type: AnnouncementType;
    title: string;
    languages: AnnouncementLanguage[];
    content: string;
    jumpUrl: string;
    startTime: string; // ISO string
    endTime: string;   // ISO string
    weight: number;
    statusTest: boolean;
    statusLive: boolean;
    lastModifiedAt: string;
    lastModifiedBy: string;
}

export interface AnnouncementQueryParams {
    types?: AnnouncementType[];
    title?: string;
    languages?: AnnouncementLanguage[];
    startTime?: string;
    endTime?: string;
}

export interface CreateAnnouncementData {
    type: AnnouncementType;
    title: string;
    languages: AnnouncementLanguage[];
    content: string;
    jumpUrl?: string;
    startTime: string;
    endTime: string;
    weight: number;
}

export interface UpdateAnnouncementData extends Partial<CreateAnnouncementData> {
    statusTest?: boolean;
    statusLive?: boolean;
}
