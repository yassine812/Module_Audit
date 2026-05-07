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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api, { getApiUrl, API_PATHS } from '../src/utils/api';
import { LineChart } from 'react-native-chart-kit';
import { useSidebar } from '../src/context/SidebarContext';

const { width } = Dimensions.get('window');

const DashboardScreen = () => {
  const router = useRouter();
  const { openSidebar } = useSidebar();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ 
    types_audit: 0, 
    formulaires: 0, 
    planifies: 0, 
    resultats: 0 
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [chartData, setChartData] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch Stats
    try {
      const statsRes = await api.get(getApiUrl(API_PATHS.STATS));
      if (statsRes.data.status === 'success') {
        const s = statsRes.data.data;
        setStats({
          types_audit: s.type_audits || 0,
          formulaires: s.formulaires || 0,
          planifies: s.liste_audits || 0,
          resultats: s.resultats || 0
        });
      }
    } catch (e) { 
      console.error('Stats fetch error:', e);
    }

    // Fetch Activity
    try {
      const activityRes = await api.get(getApiUrl(API_PATHS.ACTIVITIES));
      if (activityRes.data.status === 'success') {
        setRecentActivity(activityRes.data.data.slice(0, 5));
      }
    } catch (e) { console.error('Activity fetch error:', e); }

    // Fetch Chart
    try {
      const chartRes = await api.get(getApiUrl(API_PATHS.CHART_DATA));
      if (chartRes.data.status === 'success') {
        setChartData(chartRes.data);
      } else {
        setChartData({
          labels: ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"],
          datasets: { types_audit: [0,0,0,1,0,0,0,0,0,0,0,0], formulaires: [0,0,0,1,0,0,0,0,0,0,0,0], audits_planifies: [0,0,0,2,0,0,0,0,0,0,0,0], resultats: [0,0,0,2,0,0,0,0,0,0,0,0] }
        });
      }
    } catch (e) { 
      console.error('Chart fetch error:', e);
      setChartData({
        labels: ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"],
        datasets: { types_audit: [0,0,0,1,0,0,0,0,0,0,0,0], formulaires: [0,0,0,1,0,0,0,0,0,0,0,0], audits_planifies: [0,0,0,2,0,0,0,0,0,0,0,0], resultats: [0,0,0,2,0,0,0,0,0,0,0,0] }
      });
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
        <View style={{ width: 40 }} /> 
      </View>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.content}>
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

          {/* Quick Actions */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Actions Rapides</Text>
              <TouchableOpacity onPress={() => router.push('/liste-audit')}>
                <Text style={styles.sectionLink}>Toutes les actions</Text>
              </TouchableOpacity>
            </View>
            <ActionButton 
              title="Nouveau Type d'Audit" 
              icon={<Ionicons name="add" size={20} color="#fff" />} 
              color="#2563eb" 
              onPress={() => router.push('/type-audit')}
            />
            <ActionButton 
              title="Nouveau Formulaire" 
              icon={<Ionicons name="document-text" size={20} color="#fff" />} 
              color="#059669" 
              onPress={() => router.push('/formulaire')}
            />
            <ActionButton 
              title="Planifier Audit" 
              icon={<Ionicons name="calendar" size={20} color="#fff" />} 
              color="#f59e0b" 
              onPress={() => router.push('/liste-audit')}
            />
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
                      {idx < recentActivity.length - 1 && <View style={styles.timelineLine} />}
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

          {/* Audit Report Chart */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rapport d'Audit</Text>
            <View style={styles.chartCard}>
              {renderChart()}
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
  menuBtn: { padding: 5 },
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

  actionButton: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
  actionIconBg: { width: 36, height: 36, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  actionText: { fontSize: 15, fontWeight: '700', color: '#fff' },

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

export default DashboardScreen;
