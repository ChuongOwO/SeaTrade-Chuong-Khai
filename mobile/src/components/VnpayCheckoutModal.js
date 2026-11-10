import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, ActivityIndicator, StyleSheet, Platform, Linking, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { API_URL, VNPAY_RETURN_PATH } from '../config/api';
import { createVnpayPayment, fetchPayment } from '../api/paymentsApi';
import { classifyPaymentUrl } from '../utils/externalPaymentLink';

const POLL_INTERVAL_MS = 2000;
const POLL_ATTEMPTS = 8;
const IS_WEB = Platform.OS === 'web'; // react-native-webview không chạy trên web -> mở tab mới

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const formatVND = (n) => Number(n).toLocaleString('vi-VN') + 'đ';
const formatTime = (iso) => (iso ? new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '');

// Không dùng Linking.canOpenURL: Android 11+/iOS trả false với app chưa khai báo trước.
const openFirstAvailable = async (candidates) => {
  for (const url of candidates) {
    try {
      await Linking.openURL(url);
      return;
    } catch {
      // thử link tiếp theo
    }
  }
  Alert.alert('Không mở được ứng dụng ngân hàng', 'Máy chưa cài ứng dụng này. Vui lòng chọn phương thức thanh toán khác.');
};

// Đúng trang Return của back-end (đường dẫn bắt đầu bằng VNPAY_RETURN_PATH) và có kết quả VNPay kèm theo.
// Không dùng includes(): trang trung gian của VNPay có thể chứa Return URL trong query của chính nó.
const isVnpayReturnUrl = (url) => {
  const match = /^https?:\/\/[^/?#]+(\/[^?#]*)(\?[^#]*)?/i.exec(url || '');
  return Boolean(match && match[1] === VNPAY_RETURN_PATH && /[?&]vnp_TxnRef=/.test(match[2] || ''));
};

// Gửi kết quả VNPay về back-end qua địa chỉ API của app (luôn gọi được), thay vì trông vào WebView
// tải trang http:// (iOS có thể chặn). Back-end xử lý idempotent nên gửi trùng với WebView cũng không sao.
const forwardReturnToBackend = async (url) => {
  const query = url.slice(url.indexOf('?'));
  try {
    await fetch(`${API_URL}${VNPAY_RETURN_PATH}${query}`);
  } catch (err) {
    console.warn('[VNPAY] Không gửi được kết quả về back-end:', err.message);
  }
};

/**
 * Luồng thanh toán VNPay cho 1 đơn hàng:
 *  1. Gọi back-end tạo link (số tiền back-end tự lấy từ DB)
 *  2. Mở trang VNPay trong WebView
 *  3. VNPay chuyển về Return URL -> đóng WebView
 *  4. Hỏi back-end trạng thái thật (IPN là nguồn xác nhận chính) cho tới khi khác PENDING
 *
 * onDone(status) được gọi khi đóng modal: 'PAID' | 'FAILED' | 'PENDING' | null
 */
export default function VnpayCheckoutModal({ visible, orderId, onDone }) {
  const [phase, setPhase] = useState('creating'); // creating | paying | external | checking | result | error
  const [payment, setPayment] = useState(null);
  const [status, setStatus] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [closedByUser, setClosedByUser] = useState(false); // tự bấm ✕ trước khi VNPay chuyển về
  const returnedRef = useRef(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  const start = useCallback(async () => {
    returnedRef.current = false;
    setClosedByUser(false);
    setPhase('creating');
    setStatus(null);
    setErrorMsg('');
    try {
      const data = await createVnpayPayment(orderId);
      if (!aliveRef.current) return;
      setPayment(data);
      if (IS_WEB) {
        await Linking.openURL(data.payment_url);
        setPhase('external');
      } else {
        setPhase('paying');
      }
    } catch (err) {
      if (!aliveRef.current) return;
      setErrorMsg(err.message || 'Không tạo được liên kết thanh toán.');
      setPhase('error');
    }
  }, [orderId]);

  useEffect(() => {
    if (visible && orderId) start();
  }, [visible, orderId, start]);

  const checkStatus = useCallback(async (paymentId) => {
    setPhase('checking');
    let last = null;
    for (let i = 0; i < POLL_ATTEMPTS; i += 1) {
      try {
        last = await fetchPayment(paymentId);
        if (last.status !== 'PENDING') break;
      } catch (err) {
        last = null;
      }
      if (!aliveRef.current) return;
      await sleep(POLL_INTERVAL_MS);
    }
    if (!aliveRef.current) return;
    setStatus(last?.status || 'PENDING');
    setPhase('result');
  }, []);

  // VNPay chuyển về Return URL -> chặn WebView, tự gửi kết quả về back-end rồi hỏi trạng thái.
  const finishFromReturn = async (url) => {
    if (returnedRef.current) return;
    returnedRef.current = true;
    setClosedByUser(false);
    setPhase('checking');
    await forwardReturnToBackend(url);
    checkStatus(payment.payment_id);
  };

  const handleShouldStartLoad = ({ url }) => {
    if (__DEV__) console.log('[VNPAY] WebView ->', url);
    if (isVnpayReturnUrl(url)) {
      finishFromReturn(url);
      return false;
    }
    const result = classifyPaymentUrl(url);
    if (result.action === 'external') openFirstAvailable(result.candidates);
    return result.action === 'load';
  };

  // Dự phòng: nền tảng nào không gọi onShouldStartLoadWithRequest cho lượt chuyển hướng.
  const handleNavigation = (nav) => {
    if (isVnpayReturnUrl(nav.url)) finishFromReturn(nav.url);
  };

  const close = () => onDone?.(status);

  // Người dùng đóng WebView giữa chừng: vẫn hỏi lại trạng thái (có thể đã trả xong trước khi đóng)
  const cancelPaying = () => {
    if (payment && (phase === 'paying' || phase === 'external')) {
      returnedRef.current = true;
      setClosedByUser(true);
      checkStatus(payment.payment_id);
    } else {
      close();
    }
  };

  const renderResult = () => {
    const ui = {
      PAID: { icon: 'checkmark-circle', color: colors.success, title: 'Thanh toán thành công', sub: 'Người bán đã được thông báo để chuẩn bị giao hàng.' },
      FAILED: { icon: 'close-circle', color: colors.danger, title: 'Thanh toán không thành công', sub: 'Giao dịch bị huỷ hoặc lỗi. Bạn có thể thanh toán lại.' },
      PENDING: closedByUser
        ? { icon: 'alert-circle', color: colors.warningAccent, title: 'Chưa hoàn tất thanh toán', sub: `Bạn đã đóng trang VNPay trước khi thanh toán xong. Link còn hiệu lực đến ${formatTime(payment?.expires_at)}.` }
        : { icon: 'time', color: colors.warningAccent, title: 'Chưa nhận được xác nhận', sub: 'Nếu bạn đã trả tiền, VNPay sẽ xác nhận trong ít phút. Bấm "Kiểm tra lại" sau.' },
    }[status] || {};
    return (
      <View style={styles.center}>
        <Ionicons name={ui.icon} size={64} color={ui.color} />
        <Text style={styles.title}>{ui.title}</Text>
        {payment ? <Text style={styles.amount}>{formatVND(payment.amount)}</Text> : null}
        <Text style={styles.sub}>{ui.sub}</Text>
        <View style={styles.actions}>
          {status === 'FAILED' && (
            <TouchableOpacity style={styles.btnPrimary} onPress={start}>
              <Text style={styles.btnPrimaryText}>Thanh toán lại</Text>
            </TouchableOpacity>
          )}
          {status === 'PENDING' && closedByUser && (
            <TouchableOpacity style={styles.btnPrimary} onPress={start}>
              <Text style={styles.btnPrimaryText}>Tiếp tục thanh toán</Text>
            </TouchableOpacity>
          )}
          {status === 'PENDING' && !closedByUser && (
            <TouchableOpacity style={styles.btnPrimary} onPress={() => checkStatus(payment.payment_id)}>
              <Text style={styles.btnPrimaryText}>Kiểm tra lại</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.btnGhost} onPress={close}>
            <Text style={styles.btnGhostText}>Đóng</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={cancelPaying}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={cancelPaying} style={styles.headerBtn} accessibilityRole="button" accessibilityLabel="Đóng thanh toán">
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Thanh toán VNPay</Text>
          <View style={styles.headerBtn} />
        </View>

        {phase === 'creating' && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.sub}>Đang tạo liên kết thanh toán...</Text>
          </View>
        )}

        {phase === 'paying' && payment && (
          <WebView
            source={{ uri: payment.payment_url }}
            originWhitelist={['*']}
            setSupportMultipleWindows={false}
            onShouldStartLoadWithRequest={handleShouldStartLoad}
            onNavigationStateChange={handleNavigation}
            startInLoadingState
            renderLoading={() => (
              <View style={[styles.center, StyleSheet.absoluteFill]}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            )}
          />
        )}

        {phase === 'external' && (
          <View style={styles.center}>
            <Ionicons name="open-outline" size={48} color={colors.primary} />
            <Text style={styles.title}>Đã mở trang VNPay</Text>
            <Text style={styles.sub}>Hoàn tất thanh toán ở tab mới rồi quay lại đây.</Text>
            <TouchableOpacity style={styles.btnPrimary} onPress={() => checkStatus(payment.payment_id)}>
              <Text style={styles.btnPrimaryText}>Tôi đã thanh toán xong</Text>
            </TouchableOpacity>
          </View>
        )}

        {phase === 'checking' && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.sub}>Đang kiểm tra kết quả thanh toán...</Text>
          </View>
        )}

        {phase === 'result' && renderResult()}

        {phase === 'error' && (
          <View style={styles.center}>
            <Ionicons name="warning" size={56} color={colors.danger} />
            <Text style={styles.title}>Không thể thanh toán</Text>
            <Text style={styles.sub}>{errorMsg}</Text>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.btnPrimary} onPress={start}>
                <Text style={styles.btnPrimaryText}>Thử lại</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnGhost} onPress={close}>
                <Text style={styles.btnGhostText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 10,
    backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerBtn: { width: 40, alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  title: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, textAlign: 'center' },
  amount: { fontSize: 22, fontWeight: 'bold', color: colors.primary },
  sub: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  btnPrimary: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  btnPrimaryText: { color: '#fff', fontWeight: 'bold' },
  btnGhost: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  btnGhostText: { color: colors.textPrimary, fontWeight: '600' },
});
