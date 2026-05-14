import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Dimensions,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Feather, FontAwesome5 } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';

const Sidebar = ({ onClose }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [expandedGroup, setExpandedGroup] = useState(null);

  const isAuditor = user?.role === 'Auditeur' || user?.role === 'Participant';

  const menuItems = [
    {
      title: 'Organisation',
      icon: <Feather name="home" size={20} color="#475569" />,
      items: [
        { label: 'Sites', path: '/sites' },
        { label: 'Section', path: '/sections' },
        { label: 'Processus', path: '/processus' },
      ],
      adminOnly: true
    },
    {
      title: 'Référentiel',
      icon: <MaterialCommunityIcons name="book-outline" size={20} color="#475569" />,
      items: [
        { label: 'Critères', path: '/critere' },
        { label: 'Textes de Référence', path: '/textref', adminOnly: true },
        { label: 'Chapitres', path: '/chapitres', adminOnly: true },
        { label: 'Sous-Critères', path: '/sous-critere', adminOnly: true },
        { label: 'Cotations', path: '/cotation', adminOnly: true },
        { label: 'Niveaux Attendus', path: '/niveau-attendu', adminOnly: true },
        { label: 'Types de Cotation', path: '/typecotation', adminOnly: true },
      ],
    },
    {
      title: 'Audit',
      icon: <MaterialCommunityIcons name="clipboard-check-outline" size={20} color="#475569" />,
      items: [
        { label: 'Formulaires d\'Audit', path: '/formulaire' },
        { label: 'Listes d\'Audits', path: '/liste-audit' },
        { label: 'Résultats d\'Audits', path: '/resultat' },
        { label: 'Types d\'Audit', path: '/type-audit', adminOnly: true },
      ],
    },
    {
      title: 'Preuves',
      icon: <Feather name="folder" size={20} color="#475569" />,
      items: [
        { label: 'Types de Preuves', path: '/type-preuve' },
        { label: 'Preuves Attendues', path: '/preuve-attendue' },
      ],
      adminOnly: true
    },
    {
      title: 'Ressources',
      icon: <MaterialCommunityIcons name="package-variant" size={20} color="#475569" />,
      items: [
        { label: 'Équipements', path: '/equipements' },
        { label: 'Documents', path: '/documents', adminOnly: true },
        { label: 'Types d\'Equipements', path: '/types-equipements', adminOnly: true },
      ],
    },
    {
      title: 'Gestion des utilisateurs',
      icon: <Feather name="users" size={20} color="#475569" />,
      items: [
        { label: 'Utilisateurs', path: '/users' },
      ],
      adminOnly: true
    },
  ];

  const filteredMenuItems = menuItems
    .filter(group => !isAuditor || !group.adminOnly)
    .map(group => ({
      ...group,
      items: group.items.filter(item => !isAuditor || !item.adminOnly)
    }))
    .filter(group => group.items.length > 0);

  const toggleGroup = (title) => {
    setExpandedGroup(expandedGroup === title ? null : title);
  };

  const navigateTo = (path) => {
    router.push(path);
    if (onClose) onClose();
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header}>
        <TouchableOpacity 
          style={styles.logoContainer} 
          onPress={() => navigateTo('/')}
          activeOpacity={0.7}
        >
          <Image 
            source={{ uri: 'http://192.168.1.17:8000/static/img/ab-serve-logo.png' }} 
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.logoTextContainer}>
            <Text style={styles.logoText}>Audit d'entreprise</Text>
            <View style={styles.logoSubtextContainer}>
               <Text style={styles.logoTag}>Tunisie</Text>
               <Text style={styles.logoSubtext}>Beyond quality</Text>
            </View>
          </View>
        </TouchableOpacity>
      </SafeAreaView>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <TextInput 
            placeholder="Rechercher..." 
            style={styles.searchInput}
            placeholderTextColor="#94a3b8"
          />
          <TouchableOpacity style={styles.searchBtn}>
            <Feather name="search" size={18} color="#475569" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.menuScroll}>
        {filteredMenuItems.map((group, idx) => (
          <View key={idx} style={styles.groupContainer}>
            <TouchableOpacity 
              style={[
                styles.groupHeader,
                expandedGroup === group.title && styles.groupHeaderActive
              ]} 
              onPress={() => toggleGroup(group.title)}
            >
              <View style={styles.groupHeaderLeft}>
                <View style={styles.iconContainer}>
                  {group.icon}
                </View>
                <Text style={[
                  styles.groupTitle,
                  expandedGroup === group.title && styles.groupTitleActive
                ]}>{group.title}</Text>
              </View>
              {group.items.length > 0 && (
                <Feather 
                  name={expandedGroup === group.title ? 'chevron-down' : 'chevron-right'} 
                  size={16} 
                  color={expandedGroup === group.title ? '#2563eb' : '#94a3b8'} 
                />
              )}
            </TouchableOpacity>

            {expandedGroup === group.title && (
              <View style={styles.subItemsContainer}>
                {group.items.map((item, sIdx) => (
                  <TouchableOpacity 
                    key={sIdx} 
                    style={[
                      styles.subItem,
                      pathname === item.path && styles.subItemActive
                    ]}
                    onPress={() => navigateTo(item.path)}
                  >
                    <Text style={[
                      styles.subItemText,
                      pathname === item.path && styles.subItemTextActive
                    ]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 50,
    height: 50,
  },
  logoTextContainer: {
    flex: 1,
    paddingLeft: 4,
  },
  logoText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#334155',
    lineHeight: 20,
  },
  logoSubtextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  logoTag: {
    backgroundColor: '#ef4444',
    color: '#fff',
    fontSize: 7,
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 2,
    fontWeight: '800',
    overflow: 'hidden',
  },
  logoSubtext: {
    fontSize: 9,
    color: '#94a3b8',
    fontWeight: '600',
  },
  searchContainer: {
    padding: 15,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    height: 45,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 15,
    fontSize: 14,
    color: '#1e293b',
  },
  searchBtn: {
    width: 45,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#e2e8f0',
  },
  menuScroll: {
    flex: 1,
  },
  groupContainer: {
    marginBottom: 5,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginHorizontal: 10,
  },
  groupHeaderActive: {
    backgroundColor: '#eff6ff',
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  iconContainer: {
    width: 30,
    alignItems: 'center',
  },
  groupTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#334155',
  },
  groupTitleActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
  subItemsContainer: {
    backgroundColor: '#f8fafc',
    paddingLeft: 45,
  },
  subItem: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  subItemActive: {
    borderLeftWidth: 2,
    borderLeftColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  subItemText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  subItemTextActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
});

export default Sidebar;
