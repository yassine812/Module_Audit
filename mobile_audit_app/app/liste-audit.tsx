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
import { useNavigation } from '@react-navigation/native';
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
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [startModalVisible, setStartModalVisible] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await api.get(getApiUrl(API_PATHS.NOTIFICATIONS));
      if (res.data.status === 'success') {
        setNotifications(res.data.data);
      }
    } catch (e) {
      console.error('Notifications fetch error:', e);
    }
  };

  const displayStatus = (statusLabel: string) => {
    if (!statusLabel) return '-';
    let formatted = statusLabel.replace(/_/g, ' ');
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };
  const [selectedAuditId, setSelectedAuditId] = useState(null);
  const [auditCommentaire, setAuditCommentaire] = useState('');
  const [starting, setStarting] = useState(false);
  const { logout, user } = useAuth();
  const navigation = useNavigation();

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
      fetchNotifications();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchData();
    });
    return unsubscribe;
  }, [navigation]);

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

  const handleOptions = (item) => {
    const options = [
      {
        text: "Modifier",
        onPress: () => router.push({ pathname: '/audit-schedule', params: { id: item.id } }),
      },
      {
        text: "Supprimer",
        onPress: () => confirmDelete(item.id),
        style: 'destructive'
      }
    ];

    if (item.status === 'en_cours') {
      options.unshift({
        text: "Clôturer",
        onPress: () => confirmCloturer(item.resultat_id || item.id),
      });
    }

    options.push({
      text: "Annuler",
      style: "cancel"
    });

    Alert.alert(
      "Options de l'audit",
      `Audit: ${item.audit_desc || item.sujet}`,
      options as any
    );
  };

  const confirmCloturer = (resultatId) => {
    Alert.alert(
      "Clôturer l'audit",
      "Voulez-vous vraiment clôturer cet audit en cours ?",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Clôturer", onPress: () => handleCloturer(resultatId) }
      ]
    );
  };

  const handleCloturer = async (resultatId) => {
    if (!resultatId) return;
    setLoading(true);
    try {
      const res = await api.post(API_PATHS.RESULTAT_FINISH(resultatId), {
        point_fort: '',
        point_sensible: '',
        risque: '',
        opportunite: ''
      });
      if (res.data.status === 'success') {
        Alert.alert('Succès', 'Audit clôturé avec succès');
        fetchData();
      } else {
        Alert.alert('Erreur', res.data.message || 'Échec de la clôture');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', "Impossible de clôturer l'audit.");
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (id) => {
    Alert.alert(
      "Suppression",
      "Êtes-vous sûr de vouloir supprimer cet audit ? Cette action est irréversible.",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Supprimer", style: "destructive", onPress: () => handleDeleteAudit(id) }
      ]
    );
  };

  const handleDeleteAudit = async (id) => {
    try {
      const res = await api.delete(`${API_PATHS.LISTE_AUDIT}${id}/`);
      if (res.data.status === 'success') {
        fetchData();
      } else {
        Alert.alert('Erreur', res.data.message || "Échec de la suppression");
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', "Vous n'avez peut-être pas les permissions nécessaires pour supprimer cet audit.");
    }
  };

  const renderHeader = () => (
    <View style={styles.tableHeader}>
      <View style={[styles.headerCell, { width: 25 }]}><Text style={styles.headerText}>#</Text></View>
      <View style={[styles.headerCell, { flex: 1 }]}><Text style={styles.headerText}>NOM AUDIT</Text></View>
      <View style={[styles.headerCell, { flex: 1.2 }]}><Text style={[styles.headerText, { textAlign: 'center' }]}>DÉPT</Text></View>
      <View style={[styles.headerCell, { width: 60 }]}><Text style={[styles.headerText, { textAlign: 'center' }]}>DATE</Text></View>
      <View style={[styles.headerCell, { width: 65 }]}><Text style={[styles.headerText, { textAlign: 'center' }]}>STATUT</Text></View>
      <View style={[styles.headerCell, { width: 75 }]}><Text style={[styles.headerText, { textAlign: 'center' }]}>ACTIONS</Text></View>
    </View>
  );

  const renderItem = ({ item, index }) => {
    const isPlanifie = item.status === 'planifie';
    const isEnCours = item.status === 'en_cours';
    const isTermine = item.status === 'termine';
    const isEnRetard = item.status === 'en_retard';
    
    return (
      <View style={styles.tableRow}>
        <View style={[styles.cell, { width: 25 }]}><Text style={[styles.cellText, { color: '#94a3b8' }]}>{index + 1}</Text></View>
        <View style={[styles.cell, { flex: 1 }]}><Text style={[styles.cellText, { fontWeight: '600' }]} numberOfLines={3}>{item.audit_desc || item.sujet || 'Sans nom'}</Text></View>
        <View style={[styles.cell, { flex: 1.2 }]}><Text style={[styles.cellText, { textAlign: 'center' }]} numberOfLines={3}>{item.departement_name || '-'}</Text></View>
        <View style={[styles.cell, { width: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={styles.cellText}>{item.date_audit ? item.date_audit.split('T')[0].substring(2).split('-').reverse().join('/') : '-'}</Text>
        </View>
        <View style={[styles.cell, { width: 65, alignItems: 'center' }]}>
            <View style={[styles.statusBadge, { 
              backgroundColor: isTermine ? '#10b981' : isEnCours ? '#3b82f6' : isEnRetard ? '#ef4444' : '#94a3b8' 
            }]}>
                <Text style={styles.statusText}>{displayStatus(item.status_label)}</Text>
            </View>
        </View>
        <View style={[styles.cell, { width: 75, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }]}>
            {isTermine ? (
                <TouchableOpacity 
                    style={styles.rapportBtn}
                    onPress={() => router.push({ pathname: '/report', params: { id: item.resultat_id || item.id } })}
                >
                    <MaterialCommunityIcons name="file-document-outline" size={18} color="#64748b" />
                </TouchableOpacity>
            ) : isEnCours ? (
                <TouchableOpacity style={styles.continuerBtn} onPress={() => router.push({ pathname: '/audit-form', params: { id: item.resultat_id || item.id } })}>
                    <Ionicons name="chevron-forward" size={18} color="#fff" />
                </TouchableOpacity>
            ) : (
                <TouchableOpacity 
                  style={[styles.continuerBtn, { backgroundColor: '#22c55e' }]} 
                  onPress={() => handleStartAudit(item.id)}
                >
                    <Ionicons name="play" size={18} color="#fff" />
                </TouchableOpacity>
            )}
            {user?.role?.toUpperCase() === 'ADMIN' ? (
              <TouchableOpacity style={{ marginLeft: 6 }} onPress={() => handleOptions(item)}>
                  <Entypo name="dots-three-horizontal" size={16} color="#3b82f6" />
              </TouchableOpacity>
            ) : null}
        </View>
      </View>
    );
  };

  const renderStatsBar = () => {
    const planifies = data.filter(item => item.status === 'planifie').length;
    const enCours = data.filter(item => item.status === 'en_cours').length;
    const enRetard = data.filter(item => item.status === 'en_retard').length;
    const termines = data.filter(item => item.status === 'termine').length;

    return (
      <View style={styles.statsBarContainer}>
        <View style={[styles.statMiniCard, { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }]}>
          <Text style={[styles.statMiniLabel, { color: '#64748b' }]}>Planifiés</Text>
          <Text style={[styles.statMiniVal, { color: '#334155' }]}>{planifies}</Text>
        </View>
        <View style={[styles.statMiniCard, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
          <Text style={[styles.statMiniLabel, { color: '#2563eb' }]}>En cours</Text>
          <Text style={[styles.statMiniVal, { color: '#1d4ed8' }]}>{enCours}</Text>
        </View>
        <View style={[styles.statMiniCard, { backgroundColor: '#fef2f2', borderColor: '#fca5a5' }]}>
          <Text style={[styles.statMiniLabel, { color: '#ef4444' }]}>En retard</Text>
          <Text style={[styles.statMiniVal, { color: '#b91c1c' }]}>{enRetard}</Text>
        </View>
        <View style={[styles.statMiniCard, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
          <Text style={[styles.statMiniLabel, { color: '#16a34a' }]}>Terminés</Text>
          <Text style={[styles.statMiniVal, { color: '#15803d' }]}>{termines}</Text>
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
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => setShowNotifMenu(true)}>
            <Ionicons name="notifications-outline" size={20} color="#475569" />
            {notifCount > 0 ? (
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeText}>{notifCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => setShowUserMenu(true)}>
            <Feather name="user" size={20} color="#475569" />
          </TouchableOpacity>
          {user?.role?.toUpperCase() === 'ADMIN' ? (
            <TouchableOpacity style={styles.planifierBtn} onPress={() => router.push('/audit-schedule')}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.planifierBtnText}>Planifier</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {renderStatsBar()}

      <Modal visible={showNotifMenu} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowNotifMenu(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.userDropdown, { right: 50, width: 280 }]}>
              <View style={styles.notifHeader}>
                <Text style={styles.notifHeaderText}>Notifications</Text>
                {notifCount > 0 ? (
                  <View style={styles.notifCountBadge}>
                    <Text style={styles.notifCountText}>{notifCount}</Text>
                  </View>
                ) : null}
              </View>
              <ScrollView style={{ maxHeight: 300 }}>
                {notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <TouchableOpacity
                      key={notif.id}
                      style={styles.notifItem}
                      onPress={() => {
                        setShowNotifMenu(false);
                        if (notif.type === 'audit_finished') {
                          router.push(`/report?id=${notif.target_id}`);
                        } else if (notif.type === 'audit_started') {
                          router.push(`/audit-form?id=${notif.target_id}`);
                        } else {
                          router.push('/liste-audit');
                        }
                      }}
                    >
                      <View style={[styles.notifIconCircle, { backgroundColor: notif.type === 'audit_started' ? '#eff6ff' : '#fff7ed' }]}>
                        <Ionicons 
                          name={notif.type === 'audit_started' ? "play-circle" : "calendar"} 
                          size={18} 
                          color={notif.type === 'audit_started' ? "#3b82f6" : "#f59e0b"} 
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.notifItemText} numberOfLines={2}>{notif.message}</Text>
                        <Text style={styles.notifTime}>Il y a quelques instants</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyNotif}>
                    <Ionicons name="notifications-off-outline" size={32} color="#cbd5e1" />
                    <Text style={styles.emptyNotifText}>Aucune notification</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

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
          {['Tous', 'Planifiés', 'En cours', 'Terminés', 'En retard'].map(t => (
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
              if (filter === 'En retard') return matchesSearch && item.status === 'en_retard';
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
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 8, paddingHorizontal: 4 },
  headerCell: { paddingHorizontal: 2, justifyContent: 'center' },
  headerText: { fontSize: 11, fontWeight: '800', color: '#64748b' },
  
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'center', minHeight: 56, paddingHorizontal: 4 },
  cell: { paddingHorizontal: 2, paddingVertical: 8, justifyContent: 'center' },
  cellText: { fontSize: 11, color: '#1e293b' },
  
  auditeurBadge: { backgroundColor: '#e0f2fe', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 8 },
  auditeurText: { color: '#0369a1', fontSize: 10, fontWeight: '600' },
  
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, minWidth: 55, alignItems: 'center' },
  statusText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  
  rapportBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, backgroundColor: '#f8fafc' },
  rapportBtnText: { display: 'none' },
  
  continuerBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563eb', borderRadius: 8, shadowColor: '#2563eb', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 },
  continuerBtnText: { display: 'none' },
  
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

  // Stats Bar Styles
  statsBarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 8,
  },
  statMiniCard: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
  },
  statMiniLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 2,
    textAlign: 'center',
  },
  statMiniVal: {
    fontSize: 16,
    fontWeight: '800',
  },

  // Notification Dropdown Styles
  notifHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f1f5f9' 
  },
  notifHeaderText: { 
    fontSize: 13, 
    fontWeight: '800', 
    color: '#1e293b', 
    letterSpacing: 0.5 
  },
  notifCountBadge: { 
    backgroundColor: '#eff6ff', 
    paddingHorizontal: 6, 
    paddingVertical: 2, 
    borderRadius: 6 
  },
  notifCountText: { 
    fontSize: 9, 
    fontWeight: '900', 
    color: '#3b82f6' 
  },
  notifItem: { 
    flexDirection: 'row', 
    padding: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f8fafc', 
    alignItems: 'center' 
  },
  notifIconCircle: { 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 10 
  },
  notifItemText: { 
    fontSize: 11, 
    fontWeight: '700', 
    color: '#334155', 
    lineHeight: 14 
  },
  notifTime: { 
    fontSize: 9, 
    color: '#94a3b8', 
    marginTop: 2, 
    fontWeight: '600' 
  },
  emptyNotif: { 
    padding: 20, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  emptyNotifText: { 
    marginTop: 8, 
    fontSize: 12, 
    color: '#94a3b8', 
    fontWeight: '600' 
  },
});

export default ListeAuditScreen;

