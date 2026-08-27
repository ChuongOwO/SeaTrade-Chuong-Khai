import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme';

import HomeScreen from '../screens/HomeScreen';
import MarketScreen from '../screens/MarketScreen';
import CameraScreen from '../screens/CameraScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

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

// Giao diện chính của app (khi đã login)
function MainTabs({ route }) {
  // Lấy hàm onLogout từ route.params (truyền từ AppNavigator xuống)
  const { onLogout } = route.params || {};

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
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
          tabBarIcon: ({ color }) => <Ionicons name="receipt" size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        initialParams={{ onLogout }} // Truyền onLogout vào ProfileScreen
        options={{
          tabBarLabel: 'Tài Khoản',
          tabBarIcon: ({ color }) => <Ionicons name="person-circle" size={26} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

// Trình điều hướng quản lý Phiên đăng nhập
export default function AppNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);

  // Kiểm tra Session ngay khi mở App
  useEffect(() => {
    const bootstrapAsync = async () => {
      let token;
      try {
        token = await AsyncStorage.getItem('userToken');
      } catch (e) {
        console.log('Restoring token failed');
      }
      setUserToken(token);
      setIsLoading(false);
    };

    bootstrapAsync();
  }, []);

  // Hàm chuyển đổi State Auth
  const handleLogin = (token) => setUserToken(token);
  const handleLogout = async () => {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userData');
    setUserToken(null);
  };

  if (isLoading) {
    // Màn hình loading chờ lấy Token từ AsyncStorage
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
        // --- AUTH STACK (Chưa đăng nhập) ---
        <>
          <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
            initialParams={{ onLogin: handleLogin }} 
          />
          <Stack.Screen 
            name="Register" 
            component={RegisterScreen} 
            initialParams={{ onLogin: handleLogin }} 
          />
        </>
      ) : (
        // --- MAIN STACK (Đã đăng nhập) ---
        <Stack.Screen 
          name="MainTabs" 
          component={MainTabs} 
          initialParams={{ onLogout: handleLogout }} 
        />
      )}
    </Stack.Navigator>
  );
}
