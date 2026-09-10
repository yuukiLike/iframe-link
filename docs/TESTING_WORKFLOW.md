# 测试工作流程 v3

结合分层结构 + 标准配色 + 高级时序图特性的最终版本。

---

## 单元测试流程（Vitest + happy-dom）

### 整体执行流程

```mermaid
flowchart TD
    subgraph 命令层
        A[🚀 pnpm test]:::startNode
        B[⚙️ vitest run --config config/vitest.config.ts]:::apiCall
    end

    subgraph 配置层
        C[📄 读取 config/vitest.config.ts]:::dataDisplay
        D[🌐 初始化 happy-dom 环境]:::apiCall
        E[📂 扫描 tests/unit/**/*.test.ts]:::dataDisplay
    end

    subgraph 执行层
        F[📦 加载测试文件]:::apiCall
        G[🔗 import 源码模块]:::apiCall
        H[📋 执行 describe 块]:::userAction
        I[🧪 执行 it 块]:::userAction
        J{断言通过}:::condition
    end

    subgraph 结果层
        K[✅ passed]:::statusDisplay
        L[❌ failed]:::statusDisplay
        M[📊 汇总测试结果]:::dataDisplay
        N[📝 输出报告]:::endNode
    end

    A --> B
    B --> C --> D --> E
    E --> F --> G --> H --> I --> J
    J -->|是| K
    J -->|否| L
    K --> M
    L --> M
    M --> N

    classDef startNode fill:#CBE8B2,stroke:#000,stroke-width:2px,color:#000
    classDef endNode fill:#CBE8B2,stroke:#000,stroke-width:2px,color:#000
    classDef apiCall fill:#FFF9C4,stroke:#FFB300,stroke-width:2px,color:#000
    classDef dataDisplay fill:#F3E5F5,stroke:#9C27B0,stroke-width:2px,color:#000
    classDef userAction fill:#E8F5E9,stroke:#4CAF50,stroke-width:2px,color:#000
    classDef statusDisplay fill:#E3F2FD,stroke:#2196F3,stroke-width:2px,color:#000
    classDef condition fill:#BBDEFB,stroke:#2196F3,stroke-width:2px,color:#000
```

### 单元测试数据流时序

```mermaid
sequenceDiagram
    autonumber
    participant CLI as 命令行
    participant V as Vitest
    participant H as happy-dom
    participant T as 测试文件
    participant S as 源码模块

    %% 初始化阶段
    CLI->>V: 执行 pnpm test [🟢用户操作]
    V->>V: 读取配置文件 [🔸配置加载]
    Note over V,H: 环境 happy-dom 路径 tests/unit/*.test.ts
    V->>H: 初始化虚拟 DOM [🔸接口调用]
    H-->>V: window document 就绪 [🔵状态显示]

    %% 加载阶段
    V->>T: 加载测试文件 [🔸接口调用]
    T->>S: 导入 createRPC 函数 [🔸接口调用]
    S-->>T: 返回函数引用 [🔵状态显示]

    %% 执行阶段
    T->>T: 进入 describe 块 [🟣数据展示]
    T->>T: 执行 it 测试用例 [🟣数据展示]

    T->>S: 调用 createRPC [🔸接口调用]
    S-->>T: 返回 rpc 实例 [🔵状态显示]

    T->>T: 调用 rpc.call [🟢用户操作]
    T->>T: 执行断言 [🔷条件判断]

    %% 结果阶段
    alt 断言通过
        T-->>V: passed [🔵状态显示]
    else 断言失败
        T-->>V: failed [🔵状态显示]
    end

    V->>V: 汇总报告 [🟣数据展示]
    V-->>CLI: 18 passed [🔵状态显示]
```

---

## E2E 测试流程（Playwright + Chromium）

### 整体执行流程

