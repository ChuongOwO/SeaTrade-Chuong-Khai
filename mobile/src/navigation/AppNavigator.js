import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme';

import HomeScreen from '../screens/HomeScreen';
import MarketScreen from '../screens/MarketScreen';
import CameraScreen from '../screens/CameraScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import CreateVesselScreen from '../screens/CreateVesselScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const CustomScanButton = ({ onPress }) => (
  <TouchableOpacity
    style={{
      top: -20,
      justifyContent: 'center',
      alignItems: 'center',
    }}
    onPress={onPress}
  >
    <View style={{
      width: 68,
      height: 68,
      borderRadius: 34,
      backgroundColor: colors.danger,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: colors.danger,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 6,
      borderWidth: 4,
      borderColor: '#ffffff',
    }}>
      <MaterialCommunityIcons name="line-scan" size={30} color={colors.textOnPrimary} />
    </View>
    <Text style={{ fontSize: 11, color: colors.danger, fontWeight: 'bold', marginTop: 4 }}>Quét</Text>
  </TouchableOpacity>
);

// Chấm đỏ nhỏ đè lên icon tab — dùng cho badge "có tin nhắn mới" trên tab
// Lịch Sử (xem NotificationContext.js). Không hiện số, chỉ 1 chấm tròn.
const TabDot = ({ borderColor }) => (
  <View
    style={{
      position: 'absolute',
      top: -2,
      right: -6,
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: colors.danger,
      borderWidth: 1.5,
      borderColor,
    }}
  />
);

// Giao diện chính (đã đăng nhập) — không cần params nữa, dùng Context
function MainTabs() {
  const { colors: themeColors } = useTheme();
  const { hasNewBanner, markHistoryTabSeen } = useNotifications();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarShowLabel: true,
        tabBarActiveTintColor: themeColors.primary,
        tabBarInactiveTintColor: themeColors.textFaint,
        tabBarStyle: {
          backgroundColor: themeColors.card,
          borderTopWidth: 1,
          borderTopColor: themeColors.border,
          height: 65,
          paddingBottom: 8,
          paddingTop: 8,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Bản Đồ',
          tabBarIcon: ({ color }) => <Ionicons name="map" size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name="Market"
        component={MarketScreen}
        options={{
          tabBarLabel: 'Thị Trường',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="storefront" size={26} color={color} />,
        }}
      />
      <Tab.Screen
        name="Scan"
        component={CameraScreen}
        options={{ tabBarButton: (props) => <CustomScanButton {...props} /> }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: 'Lịch Sử',
          tabBarIcon: ({ color }) => (
            <View>
              <Ionicons name="receipt" size={24} color={color} />
              {hasNewBanner && <TabDot borderColor={themeColors.card} />}
            </View>
          ),
        }}
        listeners={{
          // Tab được xem (focus) -> tắt chấm đỏ ngoài cùng. Chấm đỏ trên
          // sub-tab "Chat" bên trong màn Lịch Sử vẫn giữ nguyên, chỉ tắt khi
          // tin nhắn thực sự được đọc (xem HistoryScreen.js + back-end).
          focus: () => markHistoryTabSeen(),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Tài Khoản',
          tabBarIcon: ({ color }) => <Ionicons name="person-circle" size={26} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

// Navigator chính — dùng Context thay vì truyền function qua params
export default function AppNavigator() {
  const { userToken, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.card }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 10, color: colors.textMuted }}>Đang nạp phiên đăng nhập...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {userToken == null ? (
        // --- AUTH STACK ---
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </>
      ) : (
        // --- MAIN STACK ---
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="CreateVessel" component={CreateVesselScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
