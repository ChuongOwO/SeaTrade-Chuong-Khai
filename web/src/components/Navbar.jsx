import React from 'react';
import { 
  ShieldCheck, 
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
    { id: 'sea-map', label: 'Bản Đồ Hải Trình', shortLabel: 'Bản Đồ', icon: Navigation },
    { id: 'analytics', label: 'Thống Kê', shortLabel: 'Thống Kê', icon: BarChart3 },
    { id: 'user-manual', label: 'Hướng Dẫn', shortLabel: 'Hướng Dẫn', icon: BookOpen }
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-lg border-b border-slate-200/80 shadow-sm">
      <div className="site-container site-header !py-2">
        <div className="flex items-center justify-between gap-3 md:gap-6">
          
          {/* Logo + Tên (Đã tăng kích thước lên khoảng 30%) */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-500 via-cyan-400 to-emerald-400 shadow-lg shadow-sky-500/30 shrink-0 flex items-center justify-center">
              <Anchor className="w-6 h-6 text-white animate-float drop-shadow-md" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-600">
                  SeaTrade AI
                </h1>
                <span className="badge badge-cyan text-[10px] px-2 py-0.5">Offshore v2.4</span>
              </div>
              <p className="text-xs text-slate-500 truncate max-w-[150px] sm:max-w-[300px] hidden sm:block mt-0.5">
                Nền tảng giao thương hải sản ven biển & AI phân loại
              </p>
            </div>
          </div>

          {/* Thanh Điều Hướng (Cùng hàng trên màn hình to) */}
          <nav className="hidden lg:flex flex-1 max-w-[800px] border border-slate-200 bg-slate-50/80 rounded-xl overflow-hidden shadow-sm">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  title={item.label}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-semibold transition-all border-r border-slate-200 last:border-r-0 ${
                    isActive
                      ? 'bg-sky-500 text-white'
                      : 'text-slate-600 hover:bg-white hover:text-sky-700'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-sky-600'}`} />
                  <span className="truncate">{item.shortLabel}</span>
                </button>
              );
            })}
          </nav>

          {/* Nút Offline / Online */}
          <button
            onClick={() => setOfflineMode(!offlineMode)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all shadow-sm whitespace-nowrap ${
              offlineMode
                ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
            }`}
            title="Mô phỏng sóng yếu ngoài khơi: Lưu dữ liệu ngoại tuyến (Offline Sync)"
          >
            {offlineMode ? <Radio className="w-3.5 h-3.5 animate-pulse" /> : <Wifi className="w-3.5 h-3.5" />}
            <span className="hidden xl:inline">{offlineMode ? 'Chế độ Offline' : 'GPS & 4G Online'}</span>
            <span className="xl:hidden">{offlineMode ? 'Offline' : 'Online'}</span>
          </button>
        </div>

        {/* Thanh Điều Hướng (Rớt xuống dòng cho Mobile/Tablet) */}
        <nav className="flex lg:hidden w-full border border-slate-200 bg-slate-50/80 rounded-xl overflow-hidden shadow-sm mt-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={item.label}
                className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 px-1 sm:px-2 py-2 text-[10px] sm:text-xs font-semibold transition-all border-r border-slate-200 last:border-r-0 ${
                  isActive
                    ? 'bg-sky-500 text-white'
                    : 'text-slate-600 hover:bg-white hover:text-sky-700'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-sky-600'}`} />
                <span className="truncate">{item.shortLabel}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
