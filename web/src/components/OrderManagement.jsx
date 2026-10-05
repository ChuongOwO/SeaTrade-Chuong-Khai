import React, { useState, useEffect } from 'react';
import {
  Package,
  Search,
  DollarSign,
  Truck,
  CheckCircle2,
  Eye,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { fetchOrders, updateOrderStatus } from '../api/orders';

// Khớp enum order_status trong back-end/migrations/V1__init_schema.sql
const ORDER_STATUSES = {
  PENDING: { label: 'Chờ Xác Nhận', badge: 'badge-amber' },
  CONFIRMED: { label: 'Đã Chốt', badge: 'badge-cyan' },
  IN_TRANSIT: { label: 'Đang Giao', badge: 'badge-cyan' },
  DELIVERED: { label: 'Hoàn Tất', badge: 'badge-emerald' },
  CANCELLED: { label: 'Đã Hủy', badge: 'badge-rose' },
  REJECTED: { label: 'Bị Từ Chối', badge: 'badge-rose' }
};

// Các bước admin được chuyển tiếp từ mỗi trạng thái
const NEXT_STATUSES = {
  PENDING: ['CONFIRMED', 'REJECTED'],
  CONFIRMED: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
  REJECTED: []
};

const CLOSED_STATUSES = ['CANCELLED', 'REJECTED'];

const formatVnd = (value) => Number(value).toLocaleString('vi-VN');
const shortId = (id) => `#${id.slice(0, 8).toUpperCase()}`;

// LEFT JOIN order_items có thể trả về 1 phần tử toàn null khi đơn chưa có dòng hàng
const getItems = (order) => (order.items || []).filter(item => item.listing_id);
const getTotalKg = (order) => getItems(order).reduce((sum, item) => sum + Number(item.quantity_kg), 0);
const getSpeciesNames = (order) => [...new Set(getItems(order).map(item => item.species_name).filter(Boolean))].join(', ') || '—';
const getSellerVessel = (order) => getItems(order).find(item => item.vessel_code)?.vessel_code || '—';

function StatusBadge({ status }) {
  const meta = ORDER_STATUSES[status] || { label: status, badge: 'badge-cyan' };
  return <span className={`badge-sm ${meta.badge}`}>{meta.label}</span>;
}

export default function OrderManagement() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [actionError, setActionError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const loadOrders = async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      setOrders(await fetchOrders());
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const totalValue = orders
    .filter(o => !CLOSED_STATUSES.includes(o.status))
    .reduce((sum, o) => sum + Number(o.total_amount), 0);
  const inTransitCount = orders.filter(o => o.status === 'IN_TRANSIT').length;
  const deliveredCount = orders.filter(o => o.status === 'DELIVERED').length;

  const filteredOrders = orders.filter(order => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = [order.id, order.seller?.full_name, order.buyer?.full_name, getSpeciesNames(order), getSellerVessel(order)]
      .some(field => (field || '').toLowerCase().includes(term));
    const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openOrder = (order) => {
    setActionError('');
    setSelectedOrder(order);
  };

  const changeStatus = async (status) => {
    setIsUpdating(true);
    setActionError('');
    try {
      await updateOrderStatus(selectedOrder.id, status);
      setOrders(orders.map(o => (o.id === selectedOrder.id ? { ...o, status } : o)));
      setSelectedOrder({ ...selectedOrder, status });
    } catch (err) {
      setActionError(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const renderTableBody = () => {
    const message = isLoading
      ? 'Đang tải danh sách đơn hàng...'
      : loadError
        ? loadError
        : filteredOrders.length === 0 ? (orders.length === 0 ? 'Chưa có đơn hàng nào.' : 'Không tìm thấy đơn hàng phù hợp.') : '';
    if (message) {
      return (
        <tr>
          <td colSpan={6} className={`text-center py-8 ${loadError ? 'text-rose-600' : 'text-slate-500'}`}>
            {loadError && <AlertTriangle className="w-5 h-5 inline mr-1" />} {message}
          </td>
        </tr>
      );
    }
    return filteredOrders.map(order => (
      <tr key={order.id}>
        <td>
          <div className="font-mono font-bold text-sky-700 text-sm">{shortId(order.id)}</div>
          <div className="text-xs text-slate-500 mt-0.5">{getSpeciesNames(order)}</div>
        </td>
        <td>
          <div className="font-semibold text-slate-800 text-sm">{order.seller?.full_name}</div>
          <div className="text-xs text-slate-500 font-mono">{getSellerVessel(order)}</div>
        </td>
        <td>
          <div className="font-semibold text-slate-800 text-sm">{order.buyer?.full_name}</div>
          <div className="text-xs text-slate-500 font-mono">{order.buyer?.phone}</div>
        </td>
        <td>
          <div className="font-mono text-sm font-bold text-slate-900">{formatVnd(getTotalKg(order))} kg</div>
          <div className="text-xs text-amber-600 font-mono mt-0.5">{(Number(order.total_amount) / 1_000_000).toFixed(1)}Tr VNĐ</div>
        </td>
        <td><StatusBadge status={order.status} /></td>
        <td className="text-right">
          <button onClick={() => openOrder(order)} className="btn btn-outline btn-sm ml-auto">
            <Eye className="w-4 h-4" /> Chi tiết
          </button>
        </td>
      </tr>
    ));
  };

  return (
    <div className="page-section">

      <div className="page-header page-header-row">
        <div>
          <h2 className="page-header-title">Quản Lý Đơn Hàng</h2>
          <p className="page-header-desc">
            Theo dõi đơn hàng đã chốt giữa tàu đánh bắt (bên bán) và tàu thu gom / thương lái (bên mua),
            cập nhật trạng thái giao nhận và xem chi tiết từng giao dịch.
          </p>
        </div>
        <button type="button" onClick={loadOrders} className="btn btn-outline shrink-0" disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Tải lại
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-v">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-label">Tổng Số Đơn</span>
            <div className="p-2.5 bg-sky-100 rounded-xl text-sky-600"><Package className="w-5 h-5" /></div>
          </div>
          <div className="stat-value">{orders.length}</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-label">Tổng Giá Trị Đã Chốt</span>
            <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-600"><DollarSign className="w-5 h-5" /></div>
          </div>
          <div className="stat-value text-emerald-600">{(totalValue / 1_000_000).toFixed(1)} <span className="text-base font-semibold text-slate-500">Tr VNĐ</span></div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-label">Đang Giao Nhận</span>
            <div className="p-2.5 bg-sky-100 rounded-xl text-sky-600"><Truck className="w-5 h-5" /></div>
          </div>
          <div className="stat-value text-sky-600">{inTransitCount}</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-label">Đã Hoàn Tất</span>
            <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-600"><CheckCircle2 className="w-5 h-5" /></div>
          </div>
          <div className="stat-value text-emerald-600">{deliveredCount}</div>
        </div>
      </div>

      <div className="glass-panel stack-v">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 section-divider">
          <div>
            <h3 className="section-title">
              <Package className="w-5 h-5 text-sky-600" /> Danh Sách Đơn Hàng
            </h3>
            <p className="section-subtitle">Toàn bộ giao dịch giữa tàu đánh bắt và tàu thu gom / thương lái</p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Tìm mã đơn, loài, người bán/mua..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field input-search w-56"
              />
            </div>

            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field">
              <option value="ALL">Tất cả trạng thái</option>
              {Object.entries(ORDER_STATUSES).map(([value, { label }]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left border-collapse data-table">
            <thead>
              <tr>
                <th>Mã Đơn & Hải Sản</th>
                <th>Bên Bán</th>
                <th>Bên Mua</th>
                <th>Sản Lượng & Giá Trị</th>
                <th>Trạng Thái</th>
                <th className="text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody>{renderTableBody()}</tbody>
          </table>
        </div>
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white max-w-2xl w-full p-8 space-y-5 relative border border-slate-200 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <button onClick={() => setSelectedOrder(null)} className="btn btn-ghost btn-icon absolute right-5 top-5 text-lg" aria-label="Đóng">
              ✕
            </button>

            <div className="flex items-center gap-2.5">
              <span className="badge badge-cyan">Chi Tiết Đơn Hàng</span>
              <StatusBadge status={selectedOrder.status} />
            </div>

            <h3 className="text-xl font-bold text-slate-900">
              {shortId(selectedOrder.id)} — {getSpeciesNames(selectedOrder)}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <p className="text-slate-500 text-xs">Bên bán:</p>
                <p className="text-sm font-bold text-slate-900">{selectedOrder.seller?.full_name}</p>
                <p className="text-xs text-slate-500 font-mono">{selectedOrder.seller?.phone}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <p className="text-slate-500 text-xs">Bên mua:</p>
                <p className="text-sm font-bold text-slate-900">{selectedOrder.buyer?.full_name}</p>
                <p className="text-xs text-slate-500 font-mono">{selectedOrder.buyer?.phone}</p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left border-collapse data-table">
                <thead>
                  <tr><th>Hải sản</th><th>Tàu</th><th>Sản lượng</th><th>Đơn giá</th><th className="text-right">Thành tiền</th></tr>
                </thead>
                <tbody>
                  {getItems(selectedOrder).length === 0 ? (
                    <tr><td colSpan={5} className="text-center text-slate-500 py-4">Đơn chưa có dòng hàng.</td></tr>
                  ) : getItems(selectedOrder).map(item => (
                    <tr key={item.listing_id}>
                      <td className="text-sm font-semibold">{item.species_name}</td>
                      <td className="text-xs font-mono">{item.vessel_code}</td>
                      <td className="font-mono text-sm">{formatVnd(item.quantity_kg)} kg</td>
                      <td className="font-mono text-sm">{formatVnd(item.price_per_kg)} đ</td>
                      <td className="font-mono text-sm text-right">{formatVnd(item.subtotal)} đ</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap justify-between gap-2 text-sm">
              <span className="text-slate-500">Tạo lúc: {new Date(selectedOrder.created_at).toLocaleString('vi-VN')}</span>
              <span className="font-bold text-amber-600 font-mono">Tổng: {formatVnd(selectedOrder.total_amount)} VNĐ</span>
            </div>
            {selectedOrder.note && <p className="text-sm text-slate-600 italic">Ghi chú: {selectedOrder.note}</p>}

            {actionError && (
              <p className="text-sm text-rose-600 flex items-center gap-1.5" role="alert">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {actionError}
              </p>
            )}

            <div className="pt-4 border-t border-slate-200 flex flex-wrap justify-end gap-3">
              {(NEXT_STATUSES[selectedOrder.status] || []).map(status => (
                <button
                  key={status}
                  onClick={() => changeStatus(status)}
                  disabled={isUpdating}
                  className={CLOSED_STATUSES.includes(status) ? 'btn btn-outline-destructive' : 'btn btn-success'}
                >
                  Chuyển sang: {ORDER_STATUSES[status].label}
                </button>
              ))}
              <button onClick={() => setSelectedOrder(null)} className="btn btn-secondary">Đóng</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
