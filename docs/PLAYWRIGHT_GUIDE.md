# Playwright 快速上手 - iframe 测试

## 1. 安装

```bash
# 安装 Playwright
npm install -D @playwright/test

# 安装浏览器（只装 Chromium 就够了）
npx playwright install chromium
```

## 2. 运行测试

```bash
# 运行所有测试
npx playwright test

# 只运行 MVP 测试
npx playwright test mvp-color-block

# 指定浏览器
npx playwright test --project=chromium

# 有头模式（看到浏览器界面）
npx playwright test --headed

# UI 模式（可视化调试，强烈推荐）
npx playwright test --ui
```

## 3. iframe 测试核心 API

```typescript
import { test, expect } from '@playwright/test'

test('iframe 通信测试', async ({ page }) => {
  // 打开页面
  await page.goto('/mvp-parent.html')

  // 获取 iframe（重点！）
  const childFrame = page.frameLocator('#sdk-child')

  // 操作父页面元素
  await page.fill('#color-input', '#ff0000')
  await page.click('#set-btn')

  // 操作 iframe 内的元素
  await childFrame.locator('#child-input').fill('#00ff00')
  await childFrame.locator('#child-btn').click()

  // 断言父页面
  await expect(page.locator('#parent-block')).toHaveCSS('background-color', 'rgb(255, 0, 0)')

  // 断言 iframe 内元素
  await expect(childFrame.locator('#child-block')).toHaveCSS('background-color', 'rgb(0, 255, 0)')
})
```

## 4. 常用断言

```typescript
// 文本包含
await expect(locator).toContainText('Connected')

// CSS 属性
await expect(locator).toHaveCSS('background-color', 'rgb(255, 0, 0)')

// 可见性
await expect(locator).toBeVisible()

// 元素值
await expect(locator).toHaveValue('hello')
```

## 5. 调试技巧

```bash
# 暂停执行，手动调试
npx playwright test --debug

# 生成测试报告
npx playwright show-report
```

在代码中暂停：
```typescript
await page.pause()  // 会打开调试器
```

## 6. 当前项目配置

配置文件 `playwright.config.ts` 已设置：
- 自动启动本地服务器 (`npx serve . -l 3456`)
- 测试目录：`tests/e2e/`
- 支持 Chromium/Firefox/WebKit

## 7. 一句话总结

```
page.locator()        → 操作父页面
page.frameLocator()   → 获取 iframe
frameLocator.locator() → 操作 iframe 内元素
```
