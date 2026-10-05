import React, { useState, useEffect } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Anchor,
  Zap,
  Truck,
  Phone,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { fetchVessels, createVessel, updateVessel, deleteVessel } from '../api/vessels';

// Khớp enum vessel_type / vessel_status trong back-end/migrations/V1__init_schema.sql
const VESSEL_TYPES = {
  FISHING: { label: 'Tàu đánh bắt', icon: Anchor, tone: 'bg-sky-100 text-sky-600' },
  COLLECTOR: { label: 'Tàu thu gom', icon: Zap, tone: 'bg-emerald-100 text-emerald-600' },
  TRANSPORT: { label: 'Tàu vận chuyển', icon: Truck, tone: 'bg-amber-100 text-amber-600' }
};

const VESSEL_STATUSES = {
  ACTIVE: { label: 'Đang hoạt động', badge: 'badge-emerald' },
  INACTIVE: { label: 'Ngừng hoạt động', badge: 'badge-rose' },
  OFFLINE: { label: 'Mất kết nối', badge: 'badge-amber' },
  MAINTENANCE: { label: 'Bảo trì', badge: 'badge-cyan' }
};

const EMPTY_FORM = {
  vessel_code: '',
  vessel_name: '',
  vessel_type: 'FISHING',
  status: 'ACTIVE',
  registration_number: '',
  phone: '',
  capacity_kg: '',
  owner_phone: ''
};

// Chỉ gửi những field back-end cho phép (vessel.validation.js) — vessel_code
// và owner_phone chỉ có lúc tạo mới.
function buildPayload(form, isEditing) {
  const payload = {
    vessel_name: form.vessel_name.trim(),
    vessel_type: form.vessel_type,
    status: form.status,
    registration_number: form.registration_number.trim(),
    phone: form.phone.trim(),
    capacity_kg: Number(form.capacity_kg) || 0
  };
  if (isEditing) return payload;

  const ownerPhone = form.owner_phone.trim();
  return {
    ...payload,
    vessel_code: form.vessel_code.trim(),
    ...(ownerPhone && { owner_phone: ownerPhone })
  };
}