```mermaid
flowchart TD
    subgraph 构建阶段
        A[🚀 pnpm run test:e2e]:::startNode
        B[🔨 pnpm run build]:::apiCall
        C[⚙️ tsup 编译 TypeScript]:::apiCall
        D[📦 生成 dist/index.js]:::dataDisplay
    end

    subgraph 服务启动阶段
        E[🎭 playwright test --config config/playwright.config.ts]:::apiCall
        F[📄 读取 config/playwright.config.ts]:::dataDisplay
        G[🌐 启动 Web Server]:::apiCall
        H[🖥️ serve . -l 3456]:::statusDisplay
    end

    subgraph 浏览器初始化阶段
        I[🌍 启动 Chromium]:::apiCall
        J[📋 创建浏览器上下文]:::apiCall
        K[📄 创建 Page 实例]:::dataDisplay
    end

    subgraph 测试执行阶段
        L[🔗 page.goto parent.html]:::userAction
        M[📦 加载 SDK 脚本]:::apiCall
        N[📋 创建 iframe]:::apiCall
        O[🤝 SDK 握手建立]:::statusDisplay
        P[🧪 执行测试操作]:::userAction
        Q{断言通过}:::condition
    end

    subgraph 结果处理阶段
        R[✅ passed]:::statusDisplay
        S[❌ failed + 截图]:::statusDisplay
        T[🔒 关闭浏览器]:::apiCall
        U[📝 输出报告]:::endNode
    end

    A --> B --> C --> D
    D --> E --> F --> G --> H
    H --> I --> J --> K
    K --> L --> M --> N --> O --> P --> Q
    Q -->|是| R
    Q -->|否| S
    R --> T
    S --> T
    T --> U

    classDef startNode fill:#CBE8B2,stroke:#000,stroke-width:2px,color:#000
    classDef endNode fill:#CBE8B2,stroke:#000,stroke-width:2px,color:#000
    classDef apiCall fill:#FFF9C4,stroke:#FFB300,stroke-width:2px,color:#000
    classDef dataDisplay fill:#F3E5F5,stroke:#9C27B0,stroke-width:2px,color:#000
    classDef userAction fill:#E8F5E9,stroke:#4CAF50,stroke-width:2px,color:#000
    classDef statusDisplay fill:#E3F2FD,stroke:#2196F3,stroke-width:2px,color:#000
    classDef condition fill:#BBDEFB,stroke:#2196F3,stroke-width:2px,color:#000
```

### E2E 页面架构

```mermaid
flowchart TB
    subgraph Browser[🌍 Chromium 浏览器]
        subgraph Parent[📄 父页面 parent.html]
            P1[🔌 connectToIframe]:::apiCall
            P2[📋 methods: getData updateData]:::dataDisplay
            P3[📝 sdk-log 日志区域]:::statusDisplay
        end

        subgraph SDK[📦 iframe #sdk-iframe]
            C1[📄 child-sdk.html]:::dataDisplay
            C2[🔌 connectToParent]:::apiCall
            C3[📋 methods: childMethod]:::dataDisplay
        end

        subgraph Traditional[📦 iframe #traditional-iframe]
            T1[📄 child-traditional.html]:::dataDisplay
            T2[📨 原生 postMessage]:::apiCall
            T3[⚠️ 无 SDK 依赖]:::statusDisplay
        end

        P1 <-->|SDK 协议| C2
        P1 <-->|原生协议| T2
    end

    subgraph Playwright[🎭 Playwright 测试工具]
        PW1[🖱️ page.click]:::userAction
        PW2[🔍 page.locator]:::userAction
        PW3[📋 frameLocator]:::userAction
        PW4[✅ expect assertions]:::condition
    end

    Playwright --> Parent
    PW3 --> SDK
    PW3 --> Traditional

    classDef apiCall fill:#FFF9C4,stroke:#FFB300,stroke-width:2px,color:#000
    classDef dataDisplay fill:#F3E5F5,stroke:#9C27B0,stroke-width:2px,color:#000
    classDef userAction fill:#E8F5E9,stroke:#4CAF50,stroke-width:2px,color:#000
    classDef statusDisplay fill:#E3F2FD,stroke:#2196F3,stroke-width:2px,color:#000
    classDef condition fill:#BBDEFB,stroke:#2196F3,stroke-width:2px,color:#000
```

