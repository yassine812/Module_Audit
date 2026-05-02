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

const ChapitreManagementScreen = () => {
  const router = useRouter();
  const { openSidebar } = useSidebar();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chapitres, setChapitres] = useState([]);
  const [textRefs, setTextRefs] = useState([]);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [isSelectingRef, setIsSelectingRef] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({ name: '', text_ref: '', page: '' });

  const fetchData = async () => {
    try {
      const [res, refRes] = await Promise.all([
        api.get(getApiUrl(API_PATHS.CHAPITRES)),
        api.get(getApiUrl(API_PATHS.TEXT_REFS)).catch(() => ({ data: { data: [] } })),
      ]);
      setChapitres(res.data.data || []);
      setTextRefs(refRes.data.data || []);
    } catch (error) { 
      console.error(error);
      Alert.alert('Erreur', 'Impossible de joindre le serveur');
    } finally { 
      setLoading(false); 
      setRefreshing(false); 
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    if (!formData.name) return Alert.alert('Erreur', 'Nom requis');
    try {
      const payload = { 
        name: formData.name, 
        text_ref: formData.text_ref || null, 
        page: formData.page ? parseInt(formData.page) : null 
      };
      if (isEditing) {
        await api.put(getApiUrl(`${API_PATHS.CHAPITRES}${currentId}/`), payload);
      } else {
        await api.post(getApiUrl(API_PATHS.CHAPITRES), payload);
      }
      setModalVisible(false);
      fetchData();
    } catch (error) { 
      Alert.alert('Erreur', "Échec de l'enregistrement"); 
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Supprimer', 'Voulez-vous supprimer ce chapitre ?', [
      { text: 'Non', style: 'cancel' },
      { 
        text: 'Oui', 
        style: 'destructive', 
        onPress: async () => {
          try {
            await api.delete(getApiUrl(`${API_PATHS.CHAPITRES}${id}/`));
            fetchData();
          } catch (e) {
            Alert.alert('Erreur', 'Impossible de supprimer');
          }
        }
      }
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.row}>
      <View style={[styles.cell, { width: 35 }]}><Text style={styles.cellText}>#{item.id}</Text></View>
      <View style={[styles.cell, { flex: 2 }]}><Text style={[styles.cellText, styles.mainText]} numberOfLines={1}>{item.name}</Text></View>
      <View style={[styles.cell, { flex: 1 }]}><Text style={styles.cellText} numberOfLines={1}>{item.text_ref_norme || 'N/A'}</Text></View>
      <View style={[styles.cell, { width: 45, alignItems: 'center' }]}><Text style={styles.cellText}>{item.page || '-'}</Text></View>
      <View style={[styles.cell, { width: 55, flexDirection: 'row', justifyContent: 'center' }]}>
        <TouchableOpacity onPress={() => { setIsEditing(true); setCurrentId(item.id); setFormData({ name: item.name, text_ref: item.text_ref || '', page: item.page ? item.page.toString() : '' }); setIsSelectingRef(false); setModalVisible(true); }} style={styles.miniActionBtn}>
            <Feather name="edit-2" size={13} color="#f59e0b" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.miniActionBtn}>
            <Feather name="trash-2" size={13} color="#ef4444" />
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
          <Text style={styles.headerTitle}>Chapitres</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => { setIsEditing(false); setFormData({ name: '', text_ref: '', page: '' }); setIsSelectingRef(false); setModalVisible(true); }}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.tableHeader}>
        <Text style={[styles.columnLabel, { width: 35 }]}>ID</Text>
        <Text style={[styles.columnLabel, { flex: 2 }]}>Chapitre</Text>
        <Text style={[styles.columnLabel, { flex: 1 }]}>Norme</Text>
        <Text style={[styles.columnLabel, { width: 45, textAlign: 'center' }]}>Page</Text>
        <Text style={[styles.columnLabel, { width: 70, textAlign: 'center' }]}>Actions</Text>
      </View>

      <View style={styles.tableContainer}>
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={chapitres}
            renderItem={renderItem}
            keyExtractor={item => item.id.toString()}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={<Text style={styles.emptyText}>Aucun chapitre trouvé</Text>}
          />
        )}
      </View>

      <Modal animationType="fade" transparent visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{isEditing ? 'Modifier' : 'Nouveau'}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={24} color="#64748b" /></TouchableOpacity>
              </View>
              
              <Text style={styles.inputLabel}>Titre du Chapitre</Text>
              <TextInput style={styles.input} placeholder="Ex: Chapitre 1" value={formData.name} onChangeText={t => setFormData({...formData, name: t})} />
              
              <Text style={styles.inputLabel}>Référentiel (Norme)</Text>
              <TouchableOpacity 
                style={[styles.pickerContainer, isSelectingRef && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginBottom: 0 }]} 
                onPress={() => setIsSelectingRef(!isSelectingRef)}
              >
                <Text style={[styles.pickerText, !formData.text_ref && { color: '#94a3b8' }]}>
                  {formData.text_ref ? textRefs.find(r => r.id === formData.text_ref)?.norme : "Choisir une norme..."}
                </Text>
                <Ionicons name={isSelectingRef ? "chevron-up" : "chevron-down"} size={18} color="#3b82f6" />
              </TouchableOpacity>
              {isSelectingRef && (
                <View style={styles.inlineDropdown}>
                  {textRefs.map(item => (
                    <TouchableOpacity key={item.id} style={styles.inlineItem} onPress={() => { setFormData({...formData, text_ref: item.id}); setIsSelectingRef(false); }}>
                      <Text style={styles.inlineItemText}>{item.norme}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={styles.inputLabel}>Page (Optionnel)</Text>
              <TextInput style={styles.input} placeholder="Ex: 12" keyboardType="numeric" value={formData.page} onChangeText={t => setFormData({...formData, page: t})} />
              
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
  header: { height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  menuBtn: { padding: 5, marginRight: 5 },
  backBtn: { padding: 5 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginLeft: 5 },
  addBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center' },
  
  tableContainer: { flex: 1, marginTop: 5 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  columnLabel: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  
  listContent: { paddingBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  cell: { paddingHorizontal: 2 },
  cellText: { fontSize: 12, color: '#475569' },
  mainText: { fontWeight: '600', color: '#1e293b' },
  miniActionBtn: { padding: 5, marginHorizontal: 2 },
  
  emptyText: { textAlign: 'center', marginTop: 40, color: '#94a3b8', fontSize: 12 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { backgroundColor: '#fff', width: '90%', padding: 15, borderRadius: 15, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#64748b', marginBottom: 6 },
  input: { backgroundColor: '#f8fafc', borderBottomWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 10, fontSize: 14, color: '#1e293b', marginBottom: 15 },
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

export default ChapitreManagementScreen;

