# Player Store 重构方案

## 1. 当前问题分析

### 1.1 违反单一职责原则 (SRP)
当前的 `player.ts` store 管理了过多关注点：
- UI 状态（mode, isPlaying, isTranscribing）
- 会话状态（currentSession, currentEchoSessionId）
- 播放设置（volume, playbackRate, repeatMode）
- Echo 模式状态
- 媒体控制（通过 ref）
- 录音控制
- 转录状态

**问题**：一个 store 承担了太多职责，导致：
- 难以维护和测试
- 状态更新可能触发不必要的重渲染
- 难以独立优化各个功能模块

### 1.2 异步操作处理不当
```typescript
// ❌ 问题：Zustand action 不应该是 async 的
setVolume: async (volume: number) => { ... }
setPlaybackRate: async (rate: number) => { ... }
loadMedia: async (media: LibraryMedia) => { ... }
```

**问题**：
- Zustand 的 action 函数不应该是 async 的
- 异步副作用应该通过其他方式处理（如 React Query、useEffect、或专门的 service 层）
- 错误处理分散，难以统一管理

### 1.3 副作用与状态管理混合
```typescript
// ❌ 问题：数据库操作直接混在 action 中
setVolume: async (volume: number) => {
  set({ volume: clampedVolume })
  // 数据库操作混在状态更新中
  await updateEchoSessionProgress(...)
}
```

**问题**：
- 违反了关注点分离原则
- 难以测试（需要 mock 数据库）
- 难以处理错误和重试逻辑

### 1.4 内部状态管理不当
```typescript
// ❌ 问题：Ref 和函数不应该存在 store 中
_mediaRef: RefObject<HTMLAudioElement | HTMLVideoElement | null> | null
_recordingControls: { ... } | null
```

**问题**：
- React Refs 不应该存储在 Zustand store 中
- 控制函数应该通过 React Context 或组件 props 传递
- 这会导致序列化问题（persist middleware）

### 1.5 状态持久化策略不清晰
```typescript
// ❌ 问题：部分状态应该持久化，部分不应该
partialize: (state) => ({
  volume: state.volume,
  playbackRate: state.playbackRate,
  repeatMode: state.repeatMode,
  // 但 session 状态通过 EchoSession 持久化，逻辑分散
})
```

**问题**：
- 持久化逻辑分散（localStorage + 数据库）
- 难以理解哪些状态会被持久化
- 可能导致状态不一致

### 1.6 跨 Store 依赖
```typescript
// ❌ 问题：在 action 中直接访问其他 store
const echoSessionId = usePlayerSessionStore.getState().currentEchoSessionId
```

**问题**：
- 创建了隐式依赖
- 难以追踪数据流
- 可能导致循环依赖

## 2. React + Zustand 最佳实践

### 2.1 Store 设计原则

1. **单一职责**：每个 store 只管理一个关注点
2. **同步 Actions**：Actions 应该是同步的，副作用通过其他方式处理
3. **最小化状态**：只存储必要的状态，不存储 Refs 或函数
4. **清晰的持久化策略**：明确哪些状态需要持久化
5. **类型安全**：充分利用 TypeScript 类型系统

### 2.2 异步操作处理

**推荐模式**：
```typescript
// ✅ 方式 1：使用 React Query 处理异步操作
const { mutate: loadMedia } = useMutation({
  mutationFn: async (media: LibraryMedia) => {
    // 异步操作
    const session = await createSession(media)
    // 更新 store（同步）
    usePlayerStore.getState().setSession(session)
  }
})

// ✅ 方式 2：在组件中处理异步，只更新 store
const handleLoadMedia = async (media: LibraryMedia) => {
  try {
    const session = await loadMediaFromDB(media)
    usePlayerStore.getState().setSession(session)
  } catch (error) {
    // 错误处理
  }
}

// ✅ 方式 3：使用 service 层
class PlayerService {
  async loadMedia(media: LibraryMedia) {
    const session = await this.db.createSession(media)
    usePlayerStore.getState().setSession(session)
  }
}
```

### 2.3 副作用分离

**推荐模式**：
```typescript
// ✅ Store 只管理状态
const usePlayerStore = create<PlayerState>((set) => ({
  volume: 1,
  setVolume: (volume: number) => set({ volume }),
}))

// ✅ 副作用在 hook 或 service 中处理
function usePlayerVolume() {
  const volume = usePlayerStore((s) => s.volume)
  const setVolume = usePlayerStore((s) => s.setVolume)
  const sessionId = usePlayerSessionStore((s) => s.currentEchoSessionId)

  useEffect(() => {
    if (sessionId) {
      updateEchoSessionProgress(sessionId, { volume })
    }
  }, [volume, sessionId])

  return { volume, setVolume }
}
```

