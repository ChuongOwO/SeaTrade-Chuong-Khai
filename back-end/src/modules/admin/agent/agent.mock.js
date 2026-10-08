const crypto = require('crypto');

// "Model giả lập" cho Trợ lý AI — bật bằng AI_AGENT_MOCK=true trong .env.
// Dùng khi chưa có ANTHROPIC_API_KEY hoặc khi phát triển giao diện cho đỡ tốn
// tiền. Có cùng giao diện client.beta.messages.create() như Anthropic SDK nên
// đi qua ĐÚNG vòng lặp agent thật (agent.service.js): gọi tool thật trên DB
// thật, tạo phiếu chờ duyệt thật. Chỉ khác: hiểu câu hỏi bằng từ khoá đơn giản
// thay vì mô hình ngôn ngữ.

const PHONE_PATTERN = /0\d{8,10}/;

// Bỏ dấu tiếng Việt để so khớp từ khoá ("Khoá" == "khoa")
const normalize = (text) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

const hasAny = (text, keywords) => keywords.some(keyword => text.includes(keyword));

const formatVnd = (value) => `${Number(value).toLocaleString('vi-VN')} đ`;
const shortId = (id) => id.slice(0, 8).toUpperCase();

const textBlock = (text) => ({ type: 'text', text });
const toolUse = (name, input) => ({ type: 'tool_use', id: `mock_${crypto.randomUUID()}`, name, input });
const reply = (stop_reason, content) => ({ stop_reason, content });

// ---------------------------- Hiểu câu hỏi ----------------------------

const ORDER_STATUS_KEYWORDS = [
  ['cho xac nhan', 'PENDING'], ['da chot', 'CONFIRMED'], ['dang giao', 'IN_TRANSIT'],
  ['hoan tat', 'DELIVERED'], ['da huy', 'CANCELLED'], ['tu choi', 'REJECTED']
];

// Thao tác ghi tài khoản: [từ khoá, trạng thái mới]
const USER_ACTIONS = [['mo khoa', 'ACTIVE'], ['mo lai', 'ACTIVE'], ['tam ngung', 'INACTIVE'], ['khoa', 'BANNED']];

const detectOrderStatuses = (text) =>
  ORDER_STATUS_KEYWORDS.filter(([keyword]) => text.includes(keyword)).map(([, status]) => status);

const detectUserAction = (text) => {
  const phone = text.match(PHONE_PATTERN)?.[0];
  const action = USER_ACTIONS.find(([keyword]) => text.includes(keyword));
  return phone && action ? { phone, status: action[1] } : null;
};

const planToolCall = (question) => {
  const text = normalize(question);
  const userAction = detectUserAction(text);

  if (userAction) return toolUse('search_users', { keyword: userAction.phone, role: null, status: null });
  if (hasAny(text, ['don hang', 'don nao', 'cac don', ' don '])) {
    // Nhắc đúng 1 trạng thái thì lọc ở tool; nhiều trạng thái thì lọc lúc tóm tắt
    const statuses = detectOrderStatuses(text);
    return toolUse('search_orders', { status: statuses.length === 1 ? statuses[0] : null, keyword: null });
  }
  if (hasAny(text, ['tau', 'gps'])) return toolUse('search_vessels', { status: null, keyword: null });
  if (hasAny(text, ['cho', 'rao ban', 'gia', 'loai'])) return toolUse('search_market', { keyword: null });
  if (hasAny(text, ['tai khoan', 'nguoi dung', 'user'])) {
    return toolUse('search_users', { keyword: null, role: null, status: text.includes('khoa') ? 'BANNED' : null });
  }
  return toolUse('get_overview_stats', {});
};

// --------------------------- Soạn câu trả lời ---------------------------

const summarizeOrders = ({ rows }, question) => {
  const statuses = detectOrderStatuses(normalize(question));
  const orders = statuses.length ? rows.filter(order => statuses.includes(order.status)) : rows;
  if (orders.length === 0) {
    return `Không có đơn hàng nào${statuses.length ? ` ở trạng thái ${statuses.join(' / ')}` : ''}.`;
  }
  const lines = orders.slice(0, 10).map(order => {
    const species = [...new Set((order.items || []).map(item => item.species_name).filter(Boolean))].join(', ');
    return `- #${shortId(order.id)} ${species || 'chưa có hàng'}: ${order.seller?.full_name} → ${order.buyer?.full_name}, ${formatVnd(order.total_amount)} (${order.status})`;
  });
  return [`Tìm thấy ${orders.length} đơn hàng:`, ...lines].join('\n');
};

