import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getApiUrl = () => {
  let ip = '172.16.240.208'; // Fallback mặc định
  
  const debuggerHost = 
    Constants.expoConfig?.hostUri || 
    Constants.manifest?.debuggerHost || 
    Constants.manifest2?.extra?.expoGo?.debuggerHost;

  if (debuggerHost) {
    ip = debuggerHost.split(':')[0];
  } else if (Platform.OS === 'android' && !Constants.expoConfig) {
    ip = '10.0.2.2'; // Giả lập Android
  }

  return `http://${ip}:5000`;
};

export const API_URL = getApiUrl();
export const API_AUTH_URL = `${API_URL}/api/auth`;
export const API_REGISTER_URL = `${API_AUTH_URL}/register`;
export const API_LOGIN_URL = `${API_AUTH_URL}/login`;
export const API_AVATAR_URL = `${API_AUTH_URL}/avatar`;

// Chức năng Chat (back-end/src/modules/chat) — xem mobile/src/api/chatApi.js
export const API_CHAT_CONVERSATIONS_URL = `${API_URL}/api/chat/conversations`;
export const chatMessagesUrl = (conversationId) => `${API_CHAT_CONVERSATIONS_URL}/${conversationId}/messages`;
