export type ChannelType = 'IAP' | 'WEB_REDIRECT' | 'MANUAL';
export type ChannelStatus = 'OPEN' | 'CLOSED' | 'MAINTENANCE' | 'FUSED';
export type PlatformType = 'IOS' | 'ANDROID' | 'WEB' | 'MOBILE_WEB';

export interface PaymentChannel {
    id: string;
    name: string; // 通道顯示名稱
    provider: string; // 金流供應商 (如: ApplePay, MyCard)
    type: ChannelType;
    icon: string; // 通道圖示 URL

    // API 參數
    merchantId: string;
    apiKey: string;
    secretKey: string;
    notifyUrl: string;

    // 風控設定
    minLimit: number; // 單筆最小額度
    maxLimit: number; // 單筆最大額度
    dailyLimit: number; // 每日總額上限 (0 為無上限)
    dailyAccomplished: number; // 今日累計已成金額

    // 顯示控制
    platforms: PlatformType[];
    minVipLevel: number; // 最低 VIP 等級限制 (如 5 表示 VIP 5 及以上開放)
    tags: string[]; // 開放的玩家標籤
    isAuditMasked: boolean; // 審核遮蔽開關

    status: ChannelStatus;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
}

export interface PaymentChannelQuery {
    name?: string;
    provider?: string;
    status?: ChannelStatus;
}
