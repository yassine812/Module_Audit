import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  MaterialCommunityIcons, 
  FontAwesome5, 
  Feather,
  Ionicons,
} from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import api, { getApiUrl, API_PATHS } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

const DashboardScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedYear, setSelectedYear] = useState('2026');

  const [stats, setStats] = useState({
    type_audits: 0,
    formulaires: 0,
    liste_audits: 0,
    resultats: 0,
  });
  
  const [activities, setActivities] = useState([]);
  const [chartData, setChartData] = useState({
    labels: ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"],
    datasets: {
      types_audit: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      formulaires: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      audits_planifies: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      resultats: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    }
  });

  const fetchData = async () => {
    try {
      // 1. Fetch Stats
      api.get(API_PATHS.DASHBOARD_STATS)
        .then(res => {
          if (res.data.status === 'success') {
            setStats(res.data.data);
            Alert.alert("Debug Stats", `Data: ${JSON.stringify(res.data.data)}`);
          }
        })
        .catch(err => {
          console.warn("Stats fetch error:", err);
          Alert.alert("Erreur Stats", `Impossible de charger les statistiques: ${err.message}`);
        });

      // 2. Fetch Activities
      api.get(API_PATHS.ACTIVITIES)
        .then(res => {
          if (res.data.status === 'success') setActivities(res.data.data || []);
        })
        .catch(err => console.warn("Activities fetch error:", err));

      // 3. Fetch Chart Data
      api.get(`${API_PATHS.CHART_DATA}?year=${selectedYear}`)
        .then(res => {
          if (res.data && res.data.labels) setChartData(res.data);
        })
        .catch(err => console.warn("Chart fetch error:", err));

    } catch (error) {
      console.error("Dashboard Global Error:", error);
      Alert.alert("Erreur", "Une erreur critique est survenue sur le tableau de bord");
    } finally {
      // Small delay to let initial loads happen
      setTimeout(() => {
        setLoading(false);
        setRefreshing(false);
      }, 500);
    }
  };

  useEffect(() => { fetchData(); }, [selectedYear]);

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={{ marginTop: 12, color: '#64748b', fontWeight: '600' }}>Initialisation du tableau de bord...</Text>
      </View>
    );
  }

  const chartWidth = Math.max(width * 1.5, 600);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />} 
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
            <Text style={styles.headerTitle}>Bonjour, {user?.username || 'Utilisateur'}</Text>
            <Text style={styles.headerSubtitle}>Voici l'état actuel de vos audits</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard title="Types d'Audit" count={stats.type_audits} color="#3b82f6" icon="clipboard-list-outline" onPress={() => router.push('/type-audit')} />
          <StatCard title="Formulaires" count={stats.formulaires} color="#10b981" icon="file-document-outline" onPress={() => router.push('/formulaire')} />
          <StatCard title="Audits Planifiés" count={stats.liste_audits} color="#f59e0b" icon="calendar-month-outline" onPress={() => router.push('/liste-audit')} />
          <StatCard title="Résultats" count={stats.resultats} color="#ef4444" icon="chart-line" onPress={() => router.push('/resultat')} />
        </View>

        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Flux d'Activité</Text>
            <TouchableOpacity><Text style={styles.seeAll}>Historique</Text></TouchableOpacity>
        </View>
        <View style={styles.activityCard}>
          {activities.length > 0 ? (
            activities.slice(0, 4).map((item, index) => <ActivityItem key={item.id} item={item} isLast={index === 3} />)
          ) : (
            <View style={styles.emptyContainer}>
              <Feather name="info" size={24} color="#cbd5e1" />
              <Text style={styles.emptyText}>Aucune activité récente sur le système</Text>
            </View>
          )}
        </View>

        <View style={[styles.sectionHeader, { marginTop: 10 }]}>
            <Text style={styles.sectionTitle}>Rapport d'Audit</Text>
            <View style={styles.yearBadge}>
                <Text style={styles.yearBadgeText}>{selectedYear}</Text>
            </View>
        </View>

        <View style={styles.chartCard}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartScroll}>
            <LineChart
              data={{
                labels: chartData.labels,
                datasets: [
                  { data: chartData.datasets.types_audit, color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`, strokeWidth: 3 },
                  { data: chartData.datasets.formulaires, color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, strokeWidth: 3 },
                  { data: chartData.datasets.audits_planifies, color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`, strokeWidth: 3 },
                  { data: chartData.datasets.resultats, color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`, strokeWidth: 3 },
                ],
              }}
              width={chartWidth}
              height={200}
              chartConfig={{
                backgroundColor: '#fff',
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(71, 85, 105, ${opacity})`,
                style: { borderRadius: 16 },
                propsForDots: { r: "4", strokeWidth: "2", stroke: "#fff" },
                propsForBackgroundLines: { stroke: "#f1f5f9" },
              }}
              bezier
              style={styles.chart}
              fromZero
            />
          </ScrollView>
          
          <View style={styles.legendContainer}>
            <LegendItem label="Types" color="#3b82f6" />
            <LegendItem label="Forms" color="#10b981" />
            <LegendItem label="Planifiés" color="#f59e0b" />
            <LegendItem label="Résultats" color="#ef4444" />
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const LegendItem = ({ label, color }) => (
  <View style={styles.legendItem}>
    <View style={[styles.legendDot, { backgroundColor: color }]} />
    <Text style={styles.legendLabel}>{label}</Text>
  </View>
);

const StatCard = ({ title, count, color, icon, onPress }) => (
  <TouchableOpacity style={styles.statCard} onPress={onPress}>
    <View style={[styles.statIconCircle, { backgroundColor: color + '12' }]}>
      <MaterialCommunityIcons name={icon} size={24} color={color} />
    </View>
    <View style={styles.statInfo}>
        <Text style={styles.statCount}>{count}</Text>
        <Text style={styles.statLabel}>{title}</Text>
    </View>
  </TouchableOpacity>
);

const ActivityItem = ({ item, isLast }) => {
    const getActionStyle = () => {
        if (item.action_type === 'add') return { bg: '#dcfce7', icon: 'plus', color: '#16a34a' };
        if (item.action_type === 'edit') return { bg: '#e0f2fe', icon: 'edit-2', color: '#0284c7' };
        return { bg: '#fee2e2', icon: 'trash-2', color: '#dc2626' };
    };
    const style = getActionStyle();
    
    return (
        <View style={[styles.activityRow, isLast && { borderBottomWidth: 0 }]}>
            <View style={[styles.activityIconCircle, { backgroundColor: style.bg }]}>
                <Feather name={style.icon} size={14} color={style.color} />
            </View>
            <View style={styles.activityTextContent}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.activityMsg} numberOfLines={1}>
                        <Text style={styles.activityAction}>
                            {item.action_type === 'add' ? 'Création de' : item.action_type === 'edit' ? 'Modification de' : 'Suppression de'}
                        </Text>
                        {" "}
                        <Text style={styles.activityObject}>{item.object_repr}</Text>
                    </Text>
                </View>
                <Text style={styles.activityDate}>
                    {new Date(item.action_time).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  scrollContent: { padding: 20 },
  header: { marginBottom: 25 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#1e293b', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 15, color: '#64748b', marginTop: 4 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  statCard: { 
    width: '48.5%', 
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 20, 
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2
  },
  statIconCircle: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  statCount: { fontSize: 22, fontWeight: '800', color: '#1e293b' },
  statLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginTop: 1 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingHorizontal: 5 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  seeAll: { fontSize: 13, color: '#3b82f6', fontWeight: '700' },

  activityCard: { backgroundColor: 'transparent' },
  activityRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 12, 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  activityIconCircle: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  activityTextContent: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activityMsg: { fontSize: 13, color: '#475569', flex: 1, marginRight: 5 },
  activityAction: { color: '#94a3b8' },
  activityObject: { fontWeight: '600', color: '#1e293b' },
  activityDate: { fontSize: 10, color: '#94a3b8', fontWeight: '700' },

  chartCard: { backgroundColor: '#fff', borderRadius: 24, padding: 15, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 3 },
  chartScroll: { marginLeft: -10 },
  chart: { marginVertical: 8, borderRadius: 16 },
  legendContainer: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', marginTop: 10, borderTopWidth: 1, borderTopColor: '#f8fafc', paddingTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 8, marginBottom: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  legendLabel: { fontSize: 11, color: '#64748b', fontWeight: '600' },

  yearBadge: { backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  yearBadgeText: { fontSize: 12, fontWeight: '800', color: '#3b82f6' },
  emptyContainer: { backgroundColor: '#fff', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: '#e2e8f0' },
  emptyText: { textAlign: 'center', color: '#94a3b8', fontSize: 13, marginTop: 5, fontWeight: '500' },
});

export default DashboardScreen;
