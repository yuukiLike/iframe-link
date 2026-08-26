# iframe-rpc-kit

`window.postMessage` を使い、iframe と親ページの間に Promise ベースの双方向 RPC とイベント通信を提供します。

[English](README.md) · [简体中文](README.zh-CN.md) · 日本語

![iframe-rpc-kit SDK デモ](docs/assets/sdk-demo.png)

## 特長

- 親子のどちら側からでも、Promise でリモートメソッドを呼び出せます。
- `on`、`off`、`emit` でイベントを送受信できます。
- READY/ACK ハンドシェイクと自動再試行で、読み込み順の違いに対応します。
- 親側では、期待する Origin と対象 iframe を確認してからメッセージを受け付けます。
- SDK を導入しない子ページからも、SDK を使う親側のメソッドを呼び出せます。
- ESM、CommonJS、TypeScript の型定義を提供します。

## インストール

```bash
pnpm add iframe-rpc-kit
# npm install iframe-rpc-kit
# yarn add iframe-rpc-kit
```

## クイックスタート

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
const status = await child.getStatus({ userId: '42' })

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
const theme = await parent.getTheme()

channel.emit('STATUS_CHANGED', { online: true })
```

iframe またはそのコンポーネントを削除するときは、`channel.destroy()` を呼び出してください。

## SDK を使わない子ページ

SDK を使う親ページは、通常の `postMessage` リクエストも受信できます。子ページが `{ action, data, requestId }` を送り、親ページが `__NATIVE_RESPONSE__` で応答します。

![SDK を使う親ページと SDK／ネイティブ子ページの通信](docs/assets/native-bridge.png)

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

この互換パスは「SDK を使わない子ページ → SDK を使う親ページ」専用です。SDK のリモートプロキシからネイティブ子ページを呼び出せるようにはなりません。ネイティブ子ページは READY を送らないため、親側の `channel.promise` は pending のまま残ります。

## セキュリティと制限

- 本番環境では信頼できる Origin を明示し、`'*'` は使用しないでください。
- RPC の引数と戻り値、イベントデータ、ネイティブ応答は JSON でシリアライズ可能である必要があります。各リモート呼び出しが受け取る引数は、1 個の任意ペイロードです。
- 親側では、設定した Origin と送信元 iframe の両方を確認します。
- 子側では `allowedOrigins` に基づいて Origin を確認します。現在の実装では `event.source === window.parent` を別途必須にはしていません。
- 親 Origin が確定する前は、子側の READY は `targetOrigin: '*'` で送信されます。受信メッセージには引き続き `allowedOrigins` の確認が適用されます。
- RPC のタイムアウトとキャンセルは内蔵していません。
- 子側は READY を最大 5 回送信します。ACK が届かない場合も `channel.promise` は reject されず、pending のまま残ります。

`debug: true` でデバッグログを有効にできます。または `localStorage.debug = 'iframe-rpc-kit:*'` を設定してページを再読み込みしてください。

## API

| 関数 | 用途 |
| --- | --- |
| `connectToIframe(options)` | 親ページから対象 iframe に接続します。 |
| `connectToParent(options)` | iframe から親ページに接続します。 |

どちらも次の値を返します。

| メンバー | 用途 |
| --- | --- |
| `promise` | ハンドシェイク後、リモートメソッドのプロキシに解決されます。 |
| `on(type, handler)` | イベントを購読します。 |
| `off(type, handler)` | イベント購読を解除します。 |
| `emit(type, data?)` | 相手側へイベントを送信します。 |
| `destroy()` | リスナーを削除し、保留中の RPC を reject します。 |

## 開発

```bash
npm ci
npm test
npm run test:e2e
npm run build
```

## ライセンス

[MIT](LICENSE)
