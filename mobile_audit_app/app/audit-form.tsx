import React, { useState, useEffect } from 'react';
// Version: 2026-05-13T01:50
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api, { API_PATHS } from '../src/utils/api';
import * as ImagePicker from 'expo-image-picker';
import { WebView } from 'react-native-webview';

const { width, height } = Dimensions.get('window');

const AuditFormScreen = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [auditData, setAuditData] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [showStepsModal, setShowStepsModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfHtml, setPdfHtml] = useState('');

  // AI Synthesis States
  const [showSynthesisModal, setShowSynthesisModal] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [synthesis, setSynthesis] = useState({
    point_fort: '',
    point_sensible: '',
    risque: '',
    opportunite: ''
  });
  
  const fetchData = async () => {
    try {
      const res = await api.get(API_PATHS.RESULTAT_DETAIL(id));
      if (res.data.status === 'success') {
        setAuditData(res.data.data);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Impossible de charger les détails');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const currentDetail = auditData?.details?.[currentIndex];
  const totalSteps = auditData?.details?.length || 0;

  useEffect(() => {
    if (currentDetail) {
      setComment(currentDetail.commentaire || '');
    }
  }, [currentIndex]);

  const handleEvaluate = async (cotationObj) => {
    if (!currentDetail || saving) return;
    
    setSaving(true);
    try {
      const res = await api.post(API_PATHS.UPDATE_DETAIL(currentDetail.id), {
        cotation: cotationObj.content,
        code: cotationObj.code,
        value: cotationObj.valeur,
        commentaire: comment
      });

      if (res.data.status === 'success') {
        const newData = { ...auditData };
        newData.details[currentIndex] = {
          ...currentDetail,
          cotation: cotationObj.content,
          code: cotationObj.code,
          value: cotationObj.valeur,
          commentaire: comment
        };
        newData.score_audit = res.data.score;
        setAuditData(newData);

        if (currentIndex < totalSteps - 1) {
          setCurrentIndex(currentIndex + 1);
        }
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Échec enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = async () => {
    setGenLoading(true);
    try {
      // 1. Fetch AI Suggestions
      const res = await api.get(`/audit/api/resultat-audit/${id}/ai-suggestions/`);
      setSynthesis({
        point_fort: res.data.point_fort || '',
        point_sensible: res.data.point_sensible || '',
        risque: res.data.risque || '',
        opportunite: res.data.opportunite || ''
      });
      setShowSynthesisModal(true);
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Impossible de générer les suggestions IA');
    } finally {
      setGenLoading(false);
    }
  };

  const handleFinalSubmit = async () => {
    setSaving(true);
    try {
      const res = await api.post(API_PATHS.RESULTAT_FINISH(id), {
        point_fort: synthesis.point_fort,
        point_sensible: synthesis.point_sensible,
        risque: synthesis.risque,
        opportunite: synthesis.opportunite
      });
      if (res.data.status === 'success') {
        setShowSynthesisModal(false);
        Alert.alert('Succès', 'Audit finalisé avec succès !', [
            { text: 'Voir le Rapport', onPress: () => router.replace({ pathname: '/report', params: { id } }) }
        ]);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Échec de la finalisation');
    } finally {
      setSaving(false);
    }
  };

  const handlePickImage = async (useCamera = false) => {
    if (useCamera) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'L\'accès à la caméra est nécessaire pour prendre des photos.');
        return;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'L\'accès à la galerie est nécessaire pour choisir des photos.');
        return;
      }
    }

    let result;
    if (useCamera) {
      result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    }

    if (!result.canceled) {
      uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri) => {
    const formData = new FormData();
    const filename = uri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image`;
    formData.append('justificatif', { uri, name: filename, type } as any);
    
    setSaving(true);
    try {
      const res = await api.post(API_PATHS.UPDATE_DETAIL(currentDetail.id), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.status === 'success') {
        const newData = { ...auditData };
        newData.details[currentIndex].evidences = res.data.evidences;
        setAuditData(newData);
      }
    } catch (error) { Alert.alert('Erreur', 'Échec upload'); }
    finally { setSaving(false); }
  };

  const handleOpenPDF = async () => {
    if (!currentDetail?.text_ref_url) {
        Alert.alert('Information', 'Aucun document de référence associé à ce chapitre.');
        return;
    }
    const baseUrl = currentDetail.text_ref_url.startsWith('http') 
        ? currentDetail.text_ref_url 
        : `http://192.168.1.17:8000${currentDetail.text_ref_url}`;
    
    const page = currentDetail.pdf_page || 1;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js"></script>
        <style>
          body { margin: 0; padding: 0; background: #fff; display: flex; flex-direction: column; align-items: center; font-family: sans-serif; }
          #canvas-container { width: 100%; display: flex; justify-content: center; padding: 10px 0; }
          canvas { max-width: 95%; height: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border: 1px solid #e2e8f0; }
          #loading { padding: 40px; color: #64748b; font-weight: bold; text-align: center; }
        </style>
      </head>
      <body>
        <div id="loading">Chargement de la page ${page}...</div>
        <div id="canvas-container">
          <canvas id="pdf-canvas"></canvas>
        </div>
        <script>
          const url = '${baseUrl}';
          const pageNum = ${page};
          
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
          
          pdfjsLib.getDocument(url).promise.then(pdf => {
            pdf.getPage(pageNum).then(page => {
              const viewport = page.getViewport({ scale: 2.0 });
              const canvas = document.getElementById('pdf-canvas');
              const context = canvas.getContext('2d');
              canvas.height = viewport.height;
              canvas.width = viewport.width;
              
              const renderContext = {
                canvasContext: context,
                viewport: viewport
              };
              
              page.render(renderContext).promise.then(() => {
                document.getElementById('loading').style.display = 'none';
              });
            });
          }).catch(err => {
            document.getElementById('loading').innerHTML = 'Erreur: ' + err.message + '<br><small>Vérifiez la connexion au serveur</small>';
          });
        </script>
      </body>
      </html>
    `;
    
    setPdfHtml(html);
    setShowPdfModal(true);
  };

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color="#2563eb" /></View>;
  if (!auditData || !currentDetail) return <View style={styles.loading}><Text>Aucune donnée</Text></View>;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>
            {/* Header */}
            <View style={styles.webHeader}>
              <View style={styles.headerRow}>
                <View style={styles.headerMain}>
                  <Text style={styles.miniLabel}>NORME</Text>
                  <TouchableOpacity style={styles.normeRow} onPress={handleOpenPDF}>
                    <Text style={styles.normeTitle} numberOfLines={1}>{currentDetail.chapitre_norme || 'Chapitre'}</Text>
                    <Ionicons name="document-text-outline" size={18} color="#2563eb" style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                </View>
                <View style={styles.headerSide}>
                  <View style={styles.infoBox}>
                    <Text style={styles.miniLabel}>AUDITEUR</Text>
                    <Text style={styles.infoText}>{auditData.auditeur}</Text>
                  </View>
                  <View style={styles.infoBox}>
                    <Text style={styles.miniLabel}>PARTICIPANT</Text>
                    <Text style={styles.infoText} numberOfLines={1}>{auditData.participants}</Text>
                  </View>
                </View>
              </View>
            </View>

            <ScrollView 
                style={styles.content} 
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
              <View style={styles.auditBody}>
                <View style={styles.titleRow}>
                    <Text style={styles.scoreText}>SCORE: {auditData.score_audit > 0 ? (auditData.score_audit * 100).toFixed(0) + '%' : '--'}</Text>
                    <Text style={styles.stepIndicator}>{currentIndex + 1} / {totalSteps}</Text>
                </View>
                <Text style={styles.critereTitle}>{currentDetail.critere}</Text>
                
                <View style={styles.section}>
                    <Text style={styles.miniLabel}>SOUS-CRITÈRE</Text>
                    <Text style={styles.descText}>{currentDetail.sous_critere}</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.miniLabel}>PREUVE ATTENDUE</Text>
                    <Text style={styles.preuveText}>{currentDetail.preuve_attendu || 'N/A'}</Text>
                </View>

                {/* Justificatif & Observations */}
                <View style={styles.actionGrid}>
                    <View style={styles.halfSection}>
                        <Text style={styles.miniLabel}>JUSTIFICATIF</Text>
                        <View style={styles.justifGrid}>
                            <TouchableOpacity style={styles.justifBtn} onPress={() => handlePickImage(true)}>
                                <Ionicons name="camera-outline" size={24} color="#1e3a6e" />
                                <Text style={styles.justifBtnText}>PHOTO</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.justifBtn} onPress={() => handlePickImage(false)}>
                                <Ionicons name="cloud-upload-outline" size={24} color="#1e3a6e" />
                                <Text style={styles.justifBtnText}>TÉLÉVERSER</Text>
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                            {currentDetail.evidences?.map((ev, idx) => (
                                <Image key={idx} source={{ uri: ev.url.startsWith('http') ? ev.url : `http://192.168.1.17:8000${ev.url}` }} style={styles.evidenceThumb} />
                            ))}
                        </ScrollView>
                    </View>

                    <View style={[styles.halfSection, { marginLeft: 16 }]}>
                        <Text style={styles.miniLabel}>OBSERVATIONS</Text>
                        <TextInput
                            style={styles.obsInput}
                            placeholder="Commentaires..."
                            multiline
                            value={comment}
                            onChangeText={setComment}
                            onBlur={() => handleEvaluate({ content: currentDetail.cotation, code: currentDetail.code, valeur: currentDetail.value })}
                        />
                    </View>
                </View>
              </View>

              {/* Evaluation Section */}
              <View style={styles.evalContainer}>
                  <Text style={styles.evalHeaderLabel}>ÉVALUATION DE CONFORMITÉ</Text>
                  <View style={styles.evalGrid}>
                      {[
                          { content: 'Conforme', code: 'C', label: 'Vert', color: '#22c55e', icon: 'checkmark' },
                          { content: 'Partiellement conforme', code: 'PC', label: 'Orange', color: '#f97316', icon: 'warning' },
                          { content: 'Non Conforme', code: 'NC', label: 'Rouge', color: '#ef4444', icon: 'close' },
                          { content: 'Non Applicable', code: 'NA', label: 'Noir', color: '#1e293b', icon: 'remove' },
                      ].map((cot, idx) => {
                          const isSelected = currentDetail.cotation === cot.content;
                          return (
                              <TouchableOpacity 
                                  key={idx} 
                                  style={styles.evalItem} 
                                  onPress={() => handleEvaluate({ ...cot, valeur: cot.code === 'C' ? 1 : cot.code === 'PC' ? 0.5 : 0 })}
                              >
                                  <View style={[styles.evalIcon, { backgroundColor: cot.color }, isSelected && styles.evalIconSelected]}>
                                      <Ionicons name={cot.icon as any} size={28} color="#fff" />
                                  </View>
                                  <Text style={styles.evalMainLabel}>{cot.content}</Text>
                              </TouchableOpacity>
                          );
                      })}
                  </View>
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity 
                style={[styles.annulerBtn, currentIndex === 0 && styles.disabledBtn]} 
                onPress={() => currentIndex > 0 && setCurrentIndex(currentIndex - 1)}
                disabled={currentIndex === 0}
              >
                  <Ionicons name="chevron-back" size={18} color={currentIndex === 0 ? '#cbd5e1' : '#64748b'} />
                  <Text style={[styles.annulerBtnText, currentIndex === 0 && { color: '#cbd5e1' }]}>Précédent</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.suivantBtn} onPress={() => {
                  if (currentIndex < totalSteps - 1) setCurrentIndex(currentIndex + 1);
                  else handleFinish();
              }}>
                  {genLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                  ) : (
                      <>
                        <Text style={styles.suivantBtnText}>{currentIndex === totalSteps - 1 ? 'Finaliser Audit' : 'Suivant'}</Text>
                        <Ionicons name="chevron-forward" size={18} color="#fff" style={{ marginLeft: 4 }} />
                      </>
                  )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* Synthesis Modal (AI Suggestions) */}
      <Modal visible={showSynthesisModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { height: '85%' }]}>
                  <View style={styles.modalHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ width: 4, height: 20, backgroundColor: '#1e3a6e', borderRadius: 2, marginRight: 10 }} />
                        <Text style={styles.modalTitle}>Synthèse de l'Audit (IA)</Text>
                    </View>
                    <TouchableOpacity onPress={() => setShowSynthesisModal(false)}>
                        <Ionicons name="close" size={24} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                  
                  <ScrollView style={{ flex: 1, padding: 16 }} showsVerticalScrollIndicator={false}>
                      <Text style={styles.synthesisSub}>Synthèse générée par l'IA basée sur vos observations.</Text>
                      
                      <View style={styles.synthGrid}>
                        <View style={styles.synthGridRow}>
                          <View style={styles.synthBox}>
                              <Text style={[styles.miniLabel, { color: '#1e3a6e' }]}>POINTS FORTS <Text style={{ color: '#22c55e' }}>●</Text></Text>
                              <TextInput 
                                style={[styles.synthInput, { backgroundColor: '#fcfdfe' }]} 
                                multiline 
                                value={synthesis.point_fort}
                                onChangeText={(t) => setSynthesis({...synthesis, point_fort: t})}
                              />
                          </View>

                          <View style={styles.synthBox}>
                              <Text style={[styles.miniLabel, { color: '#1e3a6e' }]}>POINTS SENSIBLES <Text style={{ color: '#f97316' }}>●</Text></Text>
                              <TextInput 
                                style={[styles.synthInput, { backgroundColor: '#fcfdfe' }]} 
                                multiline 
                                value={synthesis.point_sensible}
                                onChangeText={(t) => setSynthesis({...synthesis, point_sensible: t})}
                              />
                          </View>
                        </View>

                        <View style={styles.synthGridRow}>
                          <View style={styles.synthBox}>
                              <Text style={[styles.miniLabel, { color: '#1e3a6e' }]}>RISQUES <Text style={{ color: '#ef4444' }}>●</Text></Text>
                              <TextInput 
                                style={[styles.synthInput, { backgroundColor: '#fff5f5' }]} 
                                multiline 
                                value={synthesis.risque}
                                onChangeText={(t) => setSynthesis({...synthesis, risque: t})}
                              />
                          </View>

                          <View style={styles.synthBox}>
                              <Text style={[styles.miniLabel, { color: '#1e3a6e' }]}>OPPORTUNITÉS <Text style={{ color: '#0ea5e9' }}>●</Text></Text>
                              <TextInput 
                                style={[styles.synthInput, { backgroundColor: '#f0f9ff' }]} 
                                multiline 
                                value={synthesis.opportunite}
                                onChangeText={(t) => setSynthesis({...synthesis, opportunite: t})}
                              />
                          </View>
                        </View>
                      </View>
                      <View style={{ height: 40 }} />
                  </ScrollView>

                  <View style={styles.modalFooter}>
                      <TouchableOpacity style={styles.synthCancelBtn} onPress={() => setShowSynthesisModal(false)}>
                          <Text style={styles.synthCancelText}>Annuler</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.synthSubmitBtn} onPress={handleFinalSubmit} disabled={saving}>
                          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.synthSubmitText}>Finaliser l'Audit</Text>}
                      </TouchableOpacity>
                  </View>
              </View>
          </View>
      </Modal>

      {/* PDF Modal */}
      <Modal visible={showPdfModal} transparent animationType="fade">
        <View style={styles.pdfOverlay}>
          <TouchableOpacity style={styles.pdfCloseArea} onPress={() => setShowPdfModal(false)} />
          <View style={styles.pdfContent}>
            <View style={styles.pdfHeader}>
              <Text style={styles.pdfTitle} numberOfLines={1}>{currentDetail?.chapitre_norme}</Text>
              <TouchableOpacity onPress={() => setShowPdfModal(false)} style={styles.pdfCloseBtn}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1, backgroundColor: '#fff' }}>
                <WebView 
                    source={{ html: pdfHtml }} 
                    style={{ flex: 1 }}
                    originWhitelist={['*']}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                />
            </View>
          </View>
        </View>
      </Modal>

      {/* Steps List Modal */}
      <Modal visible={showStepsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Critères d'audit</Text>
              <TouchableOpacity onPress={() => setShowStepsModal(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1, padding: 16 }}>
              {auditData?.details?.map((item, idx) => (
                <TouchableOpacity key={idx} style={[styles.stepRow, currentIndex === idx && styles.stepRowActive]} onPress={() => { setCurrentIndex(idx); setShowStepsModal(false); }}>
                  <Text style={styles.stepNum}>{idx + 1}</Text>
                  <Text style={styles.stepLabel} numberOfLines={1}>{item.sous_critere}</Text>
                  {item.cotation !== "" && <Ionicons name="checkmark-circle" size={16} color="#22c55e" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  webHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', backgroundColor: '#fff' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerMain: { flex: 1.5 },
  miniLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 1, marginBottom: 4 },
  normeRow: { flexDirection: 'row', alignItems: 'center' },
  normeTitle: { fontSize: 18, fontWeight: '900', color: '#1e3a6e' },
  headerSide: { flexDirection: 'row', gap: 20 },
  infoBox: { alignItems: 'flex-start' },
  infoText: { fontSize: 13, fontWeight: '700', color: '#1e293b' },

  content: { flex: 1 },
  contentContainer: { paddingBottom: 20 },
  auditBody: { padding: 20 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  scoreText: { fontSize: 12, fontWeight: '800', color: '#3b82f6', letterSpacing: 1 },
  stepIndicator: { fontSize: 12, fontWeight: '700', color: '#94a3b8' },
  critereTitle: { fontSize: 24, fontWeight: '900', color: '#0f172a', marginBottom: 20 },
  section: { marginBottom: 24 },
  descText: { fontSize: 15, color: '#334155', fontWeight: '500', lineHeight: 22 },
  preuveText: { fontSize: 14, color: '#64748b', fontStyle: 'italic', marginTop: 4 },

  actionGrid: { flexDirection: 'row', marginTop: 10 },
  halfSection: { flex: 1 },
  justifGrid: { flexDirection: 'row', gap: 12 },
  justifBtn: { flex: 1, height: 80, borderWidth: 1.5, borderColor: '#e2e8f0', borderStyle: 'dashed', borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fcfdfe' },
  justifBtnText: { fontSize: 8, fontWeight: '800', color: '#64748b', marginTop: 8, textAlign: 'center' },
  evidenceThumb: { width: 60, height: 60, borderRadius: 8, marginRight: 8 },

  obsInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, height: 80, textAlignVertical: 'top', fontSize: 14, color: '#334155', backgroundColor: '#fff' },

  evalContainer: { padding: 20, borderTopWidth: 1, borderTopColor: '#e2e8f0', backgroundColor: '#fff', marginTop: 20 },
  evalHeaderLabel: { fontSize: 11, fontWeight: '800', color: '#94a3b8', textAlign: 'center', letterSpacing: 1, marginBottom: 24 },
  evalGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  evalItem: { alignItems: 'center', width: '23%' },
  evalIcon: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  evalIconSelected: { transform: [{ scale: 1.15 }], elevation: 8, shadowOpacity: 0.3, shadowRadius: 10 },
  evalMainLabel: { fontSize: 10, fontWeight: '800', color: '#1e293b', textAlign: 'center' },

  footer: { height: 80, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff' },
  annulerBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center' },
  annulerBtnText: { color: '#64748b', fontWeight: '700', fontSize: 14 },
  disabledBtn: { opacity: 0.3 },
  suivantBtn: { backgroundColor: '#1e3a6e', paddingVertical: 14, paddingHorizontal: 30, borderRadius: 10, flexDirection: 'row', alignItems: 'center' },
  suivantBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '75%' },
  modalHeader: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  stepRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 8 },
  stepRowActive: { backgroundColor: '#f0f7ff' },
  stepNum: { width: 30, fontWeight: '800', color: '#94a3b8', fontSize: 14 },
  stepLabel: { flex: 1, fontSize: 15, color: '#475569' },

  pdfOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  pdfCloseArea: { position: 'absolute', inset: 0 },
  pdfContent: { width: '100%', height: '85%', backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', elevation: 10, shadowOpacity: 0.5, shadowRadius: 15 },
  pdfHeader: { height: 56, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 },
  pdfTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', flex: 1 },
  pdfCloseBtn: { padding: 4 },
  pdfLoading: { position: 'absolute', top: '50%', left: '50%', marginLeft: -12, marginTop: -12 },

  synthesisSub: { fontSize: 12, color: '#64748b', marginBottom: 20, textAlign: 'center', fontWeight: '500' },
  synthGrid: { gap: 12 },
  synthGridRow: { flexDirection: 'row', gap: 12 },
  synthBox: { flex: 1 },
  synthInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, minHeight: 120, textAlignVertical: 'top', fontSize: 11, color: '#334155', marginTop: 6, lineHeight: 16 },
  modalFooter: { padding: 20, borderTopWidth: 1, borderTopColor: '#f1f5f9', flexDirection: 'row', gap: 12 },
  synthCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  synthCancelText: { color: '#64748b', fontWeight: '700' },
  synthSubmitBtn: { flex: 2, paddingVertical: 14, borderRadius: 10, backgroundColor: '#16a34a', alignItems: 'center' },
  synthSubmitText: { color: '#fff', fontWeight: '800' }
});

export default AuditFormScreen;
