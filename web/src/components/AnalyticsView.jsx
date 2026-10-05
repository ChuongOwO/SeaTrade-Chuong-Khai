import React, { useState, useEffect } from 'react';
import {
  Layers,
  CalendarRange,
  Users,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { fetchAdminStats } from '../api/admin';

const ROLE_LABELS = {
  FISHERMAN: 'Thuyền trưởng',
  COLLECTOR: 'Tàu thu gom',
  TRADER: 'Thương lái',
  ADMIN: 'Quản trị viên'
};

const ORDER_STATUS_LABELS = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã chốt',
  IN_TRANSIT: 'Đang giao',
  DELIVERED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
  REJECTED: 'Bị từ chối'
};

const formatVnd = (value) => Number(value).toLocaleString('vi-VN');
const sumValues = (obj = {}) => Object.values(obj).reduce((sum, n) => sum + n, 0);

// Biểu đồ thanh ngang 1 chuỗi số liệu: cùng 1 màu, nhãn + giá trị ghi trực tiếp
// (không cần chú thích), tooltip native qua title khi rê chuột.
function HorizontalBars({ rows, formatValue, emptyText }) {
  if (rows.length === 0) return <p className="text-slate-500 text-sm">{emptyText}</p>;
  const max = Math.max(...rows.map(row => row.value)) || 1;

  return (
    <div className="space-y-3 text-sm">
      {rows.map(row => (
        <div key={row.label} title={`${row.label}: ${formatValue(row.value)}`}>
          <div className="flex justify-between text-slate-700 mb-1.5">
            <span className="font-medium">{row.label}</span>
            <span className="font-mono font-bold text-slate-900">{formatValue(row.value)}</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill bg-sky-500" style={{ width: `${(row.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function BreakdownList({ counts, labels }) {
  const entries = Object.entries(counts || {});
  if (entries.length === 0) return <p className="text-slate-500 text-sm">Chưa có dữ liệu.</p>;
  return (
    <ul className="space-y-2 text-sm">
      {entries.map(([key, count]) => (
        <li key={key} className="flex justify-between">
          <span className="text-slate-600">{labels[key] || key}</span>
          <span className="font-mono font-bold text-slate-900">{count}</span>
        </li>
      ))}
    </ul>
  );
}

export default function AnalyticsView() {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const loadStats = async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      setStats(await fetchAdminStats());
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const totalVolumeKg = (stats?.species_volume || []).reduce((sum, row) => sum + row.total_kg, 0);
  const speciesRows = (stats?.species_volume || []).map(row => ({ label: row.species, value: row.total_kg }));
  const monthlyRows = (stats?.monthly_orders || []).map(row => ({ label: row.month, value: row.total_value }));

  return (
    <div className="page-section">

      <div className="page-header page-header-row">
        <div>
          <h2 className="page-header-title">Thống Kê & Hiệu Quả Giao Thương</h2>
          <p className="page-header-desc">Sản lượng, doanh thu và cơ cấu giao dịch tổng hợp từ dữ liệu thực tế trên hệ thống.</p>
        </div>
        <button type="button" onClick={loadStats} className="btn btn-outline shrink-0" disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Tải lại
        </button>
      </div>

      {loadError && (
        <div className="info-box text-rose-700 bg-rose-50 border border-rose-200 flex items-center gap-2" role="alert">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {loadError}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-v">
        <div className="stat-card">
          <span className="stat-label">Tổng Giá Trị Giao Dịch</span>
          <div className="stat-value text-emerald-600">
            {((stats?.orders.total_value || 0) / 1_000_000).toFixed(1)} <span className="text-base font-semibold text-slate-500">Triệu VNĐ</span>
          </div>
          <p className="text-sm text-slate-500 mt-3">{stats?.orders.order_count || 0} đơn (không tính đơn hủy / bị từ chối)</p>
        </div>

        <div className="stat-card">
          <span className="stat-label">Tổng Sản Lượng Khai Thác</span>
          <div className="stat-value text-sky-600">
            {(totalVolumeKg / 1000).toFixed(2)} <span className="text-base font-semibold text-slate-500">Tấn</span>
          </div>
          <p className="text-sm text-slate-500 mt-3">{sumValues(stats?.batches.by_status)} mẻ hải sản đã ghi nhận</p>
        </div>

        <div className="stat-card">
          <span className="stat-label">Người Dùng & Tàu</span>
          <div className="stat-value text-amber-600">
            {sumValues(stats?.users.by_role)} <span className="text-base font-semibold text-slate-500">tài khoản</span>
          </div>
          <p className="text-sm text-slate-500 mt-3">
            {stats?.vessels.by_status.ACTIVE || 0} / {sumValues(stats?.vessels.by_status)} tàu đang hoạt động
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-v">
        <div className="glass-panel stack-v">
          <div className="section-divider">
            <h3 className="section-title">
              <Layers className="w-5 h-5 text-sky-600" /> Sản Lượng Khai Thác Theo Loài (kg)
            </h3>
          </div>
          <HorizontalBars
            rows={speciesRows}
            formatValue={(kg) => `${formatVnd(kg)} kg`}
            emptyText="Chưa có mẻ hải sản nào để thống kê."
          />
        </div>

        <div className="glass-panel stack-v">
          <div className="section-divider">
            <h3 className="section-title">
              <CalendarRange className="w-5 h-5 text-emerald-600" /> Giá Trị Giao Dịch 6 Tháng Gần Nhất
            </h3>
          </div>
          <HorizontalBars
            rows={monthlyRows}
            formatValue={(vnd) => `${(vnd / 1_000_000).toFixed(1)} Tr VNĐ`}
            emptyText="Chưa có giao dịch trong 6 tháng gần đây."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-v">
        <div className="glass-panel stack-v">
          <h3 className="section-title section-divider">
            <Users className="w-5 h-5 text-sky-600" /> Người Dùng Theo Vai Trò
          </h3>
          <BreakdownList counts={stats?.users.by_role} labels={ROLE_LABELS} />
        </div>

        <div className="glass-panel stack-v">
          <h3 className="section-title section-divider">
            <Layers className="w-5 h-5 text-emerald-600" /> Đơn Hàng Theo Trạng Thái
          </h3>
          <BreakdownList counts={stats?.orders.by_status} labels={ORDER_STATUS_LABELS} />
        </div>
      </div>

    </div>
  );
}
