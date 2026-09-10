/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * iframe-link SDK 端到端测试
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 📚 Playwright 测试入门
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 1. 测试结构：
 *    - test.describe('分组名', () => { ... })  → 将相关测试组织在一起
 *    - test('测试名', async ({ page }) => { ... })  → 单个测试用例
 *    - test.beforeEach(...)  → 每个测试执行前运行（通常用于打开页面）
 *
 * 2. 核心概念：
 *    - page: 浏览器页面对象，可以操作页面元素
 *    - locator: 元素定位器，用于查找页面元素
 *    - expect: 断言函数，验证结果是否符合预期
 *    - frameLocator: iframe 定位器，用于操作 iframe 内的元素
 *
 * 3. 常用操作：
 *    - page.goto('/path')  → 访问页面
 *    - page.click('#id')  → 点击元素
 *    - page.locator('#id')  → 定位元素
 *    - page.frameLocator('#iframe-id')  → 定位 iframe
 *    - expect(locator).toContainText('xxx')  → 断言包含文本
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * 测试场景说明
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 本文件测试 iframe-link SDK 的两种使用模式：
 *
 * 1. SDK 模式（双端都用 SDK）
 *    ┌─────────────────┐         ┌─────────────────┐
 *    │   Parent Page   │ ◄─────► │   Child Page    │
 *    │  connectToIframe│         │ connectToParent │
 *    └─────────────────┘         └─────────────────┘
 *    → 父子页面都使用 SDK，支持双向 RPC 和事件
 *
 * 2. 传统模式（只有父端用 SDK）
 *    ┌─────────────────┐         ┌─────────────────┐
 *    │   Parent Page   │ ◄─────► │   Child Page    │
 *    │  connectToIframe│         │  postMessage    │
 *    └─────────────────┘         └─────────────────┘
 *    → 子页面使用原生 postMessage，适合无法修改子页面代码的场景
 *
 */

import { test, expect, Page, FrameLocator } from '@playwright/test'

// ═══════════════════════════════════════════════════════════════════════════════
// 测试组 1：SDK 模式通信
// ═══════════════════════════════════════════════════════════════════════════════
//
// 测试场景：父页面和子页面都使用 SDK
// 文件：parent.html (connectToIframe) ↔ child-sdk.html (connectToParent)
//

