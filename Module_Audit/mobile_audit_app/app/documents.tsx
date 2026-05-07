import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import api, { getApiUrl, API_PATHS, TUNNEL_URL } from '../src/utils/api';
import { useSidebar } from '../src/context/SidebarContext';

const DocumentsManagementScreen = () => {
  const router = useRouter();
  const { openSidebar } = useSidebar();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({ name: '' });

  const fetchData = async () => {
    try {
      const res = await api.get(getApiUrl(API_PATHS.PROCESSUS_DOCS));
      setData(res.data.data || []);
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Impossible de charger les documents');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenDoc = (contentUrl) => {
    if (!contentUrl) {
      Alert.alert('Info', 'Aucun fichier associé');
      return;
    }
    const fullUrl = contentUrl.startsWith('http') ? contentUrl : `${TUNNEL_URL}${contentUrl}`;
    Linking.openURL(fullUrl).catch(() => Alert.alert('Erreur', 'Impossible d\'ouvrir le document'));
  };

  const renderHeader = () => (
    <View style={styles.tableHeader}>
      <View style={[styles.headerCell, { width: 30 }]}><Text style={styles.headerText}>ID</Text></View>
      <View style={[styles.headerCell, { width: 40 }]}><Text style={[styles.headerText, { textAlign: 'center' }]}>Type</Text></View>
      <View style={[styles.headerCell, { flex: 1.5 }]}><Text style={styles.headerText}>Document</Text></View>
      <View style={[styles.headerCell, { width: 80 }]}><Text style={[styles.headerText, { textAlign: 'center' }]}>Processus</Text></View>
      <View style={[styles.headerCell, { width: 60 }]}><Text style={[styles.headerText, { textAlign: 'center' }]}>Vue</Text></View>
      <View style={[styles.headerCell, { width: 60 }]}><Text style={[styles.headerText, { textAlign: 'center' }]}>Actions</Text></View>
    </View>
  );

  const renderItem = ({ item }) => (
    <View style={styles.tableRow}>
      <View style={[styles.cell, { width: 30 }]}><Text style={styles.cellText}>#{item.id}</Text></View>
      <View style={[styles.cell, { width: 40, alignItems: 'center' }]}>
        <MaterialCommunityIcons name="file-pdf-box" size={14} color="#ef4444" />
      </View>
      <View style={[styles.cell, { flex: 1.5 }]}><Text style={[styles.cellText, { fontWeight: '700' }]} numberOfLines={1}>{item.name}</Text></View>
      <View style={[styles.cell, { width: 80, alignItems: 'center' }]}>
        <View style={styles.processBadge}>
            <Text style={styles.processText} numberOfLines={1}>
                {item.processus_names && item.processus_names.length > 0 ? item.processus_names[0] : '-'}
            </Text>
        </View>
      </View>
      <View style={[styles.cell, { width: 60, alignItems: 'center' }]}>
        <TouchableOpacity style={styles.ouvrirBtn} onPress={() => handleOpenDoc(item.content)}>
            <Ionicons name="eye-outline" size={10} color="#3b82f6" />
            <Text style={styles.ouvrirBtnText}>Ouvrir</Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.cell, { width: 60, flexDirection: 'row', justifyContent: 'center' }]}>
        <TouchableOpacity style={styles.miniActionBtn}>
          <Feather name="edit-3" size={12} color="#f59e0b" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.miniActionBtn}>
          <Feather name="trash-2" size={12} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={openSidebar} style={styles.menuBtn}>
            <Ionicons name="menu" size={24} color="#475569" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.replace('/')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gestion des Documents Processus</Text>
        </View>
        <TouchableOpacity style={styles.addBtn}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.addBtnText}>Télécharger</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher par document..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#94a3b8"
          />
        </View>
      </View>

      <View style={styles.tableContainer}>
        {renderHeader()}
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={data.filter(item => item.name.toLowerCase().includes(search.toLowerCase()))}
            renderItem={renderItem}
            keyExtractor={item => item.id.toString()}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />
            }
            ListEmptyComponent={<Text style={styles.emptyText}>Aucun document trouvé</Text>}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { height: 55, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  menuBtn: { padding: 5, marginRight: 5 },
  backBtn: { padding: 5 },
  headerTitle: { fontSize: 13, fontWeight: '700', color: '#1e293b', marginLeft: 5 },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#22c55e', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  addBtnText: { color: '#fff', fontSize: 10, fontWeight: '700', marginLeft: 4 },
  
  searchSection: { padding: 12, backgroundColor: '#f8fafc' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, height: 38, borderWidth: 1, borderColor: '#e2e8f0' },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 12, color: '#1e293b' },
  
  tableContainer: { flex: 1, marginTop: 5 },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 8, backgroundColor: '#fff' },
  headerCell: { paddingHorizontal: 1, justifyContent: 'center' },
  headerText: { fontSize: 9, fontWeight: '800', color: '#1e293b' },
  
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'center', minHeight: 48 },
  cell: { paddingHorizontal: 1, justifyContent: 'center' },
  cellText: { fontSize: 9, color: '#1e293b' },
  
  processBadge: { backgroundColor: '#64748b', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  processText: { color: '#fff', fontSize: 7, fontWeight: '800' },
  
  ouvrirBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#3b82f6', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  ouvrirBtnText: { color: '#3b82f6', fontSize: 8, fontWeight: '700', marginLeft: 4 },
  
  miniActionBtn: { padding: 5, marginHorizontal: 1 },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#94a3b8', fontSize: 12 },
});

export default DocumentsManagementScreen;

