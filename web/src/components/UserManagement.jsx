import React, { useState, useEffect } from 'react';
import { Users, Search, RefreshCw, AlertTriangle, Lock, Unlock } from 'lucide-react';
import { fetchUsers, updateUser } from '../api/admin';

// Khớp enum user_role / user_status trong back-end/migrations/V1__init_schema.sql
const ROLES = {
  FISHERMAN: 'Thuyền trưởng',
  COLLECTOR: 'Tàu thu gom',
  TRADER: 'Thương lái',
  ADMIN: 'Quản trị viên'
};

const STATUSES = {
  ACTIVE: { label: 'Hoạt động', badge: 'badge-emerald' },
  INACTIVE: { label: 'Tạm ngưng', badge: 'badge-amber' },
  BANNED: { label: 'Bị khóa', badge: 'badge-rose' }
};

export default function UserManagement({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ search: '', role: '', status: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const loadUsers = async (activeFilters) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      setUsers(await fetchUsers(activeFilters));
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Lọc ở server; chờ 300ms sau lần gõ cuối để không gọi API mỗi phím
  useEffect(() => {
    const timer = setTimeout(() => loadUsers(filters), 300);
    return () => clearTimeout(timer);
  }, [filters]);

  const updateFilter = (field) => (e) => setFilters({ ...filters, [field]: e.target.value });

  const applyChange = async (user, changes) => {
    setUpdatingId(user.id);
    setErrorMsg('');
    try {
      const updated = await updateUser(user.id, changes);
      setUsers(users.map(u => (u.id === user.id ? { ...u, ...updated } : u)));
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const renderUserRow = (user) => {
    const isSelf = user.id === currentUser?.id;
    const isBusy = updatingId === user.id;
    const status = STATUSES[user.status] || { label: user.status, badge: 'badge-cyan' };
    const isLocked = user.status !== 'ACTIVE';

    return (
      <tr key={user.id}>
        <td>
          <div className="font-bold text-slate-900 text-sm">{user.full_name}{isSelf && <span className="text-xs text-slate-400 font-normal"> (bạn)</span>}</div>
          <div className="text-xs text-slate-500">{user.email || '—'}</div>
        </td>
        <td className="font-mono text-sm text-slate-700">{user.phone}</td>
        <td>
          <select
            value={user.role}
            disabled={isSelf || isBusy}
            onChange={(e) => applyChange(user, { role: e.target.value })}
            className="input-field text-sm"
            aria-label={`Vai trò của ${user.full_name}`}
          >
            {Object.entries(ROLES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </td>
        <td className="font-mono text-sm text-slate-700 text-center">{user.vessel_count}</td>
        <td><span className={`badge-sm ${status.badge}`}>{status.label}</span></td>
        <td className="text-xs text-slate-500">{new Date(user.created_at).toLocaleDateString('vi-VN')}</td>
        <td className="text-right">
          {!isSelf && (
            <button
              onClick={() => applyChange(user, { status: isLocked ? 'ACTIVE' : 'BANNED' })}
              disabled={isBusy}
              className={`btn btn-sm ${isLocked ? 'btn-outline' : 'btn-outline-destructive'}`}
            >
              {isLocked ? <><Unlock className="w-4 h-4" /> Mở khóa</> : <><Lock className="w-4 h-4" /> Khóa</>}
            </button>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="page-section">

      <div className="page-header page-header-row">
        <div>
          <h2 className="page-header-title">Quản Lý Người Dùng</h2>
          <p className="page-header-desc">
            Xem danh sách tài khoản, đổi vai trò và khóa / mở khóa tài khoản.
            Thay đổi vai trò có hiệu lực từ lần đăng nhập kế tiếp của người dùng; tài khoản bị khóa không đăng nhập lại được.
          </p>
        </div>
        <button type="button" onClick={() => loadUsers(filters)} className="btn btn-outline shrink-0" disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Tải lại
        </button>
      </div>

      <div className="glass-panel stack-v">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 section-divider">
          <h3 className="section-title">
            <Users className="w-5 h-5 text-sky-600" /> Danh Sách Tài Khoản ({users.length})
          </h3>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Tìm tên, SĐT, email..."
                value={filters.search}
                onChange={updateFilter('search')}
                className="input-field input-search w-56"
              />
            </div>
            <select value={filters.role} onChange={updateFilter('role')} className="input-field">
              <option value="">Tất cả vai trò</option>
              {Object.entries(ROLES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select value={filters.status} onChange={updateFilter('status')} className="input-field">
              <option value="">Tất cả trạng thái</option>
              {Object.entries(STATUSES).map(([value, { label }]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
        </div>

        {errorMsg && (
          <p className="text-sm text-rose-600 flex items-center gap-1.5" role="alert">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {errorMsg}
          </p>
        )}

        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left border-collapse data-table">
            <thead>
              <tr>
                <th>Họ Tên</th>
                <th>Số Điện Thoại</th>
                <th>Vai Trò</th>
                <th className="text-center">Số Tàu</th>
                <th>Trạng Thái</th>
                <th>Ngày Tạo</th>
                <th className="text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && users.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-slate-500 py-8">Đang tải danh sách người dùng...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-slate-500 py-8">Không tìm thấy tài khoản phù hợp.</td></tr>
              ) : users.map(renderUserRow)}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
