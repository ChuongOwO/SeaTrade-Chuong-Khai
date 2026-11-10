import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { confirmPaymentReceived, fetchOrderPayments } from '../api/paymentsApi';
import VnpayCheckoutModal from './VnpayCheckoutModal';

const PAID_LABEL = {
  VNPAY: 'Đã thanh toán qua VNPay',
  BANK_TRANSFER: 'Người bán đã nhận tiền (chuyển khoản)',
  CASH: 'Người bán đã nhận tiền (tiền mặt)',
};

const formatTime = (iso) => new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

/**
 * Trạng thái thanh toán của 1 đơn trong chat:
 *  - Người mua: nút "Thanh toán VNPay" (hoặc trả trực tiếp cho người bán)
 *  - Người bán: nút "Đã nhận tiền" khi người mua trả trực tiếp (QR / tiền mặt)
 * refreshKey đổi -> tải lại (VD: có tin nhắn mới trong chat).
 */
export default function OrderPaymentPanel({ orderId, refreshKey, onPaid }) {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [checkoutVisible, setCheckoutVisible] = useState(false);

  const load = useCallback(async () => {
    try {
      setInfo(await fetchOrderPayments(orderId));
    } catch {
      setInfo(null);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (orderId) load();
  }, [orderId, refreshKey, load]);

  const handleDone = (status) => {
    setCheckoutVisible(false);
    load();
    if (status === 'PAID') onPaid?.();
  };

  const confirmReceived = (method) => {
    setBusy(true);
    confirmPaymentReceived(orderId, method)
      .then(() => {
        load();
        onPaid?.();
      })
      .catch((err) => Alert.alert('Lỗi', err.message || 'Không xác nhận được.'))
      .finally(() => setBusy(false));
  };

  const askConfirmReceived = () => {
    const amount = `${Number(info.total_amount).toLocaleString('vi-VN')}đ`;
    if (info.paid) {
      // Đã trả qua VNPay: người bán chỉ xác nhận, không cần chọn phương thức
      Alert.alert(
        'Xác nhận đã nhận tiền',
        `Người mua đã thanh toán ${amount} qua VNPay. Xác nhận bạn đã nhận được tiền? Tin xác nhận sẽ được gửi vào cuộc trò chuyện.`,
        [
          { text: 'Huỷ', style: 'cancel' },
          { text: 'Xác nhận', onPress: () => confirmReceived() },
        ]
      );
      return;
    }
    Alert.alert(
      'Xác nhận đã nhận tiền',
      `Bạn đã nhận đủ ${amount} từ người mua? Tin xác nhận sẽ được gửi vào cuộc trò chuyện và không thể hoàn tác.`,
      [
        { text: 'Huỷ', style: 'cancel' },
        { text: 'Chuyển khoản', onPress: () => confirmReceived('BANK_TRANSFER') },
        { text: 'Tiền mặt', onPress: () => confirmReceived('CASH') },
      ]
    );
  };

  if (loading) return <ActivityIndicator size="small" color={colors.primary} style={styles.spacing} />;
  if (!info || info.order_status === 'CANCELLED') return null;

  const holdText = info.hold_expires_at && !info.paid
    ? `Mẻ cá được giữ đến ${formatTime(info.hold_expires_at)}`
    : null;

  const confirmButton = info.is_seller && info.can_confirm_received && (
    <TouchableOpacity
      style={[styles.receivedBtn, busy && { opacity: 0.6 }]}
      onPress={askConfirmReceived}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel="Xác nhận đã nhận tiền từ người mua"
    >
      {busy
        ? <ActivityIndicator size="small" color={colors.success} />
        : <Ionicons name="cash-outline" size={16} color={colors.success} />}
      <Text style={styles.receivedBtnText}>{info.paid ? 'Xác nhận đã nhận tiền' : 'Đã nhận tiền'}</Text>
    </TouchableOpacity>
  );

  let content = null;
  if (info.paid) {
    content = (
      <>
        <View style={[styles.badge, styles.badgePaid]}>
          <Ionicons name="shield-checkmark" size={14} color={colors.success} />
          <Text style={[styles.badgeText, { color: colors.success }]}>
            {PAID_LABEL[info.paid_method] || 'Đã thanh toán'}
          </Text>
        </View>
        {info.paid_method === 'VNPAY' && info.seller_confirmed && (
          <View style={[styles.badge, styles.badgePaid]}>
            <Ionicons name="checkmark-done" size={14} color={colors.success} />
            <Text style={[styles.badgeText, { color: colors.success }]}>Người bán đã xác nhận nhận tiền</Text>
          </View>
        )}
        {info.paid_method === 'VNPAY' && !info.seller_confirmed && info.is_buyer && (
          <Text style={styles.hint}>Đang chờ người bán xác nhận đã nhận tiền.</Text>
        )}
        {confirmButton}
      </>
    );
  } else if (info.is_buyer) {
    content = (
      <>
        {info.can_pay && (
          <TouchableOpacity
            style={styles.payBtn}
            onPress={() => setCheckoutVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Thanh toán đơn hàng qua VNPay"
          >
            <Ionicons name="card" size={16} color="#fff" />
            <Text style={styles.payBtnText}>Thanh toán VNPay</Text>
          </TouchableOpacity>
        )}
        {info.purchase_type !== 'BUY_NOW' && (
          <Text style={styles.hint}>Hoặc trả trực tiếp cho người bán (QR / tiền mặt), người bán sẽ xác nhận đã nhận tiền.</Text>
        )}
      </>
    );
  } else if (info.is_seller) {
    content = (
      <>
        <View style={[styles.badge, styles.badgeWaiting]}>
          <Ionicons name="time-outline" size={14} color={colors.warningAccent} />
          <Text style={[styles.badgeText, { color: colors.warningAccent }]}>Chờ người mua thanh toán</Text>
        </View>
        {confirmButton}
      </>
    );
  }

  return (
    <View style={styles.spacing}>
      {content}
      {holdText && <Text style={styles.hint}>{holdText}</Text>}
      {checkoutVisible && (
        <VnpayCheckoutModal visible orderId={orderId} onDone={handleDone} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  spacing: { marginTop: 10, alignItems: 'center', gap: 8, alignSelf: 'stretch' },
  payBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10,
  },
  payBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  receivedBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: colors.success, backgroundColor: '#fff',
    paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10,
  },
  receivedBtnText: { color: colors.success, fontWeight: 'bold', fontSize: 13 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
  },
  badgePaid: { backgroundColor: '#dcfce7' },
  badgeWaiting: { backgroundColor: '#fef3c7' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  hint: { fontSize: 11, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 8 },
});
