import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RegisterScreen({ navigation, route }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('fisherman'); // fisherman or trader
  
  const { onLogin } = route.params;

  const handleRegister = async () => {
    if (!name || !phone || !password) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin.');
      return;
    }

    try {
      // Gọi API Đăng ký đến Backend Server
      const response = await fetch('http://172.16.240.188:5000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, password, role })
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Đăng ký thất bại', data.error || 'Có lỗi xảy ra.');
        return;
      }

      const { token, user } = data;

      // Lưu thông tin vĩnh viễn vào thiết bị
      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userData', JSON.stringify(user));
      
      Alert.alert(
        'Thành công', 
        'Đăng ký tài khoản thành công! Tự động đăng nhập...',
        [{ text: 'OK', onPress: () => onLogin(token) }]
      );
    } catch (e) {
      Alert.alert('Lỗi hệ thống', 'Không thể kết nối đến máy chủ. ' + e.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Tạo Tài Khoản</Text>
          <Text style={styles.subtitle}>Gia nhập cộng đồng khai thác hải sản Nam Bộ</Text>

          <View style={styles.formContainer}>
            {/* Chọn Role */}
            <Text style={styles.sectionTitle}>Bạn là ai?</Text>
            <View style={styles.roleContainer}>
              <TouchableOpacity 
                style={[styles.roleCard, role === 'fisherman' && styles.roleCardActive]}
                onPress={() => setRole('fisherman')}
              >
                <Ionicons name="boat-outline" size={32} color={role === 'fisherman' ? "#0ea5e9" : "#64748b"} />
                <Text style={[styles.roleText, role === 'fisherman' && styles.roleTextActive]}>Ngư Dân</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.roleCard, role === 'trader' && styles.roleCardActive]}
                onPress={() => setRole('trader')}
              >
                <Ionicons name="cart-outline" size={32} color={role === 'trader' ? "#0ea5e9" : "#64748b"} />
                <Text style={[styles.roleText, role === 'trader' && styles.roleTextActive]}>Thương Lái</Text>
              </TouchableOpacity>
            </View>

            {/* Inputs */}
            <View style={styles.inputGroup}>
              <Ionicons name="person-outline" size={20} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Họ và tên / Chủ tàu"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Ionicons name="call-outline" size={20} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Số điện thoại di động"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            <View style={styles.inputGroup}>
              <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Mật khẩu"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <TouchableOpacity style={styles.registerBtn} onPress={handleRegister}>
              <Text style={styles.registerBtnText}>XÁC NHẬN ĐĂNG KÝ</Text>
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
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 32,
  },
  formContainer: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: 12,
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  roleCard: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#f1f5f9',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 5,
    backgroundColor: '#f8fafc',
  },
  roleCardActive: {
    borderColor: '#0ea5e9',
    backgroundColor: '#f0f9ff',
  },
  roleText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  roleTextActive: {
    color: '#0ea5e9',
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
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
    color: '#0f172a',
  },
  registerBtn: {
    backgroundColor: '#0ea5e9',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  registerBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  }
});
