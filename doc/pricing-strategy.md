# 定价策略分析（Credits 模型）

## 应用功能概述

Enjoy Echo 是一个语言学习应用，提供以下 AI 服务（所有用量最终统一折算为 **Credits**）：

1. **Translation（基础翻译）** - 快速翻译短文本，使用 Cloudflare Workers AI `m2m100-1.2b`
2. **Smart Translation（智能翻译）** - 带风格和上下文的 LLM 翻译，使用 `cf/meta/llama-3.1-8b-instruct-fp8-fast`
3. **Dictionary（智能词典）** - 上下文敏感的词汇解释与例句，使用 LLM
4. **ASR（语音识别）** - 使用 Whisper 模型（Cloudflare Workers AI）进行语音转文本
5. **TTS（语音合成）** - 文本转语音，主要使用 Azure Speech Service（Neural TTS）
6. **Assessment（发音评估）** - 使用 Azure Speech Service 的发音评估能力

> 产品对用户展示的是「功能 + 次数/分钟/大致用量」，但在实现和成本层面，全部折算为 Credits 做统一管理。

---

## 第三方服务成本（基础数据）

这部分用于推导 Credits 映射，不直接展示给终端用户。

### Cloudflare Workers AI

#### 1. Translation（m2m100-1.2b）

- **价格**：$0.342 / 1M input tokens，$0.342 / 1M output tokens
- **平均成本**：假设输入/输出各 100 tokens：
  - 成本 ≈ \((100 × 0.342 + 100 × 0.342) / 1,000,000 ≈ \$0.000068/次\)
- **结论**：成本极低，可以视为「几乎免费」，只需限制单次最大字符数即可。

#### 2. Smart Translation & Dictionary（cf/meta/llama-3.1-8b-instruct-fp8-fast）

- **价格**：$0.045 / 1M input tokens，$0.384 / 1M output tokens
- **典型调用场景**：
  - 输入 500 tokens（上下文 + 待翻译内容）
  - 输出 300 tokens（翻译结果/解释）
- **单次成本估算**：
  - 成本 = \((500 × 0.045 + 300 × 0.384) / 1,000,000\)
  - = \((22.5 + 115.2) / 1,000,000 ≈ 137.7 / 1,000,000 ≈ \$0.000138/次\)

### 3. ASR – Whisper

- **价格**：约 $0.0005 / 音频分钟
- **典型调用**：1 分钟语音 ≈ **$0.0005**

### 4. TTS – Azure Speech Service（Neural TTS）

- **价格**：$15.00 / 1,000,000 字符（按字符计费）
- **换算**：$15 / 1,000,000 = **$0.000015 / 字符**
- **典型调用估算**：
  - 100 字符（短句） → $0.0015
  - 150 字符（平均一句） → $0.00225
  - 500 字符（长句/短段落） → $0.0075

### 5. Pronunciation Assessment – Azure Speech Service

- **价格**：约 $1.30 / 小时
- **换算**：
  - $1.30 / 3600 秒 ≈ $0.00036 / 秒
  - 15 秒评估 → 约 $0.0054 / 次

---

## Credits 模型设计

### 1. 1 Credit 的含义

为方便计算和实现，约定：

- **1 Credit ≈ $0.00001 成本**（1e-5 美元）

则：

- 100,000 Credits ≈ **$1 成本**
- 1,000,000 Credits ≈ **$10 成本**

后续所有资源的计费与限额，全部通过「资源 → Credits」的映射来实现。

### 2. 各资源到 Credits 的映射

> 实现约束（强烈建议写进后端逻辑）：
>
> - **Credits 以整数扣减**（避免浮点误差与“0 成本请求”被刷爆）。
> - 对所有映射先算 `rawCredits`，再统一做 `credits = ceil(rawCredits)`。
> - 若需要更精细可用 fixed-point（例如用 `centiCredits = Credits * 100` 存储与计算），但对外仍展示整数 Credits。

#### 2.1 TTS（按字符计）

- 第三方成本：$0.000015 / 字符
- Credits 映射（提高安全边际与毛利）：

\[
1 \text{ 字符 TTS} = 3 \text{ Credits} \quad(\approx \$0.00003)
\]

- 例：150 字符一句 → 150 × 3 = **450 Credits**（≈ $0.0045）

#### 2.2 Assessment（按次，前端限制每次 ≤ 30 秒）

