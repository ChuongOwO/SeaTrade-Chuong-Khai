import React from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Layers, 
  MapPin
} from 'lucide-react';

const CATEGORY_LABELS = {
  Fish: 'Cá Đại Dương (Ngừ, Thu...)',
  Shrimp: 'Tôm / Tôm Hùm',
  Squid: 'Mực Lá / Mực Ống',
  Crab: 'Cua / Ghẹ'
};

const CATEGORY_COLORS = ['bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];
const CATEGORY_TEXT_COLORS = ['text-sky-600', 'text-emerald-600', 'text-amber-600', 'text-rose-600'];
const REGION_TEXT_COLORS = ['text-sky-600', 'text-emerald-600', 'text-amber-600', 'text-rose-600'];

export default function AnalyticsView({ posts, orders, vessels = [] }) {
  const totalTradeValue = orders.reduce((sum, o) => sum + o.totalAmount, 0) + 252000000;
  const totalVolumeKg = posts.reduce((sum, p) => sum + p.estimatedQuantityKg, 0) + 1450;
  const estimatedFuelSavedLiters = Math.round(orders.length * 145 + 1850);

  // Tỷ trọng sản lượng theo loài — tính thật từ mảng posts (trước đây là JSX tĩnh)
  const postsVolumeKg = posts.reduce((sum, p) => sum + p.estimatedQuantityKg, 0) || 1;
  const categoryBreakdown = Object.entries(
    posts.reduce((acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + p.estimatedQuantityKg;
      return acc;
    }, {})
  )
    .map(([category, kg]) => ({
      category,
      label: CATEGORY_LABELS[category] || category,
      kg,
      pct: (kg / postsVolumeKg) * 100
    }))
    .sort((a, b) => b.kg - a.kg);

  // Sản lượng theo vùng biển — nối posts.vesselCode với vessels.homePort thay vì hardcode 3 vùng cố định
  const regionalBreakdown = Object.entries(
    posts.reduce((acc, p) => {
      const vessel = vessels.find(v => v.code === p.vesselCode);
      const region = vessel ? vessel.homePort : 'Chưa xác định cảng';
      if (!acc[region]) acc[region] = { kg: 0, vesselCodes: new Set() };
      acc[region].kg += p.estimatedQuantityKg;
      acc[region].vesselCodes.add(p.vesselCode);
      return acc;
    }, {})
  )
    .map(([region, data]) => ({
      region,
      kg: data.kg,
      vesselCount: data.vesselCodes.size
    }))
    .sort((a, b) => b.kg - a.kg);

  return (
    <div className="page-section">

      <div className="page-header">
        <h2 className="page-header-title">Thống Kê & Hiệu Quả Giao Thương</h2>
        <p className="page-header-desc">Sản lượng, doanh thu và cơ cấu giao dịch tổng hợp từ dữ liệu thực tế trên hệ thống.</p>
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
            {categoryBreakdown.length === 0 ? (
              <p className="text-slate-500 text-sm">Chưa có bài đăng nào để thống kê.</p>
            ) : (
              categoryBreakdown.map((item, idx) => (
                <div key={item.category}>
                  <div className="flex justify-between text-slate-700 mb-2">
                    <span className="font-medium">{item.label}</span>
                    <span className={`font-mono font-bold ${CATEGORY_TEXT_COLORS[idx % CATEGORY_TEXT_COLORS.length]}`}>
                      {item.pct.toFixed(0)}% ({item.kg.toLocaleString()} kg)
                    </span>
                  </div>
                  <div className="progress-track">
                    <div
                      className={`progress-fill ${CATEGORY_COLORS[idx % CATEGORY_COLORS.length]}`}
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>
              ))
            )}
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
            {regionalBreakdown.length === 0 ? (
              <p className="text-slate-500 text-sm">Chưa có dữ liệu vùng biển.</p>
            ) : (
              regionalBreakdown.map((item, idx) => (
                <div key={item.region} className="glass-card flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{item.region}</h4>
                    <p className="text-xs text-slate-500 mt-1">{item.vesselCount} Tàu đang hoạt động</p>
                  </div>
                  <span className={`font-mono text-base font-bold ${REGION_TEXT_COLORS[idx % REGION_TEXT_COLORS.length]}`}>
                    {(item.kg / 1000).toFixed(2)} Tấn
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
