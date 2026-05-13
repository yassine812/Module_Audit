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
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, Feather, MaterialCommunityIcons, Entypo } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api, { getApiUrl, API_PATHS } from '../src/utils/api';
import { useSidebar } from '../src/context/SidebarContext';
import { useAuth } from '../src/context/AuthContext';

const ListeAuditScreen = () => {
  const router = useRouter();
  const { openSidebar } = useSidebar();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Tous');
  const [notifCount, setNotifCount] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [startModalVisible, setStartModalVisible] = useState(false);
  const [selectedAuditId, setSelectedAuditId] = useState(null);
  const [auditCommentaire, setAuditCommentaire] = useState('');
  const [starting, setStarting] = useState(false);
  const { logout } = useAuth();

  const fetchData = async () => {
    try {
      const [res, statsRes] = await Promise.all([
        api.get(getApiUrl(API_PATHS.RESULTATS)),
        api.get(getApiUrl(API_PATHS.STATS))
      ]);
      setData(res.data.data || []);
      if (statsRes.data.status === 'success') {
        setNotifCount(statsRes.data.data.notifications_count || 0);
      }
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

  const handleLogout = () => {
    Alert.alert(
      "Déconnexion",
      "Voulez-vous vraiment vous déconnecter ?",
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Déconnecter", 
          style: "destructive", 
          onPress: async () => {
            await logout();
            router.replace('/login');
          } 
        }
      ]
    );
  };

  const handleStartAudit = (auditId) => {
    setSelectedAuditId(auditId);
    setAuditCommentaire('');
    setStartModalVisible(true);
  };

  const submitStartAudit = async () => {
    if (starting) return;
    setStarting(true);
    try {
      const res = await api.post(API_PATHS.START_AUDIT(selectedAuditId), {
        commentaire: auditCommentaire
      });
      
      if (res.data.status === 'success') {
        setStartModalVisible(false);
        // After starting, we navigate to the execution screen
        // The API returns the resultat_id
        router.push({ 
          pathname: '/audit-form', 
          params: { id: res.data.resultat_id } 
        });
        fetchData(); // Refresh list
      } else {
        Alert.alert('Erreur', res.data.message || "Échec du démarrage de l'audit");
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', "Une erreur est survenue lors du démarrage");
    } finally {
      setStarting(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.tableHeader}>
      <View style={[styles.headerCell, { width: 25 }]}><Text style={styles.headerText}>N°</Text></View>
      <View style={[styles.headerCell, { flex: 1 }]}><Text style={styles.headerText}>NOM AUDIT</Text></View>
      <View style={[styles.headerCell, { width: 65 }]}><Text style={[styles.headerText, { textAlign: 'center' }]}>DÉPT</Text></View>
      <View style={[styles.headerCell, { width: 75 }]}><Text style={[styles.headerText, { textAlign: 'center' }]}>DATE</Text></View>
      <View style={[styles.headerCell, { width: 60 }]}><Text style={[styles.headerText, { textAlign: 'center' }]}>STATUT</Text></View>
      <View style={[styles.headerCell, { width: 85 }]}><Text style={[styles.headerText, { textAlign: 'center' }]}>ACTIONS</Text></View>
    </View>
  );

  const renderItem = ({ item, index }) => {
    const isPlanifie = item.status === 'planifie';
    const isEnCours = item.status === 'en_cours';
    const isTermine = item.status === 'termine';
    
    return (
      <View style={styles.tableRow}>
        <View style={[styles.cell, { width: 25 }]}><Text style={styles.cellText}>#{index + 1}</Text></View>
        <View style={[styles.cell, { flex: 1 }]}><Text style={[styles.cellText, { fontWeight: '600' }]} numberOfLines={1}>{item.audit_desc || item.sujet || 'Sans nom'}</Text></View>
        <View style={[styles.cell, { width: 65 }]}><Text style={[styles.cellText, { textAlign: 'center' }]} numberOfLines={1}>{item.departement_name || '-'}</Text></View>
        <View style={[styles.cell, { width: 75, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={[styles.cellText, { fontSize: 9 }]}>{item.date_audit ? item.date_audit.split('T')[0].substring(2).split('-').reverse().join('/') : '-'}</Text>
        </View>
        <View style={[styles.cell, { width: 60, alignItems: 'center' }]}>
            <View style={[styles.statusBadge, { 
              backgroundColor: isTermine ? '#10b981' : isEnCours ? '#3b82f6' : '#94a3b8' 
            }]}>
                <Text style={styles.statusText}>{item.status_label}</Text>
            </View>
        </View>
        <View style={[styles.cell, { width: 85, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }]}>
            {isTermine ? (
                <TouchableOpacity 
                    style={styles.rapportBtn}
                    onPress={() => router.push({ pathname: '/report', params: { id: item.resultat_id || item.id } })}
                >
                    <Text style={styles.rapportBtnText}>Rapport</Text>
                    <MaterialCommunityIcons name="file-document-outline" size={10} color="#64748b" />
                </TouchableOpacity>
            ) : isEnCours ? (
                <TouchableOpacity style={styles.continuerBtn} onPress={() => router.push({ pathname: '/audit-form', params: { id: item.resultat_id || item.id } })}>
                    <Text style={styles.continuerBtnText}>Continuer</Text>
                    <Ionicons name="chevron-forward" size={10} color="#fff" />
                </TouchableOpacity>
            ) : (
                <TouchableOpacity 
                  style={[styles.continuerBtn, { backgroundColor: '#22c55e' }]} 
                  onPress={() => handleStartAudit(item.id)}
                >
                    <Text style={styles.continuerBtnText}>Démarrer</Text>
                    <Ionicons name="play" size={10} color="#fff" />
                </TouchableOpacity>
            )}
            <TouchableOpacity style={{ marginLeft: 4 }} onPress={() => Alert.alert('Action', 'Options supplémentaires pour l\'audit #' + item.id)}>
                <Entypo name="dots-three-horizontal" size={10} color="#3b82f6" />
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
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIconBtn}>
            <Ionicons name="notifications-outline" size={20} color="#475569" />
            {notifCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeText}>{notifCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => setShowUserMenu(true)}>
            <Feather name="user" size={20} color="#475569" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.planifierBtn} onPress={() => router.push('/audit-schedule')}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.planifierBtnText}>Planifier</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={showUserMenu} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowUserMenu(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.userDropdown}>
              <TouchableOpacity 
                style={styles.dropdownItem} 
                onPress={() => { setShowUserMenu(false); router.push('/profile'); }}
              >
                <Feather name="user" size={18} color="#475569" />
                <Text style={styles.dropdownText}>Profil</Text>
              </TouchableOpacity>
              <View style={styles.dropdownDivider} />
              <TouchableOpacity 
                style={styles.dropdownItem} 
                onPress={() => { setShowUserMenu(false); handleLogout(); }}
              >
                <Feather name="log-out" size={18} color="#ef4444" />
                <Text style={[styles.dropdownText, { color: '#ef4444' }]}>Déconnexion</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Start Audit Context Modal */}
      <Modal visible={startModalVisible} transparent animationType="slide" onRequestClose={() => setStartModalVisible(false)}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.startModalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.startModalContainer}>
                  <View style={styles.startModalHeader}>
                    <Text style={styles.startModalTitle}>Démarrer l'Audit</Text>
                    <TouchableOpacity onPress={() => setStartModalVisible(false)}>
                      <Ionicons name="close" size={24} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.startModalBody}>
                    <Text style={styles.startModalLabel}>Contexte de l'audit (Optionnel)</Text>
                    <TextInput
                      style={styles.startModalInput}
                      placeholder="Ex: Audit de routine, suivi de non-conformité..."
                      multiline
                      numberOfLines={4}
                      value={auditCommentaire}
                      onChangeText={setAuditCommentaire}
                      placeholderTextColor="#94a3b8"
                      blurOnSubmit={true}
                      onSubmitEditing={Keyboard.dismiss}
                    />
                    <Text style={styles.startModalHelp}>
                      Ce commentaire sera affiché dans l'entête du rapport final.
                    </Text>
                  </View>
                  
                  <View style={styles.startModalFooter}>
                    <TouchableOpacity 
                      style={styles.startModalCancelBtn} 
                      onPress={() => setStartModalVisible(false)}
                    >
                      <Text style={styles.startModalCancelText}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.startModalSubmitBtn, starting && { opacity: 0.7 }]} 
                      onPress={submitStartAudit}
                      disabled={starting}
                    >
                      {starting ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Text style={styles.startModalSubmitText}>Démarrer</Text>
                          <Ionicons name="play-circle" size={18} color="#fff" style={{ marginLeft: 8 }} />
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

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
              if (filter === 'Terminés') return matchesSearch && item.status === 'termine';
              if (filter === 'En cours') return matchesSearch && item.status === 'en_cours';
              if (filter === 'Planifiés') return matchesSearch && item.status === 'planifie';
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
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  headerIconBtn: { padding: 6, marginLeft: 2, position: 'relative' },
  notificationBadge: { position: 'absolute', top: 4, right: 4, backgroundColor: '#ef4444', borderRadius: 7, width: 14, height: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#fff' },
  badgeText: { color: '#fff', fontSize: 7, fontWeight: '800' },
  planifierBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#22c55e', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, marginLeft: 8 },
  planifierBtnText: { color: '#fff', fontSize: 10, fontWeight: '700', marginLeft: 4 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.05)' },
  userDropdown: { position: 'absolute', top: 55, right: 15, backgroundColor: '#fff', borderRadius: 12, width: 160, paddingVertical: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8, borderWidth: 1, borderColor: '#f1f5f9' },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  dropdownText: { fontSize: 15, color: '#475569', marginLeft: 12, fontWeight: '500' },
  dropdownDivider: { height: 1, backgroundColor: '#f1f5f9', marginHorizontal: 8 },

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
  
  // Start Modal Styles
  startModalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  startModalContainer: { backgroundColor: '#fff', borderRadius: 16, width: '100%', maxWidth: 400, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10, overflow: 'hidden' },
  startModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  startModalTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  startModalBody: { padding: 20 },
  startModalLabel: { fontSize: 14, fontWeight: '600', color: '#64748b', marginBottom: 10 },
  startModalInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, fontSize: 14, color: '#1e293b', minHeight: 100, textAlignVertical: 'top' },
  startModalHelp: { fontSize: 11, color: '#94a3b8', marginTop: 8, fontStyle: 'italic' },
  startModalFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', padding: 16, backgroundColor: '#f8fafc', gap: 12 },
  startModalCancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  startModalCancelText: { color: '#64748b', fontSize: 14, fontWeight: '600' },
  startModalSubmitBtn: { backgroundColor: '#22c55e', flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, shadowColor: '#22c55e', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  startModalSubmitText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

export default ListeAuditScreen;