### SDK 通信时序

```mermaid
sequenceDiagram
    autonumber
    actor PW as 🎭 Playwright
    participant P as 📄 父页面
    participant SDK as 🔌 SDK
    participant C as 📦 子页面

    %% 1. 页面加载阶段
    rect rgb(232, 245, 233)
        Note over PW,C: 阶段一：页面加载
        PW->>P: 访问测试页面 [🟢用户操作]
        Note right of PW: goto /tests/e2e/fixtures/parent.html
        P->>P: 加载 SDK 脚本 [🔸接口调用]
        P->>SDK: 初始化父端连接 [🔸接口调用]
        Note right of P: connectToIframe iframe=sdk-iframe
        P->>C: 创建 iframe 元素 [🔸接口调用]
        C->>C: 加载子页面 [🔸接口调用]
        C->>SDK: 初始化子端连接 [🔸接口调用]
    end

    %% 2. SDK 握手阶段
    rect rgb(227, 242, 253)
        Note over PW,C: 阶段二：SDK 握手
        C->>P: 发送 READY 消息 [🔸接口调用]
        P->>C: 发送 ACK 确认 [🔸接口调用]
        P->>P: 日志 Connected to SDK child [🟣数据展示]
        C->>C: 日志 Connected to parent [🟣数据展示]
    end

    %% 3. Playwright 断言
    rect rgb(255, 249, 196)
        Note over PW,C: 阶段三：连接验证
        PW->>P: 断言日志包含 Connected [🔷条件判断]
        P-->>PW: 断言通过 [🔵状态显示]
    end

    %% 4. RPC 调用测试
    rect rgb(243, 229, 245)
        Note over PW,C: 阶段四：RPC 调用
        PW->>P: 点击调用按钮 [🟢用户操作]
        P->>SDK: 调用远程方法 childMethod [🔸接口调用]
        SDK->>C: 转发 RPC 请求 [🔸接口调用]
        Note over SDK,C: type=CALL method=childMethod
        C->>C: 执行 childMethod [🟢用户操作]
        C->>SDK: 返回执行结果 [🔸接口调用]
        SDK->>P: Promise 完成 [🔵状态显示]
        P->>P: 日志 Result [🟣数据展示]
    end

    %% 5. 最终验证
    PW->>P: 断言日志包含 Result [🔷条件判断]
    alt 断言通过
        P-->>PW: 测试通过 [🔵状态显示]
    else 断言失败
        P-->>PW: 测试失败 + 截图 [🔵状态显示]
    end
```

---

## 测试文件映射关系

### 方案 A：表格形式（最简洁）

| 源文件 | 类型 | 单元测试 | E2E 测试 |
|-------|------|---------|---------|
| `src/utils.ts` | 工具函数 | `tests/unit/utils.test.ts` | - |
| `src/channelConnect.ts` | 连接逻辑 | - | `tests/e2e/sdk-communication.spec.ts` |
| `src/channelBridge.ts` | 消息桥接 | - | `tests/e2e/sdk-communication.spec.ts` |

**E2E 测试页面：**
| 页面 | 用途 | 加载的源码 |
|-----|------|----------|
| `fixtures/parent.html` | 父页面 | `channelConnect.ts` |
| `fixtures/child-sdk.html` | SDK 子页面 | `channelConnect.ts` |
| `fixtures/child-traditional.html` | 原生子页面 | 无 SDK |

---

### 方案 B：Block Diagram（展示层次）

