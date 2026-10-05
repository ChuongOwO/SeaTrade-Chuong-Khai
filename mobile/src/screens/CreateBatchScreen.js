import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, View, Text, TextInput, TouchableOpacity, 
  KeyboardAvoidingView, Platform, Alert, ScrollView, Image, ActivityIndicator, Modal 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';
import { useTheme } from '../context/ThemeContext';
import { publishBatchFromScan } from '../api/batchApi';

// So khớp tên loài AI trả về (species_group) với name_vi trong DB — chuẩn hoá
// Unicode vì chuỗi tiếng Việt có thể ở dạng dựng sẵn hoặc tổ hợp dấu.
const normalizeName = (name) => (name || '').normalize('NFC').trim().toLowerCase();

export default function CreateBatchScreen({ navigation, route }) {
  const { colors, isDarkMode } = useTheme();

  // Có scan = mở từ màn Quét AI (CameraScreen) -> điền sẵn ảnh, loài, giá
  const scan = route?.params?.scan;
  const detection = scan?.detection;

  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  const [vesselId, setVesselId] = useState(null);
  const [vesselLocation, setVesselLocation] = useState(null);
  const [speciesList, setSpeciesList] = useState([]);

  // Form State
  const [selectedSpecies, setSelectedSpecies] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [qualityLevel, setQualityLevel] = useState('GOOD');
  const [price, setPrice] = useState(
    detection?.estimated_price_per_kg ? String(detection.estimated_price_per_kg) : ''
  );
  const [isSpeciesFromAi, setIsSpeciesFromAi] = useState(false);
  
  // Modals
  const [showSpeciesModal, setShowSpeciesModal] = useState(false);
  const [showQualityModal, setShowQualityModal] = useState(false);

  const DUMMY_IMAGE = 'https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?auto=format&fit=crop&w=800&q=80'; // Ảnh cá ngừ dummy

  useEffect(() => {
    const initData = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) {
          Alert.alert('Lỗi', 'Không tìm thấy token đăng nhập.');
          navigation.goBack();
          return;
        }

        // 1. Fetch Vessel ID
        const vesselRes = await fetch(`${API_URL}/api/vessels/my-vessel`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const vesselData = await vesselRes.json();
        
        if (vesselRes.status === 404 || !vesselData.metadata) {
          Alert.alert('Lỗi', 'Bạn chưa đăng ký tàu. Vui lòng đăng ký tàu trước khi đăng bán.');
          navigation.goBack();
          return;
        }
        setVesselId(vesselData.metadata.vessel_id);
        // Vị trí GPS mới nhất của tàu = nơi đánh bắt mẻ cá đang đăng
        if (vesselData.metadata.latitude != null) {
          setVesselLocation({
            latitude: Number(vesselData.metadata.latitude),
            longitude: Number(vesselData.metadata.longitude),
          });
        }

        // 2. Fetch Species List
        const speciesRes = await fetch(`${API_URL}/api/seafood/species`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const speciesData = await speciesRes.json();
        if (speciesRes.ok && speciesData.metadata) {
          setSpeciesList(speciesData.metadata);
          if (scan) {
            // Chọn sẵn loài AI nhận diện; không khớp loài nào trong danh mục
            // thì để trống, bắt người dùng tự chọn thay vì gán bừa loài đầu tiên
            const aiSpecies = speciesData.metadata.find(
              (s) => normalizeName(s.name_vi) === normalizeName(detection?.species_group)
            );
            setSelectedSpecies(aiSpecies || null);
            setIsSpeciesFromAi(Boolean(aiSpecies));
          } else if (speciesData.metadata.length > 0) {
            setSelectedSpecies(speciesData.metadata[0]);
          }
        }
      } catch (e) {
        Alert.alert('Lỗi', 'Không thể kết nối máy chủ.');
      } finally {
        setInitializing(false);
      }
    };

    initData();
  }, []);

  const handleSubmit = async () => {
    if (!selectedSpecies) {
      Alert.alert('Lỗi', 'Vui lòng chọn loại hải sản.');
      return;
    }
    if (!quantity || isNaN(quantity) || Number(quantity) <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số lượng (kg) hợp lệ.');
      return;
    }

    if (scan) {
      await submitFromScan();
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const payload = {
        vessel_id: vesselId,
        species_id: selectedSpecies.id,
        quantity_kg: Number(quantity),
        quality_level: qualityLevel,
        status: 'AVAILABLE'
      };

      const response = await fetch(`${API_URL}/api/seafood/batches`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        const errorDetail = data.error ? `\n\nChi tiết: ${data.error.join(', ')}` : '';
        Alert.alert('Lỗi', (data.message || 'Đăng bán thất bại.') + errorDetail);
        setLoading(false);
        return;
      }

      Alert.alert(
        'Thành công',
        'Mẻ cá của bạn đã được đưa lên Chợ hải sản!',
        [{ text: 'Về trang trước', onPress: () => navigation.goBack() }]
      );
    } catch (e) {
      Alert.alert('Lỗi hệ thống', e.message);
    } finally {
      setLoading(false);
    }
  };

  // Đăng kèm ảnh quét + kết quả AI + giá bán (POST /api/seafood/batches/from-scan)
  const submitFromScan = async () => {
    if (!price || isNaN(price) || Number(price) <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập giá bán (đ/kg) hợp lệ.');
      return;
    }

    setLoading(true);
    try {
      await publishBatchFromScan(scan.photoUri, {
        vessel_id: vesselId,
        species_id: selectedSpecies.id,
        quantity_kg: Number(quantity),
        price_per_kg: Number(price),
        quality_level: qualityLevel,
        latitude: vesselLocation?.latitude,
        longitude: vesselLocation?.longitude,
        ai_model_version: scan.modelVersion,
        ai_confidence: detection?.confidence,
        ai_x1: detection?.box?.x1,
        ai_y1: detection?.box?.y1,
        ai_x2: detection?.box?.x2,
        ai_y2: detection?.box?.y2,
      });
      Alert.alert(
        'Đã Đăng Lên Chợ',
        `${selectedSpecies.name_vi} ${quantity} kg — ${Number(price).toLocaleString('vi-VN')} đ/kg đã hiển thị trên Chợ hải sản.`,
        [{ text: 'Xem Chợ', onPress: () => navigation.navigate('MainTabs', { screen: 'Market' }) }]
      );
    } catch (e) {
      Alert.alert('Đăng Bán Thất Bại', e.message);
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 10, color: colors.textSecondary }}>Đang tải dữ liệu...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Đăng Bán Mẻ Cá</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          
          {scan ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: scan.photoUri }} style={styles.scanImage} />
              <View style={[styles.aiBadge, scan.needsReview && styles.aiBadgeWarning]}>
                <Ionicons name={scan.needsReview ? 'alert-circle' : 'sparkles'} size={14} color="#fff" />
                <Text style={styles.aiBadgeText}>
                  AI: {detection?.label_vi} • {(detection?.confidence * 100).toFixed(0)}%
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.imageContainer}>
              <Image source={{ uri: DUMMY_IMAGE }} style={styles.mainImage} />
              <View style={styles.imageOverlay}>
                <Ionicons name="camera" size={32} color="#fff" />
                <Text style={styles.imageOverlayText}>Dùng tab Quét AI để đăng bán kèm ảnh thật</Text>
              </View>
            </View>
          )}

          {scan && (scan.needsReview || !isSpeciesFromAi) && (
            <View style={[styles.hintBox, { borderColor: colors.warningAccent || '#f59e0b' }]}>
              <Ionicons name="information-circle-outline" size={18} color={colors.warningAccent || '#f59e0b'} />
              <Text style={[styles.hintText, { color: colors.textPrimary }]}>
                {!isSpeciesFromAi
                  ? `"${detection?.label_vi}" chưa có trong danh mục loài — vui lòng chọn loài phù hợp.`
                  : 'AI chưa chắc chắn về kết quả — hãy kiểm tra lại loài trước khi đăng.'}
              </Text>
            </View>
          )}

          <View style={[styles.formContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            
            {/* Chọn Loại Hải Sản */}
            <Text style={[styles.label, { color: colors.textPrimary }]}>Loài hải sản (Bắt buộc)</Text>
            <TouchableOpacity 
              style={[styles.inputGroup, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}
              onPress={() => setShowSpeciesModal(true)}
            >
              <Ionicons name="fish-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <Text style={[styles.inputText, { color: selectedSpecies ? colors.textPrimary : colors.textMuted }]}>
                {selectedSpecies ? selectedSpecies.name_vi : 'Chọn loài hải sản...'}
                {isSpeciesFromAi && <Text style={{ color: colors.primary, fontSize: 13 }}>  ✓ AI nhận diện</Text>}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
            </TouchableOpacity>

            {/* Nhập số lượng */}
            <Text style={[styles.label, { color: colors.textPrimary }]}>Số lượng (Kg)</Text>
            <View style={[styles.inputGroup, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}>
              <Ionicons name="scale-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="Ví dụ: 50"
                placeholderTextColor={colors.textMuted}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
              />
              <Text style={{ color: colors.textMuted, fontWeight: 'bold' }}>KG</Text>
            </View>

            {/* Giá bán — điền sẵn giá gợi ý của AI, người bán sửa lại được */}
            {scan && (
              <>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Giá bán (đ/kg)</Text>
                <View style={[styles.inputGroup, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}>
                  <Ionicons name="pricetag-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary }]}
                    placeholder="Ví dụ: 190000"
                    placeholderTextColor={colors.textMuted}
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="numeric"
                  />
                  <Text style={{ color: colors.textMuted, fontWeight: 'bold' }}>đ/kg</Text>
                </View>
              </>
            )}

            {/* Chọn Chất lượng */}
            <Text style={[styles.label, { color: colors.textPrimary }]}>Chất lượng (Đánh giá sơ bộ)</Text>
            <TouchableOpacity 
              style={[styles.inputGroup, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}
              onPress={() => setShowQualityModal(true)}
            >
              <Ionicons name="star-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <Text style={[styles.inputText, { color: colors.textPrimary }]}>
                {qualityLevel === 'PREMIUM' ? 'Loại 1 (Tuyệt hảo)' : 
                 qualityLevel === 'GOOD' ? 'Loại 2 (Tốt)' : 
                 qualityLevel === 'NORMAL' ? 'Loại 3 (Trung bình)' : 'Loại 4 (Kém)'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled, { backgroundColor: colors.primary }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Ionicons name="cloud-upload-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.submitBtnText}>{loading ? 'ĐANG TẢI LÊN...' : 'ĐĂNG LÊN CHỢ'}</Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal Chọn Loài Cá */}
      <Modal visible={showSpeciesModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Chọn Loài Hải Sản</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {speciesList.map((species) => (
                <TouchableOpacity 
                  key={species.id} 
                  style={[styles.modalItem, { borderBottomColor: colors.border }]}
                  onPress={() => { setSelectedSpecies(species); setShowSpeciesModal(false); }}
                >
                  <Text style={[styles.modalItemText, { color: colors.textPrimary }]}>{species.name_vi}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowSpeciesModal(false)}>
              <Text style={[styles.modalCancelText, { color: colors.error }]}>Hủy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Chọn Chất lượng */}
      <Modal visible={showQualityModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Chọn Chất Lượng</Text>
            
            {['PREMIUM', 'GOOD', 'NORMAL', 'LOW'].map((lvl) => (
              <TouchableOpacity 
                key={lvl} 
                style={[styles.modalItem, { borderBottomColor: colors.border }]}
                onPress={() => { setQualityLevel(lvl); setShowQualityModal(false); }}
              >
                <Text style={[styles.modalItemText, { color: colors.textPrimary }]}>
                  {lvl === 'PREMIUM' ? 'Loại 1 (Tuyệt hảo)' : lvl === 'GOOD' ? 'Loại 2 (Tốt)' : lvl === 'NORMAL' ? 'Loại 3 (Trung bình)' : 'Loại 4 (Kém)'}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowQualityModal(false)}>
              <Text style={[styles.modalCancelText, { color: colors.error }]}>Hủy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  scrollContainer: { padding: 16 },
  imageContainer: {
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: '#000'
  },
  mainImage: { width: '100%', height: '100%', opacity: 0.6 },
  imageOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageOverlayText: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginTop: 8 },
  scanImage: { width: '100%', height: '100%' },
  aiBadge: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(5, 150, 105, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  aiBadgeWarning: { backgroundColor: 'rgba(217, 119, 6, 0.92)' },
  aiBadgeText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  hintText: { flex: 1, fontSize: 13, lineHeight: 18 },
  formContainer: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8,
  },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 52,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, height: '100%', fontSize: 16 },
  inputText: { flex: 1, fontSize: 16 },
  submitBtn: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  modalItem: { paddingVertical: 16, borderBottomWidth: 1 },
  modalItemText: { fontSize: 16, textAlign: 'center' },
  modalCancelBtn: { marginTop: 16, paddingVertical: 16, alignItems: 'center' },
  modalCancelText: { fontSize: 16, fontWeight: 'bold' }
});
