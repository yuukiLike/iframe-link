# iframe RPC

基于 `window.postMessage`，在 iframe 与父页面之间提供轻量的 Promise RPC 与事件通信。

[English](README.md) · 简体中文 · [日本語](README.ja.md)

## 为什么使用

`postMessage` 只负责传递消息，并不会处理请求标识、Promise 响应、事件分发，也无法可靠确认另一端何时就绪。每个 iframe 都重复实现这些逻辑既繁琐，也容易遗漏 Origin 校验。

这个 SDK 将父页面与 iframe 连接成一个轻量的双向通道：暴露方法、等待远程调用、发送事件，并通过 READY/ACK 握手处理加载顺序差异。

![iframe RPC 演示](docs/assets/sdk-demo.png)

## 安装

npm 包名仍在确定中。

```bash
pnpm add <package-name>
# npm install <package-name>
# yarn add <package-name>
```

## 快速开始

### 父页面

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

### 子页面

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

移除 iframe 时，请调用 `channel.destroy()`。

## API

`connectToIframe({ iframe, origin, methods })` 让父页面连接 iframe，`connectToParent({ allowedOrigins, methods })` 让 iframe 连接父页面。

| 成员 | 用途 |
| --- | --- |
| `promise` | 握手完成后解析为远程方法代理。 |
| `on(type, handler)` | 监听事件。 |
| `off(type, handler)` | 移除事件监听。 |
| `emit(type, data?)` | 向另一端发送事件。 |
| `destroy()` | 移除监听，并拒绝仍在等待的 RPC。 |

`methods` 用于向另一端暴露本地方法。

## 安全与限制

- 生产环境请配置明确可信的 Origin，不要配置通配 Origin。
- 父页面会校验配置的 Origin 与来源 iframe；子页面通过 `allowedOrigins` 校验，但不会单独要求 `event.source === window.parent`。READY 消息使用 `targetOrigin: '*'`。
- 消息内容必须可被 JSON 序列化；每次 RPC 只接收一个可选参数。
- 当前没有内置的超时或取消机制。连续 5 次 READY 未收到 ACK 时，`promise` 会保持 pending。
- 未使用 SDK 的子页面可以调用 SDK 父页面暴露的方法，但不会完成 SDK 握手。

## 许可证

[MIT](LICENSE)