const summarizeVessels = ({ total, rows }, question) => {
  if (total === 0) return 'Hệ thống chưa có tàu nào.';
  const noGps = rows.filter(vessel => !vessel.recorded_at);
  if (normalize(question).includes('gps')) {
    if (noGps.length === 0) return `Cả ${total} tàu đều đã gửi vị trí GPS.`;
    return [`${noGps.length}/${total} tàu chưa gửi vị trí GPS:`, ...noGps.map(v => `- ${v.vessel_name} (${v.vessel_code}), chủ tàu ${v.owner_name}`)].join('\n');
  }
  const lines = rows.slice(0, 10).map(v =>
    `- ${v.vessel_name} (${v.vessel_code}) — ${v.status}, chủ tàu ${v.owner_name}${v.recorded_at ? '' : ', chưa có GPS'}`
  );
  return [`Hệ thống có ${total} tàu:`, ...lines].join('\n');
};

const summarizeMarket = ({ total, rows }) => {
  if (total === 0) return 'Hiện chưa có mẻ hải sản nào đang rao bán trên chợ.';
  const lines = rows.slice(0, 10).map(batch =>
    `- ${batch.species?.name_vi} ${Number(batch.quantity_kg)} kg, ${batch.price_per_kg ? `${formatVnd(batch.price_per_kg)}/kg` : 'chưa chào giá'} — tàu ${batch.vessel?.vessel_code}`
  );
  return [`Trên chợ đang có ${total} mẻ hải sản:`, ...lines].join('\n');
};

const summarizeUsers = ({ total, rows }) => {
  if (total === 0) return 'Không tìm thấy tài khoản nào phù hợp.';
  const lines = rows.slice(0, 10).map(u => `- ${u.full_name} (${u.phone}) — ${u.role}, ${u.status}`);
  return [`Tìm thấy ${total} tài khoản:`, ...lines].join('\n');
};

const summarizeStats = (stats) => {
  const sum = (counts = {}) => Object.values(counts).reduce((total, n) => total + n, 0);
  return [
    'Tình hình hệ thống:',
    `- ${sum(stats.users.by_role)} tài khoản, ${stats.users.by_status.BANNED || 0} bị khoá`,
    `- ${sum(stats.vessels.by_status)} tàu, ${stats.vessels.by_status.ACTIVE || 0} đang hoạt động`,
    `- ${stats.batches.by_status.AVAILABLE || 0} mẻ hải sản đang rao bán`,
    `- ${stats.orders.order_count} đơn hàng, tổng giá trị ${formatVnd(stats.orders.total_value)}`
  ].join('\n');
};

const SUMMARIZERS = {
  search_orders: summarizeOrders,
  search_vessels: summarizeVessels,
  search_market: summarizeMarket,
  search_users: summarizeUsers,
  get_overview_stats: summarizeStats
};

// ------------------------------- Vòng lặp -------------------------------

const lastQuestion = (messages) =>
  [...messages].reverse().find(m => m.role === 'user' && typeof m.content === 'string')?.content || '';

// Sau khi tìm được tài khoản: đề xuất đổi trạng thái (tool ghi -> phiếu chờ duyệt)
const proposeUserAction = (result, userAction) => {
  const user = result.rows[0];
  if (!user) return reply('end_turn', [textBlock(`Không tìm thấy tài khoản có SĐT ${userAction.phone}.`)]);
  if (user.status === userAction.status) {
    return reply('end_turn', [textBlock(`Tài khoản ${user.full_name} (${user.phone}) đã ở trạng thái ${user.status}, không cần đổi.`)]);
  }
  return reply('tool_use', [
    textBlock(`Tìm thấy tài khoản ${user.full_name} (${user.phone}), vai trò ${user.role}, đang ${user.status}. Mình đề xuất thao tác sau:`),
    toolUse('update_user', { user_id: user.id, role: null, status: userAction.status, reason: 'Theo yêu cầu của admin' })
  ]);
};

const answerFromToolResult = (messages) => {
  const results = messages.at(-1).content;
  const toolUses = messages.at(-2).content.filter(block => block.type === 'tool_use');
  const result = results[0];
  const call = toolUses.find(block => block.id === result.tool_use_id);
  const payload = JSON.parse(result.content);

  if (result.is_error) return reply('end_turn', [textBlock(`Không thực hiện được: ${payload.error}`)]);
  if (call.name === 'update_user') {
    return reply('end_turn', [textBlock(payload.done
      ? `Đã cập nhật tài khoản ${payload.user.full_name}: trạng thái hiện tại ${payload.user.status}.`
      : 'Đã huỷ thao tác theo quyết định của bạn, dữ liệu không thay đổi.')]);
  }

  const question = lastQuestion(messages);
  const userAction = detectUserAction(normalize(question));
  if (call.name === 'search_users' && userAction) return proposeUserAction(payload, userAction);
  return reply('end_turn', [textBlock(SUMMARIZERS[call.name](payload, question))]);
};

const createMockClient = () => ({
  beta: {
    messages: {
      create: async ({ messages }) => {
        const last = messages.at(-1);
        return typeof last.content === 'string'
          ? reply('tool_use', [planToolCall(last.content)])
          : answerFromToolResult(messages);
      }
    }
  }
});

module.exports = { createMockClient };
