import { ApiResponse } from '@/types'
import { MessageEvent, TestMessagePayload } from '@/types/messageSettings'

const SIMULATE_DELAY = 500
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// // Default events: "registrationSuccess", "depositArrived", "passwordChanged", "maintenanceComplete"
let mockMessageEvents: MessageEvent[] = [
    {
        id: '1',
        eventCode: 'registrationSuccess',
        eventName: 'registrationSuccess',
        siteMessageEnabled: true,
        emailEnabled: false,
        smsEnabled: false,
        subject: 'Welcome to Antigravity!',
        bonusAmount: 100,
        availableVariables: ['{PlayerID}', '{RegisterDate}', '{BonusAmount}'],
        templateContent: 'Welcome {PlayerID}! Your registration is successful on {RegisterDate}. You have received {BonusAmount} bonus.'
    },
    {
        id: '2',
        eventCode: 'depositArrived',
        eventName: 'depositArrived',
        siteMessageEnabled: true,
        emailEnabled: true,
        smsEnabled: false,
        subject: 'Deposit Successful',
        availableVariables: ['{PlayerID}', '{Amount}', '{OrderNo}', '{Date}'],
        templateContent: 'Dear {PlayerID}, your deposit of {Amount} has arrived on {Date}. Order No: {OrderNo}.'
    },
    {
        id: '3',
        eventCode: 'passwordChanged',
        eventName: 'passwordChanged',
        siteMessageEnabled: true,
        emailEnabled: true,
        smsEnabled: true,
        subject: 'Security Alert: Password Changed',
        availableVariables: ['{PlayerID}', '{Date}', '{IP}'],
        templateContent: 'Security Alert: Your password has been changed successfully. IP: {IP}'
    },
    {
        id: '4',
        eventCode: 'maintenanceComplete',
        eventName: 'maintenanceComplete',
        siteMessageEnabled: true,
        emailEnabled: false,
        smsEnabled: false,
        subject: 'System Maintenance Complete',
        bonusAmount: 50,
        availableVariables: ['{PlayerID}', '{BonusAmount}'],
        templateContent: 'System maintenance is complete. Good luck, {PlayerID}! We sent you {BonusAmount} as a gift.'
    }
]

export const messageSettingsApi = {
    // Fetch all message events
    async getMessageEvents(): Promise<ApiResponse<MessageEvent[]>> {
        await delay(SIMULATE_DELAY)
        return {
            code: 0,
            msg: 'success',
            data: mockMessageEvents
        }
    },

    // Update a message event (e.g., toggle channel or update template)
    async updateMessageEvent(id: string, data: Partial<MessageEvent>): Promise<ApiResponse<void>> {
        await delay(SIMULATE_DELAY)
        const index = mockMessageEvents.findIndex(e => e.id === id)
        if (index === -1) {
            return { code: 404, msg: 'Message event not found' }
        }

        mockMessageEvents[index] = {
            ...mockMessageEvents[index],
            ...data
        }

        return { code: 0, msg: 'success' }
    },

    // Test send message
    async testMessageSend(payload: TestMessagePayload): Promise<ApiResponse<void>> {
        await delay(SIMULATE_DELAY)

        // Simulate finding the template
        const event = mockMessageEvents.find(e => e.eventCode === payload.eventCode)
        if (!event) {
            return { code: 404, msg: 'Event not found' }
        }

        // Usually we would send an API request here
        // For now we just return success
        return { code: 0, msg: 'success' }
    }
}
