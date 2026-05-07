import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Image, useWindowDimensions, Modal } from 'react-native';
import { Stack, useRouter, usePathname } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Sidebar from '../src/components/Sidebar';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { SidebarProvider, useSidebar } from '../src/context/SidebarContext';

function RootLayoutContent() {
  const { user } = useAuth();
  const { sidebarVisible, closeSidebar } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();

  const isMobile = width < 768;
  const isLoginPage = pathname === '/login';

  return (
    <View style={styles.container}>
      {/* Desktop Sidebar */}
      {!isMobile && !isLoginPage && (
        <View style={styles.desktopSidebar}>
          <Sidebar />
        </View>
      )}

      {/* Mobile Sidebar (Drawer-like Modal) */}
      {isMobile && !isLoginPage && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={sidebarVisible}
          onRequestClose={closeSidebar}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.mobileSidebarContainer}>
              <Sidebar onClose={closeSidebar} />
            </View>
            <TouchableOpacity 
              style={styles.modalBackdrop} 
              activeOpacity={1} 
              onPress={closeSidebar} 
            />
          </View>
        </Modal>
      )}

      <View style={styles.mainContent}>
        <Stack screenOptions={{ headerShown: false }} />
      </View>
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SidebarProvider>
          <RootLayoutContent />
        </SidebarProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', backgroundColor: '#fff' },
  desktopSidebar: { width: 280, height: '100%', borderRightWidth: 1, borderRightColor: '#f1f5f9' },
  mainContent: { flex: 1, backgroundColor: '#f8fafc' },
  modalOverlay: { flex: 1, flexDirection: 'row' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)' },
  mobileSidebarContainer: { width: 280, height: '100%', backgroundColor: '#fff' },
});
