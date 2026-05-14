import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator, Share, ScrollView, Image, FlatList, Alert, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView as SAV } from 'react-native-safe-area-context';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import api, { TUNNEL_URL, API_PATHS } from '../src/utils/api';
import * as Print from 'expo-print';

const API_BASE_URL = TUNNEL_URL;

const ReportScreen = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [downloadModalVisible, setDownloadModalVisible] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailMessage, setEmailMessage] = useState("Bonjour,\n\nVeuillez trouver ci-joint le rapport d'audit.\n\nCordialement.");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

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
        message: `Rapport d'Audit: ${data?.sujet}\nLien: ${reportUrl}`,
        url: reportUrl,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handlePrint = async () => {
    try {
      const reportUrl = `${API_BASE_URL}/audit/resultat/${id}/report/`;
      const htmlResponse = await api.get(reportUrl, { responseType: 'text' });
      const reportHtml = htmlResponse.data;

      // Generating a temporary PDF is more robust than direct printing
      const { uri } = await Print.printToFileAsync({
        html: reportHtml,
      });

      // Using shareAsync allows the user to select 'Print' from the share sheet,
      // which is the most reliable way to print in Expo/React Native.
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      // Ignore user cancellation errors
      if (error instanceof Error && error.message.includes('Printing did not complete')) return;
      
      console.error('Print error:', error);
      Alert.alert("Erreur", "Impossible de préparer le document pour l'impression.");
    }
  };

  const handleDownloadPDF = () => {
    setDownloadModalVisible(true);
  };

  const executeDownload = async (orientation: 'portrait' | 'landscape') => {
    setDownloadModalVisible(false);
    setGeneratingPdf(true);
    
    try {
      // 1. Fetch HTML
      const reportUrl = `${API_BASE_URL}/audit/resultat/${id}/report/`;
      const htmlResponse = await api.get(reportUrl, { responseType: 'text' });
      let reportHtml = htmlResponse.data;

      // 2. Inject Orientation CSS if needed
      if (orientation === 'landscape') {
        const orientationStyle = `<style>@page { size: landscape; }</style>`;
        reportHtml = reportHtml.replace('</head>', `${orientationStyle}</head>`);
      }

      // 3. Generate PDF
      const { uri } = await Print.printToFileAsync({ 
        html: reportHtml,
        base64: false
      });

      // 4. Share/Save
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert("Erreur", "Impossible de générer le PDF.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleEmail = () => {
    setEmailModalVisible(true);
  };

  const sendEmailReport = async () => {
    if (!emailTo) {
      Alert.alert("Erreur", "Veuillez saisir au moins une adresse email.");
      return;
    }

    setSendingEmail(true);
    try {
      // 1. Fetch the report HTML from the server
      const reportUrl = `${API_BASE_URL}/audit/resultat/${id}/report/`;
      const htmlResponse = await api.get(reportUrl, { responseType: 'text' });
      const reportHtml = htmlResponse.data;

      // 2. Convert HTML to PDF locally
      const { base64 } = await Print.printToFileAsync({ 
        html: reportHtml,
        base64: true 
      });

      // 3. Send to backend
      const response = await api.post(API_PATHS.RESULTAT_SEND_EMAIL(id), {
        email_to: emailTo,
        email_message: emailMessage,
        pdf_data: base64 // expo-print base64 is already just the string
      });

      if (response.data.status === 'success') {
        Alert.alert("Succès", "Rapport envoyé par email avec succès.");
        setEmailModalVisible(false);
      } else {
        Alert.alert("Erreur", response.data.message || "Une erreur est survenue.");
      }
    } catch (error) {
      console.error('Email send error:', error);
      Alert.alert("Erreur", "Impossible d'envoyer l'email. Vérifiez que toutes les dépendances sont prêtes.");
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading || generatingPdf) {
    return (
      <SAV style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>{generatingPdf ? "Génération du PDF..." : "Chargement du rapport..."}</Text>
        </View>
      </SAV>
    );
  }

  if (!data) {
    return (
      <SAV style={styles.container}>
        <Text>Erreur de chargement du rapport</Text>
      </SAV>
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
              <Text style={styles.subSectionText}>{sub.sous_critere}</Text>
            </View>

            {sub.commentaire ? (
              <View style={styles.subSection}>
                <Text style={styles.subSectionHeader}>Observations</Text>
                <Text style={styles.subSectionText}>
                  {sub.commentaire}
                </Text>
              </View>
            ) : null}

            {sub.evidences && sub.evidences.length > 0 ? (
              <View style={styles.subSection}>
                <Text style={styles.subSectionHeader}>Justificatifs</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.evidenceList}>
                  {sub.evidences.map((ev) => (
                    <Image 
                      key={ev.id} 
                      source={{ uri: `${API_BASE_URL}${ev.url}` }} 
                      style={styles.evidenceThumb} 
                    />
                  ))}
                </ScrollView>
              </View>
            ) : null}
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
    <SAV style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/liste-audit')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.title}>Rapport Haute Fidélité</Text>
        <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
          <Ionicons name="share-social-outline" size={24} color="#2563eb" />
        </TouchableOpacity>
      </View>

      <View style={styles.actionBar}>
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleEmail}>
            <Feather name="mail" size={24} color="#1e293b" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleDownloadPDF}>
            <MaterialCommunityIcons name="file-download-outline" size={26} color="#1e293b" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handlePrint}>
            <Feather name="printer" size={24} color="#1e293b" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={groups}
        keyExtractor={(item) => item.name}
        renderItem={renderItem}
        ListHeaderComponent={() => (
          <View style={styles.reportHeader}>
            {/* Header Box (Simplified) */}
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
              </View>
            </View>

            {/* Global Score (Percentage) */}
            <View style={styles.scoreGlobalBlock}>
              <View style={styles.scoreGlobalText}>
                <Text style={styles.scoreGlobalLabel}>Score Global</Text>
                <Text style={styles.scoreGlobalSub}>Indice de Conformité</Text>
              </View>
              <View style={styles.divider} />
              <Text style={styles.scoreGlobalValue}>{(data.score_audit * 100).toFixed(0)}<Text style={{ fontSize: 18 }}>%</Text></Text>
            </View>

            {/* Intervenants Section */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>INTERVENANTS DE L'AUDIT</Text>
              </View>
              <View style={styles.intervenantGrid}>
                <View style={styles.intervenantItem}>
                  <Text style={styles.intervenantLabel}>Auditeur</Text>
                  <View style={styles.intervenantValueRow}>
                    <Ionicons name="person-outline" size={16} color="#1e3a8a" />
                    <Text style={styles.intervenantValue}>{data.auditeur}</Text>
                  </View>
                </View>
                <View style={[styles.intervenantItem, { borderLeftWidth: 1, borderLeftColor: '#e2e8f0' }]}>
                  <Text style={styles.intervenantLabel}>Participants</Text>
                  <View style={styles.intervenantValueRow}>
                    <Ionicons name="people-outline" size={18} color="#1e3a8a" />
                    <Text style={styles.intervenantValue}>{data.participants || '-'}</Text>
                  </View>
                </View>
              </View>
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
                <View style={[styles.syntheseItem, { borderLeftWidth: 1, borderLeftColor: '#e2e8f0' }]}>
                  <Text style={styles.syntheseItemTitle}>Points Sensibles</Text>
                  <Text style={styles.syntheseItemText}>{data.point_sensible || "—"}</Text>
                </View>
              </View>
              <View style={[styles.syntheseGrid, { borderTopWidth: 1, borderTopColor: '#e2e8f0' }]}>
                <View style={styles.syntheseItem}>
                  <Text style={[styles.syntheseItemTitle, { color: '#be123c' }]}>Risques</Text>
                  <Text style={[styles.syntheseItemText, { color: '#9f1239', fontWeight: '700' }]}>{data.risque || "—"}</Text>
                </View>
                <View style={[styles.syntheseItem, { borderLeftWidth: 1, borderLeftColor: '#e2e8f0' }]}>
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

      {/* Email Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={emailModalVisible}
        onRequestClose={() => setEmailModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Envoyer par Email</Text>
              <TouchableOpacity onPress={() => setEmailModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody} bounces={false}>
              <View style={styles.attachmentBox}>
                <View style={styles.attachmentIcon}>
                   <MaterialCommunityIcons name="file-pdf-box" size={32} color="#ef4444" />
                </View>
                <View style={styles.attachmentInfo}>
                   <Text style={styles.attachmentLabel}>Fichier joint :</Text>
                   <Text style={styles.attachmentName}>Rapport_Audit_{id}.pdf</Text>
                </View>
              </View>

              <Text style={styles.inputLabel}>Destinataires (séparés par des virgules)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="exemple@email.com, contact@audit.com"
                value={emailTo}
                onChangeText={setEmailTo}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              
              <Text style={styles.inputLabel}>Message</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Votre message..."
                value={emailMessage}
                onChangeText={setEmailMessage}
                multiline
                numberOfLines={4}
              />
              
              <TouchableOpacity 
                style={[styles.sendBtn, sendingEmail && styles.sendBtnDisabled]} 
                onPress={sendEmailReport}
                disabled={sendingEmail}
              >
                {sendingEmail ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Feather name="send" size={18} color="#fff" />
                    <Text style={styles.sendBtnText}>Envoyer le rapport</Text>
                  </>
                )}
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {/* Download Options Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={downloadModalVisible}
        onRequestClose={() => setDownloadModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: 24 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Configuration du PDF</Text>
              <TouchableOpacity onPress={() => setDownloadModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={[styles.inputLabel, { textAlign: 'center', marginBottom: 20 }]}>Choisir l'orientation</Text>
              
              <View style={styles.orientationGrid}>
                <TouchableOpacity 
                  style={styles.orientationCard} 
                  onPress={() => executeDownload('portrait')}
                >
                  <View style={styles.portraitIconBox}>
                    <View style={styles.portraitSheet} />
                  </View>
                  <Text style={styles.orientationName}>Portrait</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.orientationCard} 
                  onPress={() => executeDownload('landscape')}
                >
                  <View style={styles.landscapeIconBox}>
                    <View style={styles.landscapeSheet} />
                  </View>
                  <Text style={styles.orientationName}>Paysage</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SAV>
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
  
  // Action Bar
  actionBar: {
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionBtn: {
    width: 50,
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  
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
  syntheseGrid: { flexDirection: 'row', backgroundColor: '#fff' },
  syntheseItem: { flex: 1, padding: 12, minHeight: 60 },
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
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden', elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  modalBody: { padding: 20 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 8, marginTop: 12 },
  textInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, fontSize: 14, color: '#1e293b', backgroundColor: '#f8fafc' },
  textArea: { height: 100, textAlignVertical: 'top' },
  sendBtn: { backgroundColor: '#2563eb', borderRadius: 16, paddingVertical: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24, gap: 10 },
  sendBtnDisabled: { opacity: 0.6 },
  sendBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Attachment styles
  attachmentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    borderStyle: 'dashed',
  },
  attachmentIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  attachmentInfo: { flex: 1 },
  attachmentLabel: { fontSize: 10, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  attachmentName: { fontSize: 13, fontWeight: '700', color: '#1e293b', marginTop: 2 },

  // Orientation Styles
  orientationGrid: { flexDirection: 'row', gap: 16 },
  orientationCard: { 
    flex: 1, 
    backgroundColor: '#f8fafc', 
    borderWidth: 1.5, 
    borderColor: '#e2e8f0', 
    borderRadius: 20, 
    padding: 20, 
    alignItems: 'center',
    justifyContent: 'center',
  },
  portraitIconBox: { 
    width: 60, 
    height: 70, 
    backgroundColor: '#fff', 
    borderWidth: 2, 
    borderColor: '#2563eb', 
    borderRadius: 8, 
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  portraitSheet: { width: 30, height: 40, backgroundColor: '#dbeafe', borderRadius: 4 },
  landscapeIconBox: { 
    width: 75, 
    height: 55, 
    backgroundColor: '#fff', 
    borderWidth: 2, 
    borderColor: '#64748b', 
    borderRadius: 8, 
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  landscapeSheet: { width: 45, height: 30, backgroundColor: '#f1f5f9', borderRadius: 4 },
  orientationName: { fontSize: 14, fontWeight: '800', color: '#1e293b', textTransform: 'uppercase', letterSpacing: 1 },

  // Intervenants styles
  intervenantGrid: { flexDirection: 'row', backgroundColor: '#fff' },
  intervenantItem: { flex: 1, padding: 12, minHeight: 60 },
  intervenantLabel: { fontSize: 9, fontWeight: '900', color: '#1e3a8a', textTransform: 'uppercase', marginBottom: 6, opacity: 0.8 },
  intervenantValueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  intervenantValue: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
});

export default ReportScreen;
