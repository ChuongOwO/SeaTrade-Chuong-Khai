import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Switch, Alert, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { API_AVATAR_URL } from '../config/api';

export default function ProfileScreen() {
  const [userData, setUserData] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Dùng handleLogout từ AuthContext của nhánh HEAD
  const { handleLogout } = useAuth();
  const { isDarkMode, toggleTheme, colors } = useTheme();

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

  // Hàm chọn và upload ảnh (từ nhánh HEAD)
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Cần quyền truy cập', 'Vui lòng cấp quyền truy cập thư viện ảnh để đổi Avatar.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      uploadAvatar(result.assets[0]);
    }
  };

  const uploadAvatar = async (asset) => {
    try {
      setUploading(true);
      const token = await AsyncStorage.getItem('userToken');
      const uri = Platform.OS === 'ios' ? asset.uri.replace('file://', '') : asset.uri;

      const uploadResult = await FileSystem.uploadAsync(API_AVATAR_URL, uri, {
        httpMethod: 'POST',
        uploadType: 1, // 1 = MULTIPART
        fieldName: 'avatar',
        mimeType: asset.mimeType || 'image/jpeg',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = JSON.parse(uploadResult.body);
      if (uploadResult.status !== 200) throw new Error(data.message || 'Lỗi upload ảnh');

      const updatedUser = { ...userData, avatar_url: data.metadata.avatar_url };
      setUserData(updatedUser);
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));

      Alert.alert('Thành công', 'Đã cập nhật ảnh đại diện');
    } catch (error) {
      Alert.alert('Lỗi upload', `${error.message}\nURL: ${API_AVATAR_URL}`);
    } finally {
      setUploading(false);
    }
  };

  // Hàm xử lý xóa dữ liệu Offline (từ nhánh duy-khai)
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
      <SafeAreaView style={[{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const dynamicStyles = getDynamicStyles(colors);

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={dynamicStyles.header}>
          <Text style={dynamicStyles.headerTitle}>Hồ Sơ & Cài Đặt</Text>
        </View>

        <View style={dynamicStyles.profileBox}>
          <TouchableOpacity style={dynamicStyles.avatarContainer} onPress={pickImage} disabled={uploading}>
            <View style={dynamicStyles.avatar}>
              {uploading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : userData.avatar_url ? (
                <Image source={{ uri: userData.avatar_url }} style={dynamicStyles.avatarImage} />
              ) : (
                <Ionicons name="person" size={40} color={colors.primary} />
              )}
            </View>
            <View style={dynamicStyles.editAvatarBadge}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={dynamicStyles.name}>{userData.full_name || userData.name || 'Người dùng'}</Text>
          <Text style={dynamicStyles.phone}>{userData.phone}</Text>
        </View>

        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Vai trò của bạn</Text>
          <View style={dynamicStyles.roleToggle}>
            <View style={[dynamicStyles.roleBtn, dynamicStyles.roleBtnActive, { flex: 1 }]}>
              <Ionicons
                name={userData.role === 'fisherman' ? 'boat' : 'cube'}
                size={20}
                color="#fff"
              />
              <Text style={[dynamicStyles.roleText, dynamicStyles.roleTextActive]}>
                {userData.role === 'fisherman' ? 'Ngư Dân' : 'Thương Lái'}
              </Text>
            </View>
          </View>
          <Text style={dynamicStyles.hintText}>
            {userData.role === 'fisherman'
              ? 'Chế độ Ngư Dân: Quét ảnh AI, báo cáo sản lượng và bật định vị chờ tàu thu mua.'
              : 'Chế độ Thương Lái: Theo dõi bản đồ tàu đánh bắt, chốt đơn và dẫn đường trên biển.'}
          </Text>
        </View>

        {/* Section Bảng điều khiển */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Cài đặt nâng cao</Text>

          {/* Nút Dark Mode (nhánh HEAD) */}
          <View style={dynamicStyles.menuItem}>
            <View style={dynamicStyles.menuItemLeft}>
              <View style={[dynamicStyles.iconBox, { backgroundColor: colors.successLight || '#dcfce7' }]}>
                <Ionicons name="moon-outline" size={20} color={colors.success} />
              </View>
              <Text style={dynamicStyles.menuText}>Chế độ Tối (Dark Mode)</Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={"#fff"}
            />
          </View>

          {/* Nút Xóa dữ liệu (kết hợp logic của duy-khai & UI của HEAD) */}
          <TouchableOpacity style={dynamicStyles.menuItem} onPress={handleClearOfflineData}>
            <View style={dynamicStyles.menuItemLeft}>
              <View style={[dynamicStyles.iconBox, { backgroundColor: colors.dangerLight || '#fee2e2' }]}>
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </View>
              <Text style={dynamicStyles.menuText}>Xóa dữ liệu Offline</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Nút Đăng xuất (dùng handleLogout của HEAD) */}
          <TouchableOpacity style={dynamicStyles.menuItem} onPress={handleLogout}>
            <View style={dynamicStyles.menuItemLeft}>
              <View style={[dynamicStyles.iconBox, { backgroundColor: colors.border }]}>
                <Ionicons name="log-out-outline" size={20} color={colors.textSecondary} />
              </View>
              <Text style={[dynamicStyles.menuText, { color: colors.textSecondary }]}>Đăng xuất</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Bọc StyleSheet.create trong một hàm để truyền màu sắc động
const getDynamicStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: colors.surface || colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text || colors.textPrimary,
  },
  profileBox: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: colors.surface || colors.card,
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight || colors.primarySoft || '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface || '#fff',
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text || colors.textPrimary,
  },
  phone: {
    fontSize: 14,
    color: colors.textSecondary || colors.textMuted,
    marginTop: 4,
  },
  section: {
    backgroundColor: colors.surface || colors.card,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text || colors.textSecondary,
    marginBottom: 16,
  },
  roleToggle: {
    flexDirection: 'row',
    backgroundColor: colors.border,
    borderRadius: 12,
    padding: 4,
  },
  roleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  roleBtnActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  roleText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary || colors.textMuted,
    marginLeft: 8,
  },
  roleTextActive: {
    color: colors.textOnPrimary || '#fff',
  },
  hintText: {
    fontSize: 14,
    color: colors.textSecondary || colors.textMuted,
    marginTop: 16,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text || colors.textPrimary,
  },
});