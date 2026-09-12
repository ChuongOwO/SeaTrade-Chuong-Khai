import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, AlertTriangle, RefreshCw } from 'lucide-react';
import { fetchMessages, sendMessage } from '../api/chat';
import { ApiError } from '../api/client';

const POLL_INTERVAL_MS = 5000;

// Khung chat cho 1 đơn hàng cụ thể (order). Back-end hiện tại (nhánh đang pull)
// chưa có WebSocket cho chat (xem chat.js) nên khung này dùng REST polling đơn
// giản — gọi lại API mỗi 5s khi đang mở màn — để giả lập cảm giác realtime.
// Khi đồng đội xác nhận có server Socket.IO riêng cho chat, có thể thay effect
// polling này bằng lắng nghe socket event, phần render bên dưới không cần đổi.
export default function ChatPanel({ order, currentUser, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [apiUnavailable, setApiUnavailable] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const bottomRef = useRef(null);

  const loadMessages = useCallback(async ({ silent } = {}) => {
    try {
      if (!silent) setLoading(true);
      const data = await fetchMessages(order.id);
      setMessages(data);
      setApiUnavailable(false);
      setErrorMsg('');
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.status === 0)) {
        setApiUnavailable(true);
        setErrorMsg(
          err.status === 0
            ? 'Không kết nối được tới back-end. Kiểm tra server đã bật chưa (mặc định cổng 5000).'
            : 'API chat chưa tồn tại trên back-end (HTTP 404). Cần đồng đội xác nhận endpoint thật rồi cập nhật lại web/src/api/chat.js.'
        );
      } else {
        setErrorMsg(err.message || 'Không tải được tin nhắn.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [order.id]);

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
    if (!content || sending || apiUnavailable) return;
    setSending(true);
    try {
      await sendMessage(order.id, content);
      setInput('');
      await loadMessages({ silent: true });
    } catch (err) {
      setErrorMsg(err.message || 'Gửi tin nhắn thất bại.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="glass-panel p-3 space-y-3 border-slate-800 flex flex-col" style={{ minHeight: '340px' }}>
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="min-w-0">
          <p className="text-xs font-bold text-white truncate">{order.id}</p>
          <p className="text-[10px] text-slate-400 truncate">{order.sellerName} ↔ {order.buyerName}</p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-xs shrink-0">Đóng</button>
      </div>

      {apiUnavailable && (
        <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-[11px] flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {!apiUnavailable && errorMsg && (
        <div className="p-2 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-[11px]">
          {errorMsg}
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-2 min-h-[160px]">
        {loading ? (
          <div className="flex items-center justify-center h-full text-slate-500 text-xs gap-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang tải tin nhắn...
          </div>
        ) : messages.length === 0 && !apiUnavailable ? (
          <div className="text-center text-slate-500 text-xs py-6">
            Chưa có tin nhắn nào. Gửi lời chào để bắt đầu trao đổi!
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_id === currentUser?.id;
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-3 py-1.5 rounded-xl text-[11px] ${
                  isMine ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-200'
                }`}>
                  {msg.content}
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
          disabled={apiUnavailable || sending}
          className="flex-1 p-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={apiUnavailable || sending || !input.trim()}
          className="p-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:hover:bg-sky-600 text-white rounded-xl shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
