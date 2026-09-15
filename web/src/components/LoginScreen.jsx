import React, { useState } from 'react';
import { Anchor, Zap, LogIn, UserPlus, AlertCircle } from 'lucide-react';
import { registerAccount, loginAccount } from '../api/auth';
import { ApiError } from '../api/client';
import { buildUserFromBackend } from '../api/roleMeta';

// RBAC: đăng ký công khai chỉ được tự chọn 2 vai trò tác nghiệp bên dưới —
// KHÔNG có lựa chọn Admin ở đây nữa. Back-end (auth.controller.js) cũng chặn
// tương ứng ở phía server (PUBLIC_REGISTER_ROLES), nên kể cả có ai đó tự gọi
// thẳng API bỏ qua giao diện này cũng không tự phong Admin được. Muốn có tài
// khoản Admin, phải tự đổi cột `role` trực tiếp trong database.
const ROLES = [
  {
    id: 'FISHERMAN',
    label: 'Thuyền Trưởng Tàu Đánh Bắt',
    description: 'Quét AI phân loại hải sản và đăng bán trực tiếp ngoài khơi.',
    icon: Anchor
  },
  {
    id: 'TRADER',
    label: 'Tàu Thu Gom / Thương Lái',
    description: 'Tìm tàu có hàng gần nhất và chốt đơn thu mua.',
    icon: Zap
  }
];

// Màn hình Đăng nhập / Đăng ký — gọi API back-end thật (POST /api/auth/login,
// POST /api/auth/register, xem api/auth.js + api/client.js). Trước bản này,
// màn hình chỉ là 1 role-picker giả lập không gọi API nào (xem lịch sử trong
// api/client.js) dù back-end + lớp gọi API phía web đã sẵn sàng từ trước.
export default function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [selectedRole, setSelectedRole] = useState(ROLES[0].id); // mặc định Thuyền Trưởng
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isRegister = mode === 'register';

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!phone.trim() || !password) {
      setError('Vui lòng nhập số điện thoại và mật khẩu');
      return;
    }
    if (isRegister && !fullName.trim()) {
      setError('Vui lòng nhập họ tên');
      return;
    }
    if (isRegister && password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setLoading(true);
    try {
      const backendUser = isRegister
        ? await registerAccount({
            phone: phone.trim(),
            password,
            full_name: fullName.trim(),
            role: selectedRole
          })
        : await loginAccount({ phone: phone.trim(), password });

      onLogin(buildUserFromBackend(backendUser));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-xl glass-panel stack-v">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 via-cyan-400 to-coral-400 p-[2px] shadow-lg shadow-sky-500/20 mx-auto">
            <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
              <Anchor className="w-8 h-8 text-sky-600" />
            </div>
          </div>
          <h1 className="font-display text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-sky-600 via-cyan-600 to-coral-600">
            SeaTrade AI
          </h1>
          <p className="text-sm text-slate-500">
            {isRegister ? 'Tạo tài khoản để vào hệ thống' : 'Đăng nhập để vào hệ thống'}
          </p>
          <p className="text-xs text-slate-400 italic">Đồ án tốt nghiệp — tài khoản được lưu thật trong cơ sở dữ liệu</p>
        </div>

        {/* Chuyển đổi Đăng nhập / Đăng ký */}
        <div role="tablist" aria-label="Chọn Đăng nhập hoặc Đăng ký" className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100">
          <button
            type="button"
            role="tab"
            aria-selected={!isRegister}
            onClick={() => switchMode('login')}
            className={`py-2 rounded-lg text-sm font-bold transition-all ${!isRegister ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Đăng Nhập
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isRegister}
            onClick={() => switchMode('register')}
            className={`py-2 rounded-lg text-sm font-bold transition-all ${isRegister ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Đăng Ký
          </button>
        </div>

        <form onSubmit={handleSubmit} className="stack-v" noValidate>
          {isRegister && (
            <div className="grid grid-cols-1 gap-3">
              {ROLES.map((role) => {
                const Icon = role.icon;
                const isSelected = selectedRole === role.id;
                return (
                  <button
                    type="button"
                    key={role.id}
                    onClick={() => setSelectedRole(role.id)}
                    aria-pressed={isSelected}
                    className={`w-full p-4 rounded-xl border text-left transition-all flex items-center gap-3 ${
                      isSelected
                        ? 'border-sky-400 bg-sky-50 ring-2 ring-sky-200'
                        : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-sky-200'
                    }`}
                  >
                    <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-900 text-sm">{role.label}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{role.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {isRegister && (
            <div>
              <label htmlFor="full-name" className="text-xs font-bold text-slate-600 block mb-1">Họ và tên</label>
              <input
                id="full-name"
                name="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="VD: Nguyễn Văn Hùng"
                autoComplete="name"
                className="input-field w-full"
              />
            </div>
          )}

          <div>
            <label htmlFor="phone" className="text-xs font-bold text-slate-600 block mb-1">Số điện thoại</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="VD: 0912345678"
              autoComplete="tel"
              className="input-field w-full"
            />
          </div>

          <div>
            <label htmlFor="password" className="text-xs font-bold text-slate-600 block mb-1">Mật khẩu</label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              className="input-field w-full"
            />
          </div>

          {error && (
            <div role="alert" className="flex items-start gap-2 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-lg w-full disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isRegister ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            {loading ? 'Đang xử lý...' : isRegister ? 'Đăng Ký & Vào Hệ Thống' : 'Đăng Nhập'}
          </button>

          <p className="text-center text-xs text-slate-400">
            {isRegister ? (
              <>Đã có tài khoản?{' '}
                <button type="button" onClick={() => switchMode('login')} className="font-bold text-sky-600 hover:underline">
                  Đăng nhập
                </button>
              </>
            ) : (
              <>Chưa có tài khoản?{' '}
                <button type="button" onClick={() => switchMode('register')} className="font-bold text-sky-600 hover:underline">
                  Đăng ký ngay
                </button>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}
