const crypto = require('crypto');
const { GoogleGenAI } = require('@google/genai');
const pool = require('../../../config/database');
const { TOOL_DEFINITIONS, TOOLS_BY_NAME } = require('./agent.tools');
const { createMockClient } = require('./agent.mock');

// Model mặc định có gói miễn phí; đổi sang model mạnh hơn bằng GEMINI_MODEL trong .env
const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
// Model dừng vì chính sách nội dung -> coi như từ chối trả lời
const BLOCKED_FINISH_REASONS = ['SAFETY', 'RECITATION', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'SPII'];
const MAX_TOOL_ROUNDS = 8; // chặn vòng lặp tool vô hạn trong 1 lượt chat

class AgentError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

const SYSTEM_PROMPT = `Bạn là Trợ lý AI của SeaTrade AI — nền tảng kết nối giao thương hải sản ven biển giữa tàu đánh bắt (ngư dân) và tàu thu gom / thương lái. Bạn hỗ trợ QUẢN TRỊ VIÊN (admin) tra cứu và vận hành hệ thống qua các công cụ được cung cấp.

Nguyên tắc:
- Luôn trả lời bằng tiếng Việt, ngắn gọn, đi thẳng vào số liệu. Tiền định dạng kiểu 1.250.000 đ, khối lượng theo kg.
- Câu trả lời hiển thị dạng chữ thường trên web: không dùng Markdown (bảng, tiêu đề, chữ đậm). Khi liệt kê, mỗi ý một dòng bắt đầu bằng "- ".
- Chỉ dùng dữ liệu lấy từ công cụ; không bịa số liệu. Nếu công cụ không có dữ liệu, nói rõ là chưa có.
- Khi nhắc tới đơn hàng, ghi mã ngắn (8 ký tự đầu, viết hoa) thay vì UUID đầy đủ.
- Các thao tác thay đổi dữ liệu (đổi trạng thái đơn, khoá/mở khoá hoặc đổi vai trò tài khoản, đổi trạng thái tàu) chỉ là ĐỀ XUẤT: hệ thống sẽ hiện nút để admin xác nhận. Không bao giờ nói thao tác đã xong trước khi nhận được kết quả công cụ báo done.
- Trước khi đề xuất thao tác, tra cứu để có đúng UUID đầy đủ của đối tượng. Nếu yêu cầu mơ hồ hoặc khớp nhiều đối tượng, hỏi lại admin thay vì đoán.
- Nếu admin từ chối một thao tác, ghi nhận và không đề xuất lại trừ khi được yêu cầu.`;

// Hội thoại lưu ở bảng agent_conversations (mỗi admin 1 cuộc đang mở), nên tải
// lại trang hay khởi động lại server đều không mất. `contents` theo định dạng
// của Gemini và chỉ NỐI THÊM (append-only): các part model trả về (gồm cả
// thoughtSignature) phải được gửi lại nguyên vẹn thì gọi hàm mới hoạt động đúng.
const findConversation = async (adminId) => {
  const result = await pool.query(
    'SELECT id, contents, pending, transcript FROM agent_conversations WHERE admin_id = $1',
    [adminId]
  );
  return result.rows[0] ? { ...result.rows[0], adminId } : null;
};

// Cuộc mới (id khác) ghi đè cuộc cũ của cùng admin
const saveConversation = ({ id, adminId, contents, pending, transcript }) =>
  pool.query(
    `INSERT INTO agent_conversations (id, admin_id, contents, pending, transcript)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (admin_id) DO UPDATE
     SET id = EXCLUDED.id, contents = EXCLUDED.contents, pending = EXCLUDED.pending,
         transcript = EXCLUDED.transcript, updated_at = NOW()`,
    // pg coi mảng JS là mảng Postgres -> phải tự chuyển sang chuỗi JSON cho cột jsonb
    [id, adminId, JSON.stringify(contents), JSON.stringify(pending), JSON.stringify(transcript)]
  );

