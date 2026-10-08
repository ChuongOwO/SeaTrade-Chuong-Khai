const pool = require('../../../config/database');
const adminService = require('../admin.service');
const orderService = require('../../orders/order.service');
const vesselService = require('../../vessels/vessel.service');
const batchService = require('../../seafood/batch.service');

// Công cụ (tools) của Trợ lý AI cho admin. Mỗi tool gồm:
//   - definition: khai báo gửi lên Claude (JSON Schema, strict: true để input
//     luôn đúng schema; field tuỳ chọn khai báo dạng nullable + required)
//   - run(input, admin): thực thi, trả về object sẽ được JSON.stringify
// Tool ghi (requiresConfirmation) KHÔNG chạy ngay: agent dừng lại, admin bấm
// Xác nhận trên web thì mới gọi run() (xem agent.service.js).

const MAX_ROWS = 30; // giới hạn số dòng trả về cho model, tránh tốn token

// Khớp enum trong migrations/V1__init_schema.sql
const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'REJECTED'];
const VESSEL_STATUSES = ['ACTIVE', 'INACTIVE', 'OFFLINE', 'MAINTENANCE'];
const USER_ROLES = ['FISHERMAN', 'COLLECTOR', 'TRADER', 'ADMIN'];
const USER_STATUSES = ['ACTIVE', 'INACTIVE', 'BANNED'];

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const nullable = (schema) => ({ ...schema, type: [schema.type, 'null'] });
const nullableEnum = (values) => ({ type: ['string', 'null'], enum: [...values, null] });

const objectSchema = (properties) => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false
});

const includesText = (value, keyword) =>
  (value || '').toLowerCase().includes(keyword.toLowerCase());

const limitRows = (rows) => ({
  total: rows.length,
  rows: rows.slice(0, MAX_ROWS),
  truncated: rows.length > MAX_ROWS
});

const assertUuid = (value, label) => {
  if (!UUID_PATTERN.test(value || '')) throw new Error(`${label} không hợp lệ (cần UUID đầy đủ)`);
};

// --------------------------------- Tool đọc ---------------------------------

const getOverviewStats = {
  definition: {
    name: 'get_overview_stats',
    description: 'Số liệu tổng quan toàn hệ thống: người dùng theo vai trò/trạng thái, tàu theo trạng thái, mẻ cá theo trạng thái, đơn hàng theo trạng thái, tổng giá trị giao dịch, sản lượng theo loài và giá trị giao dịch 6 tháng gần nhất.',
    strict: true,
    input_schema: objectSchema({})
  },
  run: () => adminService.getStats()
};

const searchOrders = {
  definition: {
    name: 'search_orders',
    description: 'Tìm đơn hàng (mới nhất trước). Lọc theo trạng thái và/hoặc từ khoá (tên/SĐT người mua-bán, tên loài, mã tàu, mã đơn). Mỗi đơn có người mua, người bán, tổng tiền, dòng hàng (loài, kg, đơn giá, tàu).',
    strict: true,
    input_schema: objectSchema({
      status: nullableEnum(ORDER_STATUSES),
      keyword: nullable({ type: 'string', description: 'Từ khoá tìm kiếm, null nếu không lọc' })
    })
  },
  run: async ({ status, keyword }) => {
    const orders = await orderService.getOrdersByUser(null);
    const matches = orders.filter(order =>
      (!status || order.status === status) &&
      (!keyword || [
        order.id, order.buyer?.full_name, order.buyer?.phone, order.seller?.full_name, order.seller?.phone,
        ...(order.items || []).flatMap(item => [item.species_name, item.vessel_code])
      ].some(field => includesText(field, keyword)))
    );
    return limitRows(matches);
  }
};

