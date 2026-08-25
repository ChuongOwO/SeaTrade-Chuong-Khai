import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
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

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('admin');
  const [activeRole, setActiveRole] = useState('FISHERMAN'); // vai trò trong Mobile App Simulator
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [vessels, setVessels] = useState(INITIAL_VESSELS);
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [offlineMode, setOfflineMode] = useState(false);

  useEffect(() => {
    // Kết nối tới Socket.IO Server Backend
    const socket = io('http://localhost:5000');
    
    socket.on('connect', () => {
      console.log('📡 [Web] Đã kết nối Radar Server');
    });

    socket.on('vessel_location_update', (data) => {
      // Map data từ Simulator về cấu trúc vessel của Web
      // Simulator data: { vesselId, jobType, lat, lng, heading, speed, timestamp }
      
      setVessels(prevVessels => {
        const existingIdx = prevVessels.findIndex(v => v.code === data.vesselId);
        
        if (existingIdx >= 0) {
          // Cập nhật vị trí tàu cũ
          const updated = [...prevVessels];
          updated[existingIdx] = {
            ...updated[existingIdx],
            lat: data.lat,
            lng: data.lng,
            speedKnots: data.speed,
            lastSeen: data.timestamp
          };
          return updated;
        } else {
          // Thêm tàu mới chưa từng có trên bản đồ
          const newVessel = {
            id: prevVessels.length > 0 ? Math.max(...prevVessels.map(v => v.id)) + 1 : 1,
            code: data.vesselId,
            name: `Tàu ${data.jobType}`,
            captain: 'Thuyền trưởng Ảo',
            phone: '0900000000',
            type: data.jobType === 'Thu gom' ? 'collector' : 'fishing', // Chuyển đổi loại
            lat: data.lat,
            lng: data.lng,
            homePort: 'Cảng Cát Lở',
            speedKnots: data.speed,
            batteryPercent: Math.floor(Math.random() * 50) + 50,
            status: 'at-sea',
            lastSeen: data.timestamp
          };
          return [...prevVessels, newVessel];
        }
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleLogin = (user) => {
    setCurrentUser(user);
    setActiveTab(user.defaultTab);
    if (user.mobileRole) setActiveRole(user.mobileRole);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('admin');
  };

  // Chưa đăng nhập -> chỉ hiện màn hình chọn vai trò, chưa vào được hệ thống
  // (Đặt SAU các hook useState/useEffect ở trên để không phá quy tắc Rules of Hooks)
  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="app-shell app-layout bg-slate-50 text-slate-900 font-sans selection:bg-sky-500 selection:text-white">

      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        offlineMode={offlineMode}
        setOfflineMode={setOfflineMode}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <div className="app-main">
      <main className="site-main flex-1 w-full site-container">

        {activeTab === 'admin' && (
          <AdminDashboard
            posts={posts}
            setPosts={setPosts}
            vessels={vessels}
            orders={orders}
          />
        )}

        {activeTab === 'orders' && (
          <OrderManagement
            orders={orders}
            setOrders={setOrders}
          />
        )}

        {activeTab === 'fleet' && (
          <FleetManagement
            vessels={vessels}
            setVessels={setVessels}
          />
        )}

        {activeTab === 'mobile' && (
          <MobileAppSimulator
            posts={posts}
            setPosts={setPosts}
            vessels={vessels}
            orders={orders}
            setOrders={setOrders}
            offlineMode={offlineMode}
            activeRole={activeRole}
            setActiveRole={setActiveRole}
          />
        )}

        {activeTab === 'ai-vision' && (
          <AIVisionPlayground />
        )}

        {activeTab === 'sea-map' && (
          <MaritimeMap
            vessels={vessels}
            posts={posts}
            orders={orders}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView
            posts={posts}
            orders={orders}
            vessels={vessels}
          />
        )}

        {activeTab === 'user-manual' && (
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
