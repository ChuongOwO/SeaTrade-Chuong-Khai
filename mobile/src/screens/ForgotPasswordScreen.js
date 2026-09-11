import React, { useState } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { API_AUTH_URL as API_URL } from '../config/api';

export default function ForgotPasswordScreen({ navigation }) {
  const [step, setStep] = useState(1); // 1: phone, 2: otp, 3: password
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading] = useState(false);

  // BƯỚC 1: XIN OTP
  const handleSendOtp = async () => {
    if (!phone || phone.length < 9) {
      Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại hợp lệ.');
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.message || 'Lỗi gửi yêu cầu');
      
      // Ở DEV mode, API sẽ trả về dev_otp để dễ test
      if (data.dev_otp) {
        Alert.alert('Môi trường Test', `Mã OTP của bạn là: ${data.dev_otp}\n\n(Lưu ý: OTP này cũng được in ra ở terminal Node.js)`);
      } else {
        Alert.alert('Thành công', data.message);
      }
      setStep(2); // Chuyển sang bước nhập OTP
    } catch (e) {
      Alert.alert('Lỗi', e.message || 'Không thể kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  // BƯỚC 2: XÁC THỰC OTP
  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert('Lỗi', 'Vui lòng nhập đủ 6 số OTP.');
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/verify-reset-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.message || 'OTP không hợp lệ');

      setResetToken(data.metadata.resetToken);
      Alert.alert('Xác thực thành công', 'Bạn có thể đặt lại mật khẩu mới bây giờ.');
      setStep(3); // Chuyển sang đặt mật khẩu
    } catch (e) {
      Alert.alert('Lỗi xác thực', e.message);
    } finally {
      setLoading(false);
    }
  };

  // BƯỚC 3: ĐẶT MẬT KHẨU MỚI
  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không trùng khớp.');
      return;
    }
    
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, newPassword, confirmPassword })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.message || 'Không thể đặt lại mật khẩu');

      Alert.alert('Thành công', data.message, [
        { text: 'Về Đăng nhập', onPress: () => navigation.navigate('Login') }
      ]);
    } catch (e) {
      Alert.alert('Lỗi', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          
          <TouchableOpacity style={styles.backBtn} onPress={() => step > 1 ? setStep(step - 1) : navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#0f172a" />
          </TouchableOpacity>

          <View style={styles.iconCircle}>
            <Ionicons name={step === 3 ? "lock-closed" : (step === 2 ? "shield-checkmark" : "key")} size={44} color="#ffffff" />
          </View>

          <Text style={styles.title}>
            {step === 1 ? 'Quên mật khẩu?' : (step === 2 ? 'Nhập mã OTP' : 'Mật khẩu mới')}
          </Text>
          <Text style={styles.subtitle}>
            {step === 1 && 'Nhập số điện thoại đã đăng ký. Chúng tôi sẽ gửi mã OTP để đặt lại mật khẩu.'}
            {step === 2 && `Mã OTP gồm 6 chữ số đã được gửi đến số ${phone}.`}
            {step === 3 && 'Vui lòng thiết lập mật khẩu mới cho tài khoản của bạn.'}
          </Text>

          <View style={styles.formContainer}>
            {/* STEP 1 */}
            {step === 1 && (
              <>
                <Text style={styles.label}>Số điện thoại</Text>
                <View style={styles.inputGroup}>
                  <Ionicons name="call-outline" size={20} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Ví dụ: 0912345678"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                    autoCapitalize="none"
                  />
                </View>
                <TouchableOpacity style={[styles.submitBtn, loading && styles.submitBtnDisabled]} onPress={handleSendOtp} disabled={loading}>
                  <Ionicons name="send-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.submitBtnText}>{loading ? 'Đang gửi...' : 'Gửi mã OTP'}</Text>
                </TouchableOpacity>
              </>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <>
                <Text style={styles.label}>Mã OTP 6 chữ số</Text>
                <View style={styles.inputGroup}>
                  <Ionicons name="keypad-outline" size={20} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="123456"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otp}
                    onChangeText={setOtp}
                  />
                </View>
                <TouchableOpacity style={[styles.submitBtn, loading && styles.submitBtnDisabled]} onPress={handleVerifyOtp} disabled={loading}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.submitBtnText}>{loading ? 'Đang xác thực...' : 'Xác thực OTP'}</Text>
                </TouchableOpacity>
              </>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <>
                <Text style={styles.label}>Mật khẩu mới</Text>
                <View style={styles.inputGroup}>
                  <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Mật khẩu mới (tối thiểu 6 ký tự)"
                    secureTextEntry={!showNewPw}
                    value={newPassword}
                    onChangeText={setNewPassword}
                  />
                  <TouchableOpacity onPress={() => setShowNewPw(!showNewPw)}>
                    <Ionicons name={showNewPw ? "eye-off-outline" : "eye-outline"} size={20} color="#64748b" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>Xác nhận mật khẩu</Text>
                <View style={styles.inputGroup}>
                  <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Nhập lại mật khẩu mới"
                    secureTextEntry={!showConfirmPw}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPw(!showConfirmPw)}>
                    <Ionicons name={showConfirmPw ? "eye-off-outline" : "eye-outline"} size={20} color="#64748b" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={[styles.submitBtn, loading && styles.submitBtnDisabled]} onPress={handleResetPassword} disabled={loading}>
                  <Ionicons name="save-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.submitBtnText}>{loading ? 'Đang xử lý...' : 'Đổi mật khẩu'}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { flexGrow: 1, padding: 24, alignItems: 'center' },
  backBtn: { alignSelf: 'flex-start', marginBottom: 24, padding: 4 },
  iconCircle: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: '#0ea5e9',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    shadowColor: '#0ea5e9', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  title: { fontSize: 26, fontWeight: 'bold', color: '#0f172a', marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#64748b', textAlign: 'center', lineHeight: 22, marginBottom: 32, paddingHorizontal: 8 },
  formContainer: {
    backgroundColor: '#ffffff', padding: 24, borderRadius: 24, width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, marginBottom: 20,
  },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  inputGroup: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9',
    borderRadius: 12, marginBottom: 20, paddingHorizontal: 16,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, height: 52, fontSize: 16, color: '#0f172a' },
  submitBtn: {
    backgroundColor: '#0ea5e9', height: 54, borderRadius: 14,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#0ea5e9', shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  submitBtnDisabled: { backgroundColor: '#7dd3fc', elevation: 0 },
  submitBtnText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
});
