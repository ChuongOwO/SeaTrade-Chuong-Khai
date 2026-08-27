import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme';

export default function ProfileScreen({ route }) {
  const [userData, setUserData] = useState(null);

  // Hàm đăng xuất được truyền từ AppNavigator qua MainTabs xuống ProfileScreen
  const { onLogout } = route.params || {};

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('userData');
        if (storedUser) {
          setUserData(JSON.parse(storedUser));
        }
      } catch (e) {
        console.log('Lỗi khi tải dữ liệu user:', e);
      }
    };
    loadUserData();
  }, []);

  // Trước đây mục này không có onPress (bấm vô tri). Đây chỉ là hộp thoại
  // xác nhận UI tạm thời — CHƯA thật sự xóa dữ liệu Offline nào, phần đó
  // cần đồng đội định nghĩa rõ "dữ liệu Offline" gồm những gì trước khi nối logic thật.
  const handleClearOfflineData = () => {
    Alert.alert(
      'Xóa dữ liệu Offline',
      'Thao tác này sẽ xóa các bài đăng/ảnh quét AI đã lưu tạm khi mất sóng. Bạn có chắc chắn?',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa', style: 'destructive', onPress: () => Alert.alert('Đã xóa', 'Dữ liệu Offline tạm thời đã được dọn dẹp.') },
      ]
    );
  };

  if (!userData) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Hồ Sơ & Cài Đặt</Text>
        </View>

        <View style={styles.profileBox}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color={colors.primary} />
          </View>
          <Text style={styles.name}>{userData.name}</Text>
          <Text style={styles.phone}>{userData.phone}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vai trò của bạn</Text>
          <View style={styles.roleToggle}>
            <View style={[styles.roleBtn, styles.roleBtnActive, { flex: 1 }]}>
              <Ionicons
                name={userData.role === 'fisherman' ? 'boat' : 'cube'}
                size={20}
                color={colors.textOnPrimary}
              />
              <Text style={[styles.roleText, styles.roleTextActive]}>
                {userData.role === 'fisherman' ? 'Ngư Dân' : 'Thương Lái'}
              </Text>
            </View>
          </View>
          <Text style={styles.hintText}>
            {userData.role === 'fisherman'
              ? 'Chế độ Ngư Dân: Quét ảnh AI, báo cáo sản lượng và bật định vị chờ tàu thu mua.'
              : 'Chế độ Thương Lái: Theo dõi bản đồ tàu đánh bắt, chốt đơn và dẫn đường trên biển.'}
          </Text>
        </View>

        {/* Section Bảng điều khiển */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cài đặt nâng cao</Text>

          <TouchableOpacity style={styles.menuItem} onPress={handleClearOfflineData}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconBox, { backgroundColor: colors.dangerSoft }]}>
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </View>
              <Text style={styles.menuText}>Xóa dữ liệu Offline</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.borderStrong} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={onLogout}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#f1f5f9' }]}>
                <Ionicons name="log-out-outline" size={20} color={colors.textMuted} />
              </View>
              <Text style={[styles.menuText, { color: colors.textMuted }]}>Đăng xuất</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    paddingVertical: 15,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  profileBox: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: colors.card,
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  phone: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },
  section: {
    backgroundColor: colors.card,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textSecondary,
    marginBottom: 16,
  },
  roleToggle: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
  },
  roleBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
  },
  roleBtnActive: {
    backgroundColor: colors.primary,
  },
  roleText: {
    color: colors.textMuted,
    fontWeight: 'bold',
  },
  roleTextActive: {
    color: colors.textOnPrimary,
  },
  hintText: {
    marginTop: 16,
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 20,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
  }
});