- 价格换算：$1.30 / 小时 → $0.00036 / 秒
- 因为评估时长可变（并且你已限制单次 ≤ 30 秒），**建议按秒计费**，并留出更高安全边际：

\[
  \text{AssessmentCredits} = \lceil 50 \times \text{seconds} \rceil, \quad 1 \le \text{seconds} \le 30
\]

- 解释：
  - 成本等价约为 $36 Credits/秒（因为 $0.00036 / 秒 ÷ $0.00001 / Credit）
  - 取 **50 Credits/秒** 作为更保守的 buffer（约 35–40% buffer）
- 例：
  - 15 秒：`ceil(50×15)=750 Credits`
  - 30 秒：`ceil(50×30)=1,500 Credits`

#### 2.3 ASR（按分钟计）

- 成本：约 $0.0005 / 分钟

\[
1 \text{ 分钟 ASR} = 80 \text{ Credits} \quad(\approx \$0.0008)
\]

- 实现建议按秒统计并向上取整：

\[
  \text{ASRCredits} = \left\lceil 80 \times \frac{\text{seconds}}{60} \right\rceil
\]

> 不建议固定 1 Credit/秒（那会把成本放大到 $0.0006/分钟），也不建议过粗粒度（会造成短音频不公平）。

#### 2.4 基础翻译（Translation，按次 + 字符上限）

基础翻译使用 m2m100，成本极低，可以视为几乎免费，只需防止极端大文本拖垮成本。

- 规则：
  - 每次请求基础消耗：**15 Credits**
  - 每 1,000 字符附加：**15 Credits**（按字符数向上取整到 1,000 的倍数）
- 例：
  - 300 字符短句：15 + 1×15 = 30 Credits
  - 2,000 字符短文：15 + 2×15 = 45 Credits

#### 2.5 LLM 请求（Smart Translation / Dictionary 等，按 tokens 计）

- 在 `cf/meta/llama-3.1-8b-instruct-fp8-fast` 下，典型 500 in + 300 out 成本约 $0.000138。
- 该模型的标价为：$0.045 / 1M input tokens，$0.384 / 1M output tokens。
- 成本等价的 Credits 基准约为：
  - input：$0.045 / 1M → $4.5e-8 / token → **0.0045 Credits/token**
  - output：$0.384 / 1M → $3.84e-7 / token → **0.0384 Credits/token**

为简化实现与风控（避免大量极小请求被刷爆、避免浮点扣减），建议采用：**较高最小请求费 + 线性 token 费 + 向上取整**。

\[
  \text{LLMCredits} = \left\lceil 8 + 0.012 \times \text{tokensIn} + 0.08 \times \text{tokensOut} \right\rceil
\]

- 这组系数相当于对真实成本留出约 2–3x 的 buffer（随 tokensOut 占比变化）。
- 例：500 in + 300 out：
  - `ceil(8 + 0.012×500 + 0.08×300) = ceil(8 + 6 + 24) = 38 Credits`
  - 成本 ≈ 38 × 1e-5 = **$0.00038**（相较 $0.000138 具有更充足的冗余与毛利）

> 实现建议：优先使用供应商返回的真实 tokens；并设置 `max_output_tokens`（例如 512/1024）作为硬风控。

> 实现建议：在后端实现统一的 `calculateCredits()`，接受 `{ type, chars, seconds, tokensIn, tokensOut }`，计算本次请求对应的 Credits 并在用户账户中扣减。

---

## 用户使用场景（Credits 视角）

### 1. 轻度用户（Free 画像）

**典型「有学习的一天」**：

- Translation：8 次，每次约 300 字符
  → 每次约 30 Credits，合计 ≈ **240 Credits**
- Smart Translation：1 次（中短文本）
  → 约 **38 Credits**
- Dictionary：4 次（短查询）
  → 每次约 20 Credits，合计 ≈ **80 Credits**
- ASR：1 分钟 → 1 × 80 = **80 Credits**
- TTS：1 句，每句 150 字符
  → 150 × 3 = **450 Credits**
- Assessment：0 次

**合计**：约 **888 Credits / 活跃日**

若 Free 每日配额为 **1,000 Credits**，轻度用户在有学习的日子能覆盖核心体验，但会自然引导重度用户升级。

**月度成本估算（考虑使用率）**：

- 假设 Free 用户每月约 30–40% 天数有学习：
  - 月均消耗 ≈ 1,000 × 30 × 0.35 ≈ 10,500 Credits
  - 月成本 ≈ 10,500 × 1e-5 ≈ **$0.105**
