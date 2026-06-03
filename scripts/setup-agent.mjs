#!/usr/bin/env node

/**
 * 🔵 客服 Agent 一键部署脚本
 *
 * 用途：客户在自己的 OpenClaw 服务器上运行此脚本，
 * 即可快速部署一个可运行的客服 Agent。
 *
 * 部署流程：
 * 1. 创建 customer-service agent 目录
 * 2. 创建核心文档（SOUL/IDENTITY/AGENTS/TOOLS/HEARTBEAT/MEMORY/USER）
 * 3. 创建客服 skill
 * 4. 初始化知识库框架
 * 5. 输出配置指引
 *
 * 使用方法：
 *   node setup-agent.mjs                    # 在当前目录部署
 *   node setup-agent.mjs /path/to/deploy    # 部署到指定目录
 *   node setup-agent.mjs --validate         # 验证现有部署
 *   node setup-agent.mjs --health           # 健康检查
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AGENT_ROOT = path.resolve(__dirname, '..');

// ===== 配置 =====
const DEPLOY_FILES = {
  // 核心文档
  'SOUL.md': null,        // 从当前 Agent 复制
  'IDENTITY.md': null,    // 从当前 Agent 复制（需客户改）
  'AGENTS.md': null,      // 从当前 Agent 复制
  'TOOLS.md': null,       // 从当前 Agent 复制
  'HEARTBEAT.md': null,   // 从当前 Agent 复制
  'MEMORY.md': null,      // 生成最小版本

  // 工具
  'scripts/init-knowledge.mjs': null,

  // 知识库模板
  'data/knowledge/_templates/product-template.md': null,
  'data/knowledge/_templates/faq-template.md': null,
  'data/knowledge/_templates/policy-template.md': null,
  'data/knowledge/_templates/guide-template.md': null,
};

const DEPLOY_DIRS = [
  'data/knowledge',
  'data/knowledge/_templates',
  'data/knowledge/01_product',
  'data/knowledge/02_faq',
  'data/knowledge/03_policy',
  'data/knowledge/04_guides',
  'data/knowledge/05_after_sales',
  'data/knowledge/06_pricing',
  'data/knowledge/07_contact',
  'data/knowledge/08_troubleshooting',
  'data/knowledge/09_industry_terms',
  'data/knowledge/10_scripts',
  'data/tickets',
  'data/exports',
  'scripts',
  'memory',
];

// ===== 核心函数 =====

/**
 * 生成客户版本的 MEMORY.md
 */
function generateCustomerMemory(companyName) {
  return `# MEMORY.md — 客服 Agent 长期记忆

> 仅在主私聊加载。群聊场景不加载此文件。
> 本文件由部署脚本自动生成，请客户自定义内容。

---

## 公司信息
- **公司名称：** ${companyName || '请填写公司名称'}
- **部署时间：** ${new Date().toISOString().slice(0, 10)}

## 功能状态
- 知识库状态：待填写（请运行 \`node scripts/init-knowledge.mjs --reindex\`）
- 工单系统：已就绪

---
`;
}

/**
 * 生成客户专用的 USER.md 占位
 */
function generateCustomerUser(companyName) {
  return `# USER.md — 服务对象信息

## 1. 这是谁的 Agent
- **公司名称：** ${companyName || '请填写公司名称'}
- **部署方式：** OpenClaw 自部署

## 2. 核心要求
- **不许胡说 — 这是最高准则**
- 所有回答必须基于知识库
- 不确定的事情直接升级给人
- 涉及金额/政策必须引用原文

## 3. 知识库
- 知识库路径：\`data/knowledge/\`
- 填写完成后运行：\`node scripts/init-knowledge.mjs --reindex\`
`;
}

/**
 * 写入文件
 */
function writeFile(filePath, content) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * 一键部署
 */
