import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  ScrollView,
  Switch,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import api, { getApiUrl, API_PATHS } from '../src/utils/api';

const FormulaireFormScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [processus, setProcessus] = useState([]);
  const [typesAudit, setTypesAudit] = useState([]);
  const [sections, setSections] = useState([]);
  const [typesEquipement, setTypesEquipement] = useState([]);
  const [chapitres, setChapitres] = useState([]);
  const [typeCotations, setTypeCotations] = useState([]);
  const [preuvesAttendues, setPreuvesAttendues] = useState([]);
  
  const [isSelectingProcessus, setIsSelectingProcessus] = useState(false);
  const [isSelectingType, setIsSelectingType] = useState(false);
  const [isSelectingSection, setIsSelectingSection] = useState(false);
  const [isSelectingEquipement, setIsSelectingEquipement] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    processus: '',
    type_audit: '',
    section: '',
    type_equipement: [] as number[],
    selectedScIds: [] as number[],
  });

  const [structure, setStructure] = useState<any[]>([]);
  const [expandedCriteres, setExpandedCriteres] = useState<number[]>([]);

  const fetchMetadata = async () => {
    try {
      const [procRes, typeRes, sectRes, equipRes, chapRes, cotRes, proofRes] = await Promise.all([
        api.get(getApiUrl(API_PATHS.PROCESSUS)).catch(() => ({ data: { data: [] } })),
        api.get(getApiUrl(API_PATHS.TYPES_AUDIT)).catch(() => ({ data: { data: [] } })),
        api.get(getApiUrl(API_PATHS.SECTIONS)).catch(() => ({ data: { data: [] } })),
        api.get(getApiUrl(API_PATHS.TYPES_EQUIPEMENTS)).catch(() => ({ data: { data: [] } })),
        api.get(getApiUrl(API_PATHS.CHAPITRES)).catch(() => ({ data: { data: [] } })),
        api.get(getApiUrl(API_PATHS.TYPE_COTATION)).catch(() => ({ data: { data: [] } })),
        api.get(getApiUrl(API_PATHS.PREUVES_ATTENDUES)).catch(() => ({ data: { data: [] } })),
      ]);
      setProcessus(procRes.data.data || []);
      setTypesAudit(typeRes.data.data || []);
      setSections(sectRes.data.data || []);
      setTypesEquipement(equipRes.data.data || []);
      setChapitres(chapRes.data.data || []);
      setTypeCotations(cotRes.data.data || []);
      setPreuvesAttendues(proofRes.data.data || []);

      if (isEditing) {
        setLoading(true);
        const res = await api.get(getApiUrl(`${API_PATHS.FORMULAIRES}${id}/`));
        const form = res.data.data;
        setFormData({
          name: form.name,
          processus: form.processus_id || '',
          type_audit: form.type_audit_id || '',
          section: form.section_id || '',
          type_equipement: form.type_equipement_ids || (form.type_equipement_id ? [form.type_equipement_id] : []),
          selectedScIds: form.sous_criteres_ids || [],
        });
        // Auto-sync if type_audit exists
        if (form.type_audit_id) {
          handleSync(form.type_audit_id);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, [id]);

  const handleSync = async (typeIdOverride?: any) => {
    const typeId = typeIdOverride || formData.type_audit;
    if (!typeId) {
      Alert.alert('Attention', "Veuillez sélectionner un Type d'Audit pour synchroniser la structure.");
      return;
    }

    setSyncing(true);
    try {
      const res = await api.get(getApiUrl(`/audit/get-structure/?type_audit_id=${typeId}`));
      setStructure(res.data || []);
      // CLOSED by default as requested
      setExpandedCriteres([]);
    } catch (error) {
      Alert.alert('Erreur', "Impossible de synchroniser la structure");
    } finally {
      setSyncing(false);
    }
  };

  const toggleCritere = (critId: number) => {
    setExpandedCriteres(prev => 
      prev.includes(critId) ? prev.filter(id => id !== critId) : [...prev, critId]
    );
  };

  const toggleSc = (scId: number) => {
    setFormData(prev => ({
      ...prev,
      selectedScIds: prev.selectedScIds.includes(scId)
        ? prev.selectedScIds.filter(id => id !== scId)
        : [...prev.selectedScIds, scId]
    }));
  };

  const toggleAllInCrit = (critId: number, scs: any[]) => {
    const scIds = scs.map(sc => sc.id);
    const allSelected = scIds.every(id => formData.selectedScIds.includes(id));
    
    if (allSelected) {
      setFormData(prev => ({
        ...prev,
        selectedScIds: prev.selectedScIds.filter(id => !scIds.includes(id))
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        selectedScIds: [...new Set([...prev.selectedScIds, ...scIds])]
      }));
    }
  };

  const handleSave = async () => {
    if (!formData.name) return Alert.alert('Erreur', 'Nom requis');
    if (!formData.type_audit) return Alert.alert('Erreur', "Type d'audit requis");

    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        processus: formData.processus || null,
        type_audit: formData.type_audit || null,
        section: formData.section || null,
        type_equipement: formData.type_equipement,
        sous_criteres: formData.selectedScIds,
      };

      if (isEditing) {
        await api.put(getApiUrl(`${API_PATHS.FORMULAIRES}${id}/`), payload);
      } else {
        await api.post(getApiUrl(API_PATHS.FORMULAIRES), payload);
      }
      router.back();
    } catch (error) {
      Alert.alert('Erreur', "Échec de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  const [critereModalVisible, setCritereModalVisible] = useState(false);
  const [isEditingCritere, setIsEditingCritere] = useState(false);
  const [currentCritereId, setCurrentCritereId] = useState<number | null>(null);
  const [critereFormData, setCritereFormData] = useState({ name: '', chapitre_norme: '' });
  const [isSelectingCritereChapitre, setIsSelectingCritereChapitre] = useState(false);

  const handleOpenAddCritere = () => {
    setIsEditingCritere(false);
    setCritereFormData({ name: '', chapitre_norme: '' });
    setIsSelectingCritereChapitre(false);
    setCritereModalVisible(true);
  };

  const handleOpenEditCritere = (crit: any) => {
    setIsEditingCritere(true);
    setCurrentCritereId(crit.critere_id);
    setCritereFormData({ 
      name: crit.critere_nom, 
      chapitre_norme: crit.chapitre_id?.toString() || '' 
    });
    setIsSelectingCritereChapitre(false);
    setCritereModalVisible(true);
  };

  const handleDeleteCritere = (critId: number) => {
    Alert.alert('Supprimer', 'Êtes-vous sûr de vouloir supprimer ce critère et tous ses sous-critères ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
          try {
            await api.delete(getApiUrl(`${API_PATHS.CRITERES}${critId}/`));
            handleSync();
          } catch (e) { Alert.alert('Erreur', 'Impossible de supprimer'); }
      }}
    ]);
  };

  const handleSubmitCritere = async () => {
    if (!critereFormData.name) return Alert.alert('Erreur', 'Nom requis');
    try {
      const payload = {
        name: critereFormData.name,
        chapitre_norme: critereFormData.chapitre_norme || null,
        formulaire: id ? parseInt(id as string) : null,
        type_audit: formData.type_audit ? [parseInt(formData.type_audit)] : []
      };

      if (isEditingCritere) {
        await api.put(getApiUrl(`${API_PATHS.CRITERES}${currentCritereId}/`), payload);
      } else {
        await api.post(getApiUrl(API_PATHS.CRITERES), payload);
      }
      setCritereModalVisible(false);
      handleSync();
    } catch (e) { Alert.alert('Erreur', "Échec de l'enregistrement"); }
  };

  const [scModalVisible, setScModalVisible] = useState(false);
  const [isEditingSc, setIsEditingSc] = useState(false);
  const [currentScId, setCurrentScId] = useState<number | null>(null);
  const [scFormData, setScFormData] = useState({ 
    content: '', 
    reaction: '', 
    type_cotation: '', 
    critere: '',
    preuves_attendues: [] as number[]
  });
  const [isSelectingScCotation, setIsSelectingScCotation] = useState(false);
  const [isSelectingPreuves, setIsSelectingPreuves] = useState(false);

  const handleOpenAddSc = (critId: number) => {
    setIsEditingSc(false);
    setScFormData({ content: '', reaction: '', type_cotation: '', critere: critId.toString(), preuves_attendues: [] });
    setIsSelectingScCotation(false);
    setIsSelectingPreuves(false);
    setScModalVisible(true);
  };

  const handleOpenEditSc = (sc: any, critId: number) => {
    setIsEditingSc(true);
    setCurrentScId(sc.id);
    setScFormData({ 
      content: sc.nom, 
      reaction: sc.reaction || '',
      type_cotation: sc.type_cotation_id?.toString() || '',
      critere: critId.toString(),
      preuves_attendues: sc.preuves_attendues_ids || []
    });
    setIsSelectingScCotation(false);
    setIsSelectingPreuves(false);
    setScModalVisible(true);
  };

  const handleDeleteSc = (scId: number) => {
    Alert.alert('Supprimer', 'Êtes-vous sûr de vouloir supprimer ce sous-critère ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
          try {
            await api.delete(getApiUrl(`${API_PATHS.SOUS_CRITERES}${scId}/`));
            handleSync();
          } catch (e) { Alert.alert('Erreur', 'Impossible de supprimer'); }
      }}
    ]);
  };

  const handleSubmitSc = async () => {
    if (!scFormData.content) return Alert.alert('Erreur', 'Contenu requis');
    try {
      const payload = {
        content: scFormData.content,
        reaction: scFormData.reaction || null,
        type_cotation: scFormData.type_cotation ? parseInt(scFormData.type_cotation) : null,
        critere: parseInt(scFormData.critere),
        preuves_attendues: scFormData.preuves_attendues,
        type_audit: formData.type_audit ? [parseInt(formData.type_audit)] : []
      };

      if (isEditingSc) {
        await api.put(getApiUrl(`${API_PATHS.SOUS_CRITERES}${currentScId}/`), payload);
      } else {
        await api.post(getApiUrl(API_PATHS.SOUS_CRITERES), payload);
      }
      setScModalVisible(false);
      handleSync();
    } catch (e) { Alert.alert('Erreur', "Échec de l'enregistrement"); }
  };

  if (loading && !isEditing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Modifier Formulaire' : 'Nouveau Formulaire'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Step 1: Configuration */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
             <View style={styles.sectionIcon}>
                <Feather name="settings" size={18} color="#3b82f6" />
             </View>
             <Text style={styles.sectionTitle}>Configuration Générale</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Nom du Formulaire</Text>
            <TextInput 
              style={styles.input} 
              value={formData.name} 
              onChangeText={t => setFormData({...formData, name: t})} 
              placeholder="Ex: Audit Qualité" 
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Processus</Text>
            <TouchableOpacity 
              style={[styles.picker, isSelectingProcessus && styles.pickerActive]} 
              onPress={() => { setIsSelectingProcessus(!isSelectingProcessus); setIsSelectingType(false); setIsSelectingSection(false); setIsSelectingEquipement(false); }}
            >
              <Text style={[styles.pickerText, !formData.processus && { color: '#94a3b8' }]}>
                {formData.processus ? processus.find((p:any) => p.id === formData.processus)?.name : "Choisir un processus..."}
              </Text>
              <Ionicons name={isSelectingProcessus ? "chevron-up" : "chevron-down"} size={18} color="#3b82f6" />
            </TouchableOpacity>
            {isSelectingProcessus && (
              <View style={styles.dropdown}>
                {processus.map((p:any) => (
                  <TouchableOpacity key={p.id} style={styles.dropdownItem} onPress={() => { setFormData({...formData, processus: p.id}); setIsSelectingProcessus(false); }}>
                    <Text style={styles.dropdownItemText}>{p.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Type d'Audit</Text>
            <TouchableOpacity 
              style={[styles.picker, isSelectingType && styles.pickerActive]} 
              onPress={() => { setIsSelectingType(!isSelectingType); setIsSelectingProcessus(false); setIsSelectingSection(false); setIsSelectingEquipement(false); }}
            >
              <Text style={[styles.pickerText, !formData.type_audit && { color: '#94a3b8' }]}>
                {formData.type_audit ? typesAudit.find((t:any) => t.id === formData.type_audit)?.name : "Choisir un type..."}
              </Text>
              <Ionicons name={isSelectingType ? "chevron-up" : "chevron-down"} size={18} color="#3b82f6" />
            </TouchableOpacity>
            {isSelectingType && (
              <View style={styles.dropdown}>
                {typesAudit.map((t:any) => (
                  <TouchableOpacity key={t.id} style={styles.dropdownItem} onPress={() => { setFormData({...formData, type_audit: t.id}); setIsSelectingType(false); }}>
                    <Text style={styles.dropdownItemText}>{t.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Type équipement</Text>
            <TouchableOpacity 
              style={[styles.picker, isSelectingEquipement && styles.pickerActive]} 
              onPress={() => { setIsSelectingEquipement(!isSelectingEquipement); setIsSelectingProcessus(false); setIsSelectingType(false); setIsSelectingSection(false); }}
            >
              <Text style={[styles.pickerText, formData.type_equipement.length === 0 && { color: '#94a3b8' }]} numberOfLines={1}>
                {formData.type_equipement.length > 0 
                  ? formData.type_equipement.map((id:any) => typesEquipement.find((t:any) => t.id === id)?.name).filter(Boolean).join(', ')
                  : "Choisir des types..."}
              </Text>
              <Ionicons name={isSelectingEquipement ? "chevron-up" : "chevron-down"} size={18} color="#3b82f6" />
            </TouchableOpacity>
            {isSelectingEquipement && (
              <View style={styles.dropdown}>
                {typesEquipement.map((t:any) => {
                  const isSelected = formData.type_equipement.includes(t.id);
                  return (
                    <TouchableOpacity 
                      key={t.id} 
                      style={[styles.dropdownItem, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} 
                      onPress={() => {
                        const newEquipements = isSelected 
                          ? formData.type_equipement.filter((id:any) => id !== t.id)
                          : [...formData.type_equipement, t.id];
                        setFormData({...formData, type_equipement: newEquipements});
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{t.name}</Text>
                      {isSelected && <Ionicons name="checkmark" size={16} color="#3b82f6" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Section concernée</Text>
            <TouchableOpacity 
              style={[styles.picker, isSelectingSection && styles.pickerActive]} 
              onPress={() => { setIsSelectingSection(!isSelectingSection); setIsSelectingProcessus(false); setIsSelectingType(false); setIsSelectingEquipement(false); }}
            >
              <Text style={[styles.pickerText, !formData.section && { color: '#94a3b8' }]}>
                {formData.section ? sections.find((s:any) => s.id === formData.section)?.name : "Choisir une section..."}
              </Text>
              <Ionicons name={isSelectingSection ? "chevron-up" : "chevron-down"} size={18} color="#3b82f6" />
            </TouchableOpacity>
            {isSelectingSection && (
              <View style={styles.dropdown}>
                {sections.map((s:any) => (
                  <TouchableOpacity key={s.id} style={styles.dropdownItem} onPress={() => { setFormData({...formData, section: s.id}); setIsSelectingSection(false); }}>
                    <Text style={styles.dropdownItemText}>{s.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <TouchableOpacity 
            style={[styles.syncBtn, syncing && { opacity: 0.7 }]} 
            onPress={() => handleSync()}
            disabled={syncing}
          >
            {syncing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather name="refresh-cw" size={16} color="#fff" style={{ marginRight: 8 }} />
            )}
            <Text style={styles.syncBtnText}>{syncing ? 'Synchronisation...' : 'Synchroniser la structure'}</Text>
          </TouchableOpacity>
        </View>

        {/* Step 2: Structure */}
        {structure.length > 0 && (
          <View style={styles.structureSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconGreen}>
                    <Feather name="list" size={18} color="#10b981" />
                </View>
                <Text style={styles.sectionTitle}>Structure de l'Audit</Text>
              </View>
              <TouchableOpacity style={styles.addCritereBtn} onPress={handleOpenAddCritere}>
                <Ionicons name="add-circle-outline" size={16} color="#3b82f6" style={{ marginRight: 4 }} />
                <Text style={styles.addCritereText}>Ajouter un Critère</Text>
              </TouchableOpacity>
            </View>

            {structure.map((crit, index) => {
              const isExpanded = expandedCriteres.includes(crit.critere_id);
              const critSelectedCount = crit.sous_criteres.filter((sc:any) => formData.selectedScIds.includes(sc.id)).length;
              const allCritSelected = crit.sous_criteres.length > 0 && critSelectedCount === crit.sous_criteres.length;

              return (
                <View key={crit.critere_id} style={styles.critereCard}>
                  <TouchableOpacity 
                    style={styles.critereHeader} 
                    onPress={() => toggleCritere(crit.critere_id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.critereHeaderLeft}>
                      <Ionicons 
                        name={isExpanded ? "chevron-down" : "chevron-forward"} 
                        size={18} 
                        color="#64748b" 
                      />
                      <View style={{ marginLeft: 8, flex: 1 }}>
                        <Text style={styles.critereName} numberOfLines={1}>
                          Critère {index + 1}: {crit.critere_nom}
                        </Text>
                        <View style={styles.critereSubHeader}>
                          <Text style={styles.critereStats}>
                            {critSelectedCount}/{crit.sous_criteres.length} sous-critères
                          </Text>
                          <View style={styles.chapitreBadge}>
                            <Text style={styles.chapitreText}>{crit.chapitre || 'N/A'}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                    
                    <View style={styles.critereActions}>
                      <TouchableOpacity style={styles.critActionBtn} onPress={() => handleOpenEditCritere(crit)}>
                        <Feather name="edit-2" size={14} color="#3b82f6" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.critActionBtn} onPress={() => handleDeleteCritere(crit.critere_id)}>
                        <Feather name="trash-2" size={14} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.critereBody}>
                      <View style={styles.scListHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={styles.scListTitle}>SOUS-CRITÈRES</Text>
                          <TouchableOpacity style={styles.miniAddBtn} onPress={() => handleOpenAddSc(crit.critere_id)}>
                             <Ionicons name="add" size={12} color="#10b981" />
                             <Text style={styles.miniAddText}>Nouveau</Text>
                          </TouchableOpacity>
                        </View>
                        <TouchableOpacity style={styles.pillBtnOutline} onPress={() => toggleAllInCrit(crit.critere_id, crit.sous_criteres)}>
                          <Text style={styles.pillBtnText}>
                            {allCritSelected ? 'Tout décocher' : 'Tout cocher'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      
                      <View style={styles.scItemsContainer}>
                        {crit.sous_criteres.map((sc:any, scIdx: number) => {
                          const isSelected = formData.selectedScIds.includes(sc.id);
                          return (
                            <View key={sc.id} style={styles.scItemRow}>
                              <TouchableOpacity 
                                style={styles.scItemMain}
                                onPress={() => toggleSc(sc.id)}
                              >
                                <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                                  {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                                </View>
                                <Text style={styles.scIndex}>{index+1}.{scIdx+1}</Text>
                                <Text style={styles.scText} numberOfLines={2}>{sc.nom}</Text>
                              </TouchableOpacity>
                              <View style={styles.scActions}>
                                <TouchableOpacity onPress={() => handleOpenEditSc(sc, crit.critere_id)} style={styles.scActionBtn}>
                                  <Feather name="edit-2" size={12} color="#94a3b8" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleDeleteSc(sc.id)} style={styles.scActionBtn}>
                                  <Feather name="trash-2" size={12} color="#94a3b8" />
                                </TouchableOpacity>
                              </View>
                            </View>
                          );
                        })}
                        {crit.sous_criteres.length === 0 && (
                          <Text style={styles.emptySc}>Aucun sous-critère</Text>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
        
        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelBtnText}>Annuler</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Enregistrer</Text>
        </TouchableOpacity>
      </View>

      {/* Criterion Modal */}
      <Modal visible={critereModalVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalContent}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{isEditingCritere ? 'Modifier le Critère' : 'Nouveau Critère'}</Text>
                <TouchableOpacity onPress={() => setCritereModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>
              
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.label}>Désignation du Critère</Text>
                <TextInput 
                  style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
                  multiline 
                  value={critereFormData.name} 
                  onChangeText={t => setCritereFormData({...critereFormData, name: t})} 
                  placeholder="Ex: Critère de sécurité..." 
                />
                
                <Text style={[styles.label, { marginTop: 15 }]}>Chapitre Norme</Text>
                <TouchableOpacity 
                  style={[styles.picker, isSelectingCritereChapitre && styles.pickerActive]} 
                  onPress={() => setIsSelectingCritereChapitre(!isSelectingCritereChapitre)}
                >
                  <Text style={[styles.pickerText, !critereFormData.chapitre_norme && { color: '#94a3b8' }]}>
                    {critereFormData.chapitre_norme ? chapitres.find((c:any) => c.id.toString() === critereFormData.chapitre_norme)?.name : "Choisir un chapitre..."}
                  </Text>
                  <Ionicons name={isSelectingCritereChapitre ? "chevron-up" : "chevron-down"} size={18} color="#3b82f6" />
                </TouchableOpacity>
                {isSelectingCritereChapitre && (
                  <View style={styles.dropdown}>
                    {chapitres.map((c:any) => (
                      <TouchableOpacity key={c.id} style={styles.dropdownItem} onPress={() => { setCritereFormData({...critereFormData, chapitre_norme: c.id.toString()}); setIsSelectingCritereChapitre(false); }}>
                        <Text style={styles.dropdownItemText}>{c.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <View style={styles.modalFooter}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setCritereModalVisible(false)}>
                    <Text style={styles.modalCancelBtnText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSubmitCritere}>
                    <Text style={styles.modalSaveBtnText}>Enregistrer</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Sub-Criterion Modal */}
      <Modal visible={scModalVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalContent}
            >
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="add-circle" size={24} color="#334155" style={{ marginRight: 8 }} />
                  <Text style={styles.modalTitle}>{isEditingSc ? 'Modifier Sous-Critère' : 'Nouveau Sous-Critère'}</Text>
                </View>
                <TouchableOpacity onPress={() => setScModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>
              
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.label}>Cotation</Text>
                <TouchableOpacity 
                  style={[styles.picker, isSelectingScCotation && styles.pickerActive]} 
                  onPress={() => { setIsSelectingScCotation(!isSelectingScCotation); setIsSelectingPreuves(false); }}
                >
                  <Text style={[styles.pickerText, !scFormData.type_cotation && { color: '#94a3b8' }]}>
                    {scFormData.type_cotation ? typeCotations.find((t:any) => t.id.toString() === scFormData.type_cotation)?.name : "---------"}
                  </Text>
                  <Ionicons name={isSelectingScCotation ? "chevron-up" : "chevron-down"} size={18} color="#64748b" />
                </TouchableOpacity>
                {isSelectingScCotation && (
                  <View style={styles.dropdown}>
                    {typeCotations.map((t:any) => (
                      <TouchableOpacity key={t.id} style={styles.dropdownItem} onPress={() => { setScFormData({...scFormData, type_cotation: t.id.toString()}); setIsSelectingScCotation(false); }}>
                        <Text style={styles.dropdownItemText}>{t.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <Text style={[styles.label, { marginTop: 15 }]}>Libellé <Text style={{ color: '#ef4444' }}>*</Text></Text>
                <TextInput 
                  style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
                  multiline 
                  value={scFormData.content} 
                  onChangeText={t => setScFormData({...scFormData, content: t})} 
                  placeholder="Détaillez ce qui doit être audité..." 
                />
                
                <Text style={[styles.label, { marginTop: 15 }]}>Réaction</Text>
                <TextInput 
                  style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
                  multiline 
                  value={scFormData.reaction} 
                  onChangeText={t => setScFormData({...scFormData, reaction: t})} 
                  placeholder="Réaction / Plan d'action en cas de non-conformité..." 
                />

                <Text style={[styles.label, { marginTop: 15 }]}>Preuves Attendues</Text>
                <TouchableOpacity 
                  style={[styles.picker, isSelectingPreuves && styles.pickerActive]} 
                  onPress={() => { setIsSelectingPreuves(!isSelectingPreuves); setIsSelectingScCotation(false); }}
                >
                  <Text style={[styles.pickerText, scFormData.preuves_attendues.length === 0 && { color: '#94a3b8' }]} numberOfLines={1}>
                    {scFormData.preuves_attendues.length > 0 
                      ? `${scFormData.preuves_attendues.length} sélectionnée(s)` 
                      : "Sélectionner..."}
                  </Text>
                  <Ionicons name={isSelectingPreuves ? "chevron-up" : "chevron-down"} size={18} color="#64748b" />
                </TouchableOpacity>
                {isSelectingPreuves && (
                  <View style={styles.dropdown}>
                    {preuvesAttendues.map((p:any) => {
                      const isSelected = scFormData.preuves_attendues.includes(p.id);
                      return (
                        <TouchableOpacity 
                          key={p.id} 
                          style={[styles.dropdownItem, { flexDirection: 'row', justifyContent: 'space-between' }]} 
                          onPress={() => {
                            const newPreuves = isSelected 
                              ? scFormData.preuves_attendues.filter(id => id !== p.id)
                              : [...scFormData.preuves_attendues, p.id];
                            setScFormData({...scFormData, preuves_attendues: newPreuves});
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{p.name}</Text>
                          {isSelected && <Ionicons name="checkmark" size={16} color="#3b82f6" />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                <View style={styles.modalFooter}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setScModalVisible(false)}>
                    <Text style={styles.modalCancelBtnText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSubmitSc}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Feather name="save" size={16} color="#fff" style={{ marginRight: 6 }} />
                        <Text style={styles.modalSaveBtnText}>Enregistrer</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { height: 60, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backBtn: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  
  content: { flex: 1, padding: 15 },
  
  sectionCard: { backgroundColor: '#fff', borderRadius: 16, padding: 15, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  sectionIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  sectionIconGreen: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#ecfdf5', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  
  formGroup: { marginBottom: 15 },
  label: { fontSize: 13, fontWeight: '600', color: '#64748b', marginBottom: 8 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, fontSize: 15, color: '#1e293b' },
  
  picker: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12 },
  pickerActive: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderColor: '#3b82f6' },
  pickerText: { fontSize: 15, color: '#1e293b' },
  
  dropdown: { backgroundColor: '#fff', borderWidth: 1, borderTopWidth: 0, borderColor: '#3b82f6', borderBottomLeftRadius: 10, borderBottomRightRadius: 10, overflow: 'hidden' },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  dropdownItemText: { fontSize: 14, color: '#475569' },
  
  syncBtn: { backgroundColor: '#3b82f6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 10, marginTop: 10 },
  syncBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  
  structureSection: { marginBottom: 20 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 },
  addCritereBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#3b82f6', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#fff' },
  addCritereText: { fontSize: 12, fontWeight: '700', color: '#3b82f6' },

  critereCard: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#f1f5f9' },
  critereHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 },
  critereHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  critereName: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  critereSubHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  critereStats: { fontSize: 11, color: '#64748b', marginRight: 10 },
  critereActions: { flexDirection: 'row', alignItems: 'center' },
  critActionBtn: { padding: 8, marginLeft: 4, backgroundColor: '#f8fafc', borderRadius: 8 },

  chapitreBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  chapitreText: { fontSize: 9, fontWeight: '600', color: '#475569', textTransform: 'uppercase' },
  
  critereBody: { padding: 12, borderTopWidth: 1, borderTopColor: '#f8fafc', backgroundColor: '#fcfcfd' },
  scListHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  scListTitle: { fontSize: 10, fontWeight: '700', color: '#94a3b8', letterSpacing: 1 },
  
  pillBtnOutline: { borderWidth: 1, borderColor: '#3b82f6', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 15 },
  pillBtnText: { fontSize: 11, fontWeight: '600', color: '#3b82f6' },
  
  miniAddBtn: { flexDirection: 'row', alignItems: 'center', marginLeft: 10, backgroundColor: '#f0fdf4', paddingVertical: 2, paddingHorizontal: 6, borderRadius: 6, borderWidth: 1, borderColor: '#bcf0da' },
  miniAddText: { fontSize: 10, fontWeight: '700', color: '#10b981', marginLeft: 2 },

  scItemsContainer: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#f1f5f9', padding: 5 },
  scItemRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  scItemMain: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8 },
  scActions: { flexDirection: 'row', paddingRight: 5 },
  scActionBtn: { padding: 8, marginLeft: 2 },
  
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: '#cbd5e1', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  checkboxActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  scIndex: { fontSize: 12, fontWeight: '600', color: '#94a3b8', marginRight: 8, width: 30 },
  scText: { flex: 1, fontSize: 13, color: '#334155' },
  emptySc: { textAlign: 'center', paddingVertical: 15, color: '#94a3b8', fontSize: 12, fontStyle: 'italic' },
  
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', flexDirection: 'row', padding: 15, paddingBottom: 30, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  cancelBtn: { flex: 1, height: 48, justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#64748b' },
  saveBtn: { flex: 1.5, backgroundColor: '#3b82f6', height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 25 },
  modalCancelBtn: { paddingVertical: 10, paddingHorizontal: 15 },
  modalCancelBtnText: { color: '#64748b', fontWeight: '600' },
  modalSaveBtn: { backgroundColor: '#3b82f6', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  modalSaveBtnText: { color: '#fff', fontWeight: '700' },
});

export default FormulaireFormScreen;
