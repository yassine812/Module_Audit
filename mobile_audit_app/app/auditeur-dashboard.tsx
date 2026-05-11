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
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [stats, setStats] = useState({
    planifies: 0,
    en_cours: 0,
    termines: 0,
    score_moy: '0.0'
  });
  const [recentAudits, setRecentAudits] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const statsRes = await api.get(getApiUrl(API_PATHS.STATS));
      if (statsRes.data.status === 'success') {
        const s = statsRes.data.data;
        setStats({
          planifies: s.planifies || 0,
          en_cours: s.en_cours || 0,
          termines: s.termines || 0,
          score_moy: s.score_moy || '0.0'
        });
      }

      const auditsRes = await api.get(getApiUrl(API_PATHS.LISTE_AUDIT));
      if (auditsRes.data.status === 'success') {
        setRecentAudits(auditsRes.data.data);
      }
    } catch (e) {
      console.error('Fetch error:', e);
    }
    setLoading(false);
    setRefreshing(false);
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
    if (activeFilter === 'en_cours') return matchesSearch && (audit.statut_label === 'en_cours' || audit.statut_label === 'planifie');
    if (activeFilter === 'termine') return matchesSearch && audit.statut_label === 'termine';
    return matchesSearch;
  });

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
        <TouchableOpacity style={styles.notificationBtn}>
          <Ionicons name="notifications-outline" size={24} color="#64748b" />
          <View style={styles.notifDot} />
        </TouchableOpacity>
      </View>

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
                style={[styles.filterTab, activeFilter === 'termine' && styles.filterTabActive]}
                onPress={() => setActiveFilter('termine')}
              >
                <Text style={[styles.filterTabText, activeFilter === 'termine' && styles.filterTabTextActive]}>Terminé</Text>
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
                  style={[styles.auditCard, { borderLeftColor: audit.statut_label === 'en_cours' ? '#f59e0b' : audit.statut_label === 'termine' ? '#10b981' : '#3b82f6' }]}
                  onPress={() => router.push(`/audit-detail?id=${audit.id}`)}
                >
                  <View style={styles.auditMain}>
                    <View style={styles.auditHeader}>
                      <Text style={styles.auditTitle} numberOfLines={1}>{audit.desc}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: audit.statut_label === 'en_cours' ? '#fff7ed' : audit.statut_label === 'termine' ? '#f0fdf4' : '#eff6ff' }]}>
                        <Text style={[styles.statusBadgeText, { color: audit.statut_label === 'en_cours' ? '#c2410c' : audit.statut_label === 'termine' ? '#15803d' : '#1d4ed8' }]}>
                          {audit.statut_label === 'en_cours' ? 'EN COURS' : audit.statut_label === 'termine' ? 'TERMINÉ' : 'PLANIFIÉ'}
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
                        style={styles.continueBtn}
                        onPress={() => router.push(`/audit-detail?id=${audit.id}`)}
                      >
                        <Text style={styles.continueBtnText}>{audit.statut_label === 'termine' ? 'Voir' : 'Continuer'}</Text>
                        <Ionicons name="chevron-forward" size={14} color="#fff" />
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
  greeting: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  roleBadge: { backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 2, alignSelf: 'flex-start' },
  roleText: { fontSize: 10, fontWeight: '800', color: '#16a34a', fontStyle: 'italic' },
  notificationBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  notifDot: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, backgroundColor: '#ef4444', borderRadius: 4, borderWidth: 1.5, borderColor: '#fff' },

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
});

export default AuditeurDashboard;
