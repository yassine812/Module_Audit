import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator, Share, ScrollView, Image, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api, { TUNNEL_URL } from '../src/utils/api';

const API_BASE_URL = TUNNEL_URL;

const ReportScreen = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchReportData();
  }, [id]);

  const fetchReportData = async () => {
    try {
      const response = await api.get(`/audit/api/resultat-audit/${id}/`);
      if (response.data.status === 'success') {
        setData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      const reportUrl = `${API_BASE_URL}/audit/resultat/${id}/report/`;
      await Share.share({
        message: `Rapport d'Audit: ${data?.sujet}\nScore: ${data?.score_audit}%\nLien: ${reportUrl}`,
        url: reportUrl,
      });
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Génération du rapport...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Erreur de chargement du rapport</Text>
      </SafeAreaView>
    );
  }

  // Group details by criteria
  const groupedDetails = data.details.reduce((acc, detail) => {
    const critName = detail.critere || "Général";
    if (!acc[critName]) {
      acc[critName] = {
        name: critName,
        chapitre: detail.chapitre_norme || "",
        items: [],
        totalScore: 0,
        count: 0
      };
    }
    acc[critName].items.push(detail);
    if (detail.value !== null && detail.value >= 0) {
      acc[critName].totalScore += detail.value;
      acc[critName].count += 1;
    }
    return acc;
  }, {});

  const groups = Object.values(groupedDetails);

  const renderItem = ({ item, index }) => (
    <View style={styles.critereBlock}>
      <View style={styles.critereHeader}>
        <View style={styles.critereNumber}>
          <Text style={styles.critereNumberText}>{index + 1}</Text>
        </View>
        <View style={styles.critereTitleContainer}>
          <Text style={styles.critereLabel}>CRITÈRE :</Text>
          <Text style={styles.critereName}>{item.name}</Text>
        </View>
        <Text style={styles.critereScore}>
          {item.count > 0 ? (item.totalScore / item.count).toFixed(2) : '0.00'}
        </Text>
      </View>

      {item.items.map((sub, sIndex) => (
        <View key={sub.id} style={styles.subCritereRow}>
          <View style={styles.subCritereMeta}>
            <View style={styles.bullet} />
          </View>
          <View style={styles.subCritereContent}>
            <View style={styles.subSection}>
              <Text style={styles.subSectionHeader}>Sous-Critère</Text>
              <Text style={styles.subSectionText}>{sub.sous_critere}</Text>
            </View>

            <View style={styles.subSection}>
              <Text style={styles.subSectionHeader}>Observations</Text>
              <Text style={[styles.subSectionText, !sub.commentaire && styles.noData]}>
                {sub.commentaire || "— Aucune observation"}
              </Text>
            </View>

            <View style={styles.subSection}>
              <Text style={styles.subSectionHeader}>Justificatifs</Text>
              {sub.evidences && sub.evidences.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.evidenceList}>
                  {sub.evidences.map((ev) => (
                    <Image 
                      key={ev.id} 
                      source={{ uri: `${API_BASE_URL}${ev.url}` }} 
                      style={styles.evidenceThumb} 
                    />
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.noData}>— Aucun justificatif fourni</Text>
              )}
            </View>
          </View>
          <View style={styles.subCritereScore}>
             <Text style={styles.subScoreText}>
               {sub.value !== null && sub.value !== undefined ? sub.value.toString() : '-'}
             </Text>
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/liste-audit')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.title}>Rapport Haute Fidélité</Text>
        <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
          <Ionicons name="share-social-outline" size={24} color="#2563eb" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={groups}
        keyExtractor={(item) => item.name}
        renderItem={renderItem}
        ListHeaderComponent={() => (
          <View style={styles.reportHeader}>
            {/* Logo & Title */}
            <View style={styles.logoRow}>
              <View style={styles.logoBox}>
                <Image source={require('../assets/images/ab-serve-logo.png')} style={styles.logo} resizeMode="contain" />
              </View>
              <View style={styles.titleBox}>
                <Text style={styles.reportMainTitle}>RAPPORT D'AUDIT</Text>
              </View>
              <View style={styles.infoBox}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>DATE</Text>
                  <Text style={styles.infoValue}>{new Date(data.date_audit).toLocaleDateString()}</Text>
                </View>
                <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: '#93c5fd' }]}>
                  <Text style={styles.infoLabel}>AUDITEUR</Text>
                  <Text style={styles.infoValue} numberOfLines={1}>{data.auditeur}</Text>
                </View>
                <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: '#93c5fd' }]}>
                  <Text style={styles.infoLabel}>PARTICIPANTS</Text>
                  <Text style={styles.infoValue} numberOfLines={1}>{data.participants || '-'}</Text>
                </View>
              </View>
            </View>

            {/* Global Score */}
            <View style={styles.scoreGlobalBlock}>
              <View style={styles.scoreGlobalText}>
                <Text style={styles.scoreGlobalLabel}>Score Global</Text>
                <Text style={styles.scoreGlobalSub}>Indice de Conformité</Text>
              </View>
              <View style={styles.divider} />
              <Text style={styles.scoreGlobalValue}>{data.score_audit.toFixed(2)}</Text>
            </View>

            {/* Commentaire */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>COMMENTAIRE / CONTEXTE DE L'AUDIT</Text>
              </View>
              <View style={styles.sectionBody}>
                <Text style={styles.commentText}>{data.commentaire || "Aucun commentaire spécifié."}</Text>
              </View>
            </View>

            {/* Synthese */}
            <View style={styles.syntheseBlock}>
              <View style={styles.syntheseHeader}>
                <Text style={styles.syntheseHeaderText}>SYNTHÈSE DE L'AUDIT</Text>
              </View>
              <View style={styles.syntheseGrid}>
                <View style={styles.syntheseItem}>
                  <Text style={styles.syntheseItemTitle}>Points Forts</Text>
                  <Text style={styles.syntheseItemText}>{data.point_fort || "—"}</Text>
                </View>
                <View style={[styles.syntheseItem, { borderLeftWidth: 1, borderLeftColor: '#93c5fd' }]}>
                  <Text style={styles.syntheseItemTitle}>Points Sensibles</Text>
                  <Text style={styles.syntheseItemText}>{data.point_sensible || "—"}</Text>
                </View>
              </View>
              <View style={[styles.syntheseGrid, { borderTopWidth: 1, borderTopColor: '#93c5fd' }]}>
                <View style={styles.syntheseItem}>
                  <Text style={[styles.syntheseItemTitle, { color: '#be123c' }]}>Risques</Text>
                  <Text style={[styles.syntheseItemText, { color: '#9f1239', fontWeight: '700' }]}>{data.risque || "—"}</Text>
                </View>
                <View style={[styles.syntheseItem, { borderLeftWidth: 1, borderLeftColor: '#93c5fd' }]}>
                  <Text style={[styles.syntheseItemTitle, { color: '#065f46' }]}>Opportunités</Text>
                  <Text style={[styles.syntheseItemText, { color: '#065f46', fontWeight: '700' }]}>{data.opportunite || "—"}</Text>
                </View>
              </View>
            </View>
            
            {/* Table Header */}
            <View style={styles.tableHeader}>
               <Text style={styles.tableHeaderCol1}>#</Text>
               <Text style={styles.tableHeaderCol2}>CRITÈRES & ÉVALUATIONS</Text>
               <Text style={styles.tableHeaderCol3}>SCORE</Text>
            </View>
          </View>
        )}
        contentContainerStyle={styles.scrollContent}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: { padding: 4 },
  title: { fontSize: 16, fontWeight: '900', color: '#1e3a6e', textTransform: 'uppercase', letterSpacing: 1 },
  shareBtn: { padding: 4 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b', fontWeight: '600' },
  scrollContent: { paddingBottom: 40 },
  
  // Report Header
  reportHeader: { padding: 12 },
  logoRow: {
    flexDirection: 'row',
    height: 90,
    borderWidth: 2,
    borderColor: '#93c5fd',
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  logoBox: { width: '20%', borderRightWidth: 2, borderRightColor: '#93c5fd', justifyContent: 'center', alignItems: 'center', padding: 8 },
  logo: { width: '100%', height: '100%' },
  titleBox: { flex: 1, backgroundColor: '#93c5fd', justifyContent: 'center', alignItems: 'center' },
  reportMainTitle: { fontSize: 20, fontWeight: '900', color: '#1e3a8a', textAlign: 'center', letterSpacing: 2 },
  infoBox: { width: '25%' },
  infoRow: { flex: 1, paddingHorizontal: 6, justifyContent: 'center' },
  infoLabel: { fontSize: 8, fontWeight: '900', color: '#1e3a8a' },
  infoValue: { fontSize: 10, fontWeight: '800', color: '#0f172a' },

  // Score Global
  scoreGlobalBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#93c5fd',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  scoreGlobalText: { flex: 1 },
  scoreGlobalLabel: { fontSize: 9, fontWeight: '900', color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: 1 },
  scoreGlobalSub: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  divider: { width: 1, height: 30, backgroundColor: '#e2e8f0', mx: 16 },
  scoreGlobalValue: { fontSize: 32, fontWeight: '900', color: '#1e3a8a' },

  // Generic Section
  sectionBlock: {
    borderWidth: 2,
    borderColor: '#93c5fd',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  sectionHeader: { backgroundColor: '#93c5fd', paddingVertical: 4, paddingHorizontal: 12 },
  sectionHeaderText: { fontSize: 9, fontWeight: '900', color: '#1e3a8a' },
  sectionBody: { padding: 12, backgroundColor: '#f8fafc' },
  commentText: { fontSize: 12, color: '#475569', fontStyle: 'italic', lineHeight: 18 },

  // Synthese
  syntheseBlock: {
    borderWidth: 2,
    borderColor: '#93c5fd',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  syntheseHeader: { backgroundColor: '#93c5fd', paddingVertical: 6, paddingHorizontal: 12 },
  syntheseHeaderText: { fontSize: 10, fontWeight: '900', color: '#1e3a8a' },
  syntheseGrid: { flexDirection: 'row' },
  syntheseItem: { flex: 1, padding: 12, minHeight: 80 },
  syntheseItemTitle: { fontSize: 9, fontWeight: '900', color: '#1e3a8a', textTransform: 'uppercase', marginBottom: 4 },
  syntheseItemText: { fontSize: 12, color: '#334155', lineHeight: 16 },

  // Table Header
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#93c5fd',
    borderWidth: 1,
    borderColor: '#000',
    paddingVertical: 8,
  },
  tableHeaderCol1: { width: 30, textAlign: 'center', fontSize: 10, fontWeight: '900', color: '#1e3a8a' },
  tableHeaderCol2: { flex: 1, fontSize: 10, fontWeight: '900', color: '#1e3a8a' },
  tableHeaderCol3: { width: 50, textAlign: 'right', fontSize: 10, fontWeight: '900', color: '#1e3a8a', paddingRight: 8 },

  // Criteria Blocks
  critereBlock: { marginBottom: 12, backgroundColor: '#fff', borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#000' },
  critereHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    alignItems: 'center',
    paddingVertical: 6,
  },
  critereNumber: { width: 30, alignItems: 'center' },
  critereNumberText: { fontSize: 13, fontWeight: '900', color: '#1e3a8a' },
  critereTitleContainer: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  critereLabel: { fontSize: 8, color: '#64748b', fontWeight: '900', marginRight: 6 },
  critereName: { fontSize: 13, fontWeight: '900', color: '#1e3a8a', textTransform: 'uppercase', flex: 1 },
  critereScore: { width: 50, textAlign: 'right', fontSize: 16, fontWeight: '900', color: '#1e3a8a', paddingRight: 8 },

  // Sub-Criteria Rows
  subCritereRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
  },
  subCritereMeta: { width: 30, alignItems: 'center', paddingTop: 10 },
  bullet: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1' },
  subCritereContent: { flex: 1, borderLeftWidth: 1, borderLeftColor: '#000' },
  subSection: { borderBottomWidth: 1, borderBottomColor: '#cbd5e1' },
  subSectionHeader: { backgroundColor: '#93c5fd', fontSize: 8, fontWeight: '900', color: '#1e3a8a', paddingHorizontal: 12, paddingVertical: 2, textTransform: 'uppercase' },
  subSectionText: { fontSize: 12, fontWeight: '700', color: '#1e293b', paddingHorizontal: 12, paddingVertical: 4 },
  noData: { fontStyle: 'italic', color: '#94a3b8', fontWeight: '400' },
  subCritereScore: { 
    width: 50, 
    borderLeftWidth: 1, 
    borderLeftColor: '#000', 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#fff' 
  },
  subScoreText: { fontSize: 16, fontWeight: '900', color: '#1e293b' },
  
  evidenceList: { flexDirection: 'row', padding: 8 },
  evidenceThumb: { width: 80, height: 60, borderRadius: 4, marginRight: 8, backgroundColor: '#f1f5f9' },
});

export default ReportScreen;
