import type { AgentReportRecord, AgentPlayerDetailRecord } from '@/types/agentReport'

// ==========================================
// 代理報表 Mock Data Generator
// ==========================================

const generateAgents = (count: number): AgentReportRecord[] => {
  const agents: AgentReportRecord[] = []
  let currentMasterId: string | null = null
  let currentLevel1Id: string | null = null
  let currentLevel2Id: string | null = null

  let currentMasterUid: string | null = null
  let currentLevel1Uid: string | null = null
  let currentLevel2Uid: string | null = null

  for (let i = 1; i <= count; i++) {
    const agentId = `AGT${i.toString().padStart(3, '0')}`
    const agentUid = (10000 + i).toString()
    
    let agentLevel = 1
    let parentAgentId: string | null = null
    let parentAgentUid: string | null = null
    let identityType: 'MASTER' | 'SUB' = 'MASTER'
    let agentUsername = ''
    let agentPath = ''

    const rem = i % 4
    if (rem === 1) {
      agentLevel = 1
      parentAgentId = null
      parentAgentUid = null
      currentMasterId = agentId
      currentMasterUid = agentUid
      identityType = 'MASTER'
      agentUsername = `master_agent_${i}`
      agentPath = `平台 > ${agentUsername}`
    } else if (rem === 2) {
      agentLevel = 2
      parentAgentId = currentMasterId
      parentAgentUid = currentMasterUid
      currentLevel1Id = agentId
      currentLevel1Uid = agentUid
      identityType = 'SUB'
      agentUsername = `sub_agent_L1_${i}`
      agentPath = `平台 > master_agent_${i-1} > ${agentUsername}`
    } else if (rem === 3) {
      agentLevel = 3
      parentAgentId = currentLevel1Id
      parentAgentUid = currentLevel1Uid
      currentLevel2Id = agentId
      currentLevel2Uid = agentUid
      identityType = 'SUB'
      agentUsername = `sub_agent_L2_${i}`
      agentPath = `平台 > master_agent_${i-2} > sub_agent_L1_${i-1} > ${agentUsername}`
    } else {
      agentLevel = 4
      parentAgentId = currentLevel2Id
      parentAgentUid = currentLevel2Uid
      identityType = 'SUB'
      agentUsername = `sub_agent_L3_${i}`
      agentPath = `平台 > master_agent_${i-3} > sub_agent_L1_${i-2} > sub_agent_L2_${i-1} > ${agentUsername}`
    }

    const seed = i * 13
    const totalDepositAmount = (seed % 100 + 10) * 5000
    const totalTurnoverAmount = totalDepositAmount * (3 + (seed % 4))
    const totalCommissionCost = Math.floor(totalDepositAmount * 0.03)
    const totalPromoDistributed = Math.floor(totalDepositAmount * 0.02)
    const ggr = Math.floor(totalDepositAmount * 0.15)
    const ngr = ggr - totalCommissionCost - totalPromoDistributed

    agents.push({
      agentId,
      agentUsername,
      agentUid,
      identityType,
      agentPath,
      agentLevel,
      parentAgentId,
      parentAgentUid,
      totalRegistrations: (seed % 50) + 5,
      totalFirstDepositors: (seed % 30) + 3,
      cpaQualifiedCount: (seed % 25) + 2,
      totalDepositAmount,
      totalTurnoverAmount,
      totalCommissionCost,
      totalPromoDistributed,
      ggr,
      ngr
    })
  }

  // 從下層往上層累加上級代理的數據
  // Level 4 -> Level 3 -> Level 2 -> Level 1
  for (let level = 4; level >= 2; level--) {
    const children = agents.filter(a => a.agentLevel === level)
    for (const child of children) {
      const parent = agents.find(a => a.agentId === child.parentAgentId)
      if (parent) {
        parent.totalRegistrations += child.totalRegistrations
        parent.totalFirstDepositors += child.totalFirstDepositors
        parent.cpaQualifiedCount += child.cpaQualifiedCount
        parent.totalDepositAmount += child.totalDepositAmount
        parent.totalTurnoverAmount += child.totalTurnoverAmount
        parent.totalCommissionCost += child.totalCommissionCost
        parent.totalPromoDistributed += child.totalPromoDistributed
        parent.ggr += child.ggr
        parent.ngr += child.ngr
      }
    }
  }

  return agents
}

export const mockAgentReportRecords: AgentReportRecord[] = generateAgents(35)

// 玩家對帳明細 Mock Data (依代理分組)
const generatePlayerDetails = (agentId: string, count: number): AgentPlayerDetailRecord[] => {
  const names = [
    'player_star', 'user_zeus', 'ace_winner', 'lucky_seven', 'golden_hand',
    'night_rider', 'thunder_bolt', 'ice_king', 'fire_fox', 'shadow_play',
    'wind_chaser', 'moon_light', 'sun_rise', 'ocean_wave', 'sky_dancer',
    'rock_solid', 'swift_arrow', 'iron_will', 'silver_fox', 'cloud_nine'
  ]
  return Array.from({ length: count }, (_, i) => {
    const seed = (i + 1) * 17 + parseInt(agentId.replace(/\D/g, '')) * 3
    const totalDeposit = (seed % 50 + 1) * 10000
    const firstDeposit = Math.floor(totalDeposit * 0.35)
    const secondDeposit = Math.floor(totalDeposit * 0.25)
    const totalBet = totalDeposit * (2 + (seed % 5))
    const validBet = Math.floor(totalBet * 0.88)
    const payout = Math.floor(totalBet * (0.85 + (seed % 10) / 100))
    let p2pAmount = 0
    if (seed % 3 === 0) {
      p2pAmount = (seed % 20 + 1) * 5000
      if (seed % 2 === 0) p2pAmount = -p2pAmount
    }
    return {
      playerId: `UID${10000 + parseInt(agentId.replace(/\D/g, '')) * 100 + i + 1}`,
      playerUsername: `${names[i % names.length]}_${i + 1}`,
      agentId,
      firstDepositAmount: firstDeposit,
      secondDepositAmount: secondDeposit,
      totalDepositAmount: totalDeposit,
      totalBetAmount: totalBet,
      totalValidBetAmount: validBet,
      totalPayoutAmount: payout,
      p2pTransactionAmount: p2pAmount,
      activityBonusUsed: Math.floor(totalDeposit * 0.08),
      promoReceived: Math.floor(totalDeposit * 0.05)
    }
  })
}

export const mockAgentPlayerDetails: Record<string, AgentPlayerDetailRecord[]> = {}
mockAgentReportRecords.forEach(agent => {
  // 為每個代理生成 10 ~ 50 筆不等的玩家明細
  const count = (parseInt(agent.agentId.replace(/\D/g, '')) % 40) + 10
  mockAgentPlayerDetails[agent.agentId] = generatePlayerDetails(agent.agentId, count)
})

