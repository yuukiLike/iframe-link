# E2E 测试入门指南

> 写给 E2E 测试小白的完整指南

## 什么是 E2E 测试？

**E2E = End-to-End（端到端）测试**

想象你是一个用户，打开浏览器，点击按钮，看到结果。E2E 测试就是让程序自动完成这些操作。

```
传统测试：测试函数 → 检查返回值
E2E 测试：打开浏览器 → 点击按钮 → 检查页面显示
```

### 为什么需要 E2E 测试？

单元测试只能测试单个函数，但无法验证：
- 页面能否正常加载
- 按钮点击后会发生什么
- iframe 通信是否正常
- 用户看到的结果是否正确

E2E 测试模拟真实用户，在真实浏览器中验证这些。

---

## 快速开始

### 第一次运行

```bash
# 1. 安装 Playwright 浏览器（只需运行一次）
npx playwright install chromium

# 2. 运行所有 E2E 测试
npm run test:e2e
```

### 推荐的开发方式

```bash
# 打开可视化界面（强烈推荐新手使用！）
npm run test:e2e:ui
```

这会打开一个界面，你可以：
- 看到每个测试的执行过程
- 点击运行单个测试
- 查看每一步的页面截图
- 时光旅行回到任意一步

---

## 项目结构

```
tests/e2e/
├── README.md                    ← 你正在看的这个文件
├── fixtures/                    ← 测试用的 HTML 页面
│   ├── parent.html             ← 父页面（加载 SDK）
│   ├── child-sdk.html          ← 子页面（使用 SDK）
│   └── child-traditional.html  ← 子页面（不使用 SDK）
└── sdk-communication.spec.ts   ← 测试用例

config/playwright.config.ts      ← Playwright 配置文件
```

### 什么是 Fixture？

Fixture（夹具）是测试用的 HTML 页面。它们模拟真实的使用场景：

```
┌─────────────────────────────────────────────────────────────┐
│  parent.html（父页面）                                       │
│  ┌─────────────────────┐    ┌─────────────────────────────┐ │
│  │  child-sdk.html     │    │  child-traditional.html     │ │
│  │  (iframe)           │    │  (iframe)                   │ │
│  │  使用 SDK           │    │  不使用 SDK                 │ │
│  └─────────────────────┘    └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 测试文件怎么写？

### 基本结构

```typescript
import { test, expect } from '@playwright/test'

// 测试组：把相关的测试放在一起
test.describe('功能名称', () => {

  // 每个测试执行前都会运行
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/e2e/fixtures/parent.html')
  })

  // 单个测试用例
  test('测试描述', async ({ page }) => {
    // 1. 执行操作
    await page.click('#button-id')

    // 2. 验证结果
    await expect(page.locator('#result')).toContainText('成功')
  })
})
```

### 核心概念

| 概念 | 说明 | 示例 |
|------|------|------|
| `page` | 浏览器页面 | `page.goto('/path')` |
| `locator` | 元素定位器 | `page.locator('#id')` |
| `expect` | 断言（验证） | `expect(locator).toContainText('xxx')` |
| `frameLocator` | iframe 定位器 | `page.frameLocator('#iframe')` |

### 常用操作

```typescript
// 访问页面
await page.goto('/tests/e2e/fixtures/parent.html')

// 点击按钮
await page.click('#button-id')

// 输入文本
await page.fill('#input-id', '要输入的文本')

// 获取文本内容
const text = await page.locator('#element').textContent()

// 等待元素出现
await page.locator('#element').waitFor()

// 验证文本内容
await expect(page.locator('#log')).toContainText('期望的文本')

// 操作 iframe 内的元素
const iframe = page.frameLocator('#iframe-id')
await iframe.locator('#button').click()
```

---

## 运行测试的各种姿势

```bash
# 运行所有测试（无头模式，看不到浏览器）
npm run test:e2e

# 打开可视化界面（推荐！）
npm run test:e2e:ui

# 显示浏览器窗口
npx playwright test --config config/playwright.config.ts --headed

# 逐步执行，便于观察
npx playwright test --config config/playwright.config.ts --debug

# 只运行包含 "handshake" 的测试
npx playwright test --config config/playwright.config.ts --grep "handshake"

# 只运行某个文件
npx playwright test --config config/playwright.config.ts tests/e2e/sdk-communication.spec.ts

