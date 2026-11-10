// Trang VNPay có thể mở app ngân hàng bằng link riêng (xxxbank://...) hoặc intent://
// trên Android. WebView không tự mở được, cần chuyển sang hệ điều hành.

const WEBVIEW_SCHEMES = ['http', 'https', 'about'];
// Không bao giờ chuyển ra ngoài: có thể đọc file trong máy hoặc chạy script.
const BLOCKED_SCHEMES = ['file', 'content', 'javascript', 'data', 'blob'];

const getScheme = (url) => (/^([a-z][a-z0-9+.-]*):/i.exec(url || '')?.[1] || '').toLowerCase();

const isWebUrl = (url) => ['http', 'https'].includes(getScheme(url));

const decode = (value) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

/**
 * Phân loại URL WebView sắp mở.
 * -> { action: 'load' } | { action: 'block' } | { action: 'external', candidates: [url, ...] }
 * candidates xếp theo thứ tự thử: mở app -> trang dự phòng -> trang app trên store.
 */
export function classifyPaymentUrl(url) {
  const scheme = getScheme(url);
  if (WEBVIEW_SCHEMES.includes(scheme)) return { action: 'load' };
  if (!scheme || BLOCKED_SCHEMES.includes(scheme)) return { action: 'block' };
  if (scheme !== 'intent') return { action: 'external', candidates: [url] };

  // intent://host/path#Intent;scheme=abc;package=com.bank;S.browser_fallback_url=...;end
  const hashIndex = url.indexOf('#Intent;');
  const target = (hashIndex >= 0 ? url.slice(0, hashIndex) : url).replace(/^intent:\/\//i, '');
  const options = {};
  if (hashIndex >= 0) {
    url.slice(hashIndex + '#Intent;'.length).split(';').forEach((part) => {
      const eq = part.indexOf('=');
      if (eq > 0) options[part.slice(0, eq)] = part.slice(eq + 1);
    });
  }

  const candidates = [];
  const appScheme = (options.scheme || '').toLowerCase();
  if (appScheme && !WEBVIEW_SCHEMES.includes(appScheme) && !BLOCKED_SCHEMES.includes(appScheme)) {
    candidates.push(`${options.scheme}://${target}`);
  }
  const fallback = decode(options['S.browser_fallback_url'] || '');
  if (isWebUrl(fallback)) candidates.push(fallback);
  if (/^[a-z0-9_.]+$/i.test(options.package || '')) {
    candidates.push(`market://details?id=${options.package}`);
  }
  return candidates.length > 0 ? { action: 'external', candidates } : { action: 'block' };
}
