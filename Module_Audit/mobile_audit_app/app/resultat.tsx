import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  TextInput,
  Alert,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api, { getApiUrl, API_PATHS } from '../src/utils/api';
import { useSidebar } from '../src/context/SidebarContext';

const ResultatAuditListScreen = () => {
  const router = useRouter();
  const { openSidebar } = useSidebar();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState('Toutes');
  const [showSectionDropdown, setShowSectionDropdown] = useState(false);

  const fetchData = async () => {
    try {
      const [res, secRes] = await Promise.all([
        api.get(getApiUrl(API_PATHS.RESULTATS)),
        api.get(getApiUrl(API_PATHS.SECTIONS)).catch(e => ({ data: { data: [] } }))
      ]);
      setData(res.data.data || []);
      setSections(secRes.data.data || []);
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Impossible de charger les résultats');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const renderHeader = () => (
    <View style={styles.tableHeader}>
      <View style={[styles.headerCell, { width: 25 }]}><Text style={styles.headerText} numberOfLines={1}>ID ▲</Text></View>
      <View style={[styles.headerCell, { flex: 1.8 }]}><Text style={styles.headerText} numberOfLines={1}>Sujet / Réf.</Text></View>
      <View style={[styles.headerCell, { width: 45 }]}><Text style={styles.headerText} numberOfLines={1}>Auditeur</Text></View>
      <View style={[styles.headerCell, { width: 45 }]}><Text style={styles.headerText} numberOfLines={1}>Site</Text></View>
      <View style={[styles.headerCell, { width: 55 }]}><Text style={styles.headerText} numberOfLines={1}>Date</Text></View>
      <View style={[styles.headerCell, { width: 55, alignItems: 'center' }]}><Text style={[styles.headerText, { textAlign: 'center' }]} numberOfLines={1}>SCORE</Text></View>
      <View style={[styles.headerCell, { width: 85, alignItems: 'center' }]}><Text style={[styles.headerText, { textAlign: 'center' }]} numberOfLines={1}>ACTIONS</Text></View>
    </View>
  );

  const renderItem = ({ item }) => {
    return (
      <View style={styles.tableRow}>
        <View style={[styles.cell, { width: 25 }]}><Text style={styles.cellText}>#{item.id}</Text></View>
        <View style={[styles.cell, { flex: 1.8 }]}>
            <Text style={[styles.cellText, { fontWeight: '700' }]} numberOfLines={1}>{item.audit_desc || item.sujet || 'Sans nom'}</Text>
            <Text style={[styles.cellText, { fontSize: 7, color: '#94a3b8' }]}>{item.ref_audit || item.id}</Text>
        </View>
        <View style={[styles.cell, { width: 45 }]}><Text style={styles.cellText} numberOfLines={1}>{item.auditeur_name || 'admin'}</Text></View>
        <View style={[styles.cell, { width: 45 }]}><Text style={styles.cellText} numberOfLines={1}>{item.site_name || 'N/A'}</Text></View>
        <View style={[styles.cell, { width: 55 }]}><Text style={styles.cellText}>{item.date_audit ? item.date_audit.split('T')[0].split('-').reverse().join('/') : '-'}</Text></View>
        <View style={[styles.cell, { width: 55, alignItems: 'center' }]}>
            <View style={[styles.scoreBadge, { paddingHorizontal: 2 }]}>
                <Text style={[styles.scoreText, { fontSize: 8 }]}>{(parseFloat(item.score_audit || 0) * 100).toFixed(1)}%</Text>
            </View>
        </View>
        <View style={[styles.cell, { width: 85, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }]}>
            <TouchableOpacity style={styles.miniAction} onPress={() => router.push({ pathname: '/report', params: { id: item.resultat_id || item.id } })}>
                <Feather name="eye" size={10} color="#06b6d4" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconBtn, { backgroundColor: '#64748b' }]} onPress={() => router.push({ pathname: '/report', params: { id: item.resultat_id || item.id } })}>
                <MaterialCommunityIcons name="file-document-outline" size={10} color="#fff" />
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
          <Text style={styles.headerTitle}>Résultats d'Audit</Text>
        </View>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color="#94a3b8" />
          <TextInput 
            placeholder="Rechercher par sujet, auditeur ou site..." 
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#94a3b8"
          />
        </View>
        <View style={styles.filterSectionContainer}>
          <Text style={styles.filterLabel}>Filtrer par Section :</Text>
          <TouchableOpacity 
            style={styles.dropdownTrigger}
            onPress={() => setShowSectionDropdown(true)}
          >
            <View style={styles.dropdownTriggerLeft}>
              <MaterialCommunityIcons name="office-building" size={16} color="#64748b" />
              <Text style={styles.dropdownTriggerText}>{selectedSection}</Text>
            </View>
            <Ionicons name="chevron-down" size={16} color="#64748b" />
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={showSectionDropdown} transparent={true} animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowSectionDropdown(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.dropdownContainer}>
              <View style={styles.dropdownHeader}>
                <Text style={styles.dropdownTitle}>Sélectionnez une section</Text>
                <TouchableOpacity onPress={() => setShowSectionDropdown(false)}>
                  <Ionicons name="close" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 250 }}>
                {['Toutes', ...sections.map(s => s.name)].map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.dropdownItem, selectedSection === tab && styles.dropdownItemActive]}
                    onPress={() => {
                      setSelectedSection(tab);
                      setShowSectionDropdown(false);
                    }}
                  >
                    <Text style={[styles.dropdownItemText, selectedSection === tab && styles.dropdownItemTextActive]}>
                      {tab}
                    </Text>
                    {selectedSection === tab && (
                      <Ionicons name="checkmark" size={16} color="#3b82f6" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <View style={styles.tableContainer}>
        {renderHeader()}
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={data.filter(item => {
              const matchesSearch = (item.audit_desc || item.sujet || '').toLowerCase().includes(search.toLowerCase()) ||
                                   (item.auditeur_name || '').toLowerCase().includes(search.toLowerCase());
              const matchesSection = selectedSection === 'Toutes' || item.departement_name === selectedSection;
              const isFinished = item.status === 'termine';
              return matchesSearch && matchesSection && isFinished;
            })}
            renderItem={renderItem}
            keyExtractor={item => item.id.toString()}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={<Text style={styles.emptyText}>Aucun résultat terminé trouvé</Text>}
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
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginLeft: 5 },
  
  searchSection: { padding: 12, backgroundColor: '#f8fafc' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, height: 42, borderWidth: 1, borderColor: '#e2e8f0' },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 12, color: '#1e293b' },
  
  filterSectionContainer: { marginTop: 10 },
  filterLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 6 },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  dropdownTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownTriggerText: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  dropdownItemActive: {
    backgroundColor: '#f0f9ff',
  },
  dropdownItemText: {
    fontSize: 13,
    color: '#475569',
  },
  dropdownItemTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  
  tableContainer: { flex: 1, marginTop: 10 },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 10, backgroundColor: '#fff' },
  headerCell: { paddingHorizontal: 1, justifyContent: 'center' },
  headerText: { fontSize: 8, fontWeight: '800', color: '#1e293b' },
  
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'center', minHeight: 48 },
  cell: { paddingHorizontal: 1, justifyContent: 'center' },
  cellText: { fontSize: 9, color: '#1e293b' },
  
  scoreBadge: { backgroundColor: '#f8fafc', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#e2e8f0' },
  scoreText: { color: '#334155', fontSize: 8, fontWeight: '700' },
  
  miniAction: { padding: 5, marginHorizontal: 2 },
  iconBtn: { width: 22, height: 22, borderRadius: 5, justifyContent: 'center', alignItems: 'center', marginHorizontal: 1 },
  
  emptyText: { textAlign: 'center', marginTop: 40, color: '#94a3b8', fontSize: 12 },
});

export default ResultatAuditListScreen;
