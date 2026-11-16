const { ApiError } = require('@google/genai');
const agentService = require('./agent.service');

const INVALID_KEY_STATUSES = [401, 403];
const OVERLOADED_STATUSES = [500, 503];

// Gemini trả 400 (không phải 401) khi API key sai
const isInvalidKeyError = (error) =>
  INVALID_KEY_STATUSES.includes(error.status) || /api key/i.test(error.message);

// Lỗi từ Gemini API -> mã HTTP + thông báo tiếng Việt cho web admin
const toAgentHttpError = (error) => {
  if (error instanceof agentService.AgentError) return [error.statusCode, error.message];
  if (error instanceof ApiError) {
    if (isInvalidKeyError(error)) return [503, 'GEMINI_API_KEY không hợp lệ, kiểm tra lại back-end/.env'];
    if (error.status === 429) return [429, 'Đã hết hạn mức gọi Gemini (gói miễn phí giới hạn số lượt mỗi phút/ngày), thử lại sau ít phút'];
    if (OVERLOADED_STATUSES.includes(error.status)) return [503, 'Gemini đang quá tải, thử lại sau ít phút'];
    return [502, `Gemini API lỗi (${error.status}): ${error.message}`];
  }
  if (error instanceof TypeError && /fetch failed/i.test(error.message)) {
    return [503, 'Không kết nối được tới Gemini API, kiểm tra mạng của máy chủ'];
  }
  return null;
};

const handle = (serviceFn) => async (req, res, next) => {
  try {
    const result = await serviceFn(req.user, req.body);
    res.json({ status: 200, message: 'OK', metadata: result });
  } catch (error) {
    const httpError = toAgentHttpError(error);
    if (!httpError) return next(error);
    const [status, message] = httpError;
    res.status(status).json({ status, message });
  }
};

// [POST] /api/admin/agent/chat — { conversationId?, message }
const chat = handle(agentService.chat);

// [POST] /api/admin/agent/confirm — { conversationId, decisions: { [actionId]: boolean } }
const confirm = handle(agentService.confirm);

// [GET] /api/admin/agent/conversation — cuộc trò chuyện đang mở của admin
const getCurrent = handle(agentService.getCurrent);

// [DELETE] /api/admin/agent/conversation — xoá để bắt đầu cuộc mới
const reset = handle(agentService.reset);

module.exports = { chat, confirm, getCurrent, reset };
