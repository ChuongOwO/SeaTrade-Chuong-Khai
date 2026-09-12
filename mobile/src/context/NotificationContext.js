import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { fetchUnreadMessageCount } from '../api/notificationsApi';

const NotificationContext = createContext(null);

// Đồng bộ tần suất với các nơi khác đang poll chat (ChatThread.js,
// HistoryScreen.js tab Chat) — back-end chưa có WebSocket/push thật.
const POLL_INTERVAL_MS = 5000;

export function NotificationProvider({ children }) {
  const { userToken } = useAuth();
  // unreadCount: số tin nhắn CHƯA ĐỌC thật sự (theo bảng notifications) —
  // dùng cho chấm đỏ trên sub-tab "Chat" (persist tới khi thực sự đọc).
  const [unreadCount, setUnreadCount] = useState(0);
  // hasNewBanner: chấm đỏ ở tab "Lịch Sử" ngoài cùng — bật khi có tin nhắn
  // MỚI phát sinh, tắt ngay khi người dùng bấm vào tab (xem markHistoryTabSeen).
  const [hasNewBanner, setHasNewBanner] = useState(false);
  const prevCountRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!userToken) return;
    try {
      const count = await fetchUnreadMessageCount();
      setUnreadCount(count);
      if (count > prevCountRef.current) {
        setHasNewBanner(true);
      }
      prevCountRef.current = count;
    } catch {
      // Lỗi mạng tạm thời — bỏ qua, không làm phiền người dùng bằng banner lỗi
      // (khác với màn Chat, ở đây chỉ là chấm đỏ phụ, không phải chức năng chính).
    }
  }, [userToken]);

  useEffect(() => {
    if (!userToken) {
      setUnreadCount(0);
      setHasNewBanner(false);
      prevCountRef.current = 0;
      return;
    }
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [userToken, refresh]);

  // Gọi khi người dùng bấm vào tab "Lịch Sử" ở thanh điều hướng dưới cùng.
  // Chấm đỏ NGOÀI tab biến mất, nhưng unreadCount (dùng cho chấm đỏ trên
  // sub-tab "Chat" bên trong) vẫn giữ nguyên tới khi tin nhắn thực sự được
  // đọc (xem back-end chat.service.js markMessagesRead — cũng cập nhật
  // notifications.is_read khi mở đúng hội thoại đó).
  const markHistoryTabSeen = useCallback(() => {
    setHasNewBanner(false);
  }, []);

  return (
    <NotificationContext.Provider value={{ unreadCount, hasNewBanner, markHistoryTabSeen, refresh }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
