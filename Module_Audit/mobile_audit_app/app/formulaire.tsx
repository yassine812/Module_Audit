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

const FormulaireManagementScreen = () => {
  const router = useRouter();
  const { openSidebar } = useSidebar();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState([]);
  const [processus, setProcessus] = useState([]);
  const [typesAudit, setTypesAudit] = useState([]);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [isSelectingProcessus, setIsSelectingProcessus] = useState(false);
  const [isSelectingType, setIsSelectingType] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({ name: '', processus: '', type_audit: '' });

  const fetchData = async () => {
    try {
      const [res, procRes, typeRes] = await Promise.all([
        api.get(getApiUrl(API_PATHS.FORMULAIRES)),
        api.get(getApiUrl(API_PATHS.PROCESSUS)).catch(() => ({ data: { data: [] } })),
        api.get(getApiUrl(API_PATHS.TYPES_AUDIT)).catch(() => ({ data: { data: [] } })),
      ]);
      setData(res.data.data || []);
      setProcessus(procRes.data.data || []);
      setTypesAudit(typeRes.data.data || []);
    } catch (error) { 
      console.error(error); 
    } finally { 
      setLoading(false); 
      setRefreshing(false); 
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    if (!formData.name) return Alert.alert('Erreur', 'Nom requis');
    try {
      const payload = { name: formData.name, processus: formData.processus || null, type_audit: formData.type_audit || null };
      if (isEditing) await api.put(getApiUrl(`${API_PATHS.FORMULAIRES}${currentId}/`), payload);
      else await api.post(getApiUrl(API_PATHS.FORMULAIRES), payload);
      setModalVisible(false);
      fetchData();
    } catch (error) { Alert.alert('Erreur', "Échec"); }
  };

  const handleCopy = async (id) => {
    try { 
      await api.post(getApiUrl(`${API_PATHS.FORMULAIRES}${id}/copy/`)); 
      fetchData(); 
    } catch (e) { 
      Alert.alert('Erreur', 'Échec de la copie'); 
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Supprimer', 'Voulez-vous supprimer ce formulaire ?', [
      { text: 'Non', style: 'cancel' },
      { text: 'Oui', style: 'destructive', onPress: async () => {
          try { 
            await api.delete(getApiUrl(`${API_PATHS.FORMULAIRES}${id}/`)); 
            fetchData(); 
          } catch (e) {
            Alert.alert('Erreur', 'Échec de la suppression');
          }
      }}
    ]);
  };

  const renderHeader = () => (
    <View style={styles.tableHeader}>
      <View style={[styles.headerCell, { width: 22 }]}><Text style={styles.headerText}>ID</Text></View>
      <View style={[styles.headerCell, { flex: 1.2 }]}><Text style={styles.headerText}>Nom</Text></View>
      <View style={[styles.headerCell, { width: 65 }]}><Text style={[styles.headerText, { textAlign: 'center' }]}>Type</Text></View>
      <View style={[styles.headerCell, { width: 50 }]}><Text style={[styles.headerText, { textAlign: 'center' }]}>Critères</Text></View>
      <View style={[styles.headerCell, { width: 60 }]}><Text style={[styles.headerText, { textAlign: 'center' }]}>Date</Text></View>
      <View style={[styles.headerCell, { width: 75 }]}><Text style={[styles.headerText, { textAlign: 'center' }]}>Actions</Text></View>
    </View>
  );

  const renderItem = ({ item }) => (
    <View style={styles.tableRow}>
      <View style={[styles.cell, { width: 22 }]}><Text style={styles.cellText}>#{item.id}</Text></View>
      <View style={[styles.cell, { flex: 1.2 }]}><Text style={[styles.cellText, { fontWeight: '600' }]} numberOfLines={1}>{item.name}</Text></View>
      <View style={[styles.cell, { width: 65, alignItems: 'center' }]}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{item.type_audit_name || '-'}</Text>
        </View>
      </View>
      <View style={[styles.cell, { width: 50, alignItems: 'center' }]}>
        <View style={styles.scBadge}>
          <Text style={styles.scText}>{item.sc_count} SC</Text>
        </View>
      </View>
      <View style={[styles.cell, { width: 60 }]}><Text style={[styles.cellText, { textAlign: 'center' }]}>{item.date_creation ? item.date_creation.split(' ')[0] : '-'}</Text></View>
      <View style={[styles.cell, { width: 75, flexDirection: 'row', justifyContent: 'center' }]}>
        <TouchableOpacity style={styles.miniAction} onPress={() => { router.push(`/formulaire/${item.id}`) }}>
            <Feather name="eye" size={11} color="#06b6d4" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.miniAction} onPress={() => { setIsEditing(true); setCurrentId(item.id); setFormData({ name: item.name, processus: item.processus_id || '', type_audit: item.type_audit_id || '' }); setModalVisible(true); }}>
            <Feather name="edit-2" size={11} color="#f59e0b" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.miniAction} onPress={() => handleCopy(item.id)}>
            <Feather name="copy" size={11} color="#64748b" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.miniAction} onPress={() => handleDelete(item.id)}>
            <Feather name="trash-2" size={11} color="#ef4444" />
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
          <Text style={styles.headerTitle}>Formulaires</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => { setIsEditing(false); setFormData({ name: '', processus: '', type_audit: '' }); setIsSelectingProcessus(false); setIsSelectingType(false); setModalVisible(true); }}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.tableContainer}>
        {renderHeader()}
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={data}
            renderItem={renderItem}
            keyExtractor={item => item.id.toString()}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={<Text style={styles.emptyText}>Aucun formulaire trouvé</Text>}
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
              
              <Text style={styles.inputLabel}>Nom du Formulaire</Text>
              <TextInput style={styles.input} value={formData.name} onChangeText={t => setFormData({...formData, name: t})} placeholder="Ex: Audit Qualité" />
              
              <Text style={styles.inputLabel}>Processus Associé</Text>
              <TouchableOpacity 
                style={[styles.pickerContainer, isSelectingProcessus && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginBottom: 0 }]} 
                onPress={() => { setIsSelectingProcessus(!isSelectingProcessus); setIsSelectingType(false); }}
              >
                <Text style={[styles.pickerText, !formData.processus && { color: '#94a3b8' }]}>
                  {formData.processus ? processus.find(p => p.id === formData.processus)?.name : "Choisir..."}
                </Text>
                <Ionicons name={isSelectingProcessus ? "chevron-up" : "chevron-down"} size={16} color="#3b82f6" />
              </TouchableOpacity>
              {isSelectingProcessus && (
                <View style={styles.inlineDropdown}>
                  {processus.map(p => (
                    <TouchableOpacity key={p.id} style={styles.inlineItem} onPress={() => { setFormData({...formData, processus: p.id}); setIsSelectingProcessus(false); }}>
                      <Text style={styles.inlineItemText}>{p.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={styles.inputLabel}>Type d'Audit</Text>
              <TouchableOpacity 
                style={[styles.pickerContainer, isSelectingType && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginBottom: 0 }]} 
                onPress={() => { setIsSelectingType(!isSelectingType); setIsSelectingProcessus(false); }}
              >
                <Text style={[styles.pickerText, !formData.type_audit && { color: '#94a3b8' }]}>
                  {formData.type_audit ? typesAudit.find(t => t.id === formData.type_audit)?.name : "Choisir..."}
                </Text>
                <Ionicons name={isSelectingType ? "chevron-up" : "chevron-down"} size={16} color="#3b82f6" />
              </TouchableOpacity>
              {isSelectingType && (
                <View style={styles.inlineDropdown}>
                  {typesAudit.map(t => (
                    <TouchableOpacity key={t.id} style={styles.inlineItem} onPress={() => { setFormData({...formData, type_audit: t.id}); setIsSelectingType(false); }}>
                      <Text style={styles.inlineItemText}>{t.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

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
  tableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerCell: { paddingHorizontal: 2, paddingVertical: 4, justifyContent: 'center' },
  headerText: { fontSize: 9, fontWeight: '700', color: '#1e293b' },
  
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'center', minHeight: 40 },
  cell: { paddingHorizontal: 2, paddingVertical: 4, justifyContent: 'center' },
  cellText: { fontSize: 9, color: '#475569' },
  typeBadge: { backgroundColor: '#06b6d4', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4, minWidth: 60, alignItems: 'center' },
  typeText: { color: '#fff', fontSize: 8, fontWeight: '700', textAlign: 'center' },
  scBadge: { backgroundColor: '#10b981', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 },
  scText: { color: '#fff', fontSize: 8, fontWeight: '800' },
  miniAction: { padding: 3, marginHorizontal: 1 },
  
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

export default FormulaireManagementScreen;

