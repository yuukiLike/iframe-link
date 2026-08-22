# 贡献指南

## 开发环境

```bash
# 安装依赖
npm install

# 安装 Playwright 浏览器（首次）
npx playwright install chromium

# 启动开发模式（自动构建 + 预览）
npm run dev
```

`npm run dev` 会同时启动：
- `tsup --watch` - 监听 src 变化自动构建
- `live-server` - 打开示例页面，构建完成后自动刷新浏览器

修改源码后无需手动重新构建。

## 项目结构

```
src/
├── index.ts          # 入口，导出 API
├── types.ts          # 类型定义
├── channelConnect.ts # 连接逻辑（connectToIframe/connectToParent）
├── channelBridge.ts  # 底层消息桥接
└── utils.ts          # RPC、事件系统、工具函数

tests/
├── unit/             # 单元测试（Vitest）
└── e2e/              # E2E 测试（Playwright）
    └── fixtures/     # 测试用 HTML 页面

examples/             # 演示页面
docs/                 # 文档
```

## 测试

```bash
npm test              # 单元测试
npm run test:e2e      # E2E 测试
npm run test:all      # 全部测试
```

详细调试方法参见 [docs/TESTING_GUIDE.md](./docs/TESTING_GUIDE.md)

## 代码规范

- TypeScript 严格模式
- 异常优先（Guard Clause）
- 清晰命名，避免魔法值
- 保持函数单一职责

## 提交规范

格式：`<type>: <description>`

| type | 说明 |
|------|------|
| feat | 新功能 |
| fix | 修复 bug |
| docs | 文档更新 |
| refactor | 重构 |
| test | 测试相关 |
| chore | 构建/工具 |

示例：
```
feat: 添加超时配置选项
fix: 修复握手失败时的内存泄漏
docs: 更新 API 文档
```
