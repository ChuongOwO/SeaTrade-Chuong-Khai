import React, { useState } from 'react';
import { Anchor, ShieldCheck, Zap, LogIn } from 'lucide-react';

const ROLES = [
  {
    id: 'ADMIN',
    label: 'Quản Trị Viên',
    description: 'Giám sát toàn hệ thống, quản lý đơn hàng, đội tàu và thống kê.',
    icon: ShieldCheck,
    defaultTab: 'admin',
    mobileRole: null
  },
  {
    id: 'FISHERMAN',
    label: 'Thuyền Trưởng Tàu Đánh Bắt',
    description: 'Quét AI phân loại hải sản và đăng bán trực tiếp ngoài khơi.',
    icon: Anchor,
    defaultTab: 'mobile',
    mobileRole: 'FISHERMAN'
  },
  {
    id: 'TRADER',
    label: 'Tàu Thu Gom / Thương Lái',
    description: 'Tìm tàu có hàng gần nhất và chốt đơn thu mua.',
    icon: Zap,
    defaultTab: 'mobile',
    mobileRole: 'TRADER'
  }
];

// Màn hình chọn vai trò trước khi vào hệ thống. Đây KHÔNG phải xác thực thật
// (không có mật khẩu/backend kiểm tra) — chỉ để mô phỏng luồng vào ứng dụng
// theo đúng vai trò, tránh giả vờ có bảo mật không tồn tại.
export default function LoginScreen({ onLogin }) {
  const [selectedRole, setSelectedRole] = useState(ROLES[0].id);
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const role = ROLES.find(r => r.id === selectedRole);
    onLogin({
      name: name.trim() || role.label,
      role: role.id,
      roleLabel: role.label,
      defaultTab: role.defaultTab,
      mobileRole: role.mobileRole
    });
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
          <p className="text-sm text-slate-500">Chọn vai trò để vào hệ thống</p>
          <p className="text-xs text-slate-400 italic">Bản demo đồ án tốt nghiệp — chưa có xác thực tài khoản thật</p>
        </div>

        <form onSubmit={handleSubmit} className="stack-v">
          <div className="grid grid-cols-1 gap-3">
            {ROLES.map((role) => {
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

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Tên hiển thị (không bắt buộc)</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Nguyễn Văn Hùng"
              className="input-field w-full"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg w-full"
          >
            <LogIn className="w-4 h-4" /> Vào Hệ Thống
          </button>
        </form>
      </div>
    </div>
  );
}
