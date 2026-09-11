import React from 'react';
import {
  ShieldCheck,
  Smartphone,
  Scan,
  Navigation,
  BarChart3,
  BookOpen,
  Radio,
  Wifi,
  Anchor,
  Package,
  Ship,
  LogOut
} from 'lucide-react';

const NAV_GROUPS = [
  {
    label: 'Quản Trị Hệ Thống',
    items: [
      { id: 'admin', label: 'Web Admin', icon: ShieldCheck },
      { id: 'orders', label: 'Đơn Hàng', icon: Package },
      { id: 'fleet', label: 'Đội Tàu', icon: Ship },
      { id: 'analytics', label: 'Thống Kê', icon: BarChart3 }
    ]
  },
  {
    label: 'Mô Phỏng & AI',
    items: [
      { id: 'mobile', label: 'Mobile App', icon: Smartphone },
      { id: 'ai-vision', label: 'AI Vision', icon: Scan },
      { id: 'sea-map', label: 'Bản Đồ Hải Trình', icon: Navigation }
    ]
  },
  {
    label: 'Thông Tin',
    items: [
      { id: 'user-manual', label: 'Hướng Dẫn', icon: BookOpen }
    ]
  }
];

// Sidebar điều hướng — thay cho thanh nav ngang trước đây từng phải nhồi 8 tab
// vào 1 hàng (rất rối khi nhiều màn hình). Nhóm theo chức năng, xếp dọc.
export default function Navbar({ activeTab, setActiveTab, offlineMode, setOfflineMode, currentUser, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-sky-600 shrink-0 flex items-center justify-center">
            <Anchor className="w-4.5 h-4.5 text-white animate-float" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-extrabold tracking-tight text-slate-900 truncate">SeaTrade AI</h1>
            <p className="text-[11px] text-slate-400 truncate">Giao thương hải sản & AI</p>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="sidebar-nav-group-label">{group.label}</p>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  title={item.label}
                  className={`sidebar-nav-item w-full ${isActive ? 'active' : ''}`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="sidebar-label-full truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer stack-v" style={{ gap: '0.6rem' }}>
        <button
          onClick={() => setOfflineMode(!offlineMode)}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
            offlineMode
              ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
          }`}
          title="Mô phỏng sóng yếu ngoài khơi: Lưu dữ liệu ngoại tuyến (Offline Sync)"
        >
          {offlineMode ? <Radio className="w-3.5 h-3.5 animate-pulse shrink-0" /> : <Wifi className="w-3.5 h-3.5 shrink-0" />}
          <span className="sidebar-label-full truncate">{offlineMode ? 'Chế độ Offline' : 'GPS & 4G Online'}</span>
        </button>

        {currentUser && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold shrink-0">
              {currentUser.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="min-w-0 flex-1 sidebar-label-full">
              <p className="text-xs font-bold text-slate-800 truncate">{currentUser.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{currentUser.roleLabel}</p>
            </div>
            <button
              onClick={onLogout}
              title="Đăng xuất"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
