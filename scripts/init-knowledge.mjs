#!/usr/bin/env node

/**
 * 🔵 客服知识库初始化脚本
 *
 * 用途：一键生成客服知识库目录结构 + 模板文件
 * 客户在部署客服 Agent 后运行此脚本，即可获得完整的知识库框架
 * 填入自己的公司信息后，客服 Agent 即可用 memory_search 检索
 *
 * 使用方法：node scripts/init-knowledge.mjs [项目目录]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ===== 配置 =====
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const KNOWLEDGE_DIR = path.join(PROJECT_ROOT, 'data', 'knowledge');
const TEMPLATES_DIR = path.join(KNOWLEDGE_DIR, '_templates');

// ===== 知识库目录结构 =====
const DIRECTORY_STRUCTURE = [
  '05_after_sales',
  '06_pricing',
  '07_contact',
  '08_troubleshooting',
  '09_industry_terms',
  '10_scripts',
  '01_product',
  '02_faq',
  '03_policy',
  '04_guides',
  '_templates',
];

// ===== 模板映射：模板文件 → 目标文件 =====
const TEMPLATE_MAP = [
  { template: '_templates/product-template.md', target: '01_product/README.md', required: true },
  { template: '_templates/faq-template.md',      target: '02_faq/README.md',      required: true },
  { template: '_templates/policy-template.md',   target: '03_policy/README.md',   required: true },
  { template: '_templates/guide-template.md',    target: '04_guides/README.md',   required: true },
];

// ===== 核心函数 =====

/**
 * 生成 _index.md — 知识库总索引
 */
function generateIndex() {
  const content = `# 📚 客服知识库索引

> 自动生成 — 知识库初始化脚本创建
> 客服 Agent 通过 memory_search 检索这些文件来回答用户问题

## 目录结构

| 目录 | 内容 | 用途 |
|------|------|------|
| \`01_product/\` | 产品知识 | 解答"你们是什么/有什么产品/有什么功能" |
| \`02_faq/\` | 常见问题 | 解答"怎么用/怎么办"类高频问题 |
| \`03_policy/\` | 政策条款 | 解答"退款/隐私/服务条款"类法律相关问题 |
| \`04_guides/\` | 使用指南 | 解答"怎么开始/怎么进阶"类操作问题 |

## 填写指引

1. 依次打开每个 README.md
2. 替换其中的 \`{内容}\` 占位符为你的公司信息
3. 如需新增更多问答，在同目录下新建 \`.md\` 文件即可
4. 修改完成后运行 \`node scripts/init-knowledge.mjs --reindex\` 更新索引

## 注意事项

- 客服 Agent 通过 \`memory_search\` 检索知识库
- 文件内容越结构化，检索越准确
- Q&A 格式最适合 FAQ 类内容
- 涉及金额/政策的内容请确保准确

> 最后更新时间：${new Date().toISOString().slice(0, 10)}
`;
  return content;
}

/**
 * 生成 README.md 目录页（每个分类的入口文件）
 */
function generateCategoryReadme(categoryName) {
  const titles = {
    '01_product': { emoji: '📦', title: '产品知识', desc: '产品介绍、功能说明、定价信息' },
    '02_faq':    { emoji: '❓', title: '常见问题（FAQ）', desc: '用户常问的高频问题与解答' },
    '03_policy': { emoji: '📋', title: '政策与条款', desc: '退款政策、隐私政策、服务条款' },
    '04_guides': { emoji: '📖', title: '使用指南', desc: '快速入门、操作教程、最佳实践' },
  };

  const info = titles[categoryName] || { emoji: '📁', title: categoryName, desc: '' };

  return `# ${info.emoji} ${info.title}

> ${info.desc}
> 本目录用于存放 ${info.title} 相关内容
> 客服 Agent 会检索本目录下的文件来回答相关问题

## 本目录文件清单

- \`README.md\` — 本文件（入口 + 总览）

> 如需新增更多文件，直接在同目录下创建 \`.md\` 文件即可。
> 建议保持文件命名清晰，如 \`pricing.md\`、\`refund.md\` 等。

---
> 最后更新时间：${new Date().toISOString().slice(0, 10)}
`;
}

/**
 * 创建目录结构 + 写入文件
 */
function createKnowledgeBase(targetDir) {
  console.log(`\n🔵 客服知识库初始化脚本`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`目标路径: ${targetDir}\n`);

  // 检查是否已存在
  if (fs.existsSync(path.join(targetDir, '_index.md'))) {
    console.log('⚠️  知识库已存在，跳过创建。');
    console.log('   如需重建请先删除 data/knowledge/ 目录后重新运行。');
    console.log('   如需更新索引请运行: node scripts/init-knowledge.mjs --reindex\n');
    return;
  }

  // 1. 创建目录
  console.log('📁 创建目录结构...');
  for (const dirName of DIRECTORY_STRUCTURE) {
    const dirPath = path.join(targetDir, dirName);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`  ✅ ${dirName}/`);
    }
  }

  // 2. 生成 _index.md
  console.log('\n📄 生成文件...');
  const indexPath = path.join(targetDir, '_index.md');
  fs.writeFileSync(indexPath, generateIndex(), 'utf-8');
  console.log('  ✅ _index.md（知识库总索引）');

  // 3. 生成分类 README
  const categories = ['01_product', '02_faq', '03_policy', '04_guides'];
  for (const cat of categories) {
    const readmePath = path.join(targetDir, cat, 'README.md');
    fs.writeFileSync(readmePath, generateCategoryReadme(cat), 'utf-8');
    console.log(`  ✅ ${cat}/README.md`);
  }

  // 4. 检查模板是否存在
  console.log('\n📝 模板文件检查...');
  let templateCount = 0;
  if (fs.existsSync(TEMPLATES_DIR)) {
    const templates = fs.readdirSync(TEMPLATES_DIR).filter(f => f.endsWith('.md'));
    templateCount = templates.length;
    console.log(`  ✅ 发现 ${templateCount} 个模板文件`);
    if (templateCount > 0) {
      console.log(`  📋 模板列表：`);
      for (const t of templates) {
        const target = TEMPLATE_MAP.find(m => m.template === `_templates/${t}`);
        if (target) {
          console.log(`     📄 _templates/${t} → ${target.target}`);
        } else {
          console.log(`     📄 _templates/${t}（未映射）`);
        }
      }
    }
  } else {
    console.log('  ⚠️  模板目录不存在，请检查 _templates/');
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ 知识库框架创建完成！`);
  console.log(``);
  console.log(`下一步：`);
  console.log(`  1. 打开 data/knowledge/ 目录`);
  console.log(`  2. 依次填写各 README.md 中的 {占位符} 内容`);
  console.log(`  3. 如需新增问答，直接创建新的 .md 文件`);
  console.log(`  4. 客服 Agent 将自动通过 memory_search 检索这些知识`);
  console.log(``);
}

// ===== 入口 =====

const args = process.argv.slice(2);
const customPath = args.find(a => !a.startsWith('--'));

let targetDir;
if (customPath) {
  // 支持客户指定目标目录
  targetDir = path.resolve(customPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
} else {
  targetDir = KNOWLEDGE_DIR;
}

if (args.includes('--reindex')) {
  // 重新生成索引
  const indexPath = path.join(targetDir, '_index.md');
  if (fs.existsSync(targetDir)) {
    fs.writeFileSync(indexPath, generateIndex(), 'utf-8');
    console.log('✅ 索引已更新（_index.md）');
  } else {
    console.log('❌ 知识库目录不存在，请先运行初始化');
  }
} else {
  createKnowledgeBase(targetDir);
}
