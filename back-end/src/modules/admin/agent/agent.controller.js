const Anthropic = require('@anthropic-ai/sdk');
const agentService = require('./agent.service');

// Lỗi từ Claude API -> mã HTTP + thông báo tiếng Việt cho web admin
const toAgentHttpError = (error) => {
  if (error instanceof agentService.AgentError) return [error.statusCode, error.message];
  if (error instanceof Anthropic.AuthenticationError) return [503, 'ANTHROPIC_API_KEY không hợp lệ, kiểm tra lại back-end/.env'];
  if (error instanceof Anthropic.RateLimitError) return [429, 'Trợ lý AI đang quá tải, thử lại sau ít phút'];
  if (error instanceof Anthropic.APIConnectionError) return [503, 'Không kết nối được tới Claude API, kiểm tra mạng của máy chủ'];
  if (error instanceof Anthropic.APIError) return [502, `Claude API lỗi (${error.status}): ${error.message}`];
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

module.exports = { chat, confirm };
