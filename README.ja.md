# iframe-rpc-kit

`window.postMessage` を使った、iframe と親ページ間の Promise ベース RPC / イベント通信です。

[English](README.md) · [简体中文](README.zh-CN.md) · 日本語

![iframe-rpc-kit SDK デモ](docs/assets/sdk-demo.png)

Promise RPC · イベント · ハンドシェイク再試行 · Origin 検証 · SDK を使わない子ページからのリクエスト · ESM / CJS / TypeScript

## インストール

```bash
pnpm add iframe-rpc-kit
# npm install iframe-rpc-kit
# yarn add iframe-rpc-kit
```

## 使い方

親ページ：

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

子ページ：

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

`connectToIframe()` と `connectToParent()` は `{ promise, on, off, emit, destroy }` を返します。iframe を削除するときは `destroy()` を呼び出してください。

## 注意点

- 本番環境では信頼できる Origin を明示し、`'*'` は使用しないでください。
- 親側は設定した Origin と送信元 iframe を検証します。子側は `allowedOrigins` で検証し、READY は `targetOrigin: '*'` で送信されます。
- メッセージの値は JSON でシリアライズ可能である必要があります。各 RPC には、省略可能なペイロードを 1 つ渡せます。
- RPC のタイムアウトとキャンセルは内蔵していません。READY を 5 回送っても ACK が届かない場合、`promise` は pending のままです。
- SDK を使わない子ページとの互換経路は「子ページ → SDK 親ページ」のみです。READY がない場合、親側の `promise` は pending のままです。

## ライセンス

[MIT](LICENSE)