export default function FleetManagement() {
  const [vessels, setVessels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const loadVessels = async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      setVessels(await fetchVessels());
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVessels();
  }, []);

  const filteredVessels = vessels.filter(v => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = [v.vessel_code, v.vessel_name, v.owner_name, v.owner_phone]
      .some(field => (field || '').toLowerCase().includes(term));
    const matchesType = typeFilter === 'ALL' || v.vessel_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const updateField = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const openAddForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormError('');
    setFormOpen(true);
  };

  const openEditForm = (vessel) => {
    setForm({
      ...EMPTY_FORM,
      vessel_code: vessel.vessel_code,
      vessel_name: vessel.vessel_name,
      vessel_type: vessel.vessel_type,
      status: vessel.status,
      registration_number: vessel.registration_number || '',
      phone: vessel.phone || '',
      capacity_kg: vessel.capacity_kg ? String(Number(vessel.capacity_kg)) : ''
    });
    setEditingId(vessel.id);
    setFormError('');
    setFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError('');
    try {
      const payload = buildPayload(form, Boolean(editingId));
      if (editingId) await updateVessel(editingId, payload);
      else await createVessel(payload);
      setFormOpen(false);
      await loadVessels();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const openDeleteConfirm = (vessel) => {
    setDeleteError('');
    setDeleteTarget(vessel);
  };

  const confirmDelete = async () => {
    try {
      await deleteVessel(deleteTarget.id);
      setVessels(vessels.filter(v => v.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err.message);
    }
  };

  const renderTableBody = () => {
    if (isLoading) {
      return <tr><td colSpan={6} className="text-center text-slate-500 py-8">Đang tải danh sách tàu...</td></tr>;
    }
    if (loadError) {
      return (
        <tr>
          <td colSpan={6} className="text-center text-rose-600 py-8">
            <AlertTriangle className="w-5 h-5 inline mr-1" /> {loadError}
          </td>
        </tr>
      );
    }
    if (filteredVessels.length === 0) {
      return <tr><td colSpan={6} className="text-center text-slate-500 py-8">Không tìm thấy tàu phù hợp.</td></tr>;
    }
    return filteredVessels.map(renderVesselRow);
  };

  const renderVesselRow = (vessel) => {
    const type = VESSEL_TYPES[vessel.vessel_type] || VESSEL_TYPES.FISHING;
    const status = VESSEL_STATUSES[vessel.status] || { label: vessel.status, badge: 'badge-cyan' };
    const TypeIcon = type.icon;

    return (
      <tr key={vessel.id}>
        <td>
          <div className="flex items-center gap-2">
            <span className={`p-1.5 rounded-lg ${type.tone}`} title={type.label}>
              <TypeIcon className="w-4 h-4" />
            </span>
            <div>
              <div className="font-bold text-slate-900 text-sm">{vessel.vessel_name}</div>
              <div className="text-xs text-slate-500 font-mono">{vessel.vessel_code}</div>
            </div>
          </div>
        </td>
        <td>
          <div className="text-sm text-slate-800">{vessel.owner_name || '—'}</div>
          <div className="text-xs text-slate-500 flex items-center gap-1">
            <Phone className="w-3 h-3" /> {vessel.phone || vessel.owner_phone || '—'}
          </div>
        </td>
        <td className="font-mono text-sm text-slate-700">
          {vessel.capacity_kg ? `${Number(vessel.capacity_kg).toLocaleString('vi-VN')} kg` : '—'}
        </td>
        <td>
          <span className={`badge-sm ${status.badge}`}>{status.label}</span>
        </td>
        <td className="text-xs text-slate-600">
          {vessel.recorded_at ? (
            <>
              <div className="font-mono">{Number(vessel.latitude).toFixed(4)}, {Number(vessel.longitude).toFixed(4)}</div>
              <div className="text-slate-400">{new Date(vessel.recorded_at).toLocaleString('vi-VN')}</div>
            </>
          ) : 'Chưa có GPS'}
        </td>
        <td className="text-right">
          <div className="flex items-center justify-end gap-2">
            <button onClick={() => openEditForm(vessel)} className="btn btn-outline btn-icon" title="Sửa" aria-label={`Sửa tàu ${vessel.vessel_name}`}>
              <Pencil className="w-4 h-4" />
            </button>
            <button onClick={() => openDeleteConfirm(vessel)} className="btn btn-outline-destructive btn-icon" title="Xóa" aria-label={`Xóa tàu ${vessel.vessel_name}`}>
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="page-section">

      <div className="page-header page-header-row">
        <div>
          <h2 className="page-header-title">Quản Lý Đội Tàu</h2>
          <p className="page-header-desc">Thêm mới, chỉnh sửa hoặc gỡ bỏ tàu đánh bắt / tàu thu gom khỏi hệ thống.</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={loadVessels} className="btn btn-outline" disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Tải lại
          </button>
          <button type="button" onClick={openAddForm} className="btn btn-primary">
            <Plus className="w-4 h-4" /> Thêm Tàu Mới
          </button>
        </div>
      </div>

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
                placeholder="Tìm mã tàu, tên tàu, chủ tàu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field input-search w-60"
              />
            </div>

            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input-field">
              <option value="ALL">Tất cả loại tàu</option>
              {Object.entries(VESSEL_TYPES).map(([value, { label }]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left border-collapse data-table">
            <thead>
              <tr>
                <th>Tàu</th>
                <th>Chủ Tàu</th>
                <th>Sức Chứa</th>
                <th>Trạng Thái</th>
                <th>Vị Trí GPS Gần Nhất</th>
                <th className="text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody>{renderTableBody()}</tbody>
          </table>
        </div>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-6">
          <form
            onSubmit={handleSubmit}
            className="bg-white max-w-2xl w-full p-8 space-y-5 relative border border-slate-200 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <button type="button" onClick={() => setFormOpen(false)} className="btn btn-ghost btn-icon absolute right-5 top-5 text-lg" aria-label="Đóng">
              ✕
            </button>

            <h3 className="text-xl font-bold text-slate-900">
              {editingId ? 'Chỉnh Sửa Tàu' : 'Thêm Tàu Mới'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Mã tàu *</label>
                <input
                  required
                  disabled={Boolean(editingId)}
                  value={form.vessel_code}
                  onChange={updateField('vessel_code')}
                  className="input-field w-full disabled:bg-slate-100"
                  placeholder="VD: BV-12345-TS"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Tên tàu *</label>
                <input required value={form.vessel_name} onChange={updateField('vessel_name')} className="input-field w-full" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Loại tàu *</label>
                <select value={form.vessel_type} onChange={updateField('vessel_type')} className="input-field w-full">
                  {Object.entries(VESSEL_TYPES).map(([value, { label }]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Trạng thái</label>
                <select value={form.status} onChange={updateField('status')} className="input-field w-full">
                  {Object.entries(VESSEL_STATUSES).map(([value, { label }]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Số đăng ký</label>
                <input value={form.registration_number} onChange={updateField('registration_number')} className="input-field w-full" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">SĐT liên lạc trên tàu</label>
                <input value={form.phone} onChange={updateField('phone')} className="input-field w-full" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Sức chứa (kg)</label>
                <input type="number" min="0" value={form.capacity_kg} onChange={updateField('capacity_kg')} className="input-field w-full" />
              </div>
              {!editingId && (
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">SĐT tài khoản chủ tàu</label>
                  <input value={form.owner_phone} onChange={updateField('owner_phone')} className="input-field w-full" placeholder="Bỏ trống = gán cho tài khoản admin" />
                </div>
              )}
            </div>

            {formError && (
              <p className="text-sm text-rose-600 flex items-center gap-1.5" role="alert">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {formError}
              </p>
            )}

            <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
              <button type="button" onClick={() => setFormOpen(false)} className="btn btn-secondary">Hủy</button>
              <button type="submit" className="btn btn-primary" disabled={isSaving}>
                {isSaving ? 'Đang lưu...' : editingId ? 'Lưu Thay Đổi' : 'Thêm Tàu'}
              </button>
            </div>
          </form>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white max-w-sm w-full p-6 space-y-4 border border-slate-200 rounded-2xl shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Xóa tàu {deleteTarget.vessel_name}?</h3>
            <p className="text-sm text-slate-500">Hành động này không thể hoàn tác. Tàu {deleteTarget.vessel_code} và lịch sử GPS sẽ bị xóa khỏi hệ thống.</p>
            {deleteError && <p className="text-sm text-rose-600" role="alert">{deleteError}</p>}
            <div className="flex justify-center gap-3 pt-2">
              <button onClick={() => setDeleteTarget(null)} className="btn btn-secondary">Hủy</button>
              <button onClick={confirmDelete} className="btn btn-destructive">Xóa Tàu</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