## 3. 重构方案

### 3.1 Store 分离策略

基于单一职责原则，将 `player.ts` 拆分为以下 stores：

```
src/page/stores/player/
├── index.ts                    # 统一导出
├── types.ts                    # 共享类型定义
├── player-ui-store.ts          # ✅ UI 状态（已存在）
├── player-session-store.ts    # ✅ 会话状态（已存在）
├── player-settings-store.ts   # ✅ 播放设置（已存在）
├── player-echo-store.ts        # Echo 模式状态
├── player-media-store.ts       # 媒体控制（简化版，不存储 ref）
└── player-transcription-store.ts # 转录状态
```

### 3.2 各 Store 职责划分

#### 3.2.1 Player UI Store (`player-ui-store.ts`)
**职责**：管理 UI 相关的状态
- `mode`: 'mini' | 'expanded'
- `isPlaying`: boolean
- `isTranscribing`: boolean
- `transcribeProgress`: string | null
- `transcribeProgressPercent`: number | null

**特点**：
- 不持久化（UI 状态）
- 纯同步操作

#### 3.2.2 Player Session Store (`player-session-store.ts`)
**职责**：管理播放会话状态
- `currentSession`: PlaybackSession | null
- `currentEchoSessionId`: string | null

**特点**：
- 不持久化（通过 EchoSession 数据库持久化）
- 纯同步操作

#### 3.2.3 Player Settings Store (`player-settings-store.ts`)
**职责**：管理播放设置
- `volume`: number (0-1)
- `playbackRate`: number (0.25-2)
- `repeatMode`: 'none' | 'single' | 'segment'

**特点**：
- 持久化到 localStorage
- 纯同步操作
- **注意**：数据库同步应该在 hook 中处理，不在 store 中

#### 3.2.4 Player Echo Store (`player-echo-store.ts`) - 新建
**职责**：管理 Echo 模式状态
- `echoModeActive`: boolean
- `echoStartLineIndex`: number
- `echoEndLineIndex`: number
- `echoStartTime`: number
- `echoEndTime`: number

**特点**：
- 不持久化（通过 EchoSession 数据库持久化）
- 纯同步操作

#### 3.2.5 Player Media Store (`player-media-store.ts`) - 新建
**职责**：管理媒体控制相关的轻量级状态
- **不存储 ref**（ref 通过 React Context 传递）
- 提供媒体控制接口的注册机制（通过事件或 Context）

**特点**：
- 不持久化
- 不存储 DOM refs

#### 3.2.6 Player Transcription Store (`player-transcription-store.ts`) - 新建
**职责**：管理转录相关状态
- `isTranscribing`: boolean
- `transcribeProgress`: string | null
- `transcribeProgressPercent`: number | null

**特点**：
- 不持久化
- 纯同步操作

### 3.3 异步操作处理方案

#### 方案 A：使用 React Query（推荐）

```typescript
// hooks/player/use-load-media.ts
export function useLoadMedia() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (media: LibraryMedia) => {
      const targetType = mediaTypeToTargetType(media.type)
      const settings = usePlayerSettingsStore.getState()

      // 1. 创建/获取 EchoSession
      const echoSessionId = await getOrCreateActiveEchoSession(
        targetType,
        media.id,
        media.language,
        {
          currentTime: 0,
          playbackRate: settings.playbackRate,
          volume: settings.volume,
        }
      )

      // 2. 加载 EchoSession
      const echoSession = await getEchoSessionById(echoSessionId)
      if (!echoSession) {
        throw new Error('Failed to load EchoSession')
      }

      // 3. 创建 PlaybackSession
      const session: PlaybackSession = {
        mediaId: media.id,
        mediaType: media.type,
        mediaTitle: media.title,
        thumbnailUrl: media.thumbnailUrl,
        duration: media.duration,
        currentTime: echoSession.currentTime,
        currentSegmentIndex: 0,
        language: echoSession.language,
        transcriptId: echoSession.transcriptId,
        startedAt: echoSession.startedAt,
        lastActiveAt: echoSession.lastActiveAt,
      }

      // 4. 更新 stores（同步操作）
      usePlayerSessionStore.getState().setSession(session, echoSessionId)
      usePlayerSettingsStore.getState().setVolume(echoSession.volume ?? settings.volume)
      usePlayerSettingsStore.getState().setPlaybackRate(echoSession.playbackRate ?? settings.playbackRate)

      if (echoSession.echoStartTime !== undefined && echoSession.echoEndTime !== undefined) {
        usePlayerEchoStore.getState().activateEchoMode(
          -1, // line indices will be recalculated
          -1,
          echoSession.echoStartTime,
          echoSession.echoEndTime
        )
      }

      usePlayerUIStore.getState().expand()
      usePlayerUIStore.getState().setPlaying(true)

      // 5. 后台同步 transcripts
      syncTranscriptsForTarget(targetType, media.id, { background: true })
        .catch((error) => {
          log.error('Failed to sync transcripts:', error)
        })

      // 6. 使相关查询失效
      queryClient.invalidateQueries({ queryKey: ['most-recent-echo-session'] })
      queryClient.invalidateQueries({ queryKey: ['continue-learning-media'] })

      return session
    },
  })
}
```

