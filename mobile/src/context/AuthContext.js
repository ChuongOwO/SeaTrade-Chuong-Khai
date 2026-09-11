import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [userToken, setUserToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const handleLogin = (token) => setUserToken(token);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userData');
    setUserToken(null);
  };

  return (
    <AuthContext.Provider value={{ userToken, isLoading, handleLogin, handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
