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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, Feather, MaterialCommunityIcons, Entypo } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api, { getApiUrl, API_PATHS } from '../src/utils/api';
import { useSidebar } from '../src/context/SidebarContext';

const ListeAuditScreen = () => {
  const router = useRouter();
  const { openSidebar } = useSidebar();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Tous');

  const fetchData = async () => {
    try {
      const res = await api.get(getApiUrl(API_PATHS.RESULTATS));
      setData(res.data.data || []);
    } catch (error) {
      console.error(error);
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
      <View style={[styles.headerCell, { width: 20 }]}><Text style={styles.headerText}>N°</Text></View>
      <View style={[styles.headerCell, { flex: 1 }]}><Text style={styles.headerText}>NOM AUDIT</Text></View>
      <View style={[styles.headerCell, { width: 55 }]}><Text style={[styles.headerText, { textAlign: 'center' }]}>DÉPT</Text></View>
      <View style={[styles.headerCell, { width: 65 }]}><Text style={[styles.headerText, { textAlign: 'center' }]}>DATE</Text></View>
      <View style={[styles.headerCell, { width: 45 }]}><Text style={[styles.headerText, { textAlign: 'center' }]}>AUDIT.</Text></View>
      <View style={[styles.headerCell, { width: 55 }]}><Text style={[styles.headerText, { textAlign: 'center' }]}>FORM.</Text></View>
      <View style={[styles.headerCell, { width: 50 }]}><Text style={[styles.headerText, { textAlign: 'center' }]}>STATUT</Text></View>
      <View style={[styles.headerCell, { width: 70 }]}><Text style={[styles.headerText, { textAlign: 'center' }]}>ACTIONS</Text></View>
    </View>
  );

  const renderItem = ({ item }) => {
    const isTermine = !item.en_cours;
    
    return (
      <View style={styles.tableRow}>
        <View style={[styles.cell, { width: 20 }]}><Text style={styles.cellText}>#{item.id}</Text></View>
        <View style={[styles.cell, { flex: 1 }]}><Text style={[styles.cellText, { fontWeight: '600' }]} numberOfLines={1}>{item.audit_desc || item.sujet || 'Sans nom'}</Text></View>
        <View style={[styles.cell, { width: 55 }]}><Text style={[styles.cellText, { textAlign: 'center' }]} numberOfLines={1}>{item.departement_name || '-'}</Text></View>
        <View style={[styles.cell, { width: 65, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={[styles.cellText, { fontSize: 8 }]}>{item.date_audit ? item.date_audit.split('T')[0].substring(2) : '-'}</Text>
        </View>
        <View style={[styles.cell, { width: 45, alignItems: 'center' }]}>
            <View style={styles.auditeurBadge}>
                <Text style={styles.auditeurText} numberOfLines={1}>{item.auditeur_name || 'admin'}</Text>
            </View>
        </View>
        <View style={[styles.cell, { width: 55 }]}><Text style={[styles.cellText, { textAlign: 'center' }]} numberOfLines={1}>{item.formulaire_name || 'form'}</Text></View>
        <View style={[styles.cell, { width: 50, alignItems: 'center' }]}>
            <View style={[styles.statusBadge, { backgroundColor: isTermine ? '#10b981' : '#f59e0b' }]}>
                <Text style={styles.statusText}>{isTermine ? 'Terminé' : 'En cours'}</Text>
            </View>
        </View>
        <View style={[styles.cell, { width: 70, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }]}>
            {isTermine ? (
                <TouchableOpacity style={styles.rapportBtn}>
                    <Text style={styles.rapportBtnText}>Rapport</Text>
                    <MaterialCommunityIcons name="file-document-outline" size={9} color="#64748b" />
                </TouchableOpacity>
            ) : (
                <TouchableOpacity style={styles.continuerBtn} onPress={() => router.push({ pathname: '/audit-form', params: { id: item.id } })}>
                    <Text style={styles.continuerBtnText}>Continuer</Text>
                    <Ionicons name="chevron-forward" size={9} color="#fff" />
                </TouchableOpacity>
            )}
            <TouchableOpacity style={{ marginLeft: 2 }}>
                <Entypo name="dots-three-horizontal" size={9} color="#3b82f6" />
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
          <Text style={styles.headerTitle}>Liste de mes audits</Text>
        </View>
        <TouchableOpacity style={styles.planifierBtn}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.planifierBtnText}>Planifier Audit</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color="#94a3b8" />
          <TextInput 
            placeholder="Rechercher un audit, site..." 
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#94a3b8"
          />
        </View>
        <View style={styles.filterContainer}>
          {['Tous', 'Planifiés', 'En cours', 'Terminés'].map(t => (
            <TouchableOpacity 
              key={t} 
              style={[styles.filterTab, filter === t && styles.filterTabActive]}
              onPress={() => setFilter(t)}
            >
              <Text style={[styles.filterTabText, filter === t && styles.filterTabTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.tableContainer}>
        {renderHeader()}
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={data.filter(item => {
              const matchesSearch = (item.audit_desc || item.sujet || '').toLowerCase().includes(search.toLowerCase());
              if (filter === 'Tous') return matchesSearch;
              if (filter === 'Terminés') return matchesSearch && !item.en_cours;
              if (filter === 'En cours') return matchesSearch && item.en_cours;
              return matchesSearch;
            })}
            renderItem={renderItem}
            keyExtractor={item => item.id.toString()}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={<Text style={styles.emptyText}>Aucun audit trouvé</Text>}
          />
        )}
      </View>
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
  planifierBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#22c55e', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  planifierBtnText: { color: '#fff', fontSize: 10, fontWeight: '700', marginLeft: 4 },
  
  searchSection: { padding: 10, backgroundColor: '#f8fafc' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 10, height: 36, borderWidth: 1, borderColor: '#e2e8f0' },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 11, color: '#1e293b' },
  filterContainer: { flexDirection: 'row', marginTop: 10, backgroundColor: '#f1f5f9', borderRadius: 8, padding: 2 },
  filterTab: { flex: 1, paddingVertical: 5, alignItems: 'center', borderRadius: 6 },
  filterTabActive: { backgroundColor: '#fff', elevation: 1 },
  filterTabText: { fontSize: 9, fontWeight: '600', color: '#64748b' },
  filterTabTextActive: { color: '#1e293b' },
  
  tableContainer: { flex: 1, marginTop: 5 },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 5 },
  headerCell: { paddingHorizontal: 1, justifyContent: 'center' },
  headerText: { fontSize: 7, fontWeight: '800', color: '#64748b' },
  
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'center', minHeight: 40 },
  cell: { paddingHorizontal: 1, justifyContent: 'center' },
  cellText: { fontSize: 8, color: '#1e293b' },
  
  auditeurBadge: { backgroundColor: '#e0f2fe', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 8 },
  auditeurText: { color: '#0369a1', fontSize: 7, fontWeight: '600' },
  
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, minWidth: 45, alignItems: 'center' },
  statusText: { color: '#fff', fontSize: 6, fontWeight: '800' },
  
  rapportBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 5, paddingVertical: 2 },
  rapportBtnText: { color: '#64748b', fontSize: 6, fontWeight: '700', marginRight: 2 },
  
  continuerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2563eb', borderRadius: 10, paddingHorizontal: 5, paddingVertical: 2 },
  continuerBtnText: { color: '#fff', fontSize: 6, fontWeight: '700', marginRight: 2 },
  
  emptyText: { textAlign: 'center', marginTop: 40, color: '#94a3b8', fontSize: 12 },
});

export default ListeAuditScreen;

