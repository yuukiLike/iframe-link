# 测试指南

本项目包含两种类型的测试：**单元测试**（Vitest）和 **E2E 测试**（Playwright）。

> 📊 测试工作原理的详细流程图参见 [TESTING_WORKFLOW.md](TESTING_WORKFLOW.md)

## 目录结构

```
tests/
├── unit/                    # 单元测试（纯函数逻辑）
│   └── utils.test.ts
└── e2e/                     # E2E 测试（真实浏览器）
    ├── fixtures/            # 测试用 HTML 页面
    │   ├── parent.html
    │   ├── child-sdk.html
    │   └── child-traditional.html
    └── sdk-communication.spec.ts
```

## 快速开始

```bash
# 运行所有测试
pnpm run test:all

# 只运行单元测试
pnpm test

# 只运行 E2E 测试
pnpm run test:e2e
```

---

## 单元测试（Vitest）

### 运行命令

```bash
pnpm test              # 运行一次
pnpm run test:watch    # 监听模式（文件变化自动重跑）
pnpm run test:coverage # 查看覆盖率
```

### 运行单个测试文件

```bash
pnpm exec vitest run --config config/vitest.config.ts tests/unit/utils.test.ts
```

### 运行匹配名称的测试

```bash
pnpm exec vitest run --config config/vitest.config.ts -t "isTrustedOrigin"
```

### 调试单元测试

**方法 1：添加 console.log**

```typescript
it('should work', () => {
  const result = someFunction()
  console.log('result:', result)  // 会显示在终端
  expect(result).toBe(expected)
})
```

**方法 2：使用 VS Code 调试器**

1. 在测试代码中设置断点
2. 打开 VS Code 的 JavaScript Debug Terminal
3. 运行 `pnpm test`

**方法 3：只运行单个测试**

```typescript
it.only('focus on this test', () => {
  // 只会运行这一个测试
})
```

---

## E2E 测试（Playwright）

### 运行命令

```bash
pnpm run test:e2e      # 无头模式（后台运行）
pnpm run test:e2e:ui   # 可视化界面（强烈推荐）
```

### 运行单个测试

```bash
# 按文件
pnpm exec playwright test --config config/playwright.config.ts tests/e2e/sdk-communication.spec.ts

# 按行号
pnpm exec playwright test --config config/playwright.config.ts tests/e2e/sdk-communication.spec.ts:26

# 按名称
pnpm exec playwright test --config config/playwright.config.ts --grep "handshake"
```

### 调试 E2E 测试

**方法 1：使用 UI 模式（推荐新手）**

```bash
pnpm run test:e2e:ui
```

- 可视化界面，可以看到每一步操作
- 支持时间旅行（回放每个步骤）
- 可以查看 DOM 快照

**方法 2：使用 headed 模式**

```bash
pnpm exec playwright test --config config/playwright.config.ts --headed
```

- 会打开真实浏览器窗口
- 可以看到测试执行过程

**方法 3：使用 debug 模式**

```bash
pnpm exec playwright test --config config/playwright.config.ts --debug
```

- 打开 Playwright Inspector
- 可以逐步执行
- 可以查看选择器

**方法 4：暂停测试**

```typescript
test('my test', async ({ page }) => {
  await page.goto('/tests/e2e/fixtures/parent.html')

  await page.pause()  // 测试会暂停在这里

  // 继续执行...
})
```

**方法 5：查看失败截图和 trace**

测试失败后，会在 `docs/reports/test-results/` 目录生成：
- 截图
- trace 文件（可用 `pnpm exec playwright show-trace <trace.zip>` 查看）

---

## 编写新测试

### 单元测试示例

```typescript
// tests/unit/myFunction.test.ts
import { describe, it, expect, vi } from 'vitest'
import { myFunction } from '../../src/myModule'

describe('myFunction', () => {
  it('should return correct result', () => {
    const result = myFunction('input')
    expect(result).toBe('expected output')
  })

  it('should handle edge case', () => {
    expect(() => myFunction(null)).toThrow()
  })
})
```

### E2E 测试示例

```typescript
// tests/e2e/my-feature.spec.ts
import { test, expect } from '@playwright/test'

test.describe('My Feature', () => {
  test('should work correctly', async ({ page }) => {
    // 1. 访问页面
    await page.goto('/tests/e2e/fixtures/parent.html')

    // 2. 等待元素出现
    await expect(page.locator('#status')).toContainText('Connected')

    // 3. 执行操作
    await page.click('#my-button')

    // 4. 验证结果
    await expect(page.locator('#result')).toHaveText('Success')
  })
})
```

### 测试 iframe 内容

```typescript
test('iframe communication', async ({ page }) => {
  await page.goto('/tests/e2e/fixtures/parent.html')

  // 获取 iframe
  const childFrame = page.frameLocator('#sdk-iframe')

  // 在 iframe 中操作
  await childFrame.locator('#child-button').click()

  // 验证 iframe 中的内容
  await expect(childFrame.locator('#log')).toContainText('Result')
})
```

---

## 常见问题

### Q: E2E 测试报 404 错误

检查 `page.goto()` 的路径是否正确：

```typescript
// 正确
await page.goto('/tests/e2e/fixtures/parent.html')

// 错误（相对路径可能有问题）
await page.goto('./parent.html')
```

### Q: 测试超时

增加超时时间：

```typescript
// 单个 expect
await expect(locator).toContainText('text', { timeout: 10000 })

// 整个测试
test('slow test', async ({ page }) => {
  test.setTimeout(60000)
  // ...
})
```

### Q: 测试之间相互影响

确保每个测试独立：

```typescript
test.beforeEach(async ({ page }) => {
  // 每个测试前重新访问页面
  await page.goto('/tests/e2e/fixtures/parent.html')
})
```

### Q: 需要等待异步操作完成

```typescript
// 等待元素出现
await page.locator('#result').waitFor()

// 等待固定时间（不推荐，但有时需要）
await page.waitForTimeout(500)

// 等待网络请求完成
await page.waitForResponse(resp => resp.url().includes('/api/'))
```

### Q: 如何查看测试覆盖率

```bash
pnpm run test:coverage
```

报告会生成在 `coverage/` 目录，用浏览器打开 `coverage/index.html` 查看。

---

## 测试配置文件

| 文件 | 用途 |
|------|------|
| `config/vitest.config.ts` | 单元测试配置 |
| `config/playwright.config.ts` | E2E 测试配置 |

---

## 资源链接

- [Vitest 文档](https://vitest.dev/)
- [Playwright 文档](https://playwright.dev/)
