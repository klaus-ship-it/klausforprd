export type OrderStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'MANUAL' | 'REFUNDED' | 'VERIFY_ERROR';

export type PaymentChannel = 'iOS-IAP' | 'Android-IAP' | 'Web-CreditCard' | 'Web-ATM' | 'MyCard' | 'LinePay' | 'AliPay';

export interface DepositOrder {
    id: string;               // 訂單編號
    externalId: string;       // 三方流水號
    playerId: string;         // 玩家 ID
    account: string;          // 玩家帳號
    channel: PaymentChannel;  // 儲值渠道
    productName: string;      // 商品名稱
    amount: number;           // 申請金額 (TWD)
    fee: number;              // 估算手續費
    netAmount: number;        // 實際到帳
    status: OrderStatus;      // 狀態
    createdAt: string;        // 建立時間
    updatedAt: string;        // 最後更新時間
    isTest: boolean;          // 是否為測試帳號
}

export interface DepositStats {
    totalAmount: number;      // 儲值總額
    totalFee: number;         // 手續費總額
    totalCount: number;       // 訂單總數
    channelDonut: { name: string, value: number }[]; // 渠道儲值佔比
    costDonut: { name: string, value: number }[];    // 渠道成本佔比
    statusDonut: { name: string, value: number }[];  // 訂單狀態分佈
}

export interface TrendPoint {
    time: string;
    successAmount: number;    // 綠線：成功總金額
    totalCount: number;       // 長條圖：總數
    failedCount: number;      // 紅線：失敗數
}

export interface OrderLogEntry {
    time: string;
    action: string;           // 動作
    statusBefore: OrderStatus | null;
    statusAfter: OrderStatus;
    operator: string;         // 處理者 (系統/管理員 ID)
    ip: string;               // 來源 IP
    rawDetail?: string;       // API 原文
}
