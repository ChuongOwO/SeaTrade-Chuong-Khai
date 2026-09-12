import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

const AppContainer = () => {
  const { isDarkMode, colors } = useTheme();

  const CustomTheme = {
    ...isDarkMode ? DarkTheme : DefaultTheme,
    colors: {
      ...(isDarkMode ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
    },
  };

  return (
    <NavigationContainer theme={CustomTheme}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      <AppNavigator />
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <ThemeProvider>
          <SafeAreaProvider>
            <AppContainer />
          </SafeAreaProvider>
        </ThemeProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
