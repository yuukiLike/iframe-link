# iframe-channel

Promise 风格的 iframe 双向通信 SDK，把 postMessage 变成函数调用。

## 为什么用？

| 原生 postMessage | SDK |
|------------------|-----|
| 手动匹配请求/响应 | 自动匹配 |
| 回调地狱 | Promise |
| 不知道对方是否就绪 | 握手 + 重试 |
| 手动检查 origin | 内置安全检查 |
| 无调试工具 | debug 日志 |

## 安装

```bash
npm install iframe-channel
```

## 使用

**父应用**

```ts
import { connectToIframe } from 'iframe-channel'

const channel = connectToIframe({
  iframe: '#myIframe',
  origin: 'https://child.com',
  methods: {
    getData: async () => ({ user: 'test' })
  }
})

const remote = await channel.promise
const result = await remote.childMethod()

channel.on('EVENT_NAME', (data) => console.log(data))
```

**子应用**

```ts
import { connectToParent } from 'iframe-channel'

const channel = connectToParent({
  allowedOrigins: ['https://parent.com'],
  methods: {
    childMethod: async () => ({ ok: true })
  }
})

const remote = await channel.promise
await remote.getData()

channel.emit('EVENT_NAME', { foo: 'bar' })
```

## 握手流程

```
子应用（主动方）              父应用（被动方）
     |                           |
     |--- READY (1/5) --->       |  等待中...
     |--- READY (2/5) --->       |  开始监听
     |                           |  ✓ 收到 READY
     |<------ ACK -----------    |
     |  ✓ 握手完成                |
```

- **子应用**：主动发起，自动重试（最多 5 次，间隔 1 秒）
- **父应用**：被动等待，收到 READY 后回复 ACK
- 握手完成后，双方可通过 `remote` 调用对方方法

## 调试

```typescript
// 代码启用
connectToParent({
  allowedOrigins: ['https://parent.com'],
  debug: true
})

// 或 localStorage（刷新生效）
localStorage.debug = 'iframe-sdk:*'
```

## API

### connectToIframe(options)

| 参数 | 类型 | 说明 |
|------|------|------|
| iframe | `string \| HTMLIFrameElement` | iframe 选择器或元素 |
| origin | `string` | 子应用源 |
| methods | `Record<string, Function>` | 暴露的方法 |
| debug | `boolean` | 调试模式 |

### connectToParent(options)

| 参数 | 类型 | 说明 |
|------|------|------|
| allowedOrigins | `string[]` | 允许的父应用源 |
| methods | `Record<string, Function>` | 暴露的方法 |
| debug | `boolean` | 调试模式 |

### 返回值

| 属性/方法 | 说明 |
|-----------|------|
| `promise` | 握手完成后返回远程方法代理 |
| `on(event, handler)` | 监听事件 |
| `off(event, handler)` | 移除监听 |
| `emit(event, data)` | 发送事件 |
| `destroy()` | 销毁连接 |

## 原生模式

子应用无需 SDK，直接用 postMessage：

```js
// 请求
window.parent.postMessage({
  action: 'getData',
  data: { id: 1 },
  requestId: 'req-1'
}, 'https://parent.com')

// 响应
window.addEventListener('message', (e) => {
  if (e.data.type === '__NATIVE_RESPONSE__') {
    console.log(e.data.result)
  }
})
```

## 开发

```bash
npm run dev       # 开发
npm run build     # 构建
npm run test:all  # 测试
```

## License

MIT