- 实际情况更保守，目标真实成本 ≈ **$0.05–0.15 / 月 / 活跃用户**。

---

### 2. 中度用户（Pro 画像）

**典型「认真学习的一天」**：

- Translation：80 次 → 80 × 30 ≈ **2,400 Credits**
- Smart Translation：30 次（典型中短） → 约 **900–1,300 Credits**
- Dictionary：50 次（短查询） → 约 **750–1,500 Credits**
- ASR：20 分钟 → 20 × 80 = **1,600 Credits**
- TTS：40 句，总计约 6,000 字符 → 6,000 × 3 = **18,000 Credits**
- Assessment：20 次（每次 15 秒） → 20 × 750 = **15,000 Credits**

**合计**：约 **38,000–40,000 Credits / 高强度学习日**

若 Pro 每日配额为 **60,000 Credits / 天**：

- 高强度学习日使用率约 50%
- 假设每月 50% 天数为「高强度日」，其余天数更少用：
  - 月均消耗大致在 800k–1,000k Credits 范围
  - 理论成本 ≈ $8–10 / 月 上限
  - 结合真实行为与冗余，目标实际成本 ≈ **$5–6 / 月**

---

### 3. 重度用户（Ultra 画像）

**典型「每天认真学」**：

- Translation：150 次 → ~**4,500 Credits**
- Smart Translation：80 次 → 约 **2,400–3,600 Credits**
- Dictionary：150 次 → 约 **2,250–4,500 Credits**
- ASR：60 分钟 → 60 × 80 = **4,800 Credits**
- TTS：120 句，约 18,000 字符 → 18,000 × 3 = **54,000 Credits**
- Assessment：60 次（每次 15 秒） → 60 × 750 = **45,000 Credits**

**合计**：约 **113,000–120,000 Credits / 日**

若 Ultra 每日配额为 **150,000 Credits / 天**：

- 高强度日使用约 50–60%
- 若重度用户每月 60–70% 天数为高强度日：
  - 月均消耗 ≈ 2.5M–3.0M Credits
  - 成本 ≈ $25–30
  - 通过调整 Credits 映射（尤其是 TTS、Assessment）和利用真实使用率，目标实际成本控制在 **$18–22 / 月**。

---

## 三档定价方案（基于 Credits）

### 各档位最大使用量（典型单位）

> 说明：下表的“最大使用量”指 **在一天内几乎只用该项服务** 时的上限估算；“典型单位”用于把 Credits 换算成用户能理解的次数/分钟/字符。

**典型单位假设（可按产品 UI 口径调整）**：

- Translation：每次 300 字符（按「15 Credits/次 + ceil(chars/1000)×15 Credits」计算，约 30 Credits/次）
- Smart Translation：500 tokens in + 300 tokens out（约 38 Credits/次）
- Dictionary：250 tokens in + 120 tokens out（约 21 Credits/次）
- ASR：按分钟展示（80 Credits/分钟）
- TTS：按字符展示（3 Credits/字符）；同时给出“150 字符/句”的句子数
- Assessment：按时长计费（50 Credits/秒）；同时给出“15 秒/次”的次数

| 服务 | 典型单位（展示口径） | Free（1,000/天）最大 | Pro（60,000/天）最大 | Ultra（150,000/天）最大 |
|---|---:|---:|---:|---:|
| Translation | 300 字符/次（≈ 30 Credits） | 33 次/天 | 2,000 次/天 | 5,000 次/天 |
| Smart Translation | 500 in + 300 out /次（≈ 38 Credits） | 26 次/天 | 1,578 次/天 | 3,947 次/天 |
| Dictionary | 250 in + 120 out /次（≈ 21 Credits） | 47 次/天 | 2,857 次/天 | 7,142 次/天 |
| ASR | 分钟 | 12 分钟/天 | 750 分钟/天（≈ 12.5 小时） | 1,875 分钟/天（≈ 31.25 小时） |
| TTS | 字符 | 333 字符/天（≈ 2 句/天） | 20,000 字符/天（≈ 133 句/天） | 50,000 字符/天（≈ 333 句/天） |
| Assessment | 15 秒/次 | 1 次/天 | 80 次/天 | 200 次/天 |

### 💡 Free Tier – $0 / 月

**定位**：体验 & 拉新，让用户形成使用习惯。

