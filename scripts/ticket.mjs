#!/usr/bin/env node

/**
 * 🔵 客服工单自动生成与管理脚本
 *
 * 用途：客服 Agent 在遇到需要人工处理的场景时，
 * 自动生成工单、管理状态、检查超时、统计报表。
 *
 * 所有操作遵循零胡说原则：
 * - 只记录用户说的内容，不记录 Agent 的推测
 * - 不包含 Agent 无法确认的信息
 * - 涉及金额/承诺的内容必须标注"用户自述，待核实"
 *
 * 使用方法：
 *   node scripts/ticket.mjs create         - 交互式创建工单
 *   node scripts/ticket.mjs list           - 列出所有工单
 *   node scripts/ticket.mjs show <id>      - 查看单个工单
 *   node scripts/ticket.mjs update <id>    - 更新工单状态
 *   node scripts/ticket.mjs close <id>     - 关闭工单
 *   node scripts/ticket.mjs overdue        - 检查超时工单
 *   node scripts/ticket.mjs stats          - 工单统计
 *   node scripts/ticket.mjs auto           - 自动模式（Agent 内部调用用 JSON 输入）
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TICKETS_DIR = path.resolve(__dirname, '..', 'data', 'tickets');

// ===== 配置 =====
const TICKET_TIMEOUT_HOURS = 2; // 工单超过 2 小时未处理视为超时
const TICKET_CATEGORIES = ['售后', '投诉', '升级', '咨询', '其他'];
const TICKET_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

// ===== 工单 ID 管理 =====
const TICKET_SEQ_FILE = path.join(TICKETS_DIR, '_seq.json');

function getNextSeq() {
  if (!fs.existsSync(TICKET_SEQ_FILE)) {
    fs.writeFileSync(TICKET_SEQ_FILE, JSON.stringify({ seq: 0 }), 'utf-8');
    return 1;
  }
  const data = JSON.parse(fs.readFileSync(TICKET_SEQ_FILE, 'utf-8'));
  const next = data.seq + 1;
  fs.writeFileSync(TICKET_SEQ_FILE, JSON.stringify({ seq: next }), 'utf-8');
  return next;
}

// ===== 工单文件名 =====
function ticketFilename(ticketId) {
  return `${ticketId.replace('TICKET-', 'TICKET-')}.json`;
}

function ticketPath(ticketId) {
  return path.join(TICKETS_DIR, ticketFilename(ticketId));
}

// ===== 核心函数 =====

/**
 * 生成工单 ID
 */
function generateTicketId(seq) {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  return `TICKET-${dateStr}-${String(seq).padStart(4, '0')}`;
}

/**
 * 创建工单
 *
 * @param {Object} params
 * @param {string} params.userId       - 用户 ID（必填）
 * @param {string} params.category     - 分类（售后/投诉/升级/咨询/其他）
 * @param {string} params.summary      - 问题简述（必填，用户原话或简短概括）
 * @param {string} params.detail       - 详细描述（必填，只写用户说的内容和客观事实）
 * @param {string} params.userContact  - 用户联系方式（可选）
 * @param {string} params.source       - 来源渠道（可选：feishu/discord/web/其他）
 * @param {string} params.context      - Agent 已告知用户的信息（可选）
 * @returns {Object} 创建的工单
 */
function createTicket(params) {
  // 确保 seq 文件存在
  getNextSeq(); // 初始化
  // 参数校验
  if (!params.userId) throw new Error('userId 是必填项');
  if (!params.summary) throw new Error('summary 是必填项（用户问题简述）');
  if (!params.detail) throw new Error('detail 是必填项（用户描述）');

  if (!TICKET_CATEGORIES.includes(params.category)) {
    params.category = '其他';
  }

  // 用时间戳+随机数确保唯一性（自动模式批量调用时防止 seq 冲突）
  const nowMs = Date.now();
  const rand = Math.floor(Math.random() * 1000);
  const seq = getNextSeq();
  const ticketId = generateTicketId(seq);
  const now = new Date().toISOString();

  const ticket = {
    ticket_id: ticketId,
    seq: seq,
    created_at: now,
    updated_at: now,
    status: 'open',
    category: params.category,
    summary: params.summary.trim(),
    detail: params.detail.trim(),
    user_id: params.userId.trim(),
    user_contact: (params.userContact || '').trim(),
    source: (params.source || '').trim(),
    context: (params.context || '').trim(),
    assigned_to: null,
    resolution: null,
    closed_at: null,
  };

  const filePath = ticketPath(ticketId);
  fs.writeFileSync(filePath, JSON.stringify(ticket, null, 2), 'utf-8');

  return ticket;
}

