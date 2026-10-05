import React, { useState, useEffect } from 'react';
import { MessageCircle, RefreshCw, Plus } from 'lucide-react';
import { fetchConversations, openConversation } from '../api/chat';
import ChatPanel from './ChatPanel';

// Tin nhắn đặc biệt (JSON __type) chỉ hiện nhãn ngắn trong danh sách
const previewMessage = (raw) => (raw?.startsWith('{') ? '[Tin nhắn đính kèm]' : raw || 'Chưa có tin nhắn');

// Hộp thư chat thật của tài khoản đang đăng nhập (GET /api/chat/conversations)
export default function ChatInbox({ currentUser }) {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [peerPhone, setPeerPhone] = useState('');

  const loadConversations = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      setConversations(await fetchConversations());
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const handleStartConversation = async (e) => {
    e.preventDefault();
    const phone = peerPhone.trim();
    if (!phone) return;
    setErrorMsg('');
    try {
      setActiveConversation(await openConversation(phone));
      setPeerPhone('');
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const closeConversation = () => {
    setActiveConversation(null);
    loadConversations();
  };

  if (activeConversation) {
    return <ChatPanel conversation={activeConversation} currentUser={currentUser} onClose={closeConversation} />;
  }

  return (
    <div className="space-y-2.5">
      <form onSubmit={handleStartConversation} className="flex items-center gap-2">
        <input
          value={peerPhone}
          onChange={(e) => setPeerPhone(e.target.value)}
          placeholder="Nhập SĐT để nhắn tin mới..."
          className="flex-1 p-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs"
        />
        <button type="submit" disabled={!peerPhone.trim()} aria-label="Mở hội thoại" className="p-2 bg-cyan-600 disabled:opacity-40 text-white rounded-xl">
          <Plus className="w-4 h-4" />
        </button>
        <button type="button" onClick={loadConversations} aria-label="Tải lại" className="p-2 text-slate-400 hover:text-white">
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </form>

      {errorMsg && (
        <div className="p-2 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-[11px]" role="alert">{errorMsg}</div>
      )}

      {!isLoading && conversations.length === 0 && !errorMsg && (
        <div className="p-6 text-center text-slate-400 text-xs">Chưa có cuộc hội thoại nào.</div>
      )}

      {conversations.map((convo) => (
        <button
          key={convo.id}
          onClick={() => setActiveConversation(convo)}
          className="w-full glass-panel p-3 space-y-1 border-slate-800 hover:border-cyan-500/40 text-left transition-all"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-white font-semibold text-xs truncate">{convo.peer?.full_name}</span>
            {convo.unread_count > 0 ? (
              <span className="badge-sm badge-rose">{convo.unread_count} mới</span>
            ) : (
              <MessageCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            )}
          </div>
          <p className="text-[11px] text-slate-400 truncate">{previewMessage(convo.last_message)}</p>
        </button>
      ))}
    </div>
  );
}