#### 方案 B：使用 Service 层

```typescript
// services/player-service.ts
export class PlayerService {
  async loadMedia(media: LibraryMedia): Promise<void> {
    // 异步操作
    const session = await this.createSession(media)

    // 更新 stores
    usePlayerSessionStore.getState().setSession(session, session.id)
    // ...
  }

  async saveProgress(echoSessionId: string, progress: ProgressUpdate): Promise<void> {
    await updateEchoSessionProgress(echoSessionId, progress)
  }
}
```

### 3.4 媒体控制处理方案

**问题**：当前在 store 中存储 `_mediaRef` 和控制函数

**解决方案**：使用 React Context

```typescript
// contexts/player-media-context.tsx
interface PlayerMediaContextValue {
  mediaRef: RefObject<HTMLAudioElement | HTMLVideoElement | null>
  controls: {
    seek: (time: number) => void
    play: () => Promise<void>
    pause: () => void
    getCurrentTime: () => number
    isPaused: () => boolean
  } | null
}

const PlayerMediaContext = createContext<PlayerMediaContextValue | null>(null)

export function PlayerMediaProvider({ children }: { children: React.ReactNode }) {
  const mediaRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null)
  const [controls, setControls] = useState<PlayerMediaContextValue['controls']>(null)

  // 计算 controls
  useEffect(() => {
    const el = mediaRef.current
    if (!el) {
      setControls(null)
      return
    }

    setControls({
      seek: (time: number) => {
        el.currentTime = time
        // 更新 store
        usePlayerStore.getState().updateProgress(time)
      },
      play: async () => {
        await el.play()
        usePlayerUIStore.getState().setPlaying(true)
      },
      pause: () => {
        el.pause()
        usePlayerUIStore.getState().setPlaying(false)
      },
      getCurrentTime: () => el.currentTime,
      isPaused: () => el.paused,
    })
  }, [mediaRef.current])

  return (
    <PlayerMediaContext.Provider value={{ mediaRef, controls }}>
      {children}
    </PlayerMediaContext.Provider>
  )
}

export function usePlayerMedia() {
  const context = useContext(PlayerMediaContext)
  if (!context) {
    throw new Error('usePlayerMedia must be used within PlayerMediaProvider')
  }
  return context
}
```

### 3.5 数据库同步处理方案

**问题**：当前在 store actions 中直接调用数据库操作

**解决方案**：使用 React Hook 处理副作用

```typescript
// hooks/player/use-player-settings-sync.ts
export function usePlayerSettingsSync() {
  const volume = usePlayerSettingsStore((s) => s.volume))
  const playbackRate = usePlayerSettingsStore((s) => s.playbackRate)
  const echoSessionId = usePlayerSessionStore((s) => s.currentEchoSessionId)

  // 同步 volume 到数据库
  useEffect(() => {
    if (!echoSessionId) return

    const timer = setTimeout(() => {
      updateEchoSessionProgress(echoSessionId, { volume })
        .catch((error) => {
          log.error('Failed to save volume:', error)
        })
    }, 500) // 防抖

    return () => clearTimeout(timer)
  }, [volume, echoSessionId])

  // 同步 playbackRate 到数据库
  useEffect(() => {
    if (!echoSessionId) return

    const timer = setTimeout(() => {
      updateEchoSessionProgress(echoSessionId, { playbackRate })
        .catch((error) => {
          log.error('Failed to save playback rate:', error)
        })
    }, 500)

    return () => clearTimeout(timer)
  }, [playbackRate, echoSessionId])
}
```

