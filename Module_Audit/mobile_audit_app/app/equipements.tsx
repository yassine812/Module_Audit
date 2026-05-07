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
import { Ionicons, Feather } from '@expo/vector-icons';
import api, { getApiUrl, API_PATHS } from '../src/utils/api';
import { useSidebar } from '../src/context/SidebarContext';

const EquipementManagementScreen = () => {
  const router = useRouter();
  const { openSidebar } = useSidebar();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState([]);
  const [types, setTypes] = useState([]);
  const [sites, setSites] = useState([]);
  const [search, setSearch] = useState('');
  
  const [modalVisible, setModalVisible] = useState(false);
  const [isSelectingType, setIsSelectingType] = useState(false);
  const [isSelectingSite, setIsSelectingSite] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    type_equipement: '', 
    site: '',
    serial_number: '',
    commentaire: ''
  });

  const fetchData = async () => {
    try {
      const [res, typeRes, siteRes] = await Promise.all([
        api.get(getApiUrl(API_PATHS.EQUIPEMENTS)),
        api.get(getApiUrl(API_PATHS.TYPE_EQUIPEMENT)),
        api.get(getApiUrl(API_PATHS.SITES)),
      ]);
      setData(res.data.data || []);
      setTypes(typeRes.data.data || []);
      setSites(siteRes.data.data || []);
    } catch (error) { 
      console.error(error); 
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally { 
      setLoading(false); 
      setRefreshing(false); 
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    if (!formData.name || !formData.type_equipement || !formData.site) {
        return Alert.alert('Erreur', 'Veuillez remplir les champs obligatoires');
    }
    try {
      if (isEditing) {
        await api.put(getApiUrl(`${API_PATHS.EQUIPEMENTS}${currentId}/`), formData);
      } else {
        await api.post(getApiUrl(API_PATHS.EQUIPEMENTS), formData);
      }
      setModalVisible(false);
      fetchData();
    } catch (error) { 
      Alert.alert('Erreur', 'Impossible d\'enregistrer'); 
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Supprimer', 'Voulez-vous vraiment supprimer cet équipement ?', [
      { text: 'Annuler', style: 'cancel' },
      { 
        text: 'Supprimer', 
        style: 'destructive', 
        onPress: async () => {
          try {
            await api.delete(getApiUrl(`${API_PATHS.EQUIPEMENTS}${id}/`));
            fetchData();
          } catch (e) {
            Alert.alert('Erreur', 'Impossible de supprimer');
          }
        } 
      }
    ]);
  };

  const renderHeader = () => (
    <View style={styles.tableHeader}>
      <View style={[styles.headerCell, { width: 30 }]}><Text style={styles.headerText}>ID</Text></View>
      <View style={[styles.headerCell, { flex: 1.5 }]}><Text style={styles.headerText}>Désignation</Text></View>
      <View style={[styles.headerCell, { flex: 1 }]}><Text style={[styles.headerText, { textAlign: 'center' }]}>Type</Text></View>
      <View style={[styles.headerCell, { flex: 1 }]}><Text style={[styles.headerText, { textAlign: 'center' }]}>Localisation</Text></View>
      <View style={[styles.headerCell, { width: 60 }]}><Text style={[styles.headerText, { textAlign: 'center' }]}>Actions</Text></View>
    </View>
  );

  const renderItem = ({ item }) => (
    <View style={styles.tableRow}>
      <View style={[styles.cell, { width: 30 }]}><Text style={styles.cellText}>#{item.id}</Text></View>
      <View style={[styles.cell, { flex: 1.5 }]}><Text style={[styles.cellText, { fontWeight: '700' }]} numberOfLines={1}>{item.name}</Text></View>
      <View style={[styles.cell, { flex: 1, alignItems: 'center' }]}>
        <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText} numberOfLines={1}>{item.type_equipement_name || '-'}</Text>
        </View>
      </View>
      <View style={[styles.cell, { flex: 1, alignItems: 'center' }]}><Text style={styles.cellText} numberOfLines={1}>{item.site_name || '-'}</Text></View>
      <View style={[styles.cell, { width: 60, flexDirection: 'row', justifyContent: 'center' }]}>
        <TouchableOpacity onPress={() => { 
            setIsEditing(true); 
            setCurrentId(item.id); 
            setFormData({ 
                name: item.name, 
                type_equipement: item.type_equipement_id, 
                site: item.site_id,
                serial_number: item.serial_number || '',
                commentaire: item.commentaire || ''
            }); 
            setIsSelectingType(false);
            setIsSelectingSite(false);
            setModalVisible(true); 
        }} style={styles.miniActionBtn}>
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
          <Text style={styles.headerTitle}>Équipements</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => { setIsEditing(false); setFormData({ name: '', type_equipement: '', site: '', serial_number: '', commentaire: '' }); setIsSelectingType(false); setIsSelectingSite(false); setModalVisible(true); }}>
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
            data={data.filter(e => e.name.toLowerCase().includes(search.toLowerCase()))}
            renderItem={renderItem}
            keyExtractor={item => item.id.toString()}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={<Text style={styles.emptyText}>Aucun résultat</Text>}
          />
        )}
      </View>

      <Modal animationType="fade" transparent visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{isEditing ? 'Modifier Équipement' : 'Nouvel Équipement'}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={24} color="#64748b" /></TouchableOpacity>
              </View>
              
              <Text style={styles.inputLabel}>Désignation</Text>
              <TextInput style={styles.modalInput} placeholder="Nom de l'équipement" value={formData.name} onChangeText={t => setFormData({...formData, name: t})} />

              <Text style={styles.inputLabel}>Type d'Équipement</Text>
              <TouchableOpacity 
                style={[styles.pickerContainer, isSelectingType && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginBottom: 0 }]} 
                onPress={() => { setIsSelectingType(!isSelectingType); setIsSelectingSite(false); }}
              >
                <Text style={[styles.pickerText, !formData.type_equipement && { color: '#94a3b8' }]}>
                  {formData.type_equipement ? types.find(t => t.id === formData.type_equipement)?.name : "Sélectionner type..."}
                </Text>
                <Ionicons name={isSelectingType ? "chevron-up" : "chevron-down"} size={18} color="#3b82f6" />
              </TouchableOpacity>
              {isSelectingType && (
                <View style={styles.inlineDropdown}>
                  {types.map(item => (
                    <TouchableOpacity key={item.id} style={styles.inlineItem} onPress={() => { setFormData({...formData, type_equipement: item.id}); setIsSelectingType(false); }}>
                      <Text style={styles.inlineItemText}>{item.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={styles.inputLabel}>Localisation (Site)</Text>
              <TouchableOpacity 
                style={[styles.pickerContainer, isSelectingSite && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginBottom: 0 }]} 
                onPress={() => { setIsSelectingSite(!isSelectingSite); setIsSelectingType(false); }}
              >
                <Text style={[styles.pickerText, !formData.site && { color: '#94a3b8' }]}>
                  {formData.site ? sites.find(s => s.id === formData.site)?.name : "Sélectionner site..."}
                </Text>
                <Ionicons name={isSelectingSite ? "chevron-up" : "chevron-down"} size={18} color="#3b82f6" />
              </TouchableOpacity>
              {isSelectingSite && (
                <View style={styles.inlineDropdown}>
                  {sites.map(item => (
                    <TouchableOpacity key={item.id} style={styles.inlineItem} onPress={() => { setFormData({...formData, site: item.id}); setIsSelectingSite(false); }}>
                      <Text style={styles.inlineItemText}>{item.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={styles.inputLabel}>N° de Série (Optionnel)</Text>
              <TextInput style={styles.modalInput} placeholder="Ex: SN-12345" value={formData.serial_number} onChangeText={t => setFormData({...formData, serial_number: t})} />
              
              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
                  <Text style={styles.cancelBtnText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
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
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginLeft: 5 },
  addBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center' },
  
  searchSection: { padding: 12, backgroundColor: '#f8fafc' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, height: 38, borderWidth: 1, borderColor: '#e2e8f0' },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 12, color: '#1e293b' },
  
  tableContainer: { flex: 1, marginTop: 5 },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 8, backgroundColor: '#fff' },
  headerCell: { paddingHorizontal: 1, justifyContent: 'center' },
  headerText: { fontSize: 9, fontWeight: '800', color: '#1e293b' },
  
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'center', minHeight: 45 },
  cell: { paddingHorizontal: 1, justifyContent: 'center' },
  cellText: { fontSize: 9, color: '#1e293b' },
  
  typeBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#e2e8f0' },
  typeBadgeText: { fontSize: 8, color: '#475569', fontWeight: '700' },
  
  miniActionBtn: { padding: 5, marginHorizontal: 1 },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#94a3b8', fontSize: 12 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '92%', backgroundColor: '#fff', borderRadius: 15, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#64748b', marginBottom: 8 },
  modalInput: { backgroundColor: '#f8fafc', borderBottomWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 10, marginBottom: 20, fontSize: 14, color: '#1e293b' },
  
  pickerContainer: { backgroundColor: '#f8fafc', borderBottomWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  pickerText: { fontSize: 14, color: '#1e293b' },
  inlineDropdown: { backgroundColor: '#fff', borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#e2e8f0', borderBottomLeftRadius: 8, borderBottomRightRadius: 8, paddingHorizontal: 10, marginBottom: 20 },
  inlineItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  inlineItemText: { fontSize: 14, color: '#475569' },
 
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 15 },
  cancelBtnText: { color: '#64748b', fontWeight: '600', fontSize: 14 },
  saveBtn: { backgroundColor: '#3b82f6', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, marginLeft: 10 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

export default EquipementManagementScreen;

