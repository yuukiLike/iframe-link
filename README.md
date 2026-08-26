# iframe-rpc-kit

Promise-based RPC and events between an iframe and its parent, built on `window.postMessage`.

English · [简体中文](README.zh-CN.md) · [日本語](README.ja.md)

![iframe-rpc-kit SDK demo](docs/assets/sdk-demo.png)

Promise RPC · Events · Handshake retries · Origin checks · SDK-less child requests · ESM / CJS / TypeScript

## Install

```bash
pnpm add iframe-rpc-kit
# npm install iframe-rpc-kit
# yarn add iframe-rpc-kit
```

## Usage

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
await child.getStatus({ userId: '42' })

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
await parent.getTheme()

channel.emit('STATUS_CHANGED', { online: true })
```

`connectToIframe()` and `connectToParent()` return `{ promise, on, off, emit, destroy }`. Call `destroy()` when the iframe is removed.

## Notes

- Configure exact trusted Origins in production; do not use `'*'`.
- The parent checks both the configured Origin and iframe window. The child checks `allowedOrigins`; READY messages use `targetOrigin: '*'`.
- Message values must be JSON-serializable. Each RPC accepts one optional payload.
- RPC timeout and cancellation are not built in. Without an ACK after five READY attempts, `promise` stays pending.
- SDK-less child compatibility is child → SDK parent only. Without READY, the parent's `promise` stays pending.

## License

[MIT](LICENSE)
