import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, Image, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme';
import { API_URL } from '../config/api';
import { startConversation } from '../api/chatApi';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=200&q=80';

const QUALITY_LABELS = {
  PREMIUM: '⭐ Loại 1 (Tuyệt hảo)',
  GOOD: '✅ Loại 2 (Tốt)',
  NORMAL: '🔵 Loại 3 (Trung bình)',
  LOW: '⚪ Loại 4 (Kém)',
};

export default function MarketScreen({ navigation }) {
  const [userRole, setUserRole] = useState(null);
  const [userId, setUserId] = useState(null);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const userDataStr = await AsyncStorage.getItem('userData');
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          setUserRole(userData.role);
          setUserId(userData.id);
        }
      } catch (e) {
        console.log('Error reading role', e);
      }
    };
    checkRole();
  }, []);

  const fetchMarketBatches = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_URL}/api/seafood/batches/market`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.metadata) {
        setBatches(data.metadata);
      }
    } catch (e) {
      console.log('Lỗi fetch chợ:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Tự động refresh khi quay lại tab (ví dụ sau khi đăng bán xong)
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchMarketBatches();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchMarketBatches();
  };

  const handleDealPress = async (item) => {
    const speciesName = item.species?.name_vi || 'Hải sản';
    const ownerPhone = item.owner_phone;
    const ownerName = item.owner_name || 'Chủ tàu';
    
    if (!ownerPhone) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin liên hệ của chủ tàu.');
      return;
    }

    Alert.alert(
      'Liên hệ thương lượng',
      `Bạn muốn nhắn tin với ${ownerName} để thỏa thuận mua ${speciesName} (${item.quantity_kg} kg)?`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Nhắn tin ngay', onPress: async () => {
          try {
            const conversation = await startConversation(ownerPhone);
            // Lưu context thương lượng để ChatThread biết đang deal mẻ cá nào
            await AsyncStorage.setItem('negotiation_context', JSON.stringify({
              conversation_id: conversation.id,
              batch_id: item.id,
              seller_id: item.owner_id,
              species_name: speciesName,
              quantity_kg: item.quantity_kg,
              quality_level: item.quality_level,
              vessel_name: item.vessel?.vessel_name || '',
            }));
            navigation.navigate('History', { openChat: conversation });
          } catch (err) {
            Alert.alert('Lỗi', err.message || 'Không thể bắt đầu cuộc trò chuyện.');
          }
        }}
      ]
    );
  };

  const handleDeleteBatch = (item) => {
    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc muốn gỡ mẻ "${item.species?.name_vi}" (${item.quantity_kg} kg) khỏi chợ?`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa', style: 'destructive', onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('userToken');
            const res = await fetch(`${API_URL}/api/seafood/batches/${item.id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
              Alert.alert('Đã xóa', 'Mẻ cá đã được gỡ khỏi chợ.');
              fetchMarketBatches();
            } else {
              const data = await res.json();
              Alert.alert('Lỗi', data.message || 'Không thể xóa.');
            }
          } catch (e) {
            Alert.alert('Lỗi', e.message);
          }
        }}
      ]
    );
  };

  const renderItem = ({ item }) => {
    const speciesName = item.species?.name_vi || 'Không rõ loài';
    const vesselName = item.vessel?.vessel_name || 'Không rõ tàu';
    const vesselCode = item.vessel?.vessel_code || '';
    const qualityLabel = QUALITY_LABELS[item.quality_level] || item.quality_level;
    const imageUri = item.species?.image_url || FALLBACK_IMAGE;
    const isMyBatch = item.owner_id === userId;

    return (
      <View style={[styles.card, isMyBatch && styles.myCard]}>
        <Image source={{ uri: imageUri }} style={styles.image} />
        <View style={styles.info}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={styles.species}>{speciesName}</Text>
            {isMyBatch && <Text style={styles.myBadge}>Của bạn</Text>}
          </View>
          <Text style={styles.vessel}>🚢 {vesselName} ({vesselCode})</Text>
          <Text style={styles.grade}>{qualityLabel}</Text>
          <Text style={styles.quantity}>📦 {item.quantity_kg} kg</Text>

          {isMyBatch ? (
            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteBatch(item)}>
              <Ionicons name="trash-outline" size={14} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.btnText}>Gỡ khỏi chợ</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.btn} onPress={() => handleDealPress(item)}>
              <Text style={styles.btnText}>Thỏa thuận & Chốt đơn</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="fish-outline" size={64} color={colors.textMuted} />
      <Text style={styles.emptyText}>Chợ hải sản đang trống</Text>
      <Text style={styles.emptySubText}>Chưa có ngư dân nào đăng bán mẻ cá</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chợ Hải Sản</Text>
        <Text style={styles.headerSub}>Tất cả mẻ cá đang được bán</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 10, color: colors.textMuted }}>Đang tải chợ...</Text>
        </View>
      ) : (
        <FlatList
          data={batches}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={batches.length === 0 ? styles.emptyList : styles.list}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
        />
      )}

      {userRole === 'FISHERMAN' && (
        <TouchableOpacity 
          style={styles.fab} 
          onPress={() => navigation.navigate('CreateBatch')}
        >
          <Ionicons name="add" size={32} color="#fff" />
        </TouchableOpacity>
      )}
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
    borderBottomColor: colors.border || '#f1f5f9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  headerSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border || '#f1f5f9',
  },
  image: {
    width: 90,
    height: 90,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#e2e8f0',
  },
  info: {
    flex: 1,
    justifyContent: 'space-between',
  },
  species: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  vessel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  grade: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  quantity: {
    fontSize: 14,
    color: colors.warningAccent,
    fontWeight: 'bold',
    marginTop: 2,
  },
  btn: {
    backgroundColor: colors.success,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: {
    color: colors.textOnPrimary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  myCard: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  myBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  deleteBtn: {
    backgroundColor: colors.error || '#ef4444',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  }
});
