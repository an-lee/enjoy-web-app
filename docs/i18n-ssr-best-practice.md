# i18n SSR 最佳实践指南

## 方案对比

### 方案 1：全页面骨架屏（当前实施）✅

**适用场景：**
- 使用 Cloudflare Pages/Workers
- 使用静态托管（Vercel、Netlify）
- 无法访问服务端请求头

**实现方式：**
```typescript
// 1. SSR 和初始水合使用英文（fallback）
// 2. 显示骨架屏 150ms
// 3. 水合完成后切换语言并显示真实内容
```

**优点：**
- ✅ 零服务端配置
- ✅ 完全避免水合错误
- ✅ 用户体验好

**缺点：**
- ⚠️ 短暂的加载时间（150ms）
- ⚠️ 需要维护骨架组件

---

### 方案 2：服务端语言检测（理想方案）🌟

**适用场景：**
- 自己的 Node.js 服务器
- Next.js App Router
- Remix
- 有完全的服务端控制权

**实现方式：**

#### 步骤 1：服务端检测语言

```typescript
// server.ts
import { detect } from 'i18next-http-middleware'

app.use((req, res, next) => {
  // 从 Cookie 或 Accept-Language header 检测
  const lang = req.cookies.language ||
               req.acceptsLanguages(['en', 'zh', 'ja']) ||
               'en'

  // 传递给客户端
  res.locals.language = lang
  next()
})
```

#### 步骤 2：SSR 使用检测到的语言

```typescript
// entry-server.tsx
export function render(url: string, language: string) {
  // 使用服务端检测到的语言初始化 i18n
  i18n.changeLanguage(language)

  // 渲染组件
  return ReactDOMServer.renderToString(
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>
  )
}
```

#### 步骤 3：客户端使用相同语言

```typescript
// entry-client.tsx
const language = document.documentElement.lang || 'en'

i18n.changeLanguage(language).then(() => {
  hydrateRoot(
    document.getElementById('root'),
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>
  )
})
```

**优点：**
- ✅ 完美的 SSR - 无闪烁
- ✅ SEO 友好 - 正确的语言内容
- ✅ 无需骨架屏
- ✅ 最佳用户体验

**缺点：**
- ⚠️ 需要服务端配置
- ⚠️ 实现较复杂

---

### 方案 3：客户端渲染

**实现方式：**
```typescript
// 只在客户端渲染有 i18n 的组件
const ClientOnlyNav = dynamic(() => import('./Nav'), { ssr: false })
```

**优点：**
- ✅ 实现最简单

**缺点：**
- ❌ SEO 较差
- ❌ 首屏渲染慢

---

### 方案 4：禁用 SSR

**实现方式：**
```typescript
// vite.config.ts
export default {
  ssr: {
    noExternal: false // 禁用 SSR
  }
}
```

**优点：**
- ✅ 零配置

**缺点：**
- ❌ SEO 最差
- ❌ 性能差
- ❌ 仅适合开发环境

---

## 推荐方案

| 部署环境 | 推荐方案 |
|---------|---------|
| Cloudflare Workers/Pages | 方案 1：骨架屏 |
| Vercel/Netlify (静态) | 方案 1：骨架屏 |
| 自己的 Node.js 服务器 | 方案 2：服务端检测 |
| Next.js App Router | 方案 2：服务端检测 |
| Remix | 方案 2：服务端检测 |
| 开发环境 | 方案 4：禁用 SSR |

---

## 迁移到方案 2 的步骤

如果将来您想实现服务端语言检测：

### 1. 安装依赖
```bash
bun add i18next-http-middleware
```

### 2. 配置服务端中间件
```typescript
import i18nextMiddleware from 'i18next-http-middleware'

app.use(i18nextMiddleware.handle(i18n, {
  detection: {
    order: ['cookie', 'header'],
    caches: ['cookie']
  }
}))
```

### 3. 修改 i18n 初始化
```typescript
// 服务端：从请求中获取语言
const language = req.language || 'en'

// 客户端：从 HTML 属性获取
const language = document.documentElement.lang || 'en'
```

### 4. 移除骨架屏逻辑
```typescript
// 不再需要 isHydrated 状态
// 直接渲染真实内容
```

---

## 性能对比

| 方案 | FCP | LCP | TTI | SEO |
|------|-----|-----|-----|-----|
| 骨架屏 | 快 | 中 | 中 | 好 |
| 服务端检测 | 最快 | 最快 | 最快 | 最好 |
| 客户端渲染 | 中 | 慢 | 慢 | 差 |
| 禁用 SSR | 慢 | 最慢 | 最慢 | 最差 |

---

## 参考资源

- [Next.js Internationalization](https://nextjs.org/docs/app/building-your-application/routing/internationalization)
- [i18next SSR Best Practices](https://react.i18next.com/latest/ssr)
- [React Hydration](https://react.dev/reference/react-dom/client/hydrateRoot)
- [Web.dev: Optimize FCP](https://web.dev/fcp/)

---

## 总结

**当前项目使用方案 1（骨架屏）是正确的选择**，因为：
- ✅ Cloudflare Workers 环境限制
- ✅ 无法访问服务端请求头
- ✅ 简单可靠，用户体验好

如果将来迁移到有服务端控制权的环境（如自己的 Node.js 服务器），可以考虑升级到方案 2。

