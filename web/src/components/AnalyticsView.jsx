import React, { useState, useEffect } from 'react';
import {
  Layers,
  CalendarRange,
  Users,
  RefreshCw,
  AlertTriangle,
  Calendar,
  Filter
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

const PERIOD_OPTIONS = [
  { value: 'all', label: 'Toàn bộ thời gian' },
  { value: 'today', label: 'Hôm nay' },
  { value: '7days', label: '7 ngày qua' },
  { value: '30days', label: '30 ngày qua' },
  { value: 'custom', label: 'Tùy chọn ngày...' }
];

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
  const [period, setPeriod] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadStats = async (overrideParams = {}) => {
    setIsLoading(true);
    setLoadError('');
    try {
      const activePeriod = overrideParams.period !== undefined ? overrideParams.period : period;
      const activeStart = overrideParams.startDate !== undefined ? overrideParams.startDate : startDate;
      const activeEnd = overrideParams.endDate !== undefined ? overrideParams.endDate : endDate;

      const params = {};
      if (activePeriod !== 'custom') {
        params.period = activePeriod;
      } else {
        if (activeStart) params.startDate = activeStart;
        if (activeEnd) params.endDate = activeEnd;
      }

      setStats(await fetchAdminStats(params));
    } catch (err) {
      setLoadError(err.message || 'Lỗi khi tải số liệu thống kê');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (period !== 'custom') {
      loadStats({ period });
    }
  }, [period]);

  const handleApplyCustomDate = (e) => {
    e.preventDefault();
    if (!startDate && !endDate) return;
    loadStats({ period: 'custom', startDate, endDate });
  };

  const totalVolumeKg = (stats?.species_volume || []).reduce((sum, row) => sum + row.total_kg, 0);
  const speciesRows = (stats?.species_volume || []).map(row => ({ label: row.species, value: row.total_kg }));
  const monthlyRows = (stats?.monthly_orders || []).map(row => ({ label: row.month, value: row.total_value }));

  const isDailyTrend = period === 'today' || period === '7days';

  return (
    <div className="page-section space-y-6">

      <div className="page-header page-header-row flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="page-header-title">Thống Kê & Hiệu Quả Giao Thương</h2>
          <p className="page-header-desc">
            Sản lượng, doanh thu và cơ cấu giao dịch tổng hợp từ dữ liệu thực tế trên hệ thống.
          </p>
        </div>

        {/* Thanh công cụ lọc thời gian */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-medium">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPeriod(opt.value)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  period === opt.value
                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => loadStats()}
            className="btn btn-outline btn-sm shrink-0"
            disabled={isLoading}
            title="Làm mới số liệu"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Form tùy chọn ngày khi chọn custom */}
      {period === 'custom' && (
        <form
          onSubmit={handleApplyCustomDate}
          className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center gap-3 text-xs"
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-600" />
            <span className="font-bold text-slate-700">Lọc khoảng ngày:</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-slate-500">Từ:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-base text-xs py-1 px-2.5 rounded-lg"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-slate-500">Đến:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-base text-xs py-1 px-2.5 rounded-lg"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-sm ml-auto">
            Áp dụng
          </button>
        </form>
      )}

      {loadError && (
        <div className="info-box text-rose-700 bg-rose-50 border border-rose-200 flex items-center gap-2" role="alert">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {loadError}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-v">
        <div className="stat-card">
          <span className="stat-label">Tổng Giá Trị Giao Dịch</span>
          <div className="stat-value text-emerald-600">
            {((stats?.orders.total_value || 0) / 1_000_000).toFixed(1)}{' '}
            <span className="text-base font-semibold text-slate-500">Triệu VNĐ</span>
          </div>
          <p className="text-sm text-slate-500 mt-3">
            {stats?.orders.order_count || 0} đơn (không tính đơn hủy / từ chối)
          </p>
        </div>

        <div className="stat-card">
          <span className="stat-label">Tổng Sản Lượng Khai Thác</span>
          <div className="stat-value text-sky-600">
            {(totalVolumeKg / 1000).toFixed(2)}{' '}
            <span className="text-base font-semibold text-slate-500">Tấn</span>
          </div>
          <p className="text-sm text-slate-500 mt-3">
            {sumValues(stats?.batches.by_status)} mẻ hải sản trong kỳ
          </p>
        </div>

        <div className="stat-card">
          <span className="stat-label">Người Dùng & Tàu</span>
          <div className="stat-value text-amber-600">
            {sumValues(stats?.users.by_role)}{' '}
            <span className="text-base font-semibold text-slate-500">tài khoản</span>
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
            emptyText="Chưa có mẻ hải sản nào trong khoảng thời gian này."
          />
        </div>

        <div className="glass-panel stack-v">
          <div className="section-divider">
            <h3 className="section-title">
              <CalendarRange className="w-5 h-5 text-emerald-600" />
              {isDailyTrend ? ' Xu Hướng Giao Dịch Theo Ngày' : ' Xu Hướng Giao Dịch Theo Tháng'}
            </h3>
          </div>
          <HorizontalBars
            rows={monthlyRows}
            formatValue={(vnd) => `${(vnd / 1_000_000).toFixed(1)} Tr VNĐ`}
            emptyText="Chưa có giao dịch trong khoảng thời gian đã chọn."
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