// AI_AGENT_MOCK=true: dùng model giả lập (agent.mock.js), không cần API key
const isMockMode = () => process.env.AI_AGENT_MOCK === 'true';

const createGeminiClient = () => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return {
    generate: async (contents) => {
      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
        contents,
        config: {
          systemInstruction: `${SYSTEM_PROMPT}\n\nHôm nay là ${new Date().toLocaleDateString('vi-VN')}.`,
          tools: [{ functionDeclarations: TOOL_DEFINITIONS }]
        }
      });
      const candidate = response.candidates?.[0];
      return { parts: candidate?.content?.parts || [], finishReason: candidate?.finishReason };
    }
  };
};

// Client = { generate(contents) -> { parts, finishReason } }; bản Gemini thật và
// bản giả lập có chung giao diện này nên đi qua cùng một vòng lặp agent.
let geminiClient = null;
const getClient = () => {
  if (isMockMode()) return createMockClient();
  if (!process.env.GEMINI_API_KEY) {
    throw new AgentError(503, 'Trợ lý AI chưa được cấu hình: thiếu GEMINI_API_KEY trong back-end/.env');
  }
  geminiClient = geminiClient || createGeminiClient();
  return geminiClient;
};

const getConversation = async (conversationId, admin) => {
  const conversation = await findConversation(admin.id);
  if (!conversation || conversation.id !== conversationId) {
    throw new AgentError(404, 'Cuộc hội thoại không còn tồn tại, hãy bắt đầu cuộc mới');
  }
  return conversation;
};

const userTurn = (parts) => ({ role: 'user', parts });

const extractText = (parts) =>
  parts.filter(part => part.text && !part.thought).map(part => part.text).join('\n').trim();

// Gemini không phải lúc nào cũng trả id cho functionCall -> chỉ gửi lại khi có
const toolResponse = ({ id, name }, payload) => ({
  functionResponse: { ...(id && { id }), name, response: payload }
});

const isErrorResponse = (part) => 'error' in part.functionResponse.response;

const runTool = async (tool, call, admin) => {
  try {
    return toolResponse(call, await tool.run(call.args || {}, admin));
  } catch (error) {
    return toolResponse(call, { error: error.message });
  }
};

/**
 * Xử lý các functionCall trong 1 lượt trả lời của model: tool đọc chạy ngay,
 * tool ghi chỉ tạo "thao tác chờ xác nhận". Trả về { results, actions }.
 */
const handleFunctionCalls = async (calls, admin) => {
  const results = [];
  const actions = [];

  for (const call of calls) {
    const tool = TOOLS_BY_NAME[call.name];
    if (!tool) {
      results.push(toolResponse(call, { error: `Không có công cụ ${call.name}` }));
    } else if (!tool.requiresConfirmation) {
      results.push(await runTool(tool, call, admin));
    } else {
      try {
        const summary = await tool.describe(call.args || {}, admin);
        actions.push({ id: crypto.randomUUID(), call, summary });
      } catch (error) {
        // Đề xuất không hợp lệ (sai id, tự khoá mình...) -> báo lại cho model tự sửa
        results.push(toolResponse(call, { error: error.message }));
      }
    }
  }
  return { results, actions };
};

/**
 * Vòng lặp agent cho tới khi model trả lời xong, hoặc dừng lại chờ admin xác
 * nhận thao tác ghi. Mọi functionResponse của 1 lượt gửi chung trong 1 turn.
 */
