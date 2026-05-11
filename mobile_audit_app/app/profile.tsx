import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Modal,
  TouchableWithoutFeedback,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import api, { getApiUrl, API_PATHS } from '../src/utils/api';

const ProfileScreen = () => {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ old: '', new: '', confirm: '' });
  const [submitting, setSubmitting] = useState(false);

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

  const handleChangePassword = async () => {
    if (!passwordForm.old || !passwordForm.new || !passwordForm.confirm) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }
    if (passwordForm.new !== passwordForm.confirm) {
      Alert.alert('Erreur', 'Les nouveaux mots de passe ne correspondent pas');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post(getApiUrl(API_PATHS.CHANGE_PASSWORD), {
        old_password: passwordForm.old,
        new_password: passwordForm.new,
      });
      if (res.data.status === 'success') {
        Alert.alert('Succès', 'Mot de passe modifié avec succès');
        setShowPasswordModal(false);
        setPasswordForm({ old: '', new: '', confirm: '' });
      } else {
        Alert.alert('Erreur', res.data.message || 'Échec du changement de mot de passe');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setSubmitting(false);
    }
  };

  const InfoRow = ({ icon, label, value }) => (
    <View style={styles.infoRow}>
      <View style={styles.infoIconContainer}>
        {icon}
      </View>
      <View style={styles.infoTextContainer}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || '-'}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.headerLogoutBtn}>
          <Feather name="log-out" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#3b82f6', '#2563eb']}
          style={styles.profileHeader}
        >
          <Text style={styles.userName}>{user?.username || 'Utilisateur'}</Text>
          <Text style={styles.userRoleBadge}>{user?.role || 'Participant'}</Text>
        </LinearGradient>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Informations Personnelles</Text>
          <View style={styles.card}>
            <InfoRow 
              icon={<Feather name="user" size={18} color="#3b82f6" />}
              label="Nom d'utilisateur"
              value={user?.username}
            />
            <View style={styles.divider} />
            <InfoRow 
              icon={<Feather name="mail" size={18} color="#3b82f6" />}
              label="Email"
              value={user?.email}
            />
            <View style={styles.divider} />
            <InfoRow 
              icon={<Feather name="shield" size={18} color="#3b82f6" />}
              label="Rôle"
              value={user?.role}
            />
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Paramètres</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.actionRow} onPress={() => setShowPasswordModal(true)}>
              <View style={styles.actionIconContainer}>
                <Feather name="lock" size={18} color="#64748b" />
              </View>
              <Text style={styles.actionText}>Changer le mot de passe</Text>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Feather name="log-out" size={20} color="#fff" />
          <Text style={styles.logoutBtnText}>Se déconnecter</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Version 1.0.0</Text>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal visible={showPasswordModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Changer le mot de passe</Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Ancien mot de passe</Text>
                <TextInput 
                  style={styles.textInput} 
                  secureTextEntry 
                  value={passwordForm.old}
                  onChangeText={(val) => setPasswordForm({...passwordForm, old: val})}
                  placeholder="********"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nouveau mot de passe</Text>
                <TextInput 
                  style={styles.textInput} 
                  secureTextEntry 
                  value={passwordForm.new}
                  onChangeText={(val) => setPasswordForm({...passwordForm, new: val})}
                  placeholder="********"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirmer le nouveau mot de passe</Text>
                <TextInput 
                  style={styles.textInput} 
                  secureTextEntry 
                  value={passwordForm.confirm}
                  onChangeText={(val) => setPasswordForm({...passwordForm, confirm: val})}
                  placeholder="********"
                />
              </View>

              <TouchableOpacity 
                style={[styles.saveBtn, submitting && styles.saveBtnDisabled]} 
                onPress={handleChangePassword}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Mettre à jour</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    borderBottomColor: '#f1f5f9',
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  headerLogoutBtn: { padding: 8 },
  
  content: { flex: 1 },
  profileHeader: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  userName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  userRoleBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 20,
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  
  infoSection: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 12,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 16,
  },
  
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    marginHorizontal: 20,
    marginTop: 40,
    marginBottom: 20,
    height: 56,
    borderRadius: 18,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  logoutBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 12,
  },
  versionText: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 40,
  },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, minHeight: 400 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  modalBody: { gap: 20 },
  inputGroup: { gap: 8 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  textInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, height: 50, paddingHorizontal: 16, fontSize: 16, color: '#1e293b' },
  saveBtn: { backgroundColor: '#3b82f6', height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 10, shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default ProfileScreen;