```mermaid
block-beta
    columns 3

    block:src:1
        columns 1
        src_title["📁 源码 src/"]
        utils["utils.ts"]
        connect["channelConnect.ts"]
        bridge["channelBridge.ts"]
    end

    block:unit:1
        columns 1
        unit_title["🧪 单元测试"]
        utest["utils.test.ts"]
    end

    block:e2e:1
        columns 1
        e2e_title["🎭 E2E 测试"]
        spec["sdk-communication.spec.ts"]
        block:fix
            columns 1
            fix_title["📄 fixtures/"]
            parent["parent.html"]
            child1["child-sdk.html"]
            child2["child-traditional.html"]
        end
    end

    utils --> utest
    connect --> spec
    bridge --> spec

    %% 源码层 - 紫色系
    style src fill:#E8D5F5,stroke:#9C27B0,stroke-width:2px
    style src_title fill:#9C27B0,stroke:#9C27B0,color:#fff
    style utils fill:#F3E5F5,stroke:#9C27B0
    style connect fill:#F3E5F5,stroke:#9C27B0
    style bridge fill:#F3E5F5,stroke:#9C27B0

    %% 单元测试 - 绿色系
    style unit fill:#C8E6C9,stroke:#4CAF50,stroke-width:2px
    style unit_title fill:#4CAF50,stroke:#4CAF50,color:#fff
    style utest fill:#E8F5E9,stroke:#4CAF50

    %% E2E 测试 - 黄色系
    style e2e fill:#FFE082,stroke:#FFB300,stroke-width:2px
    style e2e_title fill:#FFB300,stroke:#FFB300,color:#fff
    style spec fill:#FFF9C4,stroke:#FFB300

    %% Fixtures - 蓝色系
    style fix fill:#BBDEFB,stroke:#2196F3,stroke-width:2px
    style fix_title fill:#2196F3,stroke:#2196F3,color:#fff
    style parent fill:#E3F2FD,stroke:#2196F3
    style child1 fill:#E3F2FD,stroke:#2196F3
    style child2 fill:#E3F2FD,stroke:#2196F3
```

---

### 方案 C：Flowchart TB（展示依赖流向）

```mermaid
flowchart TB
    subgraph 源码层["📁 src/"]
        direction LR
        S1[utils.ts]:::source
        S2[channelConnect.ts]:::source
        S3[channelBridge.ts]:::source
    end

    subgraph 测试层["🧪 tests/"]
        direction LR
        subgraph 单元测试["unit/"]
            U1[utils.test.ts]:::unit
        end
        subgraph E2E测试["e2e/"]
            E1[sdk-communication.spec.ts]:::e2e
        end
    end

    subgraph 测试页面["📄 fixtures/"]
        direction LR
        F1[parent.html]:::fixture
        F2[child-sdk.html]:::fixture
        F3[child-traditional.html]:::fixture
    end

    S1 ==> U1
    S2 ==> E1
    S3 ==> E1
    F1 --> E1
    F2 --> E1
    F3 --> E1

    classDef source fill:#F3E5F5,stroke:#9C27B0,stroke-width:2px,color:#000
    classDef unit fill:#E8F5E9,stroke:#4CAF50,stroke-width:2px,color:#000
    classDef e2e fill:#FFF9C4,stroke:#FFB300,stroke-width:2px,color:#000
    classDef fixture fill:#E3F2FD,stroke:#2196F3,stroke-width:2px,color:#000
```

---

### 方案对比

| 方案 | 优点 | 缺点 | 适用场景 |
|-----|------|------|---------|
| **A 表格** | 最简洁，信息密度高 | 无法展示复杂关系 | 快速查阅 |
| **B Block** | 层次清晰，结构化 | 依赖关系不明显 | 展示目录结构 |
| **C Flowchart** | 依赖流向清晰 | 占用空间大 | 展示数据流 |

---

## 调试流程

### 单元测试调试

