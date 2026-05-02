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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import api, { getApiUrl, API_PATHS } from '../src/utils/api';
import { useSidebar } from '../src/context/SidebarContext';

const PreuveAttendueManagementScreen = () => {
  const router = useRouter();
  const { openSidebar } = useSidebar();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState([]);
  const [typePreuves, setTypePreuves] = useState([]);
  const [search, setSearch] = useState('');
  
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSelectingType, setIsSelectingType] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({ name: '', type_preuve: '' });

  const fetchData = async () => {
    try {
      const [res, typeRes] = await Promise.all([
        api.get(getApiUrl(API_PATHS.PREUVE_ATTENDUE)),
        api.get(getApiUrl(API_PATHS.TYPE_PREUVE)).catch(() => ({ data: { data: [] } })),
      ]);
      setData(res.data.data || []);
      setTypePreuves(typeRes.data.data || []);
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
    setFormData({ name: '', type_preuve: '' });
    setIsSelectingType(false);
    setModalVisible(true);
  };

  const handleEdit = (item) => {
    setIsEditing(true);
    setCurrentId(item.id);
    setFormData({ 
      name: item.name, 
      type_preuve: item.type_preuve || '' 
    });
    setIsSelectingType(false);
    setModalVisible(true);
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Supprimer',
      'Êtes-vous sûr de vouloir supprimer cette preuve attendue ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(getApiUrl(`${API_PATHS.PREUVE_ATTENDUE}${id}/`));
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
    if (!formData.name) {
      Alert.alert('Erreur', 'Le nom est obligatoire');
      return;
    }

    try {
      const payload = { 
        name: formData.name, 
        type_preuve: formData.type_preuve || null 
      };
      if (isEditing) {
        await api.put(getApiUrl(`${API_PATHS.PREUVE_ATTENDUE}${currentId}/`), payload);
      } else {
        await api.post(getApiUrl(API_PATHS.PREUVE_ATTENDUE), payload);
      }
      setModalVisible(false);
      fetchData();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'enregistrer');
    }
  };

  const renderHeader = () => (
    <View style={styles.tableHeader}>
      <View style={[styles.headerCell, { width: 30 }]}><Text style={styles.headerText}>ID</Text></View>
      <View style={[styles.headerCell, { flex: 1 }]}><Text style={styles.headerText}>Désignation</Text></View>
      <View style={[styles.headerCell, { width: 100 }]}><Text style={[styles.headerText, { textAlign: 'center' }]}>Type de Preuve</Text></View>
      <View style={[styles.headerCell, { width: 80 }]}><Text style={[styles.headerText, { textAlign: 'center' }]}>Actions</Text></View>
    </View>
  );

  const renderItem = ({ item }) => (
    <View style={styles.tableRow}>
      <View style={[styles.cell, { width: 30 }]}><Text style={styles.cellText}>#{item.id}</Text></View>
      <View style={[styles.cell, { flex: 1 }]}><Text style={[styles.cellText, { fontWeight: '700' }]} numberOfLines={2}>{item.name}</Text></View>
      <View style={[styles.cell, { width: 100, alignItems: 'center' }]}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{item.type_preuve__name || 'Général'}</Text>
        </View>
      </View>
      <View style={[styles.cell, { width: 80, flexDirection: 'row', justifyContent: 'center' }]}>
        <TouchableOpacity style={styles.miniActionBtn}>
          <Feather name="eye" size={12} color="#06b6d4" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleEdit(item)} style={styles.miniActionBtn}>
          <Feather name="edit-3" size={12} color="#f59e0b" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.miniActionBtn}>
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
          <Text style={styles.titleTitle}>Preuves Attendues</Text>
        </View>
        <TouchableOpacity onPress={handleAdd} style={styles.addBtn}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher par désignation..."
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
            ListEmptyComponent={<Text style={styles.emptyText}>Aucune preuve trouvée</Text>}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>

      <Modal visible={modalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                 <Text style={styles.modalTitle}>{isEditing ? 'Modifier Preuve' : 'Nouvelle Preuve'}</Text>
                 <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={24} color="#64748b" /></TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Désignation</Text>
              <TextInput
                style={[styles.modalInput, { height: 60 }]}
                placeholder="Ex: Facture d'entretien..."
                multiline={true}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />

              <Text style={styles.inputLabel}>Type de Preuve</Text>
              <TouchableOpacity 
                style={[styles.pickerContainer, isSelectingType && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginBottom: 0 }]} 
                onPress={() => setIsSelectingType(!isSelectingType)}
              >
                <Text style={[styles.pickerText, !formData.type_preuve && { color: '#94a3b8' }]}>
                  {formData.type_preuve ? typePreuves.find(t => t.id === formData.type_preuve)?.name : "Choisir un type..."}
                </Text>
                <Ionicons name={isSelectingType ? "chevron-up" : "chevron-down"} size={18} color="#0891b2" />
              </TouchableOpacity>
              {isSelectingType && (
                <View style={styles.inlineDropdown}>
                  {typePreuves.map(item => (
                    <TouchableOpacity key={item.id} style={styles.inlineItem} onPress={() => { setFormData({...formData, type_preuve: item.id}); setIsSelectingType(false); }}>
                      <Text style={styles.inlineItemText}>{item.name}</Text>
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
  header: { height: 55, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  menuBtn: { padding: 5, marginRight: 5 },
  backBtn: { padding: 5 },
  titleTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginLeft: 5 },
  addBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center' },
  
  searchSection: { padding: 12, backgroundColor: '#f8fafc' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, height: 38, borderWidth: 1, borderColor: '#e2e8f0' },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 12, color: '#1e293b' },
  
  tableContainer: { flex: 1, marginTop: 5 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 8 },
  headerCell: { paddingHorizontal: 1, justifyContent: 'center' },
  headerText: { fontSize: 9, fontWeight: '800', color: '#1e293b' },
  
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'center', minHeight: 45 },
  cell: { paddingHorizontal: 1, justifyContent: 'center' },
  cellText: { fontSize: 9, color: '#1e293b' },
  
  typeBadge: { backgroundColor: '#155e75', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  typeText: { color: '#fff', fontSize: 8, fontWeight: '800' },
  
  miniActionBtn: { padding: 5, marginHorizontal: 1 },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#94a3b8', fontSize: 12 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '92%', backgroundColor: '#fff', borderRadius: 15, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#64748b', marginBottom: 8 },
  modalInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, marginBottom: 20, fontSize: 14, color: '#1e293b', textAlignVertical: 'top' },
  
  pickerContainer: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  pickerText: { fontSize: 14, color: '#1e293b' },
  inlineDropdown: { backgroundColor: '#fff', borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#e2e8f0', borderBottomLeftRadius: 10, borderBottomRightRadius: 10, paddingHorizontal: 10, marginBottom: 20 },
  inlineItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  inlineItemText: { fontSize: 14, color: '#475569' },

  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 15 },
  cancelBtnText: { color: '#64748b', fontWeight: '600', fontSize: 14 },
  saveBtn: { backgroundColor: '#0891b2', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, marginLeft: 10 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

export default PreuveAttendueManagementScreen;