### 3.6 进度更新优化

**问题**：当前使用全局 debounce，可能导致内存泄漏

**解决方案**：使用 React Hook 管理 debounce

```typescript
// hooks/player/use-progress-sync.ts
export function useProgressSync() {
  const currentTime = usePlayerSessionStore((s) => s.currentSession?.currentTime ?? 0)
  const echoSessionId = usePlayerSessionStore((s) => s.currentEchoSessionId)

  const debouncedSave = useDebouncedCallback(
    async (time: number) => {
      if (!echoSessionId) return
      try {
        await updateEchoSessionProgress(echoSessionId, { currentTime: time })
        log.debug('Progress saved', { echoSessionId, time })
      } catch (error) {
        log.error('Failed to save progress:', error)
      }
    },
    2000 // 2 seconds
  )

  useEffect(() => {
    if (echoSessionId && currentTime > 0) {
      debouncedSave(currentTime)
    }
  }, [currentTime, echoSessionId, debouncedSave])
}
```

## 4. 迁移计划

### 阶段 1：创建新的 Store 结构 ✅ 已完成
1. ✅ 创建 `player-ui-store.ts` - 管理 UI 状态（mode, isPlaying, transcription UI state）
2. ✅ 创建 `player-session-store.ts` - 管理播放会话状态（currentSession, currentEchoSessionId）
3. ✅ 创建 `player-settings-store.ts` - 管理播放设置（volume, playbackRate, repeatMode），持久化到 localStorage
4. ✅ 创建 `player-echo-store.ts` - 管理 Echo 模式状态（echoModeActive, echo region boundaries）
5. ✅ 创建 `player-transcription-store.ts` - 管理转录状态（isTranscribing, progress）
6. ✅ 创建 `types.ts` - 共享类型定义（PlayerMode, PlaybackSession）
7. ✅ 创建 `index.ts` - 统一导出所有 stores 和类型

### 阶段 2：创建辅助 Hooks 和 Services ✅ 已完成
1. ✅ 创建 `use-load-media.ts` hook - 使用 React Query mutation 处理媒体加载和 EchoSession 创建/恢复
2. ✅ 创建 `use-player-settings-sync.ts` hook - 同步播放设置（volume, playbackRate）到数据库，带防抖
3. ✅ 创建 `use-progress-sync.ts` hook - 同步播放进度到数据库，带防抖（2秒）
4. ✅ 创建 `use-echo-sync.ts` hook - 同步 Echo 模式状态到数据库
5. ✅ 创建 `PlayerMediaContext` - React Context 用于媒体控制，替代 store 中的 ref 存储
6. ✅ 创建 `player-recording-store.ts` - 管理录音控制函数（临时方案，未来应通过 Context 传递）

### 阶段 3：迁移现有代码 ✅ 大部分完成
1. ✅ 更新 `use-media-element.ts` - 使用新的分离 stores
2. ✅ 更新 `use-player-controls.ts` - 使用新的 stores 和 PlayerMediaContext
3. ✅ 更新 `player-container.tsx` - 使用新的 stores 并添加 PlayerMediaProvider
4. ✅ 更新 `player-hotkeys.tsx` - 使用新的分离 stores
5. ✅ 更新 `ExpandedPlayer` 及其子组件（expanded-player-header, expanded-player-controls）
6. ✅ 更新 `MiniPlayerBar` - 使用新的 stores
7. ✅ 更新 `ShadowRecorder` - 使用新的 stores
8. ✅ 更新 `RecordingPlayer` - 使用新的 stores
9. ✅ 更新 `ShadowReadingPanel` - 使用新的 stores
10. ✅ 更新 `library.tsx` - 使用 `useLoadMedia` hook
11. ✅ 更新 `continue-learning-card.tsx` - 使用 `useLoadMedia` hook
12. ✅ 更新 transcript 相关组件（transcript-display, transcript-lines, transcript-line-item, transcribe-dialog, transcript-empty-state）
13. ✅ 更新 hooks（use-playback-sync, use-echo-region, use-transcript-display, use-transcribe, use-media-loader, use-upload-subtitle）
14. ✅ 更新 expanded-player-content 和 pitch-contour-section
15. ✅ 更新 __root.tsx 和 hotkeys-provider.tsx
16. ✅ 在 `player-container.tsx` 中集成同步 hooks（usePlayerSettingsSync, useProgressSync, useEchoSync）
17. ⬜ 测试所有功能

