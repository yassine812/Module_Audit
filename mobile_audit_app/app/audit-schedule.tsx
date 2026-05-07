import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import api, { getApiUrl, API_PATHS } from '../src/utils/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const NormalDropdown = ({ label, value, options, onSelect, placeholder, multi = false, icon, style }) => {
  const [visible, setVisible] = useState(false);
  const [layout, setLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const viewRef = useRef(null);

  const toggleDropdown = () => {
    if (!visible) {
      viewRef.current.measure((fx, fy, w, h, px, py) => {
        setLayout({ x: px, y: py, width: w, height: h });
        setVisible(true);
      });
    } else {
      setVisible(false);
    }
  };

  const getLabel = () => {
    if (multi) {
      if (!value || value.length === 0) return placeholder;
      const selectedNames = options
        .filter(opt => value.includes(opt.id))
        .map(opt => opt.name || opt.username);
      return selectedNames.join(', ');
    }
    const selected = options.find(opt => opt.id === value);
    return selected ? (selected.name || selected.username) : placeholder;
  };

  return (
    <View style={[styles.fieldGroup, style]} ref={viewRef} onLayout={() => {}}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity 
        style={[styles.dropdownTrigger, visible && styles.dropdownTriggerActive]} 
        onPress={toggleDropdown}
      >
        {icon && (
          <View style={styles.inputGroupIcon}>
             {icon}
          </View>
        )}
        <View style={styles.dropdownValueContainer}>
           <Text style={[styles.dropdownValue, !value || (multi && value.length === 0) ? { color: '#94a3b8' } : {}]} numberOfLines={1}>
             {getLabel()}
           </Text>
           <Ionicons name="caret-down" size={14} color="#94a3b8" />
        </View>
      </TouchableOpacity>

      <Modal visible={visible} transparent={true} animationType="none">
        <TouchableOpacity 
          style={styles.fullScreenBackdrop} 
          activeOpacity={1} 
          onPress={() => setVisible(false)}
        >
          <View style={[
            styles.dropdownMenu, 
            { 
              top: layout.y + layout.height, 
              left: layout.x + (icon ? 48 : 0), 
              width: layout.width - (icon ? 48 : 0) 
            }
          ]}>
            <ScrollView style={{ maxHeight: 250 }} bounces={false} showsVerticalScrollIndicator={true}>
              {options.length > 0 ? (
                options.map(item => {
                  const isSelected = multi ? value.includes(item.id) : value === item.id;
                  return (
                    <TouchableOpacity 
                      key={item.id} 
                      style={[styles.menuItem, isSelected && styles.menuItemActive]}
                      onPress={() => {
                        onSelect(item.id);
                        setVisible(false);
                      }}
                    >
                      <Text style={[styles.menuItemText, isSelected && styles.menuItemTextActive]}>
                        {item.name || item.username}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={styles.menuItem}>
                  <Text style={styles.emptyText}>Aucun résultat</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const AuditScheduleScreen = () => {
  const router = useRouter();
  const scrollRef = useRef(null);
  const quickInputRef = useRef(null);
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [sections, setSections] = useState([]);
  const [chapitres, setChapitres] = useState([]);
  const [formulaires, setFormulaires] = useState([]);
  const [users, setUsers] = useState([]);
  const [processusList, setProcessusList] = useState([]);
  const [typeAudits, setTypeAudits] = useState([]);
  const [typeEquipements, setTypeEquipements] = useState([]);
  const [typeCotations, setTypeCotations] = useState([]);
  const [preuvesAttendues, setPreuvesAttendues] = useState([]);

  const [formData, setFormData] = useState({
    desc: '',
    status: true,
    date: new Date().toISOString().slice(0, 19).replace('T', ' '),
    section: '',
    formulaire_audit: '',
    site: '',
    affectation: [],
    participants: [],
  });

  // Quick Create State
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [expandedCriteria, setExpandedCriteria] = useState({});

  const toggleCriterion = (id) => {
    setExpandedCriteria(prev => ({ ...prev, [id]: !prev[id] }));
  };
  
  useEffect(() => {
    if (showQuickCreate) {
      // Small timeout to ensure the view is rendered before scrolling/focusing
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
        quickInputRef.current?.focus();
      }, 100);
    }
  }, [showQuickCreate]);

  const [quickFormData, setQuickFormData] = useState({
    name: '',
    processus: '',
    type_audit: '',
    type_equipement: '',
  });
  const [savingQuick, setSavingQuick] = useState(false);
  const [formStructure, setFormStructure] = useState([]);
  const [loadingStructure, setLoadingStructure] = useState(false);
  const [showCritereModal, setShowCritereModal] = useState(false);
  const [newCritere, setNewCritere] = useState({ id: null, name: '', chapitre_id: '' });
  const [showSousCritereModal, setShowSousCritereModal] = useState(false);
  const [newSousCritere, setNewSousCritere] = useState({ 
    id: null, 
    content: '', 
    crit_id: null,
    cotation: '',
    reaction: '',
    preuves: [] 
  });
  const [selectedSousCriteres, setSelectedSousCriteres] = useState([]);

  const fetchData = async () => {
    try {
      const [secRes, chapRes, formRes, userRes, procRes, typeARes, typeERes, cotRes, preuRes] = await Promise.all([
        api.get(getApiUrl(API_PATHS.SECTIONS)),
        api.get(getApiUrl(API_PATHS.CHAPITRES)),
        api.get(getApiUrl(API_PATHS.FORMULAIRES)),
        api.get(getApiUrl(API_PATHS.USERS)),
        api.get(getApiUrl(API_PATHS.PROCESSUS)),
        api.get(getApiUrl(API_PATHS.TYPES_AUDIT)),
        api.get(getApiUrl(API_PATHS.TYPES_EQUIPEMENTS)),
        api.get(getApiUrl(API_PATHS.TYPE_COTATION)),
        api.get(getApiUrl(API_PATHS.PREUVE_ATTENDUE)),
      ]);

      setSections(secRes.data.data || []);
      setChapitres(chapRes.data.data || []);
      setFormulaires(formRes.data.data || []);
      
      const userData = userRes.data.data || userRes.data;
      setUsers(Array.isArray(userData) ? userData : []);
      
      setProcessusList(procRes.data.data || []);
      setTypeAudits(typeARes.data.data || []);
      setTypeEquipements(typeERes.data.data || []);
      setTypeCotations(cotRes.data.data || cotRes.data || []);
      setPreuvesAttendues(preuRes.data.data || preuRes.data || []);

      if (id) {
        const res = await api.get(getApiUrl(`${API_PATHS.LISTE_AUDIT}${id}/`));
        const audit = res.data.data;
        setFormData({
          desc: audit.desc || '',
          status: audit.status ?? true,
          date: audit.date_audit || new Date().toISOString().slice(0, 19).replace('T', ' '),
          section: audit.section || '',
          formulaire_audit: audit.formulaire_audit || '',
          site: audit.site || '',
          affectation: audit.affectation || [],
          participants: audit.participants || [],
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleSyncStructure = async () => {
    if (!quickFormData.type_audit) {
      return Alert.alert('Attention', 'Veuillez sélectionner un type d\'audit d\'abord');
    }
    setLoadingStructure(true);
    try {
      const res = await api.get(getApiUrl(API_PATHS.GET_STRUCTURE), {
        params: { type_audit_id: quickFormData.type_audit }
      });
      setFormStructure(res.data || []);
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Impossible de récupérer la structure du formulaire');
    } finally {
      setLoadingStructure(false);
    }
  };

  const handleSave = async () => {
    if (!formData.desc) return Alert.alert('Erreur', 'La description est obligatoire');
    
    const cleanData = {
      ...formData,
      section: formData.section || null,
      formulaire_audit: formData.formulaire_audit || null,
      site: formData.site || null,
    };
    
    setSaving(true);
    try {
      if (id) {
        await api.put(getApiUrl(`${API_PATHS.LISTE_AUDIT}${id}/`), cleanData);
      } else {
        await api.post(getApiUrl(API_PATHS.LISTE_AUDIT), cleanData);
      }
      
      Alert.alert('Succès', 'Audit planifié avec succès', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.message || 'Échec de la planification';
      Alert.alert('Erreur', msg);
    } finally {
      setSaving(false);
    }
  };

  const handlePreviewFormulaire = async () => {
    if (!formData.formulaire_audit) return;
    setLoadingPreview(true);
    setShowPreviewModal(true);
    try {
      const res = await api.get(getApiUrl(API_PATHS.GET_FORM_STRUCTURE), {
        params: { formulaire_id: formData.formulaire_audit }
      });
      const data = Array.isArray(res.data) ? res.data : (res.data.criteres || []);
      setPreviewData(data);
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Impossible de charger la structure');
      setShowPreviewModal(false);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleCopyFormulaire = async () => {
    if (!formData.formulaire_audit) return;
    
    try {
      const url = `${API_PATHS.FORMULAIRES}${formData.formulaire_audit}/copy/`.replace(/\/+/g, '/');
      const res = await api.post(url);
      
      if (res.data.status === 'success') {
        const newForm = { 
          id: res.data.new_id, 
          name: res.data.new_name
        };
        // Add to list and select it immediately
        setFormulaires(prev => [newForm, ...prev]);
        setFormData(prev => ({ ...prev, formulaire_audit: newForm.id }));
        
        Alert.alert('Succès', `Le modèle a été copié : ${newForm.name}`);
      } else {
        throw new Error(res.data.message || 'Erreur lors de la copie');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Échec de la copie du modèle');
    }
  };

  const handleSaveQuickForm = async () => {
    if (!quickFormData.name) return Alert.alert('Erreur', 'Le nom du formulaire est obligatoire');
    
    setSavingQuick(true);
    try {
      const res = await api.post(getApiUrl(API_PATHS.FORMULAIRES), quickFormData);
      const newForm = res.data.data;
      
      const formRes = await api.get(getApiUrl(API_PATHS.FORMULAIRES));
      setFormulaires(formRes.data.data || []);
      
      setFormData({ ...formData, formulaire_audit: newForm.id });
      setShowQuickCreate(false);
      setQuickFormData({ name: '', processus: '', type_audit: '', type_equipement: '' });
      setFormStructure([]);
      Alert.alert('Succès', 'Modèle de formulaire créé et sélectionné');
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Échec de la création du modèle');
    } finally {
      setSavingQuick(false);
    }
  };

  const toggleUserSelection = (userId, field) => {
    const current = [...formData[field]];
    const index = current.indexOf(userId);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(userId);
    }
    setFormData({ ...formData, [field]: current });
  };

  const handleAddCritere = async () => {
    if (!newCritere.name) return Alert.alert('Erreur', 'Le nom du critère est obligatoire');
    
    if (showPreviewModal && formData.formulaire_audit) {
      try {
        const payload = {
          name: newCritere.name,
          chapitre: newCritere.chapitre_id,
          formulaire: formData.formulaire_audit
        };
        
        if (newCritere.id && !String(newCritere.id).startsWith('temp_')) {
          await api.put(`${API_PATHS.CRITERES}${newCritere.id}/`, payload);
        } else {
          await api.post(API_PATHS.CRITERES, payload);
        }
        handlePreviewFormulaire();
      } catch (error) {
        console.error(error);
        Alert.alert('Erreur', 'Échec de l\'enregistrement du critère');
      }
    } else {
      if (newCritere.id) {
        const updated = formStructure.map(c => 
          c.critere_id === newCritere.id ? { ...c, critere_nom: newCritere.name, chapitre_id: newCritere.chapitre_id } : c
        );
        setFormStructure(updated);
      } else {
        const tempId = `temp_${Date.now()}`;
        const newCritObj = {
          critere_id: tempId,
          critere_nom: newCritere.name,
          chapitre: chapitres.find(p => p.id === newCritere.chapitre_id)?.name || 'CHAPITRE',
          chapitre_id: newCritere.chapitre_id,
          sous_criteres: [],
          is_new: true
        };
        setFormStructure([newCritObj, ...formStructure]);
      }
    }
    
    setShowCritereModal(false);
    setNewCritere({ id: null, name: '', chapitre_id: '' });
    
    if (formData.formulaire_audit && !showQuickCreate) {
      setTimeout(() => setShowPreviewModal(true), 300);
    }
  };

  const handleAddSousCritere = async () => {
    if (!newSousCritere.content) return Alert.alert('Erreur', 'Le libellé est obligatoire');
    
    if (showPreviewModal && formData.formulaire_audit) {
      try {
        const payload = {
          nom: newSousCritere.content,
          critere: newSousCritere.crit_id,
          type_cotation: newSousCritere.cotation,
          reaction: newSousCritere.reaction,
          preuve_attendu: newSousCritere.preuves
        };
        
        if (newSousCritere.id && !String(newSousCritere.id).startsWith('temp_')) {
          await api.put(`${API_PATHS.SOUS_CRITERES}${newSousCritere.id}/`, payload);
        } else {
          await api.post(API_PATHS.SOUS_CRITERES, payload);
        }
        handlePreviewFormulaire();
      } catch (error) {
        console.error(error);
        Alert.alert('Erreur', 'Échec de l\'enregistrement du sous-critère');
      }
    } else {
      if (newSousCritere.id) {
        const updated = formStructure.map(crit => {
          if (crit.critere_id === newSousCritere.crit_id) {
            return {
              ...crit,
              sous_criteres: crit.sous_criteres.map(sc => 
                sc.id === newSousCritere.id ? { ...sc, nom: newSousCritere.content, type_cotation: newSousCritere.cotation, reaction: newSousCritere.reaction, preuve_attendu: newSousCritere.preuves } : sc
              )
            };
          }
          return crit;
        });
        setFormStructure(updated);
      } else {
        const tempId = `temp_${Date.now()}`;
        const updatedStructure = formStructure.map(crit => {
          if (crit.critere_id === newSousCritere.crit_id) {
            return {
              ...crit,
              sous_criteres: [...crit.sous_criteres, { id: tempId, nom: newSousCritere.content, type_cotation: newSousCritere.cotation, reaction: newSousCritere.reaction, preuve_attendu: newSousCritere.preuves }]
            };
          }
          return crit;
        });
        setFormStructure(updatedStructure);
        setSelectedSousCriteres([...selectedSousCriteres, tempId]);
      }
    }
    
    setShowSousCritereModal(false);
    setNewSousCritere({ id: null, content: '', crit_id: null, cotation: '', reaction: '', preuves: [] });

    if (formData.formulaire_audit && !showQuickCreate) {
      setTimeout(() => setShowPreviewModal(true), 300);
    }
  };

  const toggleSousCritereSelection = (id) => {
    setSelectedSousCriteres(prev => 
      prev.includes(id) ? prev.filter(scId => scId !== id) : [...prev, id]
    );
  };

  const toggleAllInCritere = (critId) => {
    const crit = formStructure.find(c => c.critere_id === critId);
    if (!crit) return;
    const scIds = crit.sous_criteres.map(sc => sc.id);
    const allSelected = scIds.every(id => selectedSousCriteres.includes(id));
    
    if (allSelected) {
      setSelectedSousCriteres(prev => prev.filter(id => !scIds.includes(id)));
    } else {
      const toAdd = scIds.filter(id => !selectedSousCriteres.includes(id));
      setSelectedSousCriteres(prev => [...prev, ...toAdd]);
    }
  };

  const toggleSelectAll = () => {
    const allScIds = formStructure.flatMap(c => c.sous_criteres.map(sc => sc.id));
    const allSelected = allScIds.every(id => selectedSousCriteres.includes(id));
    
    if (allSelected) {
      setSelectedSousCriteres([]);
    } else {
      setSelectedSousCriteres(allScIds);
    }
  };

  const handleDeleteCritere = (id) => {
    Alert.alert('Supprimer', 'Voulez-vous supprimer ce critère ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        if (showPreviewModal && formData.formulaire_audit && !String(id).startsWith('temp_')) {
          try {
            await api.delete(`${API_PATHS.CRITERES}${id}/`);
            handlePreviewFormulaire();
          } catch (error) {
            Alert.alert('Erreur', 'Échec de la suppression');
          }
        } else {
          setFormStructure(formStructure.filter(c => c.critere_id !== id));
        }
      }}
    ]);
  };

  const handleDeleteSousCritere = (critId, scId) => {
    Alert.alert('Supprimer', 'Supprimer ce sous-critère ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        if (showPreviewModal && formData.formulaire_audit && !String(scId).startsWith('temp_')) {
          try {
            await api.delete(`${API_PATHS.SOUS_CRITERES}${scId}/`);
            handlePreviewFormulaire();
          } catch (error) {
            Alert.alert('Erreur', 'Échec de la suppression');
          }
        } else {
          const updatedStructure = formStructure.map(crit => {
            if (crit.critere_id === critId) {
              return {
                ...crit,
                sous_criteres: crit.sous_criteres.filter(sc => sc.id !== scId)
              };
            }
            return crit;
          });
          setFormStructure(updatedStructure);
        }
      }}
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{id ? "Modifier l'Audit" : "Nouvel Audit"}</Text>
        </View>
        <TouchableOpacity 
          style={[styles.saveBtn, saving && { opacity: 0.7 }]} 
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.saveBtnText}>{id ? 'Confirmer' : 'Créer'}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView 
        ref={scrollRef}
        style={styles.content} 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHeader}>
           <View style={styles.sectionTitleWithIcon}>
              <View style={styles.infoIconBox}>
                <Feather name="info" size={14} color="#64748b" />
              </View>
              <Text style={styles.sectionTitle}>Informations Générales</Text>
           </View>
           <View style={styles.statusToggle}>
              <Switch 
                value={formData.status} 
                onValueChange={(val) => setFormData({...formData, status: val})}
                trackColor={{ false: '#e2e8f0', true: '#22c55e' }}
              />
              <Text style={[styles.statusLabel, { color: formData.status ? '#22c55e' : '#94a3b8' }]}>
                {formData.status ? 'Actif' : 'Inactif'}
              </Text>
           </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>DESCRIPTION DE L'AUDIT *</Text>
          <View style={styles.inputGroup}>
             <View style={styles.inputGroupIcon}>
                <Feather name="file-text" size={18} color="#475569" />
             </View>
             <TextInput 
                style={styles.input}
                placeholder="Description de l'audit..."
                value={formData.desc}
                onChangeText={(val) => setFormData({...formData, desc: val})}
             />
          </View>
        </View>

        <View style={styles.sectionHeader}>
           <View style={styles.sectionTitleWithIcon}>
              <View style={styles.settingsIconBox}>
                <Feather name="settings" size={14} color="#64748b" />
              </View>
              <Text style={styles.sectionTitle}>Paramètres & Configuration</Text>
           </View>
        </View>

        <NormalDropdown 
          label="SECTION / DÉPARTEMENT"
          value={formData.section}
          options={sections}
          onSelect={(id) => setFormData({...formData, section: id})}
          placeholder="Sélectionnez une section..."
          icon={<MaterialCommunityIcons name="office-building" size={18} color="#475569" />}
        />

        <View style={styles.rowAlign}>
          <View style={{ flex: 1 }}>
            <NormalDropdown 
              label="MODÈLE DE FORMULAIRE"
              value={formData.formulaire_audit}
              options={formulaires}
              onSelect={(id) => setFormData({...formData, formulaire_audit: id})}
              placeholder="Sélectionnez un modèle..."
              icon={<MaterialCommunityIcons name="format-list-bulleted" size={18} color="#475569" />}
            />
          </View>
          {formData.formulaire_audit && !showQuickCreate && (
            <>
              <TouchableOpacity 
                style={styles.eyeBtn} 
                onPress={handlePreviewFormulaire}
              >
                <Feather name="eye" size={20} color="#06b6d4" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.copyBtn} 
                onPress={handleCopyFormulaire}
              >
                <Feather name="copy" size={18} color="#f59e0b" />
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity 
            style={[styles.plusBtn, showQuickCreate && styles.plusBtnActive]} 
            onPress={() => setShowQuickCreate(!showQuickCreate)}
          >
             <Ionicons name={showQuickCreate ? "remove" : "add"} size={24} color={showQuickCreate ? "#fff" : "#3b82f6"} />
          </TouchableOpacity>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>DATE D'AUDIT PRÉVUE *</Text>
          <View style={styles.inputGroup}>
             <View style={styles.inputGroupIcon}>
                <Feather name="calendar" size={18} color="#475569" />
             </View>
             <TextInput 
                style={styles.input}
                value={formData.date}
                onChangeText={(val) => setFormData({...formData, date: val})}
                placeholder="AAAA-MM-JJ HH:MM:SS"
             />
          </View>
        </View>

        <NormalDropdown 
          label="PARTICIPANTS (OPTIONNEL)"
          value={formData.participants}
          options={users.filter(u => u.role === 'Participant')}
          multi={true}
          onSelect={(id) => toggleUserSelection(id, 'participants')}
          placeholder="Rechercher des participants..."
          icon={<Ionicons name="person-outline" size={18} color="#06b6d4" />}
        />

        <NormalDropdown 
          label="AUDITEURS ASSIGNÉS"
          value={formData.affectation}
          options={users.filter(u => u.role === 'Auditeur' || u.role === 'Admin')}
          multi={true}
          onSelect={(id) => toggleUserSelection(id, 'affectation')}
          placeholder="Rechercher des auditeurs..."
          icon={<Ionicons name="people-outline" size={18} color="#3b82f6" />}
        />

        {showQuickCreate && (
          <View style={styles.quickCreateContainer}>
            <View style={styles.quickCreateHeader}>
               <Ionicons name="add-circle" size={24} color="#3b82f6" />
               <Text style={styles.quickCreateTitle}>AJOUTER UN FORMULAIRE</Text>
            </View>
            
            <View style={styles.quickField}>
              <Text style={styles.quickLabel}>NOM DU FORMULAIRE</Text>
              <TextInput 
                ref={quickInputRef}
                style={styles.quickInput}
                placeholder="Ex: Audit Interne 2026..."
                value={quickFormData.name}
                onChangeText={(val) => setQuickFormData({...quickFormData, name: val})}
                placeholderTextColor="#cbd5e1"
              />
            </View>
            
            <View style={styles.quickField}>
               <NormalDropdown 
                  label="PROCESSUS"
                  value={quickFormData.processus}
                  options={processusList}
                  onSelect={(id) => setQuickFormData({...quickFormData, processus: id})}
                  placeholder="Sélectionnez..."
                  style={{ marginBottom: 0 }}
                />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 15 }}>
               <View style={{ flex: 1 }}>
                  <NormalDropdown 
                    label="TYPE D'AUDIT"
                    value={quickFormData.type_audit}
                    options={typeAudits}
                    onSelect={(id) => setQuickFormData({...quickFormData, type_audit: id})}
                    placeholder="Sélectionnez..."
                    style={{ marginBottom: 0 }}
                  />
               </View>
               <TouchableOpacity 
                 style={[styles.refreshBtn, loadingStructure && { opacity: 0.5 }]} 
                 onPress={handleSyncStructure}
                 disabled={loadingStructure}
               >
                  {loadingStructure ? (
                    <ActivityIndicator size="small" color="#3b82f6" />
                  ) : (
                    <Ionicons name="refresh" size={20} color="#3b82f6" />
                  )}
               </TouchableOpacity>
            </View>

            <View style={styles.quickField}>
                <NormalDropdown 
                  label="TYPE D'ÉQUIPEMENT"
                  value={quickFormData.type_equipement}
                  options={typeEquipements}
                  onSelect={(id) => setQuickFormData({...quickFormData, type_equipement: id})}
                  placeholder="Sélectionnez..."
                  style={{ marginBottom: 0 }}
                />
            </View>

            {formStructure.length > 0 && (
              <View style={styles.structureContainer}>
                <View style={styles.structureHeader}>
                   <View style={styles.structureTitleRow}>
                      <MaterialCommunityIcons name="layers-outline" size={24} color="#3b82f6" />
                      <Text style={styles.structureTitle}>STRUCTURE DU FORMULAIRE</Text>
                   </View>
                   <View style={styles.structureLinks}>
                      <TouchableOpacity onPress={toggleSelectAll}>
                        <Text style={styles.structureLink}>Tout cocher</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                         style={styles.addCritereBtn}
                         onPress={() => {
                           setNewCritere({ id: null, name: '', chapitre_id: '' });
                           setShowCritereModal(true);
                         }}
                       >
                          <Text style={styles.addCritereBtnText}>+ Critère</Text>
                       </TouchableOpacity>
                   </View>
                </View>

                {formStructure.map((crit, idx) => (
                  <View key={crit.critere_id} style={styles.critereCard}>
                    <TouchableOpacity 
                      style={styles.critereCardHeader} 
                      onPress={() => toggleCriterion(crit.critere_id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.critereTopRow}>
                        <View style={styles.critereTitleGroup}>
                          <Ionicons 
                            name={expandedCriteria[crit.critere_id] ? "chevron-down" : "chevron-forward"} 
                            size={20} 
                            color="#475569" 
                          />
                          <Text style={styles.critereTitle} numberOfLines={2}>
                            Critère {idx + 1}: {crit.critere_nom}
                          </Text>
                        </View>
                        <View style={styles.critereQuickActions}>
                           <TouchableOpacity 
                             style={styles.actionIconBtn}
                             onPress={() => {
                               setNewCritere({ id: crit.critere_id, name: crit.critere_nom, chapitre_id: crit.chapitre_id });
                               setShowCritereModal(true);
                             }}
                           >
                              <Feather name="edit-2" size={16} color="#3b82f6" />
                           </TouchableOpacity>
                           <TouchableOpacity 
                             style={styles.actionIconBtn}
                             onPress={() => handleDeleteCritere(crit.critere_id)}
                           >
                              <Feather name="trash-2" size={16} color="#ef4444" />
                           </TouchableOpacity>
                        </View>
                      </View>

                      <View style={styles.critereBottomRow}>
                         <View style={styles.chapterBadge}>
                            <Text style={styles.chapterBadgeText}>{crit.chapitre || 'CHAPITRE'}</Text>
                         </View>
                         <TouchableOpacity style={styles.toutCocherBtn} onPress={() => toggleAllInCritere(crit.critere_id)}>
                            <Text style={styles.toutCocherBtnText}>Tout Cocher</Text>
                         </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                    
                    {expandedCriteria[crit.critere_id] && (
                      <View style={styles.critereBody}>
                        {crit.sous_criteres.map(sc => (
                          <TouchableOpacity 
                            key={sc.id} 
                            style={styles.sousCritereRow}
                            onPress={() => toggleSousCritereSelection(sc.id)}
                            activeOpacity={0.7}
                          >
                             <Ionicons 
                               name={selectedSousCriteres.includes(sc.id) ? "checkbox" : "square-outline"} 
                               size={22} 
                               color={selectedSousCriteres.includes(sc.id) ? "#3b82f6" : "#cbd5e1"} 
                             />
                             <Text style={[styles.sousCritereText, selectedSousCriteres.includes(sc.id) && { color: '#1e293b', fontWeight: '500' }]}>
                               {sc.nom}
                             </Text>
                             <View style={styles.scActions}>
                               <TouchableOpacity onPress={() => {
                                 setNewSousCritere({ id: sc.id, content: sc.nom, crit_id: crit.critere_id, cotation: sc.type_cotation, reaction: sc.reaction, preuves: sc.preuve_attendu });
                                 setShowSousCritereModal(true);
                               }}>
                                  <Feather name="edit-2" size={14} color="#94a3b8" />
                               </TouchableOpacity>
                               <TouchableOpacity onPress={() => handleDeleteSousCritere(crit.critere_id, sc.id)}>
                                  <Feather name="trash-2" size={14} color="#fca5a5" />
                               </TouchableOpacity>
                             </View>
                          </TouchableOpacity>
                        ))}
                        <TouchableOpacity 
                          style={styles.addSousCritereBtn}
                          onPress={() => {
                            setNewSousCritere({ content: '', crit_id: crit.critere_id, cotation: '', reaction: '', preuves: [] });
                            setShowSousCritereModal(true);
                          }}
                        >
                           <Ionicons name="add" size={18} color="#3b82f6" />
                           <Text style={styles.addSousCritereBtnText}>Ajouter sous-critère</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            <View style={styles.quickActions}>
               <TouchableOpacity style={styles.quickCancelBtn} onPress={() => setShowQuickCreate(false)}>
                  <Text style={styles.quickCancelBtnText}>Annuler</Text>
               </TouchableOpacity>
               <TouchableOpacity 
                style={styles.quickSaveBtn} 
                onPress={handleSaveQuickForm}
                disabled={savingQuick}
               >
                  {savingQuick ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.quickSaveBtnText}>Enregistrer le Modèle</Text>
                  )}
               </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal
        visible={showPreviewModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPreviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle} numberOfLines={1}>Structure du Formulaire</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5, flexWrap: 'wrap' }}>
                  <Text style={styles.modalSubtitle}>
                    {formulaires.find(f => f.id === formData.formulaire_audit)?.name}
                  </Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>
                      {previewData.length} critères · {previewData.reduce((acc, c) => acc + (c.sous_criteres?.length || 0), 0)} sous-critères
                    </Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowPreviewModal(false)} style={{ padding: 5, marginLeft: 10 }}>
                <Ionicons name="close" size={26} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <View style={[styles.modalBody, { padding: 0 }]}>
              <View style={styles.modalActionsRow}>
                 <TouchableOpacity 
                   style={styles.modalAddBtn}
                   onPress={() => {
                     setNewCritere({ id: null, name: '', chapitre_id: '' });
                     setShowPreviewModal(false);
                     setTimeout(() => setShowCritereModal(true), 100);
                   }}
                 >
                    <Ionicons name="add" size={20} color="#fff" />
                    <Text style={styles.modalAddBtnText}>Nouveau Critère</Text>
                 </TouchableOpacity>
              </View>

              {loadingPreview ? (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color="#3b82f6" />
                  <Text style={{ marginTop: 10, color: '#64748b' }}>Chargement...</Text>
                </View>
              ) : (
                <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
                  {previewData.length > 0 ? (
                    previewData.map((crit, idx) => (
                      <View key={crit.critere_id || idx} style={styles.previewCritCard}>
                        <View style={styles.previewCritHeader}>
                          <View style={styles.critereTopRow}>
                            <TouchableOpacity 
                              style={styles.critereTitleGroup}
                              onPress={() => toggleCriterion(crit.critere_id)}
                              activeOpacity={0.7}
                            >
                              <Ionicons 
                                name={expandedCriteria[crit.critere_id] ? "chevron-down" : "chevron-forward"} 
                                size={18} 
                                color="#3b82f6" 
                              />
                              <Text style={styles.previewCritTitle} numberOfLines={2}>
                                {crit.critere_nom}
                              </Text>
                            </TouchableOpacity>
                            <View style={styles.critereQuickActions}>
                               <TouchableOpacity 
                                 style={styles.actionIconBtn}
                                 hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                 onPress={() => {
                                   setNewCritere({ id: crit.critere_id, name: crit.critere_nom, chapitre_id: crit.chapitre_id });
                                   setShowPreviewModal(false);
                                   setTimeout(() => setShowCritereModal(true), 100);
                                 }}
                               >
                                  <Feather name="edit-2" size={14} color="#3b82f6" />
                               </TouchableOpacity>
                               <TouchableOpacity 
                                 style={styles.actionIconBtn}
                                 hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                 onPress={() => handleDeleteCritere(crit.critere_id)}
                               >
                                  <Feather name="trash-2" size={14} color="#ef4444" />
                               </TouchableOpacity>
                            </View>
                          </View>
                          <TouchableOpacity 
                            style={styles.chapterBadge}
                            onPress={() => toggleCriterion(crit.critere_id)}
                          >
                             <Text style={styles.chapterBadgeText}>{crit.chapitre || 'CHAPITRE'}</Text>
                          </TouchableOpacity>
                        </View>

                        {expandedCriteria[crit.critere_id] && (
                          <View style={styles.previewScList}>
                            {crit.sous_criteres?.map((sc, scIdx) => (
                              <View key={sc.id || scIdx} style={styles.previewScRow}>
                                <Ionicons name="ellipse" size={6} color="#3b82f6" style={{ marginRight: 10, marginTop: 6 }} />
                                 <View style={styles.scMainContent}>
                                   <Text style={styles.scText}>{sc.nom || sc.content}</Text>
                                   <View style={styles.scBadgesRow}>
                                     {sc.cotation_name && (
                                       <View style={[styles.miniBadge, { backgroundColor: '#eff6ff' }]}>
                                         <Text style={[styles.miniBadgeText, { color: '#3b82f6' }]}>{sc.cotation_name}</Text>
                                       </View>
                                     )}
                                     {sc.reaction && (
                                       <View style={[styles.miniBadge, { backgroundColor: '#fff7ed' }]}>
                                         <MaterialCommunityIcons name="zap" size={10} color="#f97316" />
                                       </View>
                                     )}
                                   </View>
                                 </View>
                                <View style={styles.scActions}>
                                   <TouchableOpacity 
                                     hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                     onPress={() => {
                                       setNewSousCritere({ 
                                         id: sc.id, 
                                         content: sc.nom, 
                                         crit_id: crit.critere_id,
                                         cotation: sc.type_cotation_id || sc.type_cotation || '',
                                         reaction: sc.reaction || '',
                                         preuves: sc.preuve_attendu_id || sc.preuve_attendu || []
                                       });
                                       setShowPreviewModal(false);
                                       setTimeout(() => setShowSousCritereModal(true), 100);
                                     }}
                                   >
                                      <Feather name="edit-2" size={12} color="#94a3b8" />
                                   </TouchableOpacity>
                                   <TouchableOpacity 
                                     hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                     onPress={() => handleDeleteSousCritere(crit.critere_id, sc.id)}
                                   >
                                      <Feather name="trash-2" size={12} color="#fca5a5" />
                                   </TouchableOpacity>
                                </View>
                              </View>
                            ))}
                            <TouchableOpacity 
                              style={styles.addSousCritereBtn}
                              onPress={() => {
                                setNewSousCritere({ content: '', crit_id: crit.critere_id, cotation: '', reaction: '', preuves: [] });
                                setShowPreviewModal(false);
                                setTimeout(() => setShowSousCritereModal(true), 100);
                              }}
                            >
                               <Ionicons name="add" size={16} color="#3b82f6" />
                               <Text style={styles.addSousCritereBtnText}>Ajouter sous-critère</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    ))
                  ) : (
                    <View style={{ padding: 40, alignItems: 'center' }}>
                      <Text style={{ color: '#94a3b8' }}>Aucune structure trouvée.</Text>
                    </View>
                  )}
                </ScrollView>
              )}
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.modalCloseBtn}
                onPress={() => setShowPreviewModal(false)}
              >
                <Text style={styles.modalCloseBtnText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showCritereModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCritereModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '95%' }]}>
            <View style={[styles.modalHeader, { paddingVertical: 12, paddingHorizontal: 20 }]}>
              <View style={styles.modalTitleRow}>
                <MaterialCommunityIcons name="folder-plus-outline" size={18} color="#1e293b" />
                <Text style={[styles.modalTitle, { fontSize: 16 }]}>{newCritere.id ? 'Modifier le Critère' : 'Nouveau Critère'}</Text>
              </View>
              <TouchableOpacity 
                onPress={() => {
                  setShowCritereModal(false);
                  if (formData.formulaire_audit && !showQuickCreate) {
                    setTimeout(() => setShowPreviewModal(true), 300);
                  }
                }} 
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <View style={[styles.modalBody, { padding: 15 }]}>
              <View style={[styles.fieldGroup, { marginBottom: 12 }]}>
                <View style={[styles.labelWithIcon, { marginBottom: 4 }]}>
                  <Feather name="align-left" size={12} color="#3b82f6" />
                  <Text style={[styles.fieldLabel, { fontSize: 9 }]}>NOM DU CRITÈRE *</Text>
                </View>
                <TextInput
                  style={[styles.modalInput, { height: 50, paddingTop: 10, marginBottom: 0 }]}
                  placeholder="Ex: Hygiène et Sécurité"
                  placeholderTextColor="#94a3b8"
                  value={newCritere.name}
                  onChangeText={(val) => setNewCritere({ ...newCritere, name: val })}
                />
              </View>

              <View style={[styles.fieldGroup, { marginBottom: 12 }]}>
                <View style={[styles.labelWithIcon, { marginBottom: 4 }]}>
                  <Feather name="book" size={12} color="#3b82f6" />
                  <Text style={[styles.fieldLabel, { fontSize: 9 }]}>CHAPITRE NORME</Text>
                </View>
                <NormalDropdown
                  value={newCritere.chapitre_id}
                  options={chapitres}
                  onSelect={(id) => setNewCritere({ ...newCritere, chapitre_id: id })}
                  placeholder="Sélectionner le chapitre..."
                  style={{ marginBottom: 0 }}
                />
              </View>

              <View style={[styles.modalSeparator, { marginTop: 5, marginBottom: 12 }]} />

              <View style={styles.modalActionsFooter}>
                <TouchableOpacity 
                  onPress={() => {
                    setShowCritereModal(false);
                    if (formData.formulaire_audit && !showQuickCreate) {
                      setTimeout(() => setShowPreviewModal(true), 300);
                    }
                  }} 
                  style={styles.modalCancelArea}
                >
                  <Text style={styles.cancelBtnText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modernSubmitBtn, { paddingVertical: 10, paddingHorizontal: 20 }]}
                  onPress={handleAddCritere}
                >
                  <Feather name="save" size={16} color="#fff" />
                  <Text style={styles.modernSubmitBtnText}>Enregistrer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showSousCritereModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSousCritereModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '95%' }]}>
            <View style={[styles.modalHeader, { paddingVertical: 12, paddingHorizontal: 20 }]}>
              <View style={styles.modalTitleRow}>
                <MaterialCommunityIcons name="plus-circle" size={18} color="#1e293b" />
                <Text style={[styles.modalTitle, { fontSize: 16 }]}>{newSousCritere.id ? 'Modifier le Sous-Critère' : 'Nouveau Sous-Critère'}</Text>
              </View>
              <TouchableOpacity 
                onPress={() => {
                  setShowSousCritereModal(false);
                  if (formData.formulaire_audit && !showQuickCreate) {
                    setTimeout(() => setShowPreviewModal(true), 300);
                  }
                }} 
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={[styles.modalBody, { padding: 15 }]} showsVerticalScrollIndicator={false}>
              <View style={[styles.fieldGroup, { marginBottom: 12 }]}>
                <View style={[styles.labelWithIcon, { marginBottom: 4 }]}>
                  <MaterialCommunityIcons name="layers-outline" size={12} color="#3b82f6" />
                  <Text style={[styles.fieldLabel, { fontSize: 9 }]}>COTATION</Text>
                </View>
                <NormalDropdown
                  value={newSousCritere.cotation}
                  options={typeCotations}
                  onSelect={(id) => setNewSousCritere({ ...newSousCritere, cotation: id })}
                  placeholder="Sélectionner..."
                  style={{ marginBottom: 0 }}
                />
              </View>

              <View style={[styles.fieldGroup, { marginBottom: 12 }]}>
                <View style={[styles.labelWithIcon, { marginBottom: 4 }]}>
                  <Feather name="align-left" size={12} color="#3b82f6" />
                  <Text style={[styles.fieldLabel, { fontSize: 9 }]}>LIBELLÉ *</Text>
                </View>
                <TextInput
                  style={[styles.modalInput, { height: 60, textAlignVertical: 'top', paddingTop: 8, marginBottom: 0 }]}
                  placeholder="Détaillez ce qui doit être audité..."
                  placeholderTextColor="#94a3b8"
                  value={newSousCritere.content}
                  onChangeText={(val) => setNewSousCritere({ ...newSousCritere, content: val })}
                  multiline
                />
              </View>

              <View style={[styles.fieldGroup, { marginBottom: 12 }]}>
                <View style={[styles.labelWithIcon, { marginBottom: 4 }]}>
                  <Feather name="zap" size={12} color="#3b82f6" />
                  <Text style={[styles.fieldLabel, { fontSize: 9 }]}>RÉACTION</Text>
                </View>
                <TextInput
                  style={[styles.modalInput, { height: 60, textAlignVertical: 'top', paddingTop: 8, marginBottom: 0 }]}
                  placeholder="Réaction / Plan d'action..."
                  placeholderTextColor="#94a3b8"
                  value={newSousCritere.reaction}
                  onChangeText={(val) => setNewSousCritere({ ...newSousCritere, reaction: val })}
                  multiline
                />
              </View>

              <View style={[styles.fieldGroup, { marginBottom: 12 }]}>
                <View style={[styles.labelWithIcon, { marginBottom: 4 }]}>
                  <Feather name="file-text" size={12} color="#3b82f6" />
                  <Text style={[styles.fieldLabel, { fontSize: 9 }]}>PREUVES ATTENDUES</Text>
                </View>
                <NormalDropdown
                  value={newSousCritere.preuves}
                  options={preuvesAttendues}
                  onSelect={(id) => setNewSousCritere({ ...newSousCritere, preuves: id })}
                  placeholder="Sélectionner..."
                  style={{ marginBottom: 0 }}
                />
              </View>

              <View style={[styles.modalSeparator, { marginTop: 5, marginBottom: 12 }]} />

              <View style={styles.modalActionsFooter}>
                <TouchableOpacity 
                  onPress={() => {
                    setShowSousCritereModal(false);
                    if (formData.formulaire_audit && !showQuickCreate) {
                      setTimeout(() => setShowPreviewModal(true), 300);
                    }
                  }} 
                  style={styles.modalCancelArea}
                >
                  <Text style={styles.cancelBtnText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modernSubmitBtn, { paddingVertical: 10, paddingHorizontal: 20 }]}
                  onPress={handleAddSousCritere}
                >
                  <Feather name="save" size={16} color="#fff" />
                  <Text style={styles.modernSubmitBtnText}>Enregistrer</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcfcfc' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { padding: 4, backgroundColor: '#f1f5f9', borderRadius: 8, marginRight: 10 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4f46e5', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 },
  saveBtnText: { color: '#fff', fontSize: 13, fontWeight: '700', marginLeft: 6 },

  content: { flex: 1, padding: 20 },
  
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 20 },
  sectionTitleWithIcon: { flexDirection: 'row', alignItems: 'center' },
  infoIconBox: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  settingsIconBox: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#64748b' },
  
  statusToggle: { flexDirection: 'row-reverse', alignItems: 'center' },
  statusLabel: { fontSize: 12, fontWeight: '700', marginRight: 10 },

  fieldGroup: { marginBottom: 24 },
  fieldLabel: { fontSize: 10, fontWeight: '800', color: '#1e293b', marginBottom: 8, letterSpacing: 0.5 },
  
  inputGroup: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', height: 48, overflow: 'hidden' },
  inputGroupIcon: { width: 48, height: 48, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#e2e8f0' },
  input: { flex: 1, paddingHorizontal: 15, fontSize: 14, color: '#334155' },
  
  dropdownTrigger: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', height: 48, overflow: 'hidden' },
  dropdownTriggerActive: { borderColor: '#3b82f6' },
  dropdownValueContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15 },
  dropdownValue: { fontSize: 14, color: '#334155', flex: 1 },

  plusBtn: { width: 48, height: 48, borderRadius: 10, borderWidth: 1, borderColor: '#3b82f6', alignItems: 'center', justifyContent: 'center', marginLeft: 10, marginTop: 10 },
  plusBtnActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  eyeBtn: { width: 48, height: 48, borderRadius: 10, borderWidth: 1, borderColor: '#06b6d4', alignItems: 'center', justifyContent: 'center', marginLeft: 10, marginTop: 10 },
  copyBtn: { width: 48, height: 48, borderRadius: 10, borderWidth: 1, borderColor: '#f59e0b', alignItems: 'center', justifyContent: 'center', marginLeft: 10, marginTop: 10 },
  
  rowAlign: { flexDirection: 'row', alignItems: 'center' },

  fullScreenBackdrop: { flex: 1, backgroundColor: 'transparent' },
  dropdownMenu: { 
    position: 'absolute', 
    backgroundColor: '#fff', 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 8, 
    elevation: 5,
    zIndex: 9999
  },
  menuItem: { paddingVertical: 12, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  menuItemActive: { backgroundColor: '#3b82f6' },
  menuItemText: { fontSize: 14, color: '#475569' },
  menuItemTextActive: { color: '#fff', fontWeight: '600' },
  emptyText: { color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 10 },

  quickCreateContainer: { backgroundColor: '#fff', borderRadius: 16, padding: 24, marginTop: 10, marginBottom: 40, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 3 },
  quickCreateHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  quickCreateTitle: { fontSize: 14, fontWeight: '800', color: '#1e293b', marginLeft: 12, letterSpacing: 0.5 },
  quickField: { marginBottom: 20 },
  quickLabel: { fontSize: 11, fontWeight: '800', color: '#1e293b', marginBottom: 10 },
  quickInput: { height: 52, backgroundColor: '#f8fafc', borderRadius: 12, fontSize: 15, color: '#1e293b', paddingHorizontal: 18, borderWidth: 1, borderColor: '#f1f5f9' },
  refreshBtn: { width: 52, height: 52, borderRadius: 12, borderWidth: 1, borderColor: '#3b82f6', alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  quickActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, gap: 12 },
  quickCancelBtn: { paddingHorizontal: 25, paddingVertical: 14, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  quickCancelBtnText: { fontSize: 15, fontWeight: '600', color: '#64748b' },
  quickSaveBtn: { paddingHorizontal: 25, paddingVertical: 14, borderRadius: 12, backgroundColor: '#4f46e5' },
  quickSaveBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },

  // Structure Section Styles
  structureContainer: { marginTop: 30, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 20 },
  structureHeader: { marginBottom: 25 },
  structureTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 15 },
  structureTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b', letterSpacing: 0.5 },
  structureLinks: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  structureLink: { fontSize: 13, color: '#3b82f6', fontWeight: '700' },
  addCritereBtn: { backgroundColor: '#4f46e5', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  addCritereBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  critereCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  critereCardHeader: { padding: 18 },
  critereTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  critereTitleGroup: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1 },
  critereTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b', lineHeight: 22 },
  critereQuickActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  
  critereBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 },
  chapterBadge: { backgroundColor: '#f8fafc', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#f1f5f9' },
  chapterBadgeText: { fontSize: 11, fontWeight: '800', color: '#64748b', textTransform: 'uppercase' },
  toutCocherBtn: { paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#3b82f6' },
  toutCocherBtnText: { fontSize: 12, color: '#3b82f6', fontWeight: '700' },
  actionIconBtn: { padding: 6, backgroundColor: '#f8fafc', borderRadius: 8 },
  
  critereBody: { padding: 18, borderTopWidth: 1, borderTopColor: '#f8fafc', backgroundColor: '#fafbfd', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  sousCritereRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12, backgroundColor: '#fff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  
  scMainContent: {
    flex: 1,
    paddingRight: 10,
  },
  scBadgesRow: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 6,
  },
  miniBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniBadgeText: {
    fontSize: 9,
    fontWeight: '600',
  },
  scText: {
    fontSize: 14,
    color: '#1e293b',
    lineHeight: 20,
  },
  scActions: { flexDirection: 'row', gap: 12, marginLeft: 10 },
  addSousCritereBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingVertical: 8 },
  addSousCritereBtnText: { fontSize: 13, color: '#3b82f6', fontWeight: '700' },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  modalBody: { padding: 20 },
  modalInput: { height: 52, backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 15, fontSize: 15, color: '#1e293b', borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 20 },
  modalSubmitBtn: { backgroundColor: '#4f46e5', height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  modalSubmitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalSubtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
  modalFooter: { padding: 15, borderTopWidth: 1, borderTopColor: '#f1f5f9', alignItems: 'flex-end' },
  modalCloseBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: '#f1f5f9' },
  modalCloseBtnText: { color: '#475569', fontWeight: '700', fontSize: 14 },
  previewCritCard: { marginBottom: 15, backgroundColor: '#f8fafc', borderRadius: 12, padding: 15, borderWidth: 1, borderColor: '#e2e8f0' },
  previewCritHeader: { paddingBottom: 5 },
  previewCritTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b', flex: 1 },
  previewScList: { paddingLeft: 5, marginTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 },
  previewScRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, backgroundColor: '#fff', padding: 8, borderRadius: 8 },
  previewScText: { fontSize: 13, color: '#475569', flex: 1, lineHeight: 18 },
  countBadge: { backgroundColor: '#3b82f6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  countBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  modalActionsRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#fff' },
  modalAddBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4f46e5', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, gap: 5 },
  modalAddBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  
  critereTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  critereTitleGroup: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 5 },
  critereQuickActions: { flexDirection: 'row', gap: 8, marginLeft: 10 },
  actionIconBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  scActions: { flexDirection: 'row', gap: 10, marginLeft: 10 },
  addSousCritereBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingVertical: 5, gap: 5 },
  addSousCritereBtnText: { color: '#3b82f6', fontSize: 12, fontWeight: '600' },
  
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  labelWithIcon: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  modalSeparator: { height: 1, backgroundColor: '#f1f5f9', marginHorizontal: -20, marginTop: 10, marginBottom: 20 },
  modalActionsFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 25 },
  modalCancelArea: { paddingVertical: 10, paddingHorizontal: 5 },
  cancelBtnText: { fontSize: 15, color: '#64748b', fontWeight: '500' },
  modernSubmitBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#4f46e5', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 30, shadowColor: '#4f46e5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  modernSubmitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

export default AuditScheduleScreen;
