import React, { useState, useRef, useEffect } from 'react';
import { Bot, SendHorizontal, Check, X, RotateCcw, AlertTriangle } from 'lucide-react';
import { askAgent, confirmAgentActions } from '../api/agent';

// Câu hỏi gợi ý — gắn với dữ liệu thật mà trợ lý tra cứu được
const SUGGESTIONS = [
  'Tóm tắt tình hình hệ thống hôm nay',
  'Những đơn hàng nào đang chờ xác nhận hoặc đang giao?',
  'Tàu nào chưa gửi vị trí GPS?',
  'Trên chợ đang rao bán những loài nào, giá bao nhiêu?',
  'Liệt kê các tài khoản đang bị khoá',
];

const DECISION_LABELS = { true: 'Đã duyệt', false: 'Đã từ chối' };

function ActionCard({ action, decision, isBusy, onDecide }) {
  const isDecided = decision !== undefined;
  return (
    <div className="agent-action" data-decision={isDecided ? String(decision) : 'pending'}>
      <p className="text-sm text-slate-800">{action.summary}</p>
      {isDecided ? (
        <p className="text-xs font-semibold mt-2 flex items-center gap-1">
          {decision ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
          {DECISION_LABELS[decision]}
        </p>
      ) : (
        <div className="flex gap-2 mt-3">
          <button type="button" className="btn btn-success btn-sm" disabled={isBusy} onClick={() => onDecide(action.id, true)}>
            <Check className="w-4 h-4" /> Duyệt
          </button>
          <button type="button" className="btn btn-outline-destructive btn-sm" disabled={isBusy} onClick={() => onDecide(action.id, false)}>
            <X className="w-4 h-4" /> Từ chối
          </button>
        </div>
      )}
    </div>
  );
}

function AssistantMessage({ message, decisions, isBusy, onDecide }) {
  return (
    <div className="flex gap-3 items-start">
      <span className="w-8 h-8 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center shrink-0" aria-hidden="true">
        <Bot className="w-4.5 h-4.5" />
      </span>
      <div className="min-w-0 flex-1 space-y-3 pt-1">
        {message.text && <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{message.text}</p>}
        {message.actions?.map(action => (
          <ActionCard key={action.id} action={action} decision={decisions[action.id]} isBusy={isBusy} onDecide={onDecide} />
        ))}
      </div>
    </div>
  );
}

export default function AIAssistant() {
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [input, setInput] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  // Quyết định của admin cho từng thao tác: { [actionId]: true | false }
  const [decisions, setDecisions] = useState({});
  // 'mock' = back-end đang bật AI_AGENT_MOCK (chưa dùng Claude thật)
  const [mode, setMode] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isBusy]);

  const pendingActions = messages.flatMap(m => m.actions || []).filter(a => decisions[a.id] === undefined);
  const hasPending = pendingActions.length > 0;

  const appendReply = (result) => {
    setConversationId(result.conversationId);
    setMode(result.mode);
    if (result.reply || result.pendingActions?.length) {
      setMessages(prev => [...prev, { role: 'assistant', text: result.reply, actions: result.pendingActions }]);
    }
  };

  const runRequest = async (request) => {
    setIsBusy(true);
    setErrorMsg('');
    try {
      appendReply(await request());
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsBusy(false);
    }
  };

  const sendMessage = (text) => {
    const question = text.trim();
    if (!question || isBusy || hasPending) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'admin', text: question }]);
    runRequest(() => askAgent(question, conversationId));
  };

  // Gửi quyết định khi admin đã bấm hết các thẻ chờ duyệt của lượt hiện tại
  const decide = (actionId, approved) => {
    const nextDecisions = { ...decisions, [actionId]: approved };
    setDecisions(nextDecisions);
    const stillPending = pendingActions.filter(a => a.id !== actionId);
    if (stillPending.length > 0) return;

    const turnDecisions = Object.fromEntries(
      messages.at(-1).actions.map(a => [a.id, nextDecisions[a.id]])
    );
    runRequest(() => confirmAgentActions(conversationId, turnDecisions));
  };

  const startNewConversation = () => {
    setMessages([]);
    setConversationId(null);
    setDecisions({});
    setErrorMsg('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="page-section">
      <div className="page-header page-header-row">
        <div>
          <h2 className="page-header-title flex items-center gap-2">
            Trợ Lý AI
            {mode === 'mock' && (
              <span className="badge-sm badge-amber" title="Back-end đang bật AI_AGENT_MOCK: trả lời theo từ khoá, chưa dùng Claude">
                Chế độ giả lập
              </span>
            )}
          </h2>
          <p className="page-header-desc">
            Hỏi về đơn hàng, đội tàu, người dùng và chợ hải sản bằng tiếng Việt. Thao tác thay đổi dữ liệu luôn chờ bạn duyệt trước khi thực hiện.
          </p>
        </div>
        {messages.length > 0 && (
          <button type="button" onClick={startNewConversation} className="btn btn-outline shrink-0" disabled={isBusy}>
            <RotateCcw className="w-4 h-4" /> Cuộc trò chuyện mới
          </button>
        )}
      </div>

      <div className="glass-panel agent-panel">
        <div className="agent-thread" aria-live="polite">
          {messages.length === 0 ? (
            <div className="agent-empty">
              <Bot className="w-9 h-9 text-teal-600" />
              <p className="text-sm text-slate-600">Chọn một câu hỏi để bắt đầu, hoặc tự gõ yêu cầu ở ô bên dưới.</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTIONS.map(suggestion => (
                  <button key={suggestion} type="button" className="agent-suggestion" onClick={() => sendMessage(suggestion)}>
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, index) =>
              message.role === 'admin' ? (
                <div key={index} className="flex justify-end">
                  <p className="agent-question">{message.text}</p>
                </div>
              ) : (
                <AssistantMessage key={index} message={message} decisions={decisions} isBusy={isBusy} onDecide={decide} />
              )
            )
          )}

          {isBusy && (
            <p className="text-sm text-slate-500 flex items-center gap-2 pl-11">
              <span className="agent-typing" aria-hidden="true"><span /><span /><span /></span>
              Trợ lý đang tra cứu dữ liệu...
            </p>
          )}
          {errorMsg && (
            <p className="text-sm text-rose-600 flex items-center gap-1.5 pl-11" role="alert">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {errorMsg}
            </p>
          )}
          <div ref={bottomRef} />
        </div>

        <form className="agent-composer" onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            maxLength={4000}
            disabled={isBusy || hasPending}
            placeholder={hasPending ? 'Hãy duyệt hoặc từ chối thao tác ở trên trước khi hỏi tiếp' : 'Ví dụ: Khoá tài khoản 0961153205 vì đăng tin sai sự thật'}
            className="input-field flex-1 resize-none"
            aria-label="Câu hỏi cho trợ lý AI"
          />
          <button type="submit" className="btn btn-primary self-end" disabled={isBusy || hasPending || !input.trim()}>
            <SendHorizontal className="w-4 h-4" /> Gửi
          </button>
        </form>
      </div>
    </div>
  );
}
