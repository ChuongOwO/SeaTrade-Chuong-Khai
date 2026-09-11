import React, { useState } from 'react';
import {
  Package,
  Search,
  DollarSign,
  Truck,
  CheckCircle2,
  XCircle,
  Eye,
  MapPin,
  Star
} from 'lucide-react';

const STATUS_LABEL = {
  COMPLETED: 'Hoàn Tất',
  IN_TRANSIT: 'Đang Giao',
  CANCELLED: 'Đã Hủy'
};

const STATUS_BADGE_CLASS = {
  COMPLETED: 'badge-sm badge-emerald',
  IN_TRANSIT: 'badge-sm badge-cyan',
  CANCELLED: 'badge-sm badge-rose'
};

export default function OrderManagement({ orders, setOrders }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const totalOrders = orders.length;
  const totalValue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const inTransitCount = orders.filter(o => o.status === 'IN_TRANSIT').length;
  const completedCount = orders.filter(o => o.status === 'COMPLETED').length;

  const filteredOrders = orders.filter(order => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      order.id.toLowerCase().includes(term) ||
      order.speciesName.toLowerCase().includes(term) ||
      order.sellerName.toLowerCase().includes(term) ||
      order.buyerName.toLowerCase().includes(term) ||
      order.sellerVesselCode.toLowerCase().includes(term) ||
      order.buyerVesselCode.toLowerCase().includes(term);
    const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Admin cập nhật trạng thái đơn hàng (chỉ áp dụng khi đơn đang IN_TRANSIT)
  const updateOrderStatus = (orderId, newStatus) => {
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    setSelectedOrder(prev => prev && prev.id === orderId ? { ...prev, status: newStatus } : prev);
  };

  return (
    <div className="page-section">

      <div className="page-header">
        <h2 className="page-header-title">Quản Lý Đơn Hàng</h2>
        <p className="page-header-desc">
          Theo dõi đơn hàng đã chốt giữa tàu đánh bắt (bên bán) và tàu thu gom / thương lái (bên mua),
          cập nhật trạng thái giao nhận và xem chi tiết từng giao dịch.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-v">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-label">Tổng Số Đơn</span>
            <div className="p-2.5 bg-sky-100 rounded-xl text-sky-600">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="stat-value">{totalOrders}</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-label">Tổng Giá Trị Đã Chốt</span>
            <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="stat-value text-emerald-600">{(totalValue / 1000000).toFixed(1)} <span className="text-base font-semibold text-slate-500">Tr VNĐ</span></div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-label">Đang Giao Nhận</span>
            <div className="p-2.5 bg-sky-100 rounded-xl text-sky-600">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="stat-value text-sky-600">{inTransitCount}</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-label">Đã Hoàn Tất</span>
            <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="stat-value text-emerald-600">{completedCount}</div>
        </div>
      </div>

      {/* Orders Table */}
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
                placeholder="Tìm mã đơn, loài, tàu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field input-search w-52"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="IN_TRANSIT">Đang giao</option>
              <option value="COMPLETED">Hoàn tất</option>
              <option value="CANCELLED">Đã hủy</option>
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
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-slate-500 py-8">Không tìm thấy đơn hàng phù hợp.</td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <div className="font-mono font-bold text-sky-700 text-sm">{order.id}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{order.speciesName}</div>
                    </td>
                    <td>
                      <div className="font-semibold text-slate-800 text-sm">{order.sellerName}</div>
                      <div className="text-xs text-slate-500 font-mono">{order.sellerVesselCode}</div>
                    </td>
                    <td>
                      <div className="font-semibold text-slate-800 text-sm">{order.buyerName}</div>
                      <div className="text-xs text-slate-500 font-mono">{order.buyerVesselCode}</div>
                    </td>
                    <td>
                      <div className="font-mono text-sm font-bold text-slate-900">{order.quantityKg} kg</div>
                      <div className="text-xs text-amber-600 font-mono mt-0.5">{(order.totalAmount / 1000000).toFixed(1)}Tr VNĐ</div>
                    </td>
                    <td>
                      <span className={STATUS_BADGE_CLASS[order.status]}>{STATUS_LABEL[order.status]}</span>
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="btn btn-outline btn-sm ml-auto"
                      >
                        <Eye className="w-4 h-4" /> Chi tiết
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white max-w-2xl w-full p-8 space-y-5 relative border border-slate-200 rounded-2xl shadow-2xl">
            <button
              onClick={() => setSelectedOrder(null)}
              className="btn btn-ghost btn-icon absolute right-5 top-5 text-lg"
            >
              ✕
            </button>

            <div className="flex items-center gap-2.5">
              <span className="badge badge-cyan">Chi Tiết Đơn Hàng</span>
              <span className={STATUS_BADGE_CLASS[selectedOrder.status]}>{STATUS_LABEL[selectedOrder.status]}</span>
            </div>

            <h3 className="text-xl font-bold text-slate-900">
              {selectedOrder.id} — {selectedOrder.speciesName}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <p className="text-slate-500 text-xs">Bên bán:</p>
                <p className="text-sm font-bold text-slate-900">{selectedOrder.sellerName}</p>
                <p className="text-xs text-slate-500 font-mono">{selectedOrder.sellerVesselCode}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <p className="text-slate-500 text-xs">Bên mua:</p>
                <p className="text-sm font-bold text-slate-900">{selectedOrder.buyerName}</p>
                <p className="text-xs text-slate-500 font-mono">{selectedOrder.buyerVesselCode} • {selectedOrder.buyerCaptain}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <p className="text-slate-500 text-xs">Sản lượng & Đơn giá:</p>
                <p className="text-sm font-bold text-slate-900">{selectedOrder.quantityKg} kg × {selectedOrder.agreedPricePerKg.toLocaleString()} đ/kg</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <p className="text-slate-500 text-xs">Tổng giá trị:</p>
                <p className="text-sm font-bold text-amber-600 font-mono">{selectedOrder.totalAmount.toLocaleString()} VNĐ</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1 sm:col-span-2">
                <p className="text-slate-500 text-xs flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Tọa độ giao nhận:</p>
                <p className="text-sm font-bold text-sky-700 font-mono">{selectedOrder.dealLocationLat}°N, {selectedOrder.dealLocationLng}°E</p>
                <p className="text-xs text-slate-500">{selectedOrder.timestamp}</p>
              </div>
            </div>

            {selectedOrder.rating && (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-1">
                <p className="text-slate-600 text-xs flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> Đánh giá: {selectedOrder.rating}/5
                </p>
                {selectedOrder.review && <p className="text-sm text-slate-700 italic">"{selectedOrder.review}"</p>}
              </div>
            )}

            <div className="pt-4 border-t border-slate-200 flex flex-wrap justify-end gap-3">
              {selectedOrder.status === 'IN_TRANSIT' && (
                <>
                  <button
                    onClick={() => updateOrderStatus(selectedOrder.id, 'CANCELLED')}
                    className="btn btn-outline-destructive"
                  >
                    <XCircle className="w-4 h-4" /> Hủy Đơn
                  </button>
                  <button
                    onClick={() => updateOrderStatus(selectedOrder.id, 'COMPLETED')}
                    className="btn btn-success"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Đánh Dấu Hoàn Tất
                  </button>
                </>
              )}
              <button
                onClick={() => setSelectedOrder(null)}
                className="btn btn-secondary"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
