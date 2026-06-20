import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  Dimensions,
  Alert,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api, { getApiUrl, API_PATHS } from '../src/utils/api';
import { LineChart } from 'react-native-chart-kit';
import { useSidebar } from '../src/context/SidebarContext';
import { useAuth } from '../src/context/AuthContext';
import AuditeurDashboard from './auditeur-dashboard';

const { width } = Dimensions.get('window');

const AdminDashboardContent = () => {
  const router = useRouter();
  const { openSidebar } = useSidebar();
  const { user, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    types_audit: 0,
    formulaires: 0,
    planifies: 0,
    resultats: 0,
    notifications_count: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
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

    // 1. Fetch Stats
    try {
      const statsRes = await api.get(getApiUrl(API_PATHS.STATS));
      if (statsRes.data.status === 'success') {
        const s = statsRes.data.data;
        console.log('Admin Stats:', s);
        setStats({
          types_audit: s.type_audits || 0,
          formulaires: s.formulaires || 0,
          planifies: s.liste_audits || 0,
          resultats: s.resultats || 0,
          notifications_count: s.notifications_count || 0
        });
      }
    } catch (e) {
      console.error('Stats fetch error:', e);
    }

    // 2. Fetch Activity
    try {
      const activityRes = await api.get(getApiUrl(API_PATHS.ACTIVITIES));
      if (activityRes.data.status === 'success') {
        setRecentActivity(activityRes.data.data.slice(0, 5));
      }
    } catch (e) { console.error('Activity fetch error:', e); }

    // 3. Fetch Chart
    try {
      const chartRes = await api.get(getApiUrl(API_PATHS.CHART_DATA));
      if (chartRes.data.status === 'success') {
        setChartData(chartRes.data);
      } else {
        setChartData({
          labels: ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"],
          datasets: { types_audit: [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0], formulaires: [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0], audits_planifies: [0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0], resultats: [0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0] }
        });
      }
    } catch (e) {
      console.error('Chart fetch error:', e);
    }

    setLoading(false);
    setRefreshing(false);

    // 4. Fetch Notifications (Background)
    fetchNotifications();
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

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

  const KPICard = ({ title, value, icon, iconBg, textColor, onPress }) => (
    <TouchableOpacity style={styles.kpiCard} onPress={onPress}>
      <View style={[styles.kpiIconContainer, { backgroundColor: iconBg }]}>
        {icon}
      </View>
      <Text style={styles.kpiTitle}>{title}</Text>
      <Text style={[styles.kpiValue, { color: textColor }]}>{value}</Text>
      <View style={styles.voirPlus}>
        <Text style={[styles.voirPlusText, { color: textColor }]}>Voir plus</Text>
        <Ionicons name="arrow-forward" size={14} color={textColor} />
      </View>
    </TouchableOpacity>
  );

  const ActionButton = ({ title, icon, color, onPress }) => (
    <TouchableOpacity style={[styles.actionButton, { backgroundColor: color }]} onPress={onPress}>
      <View style={styles.actionIconBg}>
        {icon}
      </View>
      <Text style={styles.actionText}>{title}</Text>
    </TouchableOpacity>
  );

  const formatActivityTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatActivityDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const renderChart = () => {
    if (!chartData) return <ActivityIndicator size="small" color="#3b82f6" />;

    const data = {
      labels: chartData.labels,
      datasets: [
        {
          data: chartData.datasets.types_audit,
          color: (opacity = 1) => `rgba(13, 148, 136, ${opacity})`,
          strokeWidth: 2
        },
        {
          data: chartData.datasets.formulaires,
          color: (opacity = 1) => `rgba(5, 150, 105, ${opacity})`,
          strokeWidth: 2
        },
        {
          data: chartData.datasets.audits_planifies,
          color: (opacity = 1) => `rgba(217, 119, 6, ${opacity})`,
          strokeWidth: 2
        },
        {
          data: chartData.datasets.resultats,
          color: (opacity = 1) => `rgba(225, 29, 72, ${opacity})`,
          strokeWidth: 2
        }
      ],
      legend: ["Types", "Forms", "Planifiés", "Résultats"]
    };

    return (
      <LineChart
        data={data}
        width={width - 40}
        height={180}
        chartConfig={{
          backgroundColor: '#fff',
          backgroundGradientFrom: '#fff',
          backgroundGradientTo: '#fff',
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
          style: { borderRadius: 16 },
          propsForDots: { r: '4', strokeWidth: '2', stroke: '#fff' }
        }}
        bezier
        style={{ marginVertical: 8, borderRadius: 16 }}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.dashboardHeader}>
        <TouchableOpacity onPress={openSidebar} style={styles.menuBtn}>
          <Ionicons name="menu" size={28} color="#475569" />
        </TouchableOpacity>
        <Text style={styles.dashboardTitle}>Tableau de Bord</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => setShowNotifMenu(true)}>
            <Ionicons name="notifications-outline" size={24} color="#475569" />
            {stats.notifications_count > 0 ? (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{stats.notifications_count}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => setShowUserMenu(true)}>
            <Feather name="user" size={24} color="#475569" />
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={showNotifMenu} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowNotifMenu(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.userDropdown, { right: 50, width: 280 }]}>
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
              <TouchableOpacity style={styles.viewAllNotif} onPress={() => { setShowNotifMenu(false); router.push('/liste-audit'); }}>
                <Text style={styles.viewAllNotifText}>VOIR TOUT</Text>
              </TouchableOpacity>
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
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.content}>
          {/* Quick Actions */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Actions Rapides</Text>
            </View>
            <View style={styles.actionGrid}>
              <ActionButton
                title="Type d'Audit"
                icon={<Ionicons name="add" size={22} color="#fff" />}
                color="#2563eb"
                onPress={() => router.push('/type-audit')}
              />
              <ActionButton
                title="Formulaire"
                icon={<Ionicons name="document-text" size={22} color="#fff" />}
                color="#059669"
                onPress={() => router.push('/formulaire')}
              />
              <ActionButton
                title="Planifier"
                icon={<Ionicons name="calendar" size={22} color="#fff" />}
                color="#f59e0b"
                onPress={() => router.push('/liste-audit')}
              />
            </View>
          </View>

          {/* KPI Grid */}
          <View style={styles.kpiGrid}>
            <KPICard
              title="Types d'Audit"
              value={stats.types_audit}
              icon={<MaterialCommunityIcons name="molecule" size={22} color="#0d9488" />}
              iconBg="#f0fdfa"
              textColor="#0d9488"
              onPress={() => router.push('/type-audit')}
            />
            <KPICard
              title="Formulaires"
              value={stats.formulaires}
              icon={<Ionicons name="document-text" size={22} color="#059669" />}
              iconBg="#f0fdf4"
              textColor="#059669"
              onPress={() => router.push('/formulaire')}
            />
            <KPICard
              title="Audits Planifiés"
              value={stats.planifies}
              icon={<Ionicons name="calendar" size={22} color="#d97706" />}
              iconBg="#fffbeb"
              textColor="#d97706"
              onPress={() => router.push('/liste-audit')}
            />
            <KPICard
              title="Résultats"
              value={stats.resultats}
              icon={<Ionicons name="bar-chart" size={22} color="#e11d48" />}
              iconBg="#fff1f2"
              textColor="#e11d48"
              onPress={() => router.push('/resultat')}
            />
          </View>

          {/* Audit Report Chart */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rapport d'Audit</Text>
            <View style={styles.chartCard}>
              {renderChart()}
            </View>
          </View>

          {/* Recent Activity */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Activité Récente</Text>
            <View style={styles.timelineContainer}>
              {loading ? (
                <ActivityIndicator size="small" color="#3b82f6" />
              ) : recentActivity.length > 0 ? (
                recentActivity.map((item, idx) => (
                  <View key={item.id} style={styles.timelineItem}>
                    <View style={styles.timelineLeft}>
                      <View style={[styles.timelineIconBg, { backgroundColor: '#f8fafc', borderColor: '#f1f5f9', borderWidth: 1 }]}>
                        <Feather
                          name={item.action_type === 'add' ? 'plus-circle' : 'edit-2'}
                          size={14}
                          color={item.action_type === 'add' ? '#10b981' : '#3b82f6'}
                        />
                      </View>
                      {idx < recentActivity.length - 1 ? <View style={styles.timelineLine} /> : null}
                    </View>
                    <View style={styles.timelineRight}>
                      <View style={styles.timelineHeader}>
                        <Text style={styles.timelineDate}>{formatActivityDate(item.action_time)}</Text>
                        <Text style={styles.timelineTime}>{formatActivityTime(item.action_time)}</Text>
                      </View>
                      <Text style={styles.timelineDesc}>
                        {item.action_type === 'add' ? 'Création de' : 'Modification de'} {item.model} : <Text style={[styles.timelineTarget, { color: item.action_type === 'add' ? '#10b981' : '#3b82f6' }]}>{item.object_repr}</Text>
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>Aucune activité récente</Text>
              )}
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Copyright © Audit d'entreprise. Tous droits réservés.</Text>
            <Text style={styles.footerVersion}>Version 2.4.0-release</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  dashboardHeader: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  headerIconBtn: { padding: 8, marginLeft: 5, position: 'relative' },
  notifBadge: { position: 'absolute', top: 0, right: 0, backgroundColor: '#ef4444', borderRadius: 12, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff', zIndex: 10 },
  notifBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
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
  menuBtn: { padding: 5 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.05)' },
  userDropdown: { position: 'absolute', top: 60, right: 15, backgroundColor: '#fff', borderRadius: 12, width: 160, paddingVertical: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8, borderWidth: 1, borderColor: '#f1f5f9' },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  dropdownText: { fontSize: 15, color: '#475569', marginLeft: 12, fontWeight: '500' },
  dropdownDivider: { height: 1, backgroundColor: '#f1f5f9', marginHorizontal: 8 },

  dashboardTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  scrollView: { flex: 1 },
  content: { padding: 16, paddingBottom: 100 },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  kpiCard: { width: (width - 48) / 2, backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  kpiIconContainer: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  kpiTitle: { fontSize: 14, fontWeight: '600', color: '#64748b', marginBottom: 4 },
  kpiValue: { fontSize: 22, fontWeight: '800', color: '#1e293b', marginBottom: 12 },
  voirPlus: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  voirPlusText: { fontSize: 12, fontWeight: '700' },

  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  sectionLink: { fontSize: 13, color: '#2563eb', fontWeight: '600' },

  actionGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  actionButton: {
    width: (width - 32 - 16) / 3,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8
  },
  actionIconBg: { width: 42, height: 42, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionText: { fontSize: 11, fontWeight: '800', color: '#fff', textAlign: 'center' },

  timelineContainer: { backgroundColor: '#fff', padding: 20, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  timelineItem: { flexDirection: 'row', marginBottom: 20 },
  timelineLeft: { alignItems: 'center', marginRight: 16 },
  timelineIconBg: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  timelineLine: { position: 'absolute', top: 32, bottom: -20, width: 1, backgroundColor: '#f1f5f9' },
  timelineRight: { flex: 1 },
  timelineHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  timelineDate: { fontSize: 15, fontWeight: '700', color: '#475569' },
  timelineTime: { fontSize: 12, color: '#94a3b8' },
  timelineDesc: { fontSize: 13, color: '#64748b', lineHeight: 18 },
  timelineTarget: { fontWeight: '700' },

  chartCard: { backgroundColor: '#fff', padding: 10, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, alignItems: 'center' },

  footer: { alignItems: 'center', marginTop: 20, marginBottom: 40 },
  footerText: { fontSize: 11, color: '#94a3b8', marginBottom: 4 },
  footerVersion: { fontSize: 10, color: '#cbd5e1' },
  emptyText: { textAlign: 'center', color: '#94a3b8', padding: 10 },
});

const DashboardScreen = () => {
  const { user } = useAuth();
  
  // If user is null, the _layout will redirect to /login. Render nothing to prevent errors.
  if (!user) return null;

  const isAuditor = user.role === 'Auditeur' || user.role === 'Participant';
  if (isAuditor) {
    return <AuditeurDashboard />;
  }
  
  return <AdminDashboardContent />;
};

export default DashboardScreen;
