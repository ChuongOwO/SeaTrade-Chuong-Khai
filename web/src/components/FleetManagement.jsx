import React, { useState } from 'react';
import {
  Ship,
  Plus,
  Pencil,
  Trash2,
  Search,
  Anchor,
  Zap,
  Phone
} from 'lucide-react';

const emptyVesselForm = {
  code: '',
  name: '',
  type: 'fishing',
  captain: '',
  phone: '',
  homePort: '',
  lat: '',
  lng: '',
  heading: '0',
  speedKnots: '0',
  status: 'ACTIVE_FISHING',
  powerHP: '',
  fuelPercent: '100',
  batteryPercent: '100',
  coldStorageCapacityTons: '',
  currentLoadTons: ''
};

export default function FleetManagement({ vessels, setVessels }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyVesselForm);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const filteredVessels = vessels.filter(v => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      v.code.toLowerCase().includes(term) ||
      v.name.toLowerCase().includes(term) ||
      v.captain.toLowerCase().includes(term);
    const matchesType = typeFilter === 'ALL' || v.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const openAddForm = () => {
    setForm(emptyVesselForm);
    setEditingId(null);
    setFormOpen(true);
  };

  const openEditForm = (vessel) => {
    setForm({
      code: vessel.code,
      name: vessel.name,
      type: vessel.type,
      captain: vessel.captain,
      phone: vessel.phone,
      homePort: vessel.homePort,
      lat: String(vessel.lat),
      lng: String(vessel.lng),
      heading: String(vessel.heading ?? 0),
      speedKnots: String(vessel.speedKnots ?? 0),
      status: vessel.status,
      powerHP: String(vessel.powerHP ?? ''),
      fuelPercent: String(vessel.fuelPercent ?? 100),
      batteryPercent: String(vessel.batteryPercent ?? 100),
      coldStorageCapacityTons: String(vessel.coldStorageCapacityTons ?? ''),
      currentLoadTons: String(vessel.currentLoadTons ?? '')
    });
    setEditingId(vessel.id);
    setFormOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const base = {
      code: form.code.trim(),
      name: form.name.trim(),
      type: form.type,
      captain: form.captain.trim(),
      phone: form.phone.trim(),
      homePort: form.homePort.trim(),
      lat: parseFloat(form.lat) || 0,
      lng: parseFloat(form.lng) || 0,
      heading: parseInt(form.heading) || 0,
      speedKnots: parseFloat(form.speedKnots) || 0,
      status: form.status,
      powerHP: parseInt(form.powerHP) || 0,
      fuelPercent: parseInt(form.fuelPercent) || 0,
      batteryPercent: parseInt(form.batteryPercent) || 0
    };

    if (form.type === 'collector') {
      base.coldStorageCapacityTons = parseFloat(form.coldStorageCapacityTons) || 0;
      base.currentLoadTons = parseFloat(form.currentLoadTons) || 0;
    }

    if (editingId) {
      setVessels(vessels.map(v => v.id === editingId ? { ...v, ...base } : v));
    } else {
      const newVessel = {
        id: `vessel-${Date.now().toString().slice(-6)}`,
        ...base
      };
      setVessels([...vessels, newVessel]);
    }

    setFormOpen(false);
    setEditingId(null);
  };

  const confirmDelete = () => {
    setVessels(vessels.filter(v => v.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  return (
    <div className="page-section">

      <div className="page-header flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="page-header-title">Quản Lý Đội Tàu</h2>
          <p className="page-header-desc">Thêm mới, chỉnh sửa hoặc gỡ bỏ tàu đánh bắt / tàu thu gom khỏi hệ thống.</p>
        </div>

        <button
          type="button"
          onClick={openAddForm}
          className="btn btn-primary shrink-0"
        >
          <Plus className="w-4 h-4" /> Thêm Tàu Mới
        </button>
      </div>

      {/* Fleet Table */}
      <div className="glass-panel stack-v">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 section-divider">
          <h3 className="section-title">
            <Anchor className="w-5 h-5 text-sky-600" /> Danh Sách Tàu Thuyền ({vessels.length})
          </h3>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Tìm số hiệu, tên tàu, thuyền trưởng..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field input-search w-60"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input-field"
            >
              <option value="ALL">Tất cả loại tàu</option>
              <option value="fishing">Tàu đánh bắt</option>
              <option value="collector">Tàu thu gom</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left border-collapse data-table">
            <thead>
              <tr>
                <th>Tàu</th>
                <th>Thuyền Trưởng</th>
                <th>Cảng Xuất Bến</th>
                <th>Trạng Thái</th>
                <th>Vận Tốc</th>
                <th className="text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredVessels.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-slate-500 py-8">Không tìm thấy tàu phù hợp.</td>
                </tr>
              ) : (
                filteredVessels.map((vessel) => (
                  <tr key={vessel.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className={`p-1.5 rounded-lg ${vessel.type === 'fishing' ? 'bg-sky-100 text-sky-600' : 'bg-emerald-100 text-emerald-600'}`}>
                          {vessel.type === 'fishing' ? <Anchor className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                        </span>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{vessel.name}</div>
                          <div className="text-xs text-slate-500 font-mono">{vessel.code}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="text-sm text-slate-800">{vessel.captain}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3" /> {vessel.phone}</div>
                    </td>
                    <td className="text-sm text-slate-700">{vessel.homePort}</td>
                    <td>
                      <span className="badge-sm badge-cyan">{vessel.status}</span>
                    </td>
                    <td className="font-mono text-sm text-slate-700">{vessel.speedKnots} Hải lý/h</td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditForm(vessel)}
                          className="btn btn-outline btn-icon"
                          title="Sửa"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(vessel)}
                          className="btn btn-outline-destructive btn-icon"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Form Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-6">
          <form
            onSubmit={handleSubmit}
            className="bg-white max-w-2xl w-full p-8 space-y-5 relative border border-slate-200 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="btn btn-ghost btn-icon absolute right-5 top-5 text-lg"
            >
              ✕
            </button>

            <h3 className="text-xl font-bold text-slate-900">
              {editingId ? 'Chỉnh Sửa Tàu' : 'Thêm Tàu Mới'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Số hiệu đăng kiểm *</label>
                <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="input-field w-full" placeholder="VD: BV-12345-TS" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Tên tàu *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field w-full" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Loại tàu *</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input-field w-full">
                  <option value="fishing">Tàu đánh bắt</option>
                  <option value="collector">Tàu thu gom</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Trạng thái</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input-field w-full">
                  <option value="ACTIVE_FISHING">Đang đánh bắt</option>
                  <option value="ANCHORED_HAULING">Đang neo kéo lưới</option>
                  <option value="PATROLLING_BUYING">Đang tuần tra thu mua</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Thuyền trưởng / Chủ tàu *</label>
                <input required value={form.captain} onChange={(e) => setForm({ ...form, captain: e.target.value })} className="input-field w-full" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Số điện thoại *</label>
                <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field w-full" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-600 block mb-1">Cảng cá xuất bến *</label>
                <input required value={form.homePort} onChange={(e) => setForm({ ...form, homePort: e.target.value })} className="input-field w-full" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Vĩ độ (Lat) *</label>
                <input required type="number" step="0.0001" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} className="input-field w-full" placeholder="10.3245" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Kinh độ (Lng) *</label>
                <input required type="number" step="0.0001" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} className="input-field w-full" placeholder="107.1240" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Tốc độ (hải lý/h)</label>
                <input type="number" step="0.1" value={form.speedKnots} onChange={(e) => setForm({ ...form, speedKnots: e.target.value })} className="input-field w-full" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Công suất máy (HP)</label>
                <input type="number" value={form.powerHP} onChange={(e) => setForm({ ...form, powerHP: e.target.value })} className="input-field w-full" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Nhiên liệu (%)</label>
                <input type="number" min="0" max="100" value={form.fuelPercent} onChange={(e) => setForm({ ...form, fuelPercent: e.target.value })} className="input-field w-full" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Pin định vị (%)</label>
                <input type="number" min="0" max="100" value={form.batteryPercent} onChange={(e) => setForm({ ...form, batteryPercent: e.target.value })} className="input-field w-full" />
              </div>

              {form.type === 'collector' && (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Sức chứa hầm lạnh (tấn)</label>
                    <input type="number" step="0.1" value={form.coldStorageCapacityTons} onChange={(e) => setForm({ ...form, coldStorageCapacityTons: e.target.value })} className="input-field w-full" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Đã tải hiện tại (tấn)</label>
                    <input type="number" step="0.1" value={form.currentLoadTons} onChange={(e) => setForm({ ...form, currentLoadTons: e.target.value })} className="input-field w-full" />
                  </div>
                </>
              )}
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="btn btn-secondary"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="btn btn-primary"
              >
                {editingId ? 'Lưu Thay Đổi' : 'Thêm Tàu'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white max-w-sm w-full p-6 space-y-4 border border-slate-200 rounded-2xl shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Xóa tàu {deleteTarget.name}?</h3>
            <p className="text-sm text-slate-500">Hành động này không thể hoàn tác. Tàu {deleteTarget.code} sẽ bị gỡ khỏi hệ thống định vị.</p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="btn btn-secondary"
              >
                Hủy
              </button>
              <button
                onClick={confirmDelete}
                className="btn btn-destructive"
              >
                Xóa Tàu
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
