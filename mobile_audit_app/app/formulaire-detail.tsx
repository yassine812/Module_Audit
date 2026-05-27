import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import api, { getApiUrl } from '../src/utils/api';

const FormulaireDetailScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>(null);

  const fetchDetail = async () => {
    try {
      const res = await api.get(getApiUrl(`/audit/get-formulaire-structure/?formulaire_id=${id}`));
      setForm(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!form) {
    return (
      <View style={styles.errorContainer}>
        <Text>Formulaire introuvable</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtnError}>
          <Text style={{ color: '#fff' }}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détails du Formulaire</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* General Info */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
             <Feather name="info" size={18} color="#3b82f6" />
             <Text style={styles.cardTitle}>Informations Générales</Text>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Nom</Text>
              <Text style={styles.infoValue}>{form.name || '-'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Processus</Text>
              <Text style={styles.infoValue}>{form.processus || '-'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Type d'Audit</Text>
              <Text style={styles.infoValue}>{form.type_audit || '-'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Type d'Équipement</Text>
              <Text style={styles.infoValue}>{form.type_equipement || '-'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Créateur</Text>
              <Text style={styles.infoValue}>{form.creator_username || '-'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Date Création</Text>
              <Text style={styles.infoValue}>{form.date_creation || '-'}</Text>
            </View>
            <View style={styles.infoItem} />
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Sections concernées</Text>
            <View style={styles.badgeRow}>
              {form.sections && form.sections.length > 0 ? (
                form.sections.map((s: string, i: number) => (
                  <View key={i} style={styles.badge}>
                    <Text style={styles.badgeText}>{s}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.infoValue}>-</Text>
              )}
            </View>
          </View>
        </View>

        {/* Structure */}
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Liste des Critères et Sous-critères</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>
              {form.structure?.length || 0} Sous-critères
            </Text>
          </View>
        </View>

        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.columnHeader, { width: 30, textAlign: 'center' }]}>N°</Text>
          <Text style={[styles.columnHeader, { width: 80 }]}>Critère</Text>
          <Text style={[styles.columnHeader, { flex: 1 }]}>Sous-critère</Text>
          <Text style={[styles.columnHeader, { width: 70, textAlign: 'center' }]}>Cotation</Text>
        </View>

        {form.structure && form.structure.map((item: any, idx: number) => (
          <View key={item.id} style={styles.tableRow}>
            <Text style={[styles.cellText, { width: 30, textAlign: 'center', fontWeight: '700' }]}>
              {idx + 1}
            </Text>
            <View style={{ width: 80, paddingRight: 5 }}>
              <Text style={[styles.cellText, { fontSize: 11 }]}>{item.critere_nom}</Text>
            </View>
            <View style={{ flex: 1, paddingRight: 5 }}>
              <Text style={[styles.cellText, { color: '#1e293b', fontWeight: '500' }]}>{item.sous_critere_nom}</Text>
            </View>
            <View style={{ width: 70, alignItems: 'center' }}>
              <View style={styles.cotationBadge}>
                <Text style={styles.cotationText}>{item.cotation}</Text>
              </View>
            </View>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backBtnError: { backgroundColor: '#3b82f6', padding: 10, borderRadius: 8, marginTop: 10 },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  
  content: { flex: 1, padding: 15 },
  
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 15, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginLeft: 10 },
  
  infoRow: { flexDirection: 'row', marginBottom: 12 },
  infoItem: { flex: 1, marginBottom: 8 },
  infoLabel: { fontSize: 11, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#334155' },
  
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  badge: { backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 6, marginBottom: 6, borderWidth: 1, borderColor: '#dbeafe' },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#3b82f6' },
  
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  countBadge: { backgroundColor: '#1e293b', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  countText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  
  tableHeader: { flexDirection: 'row', backgroundColor: '#f1f5f9', paddingVertical: 10, paddingHorizontal: 5, borderTopLeftRadius: 10, borderTopRightRadius: 10, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  columnHeader: { fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 5, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  cellText: { fontSize: 13, color: '#64748b' },
  
  cotationBadge: { backgroundColor: '#f8fafc', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0' },
  cotationText: { fontSize: 10, fontWeight: '700', color: '#64748b', textTransform: 'capitalize' },
});

export default FormulaireDetailScreen;
