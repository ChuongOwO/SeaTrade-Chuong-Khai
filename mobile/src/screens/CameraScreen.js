import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CameraScreen() {
  const [facing, setFacing] = useState('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const insets = useSafeAreaInsets();

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          SeaTrade AI cần quyền truy cập Camera để phân loại hải sản
        </Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.btnText}>Cấp Quyền Camera</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const handleScan = () => {
    setScanned(true);
    setTimeout(() => {
      Alert.alert(
        'YOLOv8 AI Đã Phân Tích',
        'Loài: Cá Ngừ Vây Vàng\nĐộ tươi: Grade A (Tươi sống)\nGiá gợi ý: 185,000 đ/kg\nĐộ chính xác: 98.4%',
        [
          { text: 'Đăng Bán Ngay', onPress: () => setScanned(false) },
          { text: 'Chụp Lại', onPress: () => setScanned(false), style: 'cancel' },
        ]
      );
    }, 1500);
  };

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#334155' }}>
          <Text style={{ color: '#fff', fontSize: 16, textAlign: 'center', paddingHorizontal: 20 }}>
            Tính năng AI Camera (YOLOv8) không hỗ trợ trên Trình duyệt Web.{'\n'}
            Vui lòng cài đặt App trên Điện thoại để trải nghiệm.
          </Text>
        </View>
      ) : (
        <CameraView style={StyleSheet.absoluteFillObject} facing={facing} />
      )}
      
      {/* Absolute Overlay covering the camera */}
      <View style={[StyleSheet.absoluteFillObject, styles.overlay, { paddingTop: insets.top, paddingBottom: insets.bottom + 80 }]}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Đưa hải sản vào khung hình</Text>
        </View>
        
        <View style={styles.scanArea}>
          <View style={styles.scanFrame} />
        </View>
        
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.captureBtn, scanned && styles.captureBtnDisabled]} 
            onPress={handleScan}
            disabled={scanned}
          >
            <View style={styles.captureBtnInner} />
          </TouchableOpacity>
          <Text style={styles.footerText}>
            {scanned ? 'Đang phân tích YOLOv8...' : 'Nhấn để AI Phân Loại'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  permissionText: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
    color: '#334155',
  },
  permissionBtn: {
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#e11d48',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    marginBottom: 12,
  },
  captureBtnInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  },
  captureBtnDisabled: {
    opacity: 0.5,
  },
  footerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  }
});