# 查看测试报告
npx playwright show-report docs/reports/playwright
```

---

## 调试技巧

### 1. 使用 UI 模式

```bash
npm run test:e2e:ui
```

最直观的调试方式，可以看到每一步的截图。

### 2. 手动查看测试页面

```bash
# 启动本地服务器
npx serve . -l 3456 --cors

# 在浏览器打开
open http://localhost:3456/tests/e2e/fixtures/parent.html
```

然后你可以手动操作页面，看看效果。

### 3. 添加调试日志

```typescript
test('调试示例', async ({ page }) => {
  await page.goto('/tests/e2e/fixtures/parent.html')

  // 打印当前 URL
  console.log('当前页面:', page.url())

  // 打印元素文本
  const text = await page.locator('#log').textContent()
  console.log('日志内容:', text)

  // 暂停执行，手动检查
  await page.pause()
})
```

### 4. 截图

```typescript
// 保存截图
await page.screenshot({ path: 'debug.png' })

// 保存整页截图
await page.screenshot({ path: 'full.png', fullPage: true })
```

---

## 常见问题

### Q: 测试超时了怎么办？

```typescript
// 增加单个断言的超时时间
await expect(page.locator('#log')).toContainText('Connected', {
  timeout: 10000  // 10 秒
})

// 或者在 test 级别设置
test('测试名', async ({ page }) => {
  test.setTimeout(60000)  // 60 秒
  // ...
})
```

### Q: 怎么等待异步操作完成？

```typescript
// 方法 1：等待特定文本出现
await expect(page.locator('#status')).toContainText('完成')

// 方法 2：等待元素出现
await page.locator('#result').waitFor()

// 方法 3：等待固定时间（不推荐，仅调试用）
await page.waitForTimeout(1000)
```

### Q: 怎么操作 iframe 内的元素？

```typescript
// 1. 获取 iframe 定位器
const iframe = page.frameLocator('#iframe-id')

// 2. 操作 iframe 内的元素
await iframe.locator('#button').click()
await expect(iframe.locator('#log')).toContainText('成功')
```

### Q: 怎么在浏览器中执行 JavaScript？

```typescript
// 执行代码并获取返回值
const result = await page.evaluate(() => {
  return window.someGlobalVariable
})

// 执行异步代码
const data = await page.evaluate(async () => {
  const response = await fetch('/api/data')
  return response.json()
})
```

### Q: 测试失败了怎么查看原因？

```bash
# 查看 HTML 报告
npx playwright show-report docs/reports/playwright

# 报告中包含：
# - 失败的截图
# - 错误信息
# - 执行轨迹
```

---

## 添加新测试的步骤

### 1. 确定测试场景

比如：测试「连接超时后自动重连」

### 2. 修改 fixture（如果需要新的 UI）

编辑 `fixtures/parent.html` 添加需要的按钮、显示区域等。

### 3. 编写测试用例

```typescript
test.describe('自动重连', () => {
  test('连接超时后应该自动重连', async ({ page }) => {
    // 1. 打开页面
    await page.goto('/tests/e2e/fixtures/parent.html')

    // 2. 模拟断开连接
    await page.evaluate(() => {
      window.sdkChannel.destroy()
    })

    // 3. 等待重连
    await expect(page.locator('#status')).toContainText('重连中')

    // 4. 验证重连成功
    await expect(page.locator('#status')).toContainText('已连接')
  })
})
```

### 4. 运行验证

```bash
# 只运行新写的测试
npx playwright test --config config/playwright.config.ts --grep "自动重连"

# 或使用 UI 模式
npm run test:e2e:ui
```

---

## 最佳实践

### DO

- 使用有意义的测试名称
- 每个测试只验证一件事
- 使用 `await expect()` 而不是手动 sleep
- 给重要的元素添加 `id` 或 `data-testid`

### DON'T

- 不要用 `waitForTimeout`（除非调试）
- 不要在测试之间共享状态
- 不要依赖测试执行顺序
- 不要硬编码超时时间

---

## 参考资源

- [Playwright 官方文档](https://playwright.dev/)
- [Playwright 中文教程](https://playwright.dev/docs/intro)
- [Locator 选择器指南](https://playwright.dev/docs/locators)
- [断言 API](https://playwright.dev/docs/test-assertions)
