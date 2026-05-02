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

const SousCritereManagementScreen = () => {
  const router = useRouter();
  const { openSidebar } = useSidebar();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState([]);
  const [criteres, setCriteres] = useState([]);
  const [typeCotations, setTypeCotations] = useState([]);
  const [search, setSearch] = useState('');
  
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSelectingCritere, setIsSelectingCritere] = useState(false);
  const [isSelectingCotation, setIsSelectingCotation] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({ 
    critere: '', 
    content: '', 
    type_cotation: '', 
    reaction: ''
  });

  const fetchData = async () => {
    try {
      const [res, critRes, cotRes] = await Promise.all([
        api.get(getApiUrl(API_PATHS.SOUS_CRITERES)),
        api.get(getApiUrl(API_PATHS.CRITERES)).catch(() => ({ data: { data: [] } })),
        api.get(getApiUrl(API_PATHS.TYPE_COTATION)).catch(() => ({ data: { data: [] } })),
      ]);
      setData(res.data.data || []);
      setCriteres(critRes.data.data || []);
      setTypeCotations(cotRes.data.data || []);
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
    setFormData({ critere: '', content: '', type_cotation: '', reaction: '' });
    setIsSelectingCritere(false);
    setIsSelectingCotation(false);
    setModalVisible(true);
  };

  const handleEdit = (item) => {
    setIsEditing(true);
    setCurrentId(item.id);
    setFormData({ 
      critere: item.critere_id?.toString() || '', 
      content: item.content, 
      type_cotation: item.type_cotation_id?.toString() || '',
      reaction: item.reaction || ''
    });
    setIsSelectingCritere(false);
    setIsSelectingCotation(false);
    setModalVisible(true);
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Supprimer',
      'Êtes-vous sûr de vouloir supprimer ce sous-critère ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(getApiUrl(`${API_PATHS.SOUS_CRITERES}${id}/`));
              fetchData();
            } catch (error: any) {
              const msg = error.response?.data?.message || 'Impossible de supprimer';
              Alert.alert('Erreur', msg);
            }
          }
        },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!formData.content || !formData.critere) {
      Alert.alert('Erreur', 'Le contenu et le critère sont obligatoires');
      return;
    }

    try {
      const payload = {
        critere: parseInt(formData.critere),
        content: formData.content,
        type_cotation: formData.type_cotation ? parseInt(formData.type_cotation) : null,
        reaction: formData.reaction || null
      };

      if (isEditing) {
        await api.put(getApiUrl(`${API_PATHS.SOUS_CRITERES}${currentId}/`), payload);
      } else {
        await api.post(getApiUrl(API_PATHS.SOUS_CRITERES), payload);
      }
      setModalVisible(false);
      fetchData();
    } catch (error: any) {
      const msg = error.response?.data?.message || "Impossible d'enregistrer";
      Alert.alert('Erreur', msg);
    }
  };

  const renderHeader = () => (
    <View style={styles.tableHeader}>
      <View style={[styles.headerCell, { width: 22 }]}><Text style={styles.headerText}>ID</Text></View>
      <View style={[styles.headerCell, { flex: 0.8 }]}><Text style={styles.headerText}>Critère</Text></View>
      <View style={[styles.headerCell, { flex: 1.0 }]}><Text style={styles.headerText}>Contenu</Text></View>
      <View style={[styles.headerCell, { flex: 0.8 }]}><Text style={[styles.headerText, { textAlign: 'center' }]}>{"Type\nCotation"}</Text></View>
      <View style={[styles.headerCell, { flex: 0.9 }]}><Text style={[styles.headerText, { textAlign: 'center' }]}>Réaction</Text></View>
      <View style={[styles.headerCell, { flex: 1.1 }]}><Text style={[styles.headerText, { textAlign: 'center' }]}>{"Preuves\nAttendues"}</Text></View>
      <View style={[styles.headerCell, { flex: 0.7 }]}><Text style={[styles.headerText, { textAlign: 'center' }]}>{"Type\nAudit"}</Text></View>
      <View style={[styles.headerCell, { width: 60 }]}><Text style={[styles.headerText, { textAlign: 'center' }]}>Actions</Text></View>
    </View>
  );

  const renderItem = ({ item }) => {
    const proofNames = item.preuves_attendues ? item.preuves_attendues.map(p => p.name).join(', ') : '-';
    
    return (
      <View style={styles.tableRow}>
        <View style={[styles.cell, { width: 22 }]}><Text style={styles.cellText}>#{item.id}</Text></View>
        <View style={[styles.cell, { flex: 0.8 }]}><Text style={styles.cellText}>{item.critere_name}</Text></View>
        <View style={[styles.cell, { flex: 1.0 }]}><Text style={[styles.cellText, { fontWeight: '600' }]}>{item.content}</Text></View>
        <View style={[styles.cell, { flex: 0.8 }]}><Text style={[styles.cellText, { textAlign: 'center' }]}>{item.type_cotation_name || '-'}</Text></View>
        <View style={[styles.cell, { flex: 0.9 }]}><Text style={[styles.cellText, { textAlign: 'center' }]}>{item.reaction || '-'}</Text></View>
        <View style={[styles.cell, { flex: 1.1 }]}><Text style={[styles.cellText, { textAlign: 'center' }]}>{proofNames}</Text></View>
        <View style={[styles.cell, { flex: 0.7 }]}><Text style={[styles.cellText, { textAlign: 'center' }]}>{item.type_audit_names || '-'}</Text></View>
        <View style={[styles.cell, { width: 60, flexDirection: 'row', justifyContent: 'center' }]}>
          <TouchableOpacity onPress={() => handleEdit(item)} style={styles.miniActionBtn}>
            <Feather name="edit-2" size={12} color="#f59e0b" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.miniActionBtn}>
            <Feather name="trash-2" size={12} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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
          <Text style={styles.title}>Sous-Critères</Text>
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
            data={data.filter(item => item.content.toLowerCase().includes(search.toLowerCase()) || (item.critere_name && item.critere_name.toLowerCase().includes(search.toLowerCase())))}
            renderItem={renderItem}
            keyExtractor={item => item.id.toString()}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />
            }
            ListEmptyComponent={<Text style={styles.emptyText}>Aucun résultat</Text>}
            contentContainerStyle={{ paddingBottom: 20 }}
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

              <Text style={styles.inputLabel}>Critère Parent</Text>
              <TouchableOpacity 
                style={[styles.pickerContainer, isSelectingCritere && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginBottom: 0 }]} 
                onPress={() => setIsSelectingCritere(!isSelectingCritere)}
              >
                <Text style={[styles.pickerText, !formData.critere && { color: '#94a3b8' }]}>
                  {formData.critere ? criteres.find(c => c.id.toString() === formData.critere)?.name : "Choisir un critère..."}
                </Text>
                <Ionicons name={isSelectingCritere ? "chevron-up" : "chevron-down"} size={18} color="#3b82f6" />
              </TouchableOpacity>
              {isSelectingCritere && (
                <View style={styles.inlineDropdown}>
                  {criteres.map(item => (
                    <TouchableOpacity key={item.id} style={styles.inlineItem} onPress={() => { setFormData({...formData, critere: item.id.toString()}); setIsSelectingCritere(false); }}>
                      <Text style={styles.inlineItemText}>{item.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={styles.inputLabel}>Contenu du Sous-Critère</Text>
              <TextInput
                style={[styles.modalInput, { height: 60 }]}
                placeholder="Ex: Vérifier..."
                multiline={true}
                value={formData.content}
                onChangeText={(text) => setFormData({ ...formData, content: text })}
              />

              <Text style={styles.inputLabel}>Réaction attendue</Text>
              <TextInput
                style={[styles.modalInput, { height: 60 }]}
                placeholder="Action à entreprendre..."
                multiline={true}
                value={formData.reaction}
                onChangeText={(text) => setFormData({ ...formData, reaction: text })}
              />

              <Text style={styles.inputLabel}>Type de Cotation</Text>
              <TouchableOpacity 
                style={[styles.pickerContainer, isSelectingCotation && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginBottom: 0 }]} 
                onPress={() => setIsSelectingCotation(!isSelectingCotation)}
              >
                <Text style={[styles.pickerText, !formData.type_cotation && { color: '#94a3b8' }]}>
                  {formData.type_cotation ? typeCotations.find(t => t.id.toString() === formData.type_cotation)?.name : "Choisir un type..."}
                </Text>
                <Ionicons name={isSelectingCotation ? "chevron-up" : "chevron-down"} size={18} color="#3b82f6" />
              </TouchableOpacity>
              {isSelectingCotation && (
                <View style={styles.inlineDropdown}>
                  {typeCotations.map(item => (
                    <TouchableOpacity key={item.id} style={styles.inlineItem} onPress={() => { setFormData({...formData, type_cotation: item.id.toString()}); setIsSelectingCotation(false); }}>
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
  headerCell: { padding: 2, justifyContent: 'center' },
  headerText: { fontSize: 9, fontWeight: '700', color: '#1e293b' },
  
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'center' },
  cell: { padding: 4, justifyContent: 'center' },
  cellText: { fontSize: 9, color: '#475569' },
  miniActionBtn: { padding: 4, marginHorizontal: 1 },
  
  emptyText: { textAlign: 'center', marginTop: 40, color: '#94a3b8', fontSize: 12 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: '#fff', borderRadius: 15, padding: 15, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#64748b', marginBottom: 6 },
  modalInput: { backgroundColor: '#f8fafc', borderBottomWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 10, marginBottom: 15, fontSize: 14, color: '#1e293b', textAlignVertical: 'top' },
  
  pickerContainer: { backgroundColor: '#f8fafc', borderBottomWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  pickerText: { fontSize: 14, color: '#1e293b' },
  inlineDropdown: { backgroundColor: '#fff', borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#e2e8f0', borderBottomLeftRadius: 8, borderBottomRightRadius: 8, paddingHorizontal: 8, marginBottom: 15 },
  inlineItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  inlineItemText: { fontSize: 13, color: '#475569' },
 
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  cancelBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  cancelBtnText: { color: '#64748b', fontWeight: '600', fontSize: 13 },
  saveBtn: { backgroundColor: '#3b82f6', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 6, marginLeft: 10 },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
});

export default SousCritereManagementScreen;