test.describe('SDK 模式通信', () => {
  // 声明变量，供测试用例使用
  let page: Page // 浏览器页面对象
  let sdkChildFrame: FrameLocator // iframe 定位器，用于操作 iframe 内的元素

  /**
   * beforeEach: 每个测试用例执行前都会运行
   *
   * 作用：
   * 1. 打开测试页面
   * 2. 等待 SDK 连接建立
   * 3. 初始化 iframe 定位器
   */
  test.beforeEach(async ({ page: p }) => {
    page = p

    // 访问父页面（相对路径，会拼接 baseURL）
    // 实际访问：http://localhost:3456/tests/e2e/fixtures/parent.html
    await page.goto('/tests/e2e/fixtures/parent.html')

    // 获取 iframe 定位器
    // frameLocator 用于定位 iframe，之后可以用它操作 iframe 内的元素
    sdkChildFrame = page.frameLocator('#sdk-iframe')

    // 等待 SDK 连接建立
    // toContainText 会自动等待，直到元素包含指定文本或超时
    // timeout: 5000 表示最多等待 5 秒
    await expect(page.locator('#sdk-log')).toContainText('Connected to SDK child!', {
      timeout: 5000,
    })
  })

  /**
   * 测试：握手连接
   *
   * 验证 SDK 能正确建立父子页面之间的连接
   */
  test('父子页面应通过握手建立连接', async () => {
    // 验证父页面显示已连接
    await expect(page.locator('#sdk-log')).toContainText('Connected to SDK child!')

    // 验证子页面也显示已连接
    // 注意：操作 iframe 内的元素需要通过 frameLocator
    await expect(sdkChildFrame.locator('#log')).toContainText('Connected to parent!')
  })

  /**
   * 测试：父调用子方法
   *
   * 流程：
   * 1. 父页面点击按钮，调用子页面的 childMethod()
   * 2. 子页面执行方法并返回结果
   * 3. 父页面显示返回结果
   */
  test('父页面调用子页面方法并接收结果', async () => {
    // 点击父页面的调用按钮
    await page.click('#sdk-call-btn')

    // 验证父页面日志显示正在调用
    await expect(page.locator('#sdk-log')).toContainText('Calling childMethod...')

    // 验证子页面收到了调用
    await expect(sdkChildFrame.locator('#log')).toContainText('childMethod called:')

    // 验证父页面收到了返回结果
    await expect(page.locator('#sdk-log')).toContainText('fromChild')
    await expect(page.locator('#sdk-log')).toContainText('Result:')
  })

  /**
   * 测试：子调用父方法
   *
   * 流程：
   * 1. 子页面点击按钮，调用父页面的 parentMethod()
   * 2. 父页面执行方法并返回结果
   * 3. 子页面显示返回结果
   */
  test('子页面调用父页面方法并接收结果', async () => {
    // 点击子页面（iframe 内）的按钮
    // 注意语法：sdkChildFrame.locator('#call-parent-btn').click()
    await sdkChildFrame.locator('#call-parent-btn').click()

    // 验证子页面日志显示正在调用
    await expect(sdkChildFrame.locator('#log')).toContainText('Calling parentMethod...')

    // 验证父页面收到了调用
    await expect(page.locator('#sdk-log')).toContainText('parentMethod called with:')

    // 验证子页面收到了返回结果
    await expect(sdkChildFrame.locator('#log')).toContainText('fromParent')
  })

  /**
   * 测试：父向子发送事件
   *
   * 事件是单向通知，不需要等待返回值
   */
  test('父页面发送事件，子页面接收', async () => {
    // 父页面发送事件
    await page.click('#sdk-emit-btn')

    // 验证父页面日志
    await expect(page.locator('#sdk-log')).toContainText('Emitting PARENT_EVENT')

    // 验证子页面收到事件及数据
    await expect(sdkChildFrame.locator('#log')).toContainText('PARENT_EVENT received:')
    await expect(sdkChildFrame.locator('#log')).toContainText('Hello from parent!')
  })

  /**
   * 测试：子向父发送事件
   */
  test('子页面发送事件，父页面接收', async () => {
    // 子页面发送事件
    await sdkChildFrame.locator('#emit-event-btn').click()

    // 验证子页面日志
    await expect(sdkChildFrame.locator('#log')).toContainText('Emitting CHILD_EVENT')

    // 验证父页面收到事件及数据
    await expect(page.locator('#sdk-log')).toContainText('Received CHILD_EVENT:')
    await expect(page.locator('#sdk-log')).toContainText('Hello from child!')
  })

  /**
   * 测试：连续双向调用
   *
   * 验证多次调用不会互相干扰
   */
  test('双向 RPC 连续调用正常工作', async () => {
    // 第一次：父调用子
    await page.click('#sdk-call-btn')
    await expect(page.locator('#sdk-log')).toContainText('fromChild')

    // 第二次：子调用父
    await sdkChildFrame.locator('#call-parent-btn').click()
    await expect(sdkChildFrame.locator('#log')).toContainText('fromParent')

    // 第三次：父再次调用子
    await page.click('#sdk-call-btn')
    // 等待第二次调用结果返回
    await page.waitForTimeout(500)

    // 统计调用次数 - 应该有 2 次 "fromChild"
    // 使用 textContent() 获取元素文本，然后用正则匹配统计
    const parentLog = await page.locator('#sdk-log').textContent()
    const childMethodCalls = (parentLog?.match(/fromChild/g) || []).length
    expect(childMethodCalls).toBe(2)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 测试组 1.5：重试机制测试
// ═══════════════════════════════════════════════════════════════════════════════
//
// 测试场景：子应用延迟初始化，验证重试机制能正确建立连接
// 文件：parent-delayed.html ↔ child-delayed.html (延迟 2 秒)
//

test.describe('重试机制', () => {
  /**
   * 测试：子应用延迟 2 秒仍能成功连接
   *
   * 场景：
   * - 父应用立即调用 connectToIframe()
   * - 子应用延迟 2 秒后才调用 connectToParent()
   * - 验证握手能成功完成
   */
  test('子应用延迟 2 秒仍能成功连接', async ({ page }) => {
    await page.goto('/tests/e2e/fixtures/parent-delayed.html')

    // 等待连接成功（最多 10 秒，因为子应用延迟 2 秒 + 一些余量）
    await expect(page.locator('#log')).toContainText('Connected!', {
      timeout: 10000,
    })

    // 验证连接时间大于 2 秒（因为子应用延迟了 2 秒）
    const connectionTime = await page.evaluate(() => (window as any).connectionTime)
    expect(connectionTime).toBeGreaterThanOrEqual(2000)

    console.log(`Connection established in ${connectionTime}ms`)
  })

  /**
   * 测试：延迟连接后 RPC 调用正常工作
   */
  test('延迟连接后 RPC 调用正常', async ({ page }) => {
    await page.goto('/tests/e2e/fixtures/parent-delayed.html')

    // 等待连接建立
    await expect(page.locator('#log')).toContainText('Connected!', {
      timeout: 10000,
    })

    // 调用子应用方法
    const result = await page.evaluate(async () => {
      const remote = (window as any).remote
      return await remote.delayedMethod({ test: true })
    })

    expect(result).toEqual({ delayed: true, echo: { test: true } })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 测试组 2：传统模式通信
// ═══════════════════════════════════════════════════════════════════════════════
//
// 测试场景：父页面使用 SDK，子页面使用原生 postMessage
// 文件：parent.html (connectToIframe) ↔ child-traditional.html (postMessage)
//
// 适用场景：无法修改子页面代码，或子页面是第三方页面
//

test.describe('传统模式通信（子页面不使用 SDK）', () => {
  let page: Page
  let traditionalChildFrame: FrameLocator

  test.beforeEach(async ({ page: p }) => {
    page = p
    await page.goto('/tests/e2e/fixtures/parent.html')
    traditionalChildFrame = page.frameLocator('#traditional-iframe')

    // 等待传统子页面就绪
    await expect(traditionalChildFrame.locator('#log')).toContainText('Traditional child ready', {
      timeout: 5000,
    })
  })

  /**
   * 测试：传统子页面调用父页面方法
   *
   * 传统模式下，子页面通过 postMessage 发送请求，
   * 父页面的 SDK 会自动处理并返回结果
   */
  test('传统子页面调用父页面 getData 方法', async () => {
    // 子页面调用 getData
    await traditionalChildFrame.locator('#call-getData-btn').click()

    // 验证子页面发送了请求
    await expect(traditionalChildFrame.locator('#log')).toContainText('Sending:')
    await expect(traditionalChildFrame.locator('#log')).toContainText('getData')

    // 验证父页面收到调用
    await expect(page.locator('#traditional-log')).toContainText('getData called with:')

    // 验证子页面收到响应
    await expect(traditionalChildFrame.locator('#log')).toContainText('Response:')
    await expect(traditionalChildFrame.locator('#log')).toContainText('user-123')
  })

  /**
   * 测试：传统子页面调用 sendNotification 方法
   */
  test('传统子页面调用父页面 sendNotification 方法', async () => {
    await traditionalChildFrame.locator('#call-sendNotification-btn').click()

    // 验证父页面收到调用
    await expect(page.locator('#traditional-log')).toContainText('sendNotification called:')
    await expect(page.locator('#traditional-log')).toContainText('Hello from traditional child!')

    // 验证子页面收到成功响应
    await expect(traditionalChildFrame.locator('#log')).toContainText('sent')
    await expect(traditionalChildFrame.locator('#log')).toContainText('true')
  })

  /**
   * 测试：多次请求应该正确处理
   *
   * 验证 SDK 能正确处理来自传统页面的多次请求
   */
  test('传统子页面多次请求应正确处理', async () => {
    // 发送多个请求
    await traditionalChildFrame.locator('#call-getData-btn').click()
    await expect(traditionalChildFrame.locator('#log')).toContainText('getData result:')

    await traditionalChildFrame.locator('#call-sendNotification-btn').click()
    await expect(traditionalChildFrame.locator('#log')).toContainText('sendNotification result:')

    await traditionalChildFrame.locator('#call-getData-btn').click()
    // 等待第二次 getData 结果返回
    // nth(1) 表示第二个匹配的元素（0-indexed）
    await traditionalChildFrame.locator('#log').getByText('getData result:', { exact: false }).nth(1).waitFor()

    // 验证所有请求都完成
    const childLog = await traditionalChildFrame.locator('#log').textContent()
    const getDataCalls = (childLog?.match(/getData result/g) || []).length
    expect(getDataCalls).toBe(2)
  })

  /**
   * 测试：参数传递
   *
   * 验证请求参数能正确传递给父页面
   */
  test('请求参数应正确传递', async () => {
    // getData 请求携带参数 { id: 'item-456' }
    await traditionalChildFrame.locator('#call-getData-btn').click()

    // 验证父页面收到参数
    await expect(page.locator('#traditional-log')).toContainText('item-456')

    // 验证响应中包含请求的 ID
    await expect(traditionalChildFrame.locator('#log')).toContainText('item-456')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 测试组 3：错误处理
// ═══════════════════════════════════════════════════════════════════════════════
//
// 验证 SDK 能优雅地处理各种错误情况
//

test.describe('错误处理', () => {
  /**
   * 测试：调用不存在的方法
   *
   * 使用 page.evaluate() 在浏览器中执行 JavaScript 代码
   * 这是测试 SDK API 的常用技巧
   */
  test('方法不存在时优雅处理', async ({ page }) => {
    await page.goto('/tests/e2e/fixtures/parent.html')
    await expect(page.locator('#sdk-log')).toContainText('Connected to SDK child!')

    // 在浏览器中执行代码，调用不存在的方法
    // page.evaluate() 可以在浏览器环境中执行任意 JavaScript
    const result = await page.evaluate(async () => {
      try {
        // window.sdkRemote 是在 parent.html 中暴露的 SDK 远程对象
        const remote = (window as any).sdkRemote
        await remote.nonExistentMethod()
        return { success: true }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    })

    // 验证调用失败，并且错误信息包含 "not found"
    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })

  /**
   * 测试：远程方法抛出错误
   *
   * 验证当子页面方法抛出错误时，父页面能收到正确的错误信息
   */
  test('远程方法抛出错误时优雅处理', async ({ page }) => {
    await page.goto('/tests/e2e/fixtures/parent.html')
    const sdkChildFrame = page.frameLocator('#sdk-iframe')
    await expect(page.locator('#sdk-log')).toContainText('Connected to SDK child!')

    // 调用一个会抛出错误的方法
    const result = await page.evaluate(async () => {
      try {
        const remote = (window as any).sdkRemote
        await remote.childFailingMethod()
        return { success: true }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Intentional failure')
  })

  /**
   * 测试：传统模式下调用未知方法
   */
  test('传统子页面调用未知方法时优雅处理', async ({ page }) => {
    await page.goto('/tests/e2e/fixtures/parent.html')
    const traditionalChildFrame = page.frameLocator('#traditional-iframe')
    await expect(traditionalChildFrame.locator('#log')).toContainText('Traditional child ready')

    // 在 iframe 内执行代码
    // 注意：要先获取 iframe 内的 body，再调用 evaluate
    const result = await traditionalChildFrame.locator('body').evaluate(async () => {
      try {
        const testAPI = (window as any).testAPI
        await testAPI.callParent('unknownMethod', {})
        return { success: true }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 测试组 4：连接生命周期
// ═══════════════════════════════════════════════════════════════════════════════
//
// 测试 SDK 的生命周期方法：创建、销毁、事件监听等
//

test.describe('连接生命周期', () => {
  /**
   * 测试：销毁连接
   *
   * 验证 destroy() 后，通道不再工作
   */
  test('通道可正常销毁', async ({ page }) => {
    await page.goto('/tests/e2e/fixtures/parent.html')
    await expect(page.locator('#sdk-log')).toContainText('Connected to SDK child!')

    await page.evaluate(() => {
      const channel = (window as any).sdkChannel
      const remote = (window as any).sdkRemote
      const outcomes = (window as any).destroyOutcomes = { pending: 'pending', later: 'pending' }
      const record = (key: string, call: Promise<unknown>) => call.then(
        () => { outcomes[key] = 'resolved' },
        (error: Error) => { outcomes[key] = error.message }
      )
      record('pending', remote.childMethod())
      channel.destroy()
      record('later', remote.childMethod())
    })

    await expect.poll(() => page.evaluate(() => (window as any).destroyOutcomes)).toEqual({
      pending: expect.stringMatching(/destroy/i),
      later: expect.stringMatching(/destroy/i),
    })
  })

  /**
   * 测试：事件监听器可移除
   *
   * 验证 on() 和 off() 方法正常工作
   */
  test('事件监听器可正常移除', async ({ page }) => {
    await page.goto('/tests/e2e/fixtures/parent.html')
    const sdkChildFrame = page.frameLocator('#sdk-iframe')
    await expect(page.locator('#sdk-log')).toContainText('Connected to SDK child!')

    await page.evaluate(() => {
      const channel = (window as any).sdkChannel
      const counts = (window as any).eventCounts = { removed: 0, retained: 0 }
      const handler = (window as any).removedHandler = () => { counts.removed++ }
      channel.on('TEST_EVENT', handler)
      channel.on('TEST_EVENT', () => { counts.retained++ })
    })
    await sdkChildFrame.locator('body').evaluate(() => {
      ;(window as any).channel.emit('TEST_EVENT')
    })
    await expect.poll(() => page.evaluate(() => (window as any).eventCounts)).toEqual({ removed: 1, retained: 1 })

    await page.evaluate(() => {
      ;(window as any).sdkChannel.off('TEST_EVENT', (window as any).removedHandler)
    })
    await sdkChildFrame.locator('body').evaluate(() => {
      ;(window as any).channel.emit('TEST_EVENT')
    })
    await expect.poll(() => page.evaluate(() => (window as any).eventCounts)).toEqual({ removed: 1, retained: 2 })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 测试组 5：跨浏览器兼容性
// ═══════════════════════════════════════════════════════════════════════════════
//
// 验证 SDK 在不同浏览器中都能正常工作
// 注意：需要在 config/playwright.config.ts 中配置多个浏览器才会执行多次
//

test.describe('跨浏览器兼容性', () => {
  /**
   * 测试：基本通信功能
   *
   * browserName 参数由 Playwright 自动注入，表示当前测试运行的浏览器
   */
  test('postMessage 通信正常工作', async ({ page, browserName }) => {
    await page.goto('/tests/e2e/fixtures/parent.html')

    // 等待连接建立
    await expect(page.locator('#sdk-log')).toContainText('Connected to SDK child!')

    // 执行基本调用
    await page.click('#sdk-call-btn')
    await expect(page.locator('#sdk-log')).toContainText('Result:')

    // 打印浏览器名称，方便在报告中查看
    console.log(`Test passed on ${browserName}`)
  })
})
