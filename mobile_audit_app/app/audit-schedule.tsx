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
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [sections, setSections] = useState([]);
  const [formulaires, setFormulaires] = useState([]);
  const [users, setUsers] = useState([]);
  const [processusList, setProcessusList] = useState([]);
  const [typeAudits, setTypeAudits] = useState([]);
  const [typeEquipements, setTypeEquipements] = useState([]);

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
  const [quickFormData, setQuickFormData] = useState({
    name: '',
    processus: '',
    type_audit: '',
    type_equipement: '',
  });
  const [savingQuick, setSavingQuick] = useState(false);
  const [formStructure, setFormStructure] = useState([]);
  const [loadingStructure, setLoadingStructure] = useState(false);
  const [expandedCriteria, setExpandedCriteria] = useState({});
  const [showCritereModal, setShowCritereModal] = useState(false);
  const [newCritere, setNewCritere] = useState({ id: null, name: '', chapitre_id: '' });
  const [showSousCritereModal, setShowSousCritereModal] = useState(false);
  const [newSousCritere, setNewSousCritere] = useState({ id: null, content: '', crit_id: null });
  const [selectedSousCriteres, setSelectedSousCriteres] = useState([]);

  const fetchData = async () => {
    try {
      const [secRes, formRes, userRes, procRes, typeARes, typeERes] = await Promise.all([
        api.get(getApiUrl(API_PATHS.SECTIONS)),
        api.get(getApiUrl(API_PATHS.FORMULAIRES)),
        api.get(getApiUrl(API_PATHS.USERS)),
        api.get(getApiUrl(API_PATHS.PROCESSUS)),
        api.get(getApiUrl(API_PATHS.TYPES_AUDIT)),
        api.get(getApiUrl(API_PATHS.TYPES_EQUIPEMENTS)),
      ]);

      setSections(secRes.data.data || []);
      setFormulaires(formRes.data.data || []);
      
      const userData = userRes.data.data || userRes.data;
      setUsers(Array.isArray(userData) ? userData : []);
      
      setProcessusList(procRes.data.data || []);
      setTypeAudits(typeARes.data.data || []);
      setTypeEquipements(typeERes.data.data || []);

      if (id) {
        const res = await api.get(getApiUrl(`${API_PATHS.LISTE_AUDIT}${id}/`));
        const audit = res.data.data;
        setFormData({
          desc: audit.desc || '',
          status: audit.status ?? true,
          date: audit.date_audit || new Date().toISOString().slice(0, 19).replace('T', ' '),
          section: audit.section_id || '',
          formulaire_audit: audit.formulaire_audit_id || '',
          site: audit.site_id || '',
          affectation: audit.affectation_ids || [],
          participants: audit.participants_ids || [],
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

  const toggleCriterion = (critId) => {
    setExpandedCriteria(prev => ({
      ...prev,
      [critId]: !prev[critId]
    }));
  };

  const handleAddCritere = async () => {
    if (!newCritere.name) return Alert.alert('Erreur', 'Le nom du critère est obligatoire');
    
    if (newCritere.id) {
      // Edit mode
      const updated = formStructure.map(c => 
        c.critere_id === newCritere.id ? { ...c, critere_nom: newCritere.name, chapitre_id: newCritere.chapitre_id } : c
      );
      setFormStructure(updated);
    } else {
      // Create mode
      const tempId = Date.now();
      const newCritObj = {
        critere_id: tempId,
        critere_nom: newCritere.name,
        chapitre: processusList.find(p => p.id === newCritere.chapitre_id)?.name || 'CHAPITRE',
        chapitre_id: newCritere.chapitre_id,
        sous_criteres: [],
        is_new: true
      };
      setFormStructure([newCritObj, ...formStructure]);
    }
    
    setShowCritereModal(false);
    setNewCritere({ id: null, name: '', chapitre_id: '' });
  };

  const handleAddSousCritere = () => {
    if (!newSousCritere.content) return Alert.alert('Erreur', 'Le libellé est obligatoire');
    
    if (newSousCritere.id) {
      // Edit mode
      const updated = formStructure.map(crit => {
        if (crit.critere_id === newSousCritere.crit_id) {
          return {
            ...crit,
            sous_criteres: crit.sous_criteres.map(sc => 
              sc.id === newSousCritere.id ? { ...sc, nom: newSousCritere.content } : sc
            )
          };
        }
        return crit;
      });
      setFormStructure(updated);
    } else {
      // Create mode
      const tempId = Date.now();
      const updatedStructure = formStructure.map(crit => {
        if (crit.critere_id === newSousCritere.crit_id) {
          return {
            ...crit,
            sous_criteres: [...crit.sous_criteres, { id: tempId, nom: newSousCritere.content }]
          };
        }
        return crit;
      });
      setFormStructure(updatedStructure);
      // Auto-select new sub-criterion
      setSelectedSousCriteres([...selectedSousCriteres, tempId]);
    }
    
    setShowSousCritereModal(false);
    setNewSousCritere({ id: null, content: '', crit_id: null });
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
      { text: 'Supprimer', style: 'destructive', onPress: () => {
        setFormStructure(formStructure.filter(c => c.critere_id !== id));
      }}
    ]);
  };

  const handleDeleteSousCritere = (critId, scId) => {
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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Informations Générales */}
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

        {/* Paramètres & Configuration */}
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

        {/* Quick Create Sub-form */}
        {showQuickCreate && (
          <View style={styles.quickCreateContainer}>
            <View style={styles.quickCreateHeader}>
               <Ionicons name="add-circle" size={24} color="#3b82f6" />
               <Text style={styles.quickCreateTitle}>AJOUTER UN FORMULAIRE</Text>
            </View>
            
            <View style={styles.quickField}>
              <Text style={styles.quickLabel}>NOM DU FORMULAIRE</Text>
              <TextInput 
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

            {/* Structure Section */}
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

                {/* New Criterion Modal */}
                <Modal
                  visible={showCritereModal}
                  transparent={true}
                  animationType="fade"
                  onRequestClose={() => setShowCritereModal(false)}
                >
                  <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                      <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{newCritere.id ? 'Modifier le Critère' : 'Nouveau Critère'}</Text>
                        <TouchableOpacity onPress={() => setShowCritereModal(false)}>
                          <Ionicons name="close" size={24} color="#64748b" />
                        </TouchableOpacity>
                      </View>
                      
                      <View style={styles.modalBody}>
                        <View style={styles.fieldGroup}>
                          <Text style={styles.fieldLabel}>DÉSIGNATION DU CRITÈRE *</Text>
                          <TextInput
                            style={styles.modalInput}
                            placeholder="Nom du critère..."
                            value={newCritere.name}
                            onChangeText={(val) => setNewCritere({ ...newCritere, name: val })}
                          />
                        </View>

                        <NormalDropdown
                          label="CHAPITRE DE NORME"
                          value={newCritere.chapitre_id}
                          options={processusList}
                          onSelect={(id) => setNewCritere({ ...newCritere, chapitre_id: id })}
                          placeholder="Sélectionnez un chapitre..."
                          style={{ marginBottom: 20 }}
                        />

                        <TouchableOpacity 
                          style={styles.modalSubmitBtn}
                          onPress={handleAddCritere}
                        >
                          <Text style={styles.modalSubmitBtnText}>
                            {newCritere.id ? 'Mettre à jour' : 'Ajouter le Critère'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </Modal>

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
                                 setNewSousCritere({ id: sc.id, content: sc.nom, crit_id: crit.critere_id });
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
                            setNewSousCritere({ content: '', crit_id: crit.critere_id });
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

                {/* New Sous-Critère Modal */}
                <Modal
                  visible={showSousCritereModal}
                  transparent={true}
                  animationType="fade"
                  onRequestClose={() => setShowSousCritereModal(false)}
                >
                  <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                      <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{newSousCritere.id ? 'Modifier le Sous-Critère' : 'Nouveau Sous-Critère'}</Text>
                        <TouchableOpacity onPress={() => setShowSousCritereModal(false)}>
                          <Ionicons name="close" size={24} color="#64748b" />
                        </TouchableOpacity>
                      </View>
                      
                      <View style={styles.modalBody}>
                        <View style={styles.fieldGroup}>
                          <Text style={styles.fieldLabel}>LIBELLÉ DU SOUS-CRITÈRE *</Text>
                          <TextInput
                            style={styles.modalInput}
                            placeholder="Ex: Vérification des équipements..."
                            value={newSousCritere.content}
                            onChangeText={(val) => setNewSousCritere({ ...newSousCritere, content: val })}
                            multiline
                            numberOfLines={3}
                          />
                        </View>

                        <TouchableOpacity 
                          style={styles.modalSubmitBtn}
                          onPress={handleAddSousCritere}
                        >
                          <Text style={styles.modalSubmitBtnText}>
                            {newSousCritere.id ? 'Mettre à jour' : 'Ajouter le Sous-Critère'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </Modal>
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
  sousCritereText: { fontSize: 14, color: '#64748b', flex: 1, lineHeight: 20 },
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
});

export default AuditScheduleScreen;
