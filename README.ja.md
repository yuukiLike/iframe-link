# iframe RPC

`window.postMessage` を使い、iframe と親ページの間で軽量な Promise ベースの RPC とイベント通信を実現します。

[English](README.md) · [简体中文](README.zh-CN.md) · 日本語

## 特長

`postMessage` はメッセージを送るだけで、リクエスト ID、Promise による応答、イベントの振り分け、相手側の準備完了を確実に確認する仕組みまでは提供しません。iframe ごとに同じ仕組みを作り直すのは手間がかかり、Origin 検証も見落としやすくなります。

この SDK は親ページと iframe を小さな双方向チャネルでつなぎます。メソッドの公開、リモート呼び出し、イベント送信に加え、READY/ACK ハンドシェイクで読み込み順の違いにも対応します。

![iframe RPC デモ](docs/assets/sdk-demo.png)

## インストール

npm パッケージ名は現在検討中です。

```bash
pnpm add <package-name>
# npm install <package-name>
# yarn add <package-name>
```

## クイックスタート

### 親ページ

```ts
import { connectToIframe } from '<package-name>'

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

channel.on('STATUS_CHANGED', console.log)

const child = await channel.promise
await child.getStatus({ userId: '42' })
```

### 子ページ

```ts
import { connectToParent } from '<package-name>'

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

iframe を削除するときは `channel.destroy()` を呼び出してください。

## API

`connectToIframe({ iframe, origin, methods })` は親ページから iframe へ接続し、`connectToParent({ allowedOrigins, methods })` は iframe から親ページへ接続します。

| メンバー | 用途 |
| --- | --- |
| `promise` | ハンドシェイク後、リモートメソッドのプロキシに解決されます。 |
| `on(type, handler)` | イベントを購読します。 |
| `off(type, handler)` | イベント購読を解除します。 |
| `emit(type, data?)` | 相手側へイベントを送信します。 |
| `destroy()` | リスナーを削除し、保留中の RPC を reject します。 |

`methods` で相手側にローカルメソッドを公開します。

## セキュリティと制限

- 本番環境では信頼できる Origin を明示し、ワイルドカードの Origin は設定しないでください。
- 親側は設定した Origin と送信元 iframe を検証します。子側は `allowedOrigins` で検証しますが、`event.source === window.parent` は個別に要求しません。READY は `targetOrigin: '*'` で送信されます。
- メッセージの値は JSON でシリアライズ可能である必要があります。各 RPC には、省略可能なペイロードを 1 つ渡せます。
- タイムアウトとキャンセルは内蔵していません。READY を 5 回送っても ACK が届かない場合、`promise` は pending のままです。
- SDK を使わない子ページから親側の公開メソッドを呼び出せますが、SDK のハンドシェイクは完了しません。

## ライセンス

[MIT](LICENSE)
