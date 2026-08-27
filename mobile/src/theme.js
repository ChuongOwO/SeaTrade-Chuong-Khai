// Bảng màu & token dùng chung cho toàn bộ app mobile — đồng bộ với design
// system bên web (index.css: --primary/--success/--warning/--danger).
// Trước đây mỗi màn hình tự khai màu hex riêng (#0ea5e9, #e11d48, #ef4444,
// #dc2626...) không thống nhất — gộp về đây để sửa 1 chỗ, áp dụng toàn app.
// Chỉ là hằng số màu sắc/khoảng cách thuần JS, không đụng logic nghiệp vụ.

export const colors = {
  // Thương hiệu chính — khớp --primary/--primary-deep bên web
  primary: '#0284c7',
  primaryLight: '#0ea5e9',
  primaryDeep: '#075985',
  primarySoft: '#e0f2fe',

  // Trạng thái ngữ nghĩa — khớp --success/--warning/--danger bên web
  success: '#059669',
  successSoft: '#d1fae5',
  warning: '#b45309',
  warningAccent: '#f59e0b',
  warningSoft: '#fef3c7',
  danger: '#e11d48',
  dangerSoft: '#fff1f2',

  // Nền & bề mặt
  background: '#f8fafc',
  card: '#ffffff',
  border: '#e2e8f0',
  borderStrong: '#cbd5e1',
  overlay: 'rgba(0,0,0,0.3)',

  // Chữ
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#64748b',
  textFaint: '#94a3b8',
  textOnPrimary: '#ffffff',
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  floating: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
};

export default { colors, radius, shadow };
