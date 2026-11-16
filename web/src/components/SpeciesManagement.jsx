import React, { useState, useEffect } from 'react';
import {
  Fish,
  Plus,
  Pencil,
  Trash2,
  Search,
  RefreshCw,
  AlertTriangle,
  Check,
  X,
  ExternalLink,
  Layers,
  Image as ImageIcon
} from 'lucide-react';
import { fetchSpecies, createSpecies, updateSpecies, deleteSpecies } from '../api/seafood';

const EMPTY_FORM = {
  name_vi: '',
  name_en: '',
  scientific_name: '',
  description: '',
  image_url: '',
  status: true
};

export default function SpeciesManagement() {
  const [speciesList, setSpeciesList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const data = await fetchSpecies();
      setSpeciesList(data);
    } catch (err) {
      setLoadError(err.message || 'Không thể tải danh sách loài hải sản');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredSpecies = speciesList.filter(item => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = [item.name_vi, item.name_en, item.scientific_name, item.description]
      .some(val => (val || '').toLowerCase().includes(term));
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && item.status) ||
      (statusFilter === 'INACTIVE' && !item.status);
    return matchesSearch && matchesStatus;
  });

  const openAddModal = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setForm({
      name_vi: item.name_vi || '',
      name_en: item.name_en || '',
      scientific_name: item.scientific_name || '',
      description: item.description || '',
      image_url: item.image_url || '',
      status: item.status !== undefined ? Boolean(item.status) : true
    });
    setEditingId(item.id);
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.name_vi.trim()) {
      setFormError('Vui lòng nhập tên tiếng Việt của loài hải sản');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name_vi: form.name_vi.trim(),
        name_en: form.name_en.trim() || null,
        scientific_name: form.scientific_name.trim() || null,
        description: form.description.trim() || null,
        image_url: form.image_url.trim() || null,
        status: Boolean(form.status)
      };

      if (editingId) {
        const updated = await updateSpecies(editingId, payload);
        setSpeciesList(speciesList.map(s => (s.id === editingId ? { ...s, ...updated } : s)));
      } else {
        const created = await createSpecies(payload);
        setSpeciesList([created, ...speciesList]);
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(err.message || 'Lỗi khi lưu thông tin loài hải sản');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (item) => {
    try {
      const nextStatus = !item.status;
      const updated = await updateSpecies(item.id, { status: nextStatus });
      setSpeciesList(speciesList.map(s => (s.id === item.id ? { ...s, ...updated } : s)));
    } catch (err) {
      alert(err.message || 'Không thể đổi trạng thái loài hải sản');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      await deleteSpecies(deleteTarget.id);
      setSpeciesList(speciesList.filter(s => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(
        err.message?.includes('foreign key') || err.message?.includes('tham chiếu')
          ? 'Không thể xóa loài này vì đã có mẻ cá hoặc dữ liệu thị trường liên kết. Bạn có thể chuyển trạng thái sang "Tạm ngưng" thay vì xóa.'
          : (err.message || 'Lỗi khi xóa loài hải sản')
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="page-section space-y-6">
      {/* Tiêu đề & Nút thêm mới */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Fish className="w-6 h-6 text-sky-600" />
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Danh Mục Loài Hải Sản
            </h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Quản lý danh sách các loài thủy hải sản giao dịch, phục vụ nhận diện AI và niêm yết mẻ cá
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="btn btn-secondary btn-sm"
            title="Làm mới"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={openAddModal}
            className="btn btn-primary btn-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Loài Mới</span>
          </button>
        </div>
      </div>

      {/* Bộ lọc & Tìm kiếm */}
      <div className="glass-panel p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên tiếng Việt, tiếng Anh, khoa học..."
            className="input-base pl-9 text-sm w-full"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả ({speciesList.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'ACTIVE'
                  ? 'bg-emerald-500 text-white shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hoạt động ({speciesList.filter(s => s.status).length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('INACTIVE')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'INACTIVE'
                  ? 'bg-amber-500 text-white shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tạm ngưng ({speciesList.filter(s => !s.status).length})
            </button>
          </div>
        </div>
      </div>

      {/* Lỗi tải dữ liệu */}
      {loadError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p>{loadError}</p>
        </div>
      )}

      {/* Bảng danh sách */}
      <div className="glass-panel overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-500" />
            Đang tải dữ liệu danh mục hải sản...
          </div>
        ) : filteredSpecies.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            Không tìm thấy loài hải sản nào phù hợp.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base w-full text-left text-sm">
              <thead className="bg-slate-50/80 text-xs text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Loài Hải Sản</th>
                  <th className="py-3 px-4">Tên Tiếng Anh</th>
                  <th className="py-3 px-4">Tên Khoa Học</th>
                  <th className="py-3 px-4">Mô Tả</th>
                  <th className="py-3 px-4 text-center">Trạng Thái</th>
                  <th className="py-3 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSpecies.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center shrink-0 overflow-hidden">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name_vi}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '';
                              }}
                            />
                          ) : (
                            <Fish className="w-5 h-5 text-sky-500" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{item.name_vi}</div>
                          <div className="text-xs text-slate-400">ID: {item.id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {item.name_en || '—'}
                    </td>
                    <td className="py-3.5 px-4 italic text-slate-500">
                      {item.scientific_name || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate" title={item.description}>
                      {item.description || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(item)}
                        className={`badge-sm cursor-pointer transition-transform active:scale-95 ${
                          item.status ? 'badge-emerald' : 'badge-amber'
                        }`}
                        title="Bấm để đổi trạng thái"
                      >
                        {item.status ? 'Hoạt động' : 'Tạm ngưng'}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteTarget(item);
                            setDeleteError('');
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Xóa loài"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Thêm / Chỉnh Sửa */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Fish className="w-5 h-5 text-sky-600" />
                {editingId ? 'Chỉnh Sửa Loài Hải Sản' : 'Thêm Loài Hải Sản Mới'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên tiếng Việt <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.name_vi}
                  onChange={(e) => setForm({ ...form, name_vi: e.target.value })}
                  placeholder="Ví dụ: Cá ngừ đại dương, Tôm hùm bông..."
                  className="input-base text-sm w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tên tiếng Anh</label>
                  <input
                    type="text"
                    value={form.name_en}
                    onChange={(e) => setForm({ ...form, name_en: e.target.value })}
                    placeholder="Ví dụ: Yellowfin Tuna"
                    className="input-base text-sm w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tên khoa học</label>
                  <input
                    type="text"
                    value={form.scientific_name}
                    onChange={(e) => setForm({ ...form, scientific_name: e.target.value })}
                    placeholder="Ví dụ: Thunnus albacares"
                    className="input-base text-sm w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">URL Ảnh mẫu minh họa</label>
                <input
                  type="url"
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  className="input-base text-sm w-full"
                />
                {form.image_url && (
                  <div className="mt-2 w-16 h-16 rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                    <img
                      src={form.image_url}
                      alt="Xem trước"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '';
                      }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mô tả đặc điểm</label>
                <textarea
                  rows="3"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Mô tả phân loại, giá trị thương mại, tiêu chuẩn độ tươi..."
                  className="input-base text-sm w-full"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="species-status"
                  checked={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.checked })}
                  className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300"
                />
                <label htmlFor="species-status" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Kích hoạt trạng thái hoạt động ngay
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={isSaving}
                  className="btn btn-secondary btn-sm"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn btn-primary btn-sm flex items-center gap-1.5"
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{editingId ? 'Cập Nhật' : 'Thêm Mới'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xác Nhận Xóa */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 mx-auto flex items-center justify-center mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900 text-base">Xác Nhận Xóa Loài?</h4>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Bạn có chắc chắn muốn xóa loài <strong className="text-slate-800">{deleteTarget.name_vi}</strong> không?
            </p>

            {deleteError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-left">
                {deleteError}
              </div>
            )}

            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="btn btn-secondary btn-sm"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="btn btn-destructive btn-sm flex items-center gap-1.5"
              >
                {isDeleting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
