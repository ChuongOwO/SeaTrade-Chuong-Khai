import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LoginScreen from './components/LoginScreen';
import AdminDashboard from './components/AdminDashboard';
import OrderManagement from './components/OrderManagement';
import FleetManagement from './components/FleetManagement';
import MobileAppSimulator from './components/MobileAppSimulator';
import AIVisionPlayground from './components/AIVisionPlayground';
import MaritimeMap from './components/MaritimeMap';
import AnalyticsView from './components/AnalyticsView';
import UserManual from './components/UserManual';

import { INITIAL_POSTS, INITIAL_VESSELS, INITIAL_ORDERS } from './data/mockData';
import { getToken } from './api/client';
import { fetchCurrentUser, logoutAccount } from './api/auth';
import { buildUserFromBackend } from './api/roleMeta';
import { canAccessTab } from './config/permissions';
import { ShieldAlert } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true); // đang kiểm tra token cũ lúc tải trang
  const [activeTab, setActiveTab] = useState('admin');
  const [activeRole, setActiveRole] = useState('FISHERMAN'); // vai trò trong Mobile App Simulator
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [vessels, setVessels] = useState(INITIAL_VESSELS);
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [offlineMode, setOfflineMode] = useState(false);

  // Nếu trình duyệt đã có JWT từ lần đăng nhập trước (localStorage), thử gọi
  // GET /api/auth/me để đăng nhập lại tự động thay vì bắt người dùng đăng nhập lại mỗi lần F5.
  useEffect(() => {
    (async () => {
      const token = getToken();
      if (!token) {
        setCheckingAuth(false);
        return;
      }
      try {
        const backendUser = await fetchCurrentUser();
        const user = buildUserFromBackend(backendUser);
        setCurrentUser(user);
        setActiveTab(user.defaultTab);
        if (user.mobileRole) setActiveRole(user.mobileRole);
      } catch {
        // Token hết hạn/không hợp lệ -> xoá, quay lại màn đăng nhập
        logoutAccount();
      } finally {
        setCheckingAuth(false);
      }
    })();
  }, []);

  // Lưu ý: trước đây ở đây có 1 kết nối Socket.IO client lắng nghe sự kiện
  // 'vessel_location_update' để cập nhật vị trí tàu real-time cho state
  // `vessels` dùng chung toàn app. Đã bỏ vì back-end/src/server.js không hề
  // chạy Socket.IO server (chỉ Express thuần) nên kết nối này không bao giờ
  // nhận được gì — chỉ gây lỗi kết nối lặp lại trên console (xem lỗi
  // "socket.io/... 404" đã gặp lúc test web). Vị trí tàu thật cho tab "Bản Đồ
  // Hải Trình" giờ lấy trực tiếp từ GET /api/vessels/locations ngay trong
  // MaritimeMap.jsx (tự poll mỗi 10s, xem web/src/api/vessels.js).

  const handleLogin = (user) => {
    setCurrentUser(user);
    setActiveTab(user.defaultTab);
    if (user.mobileRole) setActiveRole(user.mobileRole);
  };

  const handleLogout = () => {
    logoutAccount();
    setCurrentUser(null);
    setActiveTab('admin');
  };

  // Đang kiểm tra token cũ -> tránh nháy màn đăng nhập rồi lại vào ngay
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400 text-sm">
        Đang kiểm tra đăng nhập...
      </div>
    );
  }

  // Chưa đăng nhập -> chỉ hiện màn hình đăng nhập/đăng ký, chưa vào được hệ thống
  // (Đặt SAU các hook useState/useEffect ở trên để không phá quy tắc Rules of Hooks)
  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // RBAC: kiểm tra lại lần nữa (ngoài việc Navbar đã ẩn sẵn các mục không được
  // phép) trước khi render nội dung tab thật — phòng trường hợp activeTab bị
  // set sai giá trị vì lý do gì đó (state cũ còn sót lại, thao tác thủ công...).
  const canViewActiveTab = canAccessTab(currentUser.role, activeTab);

  return (
    <div className="app-shell app-layout bg-slate-50 text-slate-900 font-sans selection:bg-sky-500 selection:text-white">

      {/* Skip link cho người dùng bàn phím/trình đọc màn hình: nhảy thẳng qua
          sidebar để tới nội dung chính, hiện ra khi focus (Tab đầu tiên). */}
      <a href="#main-content" className="skip-link">Bỏ qua để tới nội dung chính</a>

      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        offlineMode={offlineMode}
        setOfflineMode={setOfflineMode}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <div className="app-main">
      <main id="main-content" className="site-main flex-1 w-full site-container">

        {!canViewActiveTab && (
          <div className="page-section flex flex-col items-center justify-center text-center py-16 gap-3">
            <ShieldAlert className="w-10 h-10 text-rose-400" />
            <h2 className="text-base font-bold text-slate-700">Bạn không có quyền truy cập mục này</h2>
            <p className="text-sm text-slate-500 max-w-sm">
              Tài khoản vai trò <strong>{currentUser.roleLabel}</strong> không được cấp quyền dùng chức năng này.
              Vui lòng chọn mục khác trong menu bên trái.
            </p>
          </div>
        )}

        {canViewActiveTab && activeTab === 'admin' && (
          <AdminDashboard
            posts={posts}
            setPosts={setPosts}
            vessels={vessels}
            orders={orders}
          />
        )}

        {canViewActiveTab && activeTab === 'orders' && (
          <OrderManagement
            orders={orders}
            setOrders={setOrders}
          />
        )}

        {canViewActiveTab && activeTab === 'fleet' && (
          <FleetManagement
            vessels={vessels}
            setVessels={setVessels}
          />
        )}

        {canViewActiveTab && activeTab === 'mobile' && (
          <MobileAppSimulator
            posts={posts}
            setPosts={setPosts}
            vessels={vessels}
            orders={orders}
            setOrders={setOrders}
            offlineMode={offlineMode}
            activeRole={activeRole}
            setActiveRole={setActiveRole}
            currentUser={currentUser}
          />
        )}

        {canViewActiveTab && activeTab === 'ai-vision' && (
          <AIVisionPlayground />
        )}

        {canViewActiveTab && activeTab === 'sea-map' && (
          <MaritimeMap
            vessels={vessels}
            posts={posts}
            orders={orders}
          />
        )}

        {canViewActiveTab && activeTab === 'analytics' && (
          <AnalyticsView
            posts={posts}
            orders={orders}
            vessels={vessels}
          />
        )}

        {canViewActiveTab && activeTab === 'user-manual' && (
          <UserManual />
        )}

      </main>

      <footer className="site-footer mt-auto bg-white border-t border-slate-200 site-container text-xs text-slate-500">
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 <strong className="text-slate-700 font-semibold">SeaTrade AI</strong> — Đồ án tốt nghiệp CNTT</p>
          <p>Trạm phát sóng GPS Vũng Tàu - Nam Bộ</p>
        </div>
      </footer>
      </div>

    </div>
  );
}
