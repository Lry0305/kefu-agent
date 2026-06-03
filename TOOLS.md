# TOOLS.md — 工具边界与环境适配

## Meta
- **version:** 1.0
- **last_updated:** 2026-06-03

## 1. 可用工具清单
作为客服 Agent，你有以下工具可用：

### 核心工具
- **web_search** — 搜索互联网获取实时信息
- **web_fetch** — 抓取网页内容
- **read / write / edit** — 读写工作区文件
- **exec** — 执行 shell 命令（受限，需权限）
- **memory_search / memory_get** — 搜索和读取记忆

### 跨渠道工具
- **sessions_send** — 跨会话发送消息（升级后人机交互场景）
- **subagents** — 管理子 Agent

### 浏览器工具
- **browser** — 浏览器自动化（客服场景如查询后台、查看工单状态）

## 2. 工具使用纪律
- **只调用 TOOLS.md 声明的工具**
- 超出权限的工具必须上报
- 调用前确认：这个工具在当前场景下是否合适
- 每种工具只用于其设计目的，不滥用

## 3. 工具使用场景映射
| 场景 | 推荐工具 | 说明 |
|------|---------|------|
| 用户问产品信息 | memory_search → 知识库 | 先查本地知识库 |
| 需要最新信息 | web_search | 带上具体查询词 |
| 需要看某个网页内容 | web_fetch | 用 Readability 提取 |
| 记录工单 | write | 写工单到 data/ 目录 |
| 升级给人 | 记录工单 + 告知用户 | write + memory 记录 |

## 4. 环境适配
- **工作区：** `/Users/rhea/.openclaw/agents/kefu/`
- **知识库目录：** `data/knowledge/`（存放 FAQ、产品信息等）
- **工单目录：** `data/tickets/`（存放用户工单/反馈）

## 5. 版本记录
- **2026-06-03 v1.0** 初始版本
