import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

// Các component giả lập để chống Crash khi import trên Web
export const MapView = ({ children }) => {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.border }}>
      <Ionicons name="map-outline" size={64} color={colors.textFaint} />
      <Text style={{ marginTop: 16, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 20 }}>
        Bản đồ Hàng hải không hỗ trợ xem trên Trình duyệt Web.
        Vui lòng cài đặt App trên Điện thoại hoặc dùng phần mềm Giả lập Android (BlueStacks/Nox) để xem.
      </Text>
    </View>
  );
};

export const Marker = ({ children }) => null;
export const Polyline = () => null;
