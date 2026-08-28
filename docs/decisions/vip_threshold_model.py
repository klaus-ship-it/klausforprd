import math, random, statistics, json

N = 16  # VIP0..VIP15

# ---- 1. 晉升門檻（終生累積儲值 / 流水）----
# 錨點：VIP1 儲值門檻沿用三份既有文件都一致同意的 1,000（唯一三方一致的數字，作為起點錨定合理）
# 目標：VIP15 儲值門檻抓在 150 萬（對齊新版規格書量級，代表「頂級鯨魚」門檻），中間用等比成長
base_deposit = 1000
target_deposit_15 = 1_500_000
growth_deposit = (target_deposit_15 / base_deposit) ** (1 / 14)  # tier1 -> tier15, 14 步

deposit = [0] * N
for i in range(1, N):
    deposit[i] = base_deposit * growth_deposit ** (i - 1)

# 流水倍率：假設「等級越高，資金週轉率越高」，倍率從 10x（VIP1）線性長到 18x（VIP15）
def turnover_multiplier(i):
    if i == 0:
        return 0
    return 10 + (i - 1) / 14 * 8

turnover = [0] * N
for i in range(1, N):
    turnover[i] = deposit[i] * turnover_multiplier(i)

# ---- 2. 保級門檻：抓月累積儲值/流水為終生門檻的 50%（沿用規格書一貫比例）----
retain_deposit = [d * 0.5 for d in deposit]
retain_turnover = [t * 0.5 for t in turnover]

# 活躍天數：VIP0~2 無保級(is_perpetual)，VIP3 起從 8 天線性長到 VIP15 的 28 天
def active_days(i):
    if i <= 2:
        return 0
    return round(8 + (i - 3) / 12 * 20)

# ---- 3. 手續費（P2P贈禮）：VIP2 開始 2.0% 線性遞減到 VIP10+ 為 0% ----
def fee_rate(i):
    if i < 2:
        return 0.0
    if i >= 10:
        return 0.0
    return round(2.0 - (i - 2) / 8 * 2.0, 2)

# ---- 4. 投注返水：VIP1 起 0.1% 線性長到 VIP15 的 1.5% ----
def rebate_rate(i):
    if i == 0:
        return 0.0
    return round(0.1 + (i - 1) / 14 * 1.4, 2)

# ---- 5. 一次性升級獎勵：抓「月保級儲值門檻」的 10%，四捨五入到好記數字 ----
def nice_round(x):
    if x <= 0:
        return 0
    magnitude = 10 ** (len(str(int(x))) - 2)
    return int(round(x / magnitude) * magnitude)

reward_amount = [0] * N
reward_currency = [None] * N
for i in range(1, N):
    raw = retain_deposit[i] * 0.10 if retain_deposit[i] > 0 else deposit[i] * 0.10
    amt = nice_round(raw)
    reward_amount[i] = amt
    reward_currency[i] = 'BRONZE' if i <= 2 else 'SILVER'

# ---- 輸出草案表 ----
rows = []
for i in range(N):
    rows.append({
        'rank': i,
        'promo_deposit': nice_round(deposit[i]),
        'promo_turnover': nice_round(turnover[i]),
        'retain_deposit': nice_round(retain_deposit[i]),
        'retain_turnover': nice_round(retain_turnover[i]),
        'retain_active_days': active_days(i),
        'gift_fee_rate': fee_rate(i),
        'rebate_rate': rebate_rate(i),
        'reward_currency': reward_currency[i],
        'reward_amount': reward_amount[i],
    })

print("=== VIP 門檻草案表 ===")
print(f"{'VIP':<4}{'晉升儲值':>12}{'晉升流水':>14}{'保級儲值':>12}{'保級流水':>14}{'活躍天':>6}{'手續費%':>8}{'返水%':>7}{'升級獎勵':>16}")
for r in rows:
    reward_str = f"{r['reward_currency']}{r['reward_amount']:,}" if r['reward_amount'] else '-'
    print(f"{r['rank']:<4}{r['promo_deposit']:>12,}{r['promo_turnover']:>14,}{r['retain_deposit']:>12,}{r['retain_turnover']:>14,}{r['retain_active_days']:>6}{r['gift_fee_rate']:>8}{r['rebate_rate']:>7}{reward_str:>16}")

# ---- 數學合理性檢查 ----
print("\n=== 合理性檢查 ===")
ok = True
for i in range(1, N):
    if rows[i]['promo_deposit'] <= rows[i-1]['promo_deposit']:
        print(f"FAIL: promo_deposit 在 VIP{i} 沒有嚴格遞增"); ok = False
    if rows[i]['promo_turnover'] <= rows[i-1]['promo_turnover']:
        print(f"FAIL: promo_turnover 在 VIP{i} 沒有嚴格遞增"); ok = False
    if i >= 3 and rows[i]['retain_deposit'] > rows[i]['promo_deposit']:
        print(f"FAIL: VIP{i} 保級門檻高於晉升門檻，邏輯矛盾"); ok = False
print("全部通過單調遞增與保級<晉升檢查" if ok else "有檢查失敗，需修正模型")

# ---- 模擬驗證：合成一批玩家（log-normal 分布儲值），估算門檻下的等級分布 ----
random.seed(42)
POP = 200000
# log-normal 參數調到讓中位數玩家終生儲值約在 300~500 左右（貼近多數玩家是小額玩家的常見分布）
mu, sigma = math.log(400), 1.3
sim_deposits = [random.lognormvariate(mu, sigma) for _ in range(POP)]
# 假設流水約為儲值的 12 倍（貼近上面 turnover_multiplier 的平均值），加上隨機擾動
sim_turnovers = [d * random.uniform(8, 16) for d in sim_deposits]

def tier_of(dep, tov):
    tier = 0
    for i in range(1, N):
        if dep >= rows[i]['promo_deposit'] and tov >= rows[i]['promo_turnover']:
            tier = i
        else:
            break
    return tier

tier_counts = [0] * N
for d, t in zip(sim_deposits, sim_turnovers):
    tier_counts[tier_of(d, t)] += 1

print("\n=== 模擬 20 萬玩家在此門檻下的等級分布（驗證用，非真實數據）===")
for i in range(N):
    pct = tier_counts[i] / POP * 100
    print(f"VIP{i:<3} {tier_counts[i]:>7,} 人  ({pct:5.2f}%)")

print(f"\n中位數模擬儲值: {statistics.median(sim_deposits):,.0f}")
print(f"平均模擬儲值: {statistics.mean(sim_deposits):,.0f}")
print(f"VIP5 以上人數佔比: {sum(tier_counts[5:])/POP*100:.2f}%")
print(f"VIP10 以上人數佔比: {sum(tier_counts[10:])/POP*100:.2f}%")

with open('/private/tmp/claude-501/-Users-cooperfu-Projects-Yota-operations-main/35d3b4e6-12bc-46aa-91ce-045137b04041/scratchpad/vip_model_output.json', 'w') as f:
    json.dump(rows, f, ensure_ascii=False, indent=2)