const searchVessels = {
  definition: {
    name: 'search_vessels',
    description: 'Tìm tàu (đánh bắt / thu gom / vận chuyển) kèm chủ tàu và vị trí GPS mới nhất (recorded_at = thời điểm gửi GPS gần nhất, null nếu chưa từng gửi). Lọc theo trạng thái và/hoặc từ khoá (mã tàu, tên tàu, tên/SĐT chủ tàu).',
    strict: true,
    input_schema: objectSchema({
      status: nullableEnum(VESSEL_STATUSES),
      keyword: nullable({ type: 'string', description: 'Từ khoá tìm kiếm, null nếu không lọc' })
    })
  },
  run: async ({ status, keyword }) => {
    const vessels = await vesselService.getAllVessels();
    const matches = vessels.filter(vessel =>
      (!status || vessel.status === status) &&
      (!keyword || [vessel.vessel_code, vessel.vessel_name, vessel.owner_name, vessel.owner_phone]
        .some(field => includesText(field, keyword)))
    );
    return limitRows(matches);
  }
};

const searchUsers = {
  definition: {
    name: 'search_users',
    description: 'Tìm tài khoản người dùng kèm vai trò, trạng thái và số tàu sở hữu. Lọc theo từ khoá (tên/SĐT/email), vai trò, trạng thái.',
    strict: true,
    input_schema: objectSchema({
      keyword: nullable({ type: 'string', description: 'Tên, SĐT hoặc email; null nếu không lọc' }),
      role: nullableEnum(USER_ROLES),
      status: nullableEnum(USER_STATUSES)
    })
  },
  run: async ({ keyword, role, status }) =>
    limitRows(await adminService.listUsers({ search: keyword, role, status }))
};

const searchMarket = {
  definition: {
    name: 'search_market',
    description: 'Các mẻ hải sản đang rao bán trên chợ (AVAILABLE): loài, sản lượng kg, chất lượng, giá chào bán đ/kg (null nếu chưa chào giá), tàu, chủ tàu, thời gian đăng. Lọc theo từ khoá tên loài hoặc mã/tên tàu.',
    strict: true,
    input_schema: objectSchema({
      keyword: nullable({ type: 'string', description: 'Tên loài hoặc mã/tên tàu; null nếu không lọc' })
    })
  },
  run: async ({ keyword }) => {
    const batches = await batchService.getMarketBatches();
    const matches = batches.filter(batch =>
      !keyword || [batch.species?.name_vi, batch.vessel?.vessel_code, batch.vessel?.vessel_name]
        .some(field => includesText(field, keyword))
    );
    return limitRows(matches);
  }
};

// ------------------------- Tool ghi (cần admin xác nhận) -------------------------

const findOrder = async (orderId) => {
  const result = await pool.query('SELECT id, status, total_amount FROM orders WHERE id = $1', [orderId]);
  return result.rows[0];
};

const findUser = async (userId) => {
  const result = await pool.query('SELECT id, full_name, phone, role, status FROM users WHERE id = $1', [userId]);
  return result.rows[0];
};

const findVessel = async (vesselId) => {
  const result = await pool.query('SELECT id, vessel_code, vessel_name, status FROM vessels WHERE id = $1', [vesselId]);
  return result.rows[0];
};

const updateOrderStatus = {
  requiresConfirmation: true,
  definition: {
    name: 'update_order_status',
    description: 'Đổi trạng thái 1 đơn hàng. CẦN ADMIN XÁC NHẬN trên giao diện trước khi thực hiện. Dùng id đầy đủ (UUID) lấy từ search_orders.',
    strict: true,
    input_schema: objectSchema({
      order_id: { type: 'string', description: 'UUID đầy đủ của đơn hàng' },
      status: { type: 'string', enum: ORDER_STATUSES },
      reason: { type: 'string', description: 'Lý do ngắn gọn bằng tiếng Việt' }
    })
  },
  describe: async ({ order_id, status, reason }) => {
    assertUuid(order_id, 'Mã đơn hàng');
    const order = await findOrder(order_id);
    if (!order) throw new Error('Không tìm thấy đơn hàng');
    return `Đổi trạng thái đơn #${order.id.slice(0, 8).toUpperCase()} từ ${order.status} sang ${status}. Lý do: ${reason}`;
  },
  run: async ({ order_id, status }) => {
    const order = await orderService.updateOrderStatus(order_id, status);
    if (!order) throw new Error('Không tìm thấy đơn hàng');
    return { done: true, order };
  }
};

