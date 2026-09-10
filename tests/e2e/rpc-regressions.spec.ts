import { expect, test, type Page } from '@playwright/test'

const parentOrigin = 'http://localhost:3456'
const childOrigin = 'http://127.0.0.1:3456'

async function openChannels(page: Page, allowParent = true) {
  const methods = `
    window.calls = 0;
    const methods = {
      echo: value => value,
      touch: () => ++window.calls,
      emptyError: () => { throw new Error(''); },
      circularResult: () => { const value = {}; value.self = value; return value; }
    };
  `
  await page.route('**/rpc-regression/*', async route => {
    const role = new URL(route.request().url()).pathname.split('/').pop()
    const body = role === 'parent' ? `
      <iframe id="child" src="${childOrigin}/rpc-regression/child"></iframe>
      <iframe id="sibling" src="${parentOrigin}/rpc-regression/sibling"></iframe>
      <script type="module">
        import { connectToIframe } from '/dist/index.js';
        ${methods}
        window.messages = [];
        addEventListener('message', event => window.messages.push(event.data));
        window.connect = async () => {
          window.channel = connectToIframe({
            iframe: document.querySelector('#child'), origin: '${childOrigin}', methods
          });
          window.remote = await window.channel.promise;
        };
      </script>
    ` : role === 'child' ? `
      <script type="module">
        import { connectToParent } from '/dist/index.js';
        ${methods}
        window.connected = false;
        window.messages = [];
        addEventListener('message', event => {
          window.messages.push(event.data);
          if (event.data.barrier) event.source.postMessage({
            barrier: event.data.barrier, connected: window.connected, calls: window.calls
          }, event.origin);
        });
        window.channel = connectToParent({ allowedOrigins: ['${allowParent ? parentOrigin : 'https://allowed.example'}'], methods });
        window.channel.promise.then(remote => { window.remote = remote; window.connected = true; });
      </script>
    ` : '<body>Sibling</body>'
    await route.fulfill({ contentType: 'text/html', body })
  })
  await page.goto('/rpc-regression/parent')
  const child = page.frames().find(frame => frame.url() === `${childOrigin}/rpc-regression/child`)!
  const sibling = page.frames().find(frame => frame.url() === `${parentOrigin}/rpc-regression/sibling`)!
  await child.waitForFunction(() => Boolean((window as any).channel))
  await page.waitForFunction(() => Boolean((window as any).connect))
  return { child, sibling }
}

test('子端拒绝允许 Origin 的兄弟窗口伪造握手和 RPC', async ({ page }) => {
  const { sibling } = await openChannels(page)
  const attack = async () => sibling.evaluate(childOrigin => new Promise(resolve => {
    const barrier = crypto.randomUUID()
    const receive = (event: MessageEvent) => {
      if (event.data.barrier !== barrier) return
      removeEventListener('message', receive)
      resolve({ connected: event.data.connected, calls: event.data.calls })
    }
    addEventListener('message', receive)
    const target = parent.frames[0]
    target.postMessage({ type: 'ACK' }, childOrigin)
    target.postMessage({ type: 'CALL', id: barrier, method: 'touch' }, childOrigin)
    target.postMessage({ barrier }, childOrigin)
  }), childOrigin)

  expect(await attack()).toEqual({ connected: false, calls: 0 })
  await page.evaluate(async () => { await (window as any).connect() })
  expect(await page.evaluate(() => (window as any).remote.touch())).toBe(1)
  expect(await attack()).toEqual({ connected: true, calls: 1 })
})

test('子端握手前不会向白名单之外的父页面泄露事件', async ({ page }) => {
  const { child } = await openChannels(page, false)
  await child.evaluate(() => {
    ;(window as any).channel.emit('SECRET', { token: 'private-before-handshake' })
    parent.postMessage({ barrier: 'event-sent' }, '*')
  })
  await expect.poll(() => page.evaluate(() => (window as any).messages.some((message: any) => message.barrier === 'event-sent'))).toBe(true)
  expect(await page.evaluate(() => (window as any).messages.filter((message: any) => message.type === 'EVENT'))).toEqual([])
  expect(await child.evaluate(() => (window as any).connected)).toBe(false)
})

test('可信父页面完成握手后能收到子端事件', async ({ page }) => {
  const { child } = await openChannels(page)
  await page.evaluate(async () => { await (window as any).connect() })
  await child.waitForFunction(() => (window as any).connected)
  await child.evaluate(() => { (window as any).channel.emit('TRUSTED', { value: 42 }) })
  await expect.poll(() => page.evaluate(() => (window as any).messages.find((message: any) => message.eventType === 'TRUSTED'))).toEqual({
    type: 'EVENT', eventType: 'TRUSTED', data: { value: 42 },
  })
})

test('SDK 与原生响应都将空字符串 Error 视为失败', async ({ page }) => {
  const { child } = await openChannels(page)
  await page.evaluate(async () => { await (window as any).connect() })
  const sdk = await page.evaluate(async () => {
    try {
      await (window as any).remote.emptyError()
      return { status: 'resolved' }
    } catch (error) {
      return { status: 'rejected', message: (error as Error).message }
    }
  })
  expect(sdk).toEqual({ status: 'rejected', message: '' })
  await child.evaluate(parentOrigin => {
    parent.postMessage({ action: 'emptyError', requestId: 'empty-error' }, parentOrigin)
  }, parentOrigin)
  await expect.poll(() => child.evaluate(() => (window as any).messages.find((message: any) => message.requestId === 'empty-error'))).toEqual({
    type: '__NATIVE_RESPONSE__', action: 'emptyError', requestId: 'empty-error', success: false, error: '',
  })
})

for (const direction of ['parent', 'child'] as const) {
  test(`${direction} 端发送循环参数及接收不可序列化返回值会拒绝，之后 RPC 仍可用`, async ({ page }) => {
    const { child } = await openChannels(page)
    await page.evaluate(async () => { await (window as any).connect() })
    await child.waitForFunction(() => (window as any).connected)
    const caller = direction === 'parent' ? page : child
    await caller.evaluate(() => {
      const remote = (window as any).remote
      const outcomes = (window as any).outcomes = { params: 'pending', result: 'pending' }
      const record = (key: string, call: Promise<unknown>) => call.then(
        () => { outcomes[key] = 'resolved' },
        () => { outcomes[key] = 'rejected' }
      )
      const params: any = {}
      params.self = params
      record('params', remote.echo(params))
      record('result', remote.circularResult())
    })
    await expect.poll(() => caller.evaluate(() => (window as any).outcomes)).toEqual({ params: 'rejected', result: 'rejected' })
    expect(await caller.evaluate(() => (window as any).remote.echo({ healthy: true }))).toEqual({ healthy: true })
  })
}
