import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius } from '../theme';
import { classifySeafoodImage } from '../api/aiApi';

// LƯU Ý: màn hình này TRƯỚC ĐÂY dùng CameraView (expo-camera) để tự vẽ khung
// xem trước (preview) trực tiếp. Trên 1 số iPhone, CameraView bị lỗi hiển thị
// MÀN HÌNH ĐEN dù camera đã bật (đèn camera sáng, quyền đã cấp) — đây là bug
// đã biết của expo-camera liên quan "New Architecture" trên iOS, chưa có bản
// vá ổn định (xem các issue #49760, #31597 trên github.com/expo/expo), và
// KHÔNG thể khắc phục khi chạy qua Expo Go (không tự build lại native code).
//
// Giải pháp: chuyển sang expo-image-picker.launchCameraAsync() — mở thẳng
// app Camera GỐC của điện thoại để chụp (không tự vẽ preview), rồi lấy ảnh
// vừa chụp gửi lên ai-service như cũ. Cách này ổn định tuyệt đối vì không
// phụ thuộc vào việc Expo tự render khung hình camera.
export default function CameraScreen() {
  const [scanning, setScanning] = useState(false);
  const [lastPhotoUri, setLastPhotoUri] = useState(null);

  const handleCapture = async () => {
    if (scanning) return;

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Cần Quyền Camera',
        'SeaTrade AI cần quyền truy cập Camera để chụp và phân loại hải sản. Vui lòng cấp quyền trong phần Cài đặt của điện thoại.'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.5,
      allowsEditing: false,
    });

    // Người dùng bấm Huỷ ở app Camera gốc — không có gì để xử lý tiếp.
    if (result.canceled || !result.assets?.length) return;

    const photo = result.assets[0];
    setLastPhotoUri(photo.uri);
    setScanning(true);
    try {
      const aiResult = await classifySeafoodImage(photo.uri);

      if (!aiResult?.detections?.length) {
        Alert.alert(
          'Không Phát Hiện Hải Sản',
          'AI không tìm thấy hải sản nào rõ ràng trong ảnh. Hãy chụp lại gần hơn và ở nơi đủ sáng.',
          [{ text: 'Đã Hiểu' }]
        );
        return;
      }

      // Ưu tiên hiển thị phát hiện có độ tin cậy cao nhất — nếu ảnh có nhiều
      // con/nhiều loài, tổng số lượng phát hiện được vẫn báo ở dòng riêng.
      const top = aiResult.detections[0];
      const confidencePct = (top.confidence * 100).toFixed(1);
      const priceText = top.estimated_price_per_kg
        ? `${top.estimated_price_per_kg.toLocaleString('vi-VN')} đ/kg`
        : 'Chưa có dữ liệu giá';

      Alert.alert(
        'YOLOv8 AI Đã Phân Tích',
        `Loài: ${top.label_vi}\nSố lượng phát hiện: ${aiResult.count}\nĐộ tin cậy: ${confidencePct}%\nGiá gợi ý: ${priceText}\nThời gian xử lý: ${aiResult.processing_time_ms}ms`,
        [
          { text: 'Đăng Bán Ngay' },
          { text: 'Chụp Lại' },
        ]
      );
    } catch (err) {
      Alert.alert(
        'Lỗi Phân Tích AI',
        err.message || 'Có lỗi xảy ra khi gọi AI Service. Vui lòng thử lại.',
        [{ text: 'Đóng' }]
      );
    } finally {
      setScanning(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quét AI Phân Loại Hải Sản</Text>
        <Text style={styles.headerSub}>
          Chụp ảnh hải sản vừa đánh bắt — YOLOv8 tự động nhận diện loài, đếm số lượng và gợi ý giá bán.
        </Text>
      </View>

      <View style={styles.previewArea}>
        {lastPhotoUri ? (
          <Image source={{ uri: lastPhotoUri }} style={styles.previewImage} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="camera-outline" size={64} color={colors.textFaint} />
            <Text style={styles.placeholderText}>Chưa có ảnh nào được chụp</Text>
          </View>
        )}

        {scanning && (
          <View style={styles.scanningOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.scanningText}>Đang phân tích YOLOv8...</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.captureBtn, scanning && styles.captureBtnDisabled]}
          onPress={handleCapture}
          disabled={scanning}
          accessibilityRole="button"
          accessibilityLabel="Mở camera để chụp và phân loại hải sản bằng AI"
          accessibilityState={{ disabled: scanning, busy: scanning }}
        >
          {scanning ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="camera" size={22} color="#fff" />
          )}
          <Text style={styles.captureBtnText}>
            {scanning ? 'Đang Xử Lý...' : 'Chụp Ảnh & Phân Loại AI'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  headerSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 17,
  },
  previewArea: {
    flex: 1,
    margin: 16,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  placeholderText: {
    color: colors.textFaint,
    fontSize: 13,
  },
  scanningOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  scanningText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  captureBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: radius.md,
  },
  captureBtnDisabled: {
    opacity: 0.6,
  },
  captureBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
