import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Anchor,
  Search,
  Filter,
  Eye,
  MapPin,
  DollarSign,
  Layers,
  FileText,
  Package,
  RefreshCw,
  AlertTriangle,
  Fish
} from 'lucide-react';
import { fetchMarketBatches } from '../api/seafood';
import { fetchVessels } from '../api/vessels';
import { fetchOrders } from '../api/orders';
import { API_BASE_URL } from '../api/client';

// Khớp enum quality_level (giống nhãn bên mobile/src/screens/MarketScreen.js)
const QUALITY_LABELS = {
  PREMIUM: 'Loại 1 (Tuyệt hảo)',
  GOOD: 'Loại 2 (Tốt)',
  NORMAL: 'Loại 3 (Trung bình)',
  LOW: 'Loại 4 (Kém)'
};

// Đơn bị hủy / từ chối không phản ánh giá thị trường
const EXCLUDED_ORDER_STATUSES = ['CANCELLED', 'REJECTED'];

const formatVnd = (value) => Number(value).toLocaleString('vi-VN');
const formatDateTime = (value) => (value ? new Date(value).toLocaleString('vi-VN') : '—');
const batchValue = (batch) => (batch.price_per_kg ? Number(batch.quantity_kg) * Number(batch.price_per_kg) : 0);

// Giá chốt trung bình theo loài, tính từ các dòng hàng của đơn đã chốt thật
function buildPriceIndex(orders) {
  const bySpecies = {};
  orders
    .filter(order => !EXCLUDED_ORDER_STATUSES.includes(order.status))
    .flatMap(order => order.items || [])
    .filter(item => item.species_name && item.price_per_kg)
    .forEach(item => {
      const entry = bySpecies[item.species_name] || { species: item.species_name, totalKg: 0, totalValue: 0, deals: 0 };
      entry.totalKg += Number(item.quantity_kg);
      entry.totalValue += Number(item.quantity_kg) * Number(item.price_per_kg);
      entry.deals += 1;
      bySpecies[item.species_name] = entry;
    });

  return Object.values(bySpecies)
    .map(entry => ({ ...entry, avgPrice: Math.round(entry.totalValue / entry.totalKg) }))
    .sort((a, b) => b.totalKg - a.totalKg);
}

