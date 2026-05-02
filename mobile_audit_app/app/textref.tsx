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
  Linking,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import api, { getApiUrl, API_PATHS, TUNNEL_URL } from '../src/utils/api';
import { useSidebar } from '../src/context/SidebarContext';

const TextRefManagementScreen = () => {
  const router = useRouter();
  const { openSidebar } = useSidebar();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState([]);
  const [docs, setDocs] = useState([]);
  const [search, setSearch] = useState('');
  
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSelectingDoc, setIsSelectingDoc] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({ norme: '', text_ref: '' });

  const fetchData = async () => {
    try {
      const [res, docRes] = await Promise.all([
        api.get(getApiUrl(API_PATHS.TEXT_REFS)),
        api.get(getApiUrl(API_PATHS.PROCESSUS_DOCS)).catch(() => ({ data: { data: [] } })),
      ]);
      setData(res.data.data || []);
      setDocs(docRes.data.data || []);
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdd = () => {
    setIsEditing(false);
    setFormData({ norme: '', text_ref: '' });
    setIsSelectingDoc(false);
    setModalVisible(true);
  };

  const handleEdit = (item) => {
    setIsEditing(true);
    setCurrentId(item.id);
    setFormData({ norme: item.norme, text_ref: item.text_ref || '' });
    setIsSelectingDoc(false);
    setModalVisible(true);
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Supprimer',
      'Êtes-vous sûr de vouloir supprimer ce texte de référence ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(getApiUrl(`${API_PATHS.TEXT_REFS}${id}/`));
              fetchData();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer');
            }
          }
        },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!formData.norme) {
      Alert.alert('Erreur', 'Le champ Norme est obligatoire');
      return;
    }

    try {
      const payload = { norme: formData.norme, text_ref: formData.text_ref || null };
      if (isEditing) {
        await api.put(getApiUrl(`${API_PATHS.TEXT_REFS}${currentId}/`), payload);
      } else {
        await api.post(getApiUrl(API_PATHS.TEXT_REFS), payload);
      }
      setModalVisible(false);
      fetchData();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'enregistrer');
    }
  };

  const renderHeader = () => (
    <View style={styles.tableHeader}>
      <View style={[styles.headerCell, { width: 40 }]}><Text style={styles.headerText}>ID</Text></View>
      <View style={[styles.headerCell, { flex: 1.2 }]}><Text style={styles.headerText}>Norme</Text></View>
      <View style={[styles.headerCell, { flex: 1 }]}><Text style={styles.headerText}>Fichier</Text></View>
      <View style={[styles.headerCell, { width: 70 }]}><Text style={[styles.headerText, { textAlign: 'center' }]}>Actions</Text></View>
    </View>
  );

  const renderItem = ({ item }) => (
    <View style={styles.tableRow}>
      <View style={[styles.cell, { width: 40 }]}><Text style={styles.cellText}>#{item.id}</Text></View>
      <View style={[styles.cell, { flex: 1.2 }]}><Text style={[styles.cellText, { fontWeight: '600' }]} numberOfLines={1}>{item.norme}</Text></View>
      <View style={[styles.cell, { flex: 1 }]}>
        {item.file_name && item.file_name !== 'N/A' ? (
          <TouchableOpacity onPress={() => {
            if (item.file_url) {
              Linking.openURL(`${TUNNEL_URL}${item.file_url}`);
            } else {
              Linking.openURL(getApiUrl(`/Organisation/api/processus-docs/${item.text_ref}/open/`));
            }
          }}>
             <Text style={[styles.cellText, { color: '#3b82f6', textDecorationLine: 'underline' }]} numberOfLines={1}>
               {item.file_name}
             </Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.cellText}>-</Text>
        )}
      </View>
      <View style={[styles.cell, { width: 70, flexDirection: 'row', justifyContent: 'center' }]}>
        <TouchableOpacity onPress={() => handleEdit(item)} style={styles.miniActionBtn}>
          <Feather name="edit-2" size={14} color="#f59e0b" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.miniActionBtn}>
          <Feather name="trash-2" size={14} color="#ef4444" />
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
          <Text style={styles.title}>Textes de Référence</Text>
        </View>
        <TouchableOpacity onPress={handleAdd} style={styles.addBtn}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Feather name="search" size={18} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.tableContainer}>
        {renderHeader()}
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={data.filter(item => item.norme.toLowerCase().includes(search.toLowerCase()))}
            renderItem={renderItem}
            keyExtractor={item => item.id.toString()}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />
            }
            ListEmptyComponent={<Text style={styles.emptyText}>Aucun résultat</Text>}
          />
        )}
      </View>

      <Modal visible={modalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                 <Text style={styles.modalTitle}>{isEditing ? 'Modifier' : 'Nouveau'}</Text>
                 <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={24} color="#64748b" /></TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Norme</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ex: ISO 9001"
                value={formData.norme}
                onChangeText={(text) => setFormData({ ...formData, norme: text })}
              />

              <Text style={styles.inputLabel}>Fichier associé</Text>
              <TouchableOpacity 
                style={[styles.pickerContainer, isSelectingDoc && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginBottom: 0 }]} 
                onPress={() => setIsSelectingDoc(!isSelectingDoc)}
              >
                <Text style={[styles.pickerText, !formData.text_ref && { color: '#94a3b8' }]}>
                  {formData.text_ref ? docs.find(d => d.id === formData.text_ref)?.name : "Choisir un document..."}
                </Text>
                <Ionicons name={isSelectingDoc ? "chevron-up" : "chevron-down"} size={18} color="#3b82f6" />
              </TouchableOpacity>

              {isSelectingDoc && (
                <View style={styles.inlineDropdown}>
                  {docs.map(item => (
                    <TouchableOpacity 
                      key={item.id}
                      style={styles.inlineItem} 
                      onPress={() => { setFormData({...formData, text_ref: item.id}); setIsSelectingDoc(false); }}
                    >
                      <Text style={[styles.inlineItemText, formData.text_ref === item.id && styles.inlineItemActive]}>{item.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
                  <Text style={styles.cancelBtnText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSubmit} style={styles.saveBtn}>
                  <Text style={styles.saveBtnText}>Enregistrer</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  menuBtn: { padding: 5, marginRight: 5 },
  backBtn: { padding: 5 },
  title: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginLeft: 5 },
  addBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center' },
  
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', marginHorizontal: 12, marginTop: 10, marginBottom: 5, paddingHorizontal: 12, borderRadius: 8, height: 38 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 13, color: '#1e293b' },
  
  tableContainer: { flex: 1, marginTop: 5 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerCell: { padding: 8, justifyContent: 'center' },
  headerText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  cell: { padding: 8, justifyContent: 'center' },
  cellText: { fontSize: 12, color: '#475569' },
  miniActionBtn: { padding: 5, marginHorizontal: 2 },
  
  emptyText: { textAlign: 'center', marginTop: 40, color: '#94a3b8', fontSize: 12 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: '#fff', borderRadius: 15, padding: 15, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#64748b', marginBottom: 6 },
  modalInput: { backgroundColor: '#f8fafc', borderBottomWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 10, marginBottom: 15, fontSize: 14, color: '#1e293b' },
  
  pickerContainer: { backgroundColor: '#f8fafc', borderBottomWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  pickerText: { fontSize: 14, color: '#1e293b' },
  inlineDropdown: { backgroundColor: '#fff', borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#e2e8f0', borderBottomLeftRadius: 8, borderBottomRightRadius: 8, paddingHorizontal: 8, marginBottom: 15 },
  inlineItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  inlineItemText: { fontSize: 13, color: '#475569' },
  inlineItemActive: { color: '#3b82f6', fontWeight: '700' },
 
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  cancelBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  cancelBtnText: { color: '#64748b', fontWeight: '600', fontSize: 13 },
  saveBtn: { backgroundColor: '#3b82f6', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 6, marginLeft: 10 },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
});

export default TextRefManagementScreen;

