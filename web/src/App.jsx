import React, { useState } from 'react';
import Navbar from './components/Navbar';
import AdminDashboard from './components/AdminDashboard';
import MobileAppSimulator from './components/MobileAppSimulator';
import AIVisionPlayground from './components/AIVisionPlayground';
import MaritimeMap from './components/MaritimeMap';
import AnalyticsView from './components/AnalyticsView';
import UserManual from './components/UserManual';

import { INITIAL_POSTS, INITIAL_VESSELS, INITIAL_ORDERS } from './data/mockData';

export default function App() {
  const [activeTab, setActiveTab] = useState('admin');
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [vessels, setVessels] = useState(INITIAL_VESSELS);
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [offlineMode, setOfflineMode] = useState(false);

  return (
    <div className="app-shell min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-sky-500 selection:text-white">
      
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        offlineMode={offlineMode}
        setOfflineMode={setOfflineMode}
      />

      <main className="site-main flex-1 w-full site-container">
        
        {activeTab === 'admin' && (
          <AdminDashboard 
            posts={posts} 
            setPosts={setPosts} 
            vessels={vessels} 
            orders={orders} 
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
          />
        )}

        {activeTab === 'user-manual' && (
          <UserManual />
        )}

      </main>

      <footer className="site-footer mt-auto bg-white/80 backdrop-blur-md border-t border-slate-200/80 site-container text-sm text-slate-600 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="leading-relaxed">
            © 2026 <strong className="text-sky-600 font-semibold">SeaTrade AI</strong> — Nền tảng kết nối giao thương hải sản ven biển & phân loại bằng AI.
          </p>
          <p className="text-xs font-mono text-slate-500">
            Đồ án tốt nghiệp CNTT • Trạm phát sóng GPS Vũng Tàu - Nam Bộ
          </p>
        </div>
      </footer>

    </div>
  );
}
