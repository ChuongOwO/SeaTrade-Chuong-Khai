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
  Anchor 
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, offlineMode, setOfflineMode }) {
  const navItems = [
    { id: 'admin', label: 'Web Admin', shortLabel: 'Admin', icon: ShieldCheck },
    { id: 'mobile', label: 'Mobile App', shortLabel: 'Mobile', icon: Smartphone, badge: 'Simulator' },
    { id: 'ai-vision', label: 'AI Vision', shortLabel: 'AI Vision', icon: Scan, badge: 'YOLOv8' },
    { id: 'sea-map', label: 'Bản Đồ Hải Trình', shortLabel: 'Bản Đồ', icon: Navigation },
    { id: 'analytics', label: 'Thống Kê', shortLabel: 'Thống Kê', icon: BarChart3 },
    { id: 'user-manual', label: 'Hướng Dẫn', shortLabel: 'Hướng Dẫn', icon: BookOpen }
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-lg border-b border-slate-200/80 shadow-sm">
      <div className="site-container site-header">
        <div className="stack-v">
        {/* Hàng 1: Logo + trạng thái */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl bg-gradient-to-tr from-sky-500 via-cyan-400 to-emerald-400 p-[2px] shadow-lg shadow-sky-500/20 shrink-0">
              <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                <Anchor className="w-7 h-7 lg:w-8 lg:h-8 text-sky-600 animate-float" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl lg:text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-600">
                  SeaTrade AI
                </h1>
                <span className="badge badge-cyan text-[11px] px-3 py-1">Offshore v2.4</span>
              </div>
              <p className="text-sm lg:text-base text-slate-500 mt-1 hidden lg:block truncate">
                Nền tảng giao thương hải sản ven biển & AI phân loại
              </p>
            </div>
          </div>

          <button
            onClick={() => setOfflineMode(!offlineMode)}
            className={`shrink-0 flex items-center gap-2.5 px-4 lg:px-5 py-2.5 rounded-lg text-sm font-medium border transition-all shadow-sm whitespace-nowrap ${
              offlineMode
                ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
            }`}
            title="Mô phỏng sóng yếu ngoài khơi: Lưu dữ liệu ngoại tuyến (Offline Sync)"
          >
            {offlineMode ? <Radio className="w-4 h-4 animate-pulse" /> : <Wifi className="w-4 h-4" />}
            <span className="hidden sm:inline">{offlineMode ? 'Chế độ Offline' : 'GPS & 4G Online'}</span>
            <span className="sm:hidden">{offlineMode ? 'Offline' : 'Online'}</span>
          </button>
        </div>

        {/* Hàng 2: Tab nav full width, không scroll */}
        <nav className="flex w-full border border-slate-200 bg-slate-50/80">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={item.label}
                className={`flex-1 flex items-center justify-center gap-1.5 min-w-0 px-2 sm:px-3 lg:px-4 py-3 text-xs sm:text-sm lg:text-base font-semibold transition-all border-r border-slate-200 last:border-r-0 ${
                  isActive
                    ? 'bg-sky-500 text-white'
                    : 'text-slate-600 hover:bg-white hover:text-sky-700'
                }`}
              >
                <Icon className={`w-4 h-4 lg:w-5 lg:h-5 shrink-0 ${isActive ? 'text-white' : 'text-sky-600'}`} />
                <span className="truncate hidden sm:inline">{item.label}</span>
                <span className="truncate sm:hidden">{item.shortLabel}</span>
                {item.badge && (
                  <span className={`hidden xl:inline text-[10px] px-1.5 py-0.5 font-mono font-bold shrink-0 ${
                    isActive ? 'bg-white/20 text-white' : 'bg-sky-100 text-sky-700'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        </div>
      </div>
    </header>
  );
}