- **每日 Credits 配额**：**1,000 Credits / 天**

**典型可用行为示例**：

- 0–1 次短时发音评估（例如 8–15 秒，约 400–750 Credits）
- 1–2 句短语 TTS（总共 ~150–300 字符 → 450–900 Credits）
- 少量 Translation / Dictionary / Smart Translation 零散使用

**成本估算**：

- 按 30–40% 活跃日计算：
  - 月均消耗 ≈ 1,000 × 30 × 0.35 ≈ 10,500 Credits
  - 成本 ≈ **$0.105 / 月**
- 实际更多用户偏轻度，目标真实成本：**$0.05–0.15 / 月 / 活跃用户**。

**策略**：

- 不在 UI 中突出 Credits 数字，只展示「大致每天能做的事情」。
- 提示重度用户升级 Pro 以获得约 60x 的每日 Credits。

**前端展示文案（示例）**：

- 「Free 版适合日常轻量练习。每天大约可以完成 **0–1 次短时发音评估**、**1–2 句短语的高质量 TTS 朗读**，以及 **若干次翻译和词典查询**，帮助你轻松体验核心功能。」

---

### 🚀 Pro Tier – $9.99 / 月

**定位**：日常学习的主力档，覆盖大多数付费用户。

- **每日 Credits 配额**：**60,000 Credits / 天**

**大致可用范围示例**（用户可自由组合）：

- 发音评估为主：
  - **最多 ~80 次（按 15 秒/次计）**：80 × 750 = 60,000 Credits
  - 若评估更长（例如 30 秒/次），将按秒计费等比例增加，建议 UI 侧提示“评估时长越长消耗越多”。
- 听力/TTS 为主：
  - ~15,000 字符 TTS：15,000 × 3 = 45,000 Credits（其余 15,000 给 Assessment / LLM / ASR）
- 混合使用（典型中度用户）：
  - 20 次 Assessment（15 秒/次）→ 15,000 Credits
  - 40 句 TTS（6,000 字符）→ 18,000 Credits
  - 30 分钟 ASR → 2,400 Credits
  - 100 次 LLM 短请求 → ~1,500–2,500 Credits
  - 大量 Translation / Dictionary 零散使用

**成本估算**：

- 理论打满：60,000 × 30 = 1,800,000 Credits → 成本 ≈ **$18 / 月**
- 实际使用率按 50% 计：
  - 月均消耗 ≈ 900,000 Credits → 成本 ≈ **$9 / 月 上限**
  - 考虑冗余与真实行为，目标实际成本 ≈ **$5–6 / 月**

**毛利率与定价逻辑**：

- 定价 **$9.99 / 月**，对应健康的 **40–50% 毛利率**。
- Credits 机制确保在高使用率用户中，整体成本仍可控。

**前端展示文案（示例）**：

- 「Pro 版适合认真学习的用户。每天大约可以完成 **数十次发音评估**、**几十句中长文本的 TTS 听力练习**、**数十分钟的听力/ASR 练习**，同时还能进行 **大量智能翻译和词典查询**，支持系统性的学习计划。」

---

### 💎 Ultra Tier – $29.99 / 月

**定位**：教师、重度语言学习者、专业用户。

- **每日 Credits 配额**：**150,000 Credits / 天**

**大致可用范围示例**：

- 极限发音训练：
  - 200 次 Assessment（按 15 秒/次计）：200 × 750 = 150,000 Credits
- 极限 TTS 使用：
  - 50,000 字符 TTS：50,000 × 3 = 150,000 Credits
- 更现实的重度混合：
  - 70 次 Assessment（15 秒/次）→ 52,500 Credits
  - 25,000 字符 TTS → 75,000 Credits
  - 60 分钟 ASR → 4,800 Credits
  - LLM / Translation / Dictionary 混合使用 → 15,000+ Credits

**成本估算**：

- 理论打满：150,000 × 30 = 4,500,000 Credits → 成本 ≈ **$45 / 月**
- 假设实际使用率 ~60%：
  - 月均消耗 ≈ 2,700,000 Credits → 成本 ≈ **$27 / 月**
- 通过略微调低 TTS / Assessment 的 Credits 单价（如 TTS 1 字符 = 1.6 Credits，Assessment 1 次 = 500 Credits）和依赖真实行为偏保守，目标实际成本控制在 **$18–22 / 月**。

**毛利率与定价逻辑**：