const updateUser = {
  requiresConfirmation: true,
  definition: {
    name: 'update_user',
    description: 'Đổi vai trò và/hoặc trạng thái (khoá: BANNED, tạm ngưng: INACTIVE, mở lại: ACTIVE) của 1 tài khoản. CẦN ADMIN XÁC NHẬN. Không áp dụng cho chính tài khoản admin đang dùng. Dùng id đầy đủ (UUID) lấy từ search_users; field không đổi để null.',
    strict: true,
    input_schema: objectSchema({
      user_id: { type: 'string', description: 'UUID đầy đủ của người dùng' },
      role: nullableEnum(USER_ROLES),
      status: nullableEnum(USER_STATUSES),
      reason: { type: 'string', description: 'Lý do ngắn gọn bằng tiếng Việt' }
    })
  },
  describe: async ({ user_id, role, status, reason }, admin) => {
    assertUuid(user_id, 'Mã người dùng');
    if (user_id === admin.id) throw new Error('Không thể tự thay đổi vai trò hoặc trạng thái của chính mình');
    if (!role && !status) throw new Error('Cần đổi ít nhất vai trò hoặc trạng thái');
    const user = await findUser(user_id);
    if (!user) throw new Error('Không tìm thấy người dùng');
    const changes = [
      role && `vai trò ${user.role} → ${role}`,
      status && `trạng thái ${user.status} → ${status}`
    ].filter(Boolean).join(', ');
    return `Tài khoản ${user.full_name} (${user.phone}): ${changes}. Lý do: ${reason}`;
  },
  run: async ({ user_id, role, status }) => {
    const user = await adminService.updateUser(user_id, { role, status });
    if (!user) throw new Error('Không tìm thấy người dùng');
    return { done: true, user };
  }
};

const updateVesselStatus = {
  requiresConfirmation: true,
  definition: {
    name: 'update_vessel_status',
    description: 'Đổi trạng thái hoạt động của 1 tàu. CẦN ADMIN XÁC NHẬN. Dùng id đầy đủ (UUID) lấy từ search_vessels.',
    strict: true,
    input_schema: objectSchema({
      vessel_id: { type: 'string', description: 'UUID đầy đủ của tàu' },
      status: { type: 'string', enum: VESSEL_STATUSES },
      reason: { type: 'string', description: 'Lý do ngắn gọn bằng tiếng Việt' }
    })
  },
  describe: async ({ vessel_id, status, reason }) => {
    assertUuid(vessel_id, 'Mã tàu');
    const vessel = await findVessel(vessel_id);
    if (!vessel) throw new Error('Không tìm thấy tàu');
    return `Tàu ${vessel.vessel_name} (${vessel.vessel_code}): trạng thái ${vessel.status} → ${status}. Lý do: ${reason}`;
  },
  // owner_id = null: admin thao tác trên mọi tàu (xem vessel.service.js)
  run: async ({ vessel_id, status }) => {
    const vessel = await vesselService.updateVessel(vessel_id, null, { status });
    if (!vessel) throw new Error('Không tìm thấy tàu');
    return { done: true, vessel };
  }
};

const TOOLS = [
  getOverviewStats, searchOrders, searchVessels, searchUsers, searchMarket,
  updateOrderStatus, updateUser, updateVesselStatus
];

const TOOLS_BY_NAME = Object.fromEntries(TOOLS.map(tool => [tool.definition.name, tool]));

module.exports = {
  TOOL_DEFINITIONS: TOOLS.map(tool => tool.definition),
  TOOLS_BY_NAME
};
