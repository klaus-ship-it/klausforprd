export enum ImageType {
    BANNER = 'BANNER',
    LOBBY_BACKGROUND = 'LOBBY_BACKGROUND',
    EVENT_THUMBNAIL = 'EVENT_THUMBNAIL',
    POPUP = 'POPUP',
    SPLASH = 'SPLASH',
    DEPOSIT_PROMO = 'DEPOSIT_PROMO'
}

export enum PopupFrequency {
    EVERY_LOGIN = 'EVERY_LOGIN',
    DAILY_ONCE = 'DAILY_ONCE', // Reset at server time 00:00:00
    ONCE_FOREVER = 'ONCE_FOREVER'
}

export interface ImageConfig {
    id: string;
    type: ImageType;
    platform: 'APP' | 'WEB';
    title: string;

    // Image
    imageUrl: string;

    // Action
    jumpUrl: string; // Internal path or external URL

    // Scheduling & Priority
    startTime: string; // ISO string
    endTime: string;   // ISO string
    weight: number;    // Smaller number = higher priority

    // Popup specific
    frequency?: PopupFrequency;

    // Status
    statusTest: boolean;
    statusLive: boolean;

    // Metadata
    lastModifiedAt: string;
    lastModifiedBy: string;
}

export interface CreateImageConfigData {
    type: ImageType;
    platform: 'APP' | 'WEB';
    title: string;
    imageUrl: string;
    jumpUrl: string;
    startTime: string;
    endTime: string;
    weight: number;
    frequency?: PopupFrequency;
}

export interface UpdateImageConfigData extends Partial<CreateImageConfigData> {
    statusTest?: boolean;
    statusLive?: boolean;
}

export interface ImageConfigQueryParams {
    types?: ImageType[];
    startTime?: string;
    endTime?: string;
}
