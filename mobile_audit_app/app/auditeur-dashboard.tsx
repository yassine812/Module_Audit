import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  TextInput,
  Image,
  Modal,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api, { getApiUrl, API_PATHS } from '../src/utils/api';
import { useSidebar } from '../src/context/SidebarContext';
import { useAuth } from '../src/context/AuthContext';

const { width } = Dimensions.get('window');

const AuditeurDashboard = () => {
  const router = useRouter();
  const { openSidebar } = useSidebar();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [stats, setStats] = useState({
    planifies: 0,
    en_cours: 0,
    termines: 0,
    en_retard: 0,
    score_moy: '0.0',
    notifications_count: 0
  });
  const [recentAudits, setRecentAudits] = useState([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

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
  const [notifications, setNotifications] = useState([]);

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

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Stats first
      const statsRes = await api.get(getApiUrl(API_PATHS.STATS));
      if (statsRes.data.status === 'success') {
        const s = statsRes.data.data;
        console.log('Auditor Stats:', s);
        setStats({
          planifies: s.planifies || 0,
          en_cours: s.en_cours || 0,
          termines: s.termines || 0,
          en_retard: s.en_retard || 0,
          score_moy: s.score_moy || '0.0',
          notifications_count: s.notifications_count || 0
        });
      }

      // 2. Fetch Audits second
      const auditsRes = await api.get(getApiUrl(API_PATHS.LISTE_AUDIT));
      if (auditsRes.data.status === 'success') {
        setRecentAudits(auditsRes.data.data);
      }
    } catch (e) {
      console.error('Fetch error:', e);
    }
    
    setLoading(false);
    setRefreshing(false);

    // 3. Fetch Notifications in background (non-blocking)
    fetchNotifications();
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const filteredAudits = recentAudits.filter(audit => {
    const descMatch = (audit.desc || '').toLowerCase().includes(searchQuery.toLowerCase());
    const siteMatch = (audit.site_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSearch = descMatch || siteMatch;
    
    if (activeFilter === 'all') return matchesSearch;
    if (activeFilter === 'en_cours') return matchesSearch && audit.statut_label === 'en_cours';
    if (activeFilter === 'planifie') return matchesSearch && audit.statut_label === 'planifie';
    if (activeFilter === 'termine') return matchesSearch && audit.statut_label === 'termine';
    if (activeFilter === 'en_retard') return matchesSearch && audit.statut_label === 'en_retard';
    return matchesSearch;
  });

  const [startModalVisible, setStartModalVisible] = useState(false);
  const [selectedAuditId, setSelectedAuditId] = useState(null);
  const [auditCommentaire, setAuditCommentaire] = useState('');
  const [startingAuditId, setStartingAuditId] = useState(null);

  const handleStartAudit = (auditId) => {
    setSelectedAuditId(auditId);
    setAuditCommentaire('');
    setStartModalVisible(true);
  };

  const submitStartAudit = async () => {
    if (startingAuditId) return;
    setStartingAuditId(selectedAuditId);
    try {
      const res = await api.post(API_PATHS.START_AUDIT(selectedAuditId), {
        commentaire: auditCommentaire
      });
      
      if (res.data.status === 'success') {
        setStartModalVisible(false);
        // After starting, navigate to the execution screen
        router.push(`/audit-form?id=${res.data.resultat_id}`);
      } else {
        Alert.alert('Erreur', res.data.message || "Échec du démarrage de l'audit");
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', "Une erreur est survenue lors du démarrage");
    } finally {
      setStartingAuditId(null);
    }
  };

  const KPICard = ({ title, value, icon, color, borderBottomColor }) => (
    <View style={[styles.kpiCard, { borderBottomColor, borderBottomWidth: 4 }]}>
      <View style={[styles.kpiIconContainer, { backgroundColor: `${color}10` }]}>
        {icon}
      </View>
      <Text style={styles.kpiTitle}>{title}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={openSidebar} style={styles.menuBtn}>
            <Ionicons name="menu" size={28} color="#1e293b" />
          </TouchableOpacity>
          <View style={styles.userInfo}>
            <Image 
              source={{ uri: `https://ui-avatars.com/api/?name=${user?.username}&background=EBF4FF&color=2563EB` }} 
              style={styles.avatar} 
            />
            <View>
              <Text style={styles.greeting}>Bonjour, {user?.first_name || user?.username}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{user?.role || 'AUDITEUR'}</Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => setShowNotifMenu(true)}>
            <Ionicons name="notifications-outline" size={24} color="#64748b" />
            {stats.notifications_count > 0 ? (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{stats.notifications_count}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => setShowUserMenu(true)}>
            <Feather name="user" size={24} color="#64748b" />
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

      <Modal visible={showNotifMenu} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowNotifMenu(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.notifDropdown}>
              <View style={styles.notifHeader}>
                <Text style={styles.notifHeaderText}>Notifications</Text>
                {stats.notifications_count > 0 ? (
                  <View style={styles.notifCountBadge}>
                    <Text style={styles.notifCountText}>{stats.notifications_count}</Text>
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
                        router.push(`/audit-detail?id=${notif.target_id}`);
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
              <TouchableOpacity style={styles.viewAllNotif} onPress={() => { setShowNotifMenu(false); router.push('/liste-audit'); }}>
                <Text style={styles.viewAllNotifText}>VOIR TOUT</Text>
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
                      style={[styles.startModalSubmitBtn, startingAuditId && { opacity: 0.7 }]} 
                      onPress={submitStartAudit}
                      disabled={!!startingAuditId}
                    >
                      {startingAuditId ? (
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

      <ScrollView 
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.content}>
          {/* KPI Grid */}
          <View style={styles.kpiGrid}>
            <KPICard 
              title="PLANIFIÉS" 
              value={stats.planifies} 
              icon={<Feather name="calendar" size={20} color="#3b82f6" />} 
              color="#3b82f6" 
              borderBottomColor="#3b82f6"
            />
            <KPICard 
              title="EN COURS" 
              value={stats.en_cours} 
              icon={<Feather name="clock" size={20} color="#f59e0b" />} 
              color="#f59e0b" 
              borderBottomColor="#f59e0b"
            />
            <KPICard 
              title="EN RETARD" 
              value={stats.en_retard} 
              icon={<Feather name="alert-circle" size={20} color="#ef4444" />} 
              color="#ef4444" 
              borderBottomColor="#ef4444"
            />
            <KPICard 
              title="TERMINÉS" 
              value={stats.termines} 
              icon={<Feather name="check-circle" size={20} color="#10b981" />} 
              color="#10b981" 
              borderBottomColor="#10b981"
            />
            <KPICard 
              title="SCORE MOY." 
              value={stats.score_moy} 
              icon={<Feather name="award" size={20} color="#8b5cf6" />} 
              color="#8b5cf6" 
              borderBottomColor="#8b5cf6"
            />
          </View>

          {/* Search & Filter */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color="#94a3b8" />
              <TextInput 
                style={styles.searchInput}
                placeholder="RECHERCHE DES AUDITS..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterTabs}>
              <TouchableOpacity 
                style={[styles.filterTab, activeFilter === 'all' && styles.filterTabActive]}
                onPress={() => setActiveFilter('all')}
              >
                <Text style={[styles.filterTabText, activeFilter === 'all' && styles.filterTabTextActive]}>Tous</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.filterTab, activeFilter === 'en_cours' && styles.filterTabActive]}
                onPress={() => setActiveFilter('en_cours')}
              >
                <Text style={[styles.filterTabText, activeFilter === 'en_cours' && styles.filterTabTextActive]}>En cours</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.filterTab, activeFilter === 'planifie' && styles.filterTabActive]}
                onPress={() => setActiveFilter('planifie')}
              >
                <Text style={[styles.filterTabText, activeFilter === 'planifie' && styles.filterTabTextActive]}>Planifié</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.filterTab, activeFilter === 'termine' && styles.filterTabActive]}
                onPress={() => setActiveFilter('termine')}
              >
                <Text style={[styles.filterTabText, activeFilter === 'termine' && styles.filterTabTextActive]}>Terminé</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.filterTab, activeFilter === 'en_retard' && styles.filterTabActive]}
                onPress={() => setActiveFilter('en_retard')}
              >
                <Text style={[styles.filterTabText, activeFilter === 'en_retard' && styles.filterTabTextActive]}>En retard</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Audits List */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Audits actifs</Text>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>En direct</Text>
              </View>
            </View>

            {loading ? (
              <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 20 }} />
            ) : filteredAudits.length > 0 ? (
              filteredAudits.map((audit) => (
                <TouchableOpacity 
                  key={audit.id} 
                  style={[styles.auditCard, { borderLeftColor: audit.statut_label === 'en_cours' ? '#f59e0b' : audit.statut_label === 'termine' ? '#10b981' : audit.statut_label === 'en_retard' ? '#ef4444' : '#3b82f6' }]}
                  onPress={() => {
                    if (audit.statut_label === 'termine' && audit.resultat_id) {
                      router.push(`/report?id=${audit.resultat_id}`);
                    } else if (audit.statut_label === 'en_cours' && audit.resultat_id) {
                      router.push(`/audit-form?id=${audit.resultat_id}`);
                    } else if (audit.statut_label === 'planifie') {
                      handleStartAudit(audit.id);
                    } else {
                      router.push('/liste-audit');
                    }
                  }}
                  disabled={startingAuditId === audit.id}
                >
                  <View style={styles.auditMain}>
                    <View style={styles.auditHeader}>
                      <Text style={styles.auditTitle} numberOfLines={1}>{audit.desc}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: audit.statut_label === 'en_cours' ? '#fff7ed' : audit.statut_label === 'termine' ? '#f0fdf4' : audit.statut_label === 'en_retard' ? '#fef2f2' : '#eff6ff' }]}>
                        <Text style={[styles.statusBadgeText, { color: audit.statut_label === 'en_cours' ? '#c2410c' : audit.statut_label === 'termine' ? '#15803d' : audit.statut_label === 'en_retard' ? '#b91c1c' : '#1d4ed8' }]}>
                          {audit.statut_label === 'en_cours' ? 'EN COURS' : audit.statut_label === 'termine' ? 'TERMINÉ' : audit.statut_label === 'en_retard' ? 'EN RETARD' : 'PLANIFIÉ'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.auditRef}>REF: {audit.reference || 'AUD-'+audit.id}</Text>
                    
                    <View style={styles.auditFooter}>
                      <View style={styles.auditMeta}>
                        <Ionicons name="location-outline" size={14} color="#94a3b8" />
                        <Text style={styles.auditMetaText}>{audit.site_name || 'Site'}</Text>
                      </View>
                      <View style={styles.auditMeta}>
                        <Ionicons name="calendar-outline" size={14} color="#94a3b8" />
                        <Text style={styles.auditMetaText}>{new Date(audit.date_audit).toLocaleDateString()}</Text>
                      </View>
                      <TouchableOpacity 
                        style={[styles.continueBtn, startingAuditId === audit.id && { opacity: 0.7 }]}
                        onPress={() => {
                          if (audit.statut_label === 'termine' && audit.resultat_id) {
                            router.push(`/report?id=${audit.resultat_id}`);
                          } else if (audit.statut_label === 'en_cours' && audit.resultat_id) {
                            router.push(`/audit-form?id=${audit.resultat_id}`);
                          } else if (audit.statut_label === 'planifie') {
                            handleStartAudit(audit.id);
                          } else {
                            router.push('/liste-audit');
                          }
                        }}
                        disabled={startingAuditId === audit.id}
                      >
                        {startingAuditId === audit.id ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Text style={styles.continueBtnText}>
                              {audit.statut_label === 'termine' ? 'Voir' : audit.statut_label === 'planifie' ? 'Démarrer' : 'Continuer'}
                            </Text>
                            <Ionicons name="chevron-forward" size={14} color="#fff" />
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="document-text-outline" size={48} color="#cbd5e1" />
                <Text style={styles.emptyText}>Aucun audit trouvé</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  menuBtn: { marginRight: 15 },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12, borderWidth: 2, borderColor: '#3b82f6' },
  greeting: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  roleBadge: { backgroundColor: '#e0e7ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginTop: 2 },
  roleText: { color: '#4338ca', fontSize: 9, fontWeight: '800' },
  
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  headerIconBtn: { padding: 6, marginLeft: 6, position: 'relative' },
  notifBadge: { position: 'absolute', top: 4, right: 4, backgroundColor: '#ef4444', borderRadius: 10, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#fff' },
  notifBadgeText: { color: '#fff', fontSize: 8, fontWeight: '800' },

  userDropdown: { position: 'absolute', top: 60, right: 15, backgroundColor: '#fff', borderRadius: 12, width: 160, paddingVertical: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8, borderWidth: 1, borderColor: '#f1f5f9' },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  dropdownText: { fontSize: 15, color: '#475569', marginLeft: 12, fontWeight: '500' },
  dropdownDivider: { height: 1, backgroundColor: '#f1f5f9', marginHorizontal: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.05)' },
  notifDropdown: { position: 'absolute', top: 65, right: 20, width: 280, backgroundColor: '#fff', borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5, overflow: 'hidden', borderWidth: 1, borderColor: '#f1f5f9' },
  notifHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  notifHeaderText: { fontSize: 14, fontWeight: '800', color: '#1e293b', letterSpacing: 0.5 },
  notifCountBadge: { backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  notifCountText: { fontSize: 10, fontWeight: '900', color: '#3b82f6' },
  notifItem: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, borderBottomColor: '#f8fafc', alignItems: 'center' },
  notifIconCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  notifItemText: { fontSize: 12, fontWeight: '700', color: '#334155', lineHeight: 16 },
  notifTime: { fontSize: 10, color: '#94a3b8', marginTop: 4, fontWeight: '600' },
  emptyNotif: { padding: 30, alignItems: 'center', justifyContent: 'center' },
  emptyNotifText: { marginTop: 10, fontSize: 13, color: '#94a3b8', fontWeight: '600' },
  viewAllNotif: { padding: 12, alignItems: 'center', backgroundColor: '#f8fafc' },
  viewAllNotifText: { fontSize: 10, fontWeight: '900', color: '#3b82f6', letterSpacing: 1 },

  scrollView: { flex: 1 },
  content: { padding: 20 },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 25 },
  kpiCard: { 
    width: (width - 55) / 2, 
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 20, 
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2
  },
  kpiIconContainer: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  kpiTitle: { fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 1 },
  kpiValue: { fontSize: 28, fontWeight: '900', color: '#1e293b' },

  searchContainer: { marginBottom: 25 },
  searchBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    borderRadius: 50, 
    paddingHorizontal: 20, 
    height: 55, 
    borderWidth: 1, 
    borderColor: '#f1f5f9',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14, fontWeight: '600', color: '#1e293b' },
  filterTabs: { flexDirection: 'row' },
  filterTab: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 50, backgroundColor: '#fff', borderWidth: 1, borderColor: '#f1f5f9', marginRight: 10 },
  filterTabActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  filterTabText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  filterTabTextActive: { color: '#fff' },

  section: { marginBottom: 30 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingHorizontal: 5 },
  sectionTitle: { fontSize: 22, fontWeight: '900', color: '#1e293b' },
  liveIndicator: { flexDirection: 'row', alignItems: 'center' },
  liveDot: { width: 8, height: 8, backgroundColor: '#3b82f6', borderRadius: 4, marginRight: 6 },
  liveText: { fontSize: 12, fontWeight: '700', color: '#94a3b8' },

  auditCard: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    marginBottom: 15, 
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    overflow: 'hidden'
  },
  auditMain: { padding: 16 },
  auditHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  auditTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b', flex: 1, marginRight: 10 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusBadgeText: { fontSize: 9, fontWeight: '900' },
  auditRef: { fontSize: 10, fontWeight: '700', color: '#94a3b8', marginBottom: 15 },
  auditFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  auditMeta: { flexDirection: 'row', alignItems: 'center' },
  auditMetaText: { fontSize: 12, color: '#64748b', marginLeft: 4, maxWidth: 80 },
  continueBtn: { backgroundColor: '#2563eb', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  continueBtnText: { color: '#fff', fontSize: 12, fontWeight: '800', marginRight: 4 },

  emptyContainer: { alignItems: 'center', paddingVertical: 40, opacity: 0.5 },
  emptyText: { marginTop: 10, fontSize: 14, fontWeight: '600', color: '#64748b' },

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

export default AuditeurDashboard;
