import React, { useState } from 'react';
import { Anchor, ShieldCheck, Zap, LogIn, UserPlus, Loader2, AlertTriangle } from 'lucide-react';
import { registerAccount, loginAccount } from '../api/auth';
import { ApiError } from '../api/client';
import { buildUserFromBackend } from '../api/roleMeta';

// Vai trò chỉ dùng khi ĐĂNG KÝ tài khoản mới (gửi lên field `role` cho backend).
// Khi ĐĂNG NHẬP, vai trò được lấy từ DB thật trả về (xem roleMeta.js), không cho chọn ở đây.
const REGISTER_ROLES = [
  {
    id: 'ADMIN',
    label: 'Quản Trị Viên',
    description: 'Giám sát toàn hệ thống, quản lý đơn hàng, đội tàu và thống kê.',
    icon: ShieldCheck,
  },
  {
    id: 'FISHERMAN',
    label: 'Thuyền Trưởng Tàu Đánh Bắt',
    description: 'Quét AI phân loại hải sản và đăng bán trực tiếp ngoài khơi.',
    icon: Anchor,
  },
  {
    id: 'TRADER',
    label: 'Tàu Thu Gom / Thương Lái',
    description: 'Tìm tàu có hàng gần nhất và chốt đơn thu mua.',
    icon: Zap,
  },
];

// Màn đăng nhập/đăng ký THẬT — gọi POST /api/auth/login và /api/auth/register của
// back-end (back-end/src/modules/auth). Trước đây màn này chỉ là role-picker giả,
// không kiểm tra mật khẩu, không gọi backend gì cả.
export default function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState('LOGIN'); // 'LOGIN' | 'REGISTER'
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState(REGISTER_ROLES[1].id); // mặc định FISHERMAN
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!phone.trim() || !password.trim() || (mode === 'REGISTER' && !fullName.trim())) {
      setErrorMsg('Vui lòng nhập đầy đủ thông tin bắt buộc.');
      return;
    }

    setLoading(true);
    try {
      const backendUser = mode === 'LOGIN'
        ? await loginAccount({ phone: phone.trim(), password })
        : await registerAccount({
            phone: phone.trim(),
            password,
            full_name: fullName.trim(),
            role: selectedRole,
          });

      onLogin(buildUserFromBackend(backendUser));
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        setErrorMsg(err.message);
      } else if (err instanceof ApiError) {
        setErrorMsg(err.message || 'Sai số điện thoại hoặc mật khẩu.');
      } else {
        setErrorMsg('Có lỗi không xác định xảy ra, thử lại sau.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-xl glass-panel stack-v">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 via-cyan-400 to-emerald-400 p-[2px] shadow-lg shadow-sky-500/20 mx-auto">
            <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
              <Anchor className="w-8 h-8 text-sky-600" />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-600">
            SeaTrade AI
          </h1>
          <p className="text-sm text-slate-500">
            {mode === 'LOGIN' ? 'Đăng nhập vào hệ thống' : 'Tạo tài khoản mới'}
          </p>
        </div>

        {/* Chuyển đổi Đăng nhập / Đăng ký */}
        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => { setMode('LOGIN'); setErrorMsg(''); }}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
              mode === 'LOGIN' ? 'bg-white shadow text-sky-600' : 'text-slate-500'
            }`}
          >
            <LogIn className="w-4 h-4" /> Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => { setMode('REGISTER'); setErrorMsg(''); }}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
              mode === 'REGISTER' ? 'bg-white shadow text-sky-600' : 'text-slate-500'
            }`}
          >
            <UserPlus className="w-4 h-4" /> Đăng ký
          </button>
        </div>

        <form onSubmit={handleSubmit} className="stack-v">
          {mode === 'REGISTER' && (
            <div className="grid grid-cols-1 gap-3">
              {REGISTER_ROLES.map((role) => {
                const Icon = role.icon;
                const isSelected = selectedRole === role.id;
                return (
                  <button
                    type="button"
                    key={role.id}
                    onClick={() => setSelectedRole(role.id)}
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

          {mode === 'REGISTER' && (
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Họ và tên</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="VD: Nguyễn Văn Hùng"
                className="input-field w-full"
                required
              />
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Số điện thoại</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="VD: 0912345678"
              className="input-field w-full"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tối thiểu 6 ký tự"
              className="input-field w-full"
              required
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-lg w-full disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Đang xử lý...
              </>
            ) : mode === 'LOGIN' ? (
              <>
                <LogIn className="w-4 h-4" /> Đăng nhập
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" /> Tạo tài khoản & Vào hệ thống
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
