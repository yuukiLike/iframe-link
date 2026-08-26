# iframe-rpc-kit

Promise-based, bidirectional RPC and events between an iframe and its parent, built on `window.postMessage`.

English · [简体中文](README.zh-CN.md) · [日本語](README.ja.md)

![iframe-rpc-kit SDK demo](docs/assets/sdk-demo.png)

## Why

- Call remote methods from either side with Promises.
- Send events with `on`, `off`, and `emit`.
- Survive parent/child load-order races with a READY/ACK handshake and retries.
- Check the expected origin and target iframe before accepting parent-side messages.
- Let a native child call methods exposed by an SDK parent without installing the package.
- Ship ESM, CommonJS, and TypeScript declarations.

## Install

```bash
pnpm add iframe-rpc-kit
# npm install iframe-rpc-kit
# yarn add iframe-rpc-kit
```

## Quick start

Parent:

```ts
import { connectToIframe } from 'iframe-rpc-kit'

type ChildApi = {
  getStatus(input: { userId: string }): Promise<{ online: boolean }>
}

const channel = connectToIframe<ChildApi>({
  iframe: '#profile-frame',
  origin: 'https://child.example.com',
  methods: {
    getTheme: async () => ({ accent: '#3b82f6' })
  }
})

const child = await channel.promise
const status = await child.getStatus({ userId: '42' })

channel.on('STATUS_CHANGED', console.log)
```

Child:

```ts
import { connectToParent } from 'iframe-rpc-kit'

type ParentApi = {
  getTheme(): Promise<{ accent: string }>
}

const channel = connectToParent<ParentApi>({
  allowedOrigins: ['https://app.example.com'],
  methods: {
    getStatus: async ({ userId }) => ({ userId, online: true })
  }
})

const parent = await channel.promise
const theme = await parent.getTheme()

channel.emit('STATUS_CHANGED', { online: true })
```

Call `channel.destroy()` when the iframe or owning component is removed.

## Native child

An SDK parent can also receive requests from a child that uses plain `postMessage`. The child sends `{ action, data, requestId }`; the parent replies with `__NATIVE_RESPONSE__`.

![SDK parent communicating with SDK and native children](docs/assets/native-bridge.png)

```js
const parentOrigin = 'https://app.example.com'
const requestId = crypto.randomUUID()

window.parent.postMessage(
  { action: 'getTheme', data: {}, requestId },
  parentOrigin
)

window.addEventListener('message', (event) => {
  if (event.origin !== parentOrigin || event.source !== window.parent) return

  const message = event.data
  if (message?.type === '__NATIVE_RESPONSE__' && message.requestId === requestId) {
    if (message.success) console.log(message.result)
    else console.error(message.error)
  }
})
```

This compatibility path is native child → SDK parent. It does not make a native child callable through the SDK remote proxy. Because a native child does not send READY, the parent's `channel.promise` stays pending.

## Security and limits

- Use exact trusted origins in production. Do not use `'*'`.
- RPC arguments and results, event data, and native responses must be JSON-serializable. Each remote call accepts one optional payload.
- Parent-side messages are checked against both the configured origin and the target iframe window.
- Child-side messages are checked against `allowedOrigins`; the current implementation does not separately require `event.source === window.parent`.
- Before the parent Origin is known, the child sends READY with `targetOrigin: '*'`. Incoming messages are still checked against `allowedOrigins`.
- There is no built-in RPC timeout or cancellation.
- The child sends READY up to five times. If no ACK arrives, `channel.promise` stays pending rather than rejecting.

Enable debug logs with `debug: true`, or set `localStorage.debug = 'iframe-rpc-kit:*'` and reload.

## API

| Function | Purpose |
| --- | --- |
| `connectToIframe(options)` | Connect a parent page to a target iframe. |
| `connectToParent(options)` | Connect an iframe to its parent page. |

Both return:

| Member | Purpose |
| --- | --- |
| `promise` | Resolves to the remote method proxy after the handshake. |
| `on(type, handler)` | Subscribe to an event. |
| `off(type, handler)` | Unsubscribe from an event. |
| `emit(type, data?)` | Emit an event to the other side. |
| `destroy()` | Remove listeners and reject pending RPC calls. |

## Development

```bash
npm ci
npm test
npm run test:e2e
npm run build
```

## License

[MIT](LICENSE)
