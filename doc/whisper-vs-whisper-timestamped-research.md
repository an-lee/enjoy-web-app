# Whisper vs Whisper_timestamped 调研报告

## 调研目的

对比 Whisper 和 whisper_timestamped 在 word-level 精度和输出结构上的差异，为项目选择最合适的方案。

## 当前项目状态

### 使用的模型
- **默认模型**: `onnx-community/whisper-tiny_timestamped`
- **可选模型**:
  - `onnx-community/whisper-base_timestamped`
  - `onnx-community/whisper-small_timestamped`

### 实现方式
- 使用 `@huggingface/transformers` 的 `pipeline('automatic-speech-recognition', ...)`
- 通过 `return_timestamps: 'word'` 获取词级时间戳
- 输出格式：`result.chunks` 数组，每个 chunk 包含：
  ```typescript
  {
    text: string,
    timestamp: [start: number, end: number]
  }
  ```

### 数据处理流程
项目已经实现了 `convertToTranscriptFormat` 函数（`src/ai/utils/transcript-segmentation.ts`），用于：
1. 将 word-level chunks 转换为 segment -> words 的嵌套结构
2. 智能分段（基于停顿、标点、词数等）
3. 生成符合 `TranscriptLine` 格式的时间线数据

## 技术对比

### 1. Whisper (标准版本)

#### 输出结构
- **Python transformers**: 支持 `segments` 数组，每个 segment 包含：
  ```python
  {
    "id": int,
    "start": float,
    "end": float,
    "text": str,
    "words": [
      {
        "word": str,
        "start": float,
        "end": float
      }
    ]
  }
  ```
- **transformers.js**: 只返回 word-level `chunks`，**不直接提供 segment 结构**
  ```javascript
  {
    text: string,
    chunks: [
      { timestamp: [start, end], text: string }
    ]
  }
  ```

#### 时间戳精度
- 基于注意力机制提取词级对齐信息
- 误差范围：**20-100 毫秒**
- 支持多语言（99 种语言）

#### 优势
- 在 Python 版本中提供原生的 segment -> words 结构
- 输出结构更符合语义层次
- 社区支持广泛

#### 劣势
- **transformers.js 版本不提供 segment 结构**，需要自行组装
- 词级时间戳精度可能略低于专门优化的版本

### 2. whisper_timestamped

#### 输出结构
- **仅提供 word-level 时间戳**
- 需要自行组装成 segment 结构
- 输出格式与标准 Whisper 在 transformers.js 中类似

#### 时间戳精度
- 使用动态时间规整（DTW）技术
- 利用交叉注意力权重预测时间戳
- 误差范围：**20-100 毫秒**（与标准 Whisper 相近）
- 提供置信度评分

#### 优势
- 专注于词级时间戳精度
- 提供置信度信息
- 在包含语音卡顿或填充词的情况下表现更好

#### 劣势
- **缺乏段落结构**，需要额外处理
- 需要自行组装 segment -> words 关系
- 社区支持相对较小

### 3. 在 transformers.js 中的实际情况

根据 Hugging Face transformers.js 文档：

1. **两种模型在 transformers.js 中的输出格式相同**
   - 都通过 `return_timestamps: 'word'` 返回 word-level chunks
   - **都不直接提供 segment 结构**
   - 都需要自行组装 segment -> words 关系

2. **timestamped 版本的优势**
   - 模型本身针对时间戳进行了优化
   - 可能在某些边缘情况下精度略高
   - 但差异不明显（都在 20-100ms 误差范围内）

## 精度对比总结

| 特性 | Whisper (标准) | whisper_timestamped |
|------|----------------|---------------------|
| Word-level 精度 | 20-100ms 误差 | 20-100ms 误差 |
| Segment 结构 | Python: 原生支持<br>JS: 需自行组装 | 需自行组装 |
| 置信度评分 | 无 | 有 |
| 多语言支持 | 99 种语言 | 99 种语言 |
| 社区支持 | 广泛 | 较小 |

## 项目需求分析

### 项目要求
1. ✅ **需要 segment -> words 的嵌套结构**
   - 用于语言学习的跟读功能
   - 需要句子级别的分段

2. ✅ **需要 word-level 时间戳**
   - 用于单词高亮和同步

3. ✅ **已有转换逻辑**
   - `convertToTranscriptFormat` 函数已经实现
   - 智能分段逻辑工作良好

### 当前方案评估

**优点**：
- ✅ 使用 timestamped 版本，时间戳精度有保障
- ✅ 已有完善的转换逻辑，可以生成 segment -> words 结构
- ✅ 代码已经稳定运行

**潜在改进**：
- 如果标准 Whisper 模型在 transformers.js 中也能提供相同精度，可以考虑切换
- 但需要实际测试验证精度差异

## 建议

### 推荐方案：**继续使用当前的 whisper_timestamped 版本**

#### 理由：

1. **输出格式相同**
   - 在 transformers.js 中，两种模型都只返回 word-level chunks
   - 都需要通过 `convertToTranscriptFormat` 组装 segment 结构
   - 切换模型不会带来结构上的优势

2. **精度保障**
   - timestamped 版本专门针对时间戳优化
   - 虽然精度差异不大，但 timestamped 版本更可靠
   - 提供置信度信息（虽然当前未使用，但未来可能有用）

3. **代码稳定性**
   - 当前实现已经稳定运行
   - 转换逻辑已经完善
   - 切换模型需要重新测试，风险大于收益

4. **项目需求匹配**
   - 项目需要的是 word-level 精度，两种模型都能满足
   - 项目需要 segment 结构，两种模型都需要自行组装
   - 当前方案已经很好地满足了需求

### 可选方案：测试标准 Whisper 模型

如果希望验证标准 Whisper 模型是否足够：

1. **测试步骤**：
   - 将模型切换为 `onnx-community/whisper-tiny`（非 timestamped）
   - 使用相同的 `return_timestamps: 'word'` 参数
   - 对比时间戳精度和识别准确率

2. **评估指标**：
   - 时间戳精度（与参考时间戳对比）
   - 识别准确率
   - 性能（推理速度、内存占用）

3. **如果标准版本表现相当**：
   - 可以考虑切换（模型文件可能更小）
   - 但需要充分测试确保稳定性

### 不推荐：切换到 Python 版本的 Whisper

虽然 Python 版本的 Whisper 提供原生 segment 结构，但：
- 项目是浏览器端应用，需要 JavaScript 实现
- 使用 Python 需要额外的服务端架构
- 当前方案已经很好地解决了问题

## 结论

**建议继续使用当前的 `whisper_timestamped` 版本**，原因：

1. ✅ 在 transformers.js 中，两种模型的输出格式相同
2. ✅ timestamped 版本在时间戳精度上有专门优化
3. ✅ 项目已有完善的转换逻辑，可以生成所需的 segment -> words 结构
4. ✅ 当前方案稳定可靠，切换风险大于收益

**如果未来需要优化**：
- 可以考虑测试标准 Whisper 模型，验证精度是否相当
- 如果标准版本表现更好，可以考虑切换以减小模型体积
- 但需要充分测试确保不影响现有功能

## 参考资料

1. [Hugging Face Transformers.js Documentation](https://huggingface.co/docs/transformers.js)
2. [Whisper Model Architecture](https://arxiv.org/abs/2212.04356)
3. [Word-level Timestamp Extraction from Whisper](https://arxiv.org/abs/2509.09987)
4. [CrisperWhisper: Improving Word-level Timestamp Accuracy](https://arxiv.org/abs/2408.16589)

