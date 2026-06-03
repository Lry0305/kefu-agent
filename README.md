# 小服 — 客服 Agent

客服场景下，说错话可能给公司造成实际损失。
小服的核心原则就一条：**不知道的不说**。

不知道就说不知道，不确定转人工，知识库没写就不编。

## 前提

- 已安装 [OpenClaw](https://docs.openclaw.ai)
- Node.js >= 18

## 部署

```bash
node scripts/setup-agent.mjs /path/to/your/agent --company "公司名称"
```

自动生成目录结构：
```
your-agent/
├── SOUL.md
├── IDENTITY.md
├── AGENTS.md
├── TOOLS.md
├── HEARTBEAT.md
├── MEMORY.md
├── USER.md
├── scripts/
│   └── init-knowledge.mjs
├── data/
│   ├── knowledge/       ← 知识库，需要你填写
│   └── tickets/
└── memory/
```

## 填知识库

知识库是小服回答问题的唯一来源。**没填好之前不要上线。**

```bash
node scripts/init-knowledge.mjs --reindex
```

打开 `data/knowledge/`，依次填写各目录下的 README.md。每个文件里有 `{占位符}` 标注了需要替换的位置。

填完重新生成索引：
```bash
node scripts/init-knowledge.mjs --reindex
```

## 验收

```bash
node scripts/setup-agent.mjs /path/to/agent --health
```

上线前确认：
- [ ] 核心文件都在
- [ ] 知识库里没有遗留的 `{占位符}`
- [ ] 涉及价格、政策的内容经过人工核对

## 目录结构

```
your-agent/
├── SOUL.md
├── IDENTITY.md
├── AGENTS.md            # 防胡说机制在这里
├── TOOLS.md
├── HEARTBEAT.md
├── MEMORY.md
├── USER.md
│
├── skills/
│   └── kefu/
│       └── SKILL.md
│
├── scripts/
│   ├── setup-agent.mjs
│   └── init-knowledge.mjs
│
├── data/
│   ├── knowledge/
│   │   ├── 01_product/
│   │   ├── 02_faq/
│   │   ├── 03_policy/
│   │   ├── 04_guides/
│   │   ├── 05_after_sales/
│   │   ├── 06_pricing/
│   │   ├── 07_contact/
│   │   ├── 08_troubleshooting/
│   │   ├── 09_industry_terms/
│   │   └── 10_scripts/
│   ├── tickets/
│   └── exports/
│
└── memory/
```

## 命令速查

```bash
node scripts/setup-agent.mjs /path/to/agent --company "公司名"    # 部署新 agent
node scripts/setup-agent.mjs /path/to/agent --validate             # 检查文件完整性
node scripts/setup-agent.mjs /path/to/agent --health               # 上线前健康检查
node scripts/init-knowledge.mjs --reindex                           # 更新知识库索引
```

## 防胡说机制

| 措施 | 说明 |
|------|------|
| 回答前自检 | 5 个问题，有一个不通过就不回复 |
| 熔断 | 发现自己在猜测时立即停止 |
| 知识库优先 | 公司信息只从 knowledge/ 目录取 |
| 不确定升级 | 拿不准的转人工处理 |
| 健康检查 | 上线前扫描未填写的占位符 |
