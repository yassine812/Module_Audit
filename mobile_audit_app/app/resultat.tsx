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
import { useAuth } from '../src/context/AuthContext';

const ResultatAuditListScreen = () => {
  const router = useRouter();
  const { openSidebar } = useSidebar();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Tout');

  const fetchData = async () => {
    try {
      const res = await api.get(getApiUrl(API_PATHS.RESULTATS));
      setData(res.data.data || []);
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

  const handleReport = (item) => {
    router.push({ pathname: '/report', params: { id: item.resultat_id || item.id } });
  };

  const handleFinish = (item) => {
    Alert.alert(
      "Clôturer l'audit ?",
      "Cette action va finaliser l'audit et générer le rapport final.",
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Oui, clôturer", 
          onPress: async () => {
            try {
              const res = await api.post(API_PATHS.RESULTAT_FINISH(item.resultat_id || item.id));
              if (res.data.status === 'success') {
                Alert.alert('Succès', 'Audit clôturé avec succès');
                fetchData();
              }
            } catch (error) {
              console.error(error);
              Alert.alert('Erreur', 'Impossible de clôturer l\'audit');
            }
          } 
        }
      ]
    );
  };

  const handleDelete = (item) => {
    Alert.alert(
      "Supprimer ce résultat ?",
      "Cette action est irréversible. Toutes les données associées seront perdues.",
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Oui, supprimer", 
          style: "destructive",
          onPress: async () => {
            try {
              const res = await api.delete(API_PATHS.RESULTAT_DETAIL(item.resultat_id || item.id));
              if (res.data.status === 'success') {
                Alert.alert('Succès', 'Résultat supprimé');
                fetchData();
              }
            } catch (error) {
              console.error(error);
              Alert.alert('Erreur', 'Impossible de supprimer le résultat');
            }
          } 
        }
      ]
    );
  };

  const renderHeader = () => (
    <View style={styles.tableHeader}>
      <View style={[styles.headerCell, { width: 35 }]}><Text style={styles.headerText}>ID</Text></View>
      <View style={[styles.headerCell, { flex: 1.5 }]}><Text style={styles.headerText}>SUJET / RÉF.</Text></View>
      <View style={[styles.headerCell, { width: 65 }]}><Text style={styles.headerText}>SITE</Text></View>
      <View style={[styles.headerCell, { width: 65 }]}><Text style={styles.headerText}>DATE</Text></View>
      <View style={[styles.headerCell, { width: 50, alignItems: 'center' }]}><Text style={styles.headerText}>SCORE</Text></View>
      <View style={[styles.headerCell, { width: 65, alignItems: 'center' }]}><Text style={styles.headerText}>STATUT</Text></View>
      <View style={[styles.headerCell, { width: 85, alignItems: 'center' }]}><Text style={styles.headerText}>ACTIONS</Text></View>
    </View>
  );

  const renderItem = ({ item, index }) => {
    const isTermine = !item.en_cours;
    
    return (
      <View style={styles.tableRow}>
        <View style={[styles.cell, { width: 35 }]}><Text style={styles.cellText}>{item.id}</Text></View>
        <View style={[styles.cell, { flex: 1.5 }]}>
            <Text style={[styles.cellText, { fontWeight: '800' }]} numberOfLines={1}>{item.audit_desc || item.sujet || 'Sans nom'}</Text>
            <Text style={[styles.cellText, { fontSize: 10, color: '#94a3b8', marginTop: 2 }]} numberOfLines={1}>{item.ref_audit || `ID-${item.id}`}</Text>
        </View>
        <View style={[styles.cell, { width: 65 }]}><Text style={styles.cellText} numberOfLines={1}>{item.site_name || '-'}</Text></View>
        <View style={[styles.cell, { width: 65 }]}><Text style={styles.cellText} numberOfLines={1}>{item.date_audit ? item.date_audit.split('T')[0].split('-').reverse().join('/') : '-'}</Text></View>
        <View style={[styles.cell, { width: 50, alignItems: 'center' }]}>
            <View style={styles.scoreBadge}>
                <Text style={styles.scoreText}>{parseFloat(item.score_audit || 0).toFixed(2)}</Text>
            </View>
        </View>
        <View style={[styles.cell, { width: 65, alignItems: 'center' }]}>
            <View style={[styles.statusBadge, { backgroundColor: isTermine ? '#f0fdf4' : '#fff7ed', borderWidth: 1, borderColor: isTermine ? '#10b981' : '#f59e0b' }]}>
                <Text style={[styles.statusText, { color: isTermine ? '#10b981' : '#f59e0b' }]}>{isTermine ? 'OK' : '...'}</Text>
            </View>
        </View>
        <View style={[styles.cell, { width: 85, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }]}>
            <TouchableOpacity style={[styles.iconBtn, { backgroundColor: '#64748b' }]} onPress={() => handleReport(item)}>
                <MaterialCommunityIcons name="file-document-outline" size={18} color="#fff" />
            </TouchableOpacity>
            {!isTermine && (
                <TouchableOpacity style={[styles.iconBtn, { backgroundColor: '#f59e0b' }]} onPress={() => handleFinish(item)}>
                    <Feather name="lock" size={18} color="#fff" />
                </TouchableOpacity>
            )}
            {isAdmin && (
                <TouchableOpacity style={[styles.iconBtn, { backgroundColor: '#ef4444' }]} onPress={() => handleDelete(item)}>
                    <Feather name="trash-2" size={18} color="#fff" />
                </TouchableOpacity>
            )}
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
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/liste-audit')}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Nouvel Audit</Text>
        </TouchableOpacity>
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
        <View style={styles.filterContainer}>
          {['Tout', 'En cours', 'Terminé'].map(t => (
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
          <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={data.filter(item => {
              const matchesSearch = (item.audit_desc || item.sujet || '').toLowerCase().includes(search.toLowerCase()) ||
                                   (item.auditeur_name || '').toLowerCase().includes(search.toLowerCase());
              if (filter === 'Tout') return matchesSearch;
              if (filter === 'Terminé') return matchesSearch && !item.en_cours;
              if (filter === 'En cours') return matchesSearch && item.en_cours;
              return matchesSearch;
            })}
            renderItem={renderItem}
            keyExtractor={item => item.id.toString()}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={<Text style={styles.emptyText}>Aucun résultat trouvé</Text>}
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
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#007bff', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  addBtnText: { color: '#fff', fontSize: 11, fontWeight: '700', marginLeft: 4 },
  
  searchSection: { padding: 12, backgroundColor: '#f8fafc' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, height: 42, borderWidth: 1, borderColor: '#e2e8f0' },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 12, color: '#1e293b' },
  filterContainer: { flexDirection: 'row', marginTop: 12, backgroundColor: '#f1f5f9', borderRadius: 10, padding: 3 },
  filterTab: { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 8 },
  filterTabActive: { backgroundColor: '#3b82f6', elevation: 2 },
  filterTabText: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  filterTabTextActive: { color: '#fff' },
  
  tableContainer: { flex: 1, marginTop: 10 },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 12, backgroundColor: '#fff', paddingTop: 8 },
  headerCell: { paddingHorizontal: 4, justifyContent: 'center' },
  headerText: { fontSize: 10, fontWeight: '800', color: '#64748b', letterSpacing: 0.5 },
  
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'center', minHeight: 64, paddingVertical: 8 },
  cell: { paddingHorizontal: 4, justifyContent: 'center' },
  cellText: { fontSize: 13, color: '#1e293b', lineHeight: 18 },
  
  scoreBadge: { backgroundColor: '#f8fafc', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0' },
  scoreText: { color: '#334155', fontSize: 11, fontWeight: '800' },
  
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, minWidth: 40, alignItems: 'center' },
  statusText: { fontSize: 10, fontWeight: '900' },
  
  iconBtn: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginHorizontal: 2 },
  
  emptyText: { textAlign: 'center', marginTop: 40, color: '#94a3b8', fontSize: 14, fontWeight: '600' },
});

export default ResultatAuditListScreen;

