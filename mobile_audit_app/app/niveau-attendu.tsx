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

const NiveauAttenduManagementScreen = () => {
  const router = useRouter();
  const { openSidebar } = useSidebar();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({ valeur: '', commentaire: '' });

  const fetchData = async () => {
    try {
      const res = await api.get(getApiUrl(API_PATHS.NIVEAU_ATTENDU));
      setData(res.data.data || []);
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
    setFormData({ valeur: '', commentaire: '' });
    setModalVisible(true);
  };

  const handleEdit = (item) => {
    setIsEditing(true);
    setCurrentId(item.id);
    setFormData({ 
      valeur: item.valeur.toString(), 
      commentaire: item.commentaire 
    });
    setModalVisible(true);
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Supprimer',
      'Êtes-vous sûr de vouloir supprimer ce niveau attendu ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(getApiUrl(`${API_PATHS.NIVEAU_ATTENDU}${id}/`));
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
    if (!formData.valeur || !formData.commentaire) {
      Alert.alert('Erreur', 'Tous les champs sont obligatoires');
      return;
    }

    try {
      const payload = {
        valeur: parseFloat(formData.valeur.replace(',', '.')),
        commentaire: formData.commentaire
      };

      if (isEditing) {
        await api.put(getApiUrl(`${API_PATHS.NIVEAU_ATTENDU}${currentId}/`), payload);
      } else {
        await api.post(getApiUrl(API_PATHS.NIVEAU_ATTENDU), payload);
      }
      setModalVisible(false);
      fetchData();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'enregistrer');
    }
  };

  const renderHeader = () => (
    <View style={styles.tableHeader}>
      <View style={[styles.headerCell, { width: 35 }]}><Text style={styles.headerText}>ID</Text></View>
      <View style={[styles.headerCell, { width: 60 }]}><Text style={[styles.headerText, { textAlign: 'center' }]}>{"Valeur\n(%)"}</Text></View>
      <View style={[styles.headerCell, { flex: 1 }]}><Text style={styles.headerText}>Commentaire / Description</Text></View>
      <View style={[styles.headerCell, { width: 65 }]}><Text style={[styles.headerText, { textAlign: 'center' }]}>Actions</Text></View>
    </View>
  );

  const renderItem = ({ item }) => (
    <View style={styles.tableRow}>
      <View style={[styles.cell, { width: 35 }]}><Text style={styles.cellText}>#{item.id}</Text></View>
      <View style={[styles.cell, { width: 60, alignItems: 'center' }]}>
        <View style={styles.lvlBadge}>
          <Text style={styles.lvlText}>{item.valeur}%</Text>
        </View>
      </View>
      <View style={[styles.cell, { flex: 1 }]}><Text style={[styles.cellText, { fontWeight: '600' }]}>{item.commentaire}</Text></View>
      <View style={[styles.cell, { width: 65, flexDirection: 'row', justifyContent: 'center' }]}>
        <TouchableOpacity onPress={() => handleEdit(item)} style={styles.miniActionBtn}>
          <Feather name="edit-2" size={12} color="#f59e0b" />
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
          <Text style={styles.title}>Niveaux Attendus</Text>
        </View>
        <TouchableOpacity onPress={handleAdd} style={styles.addBtn}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Feather name="search" size={18} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par commentaire..."
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
            data={data.filter(item => item.commentaire && item.commentaire.toLowerCase().includes(search.toLowerCase()))}
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

              <Text style={styles.inputLabel}>Valeur du Niveau (%)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ex: 85"
                keyboardType="numeric"
                value={formData.valeur}
                onChangeText={(text) => setFormData({ ...formData, valeur: text })}
              />

              <Text style={styles.inputLabel}>Description / Commentaire</Text>
              <TextInput
                style={[styles.modalInput, { height: 80 }]}
                placeholder="Ex: Niveau minimum requis..."
                multiline={true}
                value={formData.commentaire}
                onChangeText={(text) => setFormData({ ...formData, commentaire: text })}
              />

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
  headerCell: { padding: 4, justifyContent: 'center' },
  headerText: { fontSize: 9, fontWeight: '700', color: '#1e293b' },
  
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'center' },
  cell: { padding: 4, justifyContent: 'center' },
  cellText: { fontSize: 9, color: '#475569' },
  lvlBadge: { backgroundColor: '#eff6ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#dbeafe' },
  lvlText: { color: '#2563eb', fontSize: 9, fontWeight: '700' },
  miniActionBtn: { padding: 4, marginHorizontal: 2 },
  
  emptyText: { textAlign: 'center', marginTop: 40, color: '#94a3b8', fontSize: 12 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: '#fff', borderRadius: 15, padding: 15, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#64748b', marginBottom: 6 },
  modalInput: { backgroundColor: '#f8fafc', borderBottomWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 10, marginBottom: 15, fontSize: 14, color: '#1e293b', textAlignVertical: 'top' },
 
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  cancelBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  cancelBtnText: { color: '#64748b', fontWeight: '600', fontSize: 13 },
  saveBtn: { backgroundColor: '#3b82f6', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 6, marginLeft: 10 },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
});

export default NiveauAttenduManagementScreen;

