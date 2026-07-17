# MyMind



对标 XMind 的思维导图工具。Web 优先开发，后期通过 Tauri 打包为桌面应用，支持全部九种结构形式。



**技术栈**：Vue 3 + TypeScript + Vite + Pinia + Canvas 2D + Tauri



## 文档



- [功能特性规格](./docs/功能特性规格.md) — 产品需求、功能清单、优先级与验收标准

- [技术设计文档](./docs/技术设计文档.md) — 架构、数据模型、布局引擎、渲染与打包方案

- [TDD 开发规划](./docs/TDD开发规划.md) — TDD 分阶段任务与需求追溯

- [文档索引](./docs/README.md)



## 九种结构



| 结构 | 标识 |

|------|------|

| 思维导图 | `mindmap` |

| 逻辑图 | `logic-chart` |

| 树状图 | `tree-chart` |

| 组织结构图 | `org-chart` |

| 时间轴 | `timeline` |

| 鱼骨图 | `fishbone` |

| 矩阵图 | `matrix` |

| 括号图 | `brace-map` |

| 树形表格 | `tree-table` |



## 版本路线



| 版本 | 目标 |

|------|------|

| v0.1 | 核心编辑器 + 3 种结构 + 基础主题 + PNG/JSON 导出 |

| v0.2 | 九种结构 + 结构元素 + Callout + 多 Sheet + 大纲视图 |

| v0.3 | 完整主题 + 富文本/图片 + ZEN/Pitch + PDF/SVG 等导出 |

| v1.0 | Tauri 桌面版 + 模板库 + 完整导入 + 方程/贴纸 |



## 状态



**v1.0 已完成** — Phase 0–4 全部落地，92 单元/集成测试 + E2E 验收。



```bash

pnpm install

pnpm test          # 单元/集成测试

pnpm test:e2e      # Playwright 浏览器验收（需先 install）

pnpm dev           # 启动 Web 开发服务器

pnpm build         # 构建全部包（desktop 校验壳层；原生包用 build:tauri）

```



### 已实现



- Monorepo + Vitest + CI + Playwright E2E

- 九结构 + 结构切换 + 概要/外框/关系 + 多 Sheet + 大纲/属性面板

- 富文本、图片/链接/附件、待办/专区、搜索、ZEN/Pitch 模式

- 10+ 主题、模板库（≥10）、评论/装饰/方程命令

- 导出 PNG / SVG / Markdown / OPML / Word 大纲 / Excel CSV

- 导入 Markdown / OPML / FreeMind / 纯文本缩进

- 视口裁剪、离屏缓存、2000 节点布局压测

- Tauri 2 桌面壳（`packages/desktop`，需 Rust 工具链执行 `pnpm build:tauri`）

- 英文界面 `en-US`、打印预览、代码分包



### 刻意排除（v2.0）



AI、实时协作、PWA、文件加密等见 [TDD §9.5](./docs/TDD开发规划.md)。