```mermaid
flowchart TD
    subgraph 问题发现
        A[❌ 测试失败]:::statusDisplay
    end

    subgraph 调试方法选择
        B{选择调试方式}:::condition
        C[🎯 运行单个测试]:::userAction
        D[📝 添加日志]:::userAction
        E[🔍 使用 .only]:::userAction
    end

    subgraph 执行调试
        F["vitest run --config config/vitest.config.ts -t 'testName'"]:::apiCall
        G["console.log(value)"]:::apiCall
        H["it.only('focus', ...)"]:::apiCall
        I[📊 查看输出]:::dataDisplay
    end

    subgraph 结果处理
        J{问题解决}:::condition
        K[✅ 修复代码]:::endNode
    end

    A --> B
    B --> C --> F --> I
    B --> D --> G --> I
    B --> E --> H --> I
    I --> J
    J -->|是| K
    J -->|否| B

    classDef apiCall fill:#FFF9C4,stroke:#FFB300,stroke-width:2px,color:#000
    classDef dataDisplay fill:#F3E5F5,stroke:#9C27B0,stroke-width:2px,color:#000
    classDef userAction fill:#E8F5E9,stroke:#4CAF50,stroke-width:2px,color:#000
    classDef statusDisplay fill:#E3F2FD,stroke:#2196F3,stroke-width:2px,color:#000
    classDef condition fill:#BBDEFB,stroke:#2196F3,stroke-width:2px,color:#000
    classDef endNode fill:#CBE8B2,stroke:#000,stroke-width:2px,color:#000
```

### E2E 测试调试

```mermaid
flowchart TD
    subgraph 问题发现
        A[❌ 测试失败]:::statusDisplay
    end

    subgraph 调试方法选择
        B{选择调试方式}:::condition
        C[🖥️ UI 模式]:::userAction
        D[👁️ 有头模式]:::userAction
        E[🔍 调试模式]:::userAction
        F[⏸️ 代码暂停]:::userAction
    end

    subgraph 执行调试
        G["pnpm run test:e2e:ui"]:::apiCall
        H["playwright test --config config/playwright.config.ts --headed"]:::apiCall
        I["playwright test --config config/playwright.config.ts --debug"]:::apiCall
        J["await page.pause()"]:::apiCall
        K[📊 可视化回放]:::dataDisplay
        L[👀 观察浏览器]:::dataDisplay
        M[🔬 逐步执行]:::dataDisplay
        N[⏸️ 指定位置暂停]:::dataDisplay
    end

    subgraph 结果处理
        O[🎯 定位问题]:::statusDisplay
        P{问题解决}:::condition
        Q[✅ 修复代码]:::endNode
        R[📸 查看 test-results 截图]:::dataDisplay
    end

    A --> B
    B --> C --> G --> K --> O
    B --> D --> H --> L --> O
    B --> E --> I --> M --> O
    B --> F --> J --> N --> O
    O --> P
    P -->|是| Q
    P -->|否| R --> B

    classDef apiCall fill:#FFF9C4,stroke:#FFB300,stroke-width:2px,color:#000
    classDef dataDisplay fill:#F3E5F5,stroke:#9C27B0,stroke-width:2px,color:#000
    classDef userAction fill:#E8F5E9,stroke:#4CAF50,stroke-width:2px,color:#000
    classDef statusDisplay fill:#E3F2FD,stroke:#2196F3,stroke-width:2px,color:#000
    classDef condition fill:#BBDEFB,stroke:#2196F3,stroke-width:2px,color:#000
    classDef endNode fill:#CBE8B2,stroke:#000,stroke-width:2px,color:#000
```

---

## 配色图例

| 节点类型 | 颜色 | Emoji | 含义 |
|---------|------|-------|------|
| 开始/结束 | `#CBE8B2` | 🚀 📝 | 流程边界 |
| 命令/调用 | `#FFF9C4` | ⚙️ 🔨 🔌 | 系统命令、API 调用 |
| 数据/配置 | `#F3E5F5` | 📄 📦 📋 | 文件、配置、数据 |
| 用户操作 | `#E8F5E9` | 🖱️ 🧪 🎯 | 测试操作、交互 |
| 状态反馈 | `#E3F2FD` | ✅ ❌ 🤝 | 日志、状态、结果 |
| 条件判断 | `#BBDEFB` | ❓ | 分支、断言 |

---

*v3.0 - 结合分层结构 + 标准配色 + 高级时序图特性*
