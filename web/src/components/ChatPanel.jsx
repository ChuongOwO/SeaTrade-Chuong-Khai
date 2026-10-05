import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, RefreshCw } from 'lucide-react';
import { fetchMessages, sendMessage } from '../api/chat';

const POLL_INTERVAL_MS = 5000;

// Mobile gửi một số loại tin nhắn đặc biệt dưới dạng JSON có field __type
// (xem mobile/src/components/ChatThread.js -> parseMessage); web chỉ hiển thị
// dạng tóm tắt để admin/người dùng web đọc được.
function renderMessageBody(raw) {
  if (!raw?.startsWith('{')) return raw;
  try {
    const data = JSON.parse(raw);
    switch (data.__type) {
      case 'IMAGE':
        return data.base64 ? <img src={data.base64} alt="Ảnh trong tin nhắn" className="rounded-lg max-w-full" /> : '🖼️ [Ảnh]';
      case 'LOCATION':
        return `📍 Vị trí: ${Number(data.latitude).toFixed(4)}, ${Number(data.longitude).toFixed(4)}`;
      case 'PRICE_OFFER':
        return `💰 Chào giá: ${data.quantity_kg} kg × ${Number(data.price_per_kg).toLocaleString('vi-VN')} đ/kg`;
      case 'OFFER_ACCEPTED':
        return '✅ Đã chấp nhận chào giá';
      case 'OFFER_REJECTED':
        return '❌ Đã từ chối chào giá';
      default:
        return raw;
    }
  } catch {
    return raw;
  }
}

// Khung chat cho 1 hội thoại thật (GET/POST /api/chat/conversations/:id/messages).
// Dùng REST polling 5s cho đơn giản thay vì lắng nghe Socket.IO.
export default function ChatPanel({ conversation, currentUser, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const bottomRef = useRef(null);

  const loadMessages = useCallback(async ({ silent } = {}) => {
    if (!silent) setIsLoading(true);
    try {
      setMessages(await fetchMessages(conversation.id));
      setErrorMsg('');
    } catch (err) {
      setErrorMsg(err.message || 'Không tải được tin nhắn.');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [conversation.id]);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(() => loadMessages({ silent: true }), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const content = input.trim();
    if (!content || isSending) return;
    setIsSending(true);
    try {
      await sendMessage(conversation.id, content);
      setInput('');
      await loadMessages({ silent: true });
    } catch (err) {
      setErrorMsg(err.message || 'Gửi tin nhắn thất bại.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="glass-panel p-3 space-y-3 border-slate-800 flex flex-col" style={{ minHeight: '340px' }}>
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="min-w-0">
          <p className="text-xs font-bold text-white truncate">{conversation.peer?.full_name}</p>
          <p className="text-[10px] text-slate-400 truncate">{conversation.peer?.phone}</p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-xs shrink-0">Đóng</button>
      </div>

      {errorMsg && (
        <div className="p-2 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-[11px]" role="alert">
          {errorMsg}
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-2 min-h-40">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-slate-500 text-xs gap-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang tải tin nhắn...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-slate-500 text-xs py-6">
            Chưa có tin nhắn nào. Gửi lời chào để bắt đầu trao đổi!
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_id === currentUser?.id;
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-3 py-1.5 rounded-xl text-[11px] wrap-break-word ${
                  isMine ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-200'
                }`}>
                  {renderMessageBody(msg.message)}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex items-center gap-2 pt-2 border-t border-slate-800">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Nhập tin nhắn..."
          disabled={isSending}
          className="flex-1 p-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isSending || !input.trim()}
          aria-label="Gửi tin nhắn"
          className="p-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:hover:bg-sky-600 text-white rounded-xl shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
