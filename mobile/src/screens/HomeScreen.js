import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, Dimensions, TouchableOpacity, Alert, Switch, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapView, Marker, Polyline } from '../components/Map';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import io from 'socket.io-client';
import { colors } from '../theme';

// Tọa độ Vùng biển Vũng Tàu giả định để làm tâm Fake GPS
const SEA_CENTER = { latitude: 10.3240, longitude: 107.1240 };

export default function HomeScreen() {
  const mapRef = useRef(null);

  // Tọa độ người dùng
  const [location, setLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationSubscription, setLocationSubscription] = useState(null);
  const [demoOffset, setDemoOffset] = useState(null);

  // Trạng thái bật/tắt Tàu Ảo lao tới
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Tàu ảo tự động di chuyển
  const [virtualBoat, setVirtualBoat] = useState({
    id: 99,
    title: 'Sông Tiền 01',
    description: 'Tàu thu gom (Đang tiến lại gần)',
    lat: SEA_CENTER.latitude + 0.0005,
    lng: SEA_CENTER.longitude + 0.0005,
    type: 'trader'
  });

  const [selectedVessel, setSelectedVessel] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);

  const initialRegion = {
    latitude: 10.324,
    longitude: 107.124,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  const [liveVessels, setLiveVessels] = useState([]);

  // Lắng nghe Radar từ Server
  useEffect(() => {
    // Lưu ý: Đổi IP này thành IP Wifi thực tế nếu chạy trên điện thoại thật
    const socket = io('http://172.16.240.188:5000');
    
    socket.on('vessel_location_update', (data) => {
      setLiveVessels(prev => {
        const existingIdx = prev.findIndex(v => v.id === data.vesselId);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            lat: data.lat,
            lng: data.lng,
          };
          return updated;
        } else {
          return [...prev, {
            id: data.vesselId,
            title: data.vesselId,
            description: `Tốc độ: ${data.speed} Knots`,
            lat: data.lat,
            lng: data.lng,
            type: data.jobType === 'Thu gom' ? 'trader' : 'fisherman'
          }];
        }
      });
    });

    return () => socket.disconnect();
  }, []);

  // Logic Di chuyển tàu ảo (Virtual Boat) về phía người dùng
  useEffect(() => {
    let interval;
    if (isDemoMode && location) {
      interval = setInterval(() => {
        setVirtualBoat(prev => {
          const diffLat = location.latitude - prev.lat;
          const diffLng = location.longitude - prev.lng;

          // Tốc độ nhanh để cập mạn trong 6-7 giây
          const step = 0.00008;

          if (Math.abs(diffLat) < step && Math.abs(diffLng) < step) {
            return prev;
          }

          const moveLat = diffLat > 0 ? Math.min(step, diffLat) : Math.max(-step, diffLat);
          const moveLng = diffLng > 0 ? Math.min(step, diffLng) : Math.max(-step, diffLng);

          return {
            ...prev,
            lat: prev.lat + moveLat,
            lng: prev.lng + moveLng
          };
        });
      }, 1000);
    }

    // Reset vị trí tàu ảo khi tắt Demo
    if (!isDemoMode) {
      setVirtualBoat(prev => ({
        ...prev,
        lat: SEA_CENTER.latitude + 0.0008,
        lng: SEA_CENTER.longitude + 0.0008
      }));
      // Nếu đang dẫn đường tàu ảo mà tắt demo thì tắt dẫn đường
      if (selectedVessel?.id === 99) {
        setSelectedVessel(null);
        setIsNavigating(false);
      }
    }

    return () => clearInterval(interval);
  }, [location, isDemoMode]);

  const handleGetLocation = async () => {
    setIsLocating(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền bị từ chối', 'Vui lòng cấp quyền vị trí để sử dụng tính năng GPS.');
        setIsLocating(false);
        return;
      }

      if (locationSubscription) {
        locationSubscription.remove();
      }

      // LUÔN LUÔN DÙNG FAKE GPS RA BIỂN THEO YÊU CẦU ĐỒ ÁN
      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 1, // Cập nhật mỗi 1 mét
        },
        (currentPos) => {
          const realLat = currentPos.coords.latitude;
          const realLng = currentPos.coords.longitude;

          setDemoOffset((currentOffset) => {
            let offsetToUse = currentOffset;

            // Lần đầu tiên tính khoảng cách Offset ra giữa biển
            if (!offsetToUse) {
              offsetToUse = {
                lat: SEA_CENTER.latitude - realLat,
                lng: SEA_CENTER.longitude - realLng
              };

              // Đặt tàu ảo ở cách vị trí fake ban đầu khoảng 0.0005 độ (tầm 50 mét)
              setVirtualBoat(prev => ({
                ...prev,
                lat: SEA_CENTER.latitude + 0.0005,
                lng: SEA_CENTER.longitude + 0.0005
              }));
            }

            // Fake GPS ra biển
            const fakeLat = realLat + offsetToUse.lat;
            const fakeLng = realLng + offsetToUse.lng;

            setLocation({ latitude: fakeLat, longitude: fakeLng });

            // Luôn zoom sát để thấy rõ di chuyển vài bước chân
            if (mapRef.current) {
              mapRef.current.animateToRegion({
                latitude: fakeLat,
                longitude: fakeLng,
                latitudeDelta: 0.001,
                longitudeDelta: 0.001,
              }, 1000);
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

  const handleNavigation = () => {
    if (!selectedVessel) return;
    if (!location) {
      Alert.alert('Chưa có vị trí', 'Vui lòng Bật Vị Trí trước khi bắt đầu dẫn đường.');
      return;
    }
    setIsNavigating(!isNavigating);
  };

  // Tính khoảng cách ước tính (Hải lý - NM)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;
    return (distanceKm / 1.852).toFixed(2);
  };

  const handleMapPress = () => {
    // Tắt chọn tàu khi bấm ra ngoài bản đồ
    setSelectedVessel(null);
    setIsNavigating(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Hải Trình & Giao Thương</Text>
          <Text style={[styles.headerSub, { color: location ? colors.success : colors.warningAccent }]}>
            {location ? `Tọa độ biển: ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}` : 'Đang chờ tín hiệu GPS...'}
          </Text>
        </View>
        <View style={styles.demoToggle}>
          <Text style={styles.demoText}>Tàu tới</Text>
          <Switch
            value={isDemoMode}
            onValueChange={setIsDemoMode}
            trackColor={{ false: colors.borderStrong, true: colors.danger }}
            thumbColor={isDemoMode ? colors.danger : colors.background}
            style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
          />
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
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={initialRegion}
            showsUserLocation={false}
            showsMyLocationButton={false}
            onPress={handleMapPress}
          >
            {location && (
              <Marker coordinate={location}>
                <View style={styles.myLocationOuter}>
                  <View style={styles.myLocationInner} />
                </View>
              </Marker>
            )}

            {isDemoMode && (
              <Marker
                coordinate={{ latitude: virtualBoat.lat, longitude: virtualBoat.lng }}
                onPress={(e) => {
                  e.stopPropagation();
                  setSelectedVessel(virtualBoat);
                }}
              >
                <View style={[styles.markerIcon, styles.markerVirtual]}>
                  <Ionicons name="cube" size={16} color="#ffffff" />
                </View>
              </Marker>
            )}

            {liveVessels.map(vessel => (
              <Marker
                key={vessel.id}
                coordinate={{ latitude: vessel.lat, longitude: vessel.lng }}
                onPress={(e) => {
                  e.stopPropagation();
                  setSelectedVessel(vessel);
                }}
              >
                <View style={[styles.markerIcon, vessel.type === 'fisherman' ? styles.markerMe : styles.markerTrader]}>
                  <Ionicons name={vessel.type === 'fisherman' ? 'boat' : 'cube'} size={16} color="#ffffff" />
                </View>
              </Marker>
            ))}

            {isNavigating && location && selectedVessel && (
              <Polyline
                coordinates={[
                  { latitude: location.latitude, longitude: location.longitude },
                  { latitude: selectedVessel.lat, longitude: selectedVessel.lng }
                ]}
                strokeColor={colors.primary}
                strokeWidth={3}
                lineDashPattern={[5, 5]}
              />
            )}
          </MapView>
        )}

        {/* Cụm UI nổi phía dưới */}
        <View style={styles.bottomUI}>
          {/* Card Thông tin tàu */}
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
                  {isNavigating ? `${calculateDistance(location?.latitude, location?.longitude, selectedVessel?.lat, selectedVessel?.lng)} NM` : 'Dẫn đường'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Nút bật GPS */}
          <TouchableOpacity
            style={[styles.gpsBtn, location && styles.gpsBtnActive]}
            onPress={handleGetLocation}
            disabled={isLocating}
          >
            <Ionicons name="radio" size={20} color={location ? colors.textOnPrimary : colors.textFaint} />
            <Text style={[styles.gpsText, { color: location ? colors.textOnPrimary : colors.textMuted }]}>
              {isLocating ? 'Đang định vị...' : (location ? 'GPS Online (Vị trí biển)' : 'Bật Định Vị Vùng Biển')}
            </Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  headerSub: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  demoToggle: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  demoText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.danger,
    marginBottom: -4,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    width: Dimensions.get('window').width,
    height: '100%',
  },
  myLocationOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  myLocationInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  markerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  markerMe: {
    backgroundColor: colors.primary,
  },
  markerTrader: {
    backgroundColor: colors.warningAccent,
  },
  markerVirtual: {
    backgroundColor: colors.danger,
  },
  bottomUI: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    gap: 12,
  },
  vesselCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  vesselInfo: {
    flex: 1,
  },
  vesselTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  vesselDesc: {
    fontSize: 13,
    color: colors.textMuted,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginLeft: 12,
  },
  actionBtnActive: {
    backgroundColor: colors.danger,
  },
  actionText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gpsBtnActive: {
    backgroundColor: colors.success,
  },
  gpsText: {
    fontSize: 15,
    fontWeight: 'bold',
  }
});