function exportBatchesCsv(batches) {
  const headers = [
    'Loài hải sản', 'Mã tàu', 'Tên tàu', 'Chủ tàu', 'SĐT chủ tàu',
    'Sản lượng (kg)', 'Chất lượng', 'Độ tươi (%)', 'Đơn giá (đ/kg)',
    'Tổng giá trị (đ)', 'Vĩ độ', 'Kinh độ', 'Thời gian đánh bắt', 'Ngày đăng'
  ];
  const rows = batches.map(b => [
    b.species?.name_vi, b.vessel?.vessel_code, b.vessel?.vessel_name, b.owner_name, b.owner_phone,
    b.quantity_kg, QUALITY_LABELS[b.quality_level] || '', b.freshness_score ?? '', b.price_per_kg ?? '',
    batchValue(b) || '', b.catch_lat ?? '', b.catch_lng ?? '', b.catch_time ?? '', b.created_at
  ]);

  const escapeCell = (cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`;
  // BOM để Excel nhận đúng tiếng Việt UTF-8
  const csvContent = '﻿' + [headers, ...rows].map(row => row.map(escapeCell).join(',')).join('\r\n');

  const url = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `bao-cao-hai-san-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function AdminDashboard() {
  const [batches, setBatches] = useState([]);
  const [vessels, setVessels] = useState([]);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecies, setSelectedSpecies] = useState('ALL');
  const [selectedBatch, setSelectedBatch] = useState(null);

  const loadDashboard = async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const [batchData, vesselData, orderData] = await Promise.all([
        fetchMarketBatches(), fetchVessels(), fetchOrders()
      ]);
      setBatches(batchData);
      setVessels(vesselData);
      setOrders(orderData);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const totalVolumeKg = batches.reduce((sum, b) => sum + Number(b.quantity_kg), 0);
  const totalValueVnd = batches.reduce((sum, b) => sum + batchValue(b), 0);
  const activeVessels = vessels.filter(v => v.status === 'ACTIVE');
  const activeFishingCount = activeVessels.filter(v => v.vessel_type === 'FISHING').length;
  const activeCollectorCount = activeVessels.filter(v => v.vessel_type === 'COLLECTOR').length;
  const pendingOrderCount = orders.filter(o => ['PENDING', 'CONFIRMED', 'IN_TRANSIT'].includes(o.status)).length;
  const priceIndex = buildPriceIndex(orders);
  const speciesOptions = [...new Set(batches.map(b => b.species?.name_vi).filter(Boolean))];

  const filteredBatches = batches.filter(batch => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = [batch.species?.name_vi, batch.vessel?.vessel_code, batch.vessel?.vessel_name, batch.owner_name]
      .some(field => (field || '').toLowerCase().includes(term));
    const matchesSpecies = selectedSpecies === 'ALL' || batch.species?.name_vi === selectedSpecies;
    return matchesSearch && matchesSpecies;
  });

  const renderTableBody = () => {
    const message = isLoading
      ? 'Đang tải dữ liệu chợ hải sản...'
      : batches.length === 0
        ? 'Chưa có mẻ hải sản nào đang rao bán.'
        : filteredBatches.length === 0 ? 'Không tìm thấy mẻ hải sản phù hợp.' : '';
    if (message) {
      return <tr><td colSpan={6} className="text-center text-slate-500 py-8">{message}</td></tr>;
    }
    return filteredBatches.map(renderBatchRow);
  };

  const renderBatchRow = (batch) => (
    <tr key={batch.id}>
      <td>
        <div className="flex items-center gap-3">
          {batch.image_url ? (
            <img
              src={`${API_BASE_URL}${batch.image_url}`}
              alt={batch.species?.name_vi}
              className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0"
            />
          ) : (
            <span className="w-11 h-11 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
              <Fish className="w-5 h-5" />
            </span>
          )}
          <div className="min-w-0">
            <h4 className="font-bold text-slate-900 text-sm">{batch.species?.name_vi}</h4>
            <div className="text-xs text-slate-500">{formatDateTime(batch.created_at)}</div>
          </div>
        </div>
      </td>
      <td>
        <div className="font-semibold text-sky-700">{batch.vessel?.vessel_code}</div>
        <div className="text-slate-500 text-xs mt-0.5">{batch.vessel?.vessel_name} • {batch.owner_name}</div>
        {batch.catch_lat != null && (
          <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
            <MapPin className="w-3.5 h-3.5 text-rose-500" />
            <span>GPS: {Number(batch.catch_lat).toFixed(3)}°N, {Number(batch.catch_lng).toFixed(3)}°E</span>
          </div>
        )}
      </td>
      <td>
        <div className="font-mono text-sm font-bold text-slate-900">{formatVnd(batch.quantity_kg)} kg</div>
        <div className="text-emerald-600 text-xs font-medium mt-0.5">{QUALITY_LABELS[batch.quality_level] || 'Chưa phân loại'}</div>
      </td>
      <td>
        {batch.price_per_kg ? (
          <>
            <div className="font-mono text-sm font-extrabold text-amber-600">
              {formatVnd(batch.price_per_kg)} <span className="text-xs font-normal text-slate-500">đ/kg</span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Tổng: {(batchValue(batch) / 1_000_000).toFixed(1)}Tr VNĐ</div>
          </>
        ) : (
          <span className="text-xs text-slate-400">Chưa chào giá</span>
        )}
      </td>
      <td><span className="badge-sm badge-emerald">Đang rao</span></td>
      <td className="text-right">
        <button onClick={() => setSelectedBatch(batch)} className="btn btn-outline btn-sm ml-auto">
          <Eye className="w-4 h-4" /> Chi tiết
        </button>
      </td>
    </tr>
  );

  return (
    <div className="page-section">

      <div className="page-header page-header-row">
        <div>
          <h2 className="page-header-title">Web Admin Dashboard</h2>
          <p className="page-header-desc">Giám sát sản lượng, giá chốt đơn và các mẻ hải sản đang rao bán.</p>
        </div>
        <button type="button" onClick={loadDashboard} className="btn btn-outline shrink-0" disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Tải lại
        </button>
      </div>

      {loadError && (
        <div className="info-box text-rose-700 bg-rose-50 border border-rose-200 flex items-center gap-2" role="alert">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {loadError}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-v">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-label">Sản Lượng Đang Rao Bán</span>
            <div className="p-2.5 bg-sky-100 rounded-xl text-sky-600"><Layers className="w-5 h-5" /></div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="stat-value">{formatVnd(totalVolumeKg)}</span>
            <span className="text-sm font-semibold text-sky-600">kg</span>
          </div>
          <p className="text-sm text-slate-500 mt-3 font-medium">{batches.length} mẻ hải sản</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-label">Tổng Giá Trị Đang Rao</span>
            <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-600"><DollarSign className="w-5 h-5" /></div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="stat-value text-emerald-600">{(totalValueVnd / 1_000_000).toFixed(1)}</span>
            <span className="text-sm font-semibold text-emerald-700">Triệu VNĐ</span>
          </div>
          <p className="text-sm text-slate-500 mt-3 font-medium">Chỉ tính các mẻ đã chào giá</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-label">Tàu Đang Hoạt Động</span>
            <div className="p-2.5 bg-sky-100 rounded-xl text-sky-600"><Anchor className="w-5 h-5" /></div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="stat-value">{activeVessels.length}</span>
            <span className="text-sm text-slate-500">/ {vessels.length} tàu</span>
          </div>
          <div className="flex items-center gap-4 mt-3 text-sm text-slate-600">
            <span className="flex items-center gap-1.5 text-sky-700"><span className="w-2 h-2 rounded-full bg-sky-500"></span> {activeFishingCount} Đánh bắt</span>
            <span className="flex items-center gap-1.5 text-emerald-700"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> {activeCollectorCount} Thu gom</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-label">Đơn Hàng</span>
            <div className="p-2.5 bg-amber-100 rounded-xl text-amber-600"><Package className="w-5 h-5" /></div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="stat-value">{orders.length}</span>
            <span className="text-sm text-slate-500">đơn</span>
          </div>
          <p className="text-sm text-slate-500 mt-3 font-medium">{pendingOrderCount} đơn đang xử lý</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-v">

        <div className="lg:col-span-1 glass-panel flex flex-col gap-v">
          <div className="section-divider">
            <h3 className="section-title">
              <TrendingUp className="w-5 h-5 text-sky-600" /> Chỉ Số Giá Hải Sản Thị Trường
            </h3>
            <p className="section-subtitle">Giá chốt trung bình theo loài, tính từ các đơn hàng thật</p>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[480px] pr-1">
            {priceIndex.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">Chưa có đơn hàng nào được chốt để tính giá.</p>
            ) : priceIndex.map(item => (
              <div key={item.species} className="glass-card flex items-center justify-between hover:border-sky-300 transition-all">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">{item.species}</h4>
                  <span className="text-xs text-slate-500 font-mono">{item.deals} giao dịch • {formatVnd(item.totalKg)} kg</span>
                </div>
                <div className="text-sm font-extrabold text-sky-700 font-mono text-right pl-3">
                  {formatVnd(item.avgPrice)} <span className="text-xs font-normal text-slate-500">đ/kg</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 glass-panel stack-v">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 section-divider">
            <div>
              <h3 className="section-title">
                <Layers className="w-5 h-5 text-emerald-600" /> Danh Sách Hải Sản Đăng Bán Ngoài Khơi
              </h3>
              <p className="section-subtitle">Các mẻ cá đang AVAILABLE trên chợ</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Tìm loài, mã tàu, chủ tàu..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field input-search w-full sm:w-52"
                />
              </div>

              <div className="relative shrink-0">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter className="w-4 h-4 text-slate-400" />
                </div>
                <select
                  value={selectedSpecies}
                  onChange={(e) => setSelectedSpecies(e.target.value)}
                  className="input-field pl-9 pr-8 appearance-none cursor-pointer"
                >
                  <option value="ALL">Tất cả loài</option>
                  {speciesOptions.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>

              <button
                type="button"
                onClick={() => exportBatchesCsv(filteredBatches)}
                disabled={filteredBatches.length === 0}
                title={filteredBatches.length === 0 ? 'Không có dữ liệu để xuất' : 'Tải file CSV danh sách đang lọc'}
                className="btn btn-outline shrink-0"
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Xuất Báo Cáo (CSV)</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left border-collapse data-table">
              <thead>
                <tr>
                  <th>Hải Sản</th>
                  <th>Tàu Đánh Bắt / Vị Trí</th>
                  <th>Sản Lượng & Chất Lượng</th>
                  <th>Đơn Giá Rao</th>
                  <th>Trạng Thái</th>
                  <th className="text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody>{renderTableBody()}</tbody>
            </table>
          </div>
        </div>

      </div>

      {selectedBatch && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white max-w-lg w-full p-8 space-y-5 relative border border-slate-200 rounded-2xl shadow-2xl">
            <button onClick={() => setSelectedBatch(null)} className="btn btn-ghost btn-icon absolute right-5 top-5 text-lg" aria-label="Đóng">
              ✕
            </button>

            <div>
              <span className="text-xs text-slate-500 font-mono">Mã mẻ cá: #{selectedBatch.id.slice(0, 8)}</span>
              <h3 className="text-xl font-bold text-slate-900 mt-1">
                {selectedBatch.species?.name_vi} — {selectedBatch.vessel?.vessel_code}
              </h3>
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Tàu', selectedBatch.vessel?.vessel_name],
                ['Chủ tàu', `${selectedBatch.owner_name} (${selectedBatch.owner_phone || '—'})`],
                ['Sản lượng', `${formatVnd(selectedBatch.quantity_kg)} kg`],
                ['Chất lượng', QUALITY_LABELS[selectedBatch.quality_level] || 'Chưa phân loại'],
                ['Độ tươi', selectedBatch.freshness_score != null ? `${selectedBatch.freshness_score}%` : '—'],
                ['Đơn giá rao', selectedBatch.price_per_kg ? `${formatVnd(selectedBatch.price_per_kg)} đ/kg` : 'Chưa chào giá'],
                ['Thời gian đánh bắt', formatDateTime(selectedBatch.catch_time)],
                ['Ngày đăng', formatDateTime(selectedBatch.created_at)]
              ].map(([label, value]) => (
                <div key={label} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <dt className="text-slate-500 text-xs">{label}</dt>
                  <dd className="font-bold text-slate-900 mt-0.5">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button onClick={() => setSelectedBatch(null)} className="btn btn-secondary">Đóng</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