/**
 * 列出工单
 */
function listTickets(options = {}) {
  if (!fs.existsSync(TICKETS_DIR)) return [];

  const files = fs.readdirSync(TICKETS_DIR)
    .filter(f => f.startsWith('TICKET-') && f.endsWith('.json') && f !== '_seq.json')
    .sort()
    .reverse();

  const tickets = files.map(f => {
    try {
      return JSON.parse(fs.readFileSync(path.join(TICKETS_DIR, f), 'utf-8'));
    } catch {
      return null;
    }
  }).filter(Boolean);

  if (options.status) {
    return tickets.filter(t => t.status === options.status);
  }
  if (options.category) {
    return tickets.filter(t => t.category === options.category);
  }
  if (options.limit) {
    return tickets.slice(0, options.limit);
  }

  return tickets;
}

/**
 * 查看单个工单
 */
function showTicket(ticketId) {
  const filePath = ticketPath(ticketId);
  if (!fs.existsSync(filePath)) {
    // 尝试模糊匹配
    const files = fs.readdirSync(TICKETS_DIR)
      .filter(f => f.includes(ticketId) || f.includes(ticketId.replace('TICKET-', '')));
    if (files.length === 0) {
      throw new Error(`工单 ${ticketId} 不存在`);
    }
    if (files.length === 1) {
      return JSON.parse(fs.readFileSync(path.join(TICKETS_DIR, files[0]), 'utf-8'));
    }
    throw new Error(`找到多个匹配工单：${files.join(', ')}，请使用完整 ID`);
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

/**
 * 更新工单状态
 */
function updateTicketStatus(ticketId, updates) {
  const ticket = showTicket(ticketId);
  const now = new Date().toISOString();

  if (updates.status) {
    if (!TICKET_STATUSES.includes(updates.status)) {
      throw new Error(`无效状态: ${updates.status}。可选: ${TICKET_STATUSES.join(', ')}`);
    }
    ticket.status = updates.status;
    if (updates.status === 'closed' || updates.status === 'resolved') {
      ticket.closed_at = now;
    }
  }

  if (updates.assigned_to) {
    ticket.assigned_to = updates.assigned_to.trim();
  }

  if (updates.resolution) {
    ticket.resolution = updates.resolution.trim();
    ticket.status = 'resolved';
    ticket.closed_at = now;
  }

  if (updates.context) {
    ticket.context = updates.context.trim();
  }

  ticket.updated_at = now;
  fs.writeFileSync(ticketPath(ticketId), JSON.stringify(ticket, null, 2), 'utf-8');

  return ticket;
}

/**
 * 关闭工单
 */
function closeTicket(ticketId, resolution) {
  return updateTicketStatus(ticketId, {
    status: 'closed',
    resolution: resolution || '已处理',
  });
}

/**
 * 检查超时工单
 * 返回超过 TICKET_TIMEOUT_HOURS 仍未处理的 open 或 in_progress 工单
 */
function checkOverdue() {
  const now = new Date();
  const tickets = listTickets({ status: 'open' })
    .concat(listTickets({ status: 'in_progress' }));

  const overdue = tickets.filter(t => {
    const created = new Date(t.created_at);
    const hoursDiff = (now - created) / (1000 * 60 * 60);
    return hoursDiff > TICKET_TIMEOUT_HOURS;
  });

  return overdue;
}

/**
 * 工单统计
 */
function getStats() {
  const allTickets = listTickets();

  const stats = {
    total: allTickets.length,
    by_status: {},
    by_category: {},
    overdue_count: 0,
  };

  for (const t of allTickets) {
    stats.by_status[t.status] = (stats.by_status[t.status] || 0) + 1;
    stats.by_category[t.category] = (stats.by_category[t.category] || 0) + 1;
  }

  stats.overdue_count = checkOverdue().length;

  // 今日创建
  const today = new Date().toISOString().slice(0, 10);
  stats.today_created = allTickets.filter(t =>
    t.created_at.startsWith(today)
  ).length;

  return stats;
}

/**
 * 自动模式：Agent 内部调用
 * 接收 JSON 输入，直接返回 JSON 结果
 */
function autoMode() {
  return new Promise((resolve) => {
    let input = '';
    process.stdin.on('data', chunk => { input += chunk; });
    process.stdin.on('end', () => {
      try {
        const data = JSON.parse(input);

        if (!data.action) {
          resolve({ error: '缺少 action 字段' });
          return;
        }

        let result;

        switch (data.action) {
          case 'create':
            result = createTicket(data.params);
            result._note = '工单已创建，请通过 update 更新状态或 close 关闭';
            break;

          case 'show':
            result = showTicket(data.ticketId);
            break;

          case 'update':
            result = updateTicketStatus(data.ticketId, data.updates);
            break;

          case 'close':
            result = closeTicket(data.ticketId, data.resolution);
            break;

          case 'list':
            result = listTickets(data.options || {});
            break;

          case 'overdue':
            result = checkOverdue();
            break;

          case 'stats':
            result = getStats();
            break;

          default:
            result = { error: `未知操作: ${data.action}` };
        }

        resolve(result);
      } catch (e) {
        resolve({ error: e.message });
      }
    });
  });
}

// ===== CLI 入口 =====

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  // 自动模式（Agent 内部调用）
  if (command === 'auto') {
    const result = await autoMode();
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  // 确保工单目录存在
  if (!fs.existsSync(TICKETS_DIR)) {
    fs.mkdirSync(TICKETS_DIR, { recursive: true });
  }

  switch (command) {
    case 'create': {
      // 交互式创建
      const readline = (await import('node:readline/promises')).default;
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      try {
        const userId = await rl.question('用户 ID: ');
        const category = await rl.question(`分类 (${TICKET_CATEGORIES.join('/')}): `);
        const summary = await rl.question('问题简述（用户原话）: ');
        const detail = await rl.question('详细描述（客观事实，不含推测）: ');
        const userContact = await rl.question('联系方式（可选）: ');
        const source = await rl.question('来源渠道（可选）: ');

        const ticket = createTicket({
          userId: userId || 'unknown',
          category: category || '其他',
          summary: summary || '未填写',
          detail: detail || '未填写',
          userContact,
          source,
          context: '已告知用户已转接人工处理',
        });

        console.log(`\n✅ 工单已创建: ${ticket.ticket_id}`);
        console.log(JSON.stringify(ticket, null, 2));
      } finally {
        rl.close();
      }
      break;
    }

    case 'list': {
      const options = {};
      if (args.includes('--status')) {
        const idx = args.indexOf('--status');
        options.status = args[idx + 1];
      }
      if (args.includes('--category')) {
        const idx = args.indexOf('--category');
        options.category = args[idx + 1];
      }

      const tickets = listTickets(options);

      if (tickets.length === 0) {
        console.log('📭 没有匹配的工单');
        return;
      }

      console.log(`\n📋 工单列表（共 ${tickets.length} 条）\n`);
      console.log('ID'.padEnd(30) + '分类'.padEnd(8) + '状态'.padEnd(14) + '简述');
      console.log('-'.repeat(80));
      for (const t of tickets) {
        const statusIcon = t.status === 'open' ? '🟢' : t.status === 'in_progress' ? '🟡' : '🔵';
        console.log(
          `${statusIcon} ${t.ticket_id}`.padEnd(30) +
          t.category.padEnd(8) +
          t.status.padEnd(14) +
          t.summary.slice(0, 40)
        );
      }
      break;
    }

    case 'show': {
      const ticketId = args[1];
      if (!ticketId) {
        console.error('请指定工单 ID: node ticket.mjs show TICKET-XXXX');
        process.exit(1);
      }
      try {
        const ticket = showTicket(ticketId);
        console.log(`\n📄 工单详情: ${ticket.ticket_id}\n`);
        console.log(JSON.stringify(ticket, null, 2));
      } catch (e) {
        console.error(`❌ ${e.message}`);
        process.exit(1);
      }
      break;
    }

    case 'update': {
      const ticketId = args[1];
      if (!ticketId) {
        console.error('请指定工单 ID: node ticket.mjs update TICKET-XXXX');
        process.exit(1);
      }

      const readline = (await import('node:readline/promises')).default;
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      try {
        const ticket = showTicket(ticketId);
        console.log(`\n当前状态: ${ticket.status}`);
        console.log(`当前负责人: ${ticket.assigned_to || '未分配'}\n`);

        const newStatus = await rl.question(`新状态 (${TICKET_STATUSES.join('/')}): `);
        const assignedTo = await rl.question('负责人（可选）: ');
        const resolution = await rl.question('解决方案（可选，填写后将关闭工单）: ');

        const updates = {};
        if (newStatus) updates.status = newStatus;
        if (assignedTo) updates.assigned_to = assignedTo;
        if (resolution) updates.resolution = resolution;

        const updated = updateTicketStatus(ticketId, updates);
        console.log(`\n✅ 工单已更新`);
        console.log(JSON.stringify(updated, null, 2));
      } catch (e) {
        console.error(`❌ ${e.message}`);
      } finally {
        rl.close();
      }
      break;
    }

    case 'close': {
      const ticketId = args[1];
      const resolution = args.slice(2).join(' ') || '已处理';

      if (!ticketId) {
        console.error('请指定工单 ID: node ticket.mjs close TICKET-XXXX [解决方案]');
        process.exit(1);
      }

      try {
        const ticket = closeTicket(ticketId, resolution);
        console.log(`✅ 工单已关闭: ${ticket.ticket_id}`);
        console.log(`   解决方案: ${resolution}`);
      } catch (e) {
        console.error(`❌ ${e.message}`);
        process.exit(1);
      }
      break;
    }

    case 'overdue': {
      const overdue = checkOverdue();
      if (overdue.length === 0) {
        console.log('✅ 没有超时工单');
        return;
      }
      console.log(`\n⚠️  发现 ${overdue.length} 个超时工单（超过 ${TICKET_TIMEOUT_HOURS} 小时未处理）\n`);
      for (const t of overdue) {
        const created = new Date(t.created_at);
        const hoursAgo = Math.round((Date.now() - created) / (1000 * 60 * 60));
        console.log(`  🔴 ${t.ticket_id} | ${t.category} | ${hoursAgo}小时前 | ${t.summary}`);
      }
      break;
    }

    case 'stats': {
      const stats = getStats();
      console.log('\n📊 工单统计\n');
      console.log(`总工单数:     ${stats.total}`);
      console.log(`今日新增:     ${stats.today_created}`);
      console.log(`超时工单:     ${stats.overdue_count} ⚠️`);
      console.log(`\n按状态:`);
      for (const [status, count] of Object.entries(stats.by_status)) {
        console.log(`  ${status}: ${count}`);
      }
      console.log(`\n按分类:`);
      for (const [cat, count] of Object.entries(stats.by_category)) {
        console.log(`  ${cat}: ${count}`);
      }
      break;
    }

    default:
      console.log(`
🔵 客服工单管理脚本

用法:
  node scripts/ticket.mjs create         交互式创建工单
  node scripts/ticket.mjs list           列出所有工单
    --status open       按状态筛选
    --category 售后      按分类筛选
  node scripts/ticket.mjs show <ID>      查看单个工单
  node scripts/ticket.mjs update <ID>    更新工单状态
  node scripts/ticket.mjs close <ID>     关闭工单
  node scripts/ticket.mjs overdue        检查超时工单
  node scripts/ticket.mjs stats          工单统计
  node scripts/ticket.mjs auto           Agent内部调用（JSON输入）

Agent 内部调用示例:
  echo '{"action":"create","params":{"userId":"u001","category":"售后","summary":"用户要求退款","detail":"用户说产品效果不满意，要求全额退款"}}' | node scripts/ticket.mjs auto
      `);
  }
}

main().catch(console.error);
