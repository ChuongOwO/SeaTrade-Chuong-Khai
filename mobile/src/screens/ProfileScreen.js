import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  if (!userData) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#0ea5e9" />
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
            <Ionicons name="person" size={40} color="#0ea5e9" />
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
                color="#fff" 
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
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#fef2f2' }]}>
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </View>
              <Text style={styles.menuText}>Xóa dữ liệu Offline</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={onLogout}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#f1f5f9' }]}>
                <Ionicons name="log-out-outline" size={20} color="#64748b" />
              </View>
              <Text style={[styles.menuText, { color: '#64748b' }]}>Đăng xuất</Text>
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
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  profileBox: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#ffffff',
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  phone: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#334155',
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
    backgroundColor: '#0ea5e9',
  },
  roleText: {
    color: '#64748b',
    fontWeight: 'bold',
  },
  roleTextActive: {
    color: '#ffffff',
  },
  hintText: {
    marginTop: 16,
    fontSize: 13,
    color: '#64748b',
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
    color: '#334155',
    fontWeight: '500',
  }
});
