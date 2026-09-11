import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, Dimensions, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LeafletMap from '../components/LeafletMap';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { API_URL } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SEA_CENTER = { latitude: 10.3240, longitude: 107.1240 };

export default function HomeScreen() {
  const { colors, isDarkMode } = useTheme();
  const mapRef = useRef(null);

  const [location, setLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationSubscription, setLocationSubscription] = useState(null);
  const [demoOffset, setDemoOffset] = useState(null);

  const [selectedVessel, setSelectedVessel] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [liveVessels, setLiveVessels] = useState([]);
  const [apiError, setApiError] = useState(null);

  const initialRegion = {
    latitude: 10.324,
    longitude: 107.124,
    latitudeDelta: 0.2, // Tăng delta để thấy tàu xa hơn
    longitudeDelta: 0.2,
  };

  // Fetch dữ liệu tàu từ Backend API
  const fetchVesselsLocations = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setApiError('No Token');
        return;
      }

      const res = await fetch(`${API_URL}/api/vessels/locations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === 200) {
        setApiError(null);
        const mapped = data.metadata.map(v => ({
          id: String(v.vessel_id),
          title: v.vessel_name,
          description: `Tốc độ: ${v.speed || 0} Knots`,
          lat: parseFloat(v.latitude),
          lng: parseFloat(v.longitude),
          type: v.vessel_type === 'COLLECTOR' ? 'trader' : 'fisherman'
        }));
        setLiveVessels(mapped);
      } else {
        setApiError(data.message || 'API Error');
      }
    } catch (e) {
      console.log('Lỗi fetch locations:', e);
      setApiError(e.message);
    }
  };

  useEffect(() => {
    fetchVesselsLocations();
    // Refresh mỗi 10s
    const interval = setInterval(fetchVesselsLocations, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleGetLocation = async () => {
    setIsLocating(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền bị từ chối', 'Vui lòng cấp quyền vị trí để sử dụng tính năng GPS.');
        setIsLocating(false);
        return;
      }

      if (locationSubscription) locationSubscription.remove();

      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 1 },
        (currentPos) => {
          const realLat = currentPos.coords.latitude;
          const realLng = currentPos.coords.longitude;

          setDemoOffset((currentOffset) => {
            let offsetToUse = currentOffset;
            if (!offsetToUse) {
              offsetToUse = { lat: SEA_CENTER.latitude - realLat, lng: SEA_CENTER.longitude - realLng };
            }

            const fakeLat = realLat + offsetToUse.lat;
            const fakeLng = realLng + offsetToUse.lng;

            setLocation({ latitude: fakeLat, longitude: fakeLng });

            if (mapRef.current) {
              mapRef.current.animateToRegion({
                latitude: fakeLat, longitude: fakeLng, latitudeDelta: 0.2, longitudeDelta: 0.2,
              });
            }
            return offsetToUse;
          });
          setIsLocating(false);
        }
      );
      setLocationSubscription(sub);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể lấy tọa độ GPS hiện tại.');
      setIsLocating(false);
    }
  };

  const handleMapPress = () => {
    setSelectedVessel(null);
    setIsNavigating(false);
  };

  const handleMarkerPress = async (id) => {
    if (id === 'me') return;

    // Tàu thật - Gọi API Navigation
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const queryParams = location ? `?lat=${location.latitude}&lng=${location.longitude}` : '';
      const res = await fetch(`${API_URL}/api/vessels/${id}/navigation${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.status === 200) {
        const nav = data.metadata;
        
        // Nếu app chưa có GPS, lấy vị trí của tàu user trên DB làm điểm bắt đầu
        if (!location) {
          setLocation({
            latitude: nav.current_vessel.latitude,
            longitude: nav.current_vessel.longitude
          });
          // Focus map vào tàu của mình
          if (mapRef.current) {
             mapRef.current.animateToRegion({
               latitude: nav.current_vessel.latitude,
               longitude: nav.current_vessel.longitude,
               latitudeDelta: 0.2,
               longitudeDelta: 0.2,
             });
          }
        }

        setSelectedVessel({
          id: nav.target_vessel.vessel_id,
          title: nav.target_vessel.vessel_name,
          description: `Khoảng cách: ${nav.distance_km} km\nHướng: ${nav.bearing_text} (${nav.bearing}°)`,
          lat: nav.target_vessel.latitude,
          lng: nav.target_vessel.longitude,
          distance_km: nav.distance_km,
          bearing_text: nav.bearing_text
        });
        setIsNavigating(false);
      } else {
        // Lỗi từ backend (chưa có tàu, cùng tàu, v.v.)
        const found = liveVessels.find(v => v.id === id);
        if (found) {
          setSelectedVessel(found);
          setIsNavigating(false);
        }
        Alert.alert('Lỗi Dẫn đường', data.message);
      }
    } catch (e) {
      console.log('Navigation Error:', e);
      const found = liveVessels.find(v => v.id === id);
      if (found) setSelectedVessel(found);
    }
  };

  const handleNavigation = () => {
    if (!selectedVessel) return;
    if (!location) {
      Alert.alert('Chưa có vị trí', 'Vui lòng Bật Vị Trí trước khi bắt đầu dẫn đường.');
      return;
    }
    setIsNavigating(!isNavigating);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Hải Trình & Giao Thương</Text>
          <Text style={[styles.headerSub, { color: location ? colors.success : colors.warningAccent }]}>
            {location ? `Tọa độ biển: ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}` : 'Đang chờ tín hiệu GPS...'}
          </Text>
          {apiError && <Text style={{ fontSize: 10, color: colors.danger, marginTop: 4 }}>Lỗi: {apiError}</Text>}
        </View>
      </View>

      <View style={styles.mapContainer}>
        {Platform.OS === 'web' ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.border }}>
            <Ionicons name="map-outline" size={64} color={colors.textFaint} />
            <Text style={{ marginTop: 16, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 20 }}>
              Bản đồ Hàng hải không hỗ trợ xem trên Trình duyệt Web.{'\n'}
              Vui lòng cài đặt App trên Điện thoại hoặc dùng phần mềm Giả lập Android (BlueStacks/Nox) để xem.
            </Text>
          </View>
        ) : (
          <LeafletMap
            ref={mapRef}
            style={styles.map}
            initialRegion={initialRegion}
            onPress={handleMapPress}
            onMarkerPress={handleMarkerPress}
            markers={[
              ...(location ? [{ id: 'me', lat: location.latitude, lng: location.longitude, type: 'me', title: 'Vị trí của tôi' }] : []),
              ...liveVessels.map(v => ({ id: String(v.id), lat: v.lat, lng: v.lng, type: v.type, title: v.title })),
            ]}
            polyline={
              isNavigating && location && selectedVessel
                ? [
                    { latitude: location.latitude, longitude: location.longitude },
                    { latitude: selectedVessel.lat, longitude: selectedVessel.lng },
                  ]
                : null
            }
          />
        )}

        <View style={styles.bottomUI}>
          {selectedVessel && (
            <View style={styles.vesselCard}>
              <View style={styles.vesselInfo}>
                <Text style={styles.vesselTitle}>{selectedVessel.title}</Text>
                <Text style={styles.vesselDesc}>{selectedVessel.description}</Text>
              </View>
              <TouchableOpacity
                style={[styles.actionBtn, isNavigating && styles.actionBtnActive]}
                onPress={handleNavigation}
              >
                <Ionicons name={isNavigating ? "close-circle" : "navigate"} size={18} color="#fff" />
                <Text style={styles.actionText}>
                  {isNavigating ? 'Hủy' : 'Dẫn đường'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={[styles.gpsBtn, location && styles.gpsBtnActive]}
            onPress={handleGetLocation}
            disabled={isLocating}
          >
            <Ionicons name="radio" size={20} color={location ? "#ffffff" : "#94a3b8"} />
            <Text style={[styles.gpsText, { color: location ? "#ffffff" : "#64748b" }]}>
              {isLocating ? 'Đang định vị...' : (location ? 'GPS Online (Vị trí biển)' : 'Bật Định Vị Vùng Biển')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  headerSub: { fontSize: 11, marginTop: 2, fontWeight: '600' },
  mapContainer: { flex: 1, position: 'relative' },
  map: { width: Dimensions.get('window').width, height: '100%' },
  bottomUI: { position: 'absolute', bottom: 20, left: 20, right: 20, gap: 12 },
  vesselCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 5 },
  vesselInfo: { flex: 1 },
  vesselTitle: { fontWeight: 'bold', fontSize: 16, color: '#0f172a', marginBottom: 4 },
  vesselDesc: { fontSize: 13, color: '#64748b' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#0ea5e9', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, marginLeft: 12 },
  actionBtnActive: { backgroundColor: '#ef4444' },
  actionText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  gpsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, backgroundColor: '#f8fafc', borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  gpsBtnActive: { backgroundColor: '#10b981' },
  gpsText: { fontSize: 15, fontWeight: 'bold' }
});
