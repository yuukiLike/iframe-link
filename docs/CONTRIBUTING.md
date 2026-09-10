# 贡献指南

## Heuristics · 启发式

**heuristic** /ˌhjʊ(ə)ˈrɪstɪk/

A technique designed for solving a problem more quickly when classic methods are too slow, or for finding an approximate solution when classic methods fail to find any exact solution.

一种技术，旨在当经典方法过慢时更快地解决问题，或在经典方法无法找到任何精确解时找到近似解。

| English | 中文 |
|---------|------|
| Priority is the best User Experience | 优先考虑最佳用户体验 |
| Complexity should be introduced when it’s inevitable | 当复杂性不可避免时，才应引入复杂性 |
| Code should be easy to reason about | 代码应该易于理解 |
| Code should be easy to delete | 代码应该易于删除 |
| Avoid abstracting too early | 避免过早抽象 |
| Avoid thinking too far in the future | 避免考虑过于长远的未来 |

## 开发环境

本项目使用 pnpm，版本由 `package.json` 的 `packageManager` 字段指定。依赖版本统一记录在 `pnpm-lock.yaml` 中。

```bash
# 安装依赖
pnpm install

# 安装 Playwright 浏览器（首次）
pnpm exec playwright install chromium

# 启动开发模式（自动构建 + 预览）
pnpm run dev
```

`pnpm run dev` 会同时启动：
- `tsup --config config/tsup.config.ts --watch` - 监听 src 变化自动构建
- `live-server` - 打开示例页面，构建完成后自动刷新浏览器

修改源码后无需手动重新构建。

演示页面默认使用英文。中文和日文分别访问 `http://127.0.0.1:3000/examples/index.html?lang=zh-CN` 和 `http://127.0.0.1:3000/examples/index.html?lang=ja`。

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

config/               # 构建、单元测试与 E2E 配置
examples/             # 演示页面
docs/                 # 文档
```

## 测试

```bash
pnpm test              # 单元测试
pnpm run test:e2e      # E2E 测试
pnpm run test:all      # 全部测试
```

详细调试方法参见 [测试指南](TESTING_GUIDE.md)

## 发布

包名为 `iframe-link`，`package.json` 中的 `publishConfig` 将发布目标固定为 npm 官方源，并将包设为公开。

```bash
pnpm whoami              # 确认 npm 发布账号
pnpm publish             # 发布当前 package.json 中的版本
```

发布前先检查并提交代码、版本和文档改动。pnpm 默认检查发布分支、工作区和远端同步状态。

日常安装依赖使用 `pnpm install`；发布时直接执行 `pnpm publish`，无需另外记忆或手动执行发布检查。发布命令会自动依次完成：

1. 按已提交的锁文件安装依赖（`prepublishOnly` 中的 `pnpm install --frozen-lockfile`）。锁文件缺失或与依赖声明不一致时，停止发布。
2. 运行全部单元测试和 E2E 测试，失败时停止发布。
3. 构建、打包并发布当前版本到 npm 官方源。

需要调整依赖时，在开发阶段更新并提交 `package.json` 和 `pnpm-lock.yaml`，再重新发布。

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
