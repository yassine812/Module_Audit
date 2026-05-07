import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import api, { getApiUrl, API_PATHS } from '../src/utils/api';
import { useAuth } from '../src/context/AuthContext';

import Constants from 'expo-constants';

const LoginScreen = () => {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    const url = getApiUrl('/audit/api/dashboard-stats/');
    Alert.alert('Diagnostic', `Tentative de connexion à : ${url}`);
    try {
      const res = await api.get(url);
      if (res.status === 200) {
        Alert.alert('Succès', 'Connexion au serveur réussie !');
      }
    } catch (e) {
      Alert.alert('Échec', `Impossible de joindre le serveur.\nErreur: ${e.message}`);
    }
  };

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      const url = getApiUrl(API_PATHS.LOGIN);
      const response = await api.post(url, {
        username,
        password,
      });

      if (response.data.status === 'success') {
        const userData = response.data.user;
        // This will update the global state and RootLayout will redirect automatically
        await login(userData);
      } else {
        Alert.alert('Erreur', response.data.message || 'Identifiants invalides');
      }
    } catch (error) {
      console.error(error);
      const msg = error.code === 'ECONNABORTED' 
        ? 'Délai d\'attente dépassé.' 
        : 'Impossible de joindre le serveur.';
      Alert.alert('Erreur de connexion', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#f8fafc', '#e2e8f0']} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.brandTitle}>Audit<Text style={{color: '#1e293b'}}>d'entreprise</Text></Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.subtitle}>SYSTÈME DE GESTION DE TERRAIN</Text>
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TextInput style={styles.input} placeholder="Nom d'utilisateur" value={username} onChangeText={setUsername} autoCapitalize="none" />
              <FontAwesome5 name="user" size={18} color="#64748b" style={styles.icon} />
            </View>
            <View style={styles.inputWrapper}>
              <TextInput style={styles.input} placeholder="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry />
              <FontAwesome5 name="lock" size={18} color="#64748b" style={styles.icon} />
            </View>
          </View>
          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Se connecter</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.testBtn} onPress={testConnection}>
            <Text style={styles.testBtnText}>Vérifier la connexion</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', padding: 20 },
  header: { alignItems: 'center', marginBottom: 40 },
  brandTitle: { fontSize: 42, fontWeight: '900', color: '#3b82f6', letterSpacing: -1 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 24, elevation: 10 },
  subtitle: { textAlign: 'center', fontSize: 12, fontWeight: '700', color: '#64748b', letterSpacing: 2, marginBottom: 30 },
  inputContainer: { gap: 16, marginBottom: 24 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 16 },
  input: { flex: 1, height: 56, fontSize: 16, color: '#1e293b' },
  icon: { marginLeft: 10 },
  button: { backgroundColor: '#3b82f6', height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  testBtn: { marginTop: 20, padding: 10, alignItems: 'center' },
  testBtnText: { color: '#3b82f6', fontSize: 14, fontWeight: '600' }
});

export default LoginScreen;