### 阶段 4：清理 ⬜ 待开始
1. ⬜ 创建 `composite-store.ts`（可选，用于向后兼容）
2. ⬜ 删除旧的 `player.ts` 文件
3. ⬜ 更新文档
4. ⬜ 代码审查

## 7. 当前进度总结

### ✅ 已完成的工作

1. **Store 分离**：
   - 成功将单体 `player.ts` store 拆分为 6 个独立的 stores：
     - `player-ui-store.ts` - UI 状态
     - `player-session-store.ts` - 会话状态
     - `player-settings-store.ts` - 播放设置（持久化）
     - `player-echo-store.ts` - Echo 模式状态
     - `player-transcription-store.ts` - 转录状态
     - `player-recording-store.ts` - 录音控制（临时方案）
   - 每个 store 职责单一，易于维护和测试
   - 所有 stores 使用同步操作，符合 Zustand 最佳实践

2. **异步操作处理**：
   - 创建了 `useLoadMedia` hook，使用 React Query mutation 处理媒体加载
   - 所有数据库操作已从 store actions 中移除

3. **副作用分离**：
   - 创建了 4 个同步 hooks（settings, progress, echo, load-media）处理数据库同步
   - 使用 React `useEffect` 和防抖机制优化性能

4. **媒体控制重构**：
   - 创建了 `PlayerMediaContext` 替代 store 中的 ref 存储
   - 更新了 `use-media-element.ts` 和 `use-player-controls.ts` 使用新的 Context
   - 更新了 `player-container.tsx` 添加 `PlayerMediaProvider`

5. **组件迁移**：
   - 更新了核心 hooks（use-media-element, use-player-controls, use-playback-sync, use-echo-region, use-transcript-display, use-transcribe, use-media-loader, use-upload-subtitle）
   - 更新了核心组件（player-container, player-hotkeys）
   - 更新了播放器组件（ExpandedPlayer, MiniPlayerBar, expanded-player-content）
   - 更新了录音相关组件（ShadowRecorder, RecordingPlayer, ShadowReadingPanel）
   - 更新了 transcript 相关组件（transcript-display, transcript-lines, transcript-line-item, transcribe-dialog, transcript-empty-state）
   - 更新了其他组件（pitch-contour-section, __root.tsx, hotkeys-provider.tsx）
   - 更新了页面组件（library.tsx, continue-learning-card.tsx）使用 `useLoadMedia` hook
   - 所有代码已通过 TypeScript 编译检查

6. **Hook 集成**：
   - `library.tsx` 和 `continue-learning-card.tsx` 已集成 `useLoadMedia` hook
   - `player-container.tsx` 已集成同步 hooks（usePlayerSettingsSync, useProgressSync, useEchoSync）
   - 异步操作已从 store actions 中移除，改为使用 React Query mutations

7. **类型安全**：
   - 创建了共享类型文件，确保类型一致性
   - 所有 stores 都有完整的 TypeScript 类型定义

### ⬜ 待完成的工作

1. **测试**：
   - 为新 stores 和 hooks 编写测试
   - 确保所有现有功能测试通过
   - 手动测试所有播放器功能确保正常工作

2. **清理**：
   - 删除旧的 `player.ts` 文件（保留用于测试的引用）
   - 更新 `stores/index.ts` 移除旧的导出（如果不再需要）

## 5. 实施建议

### 5.1 优先级
1. **高优先级**：分离异步操作（影响性能和可维护性）
2. **中优先级**：移除 ref 存储（影响架构清晰度）
3. **低优先级**：进一步拆分 store（如果当前分离已足够）

### 5.2 兼容性
- 可以保留 `composite-store.ts` 作为过渡，提供向后兼容的 API
- 逐步迁移组件，而不是一次性全部迁移

### 5.3 测试策略
- 为每个新 store 编写单元测试
- 为新的 hooks 编写集成测试
- 确保所有现有功能测试通过

## 6. 参考资源

- [Zustand Best Practices](https://github.com/pmndrs/zustand/wiki/Best-Practices)
- [React Query Best Practices](https://tanstack.com/query/latest/docs/react/guides/best-practices)
- [Separation of Concerns in React](https://kentcdodds.com/blog/separation-of-concerns)

