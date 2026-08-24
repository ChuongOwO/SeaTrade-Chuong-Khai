import React from 'react';
import { StyleSheet, View, Text, FlatList, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MarketScreen() {
  const mockMarketData = [
    { id: '1', species: 'Cá Ngừ Vây Vàng', grade: 'Grade A', price: '190,000 đ/kg', vessel: 'Hải Nam 09', distance: '2.8 NM', image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=200&q=80' },
    { id: '2', species: 'Cá Thu Thuận Hải', grade: 'Size XL', price: '220,000 đ/kg', vessel: 'Biển Đông 02', distance: '4.5 NM', image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=200&q=80' },
    { id: '3', species: 'Tôm Hùm Bông', grade: 'Size A', price: '1,280,000 đ/kg', vessel: 'Phú Quốc King', distance: '12.0 NM', image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=200&q=80' },
  ];

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.image }} style={styles.image} />
      <View style={styles.info}>
        <Text style={styles.species}>{item.species}</Text>
        <Text style={styles.vessel}>{item.vessel} • Cách {item.distance}</Text>
        <Text style={styles.grade}>✅ AI Verified: {item.grade}</Text>
        <Text style={styles.price}>{item.price}</Text>
        
        <TouchableOpacity style={styles.btn}>
          <Text style={styles.btnText}>Thỏa thuận & Chốt đơn</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chợ Hải Sản Bán Kính 15 NM</Text>
        <Text style={styles.headerSub}>Dành cho Tàu Thu Gom</Text>
      </View>
      <FlatList
        data={mockMarketData}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
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
  headerSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  list: {
    padding: 16,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  image: {
    width: 90,
    height: 90,
    borderRadius: 8,
    marginRight: 12,
  },
  info: {
    flex: 1,
    justifyContent: 'space-between',
  },
  species: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  vessel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  grade: {
    fontSize: 12,
    color: '#0ea5e9',
    fontWeight: '600',
    marginTop: 4,
  },
  price: {
    fontSize: 14,
    color: '#f59e0b',
    fontWeight: 'bold',
    marginTop: 2,
  },
  btn: {
    backgroundColor: '#10b981',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  }
});