const runUntilReply = async (conversation, admin) => {
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const { parts, finishReason } = await getClient().generate(conversation.contents);

    if (BLOCKED_FINISH_REASONS.includes(finishReason)) {
      return { reply: 'Trợ lý không thể xử lý yêu cầu này. Hãy diễn đạt lại hoặc thao tác trực tiếp trên giao diện.' };
    }
    if (parts.length === 0) return { reply: 'Trợ lý chưa đưa ra câu trả lời, hãy thử hỏi lại.' };
    conversation.contents.push({ role: 'model', parts });

    const text = extractText(parts);
    const calls = parts.filter(part => part.functionCall).map(part => part.functionCall);
    if (calls.length === 0) {
      return { reply: text || 'Trợ lý chưa đưa ra câu trả lời, hãy thử hỏi lại.' };
    }

    const { results, actions } = await handleFunctionCalls(calls, admin);
    if (actions.length > 0) {
      conversation.pending = { results, actions };
      return {
        reply: text,
        pendingActions: actions.map(({ id, call, summary }) => ({ id, tool: call.name, summary }))
      };
    }
    conversation.contents.push(userTurn(results));
  }
  return { reply: 'Yêu cầu cần quá nhiều bước tra cứu, hãy chia nhỏ câu hỏi.' };
};

const getMode = () => (isMockMode() ? 'mock' : 'gemini');

// Chạy model, ghi câu trả lời vào transcript (để web hiển thị lại) rồi lưu DB
const replyAndSave = async (conversation, admin) => {
  const outcome = await runUntilReply(conversation, admin);
  if (outcome.reply || outcome.pendingActions) {
    conversation.transcript.push({ role: 'assistant', text: outcome.reply, actions: outcome.pendingActions });
  }
  await saveConversation(conversation);
  return { conversationId: conversation.id, mode: getMode(), ...outcome };
};

const chat = async (admin, { conversationId, message }) => {
  let conversation;
  if (conversationId) {
    conversation = await getConversation(conversationId, admin);
    if (conversation.pending) {
      throw new AgentError(409, 'Còn thao tác đang chờ xác nhận, hãy xác nhận hoặc từ chối trước');
    }
  } else {
    conversation = { id: crypto.randomUUID(), adminId: admin.id, contents: [], pending: null, transcript: [] };
  }

  conversation.contents.push(userTurn([{ text: message }]));
  conversation.transcript.push({ role: 'admin', text: message });
  return replyAndSave(conversation, admin);
};

/**
 * decisions: { [actionId]: true (duyệt) | false (từ chối) }. Thực thi các thao
 * tác được duyệt, báo kết quả cho model rồi để model trả lời tiếp.
 */
const confirm = async (admin, { conversationId, decisions }) => {
  const conversation = await getConversation(conversationId, admin);
  const { pending } = conversation;
  if (!pending) throw new AgentError(409, 'Không có thao tác nào đang chờ xác nhận');

  const results = [...pending.results];
  const executed = [];
  const shownActions = conversation.transcript.at(-1).actions;
  for (const action of pending.actions) {
    const approved = decisions[action.id] === true;
    shownActions.find(shown => shown.id === action.id).decision = approved;
    if (approved) {
      const result = await runTool(TOOLS_BY_NAME[action.call.name], action.call, admin);
      results.push(result);
      executed.push({ id: action.id, success: !isErrorResponse(result) });
    } else {
      results.push(toolResponse(action.call, { done: false, message: 'Admin đã TỪ CHỐI thao tác này, không thực hiện.' }));
    }
  }

  conversation.pending = null;
  conversation.contents.push(userTurn(results));
  // Lưu ngay: thao tác đã chạy thì không được chờ duyệt lại, kể cả khi model lỗi ở bước sau
  await saveConversation(conversation);
  return { executed, ...(await replyAndSave(conversation, admin)) };
};

// Cuộc trò chuyện đang mở của admin, để web hiển thị lại sau khi tải lại trang
const getCurrent = async (admin) => {
  const conversation = await findConversation(admin.id);
  return {
    conversationId: conversation?.id || null,
    mode: getMode(),
    messages: conversation?.transcript || []
  };
};

const reset = async (admin) => {
  await pool.query('DELETE FROM agent_conversations WHERE admin_id = $1', [admin.id]);
  return { conversationId: null };
};

module.exports = { chat, confirm, getCurrent, reset, AgentError };
