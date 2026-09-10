Current goal: 为 iframe-link 的英中日 README 使用对应语言的真实截图，将说明文档及唯一 evidence 迁入 docs、工具配置迁入 config，保持根目录简洁及现有 SDK 功能范围。
Last verified result: 2026-09-10 迁移后 30 个单测、24 个 Chromium E2E、类型检查和构建通过；三语演示的双模式交互、原生子页提前加载及英文回退通过；三张 1440×1000 截图无截断，仓库与安装包 README 本地链接有效，离线安装后 ESM/CJS 导入通过。2026-09-11 已发布 [iframe-link@1.0.0](https://www.npmjs.com/package/iframe-link/v/1.0.0)，并推送 [v1.0.0 源码标签](https://github.com/yuukiLike/iframe-link/tree/v1.0.0)；从官方源安装后的 ESM/CJS 导入与 TypeScript 类型声明验证通过。
Known failure: 本轮目标范围内未发现残留失败；浏览器仅验证 Chromium。
Next verification: 当前目标无需进一步验证。
