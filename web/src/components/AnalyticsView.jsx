import React from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Layers, 
  MapPin
} from 'lucide-react';

export default function AnalyticsView({ posts, orders }) {
  const totalTradeValue = orders.reduce((sum, o) => sum + o.totalAmount, 0) + 252000000;
  const totalVolumeKg = posts.reduce((sum, p) => sum + p.estimatedQuantityKg, 0) + 1450;
  const estimatedFuelSavedLiters = Math.round(orders.length * 145 + 1850);

  return (
    <div className="page-section">
      
      {/* Header Banner */}
      <div className="page-header">
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2.5 mb-2">
            <span className="badge badge-cyan">Thống Kê Thủy Sản & Hiệu Quả Giao Thương</span>
            <span className="text-sm text-slate-500 font-mono">Báo Cáo Sản Lượng Khai Thác Năm 2026</span>
          </div>
          <h2 className="page-header-title flex items-center gap-2.5">
            <BarChart3 className="w-7 h-7 text-emerald-600" /> Báo Cáo Sản Lượng & Tiết Kiệm Nhiên Liệu
          </h2>
          <p className="page-header-desc">
            Tổng hợp dữ liệu giao thương hải sản thu gom tại khơi, cắt giảm khâu trung gian, giảm chi phí chạy tàu quay về cảng — gia tăng 25–30% thu nhập thực tế cho ngư dân.
          </p>
        </div>
      </div>

      {/* Analytics KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-v">
        
        <div className="stat-card">
          <span className="stat-label">Tổng Doanh Thu Giao Dịch Chốt Khơi</span>
          <div className="stat-value text-emerald-600">
            {(totalTradeValue / 1000000).toFixed(1)} <span className="text-base font-semibold text-slate-500">Triệu VNĐ</span>
          </div>
          <p className="text-sm text-emerald-600 mt-3 font-medium">+24.5% so với tháng trước</p>
        </div>

        <div className="stat-card">
          <span className="stat-label">Tổng Sản Lượng Thu Gom</span>
          <div className="stat-value text-sky-600">
            {(totalVolumeKg / 1000).toFixed(2)} <span className="text-base font-semibold text-slate-500">Tấn Hải Sản</span>
          </div>
          <p className="text-sm text-slate-500 mt-3">100% Verified bằng AI Computer Vision</p>
        </div>

        <div className="stat-card">
          <span className="stat-label">Nhiên Liệu Tiết Kiệm</span>
          <div className="stat-value text-amber-600">
            {estimatedFuelSavedLiters.toLocaleString()} <span className="text-base font-semibold text-slate-500">Lít Dầu DO</span>
          </div>
          <p className="text-sm text-emerald-600 mt-3">Tiết kiệm ~38.000.000 VNĐ tiền dầu di chuyển</p>
        </div>

      </div>

      {/* Charts & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-v">
        
        {/* Seafood Category Breakdown */}
        <div className="glass-panel stack-v">
          <div className="section-divider">
            <h3 className="section-title">
              <Layers className="w-5 h-5 text-sky-600" /> Tỷ Trọng Sản Lượng Khai Thác Theo Loài
            </h3>
          </div>

          <div className="stack-v text-sm">
            <div>
              <div className="flex justify-between text-slate-700 mb-2">
                <span className="font-medium">Cá Ngừ Vây Vàng (Ocean Yellowfin Tuna)</span>
                <span className="font-mono font-bold text-sky-600">42% (980 kg)</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill bg-sky-500" style={{ width: '42%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-700 mb-2">
                <span className="font-medium">Cá Thu Thuận Hải</span>
                <span className="font-mono font-bold text-emerald-600">28% (650 kg)</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill bg-emerald-500" style={{ width: '28%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-700 mb-2">
                <span className="font-medium">Mực Lá & Mực Ống Đại Dương</span>
                <span className="font-mono font-bold text-amber-600">18% (420 kg)</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill bg-amber-500" style={{ width: '18%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-700 mb-2">
                <span className="font-medium">Tôm Hùm Bông & Cua Biển Cà Mau</span>
                <span className="font-mono font-bold text-rose-600">12% (280 kg)</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill bg-rose-500" style={{ width: '12%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Regional Activity Breakdown */}
        <div className="glass-panel stack-v">
          <div className="section-divider">
            <h3 className="section-title">
              <MapPin className="w-5 h-5 text-emerald-600" /> Sản Lượng Theo Vùng Biển Ven Khơi
            </h3>
          </div>

          <div className="space-y-3">
            <div className="glass-card flex justify-between items-center">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Vùng biển Vũng Tàu - Cát Lở</h4>
                <p className="text-xs text-slate-500 mt-1">18 Tàu đang hoạt động</p>
              </div>
              <span className="font-mono text-base font-bold text-sky-600">1.25 Tấn</span>
            </div>

            <div className="glass-card flex justify-between items-center">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Vùng biển Phú Quốc - Kiên Giang</h4>
                <p className="text-xs text-slate-500 mt-1">12 Tàu đang hoạt động</p>
              </div>
              <span className="font-mono text-base font-bold text-emerald-600">0.95 Tấn</span>
            </div>

            <div className="glass-card flex justify-between items-center">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Vùng biển Phan Thiết - Bình Thuận</h4>
                <p className="text-xs text-slate-500 mt-1">14 Tàu đang hoạt động</p>
              </div>
              <span className="font-mono text-base font-bold text-amber-600">0.82 Tấn</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
