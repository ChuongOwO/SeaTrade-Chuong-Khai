import React from 'react';
import { StyleSheet, View, Text, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

// Dữ liệu mẫu (mock) — màn hình này trước đây chỉ là khung rỗng, chưa nối
// API lịch sử giao dịch thật. Dùng mock cùng kiểu với MarketScreen để có
// giao diện hoàn chỉnh; đồng đội nối API thật cho lịch sử sau.
const MOCK_HISTORY = [
  { id: 'DH-1042', species: 'Cá Ngừ Vây Vàng', counterparty: 'Hải Nam 09', price: '190,000 đ/kg', quantity: '85 kg', date: '15/08/2026', status: 'COMPLETED' },
  { id: 'DH-1041', species: 'Tôm Hùm Bông', counterparty: 'Phú Quốc King', price: '1,280,000 đ/kg', quantity: '12 kg', date: '13/08/2026', status: 'COMPLETED' },
  { id: 'DH-1039', species: 'Cá Thu Thuận Hải', counterparty: 'Biển Đông 02', price: '220,000 đ/kg', quantity: '60 kg', date: '10/08/2026', status: 'CANCELLED' },
  { id: 'DH-1035', species: 'Mực Lá Tươi', counterparty: 'Sông Tiền 01', price: '165,000 đ/kg', quantity: '40 kg', date: '05/08/2026', status: 'COMPLETED' },
];

const STATUS_LABEL = {
  COMPLETED: 'Hoàn Tất',
  CANCELLED: 'Đã Hủy',
};

export default function HistoryScreen() {
  const renderItem = ({ item }) => {
    const isCompleted = item.status === 'COMPLETED';
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.species}>{item.species}</Text>
            <Text style={styles.meta}>{item.counterparty} • {item.quantity}</Text>
          </View>
          <View style={[styles.statusBadge, isCompleted ? styles.statusCompleted : styles.statusCancelled]}>
            <Text style={[styles.statusText, isCompleted ? styles.statusTextCompleted : styles.statusTextCancelled]}>
              {STATUS_LABEL[item.status]}
            </Text>
          </View>
        </View>
        <View style={styles.cardBottom}>
          <Text style={styles.orderId}>{item.id}</Text>
          <Text style={styles.price}>{item.price}</Text>
          <Text style={styles.date}>{item.date}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lịch Sử Giao Dịch</Text>
        <Text style={styles.headerSub}>{MOCK_HISTORY.length} giao dịch gần đây</Text>
      </View>

      {MOCK_HISTORY.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={48} color={colors.textFaint} />
          <Text style={styles.emptyText}>Chưa có giao dịch nào gần đây.</Text>
        </View>
      ) : (
        <FlatList
          data={MOCK_HISTORY}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
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
    borderBottomColor: '#f1f5f9',
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
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  species: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  meta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginLeft: 8,
  },
  statusCompleted: {
    backgroundColor: colors.successSoft,
  },
  statusCancelled: {
    backgroundColor: colors.dangerSoft,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  statusTextCompleted: {
    color: colors.success,
  },
  statusTextCancelled: {
    color: colors.danger,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  orderId: {
    fontSize: 11,
    color: colors.textFaint,
    fontWeight: '600',
  },
  price: {
    fontSize: 13,
    color: colors.warningAccent,
    fontWeight: 'bold',
  },
  date: {
    fontSize: 11,
    color: colors.textMuted,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    color: colors.textFaint,
    fontSize: 14,
  }
});