function deploy(targetDir, companyName) {
  const deployPath = path.resolve(targetDir);

  console.log(`\n🔵 客服 Agent 部署脚本`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`部署目录: ${deployPath}`);
  console.log(`公司名称: ${companyName || '（未指定）'}\n`);

  // 检查是否已存在
  if (fs.existsSync(path.join(deployPath, 'SOUL.md'))) {
    console.log('⚠️  该目录已部署过客服 Agent。');
    console.log('   如需重新部署请先删除该目录。');
    console.log(`   如需验证部署运行: node setup-agent.mjs --validate\n`);
    return;
  }

  // 1. 创建目录结构
  console.log('📁 创建目录结构...');
  for (const dir of DEPLOY_DIRS) {
    const p = path.join(deployPath, dir);
    if (!fs.existsSync(p)) {
      fs.mkdirSync(p, { recursive: true });
      console.log(`  ✅ ${dir}/`);
    }
  }

  // 2. 复制核心文件
  console.log('\n📄 复制核心文件...');

  // SOUL.md — 从当前 Agent 复制（不包含公司特定信息）
  const soulPath = path.join(AGENT_ROOT, 'SOUL.md');
  if (fs.existsSync(soulPath)) {
    fs.cpSync(soulPath, path.join(deployPath, 'SOUL.md'));
    console.log('  ✅ SOUL.md（元灵魂协议）');
  }

  // IDENTITY.md — 生成客户版本
  const customerIdentity = `# IDENTITY.md — 身份锚点 + 协同接口

## Meta
- **version:** 1.0
- **agent_id:** customer-service
- **role_class:** customer_service_ai
- **agent_name:** ${companyName || '公司名称'} 客服
- **last_updated:** ${new Date().toISOString().slice(0, 10)}

## 1. 基础身份
- **Name:** ${companyName || '公司名称'} 客服
- **Agent ID:** customer-service
- **Emoji:** 🔵

## 2. 公共角色
- **Role:** 企业客服 AI
- **Core Function:**
  - 产品咨询
  - 常见问题解答
  - 售后引导
  - 工单记录

## 3. 核心规则
- **不许胡说** — 所有回答基于知识库
- 不确定 → 直接升级给人
- 涉及金额/法律/隐私 → 必须转人工

## 4. 知识库
- 路径：\`data/knowledge/\`
- 请确认产品/FAQ/政策已填写完毕再上线
`;
  writeFile(path.join(deployPath, 'IDENTITY.md'), customerIdentity);
  console.log('  ✅ IDENTITY.md（客户版身份锚点）');

  // AGENTS.md — 从当前 Agent 复制（含防胡说机制）
  const agentsPath = path.join(AGENT_ROOT, 'AGENTS.md');
  if (fs.existsSync(agentsPath)) {
    fs.cpSync(agentsPath, path.join(deployPath, 'AGENTS.md'));
    console.log('  ✅ AGENTS.md（治理协议，含零胡说法令）');
  }

  // TOOLS.md
  const toolsPath = path.join(AGENT_ROOT, 'TOOLS.md');
  if (fs.existsSync(toolsPath)) {
    fs.cpSync(toolsPath, path.join(deployPath, 'TOOLS.md'));
    console.log('  ✅ TOOLS.md（工具边界）');
  }

  // HEARTBEAT.md
  const heartbeatPath = path.join(AGENT_ROOT, 'HEARTBEAT.md');
  if (fs.existsSync(heartbeatPath)) {
    fs.cpSync(heartbeatPath, path.join(deployPath, 'HEARTBEAT.md'));
    console.log('  ✅ HEARTBEAT.md（主动节律）');
  }

  // MEMORY.md — 生成客户版本
  writeFile(path.join(deployPath, 'MEMORY.md'), generateCustomerMemory(companyName));
  console.log('  ✅ MEMORY.md（客户版长期记忆）');

  // USER.md
  writeFile(path.join(deployPath, 'USER.md'), generateCustomerUser(companyName));
  console.log('  ✅ USER.md（服务对象信息）');

  // 3. 复制工具脚本
  console.log('\n🔧 复制工具脚本...');
  const scriptPath = path.join(AGENT_ROOT, 'scripts', 'init-knowledge.mjs');
  if (fs.existsSync(scriptPath)) {
    fs.cpSync(scriptPath, path.join(deployPath, 'scripts', 'init-knowledge.mjs'));
    console.log('  ✅ scripts/init-knowledge.mjs（知识库初始化脚本）');
  }

  // 4. 复制知识库模板
  console.log('\n📝 复制知识库模板...');
  const templateFiles = [
    'product-template.md',
    'faq-template.md',
    'policy-template.md',
    'guide-template.md',
  ];
  for (const tf of templateFiles) {
    const src = path.join(AGENT_ROOT, 'data', 'knowledge', '_templates', tf);
    const dst = path.join(deployPath, 'data', 'knowledge', '_templates', tf);
    if (fs.existsSync(src)) {
      fs.cpSync(src, dst);
      console.log(`  ✅ _templates/${tf}`);
    }
  }

  // 5. 生成初始 _index.md 和分类 README
  console.log('\n📖 生成知识库框架...');
  const knowledgeDir = path.join(deployPath, 'data', 'knowledge');
  const indexContent = `# 📚 客服知识库索引

> 自动生成 — 部署脚本创建

## 目录结构

| 目录 | 内容 | 用途 |
|------|------|------|
| \`01_product/\` | 产品知识 | 解答"你们是什么/有什么产品" |
| \`02_faq/\` | 常见问题 | 解答"怎么办/怎么用" |
| \`03_policy/\` | 政策条款 | 退款/隐私/服务条款 |
| \`04_guides/\` | 使用指南 | 操作教程 |

## ⚠️ 重要
**知识库未填写完整前，不要上线客服 Agent。**
知识库越全，胡说风险越低。

> 最后更新时间：${new Date().toISOString().slice(0, 10)}
`;
  writeFile(path.join(knowledgeDir, '_index.md'), indexContent);

  const categories = {
    '01_product':       { emoji: '📦', title: '产品知识' },
    '02_faq':          { emoji: '❓', title: '常见问题（FAQ）' },
    '03_policy':       { emoji: '📋', title: '政策与条款' },
    '04_guides':       { emoji: '📖', title: '使用指南' },
    '05_after_sales':  { emoji: '🔧', title: '售后服务' },
    '06_pricing':      { emoji: '💰', title: '价格与套餐' },
    '07_contact':      { emoji: '📞', title: '联系方式' },
    '08_troubleshooting': { emoji: '🛠️', title: '故障排查' },
    '09_industry_terms':   { emoji: '📖', title: '行业术语' },
    '10_scripts':      { emoji: '💬', title: '话术模板' },
  };
  for (const [dirName, info] of Object.entries(categories)) {
    const readmeContent = `# ${info.emoji} ${info.title}

> 请在下面填写你的公司 ${info.title} 内容。

## 填写说明
1. 替换本文件中的 \`{占位符}\` 内容
2. 如需添加更多内容，直接在同目录下创建新的 \`.md\` 文件
3. **请注意：不要留空占位符就上线**

---
> 最后更新时间：${new Date().toISOString().slice(0, 10)}
`;
    writeFile(path.join(knowledgeDir, dirName, 'README.md'), readmeContent);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ 客服 Agent 部署完成！');
  console.log(`\n📋 部署位置：${deployPath}`);
  console.log(`\n📋 部署后操作：`);
  console.log(`  1. 配置 OpenClaw Agent（见 README）`);
  console.log(`  2. 填写知识库内容（必做，否则别上线！）`);
  console.log(`     - data/knowledge/01_product/README.md`);
  console.log(`     - data/knowledge/02_faq/README.md`);
  console.log(`     - data/knowledge/03_policy/README.md`);
  console.log(`     - data/knowledge/05_after_sales/README.md`);
  console.log(`     - data/knowledge/06_pricing/README.md`);
  console.log(`     - data/knowledge/07_contact/README.md`);
  console.log(`  3. 知识库填写完成后更新索引：`);
  console.log(`     node scripts/init-knowledge.mjs --reindex`);
  console.log(`  4. 验收测试后上线`);
  console.log(`\n⚠️  重申：知识库未填不！要！上！线！`);
  console.log(`    空知识库 = 胡说风险极高 = 生产事故`);
}

/**
 * 验证部署
 */
function validate(targetDir) {
  const deployPath = path.resolve(targetDir);

  console.log(`\n🔵 客服 Agent 部署验证`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`验证目录: ${deployPath}\n`);

  const requiredFiles = [
    'SOUL.md',
    'IDENTITY.md',
    'AGENTS.md',
    'TOOLS.md',
    'HEARTBEAT.md',
    'MEMORY.md',
    'USER.md',
  ];

  const optionalFiles = [
    'scripts/init-knowledge.mjs',
    'data/knowledge/_index.md',
    'data/knowledge/01_product/README.md',
    'data/knowledge/02_faq/README.md',
    'data/knowledge/03_policy/README.md',
    'data/knowledge/04_guides/README.md',
  ];

  let allGood = true;

  console.log('📄 核心文档检查：');
  for (const f of requiredFiles) {
    const p = path.join(deployPath, f);
    const exists = fs.existsSync(p);
    console.log(`  ${exists ? '✅' : '❌'} ${f}`);
    if (!exists) allGood = false;
  }

  console.log('\n📄 推荐文件检查：');
  for (const f of optionalFiles) {
    const p = path.join(deployPath, f);
    const exists = fs.existsSync(p);
    console.log(`  ${exists ? '✅' : '⬜'} ${f}`);
  }

  if (allGood) {
    console.log('\n✅ 核心文档完整，可以部署。');
  } else {
    console.log('\n❌ 核心文档缺失，请运行部署脚本或手动补齐。');
  }

  return allGood;
}

/**
 * 健康检查
 */
function healthCheck(targetDir) {
  const deployPath = path.resolve(targetDir);

  console.log(`\n🔵 客服 Agent 健康检查`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  const issues = [];

  // 1. 检查核心文档
  if (!fs.existsSync(path.join(deployPath, 'SOUL.md'))) {
    issues.push('❌ SOUL.md 缺失 — 人格未定义');
  }
  if (!fs.existsSync(path.join(deployPath, 'AGENTS.md'))) {
    issues.push('❌ AGENTS.md 缺失 — 治理协议未定义');
  }

  // 2. 检查知识库
  const knowledgeIndex = path.join(deployPath, 'data', 'knowledge', '_index.md');
  if (!fs.existsSync(knowledgeIndex)) {
    issues.push('⚠️  知识库未初始化（运行 init-knowledge.mjs）');
  }

  // 3. 检查知识库是否还有占位符
  const knowledgeFiles = [
    'data/knowledge/01_product/README.md',
    'data/knowledge/02_faq/README.md',
    'data/knowledge/03_policy/README.md',
  ];
  for (const f of knowledgeFiles) {
    const p = path.join(deployPath, f);
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf-8');
      if (content.includes('{') && content.includes('}')) {
        issues.push(`⚠️  ${f} 中还有未替换的占位符 — 可能未填写完整`);
      }
    }
  }

  // 4. 检查工单目录
  if (!fs.existsSync(path.join(deployPath, 'data', 'tickets'))) {
    issues.push('⬜ data/tickets/ 不存在 — 工单系统不可用');
  }

  // 5. 输出结果
  if (issues.length === 0) {
    console.log('✅ 一切正常，客服 Agent 可以上线。');
  } else {
    console.log(`发现 ${issues.length} 个问题：\n`);
    for (const issue of issues) {
      console.log(`  ${issue}`);
    }
  }

  return issues;
}

// ===== 入口 =====

const args = process.argv.slice(2);

if (args.includes('--validate')) {
  const target = args.find(a => !a.startsWith('--')) || process.cwd();
  validate(target);
  process.exit(0);
}

if (args.includes('--health')) {
  const target = args.find(a => !a.startsWith('--')) || process.cwd();
  healthCheck(target);
  process.exit(0);
}

// 默认：部署
const companyNameIndex = args.indexOf('--company');
const companyName = companyNameIndex >= 0 ? args[companyNameIndex + 1] : '';
const targetDir = args.find(a => !a.startsWith('--') && !a.startsWith('-')) || process.cwd();

deploy(targetDir, companyName);