- 定价 **$29.99 / 月**，目标 **约 40% 毛利率**。
- Ultra 强调「发音评估 + 听力/TTS + 大量 LLM 请求」等重度场景。

**前端展示文案（示例）**：

- 「Ultra 版面向教师和重度学习者。每天大约可以完成 **上百次发音评估**、**上百句长文本的 TTS 听力输入**、**长时间的听力/跟读练习**，并搭配 **大量智能翻译、改写和词典查询**，满足高强度教学与深度自学需求。」

---

## 定价策略说明与竞品对比

### 1. 毛利率目标

- 目标毛利率：**40–50%**
- 覆盖：
  - 第三方 AI 服务成本（Cloudflare Workers、Azure 等）
  - 自有基础设施与开发成本
  - 客户支持、营销成本

Credits 映射中普遍设置了略高于真实成本的换算（例如 LLM、TTS、Assessment），用于对冲价格波动和极端使用。

### 2. 价格锚定

- **Free**：$0，用于产品体验和获客。
- **Pro（$9.99）**：对标常见 SaaS 订阅（Spotify、Netflix Basic 等）。
- **Ultra（$29.99）**：对标高价值工具（Grammarly Premium 等）。

### 3. 竞品对比（价格维度）

| 服务             | Free | Pro           | Premium      |
|------------------|------|---------------|--------------|
| **Enjoy Echo**   | $0   | **$9.99**     | **$29.99**   |
| Duolingo         | $0   | $12.99        | -            |
| Grammarly        | $0   | -             | ~$30 / 月    |
| ChatGPT Plus     | -    | $20 / 月      | -            |
| DeepL            | $0   | ~$8.74        | ~$34.74      |

Enjoy Echo 的 Pro / Ultra 定价在同类产品中有竞争力，Credits 机制使得在提供较高可用量的同时，成本可控。

---

## 防滥用与调整策略

### 1. 防滥用

- 所有请求在进入核心服务前，统一通过 Credits 检查：
  - 计算本次请求所需 Credits
  - 若账户剩余 Credits 不足 → 返回 429 + 引导升级 / 次日重置
- 同时建议加入“硬上限”风控（比单纯涨价更稳定）：
  - LLM：限制 `max_input_chars`、`max_output_tokens`、以及单位时间请求次数
  - TTS：限制 `max_chars_per_request`（尤其是长段落）
  - ASR/Assessment：限制 `max_seconds_per_request` 与并发数
- 每日 UTC 重置 Credits（可在配置中调整时区）
- BYOK（自带 API Key）用户可以不计入 Credits，直接由用户承担第三方成本。

### 2. 价格/成本波动时的调参方式

当第三方成本变化时，可以通过以下方式微调，而无需改动产品文案：

- 调整「资源 → Credits」的映射系数：
  - 如 TTS 1 字符从 3 Credits 调整为 3.3 Credits
  - LLM 的 `tokensOut` 系数从 0.08 调整为 0.10
- 或调整各档的每日 Credits 总量：
  - 如 Pro 从 60,000 调整为 55,000 / 天
  - Ultra 从 150,000 调整为 140,000 / 天

### 3. 增长策略

- **Free**：用于获客，给予足够 Credits 让用户体验所有功能（尤其是发音评估和 TTS）。
- **Pro**：主要收入来源，目标转化率 15–20%。
- **Ultra**：高价值用户，目标转化率 2–5%，重点面向教师和专业学习者。

---

## 实施建议

1. **后端实现 Credits 账户系统**
   - 按用户 / 订阅等级维护 `dailyCreditsLimit` 与 `remainingCredits`
   - 每日定时重置（或滚动窗口）
  - 所有 AI 请求统一调用 `calculateCredits()` 和 `deductCredits()`（返回整数 Credits；内部可用 fixed-point 避免浮点）
2. **前端展示**
   - 对大多数用户仅展示「大致可用量」与「今日剩余使用次数/分钟/大致估算」
   - 在高级设置中展示剩余 Credits 数值和各操作的 Credits 消耗表。
3. **监控与调整**
   - 建立按 Tier 的月度 Credits 消耗统计与第三方账单对照表
   - 若某一功能成本显著高于预期，及时调整对应 Credits 映射或每日 Credits 总额。

---

*最后更新：2025-12-18*
*本版本：采用 Credits 模型统一管理 TTS / ASR / Assessment / 翻译 / LLM 成本与配额*