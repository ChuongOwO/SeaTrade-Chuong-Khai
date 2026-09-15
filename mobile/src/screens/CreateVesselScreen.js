import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';
import { useTheme } from '../context/ThemeContext';

export default function CreateVesselScreen({ navigation }) {
  const { colors, isDarkMode } = useTheme();
  
  const [vesselName, setVesselName] = useState('');
  const [vesselCode, setVesselCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegisterVessel = async () => {
    if (!vesselName || !vesselCode) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ Tên tàu và Biển số.');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Lỗi', 'Không tìm thấy token đăng nhập.');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/vessels`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          vessel_name: vesselName, 
          vessel_code: vesselCode, 
          vessel_type: 'FISHING' // Mặc định cho ngư dân
        })
      });

      const data = await response.json();

      if (!response.ok || data.status !== 201) {
        Alert.alert('Đăng ký thất bại', data.message || 'Có lỗi xảy ra.');
        setLoading(false);
        return;
      }

      Alert.alert(
        'Thành công',
        'Đăng ký tàu thành công! Chào mừng bạn gia nhập cộng đồng.',
        [{ text: 'Vào Trang Chủ', onPress: () => navigation.navigate('MainTabs') }]
      );
    } catch (e) {
      Alert.alert('Lỗi hệ thống', 'Không thể kết nối đến máy chủ. ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigation.navigate('MainTabs');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="boat" size={48} color="#fff" />
            </View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Đăng Ký Tàu</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Thêm thông tin tàu của bạn để bắt đầu tham gia giao thương và dẫn đường trên biển.
            </Text>
          </View>

          <View style={[styles.formContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.inputGroup, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}>
              <Ionicons name="pricetag-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="Tên tàu (VD: Tàu Cá Nghệ An)"
                placeholderTextColor={colors.textMuted}
                value={vesselName}
                onChangeText={setVesselName}
                autoCapitalize="words"
              />
            </View>

            <View style={[styles.inputGroup, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}>
              <Ionicons name="barcode-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="Biển số tàu (Mã tàu) (VD: NA-12345)"
                placeholderTextColor={colors.textMuted}
                value={vesselCode}
                onChangeText={setVesselCode}
                autoCapitalize="characters"
              />
            </View>

            <View style={[styles.inputGroup, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', opacity: 0.7 }]}>
              <Ionicons name="water-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                value="Loại tàu: Tàu Đánh Cá"
                editable={false}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled, { backgroundColor: colors.primary }]}
              onPress={handleRegisterVessel}
              disabled={loading}
            >
              <Text style={styles.submitBtnText}>{loading ? 'ĐANG XỬ LÝ...' : 'ĐĂNG KÝ TÀU'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
              <Text style={[styles.skipBtnText, { color: colors.textFaint }]}>Bỏ qua, vào trang chủ</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0ea5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  formContainer: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 3,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 16,
  },
  submitBtn: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  skipBtn: {
    marginTop: 24,
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipBtnText: {
    fontSize: 14,
    fontWeight: '600',
  }
});
